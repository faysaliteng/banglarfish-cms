import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminGetCustomerGroups, adminSaveCustomerGroups } from "@/lib/site.functions";
import type { CustomerGroupsConfig, CustomerGroup } from "@/lib/config-types";
import { UsersRound, Save, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/customer-groups")({ component: GroupsPage });

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "group";

function GroupsPage() {
  const getFn = useServerFn(adminGetCustomerGroups);
  const saveFn = useServerFn(adminSaveCustomerGroups);
  const [cfg, setCfg] = useState<CustomerGroupsConfig | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { getFn().then(setCfg).catch((e) => toast.error(e instanceof Error ? e.message : "Failed")); }, [getFn]);
  if (!cfg) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const update = (id: string, patch: Partial<CustomerGroup>) => setCfg({ ...cfg, groups: cfg.groups.map((g) => (g.id === id ? { ...g, ...patch } : g)) });
  function add() {
    const name = prompt("Group name (e.g. Distributor):");
    if (!name) return;
    const id = slugify(name);
    if (cfg!.groups.some((g) => g.id === id)) { toast.error("A group with that id exists"); return; }
    setCfg({ ...cfg!, groups: [...cfg!.groups, { id, name, discountPercent: 0, taxExempt: false }] });
  }
  function remove(id: string) {
    if (id === "retail") { toast.error("The default Retail group can't be removed"); return; }
    setCfg({ ...cfg!, groups: cfg!.groups.filter((g) => g.id !== id) });
  }
  async function save() {
    setSaving(true);
    try { await saveFn({ data: cfg! }); toast.success("Customer groups saved"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  }

  return (
    <div className="pb-16 max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2"><UsersRound className="h-6 w-6" /> Customer Groups (B2B)</h1>
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-md font-semibold hover:bg-primary/90 disabled:opacity-60"><Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}</button>
      </div>
      <p className="text-sm text-muted-foreground mb-6">Define pricing tiers for wholesale / VIP / distributor customers. Assign a group to a user in <strong>Users &amp; Roles</strong>. Group discount and tax-exemption are applied automatically at checkout.</p>

      <div className="flex justify-end mb-3">
        <button onClick={add} className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-md border hover:bg-muted"><Plus className="h-4 w-4" /> Add group</button>
      </div>

      <div className="space-y-3">
        {cfg.groups.map((g) => (
          <div key={g.id} className="border rounded-2xl p-4 bg-card grid sm:grid-cols-[1fr_120px_120px_auto] gap-3 items-end">
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Name</span>
              <input value={g.name} onChange={(e) => update(g.id, { name: e.target.value })} className="mt-1 w-full border rounded-md px-3 py-2 text-sm" />
              <code className="text-[11px] text-muted-foreground">{g.id}</code>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Discount %</span>
              <input type="number" step="0.1" value={g.discountPercent} onChange={(e) => update(g.id, { discountPercent: Number(e.target.value) || 0 })} className="mt-1 w-full border rounded-md px-3 py-2 text-sm" />
            </label>
            <label className="flex items-center gap-2 text-sm pb-2">
              <input type="checkbox" checked={g.taxExempt} onChange={(e) => update(g.id, { taxExempt: e.target.checked })} /> Tax exempt
            </label>
            <button onClick={() => remove(g.id)} disabled={g.id === "retail"} className="p-2 rounded hover:bg-muted text-destructive disabled:opacity-30 justify-self-end"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
