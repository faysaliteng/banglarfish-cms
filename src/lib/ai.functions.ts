import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { AiConfig } from "./config-types";

/* ---------------- Admin config ---------------- */
export const adminGetAi = createServerFn({ method: "GET" }).handler(async (): Promise<AiConfig> => {
  const { requireManager } = await import("@/server/auth/context");
  const { getAiConfig } = await import("@/server/site-config");
  await requireManager();
  return getAiConfig();
});

export const adminSaveAi = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => i as AiConfig)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireManager } = await import("@/server/auth/context");
    const { saveAiConfig } = await import("@/server/site-config");
    const { audit } = await import("@/server/audit");
    const actor = await requireManager();
    await saveAiConfig({ ...data, apiKey: (data.apiKey || "").trim() });
    await audit(actor, "ai.config", "settings", "ai");
    return { ok: true };
  });

// Public (staff): is AI available? Drives whether editors show the ✨ buttons.
export const aiStatus = createServerFn({ method: "GET" }).handler(async (): Promise<{ enabled: boolean; provider: string; model: string }> => {
  const { getAiConfig } = await import("@/server/site-config");
  const c = await getAiConfig();
  return { enabled: c.enabled && (c.provider === "ollama" || !!c.apiKey), provider: c.provider, model: c.model };
});

export const aiTest = createServerFn({ method: "POST" }).handler(async (): Promise<{ ok: boolean; reply: string }> => {
  const { requireManager } = await import("@/server/auth/context");
  const { aiComplete } = await import("@/server/ai");
  await requireManager();
  const reply = await aiComplete({ prompt: "Reply with exactly: AI connection OK", maxTokens: 20 });
  return { ok: true, reply };
});

/* ---------------- Content generation (staff) ---------------- */

export const aiGenerateDescription = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ name: z.string().trim().min(1).max(200), category: z.string().max(120).optional(), attributes: z.string().max(2000).optional(), lang: z.enum(["en", "bn"]).default("en") }).parse(i))
  .handler(async ({ data }): Promise<{ text: string }> => {
    const { requireStaff } = await import("@/server/auth/context");
    const { aiComplete } = await import("@/server/ai");
    const { getAiConfig } = await import("@/server/site-config");
    await requireStaff();
    const tone = (await getAiConfig()).tone;
    const langLine = data.lang === "bn" ? "Write in natural Bengali (Bangla script)." : "Write in clear English.";
    const text = await aiComplete({
      system: `You are an e-commerce copywriter for a fish/grocery store. Tone: ${tone}. ${langLine} Output clean HTML using <p>, <ul><li>, <strong> only — no markdown, no headings above h3, no wrapper tags.`,
      prompt: `Write an engaging, accurate product description (90-160 words) for: "${data.name}".${data.category ? ` Category: ${data.category}.` : ""}${data.attributes ? ` Details: ${data.attributes}.` : ""} Include a short intro paragraph and a <ul> of 3-5 key selling points. Do not invent certifications or false claims.`,
      maxTokens: 700,
    });
    return { text };
  });

export const aiGenerateMeta = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ title: z.string().trim().min(1).max(200), content: z.string().max(6000).optional(), focusKeyword: z.string().max(120).optional() }).parse(i))
  .handler(async ({ data }): Promise<{ metaTitle: string; metaDescription: string }> => {
    const { requireStaff } = await import("@/server/auth/context");
    const { aiComplete, parseJsonReply } = await import("@/server/ai");
    await requireStaff();
    const reply = await aiComplete({
      system: "You are an SEO expert. Return ONLY a JSON object, no prose.",
      prompt: `For a page titled "${data.title}"${data.focusKeyword ? ` (focus keyphrase: "${data.focusKeyword}")` : ""}${data.content ? `, content: "${data.content.slice(0, 1500)}"` : ""}, produce an SEO meta title (<= 60 chars, include the keyphrase near the front) and meta description (140-155 chars, compelling, includes the keyphrase). Return JSON: {"metaTitle":"...","metaDescription":"..."}`,
      maxTokens: 300,
    });
    const j = parseJsonReply<{ metaTitle?: string; metaDescription?: string }>(reply);
    return { metaTitle: (j?.metaTitle ?? "").slice(0, 70), metaDescription: (j?.metaDescription ?? "").slice(0, 200) };
  });

export const aiAssist = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ text: z.string().trim().min(1).max(12000), action: z.enum(["draft", "expand", "improve", "summarize", "translate"]), lang: z.string().max(20).optional() }).parse(i))
  .handler(async ({ data }): Promise<{ text: string }> => {
    const { requireStaff } = await import("@/server/auth/context");
    const { aiComplete } = await import("@/server/ai");
    const { getAiConfig } = await import("@/server/site-config");
    await requireStaff();
    const tone = (await getAiConfig()).tone;
    const instr: Record<string, string> = {
      draft: `Write a well-structured article/section on this topic. Tone: ${tone}.`,
      expand: "Expand and enrich this content with more detail and examples, keeping the meaning and language.",
      improve: "Improve clarity, grammar, and flow. Keep the same language and meaning.",
      summarize: "Summarize this into a concise version keeping key points.",
      translate: `Translate this into ${data.lang || "Bengali"}, natural and idiomatic.`,
    };
    const text = await aiComplete({
      system: `You are an expert content editor. Output clean HTML (<p>, <h2>, <h3>, <ul><li>, <strong>) — no markdown, no wrapper tags, no commentary.`,
      prompt: `${instr[data.action]}\n\nContent:\n${data.text}`,
      maxTokens: 2000,
    });
    return { text };
  });

export const aiAltText = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ context: z.string().trim().min(1).max(300) }).parse(i))
  .handler(async ({ data }): Promise<{ text: string }> => {
    const { requireStaff } = await import("@/server/auth/context");
    const { aiComplete } = await import("@/server/ai");
    await requireStaff();
    const text = await aiComplete({
      system: "You write concise, descriptive image alt text for accessibility and SEO. Return only the alt text, max 125 characters, no quotes.",
      prompt: `Write alt text for an image of: ${data.context}`,
      maxTokens: 80,
    });
    return { text: text.replace(/^["']|["']$/g, "").slice(0, 125) };
  });
