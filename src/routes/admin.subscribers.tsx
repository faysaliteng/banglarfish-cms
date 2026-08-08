import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminListSubscribers } from "@/lib/catalog.functions";
import { Mail, Download, Ticket } from "lucide-react";

export const Route = createFileRoute("/admin/subscribers")({ component: SubscribersPage });

function SubscribersPage() {
  const listFn = useServerFn(adminListSubscribers);
  const { data: subs = [], isLoading } = useQuery({ queryKey: ["admin-subscribers"], queryFn: () => listFn() });

  function exportCsv() {
    const rows = [["email", "coupon", "subscribed"], ...subs.map((s) => [s.email, s.couponCode, new Date(s.createdAt).toISOString()])];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="pb-10 max-w-3xl">
      <div className="flex items-center justify-between gap-3 mb-1">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2"><Mail className="h-6 w-6" /> Newsletter Subscribers</h1>
        {subs.length > 0 && <button onClick={exportCsv} className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-md border hover:bg-muted"><Download className="h-4 w-4" /> Export CSV</button>}
      </div>
      <p className="text-sm text-muted-foreground mb-6">Everyone who signed up via the storefront newsletter. Each new subscriber automatically gets a one-time <strong>10% welcome coupon</strong> emailed to them. {subs.length} subscriber(s).</p>

      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : subs.length === 0 ? (
        <div className="border rounded-2xl p-12 text-center bg-card text-muted-foreground">No subscribers yet.</div>
      ) : (
        <div className="border rounded-xl bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-muted/50 text-left"><th className="px-4 py-2.5 font-semibold">Email</th><th className="px-4 py-2.5 font-semibold">Welcome coupon</th><th className="px-4 py-2.5 font-semibold">Subscribed</th></tr></thead>
            <tbody className="divide-y">
              {subs.map((s, i) => (
                <tr key={i}>
                  <td className="px-4 py-2.5 break-all">{s.email}</td>
                  <td className="px-4 py-2.5">{s.couponCode ? <span className="inline-flex items-center gap-1 font-mono text-xs bg-muted rounded px-2 py-1"><Ticket className="h-3 w-3" />{s.couponCode}</span> : <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{new Date(s.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
