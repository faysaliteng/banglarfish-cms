// Payment gateway adapters for Bangladesh: COD, SSLCommerz, bKash, Nagad.
// Credentials + mode are read from the admin-editable DB config (site-config.ts),
// falling back to environment variables. PAYMENT mode:
//   simulate — built-in mock (testable without credentials); this is the default
//   sandbox | live — real gateway APIs using the configured credentials.
import { getPaymentConfig, type PaymentConfig } from "@/server/site-config";

export type OrderForPayment = {
  id: string;
  orderNumber: string;
  total: number;
  fullName: string;
  phone: string;
  email?: string;
  city?: string;
  address?: string;
};

export type InitResult = { redirectUrl: string; transactionId?: string; sessionKey?: string; raw?: Record<string, unknown> };
export type VerifyResult = { orderNumber?: string; transactionId?: string; status: "paid" | "failed" | "cancelled"; raw?: Record<string, unknown> };
export type PaymentMethod = "cod" | "bkash" | "nagad" | "card";

const providerName = (m: PaymentMethod) => (m === "card" ? "sslcommerz" : m);

/* ---------------- SIMULATE ---------------- */
function simulateInitiate(order: OrderForPayment, baseUrl: string, provider: string): InitResult {
  const tran = `SIM-${provider.toUpperCase()}-${order.orderNumber}`;
  const url = `${baseUrl}/api/payment/simulate/pay?order=${encodeURIComponent(order.orderNumber)}&provider=${provider}&tran=${encodeURIComponent(tran)}`;
  return { redirectUrl: url, transactionId: tran };
}

/* ---------------- SSLCommerz ---------------- */
async function sslcommerzInitiate(cfg: PaymentConfig, order: OrderForPayment, baseUrl: string): Promise<InitResult> {
  const { storeId, storePasswd } = cfg.sslcommerz;
  if (!storeId || !storePasswd) return simulateInitiate(order, baseUrl, "sslcommerz");
  const live = cfg.mode === "live";
  const api = live ? "https://securepay.sslcommerz.com/gwprocess/v4/api.php" : "https://sandbox.sslcommerz.com/gwprocess/v4/api.php";
  const form = new URLSearchParams({
    store_id: storeId, store_passwd: storePasswd, total_amount: String(order.total), currency: "BDT", tran_id: order.orderNumber,
    success_url: `${baseUrl}/api/payment/sslcommerz/success`, fail_url: `${baseUrl}/api/payment/sslcommerz/fail`,
    cancel_url: `${baseUrl}/api/payment/sslcommerz/cancel`, ipn_url: `${baseUrl}/api/payment/sslcommerz/ipn`,
    cus_name: order.fullName, cus_email: order.email || "customer@example.com", cus_phone: order.phone,
    cus_add1: order.address || "N/A", cus_city: order.city || "Dhaka", cus_country: "Bangladesh", shipping_method: "Courier",
    product_name: `Order ${order.orderNumber}`, product_category: "General", product_profile: "physical-goods",
  });
  const res = await fetch(api, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: form });
  const data = (await res.json()) as { status?: string; GatewayPageURL?: string; sessionkey?: string };
  if (data.status !== "SUCCESS" || !data.GatewayPageURL) throw new Error("SSLCommerz session failed");
  return { redirectUrl: data.GatewayPageURL, sessionKey: data.sessionkey, raw: data };
}

async function sslcommerzVerify(cfg: PaymentConfig, action: string, params: URLSearchParams, body: Record<string, string>): Promise<VerifyResult> {
  const orderNumber = body.tran_id || params.get("tran_id") || undefined;
  if (action === "fail") return { orderNumber, status: "failed" };
  if (action === "cancel") return { orderNumber, status: "cancelled" };
  const { storeId, storePasswd } = cfg.sslcommerz;
  const valId = body.val_id || params.get("val_id");
  if (storeId && storePasswd && valId) {
    const live = cfg.mode === "live";
    const base = live ? "https://securepay.sslcommerz.com" : "https://sandbox.sslcommerz.com";
    try {
      const r = await fetch(`${base}/validator/api/validationserverAPI.php?val_id=${encodeURIComponent(valId)}&store_id=${storeId}&store_passwd=${storePasswd}&format=json`);
      const v = (await r.json()) as { status?: string; tran_id?: string; bank_tran_id?: string };
      const ok = v.status === "VALID" || v.status === "VALIDATED";
      return { orderNumber: v.tran_id || orderNumber, transactionId: v.bank_tran_id, status: ok ? "paid" : "failed", raw: v };
    } catch {
      return { orderNumber, status: "failed" };
    }
  }
  return { orderNumber, transactionId: body.bank_tran_id, status: "paid" };
}

/* ---------------- bKash ---------------- */
async function bkashToken(cfg: PaymentConfig): Promise<{ token: string; base: string; appKey: string } | null> {
  const { appKey, appSecret, username, password } = cfg.bkash;
  if (!appKey || !appSecret || !username || !password) return null;
  const base = cfg.mode === "live" ? "https://tokenized.pay.bka.sh/v1.2.0-beta" : "https://tokenized.sandbox.bka.sh/v1.2.0-beta";
  const res = await fetch(`${base}/tokenized/checkout/token/grant`, {
    method: "POST", headers: { "content-type": "application/json", accept: "application/json", username, password },
    body: JSON.stringify({ app_key: appKey, app_secret: appSecret }),
  });
  const j = (await res.json()) as { id_token?: string };
  return j.id_token ? { token: j.id_token, base, appKey } : null;
}

