// Typed in-process event bus (kernel). Core code and plugins subscribe to facts
// like `order.paid` or `content.published`. Handlers are error-contained — a
// throwing listener is logged and skipped, never breaking the emitter.
export type EventMap = {
  "order.created": { orderId: string; orderNumber: string; total: number };
  "order.paid": { orderId: string; orderNumber: string; total: number; provider: string };
  "order.status": { orderId: string; orderNumber: string; status: string };
  "content.published": { kind: "blog" | "page" | "product"; slug: string; id: string };
  "content.updated": { kind: "blog" | "page" | "product"; slug: string; id: string };
  "review.created": { productId: string; rating: number };
  "customer.registered": { userId: string; email: string };
};
export type EventName = keyof EventMap | (string & {});
type Handler = (payload: unknown) => void | Promise<void>;

const g = globalThis as unknown as { __bfEvents?: Map<string, Handler[]> };
function bus(): Map<string, Handler[]> {
  return (g.__bfEvents ??= new Map());
}

export function on<E extends keyof EventMap>(event: E, handler: (payload: EventMap[E]) => void | Promise<void>): () => void;
export function on(event: string, handler: Handler): () => void;
export function on(event: string, handler: Handler): () => void {
  const b = bus();
  const arr = b.get(event) ?? [];
  arr.push(handler);
  b.set(event, arr);
  return () => { const a = b.get(event); if (a) b.set(event, a.filter((h) => h !== handler)); };
}

export async function emit<E extends keyof EventMap>(event: E, payload: EventMap[E]): Promise<void>;
export async function emit(event: string, payload: unknown): Promise<void>;
export async function emit(event: string, payload: unknown): Promise<void> {
  const arr = bus().get(event);
  if (!arr || arr.length === 0) return;
  await Promise.allSettled(
    arr.map(async (h) => {
      try {
        await h(payload);
      } catch (e) {
        console.error(`[events] handler for "${event}" failed:`, e);
      }
    }),
  );
}
