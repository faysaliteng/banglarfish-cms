// Editable notification templates (email + SMS), stored in the settings table so
// admins can customize wording without a redeploy. `{{var}}` placeholders are
// substituted at send time. Defaults are Bengali to match the storefront.
import { db } from "./db";
import { settings } from "./db/schema";
import { eq } from "drizzle-orm";
import type { EmailTemplates, SmsTemplates } from "@/lib/config-types";

export type { EmailTemplates, SmsTemplates };

const BTN = 'style="display:inline-block;background:#0ea5b7;color:#fff;text-decoration:none;font-weight:600;padding:11px 20px;border-radius:9px;margin:8px 0"';

// The email `body` is inner HTML wrapped by the branded layout at send time.
export const DEFAULT_EMAIL_TEMPLATES: EmailTemplates = {
  welcome: {
    subject: "{{store}}-এ স্বাগতম! 🎉",
    body: `<p style="line-height:1.7">হ্যালো {{name}}, {{store}}-এ আপনাকে স্বাগতম! আপনার অ্যাকাউন্ট প্রস্তুত। এখন আপনি শপিং করতে, অর্ডার ট্র্যাক করতে এবং সবকিছু পরিচালনা করতে পারবেন।</p>
<p><a href="{{url}}" ${BTN}>শপিং শুরু করুন</a></p>`,
  },
  passwordReset: {
    subject: "{{store}} — পাসওয়ার্ড রিসেট",
    body: `<p style="line-height:1.7">আপনার {{store}} পাসওয়ার্ড রিসেট করার অনুরোধ পেয়েছি। নিচের বাটনে ক্লিক করে নতুন পাসওয়ার্ড দিন। লিংকটি ১ ঘণ্টা পর মেয়াদ শেষ হবে।</p>
<p><a href="{{link}}" ${BTN}>পাসওয়ার্ড রিসেট করুন</a></p>
<p style="color:#6b7280;font-size:13px">বাটন কাজ না করলে এই লিংকটি ব্রাউজারে পেস্ট করুন:<br><span style="word-break:break-all">{{link}}</span></p>
<p style="color:#6b7280;font-size:13px">আপনি অনুরোধ না করে থাকলে এই ইমেইলটি উপেক্ষা করুন — পাসওয়ার্ড অপরিবর্তিত থাকবে।</p>`,
  },
  orderConfirm: {
    subject: "আপনার {{store}} অর্ডার #{{orderNumber}} নিশ্চিত হয়েছে",
    body: `<p style="line-height:1.7">ধন্যবাদ! আমরা আপনার অর্ডার পেয়েছি এবং প্রস্তুত করছি।</p>
{{items}}
<p style="font-size:16px"><strong>মোট: ৳{{total}}</strong> · {{payStatus}}</p>
<p><a href="{{url}}" ${BTN}>অর্ডার দেখুন</a></p>`,
  },
  orderStatus: {
    subject: "অর্ডার #{{orderNumber}} — {{status}}",
    body: `<p style="line-height:1.7">আপনার অর্ডার <strong>#{{orderNumber}}</strong> এখন <strong>{{status}}</strong>।</p>
<p><a href="{{url}}" ${BTN}>অর্ডার ট্র্যাক করুন</a></p>`,
  },
};

export const DEFAULT_SMS_TEMPLATES: SmsTemplates = {
  otp: "আপনার {{store}} যাচাইকরণ কোড: {{code}}। কোডটি ৫ মিনিটে মেয়াদ শেষ হবে। কারও সাথে শেয়ার করবেন না।",
  orderConfirm: "{{store}}: আপনার অর্ডার #{{orderNumber}} (৳{{total}}) নিশ্চিত হয়েছে {{payStatus}}। অ্যাকাউন্ট থেকে ট্র্যাক করুন। ধন্যবাদ!",
  orderStatus: "{{store}}: আপনার অর্ডার #{{orderNumber}} এখন {{status}}।",
};

// Replace {{var}} tokens; unknown tokens become empty.
export function fillTemplate(tpl: string, vars: Record<string, string>): string {
  return (tpl || "").replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, k: string) => (k in vars ? vars[k] : ""));
}

export async function getEmailTemplates(): Promise<EmailTemplates> {
  try {
    const [row] = await db.select().from(settings).where(eq(settings.key, "emailTemplates")).limit(1);
    const s = (row?.value as Partial<EmailTemplates>) ?? {};
    return {
      welcome: { ...DEFAULT_EMAIL_TEMPLATES.welcome, ...(s.welcome ?? {}) },
      passwordReset: { ...DEFAULT_EMAIL_TEMPLATES.passwordReset, ...(s.passwordReset ?? {}) },
      orderConfirm: { ...DEFAULT_EMAIL_TEMPLATES.orderConfirm, ...(s.orderConfirm ?? {}) },
      orderStatus: { ...DEFAULT_EMAIL_TEMPLATES.orderStatus, ...(s.orderStatus ?? {}) },
    };
  } catch {
    return DEFAULT_EMAIL_TEMPLATES;
  }
}

export async function saveEmailTemplates(t: EmailTemplates): Promise<void> {
  await db.insert(settings).values({ key: "emailTemplates", value: t as unknown as Record<string, unknown>, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.key, set: { value: t as unknown as Record<string, unknown>, updatedAt: new Date() } });
}

export async function getSmsTemplates(): Promise<SmsTemplates> {
  try {
    const [row] = await db.select().from(settings).where(eq(settings.key, "smsTemplates")).limit(1);
    return { ...DEFAULT_SMS_TEMPLATES, ...((row?.value as Partial<SmsTemplates>) ?? {}) };
  } catch {
    return DEFAULT_SMS_TEMPLATES;
  }
}

export async function saveSmsTemplates(t: SmsTemplates): Promise<void> {
  await db.insert(settings).values({ key: "smsTemplates", value: t as unknown as Record<string, unknown>, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.key, set: { value: t as unknown as Record<string, unknown>, updatedAt: new Date() } });
}
