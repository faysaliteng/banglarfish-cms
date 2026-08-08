import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type PluginField = { key: string; label: string; type: "text" | "password" | "number" | "checkbox"; placeholder?: string; help?: string };
export type SettingsVal = string | number | boolean;
export type PluginInfo = {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  permissions: string[];
  fields: PluginField[];
  enabled: boolean;
  settings: Record<string, SettingsVal>;
};

export const adminListPlugins = createServerFn({ method: "GET" }).handler(async (): Promise<PluginInfo[]> => {
  const { requireStaff } = await import("@/server/auth/context");
  const { listPluginsWithState } = await import("@/server/plugins");
  await requireStaff();
  const rows = await listPluginsWithState();
  return rows.map((r) => ({
    id: r.manifest.id, name: r.manifest.name, version: r.manifest.version, description: r.manifest.description,
    author: r.manifest.author, permissions: r.manifest.permissions, fields: r.manifest.settings ?? [],
    enabled: r.enabled, settings: (r.settings ?? {}) as Record<string, SettingsVal>,
  }));
});

export const adminTogglePlugin = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ id: z.string().max(80), enabled: z.boolean() }).parse(i))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireManager } = await import("@/server/auth/context");
    const { setPluginEnabled } = await import("@/server/plugins");
    const { audit } = await import("@/server/audit");
    const actor = await requireManager();
    await setPluginEnabled(data.id, data.enabled);
    await audit(actor, "plugin.toggle", "plugin", data.id, { enabled: data.enabled });
    return { ok: true };
  });

export const adminSavePluginSettings = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ id: z.string().max(80), settings: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])) }).parse(i))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireManager } = await import("@/server/auth/context");
    const { setPluginSettings } = await import("@/server/plugins");
    await requireManager();
    await setPluginSettings(data.id, data.settings as Record<string, unknown>);
    return { ok: true };
  });
