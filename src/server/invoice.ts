// Server-side PDF invoice generation (pdfkit) — a real downloadable PDF, not a
// print-to-web page. Layout follows a standard commercial invoice: logo, boxed
// invoice meta (No. / Date / Due), Bill To + Ship To, itemized table, totals
// with a highlighted Balance Due, payment method, signature and thank-you.
import { db } from "./db";

export type InvoiceData = {
  store: { name: string; logo: string; email: string; phone: string; address: string };
  order_number: string; created_at: string; status: string;
  full_name: string; phone: string; email: string | null;
  address_line1: string; address_line2: string | null; city: string; district: string | null; postal_code: string | null;
  payment_method: string; payment_status: string;
  items: { name: string; weight: string; qty: number; price: number }[];
  subtotal: number; shipping: number; discount: number; tax: number; total: number;
};

// Fetch invoice data by order number (no auth — callers authorize).
export async function loadInvoiceData(orderNumber: string): Promise<(InvoiceData & { userId: string | null }) | null> {
  const schema = await import("./db/schema");
  const { eq } = await import("drizzle-orm");
  const [o] = await db.select().from(schema.orders).where(eq(schema.orders.orderNumber, orderNumber)).limit(1);
  if (!o) return null;
  const { getSettingsValue } = await import("./settings");
  const { getBrandingConfig } = await import("./site-config");
  const s = await getSettingsValue().catch(() => null);
  const b = await getBrandingConfig().catch(() => null);
  return {
    userId: o.userId ?? null,
    store: {
      name: b?.storeName || s?.storeName || "Banglarfish",
      logo: b?.logoLight || "",
      email: s?.storeEmail || "", phone: s?.storePhone || "", address: s?.address || "",
    },
    order_number: o.orderNumber, created_at: o.createdAt.toISOString(), status: o.status,
    full_name: o.fullName, phone: o.phone, email: o.email,
    address_line1: o.addressLine1, address_line2: o.addressLine2, city: o.city, district: o.district, postal_code: o.postalCode,
    payment_method: o.paymentMethod, payment_status: o.paymentStatus,
    items: (o.items ?? []) as InvoiceData["items"],
    subtotal: o.subtotal, shipping: o.shipping, discount: o.discount, tax: o.tax, total: o.total,
  };
}

