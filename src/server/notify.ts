// Customer notifications (SMS via Boomcast; extend with email/SMTP if desired).
import { sendSms } from "./sms/boomcast";

export async function sendOrderConfirmation(phone: string, orderNumber: string, total: number, paid: boolean): Promise<void> {
  try {
    await sendSms(phone, `Banglarfish: Order #${orderNumber} for ৳${total} is confirmed${paid ? " and paid" : " (Cash on Delivery)"}. Track it in your account. Thank you!`);
  } catch (e) {
    console.error("[notify] order confirmation failed", e);
  }
}

const STATUS_LABEL: Record<string, string> = {
  confirmed: "confirmed",
  processing: "being prepared",
  packed: "packed",
  shipped: "out for delivery",
  delivered: "delivered",
  cancelled: "cancelled",
  refunded: "refunded",
};

export async function sendStatusUpdate(phone: string, orderNumber: string, status: string): Promise<void> {
  const label = STATUS_LABEL[status] ?? status;
  try {
    await sendSms(phone, `Banglarfish: Your order #${orderNumber} is now ${label}.`);
  } catch (e) {
    console.error("[notify] status update failed", e);
  }
}
