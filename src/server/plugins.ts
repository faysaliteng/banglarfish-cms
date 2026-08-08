// Plugin kernel (secure model). Plugins are FIRST-PARTY, compiled-in modules —
// there is deliberately no uploadable/arbitrary-code execution (that would be an
// RCE hole). They register against the typed event bus + filter hooks through a
// capability-scoped context, and are enabled/disabled/configured from the admin.
// Third parties extend by adding a module to this registry via the repo.
import { on as busOn, type EventMap } from "./events";
import { registerJob, enqueue } from "./jobs";
import { db } from "./db";
import { settings as settingsTable } from "./db/schema";
import { eq } from "drizzle-orm";

/* ---------------- Filter hooks (transform-a-value, like WP filters) ---------------- */
const g = globalThis as unknown as { __bfFilters?: Map<string, { fn: (v: unknown, ...a: unknown[]) => unknown | Promise<unknown>; priority: number }[]>; __bfPluginState?: { at: number; map: Record<string, PluginState> } };

export function addFilter(name: string, fn: (v: unknown, ...a: unknown[]) => unknown | Promise<unknown>, priority = 10): void {
  const m = (g.__bfFilters ??= new Map());
  const arr: { fn: (v: unknown, ...a: unknown[]) => unknown | Promise<unknown>; priority: number }[] = m.get(name) ?? [];
  arr.push({ fn, priority });
  arr.sort((a, b) => a.priority - b.priority);
  m.set(name, arr);
}

export async function applyFilters<T>(name: string, value: T, ...args: unknown[]): Promise<T> {
  const arr = g.__bfFilters?.get(name);
  if (!arr) return value;
  let v: unknown = value;
  for (const { fn } of arr) {
    try { v = await fn(v, ...args); } catch (e) { console.error(`[filter] ${name} failed`, e); }
  }
  return v as T;
}

/* ---------------- Plugin types + SDK ---------------- */
export type PluginField = { key: string; label: string; type: "text" | "password" | "number" | "checkbox"; placeholder?: string; help?: string };
export type PluginManifest = {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  permissions: string[]; // display-only transparency (e.g. "events:order.paid", "http:api.telegram.org")
  settings?: PluginField[];
};
export type PluginContext = {
  settings: Record<string, unknown>;
  on: <E extends keyof EventMap>(event: E, handler: (payload: EventMap[E], settings: Record<string, unknown>) => void | Promise<void>) => void;
  addFilter: (name: string, fn: (v: unknown, ...a: unknown[]) => unknown | Promise<unknown>, priority?: number) => void;
  registerJob: typeof registerJob;
  enqueue: typeof enqueue;
  log: (...a: unknown[]) => void;
};
export type Plugin = { manifest: PluginManifest; setup: (ctx: PluginContext) => void };
export function definePlugin(manifest: PluginManifest, setup: (ctx: PluginContext) => void): Plugin {
  return { manifest, setup };
}

/* ---------------- Enabled state (settings key "plugins", cached) ---------------- */
type PluginState = { enabled: boolean; settings: Record<string, unknown> };
type PluginStore = Record<string, PluginState>;

async function loadState(): Promise<PluginStore> {
  const cache = g.__bfPluginState;
  if (cache && Date.now() - cache.at < 15_000) return cache.map;
  let map: PluginStore = {};
  try {
    const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, "plugins")).limit(1);
    map = ((row?.value as PluginStore) ?? {}) as PluginStore;
  } catch { /* default empty */ }
  g.__bfPluginState = { at: Date.now(), map };
  return map;
}

export async function savePluginStore(map: PluginStore): Promise<void> {
  await db.insert(settingsTable).values({ key: "plugins", value: map as unknown as Record<string, unknown>, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settingsTable.key, set: { value: map as unknown as Record<string, unknown>, updatedAt: new Date() } });
  g.__bfPluginState = { at: Date.now(), map };
}

async function stateFor(id: string): Promise<PluginState> {
  const m = await loadState();
  return m[id] ?? { enabled: false, settings: {} };
}

/* ---------------- Boot: register all bundled plugins with live-toggle wrappers ---------------- */
let booted = false;
export async function bootPlugins(): Promise<void> {
  if (booted) return;
  booted = true;
  for (const p of BUNDLED_PLUGINS) {
    try {
      const ctx: PluginContext = {
        settings: {}, // handlers read current settings at run time via the wrapper
        on: (event, handler) => {
          busOn(event, async (payload) => {
            const st = await stateFor(p.manifest.id);
            if (!st.enabled) return; // live enable/disable, no restart needed
            await handler(payload as never, st.settings);
          });
        },
        addFilter: (name, fn, priority) => {
          addFilter(name, async (v, ...a) => {
            const st = await stateFor(p.manifest.id);
            if (!st.enabled) return v;
            return fn(v, ...a);
          }, priority);
        },
        registerJob,
        enqueue,
        log: (...a) => console.log(`[plugin:${p.manifest.id}]`, ...a),
      };
      p.setup(ctx);
    } catch (e) {
      console.error(`[plugin:${p.manifest.id}] setup failed`, e);
    }
  }
  console.log(`[kernel] ${BUNDLED_PLUGINS.length} plugins registered`);
}