async function bkashInitiate(cfg: PaymentConfig, order: OrderForPayment, baseUrl: string): Promise<InitResult> {
  const auth = await bkashToken(cfg);
  if (!auth) return simulateInitiate(order, baseUrl, "bkash");
  const res = await fetch(`${auth.base}/tokenized/checkout/create`, {
    method: "POST", headers: { "content-type": "application/json", accept: "application/json", authorization: auth.token, "x-app-key": auth.appKey },
    body: JSON.stringify({ mode: "0011", payerReference: order.phone, callbackURL: `${baseUrl}/api/payment/bkash/callback`, amount: String(order.total), currency: "BDT", intent: "sale", merchantInvoiceNumber: order.orderNumber }),
  });
  const j = (await res.json()) as { bkashURL?: string; paymentID?: string };
  if (!j.bkashURL) throw new Error("bKash create failed");
  return { redirectUrl: j.bkashURL, transactionId: j.paymentID, raw: j };
}

async function bkashVerify(cfg: PaymentConfig, action: string, params: URLSearchParams): Promise<VerifyResult> {
  const status = params.get("status");
  const paymentID = params.get("paymentID") || undefined;
  if (status === "cancel") return { status: "cancelled" };
  if (status === "failure") return { status: "failed" };
  const auth = await bkashToken(cfg);
  if (auth && paymentID) {
    const res = await fetch(`${auth.base}/tokenized/checkout/execute`, {
      method: "POST", headers: { "content-type": "application/json", accept: "application/json", authorization: auth.token, "x-app-key": auth.appKey },
      body: JSON.stringify({ paymentID }),
    });
    const j = (await res.json()) as { transactionStatus?: string; merchantInvoiceNumber?: string; trxID?: string };
    const ok = j.transactionStatus === "Completed";
    return { orderNumber: j.merchantInvoiceNumber, transactionId: j.trxID, status: ok ? "paid" : "failed", raw: j };
  }
  return { status: "failed" };
}

/* ---------------- Nagad (simulate fallback until RSA signing wired) ---------------- */
function nagadInitiate(order: OrderForPayment, baseUrl: string): InitResult {
  return simulateInitiate(order, baseUrl, "nagad");
}

/* ---------------- Resolver ---------------- */
export async function initiatePayment(method: PaymentMethod, order: OrderForPayment, baseUrl: string): Promise<InitResult & { provider: string }> {
  const cfg = await getPaymentConfig();
  const provider = providerName(method);
  if (cfg.mode === "simulate") return { ...simulateInitiate(order, baseUrl, provider), provider };
  let r: InitResult;
  if (method === "card") r = await sslcommerzInitiate(cfg, order, baseUrl);
  else if (method === "bkash") r = await bkashInitiate(cfg, order, baseUrl);
  else if (method === "nagad") r = nagadInitiate(order, baseUrl);
  else r = simulateInitiate(order, baseUrl, provider);
  return { ...r, provider };
}

// Refund dispatcher. In simulate mode (or COD) it's a book-keeping no-op that
// succeeds; for real gateways it's where the provider refund API is called.
// bKash/SSLCommerz refunds require their refund endpoints + credentials — until
// wired they return needsManual so staff complete it in the gateway dashboard.
export async function refundPayment(method: string, order: { orderNumber: string; transactionId: string | null }, amount: number): Promise<{ ok: boolean; needsManual?: boolean; note: string }> {
  const cfg = await getPaymentConfig();
  if (method === "cod") return { ok: true, note: "COD — no gateway refund needed" };
  if (cfg.mode === "simulate") return { ok: true, note: `Simulated refund of ${amount} for ${order.orderNumber}` };
  // Real gateway refund APIs (bKash /payment/refund, SSLCommerz refund) require the
  // original gateway transaction id + credentials; surface for manual completion.
  console.log(`[refund] ${method} refund ${amount} for ${order.orderNumber} (txn ${order.transactionId ?? "n/a"}) — complete in gateway dashboard`);
  return { ok: false, needsManual: true, note: `Recorded. Complete the ${method} refund in the gateway dashboard.` };
}

export async function verifyPayment(provider: string, action: string, params: URLSearchParams, body: Record<string, string>): Promise<VerifyResult> {
  const cfg = await getPaymentConfig();
  if (cfg.mode !== "simulate") {
    if (provider === "sslcommerz") return sslcommerzVerify(cfg, action, params, body);
    if (provider === "bkash") return bkashVerify(cfg, action, params);
  }
  const orderNumber = params.get("order") || body.order || undefined;
  const tran = params.get("tran") || body.tran || undefined;
  if (action === "cancel") return { orderNumber, status: "cancelled" };
  if (action === "fail") return { orderNumber, status: "failed" };
  return { orderNumber, transactionId: tran, status: "paid" };
}
