/**
 * Email template types and helpers.
 *
 * The templates themselves live in ./email-templates.data — roughly 400 KB of
 * copy in two languages, which must not sit in the admin's main bundle. This
 * module holds only the types and the pure functions, so the compose modal can
 * import the send-time guard cheaply while the data arrives in the picker's
 * lazily-loaded chunk.
 *
 * Free of server imports on purpose: the browser picker and the server's
 * transactional sends read the same definitions. One source of truth, no drift.
 *
 * Bodies are body-only HTML fragments. The branded shell — logo header, teal
 * accent, dark footer with the shop address and phone — is added by layout()
 * in src/server/email.ts at send time. A template that carried its own header
 * would render it twice.
 */

export type EmailTemplate = {
  id: string;
  category: TemplateCategory;
  name: string;
  description: string;
  subject: string;
  body: string;
  /** Bengali variant. Same meaning and same variables, written idiomatically. */
  subjectBn: string;
  bodyBn: string;
  variables: string[];
  tone?: "neutral" | "apologetic" | "celebratory" | "urgent" | "formal";
};

export type TemplateCategory =
  | "support"
  | "order"
  | "payment"
  | "returns"
  | "account"
  | "marketing"
  | "wholesale"
  | "operations";

export const TEMPLATE_CATEGORIES: { id: TemplateCategory; label: string; hint: string }[] = [
  { id: "support", label: "Support replies", hint: "Answering a customer in the inbox" },
  { id: "order", label: "Orders & fulfilment", hint: "Confirmations, delivery, delays" },
  { id: "payment", label: "Payment & refunds", hint: "Invoices, failed payments, refunds" },
  { id: "returns", label: "Returns & quality", hint: "Complaints, replacements, freshness" },
  { id: "account", label: "Account & security", hint: "Sign-up, passwords, 2FA" },
  { id: "marketing", label: "Marketing", hint: "Offers, back-in-stock, win-back" },
  { id: "wholesale", label: "B2B & wholesale", hint: "Quotes, bulk orders, partners" },
  { id: "operations", label: "Operations", hint: "Slots, closures, announcements" },
];

/**
 * Variables the app can fill in automatically when a template is opened from a
 * message or an order. Anything not listed here is left for the admin to type.
 */
export const KNOWN_VARIABLES: Record<string, string> = {
  customer_name: "Customer's name",
  agent_name: "Your name",
  store_name: "Shop name",
  store_phone: "Shop phone number",
  support_email: "Support address",
  order_number: "Order number",
  order_total: "Order total",
  order_date: "Order date",
  order_url: "Link to the order",
  invoice_url: "Link to the invoice PDF",
  tracking_url: "Tracking link",
  delivery_date: "Delivery date",
  delivery_slot: "Delivery time window",
  item_list: "List of items",
  product_name: "Product name",
  quantity: "Quantity",
  unit_price: "Unit price",
  address: "Delivery address",
  ticket_id: "Support ticket reference",
  refund_amount: "Refund amount",
  payment_method: "Payment method",
  transaction_id: "Transaction / TrxID",
  payment_url: "Payment link",
  coupon_code: "Discount code",
  gift_card_code: "Gift card / store credit code",
  discount_percent: "Discount percentage",
  expiry_date: "Expiry date",
  reason: "Reason",
  eta: "Expected time",
  unsubscribe_url: "Unsubscribe link",
};

const VAR_RE = /\{\{\s*([a-z0-9_]+)\s*\}\}/gi;

/** Replace {{variables}} with supplied values. Unknown keys are left in place. */
export function fillTemplate(text: string, vars: Record<string, string | undefined>): string {
  return text.replace(VAR_RE, (whole, key: string) => {
    const v = vars[key.toLowerCase()];
    return v === undefined || v === "" ? whole : v;
  });
}

/**
 * Which {{variables}} are still unfilled. The compose modal blocks Send on a
 * non-empty result — shipping a literal "{{customer_name}}" to a paying
 * customer is the single most embarrassing failure this feature can have.
 */
export function unfilledVariables(...parts: string[]): string[] {
  const found = new Set<string>();
  for (const p of parts) {
    for (const m of p.matchAll(VAR_RE)) found.add(m[1].toLowerCase());
  }
  return [...found];
}

/** Pick the language variant and fill it in one step. */
export function renderTemplate(
  t: EmailTemplate,
  vars: Record<string, string | undefined> = {},
  lang: "en" | "bn" = "en",
): { subject: string; body: string } {
  const subject = lang === "bn" && t.subjectBn ? t.subjectBn : t.subject;
  const body = lang === "bn" && t.bodyBn ? t.bodyBn : t.body;
  return { subject: fillTemplate(subject, vars), body: fillTemplate(body, vars) };
}
