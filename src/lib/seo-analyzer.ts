// Client-safe SEO content analyzer (Yoast / Rank Math style). Pure functions.

export type SeoCheck = { id: string; status: "good" | "warn" | "bad"; text: string };
export type SeoReport = { score: number; grade: "good" | "ok" | "poor"; checks: SeoCheck[] };

export type SeoInput = {
  title: string;
  description: string;
  slug: string;
  content: string; // may contain HTML
  focusKeyword?: string;
  hasImage?: boolean;
};

const stripHtml = (s: string) => s.replace(/<[^>]*>/g, " ").replace(/&[a-z]+;/gi, " ").replace(/\s+/g, " ").trim();
const lc = (s: string) => (s || "").toLowerCase();
const wordCount = (s: string) => (stripHtml(s).match(/\b[\p{L}\p{N}']+\b/gu) || []).length;

export function analyzeSeo(input: SeoInput): SeoReport {
  const title = input.title || "";
  const desc = input.description || "";
  const slug = input.slug || "";
  const text = stripHtml(input.content || "");
  const kw = lc(input.focusKeyword || "").trim();
  const checks: SeoCheck[] = [];

  // Title length
  const tl = title.length;
  checks.push({ id: "title-len", status: tl >= 30 && tl <= 60 ? "good" : tl > 0 && tl <= 70 ? "warn" : "bad", text: tl === 0 ? "Add a title." : `Title is ${tl} characters (aim for 30–60).` });

  // Meta description length
  const dl = desc.length;
  checks.push({ id: "desc-len", status: dl >= 50 && dl <= 160 ? "good" : dl > 0 ? "warn" : "bad", text: dl === 0 ? "Add a meta description." : `Meta description is ${dl} characters (aim for 50–160).` });

  // Slug quality
  const goodSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 75;
  checks.push({ id: "slug", status: slug ? (goodSlug ? "good" : "warn") : "bad", text: slug ? (goodSlug ? "URL slug is clean and readable." : "Use a short, lowercase, hyphenated slug.") : "Add a URL slug." });

  // Content length
  const wc = wordCount(input.content || "");
  checks.push({ id: "content-len", status: wc >= 300 ? "good" : wc >= 120 ? "warn" : "bad", text: `Content is ~${wc} words (aim for 300+ for strong ranking).` });

  // Image
  checks.push({ id: "image", status: input.hasImage ? "good" : "warn", text: input.hasImage ? "A social/cover image is set." : "Add a cover / social image (og:image)." });

  if (kw) {
    checks.push({ id: "kw-title", status: lc(title).includes(kw) ? "good" : "bad", text: lc(title).includes(kw) ? "Focus keyword appears in the title." : "Focus keyword is missing from the title." });
    checks.push({ id: "kw-title-start", status: lc(title).startsWith(kw) ? "good" : "warn", text: lc(title).startsWith(kw) ? "Title starts with the focus keyword." : "Try starting the title with the focus keyword." });
    checks.push({ id: "kw-desc", status: lc(desc).includes(kw) ? "good" : "warn", text: lc(desc).includes(kw) ? "Focus keyword appears in the meta description." : "Add the focus keyword to the meta description." });
    checks.push({ id: "kw-slug", status: lc(slug).includes(kw.replace(/\s+/g, "-")) ? "good" : "warn", text: lc(slug).includes(kw.replace(/\s+/g, "-")) ? "Focus keyword appears in the URL." : "Include the focus keyword in the URL slug." });
    const occurrences = kw ? (lc(text).split(kw).length - 1) : 0;
    const density = wc ? (occurrences / wc) * 100 : 0;
    const densOk = occurrences >= 1 && density <= 3.5;
    checks.push({ id: "kw-content", status: occurrences === 0 ? "bad" : densOk ? "good" : "warn", text: occurrences === 0 ? "Focus keyword not found in the content." : `Focus keyword used ${occurrences}× (density ${density.toFixed(1)}%).` });
  } else {
    checks.push({ id: "kw", status: "warn", text: "Set a focus keyword to unlock keyword checks." });
  }

  const weight = { good: 1, warn: 0.5, bad: 0 } as const;
  const score = Math.round((checks.reduce((s, c) => s + weight[c.status], 0) / checks.length) * 100);
  const grade: SeoReport["grade"] = score >= 80 ? "good" : score >= 55 ? "ok" : "poor";
  return { score, grade, checks };
}
