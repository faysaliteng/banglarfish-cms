// AI image generation + editing. Separate from the text provider in ai.ts:
// the text model may be Claude, which cannot generate images.
//
// Gemini  — generativelanguage.googleapis.com, model gemini-2.5-flash-image
//           (a.k.a. "nano banana"): generates AND edits, so it powers both
//           text-to-image and the AI background remover.
// OpenAI  — /v1/images/generations (gpt-image-1) and /v1/images/edits.
import type { AiConfig } from "@/lib/config-types";

export type GeneratedImage = { dataUrl: string; mime: string };

async function cfg(): Promise<AiConfig> {
  const { getAiConfig } = await import("./site-config");
  const c = await getAiConfig();
  if (c.imageProvider === "none") throw new Error("AI image generation is off. Choose a provider in Admin → AI Assistant.");
  if (!c.imageApiKey) throw new Error("No image API key set. Add one in Admin → AI Assistant.");
  return c;
}

/** Text prompt → a new image. */
export async function generateImage(prompt: string): Promise<GeneratedImage> {
  const c = await cfg();
  return c.imageProvider === "gemini" ? geminiImage(c, prompt) : openaiImage(c, prompt);
}

/**
 * Edit an existing image with an instruction (background removal, retouching,
 * scene replacement…). `inputDataUrl` must be a data: URL.
 */
export async function editImage(inputDataUrl: string, instruction: string): Promise<GeneratedImage> {
  const c = await cfg();
  if (c.imageProvider === "gemini") return geminiImage(c, instruction, inputDataUrl);
  return openaiEdit(c, inputDataUrl, instruction);
}

function splitDataUrl(dataUrl: string): { mime: string; b64: string } {
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!m) throw new Error("Expected a base64 data URL");
  return { mime: m[1], b64: m[2] };
}

async function geminiImage(c: AiConfig, prompt: string, inputDataUrl?: string): Promise<GeneratedImage> {
  const model = c.imageModel || "gemini-2.5-flash-image";
  const parts: Record<string, unknown>[] = [{ text: prompt }];
  if (inputDataUrl) {
    const { mime, b64 } = splitDataUrl(inputDataUrl);
    parts.unshift({ inline_data: { mime_type: mime, data: b64 } });
  }
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": c.imageApiKey, "content-type": "application/json" },
    body: JSON.stringify({ contents: [{ parts }] }),
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const j = (await res.json()) as { candidates?: { content?: { parts?: { inlineData?: { mimeType?: string; data?: string }; inline_data?: { mime_type?: string; data?: string } }[] } }[] };
  for (const p of j.candidates?.[0]?.content?.parts ?? []) {
    const inline = p.inlineData ?? p.inline_data;
    const data = (inline as { data?: string } | undefined)?.data;
    if (data) {
      const mime = (inline as { mimeType?: string; mime_type?: string }).mimeType ?? (inline as { mime_type?: string }).mime_type ?? "image/png";
      return { dataUrl: `data:${mime};base64,${data}`, mime };
    }
  }
  throw new Error("The model returned no image. Try rephrasing the prompt.");
}

async function openaiImage(c: AiConfig, prompt: string): Promise<GeneratedImage> {
  // Deliberately not c.baseUrl — that belongs to the text provider and may point
  // at a local Ollama, which has no images endpoint.
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { authorization: `Bearer ${c.imageApiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ model: c.imageModel || "gpt-image-1", prompt, n: 1, size: "1024x1024" }),
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const j = (await res.json()) as { data?: { b64_json?: string; url?: string }[] };
  const first = j.data?.[0];
  if (first?.b64_json) return { dataUrl: `data:image/png;base64,${first.b64_json}`, mime: "image/png" };
  if (first?.url) {
    const img = await fetch(first.url);
    const buf = Buffer.from(await img.arrayBuffer());
    return { dataUrl: `data:image/png;base64,${buf.toString("base64")}`, mime: "image/png" };
  }
  throw new Error("The model returned no image.");
}

async function openaiEdit(c: AiConfig, inputDataUrl: string, instruction: string): Promise<GeneratedImage> {
  const { mime, b64 } = splitDataUrl(inputDataUrl);
  const form = new FormData();
  form.append("model", c.imageModel || "gpt-image-1");
  form.append("prompt", instruction);
  form.append("image", new Blob([new Uint8Array(Buffer.from(b64, "base64"))], { type: mime }), "image.png");
  const res = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { authorization: `Bearer ${c.imageApiKey}` },
    body: form,
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const j = (await res.json()) as { data?: { b64_json?: string }[] };
  const b = j.data?.[0]?.b64_json;
  if (!b) throw new Error("The model returned no image.");
  return { dataUrl: `data:image/png;base64,${b}`, mime: "image/png" };
}