// Resolve the store logo to an on-disk PNG/JPG buffer (or null).
async function loadLogo(logo: string): Promise<Buffer | null> {
  const { readFile } = await import("node:fs/promises");
  const path = await import("node:path");
  const candidates: string[] = [];
  if (logo && /^\/uploads\//.test(logo)) candidates.push(path.join(process.env.UPLOAD_DIR ?? path.join(process.cwd(), "public", "uploads"), path.basename(logo)));
  else if (logo && logo.startsWith("/")) candidates.push(path.join(process.cwd(), "public", logo), path.join(process.cwd(), ".output", "public", logo));
  candidates.push(path.join(process.cwd(), "public", "img", "logo-light.png"), path.join(process.cwd(), ".output", "public", "img", "logo-light.png"));
  for (const c of candidates) {
    try { const buf = await readFile(c); if (buf?.length) return buf; } catch { /* next */ }
  }
  return null;
}

// Characters that the Latin face (DejaVu) cannot render: Bengali block + ৳.
const NON_LATIN_RE = /[ঀ-৿]/;

type FontSet = { regular: string; bold: string; unicode: string | null };

// Locate usable TTFs. pdfkit's built-in AFM fonts are loaded via CommonJS
// __dirname, which doesn't exist in the ESM server bundle, so we must always
// supply our own TTF. `unicode` is a face covering BOTH Latin and Bengali/৳
// (GNU FreeSans) used for any string the Latin face can't fully render.
async function findFonts(): Promise<FontSet | null> {
  const { access } = await import("node:fs/promises");
  const path = await import("node:path");
  const dir = process.env.INVOICE_FONT_DIR ?? path.join(process.cwd(), "fonts");
  const exists = async (p: string) => { try { await access(p); return true; } catch { return false; } };

  const uniCandidates = [path.join(dir, "FreeSans.ttf"), "/usr/share/fonts/truetype/freefont/FreeSans.ttf"];
  let unicode: string | null = null;
  for (const c of uniCandidates) if (await exists(c)) { unicode = c; break; }

  const sets: { regular: string; bold: string }[] = [
    { regular: path.join(dir, "DejaVuSans.ttf"), bold: path.join(dir, "DejaVuSans-Bold.ttf") },
    { regular: "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", bold: "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" },
    { regular: "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf", bold: "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" },
  ];
  for (const s of sets) if (await exists(s.regular) && await exists(s.bold)) return { ...s, unicode };
  if (unicode) return { regular: unicode, bold: unicode, unicode };
  return null;
}

export async function renderInvoicePdf(inv: InvoiceData): Promise<Buffer> {
  // pdfkit (CJS) references __dirname for its standard fonts; shim it for ESM.
  const g = globalThis as unknown as { __dirname?: string };
  if (typeof g.__dirname === "undefined") g.__dirname = process.cwd();
  const PDFDocument = (await import("pdfkit")).default;
  const fonts = await findFonts();
  if (!fonts) throw new Error("No TTF font available for PDF generation (install fonts-dejavu-core / fonts-freefont-ttf).");

  const doc = new PDFDocument({ size: "A4", margin: 40, font: fonts.regular, info: { Title: `Invoice ${inv.order_number}` } });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  doc.registerFont("body", fonts.regular);
  doc.registerFont("bold", fonts.bold);
  const hasUni = !!fonts.unicode;
  if (fonts.unicode) doc.registerFont("uni", fonts.unicode);

  // Choose a face that can actually render the string.
  const F = (text: string, bold = false): string => (hasUni && NON_LATIN_RE.test(text) ? "uni" : bold ? "bold" : "body");
  const TAKA = hasUni ? "৳" : "Tk ";
  const money = (n: number) => `${TAKA}${(n || 0).toLocaleString("en-US")}`;

  const TEAL = "#0ea5b7", DARK = "#3f4652", INK = "#111827", GREY = "#6b7280", HAIR = "#e5e7eb";
  const M = 40, pageW = doc.page.width, pageH = doc.page.height, W = pageW - M * 2;

  /* ---------- 1. Header: INVOICE + logo ---------- */
  doc.font("bold").fontSize(32).fillColor(TEAL).text("INVOICE", M, 42);
  const logo = await loadLogo(inv.store.logo);
  if (logo) { try { doc.image(logo, pageW - M - 150, 40, { fit: [150, 48] }); } catch { /* skip */ } }
  else doc.font("bold").fontSize(16).fillColor(INK).text(inv.store.name, pageW - M - 200, 50, { width: 200, align: "right" });

  // Store contact line under the title.
  let y = 84;
  doc.font(F(inv.store.name, true)).fontSize(10).fillColor(INK).text(inv.store.name, M, y);
  y = doc.y + 1;
  doc.fontSize(8.5).fillColor(GREY);
  for (const line of [inv.store.address, inv.store.phone, inv.store.email].filter(Boolean) as string[]) {
    doc.font(F(line)).text(line, M, y, { width: 280 });
    y = doc.y;
  }

  /* ---------- 2. Boxed meta table: INVOICE NO. | DATE | DUE DATE ---------- */
  y = Math.max(y + 14, 140);
  const cols = 3, cw = W / cols, hRow = 19, vRow = 21;
  doc.rect(M, y, W, hRow).fill(TEAL);
  doc.font("bold").fontSize(8).fillColor("#ffffff");
  ["INVOICE NO.", "INVOICE DATE", "DUE DATE"].forEach((h, i) => doc.text(h, M + i * cw, y + 6, { width: cw, align: "center" }));
  const invDate = new Date(inv.created_at);
  const paid = inv.payment_status === "paid";
  const dueTxt = paid ? "PAID" : new Date(invDate.getTime() + 7 * 86400000).toLocaleDateString("en-GB");
  doc.rect(M, y + hRow, W, vRow).fillAndStroke("#ffffff", HAIR);
  for (let i = 1; i < cols; i++) doc.moveTo(M + i * cw, y + hRow).lineTo(M + i * cw, y + hRow + vRow).strokeColor(HAIR).lineWidth(0.5).stroke();
  doc.font("bold").fontSize(9).fillColor(INK);
  [inv.order_number, invDate.toLocaleDateString("en-GB"), dueTxt].forEach((v, i) => doc.text(v, M + i * cw, y + hRow + 6, { width: cw, align: "center" }));
  y += hRow + vRow + 22;

  /* ---------- 3. Bill To / Ship To ---------- */
  const halfW = W / 2 - 10;
  doc.font("bold").fontSize(9).fillColor(TEAL).text("BILL TO", M, y);
  doc.font("bold").fontSize(9).fillColor(TEAL).text("SHIP TO", M + W / 2, y);
  const bodyY = y + 14;
  doc.font(F(inv.full_name, true)).fontSize(9.5).fillColor(INK).text(inv.full_name, M, bodyY, { width: halfW });
  doc.font("body").fontSize(8.5).fillColor(GREY);
  for (const line of [inv.phone, inv.email || ""].filter(Boolean) as string[]) doc.font(F(line)).text(line, M, doc.y, { width: halfW });
  const billBottom = doc.y;
  const shipLines = [inv.address_line1, inv.address_line2, [inv.city, inv.district, inv.postal_code].filter(Boolean).join(", ")].filter(Boolean) as string[];
  let sy = bodyY;
  doc.fontSize(8.5).fillColor(GREY);
  for (const line of (shipLines.length ? shipLines : ["—"])) { doc.font(F(line)).text(line, M + W / 2, sy, { width: halfW }); sy = doc.y; }
  y = Math.max(billBottom, sy) + 22;

  /* ---------- 4. Items table ---------- */
  const cQty = M + W - 210, cUnit = M + W - 160, cAmt = M + W - 82;
  const drawItemsHeader = (yy: number) => {
    doc.rect(M, yy, W, 22).fill(TEAL);
    doc.rect(cAmt - 8, yy, W - (cAmt - 8 - M), 22).fill(DARK); // darker TOTAL column
    doc.font("bold").fontSize(8.5).fillColor("#ffffff");
    doc.text("DESCRIPTION", M + 8, yy + 7);
    doc.text("QTY", cQty, yy + 7, { width: 40, align: "center" });
    doc.text("UNIT PRICE", cUnit, yy + 7, { width: 70, align: "right" });
    doc.text("TOTAL", cAmt, yy + 7, { width: 74, align: "right" });
    return yy + 22;
  };
  y = drawItemsHeader(y);

  doc.fontSize(9);
  for (const it of inv.items) {
    const name = it.weight ? `${it.name} — ${it.weight}` : it.name;
    doc.font(F(name));
    const nameW = cQty - M - 20;
    const rowH = Math.max(21, doc.heightOfString(name, { width: nameW }) + 11);
    if (y + rowH > pageH - 150) { doc.addPage(); y = drawItemsHeader(50); doc.fontSize(9); }
    doc.fillColor(INK).text(name, M + 8, y + 6, { width: nameW });
    doc.font("body").fillColor(GREY).text(String(it.qty), cQty, y + 6, { width: 40, align: "center" });
    doc.font(F(money(it.price))).text(money(it.price), cUnit, y + 6, { width: 70, align: "right" });
    doc.font(F(money(it.price * it.qty), true)).fillColor(INK).text(money(it.price * it.qty), cAmt, y + 6, { width: 74, align: "right" });
    y += rowH;
    doc.moveTo(M, y).lineTo(M + W, y).strokeColor(HAIR).lineWidth(0.6).stroke();
  }

  /* ---------- 5. Totals ---------- */
  y += 14;
  const labX = M + W - 300, valX = M + W - 160;
  const row = (label: string, val: string) => {
    doc.font("body").fontSize(9).fillColor(GREY).text(label, labX, y, { width: 130, align: "right" });
    doc.font(F(val)).fontSize(9).fillColor(INK).text(val, valX, y, { width: 158, align: "right" });
    y += 16;
  };
  row("SUB TOTAL", money(inv.subtotal));
  if (inv.discount > 0) row("DISCOUNT", `-${money(inv.discount)}`);
  row("SHIPPING", inv.shipping === 0 ? "FREE" : money(inv.shipping));
  row("TOTAL TAX", money(inv.tax));

  // Balance Due bar: teal label block + dark value block (like the sample).
  y += 6;
  const barH = 26, barX = M + W - 300;
  doc.rect(barX, y, 140, barH).fill(TEAL);
  doc.rect(barX + 140, y, 160, barH).fill(DARK);
  doc.font("bold").fontSize(10).fillColor("#ffffff").text("BALANCE DUE", barX, y + 8, { width: 140, align: "center" });
  doc.font(F(money(inv.total), true)).fontSize(12).fillColor("#ffffff").text(money(inv.total), barX + 140, y + 7, { width: 148, align: "right" });
  y += barH + 26;

  /* ---------- 6. Payment method + signature ---------- */
  const footY = Math.min(y, pageH - 150);
  doc.font("bold").fontSize(9).fillColor(INK).text("PAYMENT METHOD", M, footY);
  doc.font("body").fontSize(8.5).fillColor(GREY);
  const payLines = [
    `Method: ${inv.payment_method.toUpperCase()}`,
    `Status: ${inv.payment_status.charAt(0).toUpperCase() + inv.payment_status.slice(1)}`,
    `Order status: ${inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}`,
  ];
  let py = footY + 14;
  for (const l of payLines) { doc.text(l, M, py, { width: 240 }); py = doc.y; }

  // Signature line (right).
  const sigX = pageW - M - 170;
  doc.moveTo(sigX, footY + 44).lineTo(pageW - M, footY + 44).strokeColor(HAIR).lineWidth(0.8).stroke();
  doc.font("bold").fontSize(9).fillColor(INK).text("MANAGER", sigX, footY + 50, { width: 170, align: "center" });

  /* ---------- 7. Thank you ---------- */
  doc.font("bold").fontSize(18).fillColor(TEAL).text("THANK YOU", M, pageH - 92, { width: W, align: "center" });
  if (inv.store.email) doc.font("body").fontSize(8.5).fillColor(GREY).text(`Questions about this invoice? ${inv.store.email}`, M, pageH - 68, { width: W, align: "center" });

  doc.end();
  return done;
}