/* ---------------- Admin helpers ---------------- */
export async function listPluginsWithState() {
  const store = await loadState();
  return BUNDLED_PLUGINS.map((p) => ({
    manifest: p.manifest,
    enabled: store[p.manifest.id]?.enabled ?? false,
    settings: store[p.manifest.id]?.settings ?? {},
  }));
}

export async function setPluginEnabled(id: string, enabled: boolean): Promise<void> {
  if (!BUNDLED_PLUGINS.some((p) => p.manifest.id === id)) throw new Error("Unknown plugin");
  const store = await loadState();
  store[id] = { enabled, settings: store[id]?.settings ?? {} };
  await savePluginStore(store);
}

export async function setPluginSettings(id: string, s: Record<string, unknown>): Promise<void> {
  if (!BUNDLED_PLUGINS.some((p) => p.manifest.id === id)) throw new Error("Unknown plugin");
  const store = await loadState();
  store[id] = { enabled: store[id]?.enabled ?? false, settings: s };
  await savePluginStore(store);
}

/* ================= Bundled first-party plugins ================= */

// 1) Telegram order notifier — sends a message on every paid order.
const telegramNotifier = definePlugin(
  { id: "telegram-orders", name: "Telegram Order Notifier", version: "1.0.0", description: "Sends a Telegram message to your channel/chat whenever an order is paid.", author: "Banglarfish", permissions: ["events:order.paid", "http:api.telegram.org"], settings: [
    { key: "botToken", label: "Bot token", type: "password", placeholder: "123456:ABC-...", help: "From @BotFather" },
    { key: "chatId", label: "Chat ID", type: "text", placeholder: "-1001234567890" },
  ] },
  (ctx) => {
    ctx.registerJob("plugin.telegram.send", async (p) => {
      const token = String(p.botToken || ""), chatId = String(p.chatId || ""), text = String(p.text || "");
      if (!token || !chatId) return;
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }), signal: AbortSignal.timeout(8000),
      });
    });
    ctx.on("order.paid", async (o, s) => {
      await ctx.enqueue("plugin.telegram.send", { botToken: s.botToken, chatId: s.chatId, text: `✅ <b>Paid order ${o.orderNumber}</b>\nTotal: ${o.total}\nVia: ${o.provider}` });
    });
  },
);

// 2) Admin SMS order alert — texts the store owner on every new order.
const adminOrderAlert = definePlugin(
  { id: "admin-sms-alert", name: "Admin Order SMS Alert", version: "1.0.0", description: "Sends an SMS to the store owner whenever a new order is placed.", author: "Banglarfish", permissions: ["events:order.created", "sms"], settings: [
    { key: "adminPhone", label: "Admin phone", type: "text", placeholder: "017XXXXXXXX" },
  ] },
  (ctx) => {
    ctx.on("order.created", async (o, s) => {
      const to = String(s.adminPhone || "");
      if (!to) return;
      await ctx.enqueue("notify.sms", { to, message: `New order ${o.orderNumber} — ৳${o.total}. Check admin.` });
    });
  },
);

// 3) Slack/Discord webhook — posts paid orders to an incoming webhook URL.
const chatWebhook = definePlugin(
  { id: "chat-webhook", name: "Slack / Discord Order Webhook", version: "1.0.0", description: "Posts paid orders to a Slack or Discord incoming webhook.", author: "Banglarfish", permissions: ["events:order.paid", "http:*"], settings: [
    { key: "url", label: "Incoming webhook URL", type: "text", placeholder: "https://hooks.slack.com/... or https://discord.com/api/webhooks/..." },
  ] },
  (ctx) => {
    ctx.registerJob("plugin.chatwebhook.post", async (p) => {
      const url = String(p.url || ""); if (!url) return;
      const content = String(p.text || "");
      const isDiscord = url.includes("discord");
      await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(isDiscord ? { content } : { text: content }), signal: AbortSignal.timeout(8000) });
    });
    ctx.on("order.paid", async (o, s) => {
      await ctx.enqueue("plugin.chatwebhook.post", { url: s.url, text: `💰 Paid order ${o.orderNumber} — total ${o.total} (${o.provider})` });
    });
  },
);

export const BUNDLED_PLUGINS: Plugin[] = [telegramNotifier, adminOrderAlert, chatWebhook];
