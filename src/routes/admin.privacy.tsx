import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminExportUserData, adminEraseUser } from "@/lib/privacy.functions";
import { ShieldCheck, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/privacy")({
  head: () => ({ meta: [{ title: "Privacy & GDPR — Admin" }, { name: "robots", content: "noindex" }] }),
  component: PrivacyAdmin,
});

function PrivacyAdmin() {
  const exportFn = useServerFn(adminExportUserData);
  const eraseFn = useServerFn(adminEraseUser);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [eraseConfirm, setEraseConfirm] = useState("");

  async function onExport() {
    if (!email.trim()) return toast.error("Enter a customer email.");
    setBusy(true);
    try {
      const json = await exportFn({ data: { email: email.trim() } });
      const blob = new Blob([json], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `gdpr-export-${email.trim()}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success("Export downloaded.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(false);
    }
  }

  async function onErase() {
    setBusy(true);
    try {
      await eraseFn({ data: { email: email.trim(), confirm: "ERASE" } });
      toast.success(`Erased personal data for ${email.trim()}.`);
      setEraseConfirm("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erase failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-1">
        <div className="p-2 rounded-lg bg-primary/10 text-primary"><ShieldCheck className="h-5 w-5" /></div>
        <h1 className="text-2xl font-bold">Privacy & GDPR</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">Process data-subject requests. Export produces a full JSON of everything held about a customer; erasure anonymizes their orders and permanently removes personal data.</p>

      <div className="border rounded-2xl p-6 bg-card space-y-4">
        <label className="block text-sm">
          <span className="block mb-1 text-muted-foreground text-xs font-medium">Customer email</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="customer@example.com" className="w-full border rounded-md px-3 py-2.5 text-sm" />
        </label>

        <div className="flex flex-wrap gap-3">
          <button onClick={onExport} disabled={busy} className="inline-flex items-center gap-2 text-sm font-semibold border rounded-md px-4 py-2 hover:bg-muted disabled:opacity-60">
            <Download className="h-4 w-4" /> Export data (Right of access)
          </button>
        </div>

        <div className="pt-4 border-t border-destructive/20">
          <p className="text-sm font-semibold text-destructive flex items-center gap-2"><Trash2 className="h-4 w-4" /> Erase personal data (Right to erasure)</p>
          <p className="text-xs text-muted-foreground mt-1">Anonymizes this customer's orders and locks + scrubs their account. Staff accounts are protected. Type <strong>ERASE</strong> to confirm.</p>
          <div className="mt-3 flex gap-2">
            <input value={eraseConfirm} onChange={(e) => setEraseConfirm(e.target.value)} placeholder="ERASE" className="border rounded-md px-3 py-2 text-sm w-40" />
            <button onClick={onErase} disabled={busy || eraseConfirm !== "ERASE" || !email.trim()} className="text-sm font-semibold bg-destructive text-white px-4 py-2 rounded-md disabled:opacity-50">{busy ? "Working…" : "Erase now"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
