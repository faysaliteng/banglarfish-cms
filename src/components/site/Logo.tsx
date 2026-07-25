import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getBranding } from "@/lib/site.functions";

// Brand logo — reads admin-editable branding (logo light/dark) with local fallbacks.
export function Logo({ variant = "light", className = "h-10 w-auto" }: { variant?: "light" | "dark"; className?: string }) {
  const brandingFn = useServerFn(getBranding);
  const { data } = useQuery({ queryKey: ["branding"], queryFn: () => brandingFn(), staleTime: 300_000 });
  const src = variant === "dark" ? data?.logoDark || "/img/logo-dark.png" : data?.logoLight || "/img/logo-light.png";
  return <img src={src} alt={data?.storeName || "Banglarfish"} className={className} />;
}
