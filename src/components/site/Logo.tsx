import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getBranding } from "@/lib/site.functions";
import { Img } from "./Img";

// Brand logo — reads admin-editable branding (logo light/dark) with local fallbacks.
export function Logo({ variant = "light", className = "h-10 w-auto" }: { variant?: "light" | "dark"; className?: string }) {
  const brandingFn = useServerFn(getBranding);
  const { data } = useQuery({ queryKey: ["branding"], queryFn: () => brandingFn(), staleTime: 300_000 });
  const src = variant === "dark" ? data?.logoDark || "/img/logo-dark.png" : data?.logoLight || "/img/logo-light.png";
  // The logo is above the fold on every page, so it is eager + high priority —
  // but it renders at ~44px tall, so serve a small WebP rather than the
  // full-size PNG (which was ~120KB on every single page view).
  return <Img src={src} alt={data?.storeName || "Banglarfish"} priority width={300} height={100} sizes="180px" widths={[180, 360]} className={className} />;
}
