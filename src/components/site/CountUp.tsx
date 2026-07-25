import { useEffect, useRef, useState } from "react";

// Parse a stat string like "10K+", "24hr", "৳2,000", "50+" into
// { prefix, target, suffix } so we can animate just the numeric part.
function parse(value: string): { prefix: string; target: number; suffix: string } | null {
  const m = String(value).match(/^(\D*)([\d,]+)(.*)$/);
  if (!m) return null;
  const target = Number(m[2].replace(/,/g, ""));
  if (!Number.isFinite(target)) return null;
  return { prefix: m[1] ?? "", target, suffix: m[3] ?? "" };
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Animated number that counts up on mount (hero stats are above the fold).
 * Accepts the raw stat string and preserves any prefix/suffix ("K+", "hr", "৳").
 * Falls back to rendering the string verbatim if it has no number.
 */
export function CountUp({ value, duration = 1500, className = "" }: { value: string; duration?: number; className?: string }) {
  const parsed = parse(value);
  const [n, setN] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (!parsed) return;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setN(Math.round(easeOut(p) * parsed.target));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (!parsed) return <span className={className}>{value}</span>;
  return (
    <span className={className}>
      {parsed.prefix}
      {n.toLocaleString()}
      {parsed.suffix}
    </span>
  );
}
