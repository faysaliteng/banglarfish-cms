import { createFileRoute, notFound } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { getStoreContact, submitContact } from "@/lib/community.functions";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Mail, Phone, MapPin, Send } from "lucide-react";

export const Route = createFileRoute("/contact")({
  loader: async () => {
    const info = await getStoreContact();
    if (!info.enabled) throw notFound();
    return { info };
  },
  head: () => ({
    meta: [
      { title: "Contact — Banglarfish" },
      { name: "description", content: "Get in touch with us — questions, orders, wholesale and support." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const { info } = Route.useLoaderData();
  const submitFn = useServerFn(submitContact);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await submitFn({ data: form });
      setSent(true);
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not send message");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SiteLayout>
      <div className="container-x py-10 max-w-5xl">
        <h1 className="text-3xl font-bold mb-1">Contact us</h1>
        <p className="text-sm text-muted-foreground mb-8">We'd love to hear from you. Send us a message and we'll get back to you soon.</p>

        <div className="grid md:grid-cols-[1fr_1.4fr] gap-8">
          <div className="space-y-4">
            {info.phone && (
              <a href={`tel:${info.phone}`} className="flex items-start gap-3 rounded-xl border p-4 bg-card hover:border-primary transition">
                <Phone className="h-5 w-5 text-primary shrink-0" />
                <div><p className="text-xs text-muted-foreground uppercase font-semibold">Phone</p><p className="font-medium">{info.phone}</p></div>
              </a>
            )}
            {info.email && (
              <a href={`mailto:${info.email}`} className="flex items-start gap-3 rounded-xl border p-4 bg-card hover:border-primary transition">
                <Mail className="h-5 w-5 text-primary shrink-0" />
                <div><p className="text-xs text-muted-foreground uppercase font-semibold">Email</p><p className="font-medium break-all">{info.email}</p></div>
              </a>
            )}
            {info.address && (
              <div className="flex items-start gap-3 rounded-xl border p-4 bg-card">
                <MapPin className="h-5 w-5 text-primary shrink-0" />
                <div><p className="text-xs text-muted-foreground uppercase font-semibold">Address</p><p className="font-medium whitespace-pre-line">{info.address}</p></div>
              </div>
            )}
          </div>

          <div>
            {sent ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-800 p-6">
                <h2 className="font-bold text-lg">Message sent ✓</h2>
                <p className="text-sm mt-1">Thanks for reaching out — we'll reply to you as soon as possible.</p>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="rounded-2xl border p-6 bg-card">
                <div className="grid sm:grid-cols-2 gap-3">
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name *" required className="border rounded-md px-3 py-2 text-sm" />
                  <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" placeholder="Email *" required className="border rounded-md px-3 py-2 text-sm" />
                </div>
                <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Subject" className="mt-3 w-full border rounded-md px-3 py-2 text-sm" />
                <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Your message *" rows={6} required className="mt-3 w-full border rounded-md px-3 py-2 text-sm" />
                {err && <p className="text-sm text-destructive mt-2">{err}</p>}
                <button disabled={busy} className="mt-4 inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-md font-semibold hover:bg-primary/90 disabled:opacity-60">
                  <Send className="h-4 w-4" /> {busy ? "Sending…" : "Send message"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
