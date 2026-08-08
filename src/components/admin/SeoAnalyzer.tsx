import { useMemo, useState } from "react";
import { analyzeSeo, type SeoInput } from "@/lib/seo-analyzer";
import { Check, AlertTriangle, X, Gauge } from "lucide-react";

/**
 * Yoast / Rank Math-style live SEO analysis. Pass the draft fields; it renders
 * a focus-keyword input, an overall score, and a traffic-light checklist.
 */
export function SeoAnalyzer(props: Omit<SeoInput, "focusKeyword"> & { compact?: boolean; focusKeyword?: string }) {
  const [kw, setKw] = useState(props.focusKeyword ?? "");
  const report = useMemo(() => analyzeSeo({ ...props, focusKeyword: kw }), [props, kw]);

  const ring = report.grade === "good" ? "text-emerald-600" : report.grade === "ok" ? "text-amber-500" : "text-red-500";
  const bar = report.grade === "good" ? "bg-emerald-500" : report.grade === "ok" ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="border rounded-2xl p-4 bg-card">
      <div className="flex items-center gap-3 mb-3">
        <Gauge className={`h-5 w-5 ${ring}`} />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-sm">SEO analysis</span>
            <span className={`text-sm font-bold ${ring}`}>{report.score}/100 · {report.grade === "good" ? "Good" : report.grade === "ok" ? "OK" : "Needs work"}</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden mt-1"><div className={`h-full rounded-full transition-all ${bar}`} style={{ width: `${report.score}%` }} /></div>
        </div>
      </div>

      <label className="block mb-3">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Focus keyword</span>
        <input value={kw} onChange={(e) => setKw(e.target.value)} placeholder="e.g. organic green tea" className="mt-1 w-full border rounded-md px-3 py-2 text-sm" />
      </label>

      <ul className="space-y-1.5">
        {report.checks.map((c) => (
          <li key={c.id} className="flex items-start gap-2 text-sm">
            {c.status === "good" ? <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" /> : c.status === "warn" ? <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" /> : <X className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />}
            <span className={c.status === "bad" ? "text-red-700" : c.status === "warn" ? "text-amber-800" : "text-muted-foreground"}>{c.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
