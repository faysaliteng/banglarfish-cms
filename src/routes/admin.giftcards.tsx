import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminListGiftCards, adminCreateGiftCard, adminUpdateGiftCard, adminDeleteGiftCard, type GiftCardRow } from "@/lib/giftcards.functions";
import { formatBDT } from "@/lib/cart";
import { Gift, Plus, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/giftcards")({ component: GiftCardsPage });

function GiftCardsPage() {
  const listFn = useServerFn(adminListGiftCards);
  const createFn = useServerFn(adminCreateGiftCard);
  const updFn = useServerFn(adminUpdateGiftCard);
  const delFn = useServerFn(adminDeleteGiftCard);

  const [rows, setRows] = useState<GiftCardRow[]>([]);
  const [amount, setAmount] = useState(1000);
  const [code, setCode] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => listFn().then(setRows).catch((e) => toast.error(e instanceof Error ? e.message : "Failed"));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (amount <= 0) return;
    setBusy(true);
    try {
      const res = await createFn({ data: { amount, code: code.trim() || undefined, note: note.trim() || undefined } });
      toast.success(`Gift card ${res.code} created`);
      setCode(""); setNote(""); setAmount(1000);
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(false); }
  }
  async function toggle(g: GiftCardRow) { try { await updFn({ data: { id: g.id, active: !g.active } }); load(); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } }
  async function remove(g: GiftCardRow) { if (!confirm(`Delete gift card ${g.code}?`)) return; try { await delFn({ data: { id: g.id } }); toast.success("Deleted"); load(); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } }

  const outstanding = rows.filter((r) => r.active).reduce((s, r) => s + r.balance, 0);

  return (
    <div className="pb-16 max-w-4xl">
      <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 mb-1"><Gift className="h-6 w-6" /> Gift Cards</h1>
      <p className="text-sm text-muted-foreground mb-5">Issue prepaid gift cards / store credit. Customers redeem the code at checkout. Outstanding balance: <strong>{formatBDT(outstanding)}</strong>.</p>

      <form onSubmit={create} className="border rounded-2xl p-4 bg-card mb-6 grid sm:grid-cols-[140px_1fr_1fr_auto] gap-3 items-end">
        <label className="block">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Amount</span>
          <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value) || 0)} className="mt-1 w-full border rounded-md px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Code (blank = auto)</span>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="GIFT-XXXX-XXXX" className="mt-1 w-full border rounded-md px-3 py-2 text-sm font-mono" />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Note</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Eid promo" className="mt-1 w-full border rounded-md px-3 py-2 text-sm" />
        </label>
        <button disabled={busy} className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-semibold disabled:opacity-60"><Plus className="h-4 w-4" /> Issue</button>
      </form>

      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-muted-foreground border-b bg-muted/30">
                <th className="py-3 px-4">Code</th><th>Balance</th><th>Issued</th><th>Note</th><th>Active</th><th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((g) => (
                <tr key={g.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="py-3 px-4 font-mono text-xs">
                    <button onClick={() => { navigator.clipboard?.writeText(g.code); toast.success("Copied"); }} className="inline-flex items-center gap-1 hover:text-primary">{g.code} <Copy className="h-3 w-3" /></button>
                  </td>
                  <td className="font-semibold">{formatBDT(g.balance)} <span className="text-xs text-muted-foreground font-normal">/ {formatBDT(g.initialBalance)}</span></td>
                  <td className="text-xs text-muted-foreground">{new Date(g.createdAt).toLocaleDateString()}</td>
                  <td className="text-xs text-muted-foreground">{g.note || "—"}</td>
                  <td><button onClick={() => toggle(g)} className={`text-xs px-2 py-0.5 rounded-full font-semibold ${g.active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>{g.active ? "Active" : "Off"}</button></td>
                  <td><button onClick={() => remove(g)} className="p-1.5 hover:bg-muted rounded text-destructive"><Trash2 className="h-4 w-4" /></button></td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">No gift cards yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
