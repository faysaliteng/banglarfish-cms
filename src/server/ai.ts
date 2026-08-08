// Provider-agnostic AI completion service. Claude (Anthropic) is first-class;
// OpenAI-compatible and Ollama are also supported. Config lives in Admin → AI.
export async function aiComplete(opts: { system?: string; prompt: string; maxTokens?: number }): Promise<string> {
  const { getAiConfig } = await import("./site-config");
  const cfg = await getAiConfig();
  if (!cfg.enabled) throw new Error("AI is turned off. Enable it in Admin → AI Assistant.");
  if (cfg.provider !== "ollama" && !cfg.apiKey) throw new Error("AI API key is not set. Add it in Admin → AI Assistant.");
  const maxTokens = Math.min(opts.maxTokens ?? cfg.maxTokens ?? 1024, 4096);
  const timeout = AbortSignal.timeout(60000);

  if (cfg.provider === "anthropic") {
    const res = await fetch((cfg.baseUrl || "https://api.anthropic.com") + "/v1/messages", {
      method: "POST",
      headers: { "x-api-key": cfg.apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: cfg.model || "claude-sonnet-5", max_tokens: maxTokens, ...(opts.system ? { system: opts.system } : {}), messages: [{ role: "user", content: opts.prompt }] }),
      signal: timeout,
    });
    if (!res.ok) throw new Error(`AI error ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const j = (await res.json()) as { content?: { type: string; text?: string }[] };
    return (j.content?.map((c) => c.text ?? "").join("") ?? "").trim();
  }

  if (cfg.provider === "openai") {
    const base = cfg.baseUrl || "https://api.openai.com/v1";
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { authorization: `Bearer ${cfg.apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ model: cfg.model || "gpt-4o-mini", max_tokens: maxTokens, messages: [...(opts.system ? [{ role: "system", content: opts.system }] : []), { role: "user", content: opts.prompt }] }),
      signal: timeout,
    });
    if (!res.ok) throw new Error(`AI error ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return (j.choices?.[0]?.message?.content ?? "").trim();
  }

  // ollama (local)
  const base = cfg.baseUrl || "http://localhost:11434";
  const res = await fetch(`${base}/api/generate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model: cfg.model || "llama3", prompt: (opts.system ? opts.system + "\n\n" : "") + opts.prompt, stream: false }),
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) throw new Error(`AI error ${res.status}`);
  const j = (await res.json()) as { response?: string };
  return (j.response ?? "").trim();
}

// Extract the first JSON object from a model reply (models sometimes wrap it in prose/fences).
export function parseJsonReply<T>(text: string): T | null {
  try {
    const m = text.match(/\{[\s\S]*\}/);
    return m ? (JSON.parse(m[0]) as T) : null;
  } catch {
    return null;
  }
}
