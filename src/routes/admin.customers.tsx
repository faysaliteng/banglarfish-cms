import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listAllUsers, adminCreateUser, adminUpdateUser, adminSetUserStatus, adminDeleteUser } from "@/lib/admin-users.functions";
import { formatBDT } from "@/lib/cart";
import { Search, Trash2, Users, Pencil, Plus, Ban, CheckCircle2, KeyRound } from "lucide-react";
import { Modal } from "@/components/admin/Modal";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/customers")({ component: CustomersPage });

type Role = "customer" | "staff" | "manager" | "admin";
const ROLES: Role[] = ["customer", "staff", "manager", "admin"];

type Row = {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  district: string | null;
  postal_code: string | null;
  created_at: string;
  roles: string[];
  status: string;
  orders: number;
  spent: number;
};

function topRole(roles: string[]): Role {
  for (const r of [...ROLES].reverse()) if (roles.includes(r)) return r;
  return "customer";
}

const ROLE_BADGE: Record<Role, string> = {
  admin: "bg-amber-100 text-amber-700",
  manager: "bg-purple-100 text-purple-700",
  staff: "bg-sky-100 text-sky-700",
  customer: "bg-blue-100 text-blue-700",
};

function CustomersPage() {
  const fetchAll = useServerFn(listAllUsers);
  const create = useServerFn(adminCreateUser);
  const update = useServerFn(adminUpdateUser);
  const setStatus = useServerFn(adminSetUserStatus);
  const del = useServerFn(adminDeleteUser);

  const [users, setUsers] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [creating, setCreating] = useState(false);
  const [pwUser, setPwUser] = useState<Row | null>(null);

  const load = () => {
    setLoading(true);
    fetchAll()
      .then((d) => setUsers(d as Row[]))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const filtered = useMemo(
    () => users.filter((u) => !q || `${u.full_name} ${u.email} ${u.phone} ${u.city}`.toLowerCase().includes(q.toLowerCase())),
    [users, q],
  );

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await create({
        data: {
          email: String(fd.get("email") ?? ""),
          password: String(fd.get("password") ?? ""),
          full_name: String(fd.get("full_name") ?? ""),
          phone: String(fd.get("phone") ?? ""),
          address_line1: String(fd.get("address_line1") ?? ""),
          city: String(fd.get("city") ?? ""),
          district: String(fd.get("district") ?? "") || undefined,
          postal_code: String(fd.get("postal_code") ?? "") || undefined,
          role: (String(fd.get("role") ?? "customer") as Role),
        },
      });
      toast.success("User created");
      setCreating(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  async function onUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    const fd = new FormData(e.currentTarget);
    try {
      await update({
        data: {
          id: editing.id,
          email: String(fd.get("email") ?? "") || undefined,
          full_name: String(fd.get("full_name") ?? "") || undefined,
          phone: String(fd.get("phone") ?? "") || undefined,
          address_line1: String(fd.get("address_line1") ?? "") || undefined,
          address_line2: String(fd.get("address_line2") ?? "") || undefined,
          city: String(fd.get("city") ?? "") || undefined,
          district: String(fd.get("district") ?? "") || undefined,
          postal_code: String(fd.get("postal_code") ?? "") || undefined,
          role: (String(fd.get("role") ?? "customer") as Role),
        },
      });
      toast.success("Saved");
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  async function onPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!pwUser) return;
    const fd = new FormData(e.currentTarget);
    const pw = String(fd.get("password") ?? "");
    if (pw.length < 8) return toast.error("Password must be at least 8 characters");
    try {
      await update({ data: { id: pwUser.id, password: pw } });
      toast.success("Password reset");
      setPwUser(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  async function onDelete(u: Row) {
    if (!confirm(`Permanently delete ${u.email}?`)) return;
    try {
      await del({ data: { id: u.id } });
      toast.success("User deleted");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  async function onToggleStatus(u: Row) {
    const blocked = u.status === "blocked";
    try {
      await setStatus({ data: { id: u.id, status: blocked ? "active" : "blocked" } });
      toast.success(blocked ? "User unblocked" : "User blocked");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-sm text-muted-foreground">
            {users.length} total · {formatBDT(users.reduce((s, c) => s + c.spent, 0))} lifetime revenue
          </p>
        </div>
        <button onClick={() => setCreating(true)} className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-semibold flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add user
        </button>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="p-4 border-b">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users..." className="w-full border rounded-md pl-9 pr-3 py-2 text-sm" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[880px]">
            <thead>
              <tr className="text-left text-muted-foreground border-b bg-muted/30">
                <th className="py-3 px-4">User</th><th>Phone</th><th>City</th><th>Joined</th><th>Orders</th><th>Spent</th><th>Role</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={9} className="text-center py-12 text-muted-foreground">Loading…</td></tr>}
              {!loading && filtered.map((u) => {
                const role = topRole(u.roles);
                const blocked = u.status === "blocked";
                return (
                  <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                          {(u.full_name || u.email).slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{u.full_name || "—"}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>{u.phone || "—"}</td>
                    <td>{u.city || "—"}</td>
                    <td className="text-muted-foreground text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="font-semibold">{u.orders}</td>
                    <td className="font-semibold">{formatBDT(u.spent)}</td>
                    <td>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${ROLE_BADGE[role]}`}>
                        {role}
                      </span>
                    </td>
                    <td>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${blocked ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                        {blocked ? "Blocked" : "Active"}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => setEditing(u)} className="p-1.5 hover:bg-muted rounded text-primary" title="Edit"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => setPwUser(u)} className="p-1.5 hover:bg-muted rounded" title="Reset password"><KeyRound className="h-4 w-4" /></button>
                        <button onClick={() => onToggleStatus(u)} className="p-1.5 hover:bg-muted rounded" title={blocked ? "Unblock" : "Block"}>
                          {blocked ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Ban className="h-4 w-4 text-amber-600" />}
                        </button>
                        <button onClick={() => onDelete(u)} className="p-1.5 hover:bg-muted rounded text-destructive" title="Delete"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={9} className="text-center py-12 text-muted-foreground"><Users className="h-8 w-8 mx-auto mb-2 opacity-40" />No users</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={creating} onClose={() => setCreating(false)} title="Add user" size="lg">
        <form onSubmit={onCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <F name="full_name" label="Full name *" required />
          <F name="email" type="email" label="Email *" required />
          <F name="phone" label="Phone *" required />
          <F name="password" type="password" label="Password *" required minLength={8} />
          <div className="col-span-2"><F name="address_line1" label="Address *" required /></div>
          <F name="city" label="City *" defaultValue="Dhaka" required />
          <F name="district" label="District" />
          <F name="postal_code" label="Postal code" />
          <RoleSelect defaultValue="customer" />
          <div className="col-span-2 flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setCreating(false)} className="border px-4 py-2 rounded-md">Cancel</button>
            <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-semibold">Create user</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing ? `Edit ${editing.email}` : ""} size="lg">
        {editing && (
          <form onSubmit={onUpdate} className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <F name="full_name" label="Full name" defaultValue={editing.full_name} />
            <F name="email" type="email" label="Email" defaultValue={editing.email} />
            <F name="phone" label="Phone" defaultValue={editing.phone} />
            <RoleSelect defaultValue={topRole(editing.roles)} />
            <div className="col-span-2"><F name="address_line1" label="Address" defaultValue={editing.address_line1} /></div>
            <div className="col-span-2"><F name="address_line2" label="Address line 2" defaultValue={editing.address_line2 ?? ""} /></div>
            <F name="city" label="City" defaultValue={editing.city} />
            <F name="district" label="District" defaultValue={editing.district ?? ""} />
            <F name="postal_code" label="Postal code" defaultValue={editing.postal_code ?? ""} />
            <div className="col-span-2 flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditing(null)} className="border px-4 py-2 rounded-md">Cancel</button>
              <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-semibold">Save</button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={!!pwUser} onClose={() => setPwUser(null)} title={pwUser ? `Reset password for ${pwUser.email}` : ""}>
        {pwUser && (
          <form onSubmit={onPassword} className="space-y-3 text-sm">
            <F name="password" type="password" label="New password (min 8 chars)" required minLength={8} />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setPwUser(null)} className="border px-4 py-2 rounded-md">Cancel</button>
              <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-semibold">Reset password</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

function RoleSelect({ defaultValue }: { defaultValue: Role }) {
  return (
    <label className="block text-sm">
      <span className="block mb-1 text-muted-foreground text-xs font-medium">Role</span>
      <select name="role" defaultValue={defaultValue} className="w-full border rounded-md px-3 py-2 text-sm capitalize">
        {ROLES.map((r) => (
          <option key={r} value={r} className="capitalize">{r}</option>
        ))}
      </select>
    </label>
  );
}

function F({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block text-sm">
      <span className="block mb-1 text-muted-foreground text-xs font-medium">{label}</span>
      <input {...props} className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
    </label>
  );
}
