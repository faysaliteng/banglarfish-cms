import { eq } from "drizzle-orm";
import { db } from "./db";
import { settings } from "./db/schema";
import { defaultSettings, defaultHomepage, defaultTheme } from "./content-defaults";
import type { Settings, Homepage, Theme } from "@/lib/types";

export async function getSettingsValue(): Promise<Settings> {
  const [row] = await db.select().from(settings).where(eq(settings.key, "store")).limit(1);
  return { ...defaultSettings, ...((row?.value as Partial<Settings>) ?? {}) };
}

export async function getHomepageValue(): Promise<Homepage> {
  const [row] = await db.select().from(settings).where(eq(settings.key, "homepage")).limit(1);
  const saved = (row?.value as Partial<Homepage>) ?? {};
  // Deep-merge sections so newly added module toggles (e.g. comments/contact) always resolve.
  return { ...defaultHomepage, ...saved, sections: { ...defaultHomepage.sections, ...(saved.sections ?? {}) } };
}

export async function saveSettingsValue(value: Settings): Promise<void> {
  await db
    .insert(settings)
    .values({ key: "store", value: value as unknown as Record<string, unknown>, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.key, set: { value: value as unknown as Record<string, unknown>, updatedAt: new Date() } });
}

export async function saveHomepageValue(value: Homepage): Promise<void> {
  await db
    .insert(settings)
    .values({ key: "homepage", value: value as unknown as Record<string, unknown>, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.key, set: { value: value as unknown as Record<string, unknown>, updatedAt: new Date() } });
}

export async function getThemeValue(): Promise<Theme> {
  const [row] = await db.select().from(settings).where(eq(settings.key, "theme")).limit(1);
  return { ...defaultTheme, ...((row?.value as Partial<Theme>) ?? {}) };
}

export async function saveThemeValue(value: Theme): Promise<void> {
  await db
    .insert(settings)
    .values({ key: "theme", value: value as unknown as Record<string, unknown>, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.key, set: { value: value as unknown as Record<string, unknown>, updatedAt: new Date() } });
}
