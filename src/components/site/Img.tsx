import { withBase } from "@/lib/base-path";

// Responsive image: emits WebP srcset via the /media/tr transform route with
// explicit width/height (CLS = 0) and fetchpriority for LCP images. Falls back
// to a plain <img> for non-local sources (e.g. absolute external URLs).
type Props = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  sizes?: string;
  widths?: number[];
  priority?: boolean;
  className?: string;
};

export function Img({ src, alt, width, height, sizes = "100vw", widths = [400, 800, 1200], priority = false, className }: Props) {
  const local = !!src && (src.startsWith("/uploads/") || src.startsWith("/img/"));
  if (!local) {
    return <img src={src} alt={alt} width={width} height={height} loading={priority ? "eager" : "lazy"} decoding="async" className={className} {...(priority ? { fetchPriority: "high" as const } : {})} />;
  }
  const tr = (w: number, f = "webp") => withBase(`/media/tr?src=${encodeURIComponent(src)}&w=${w}&f=${f}`);
  const srcSet = widths.map((w) => `${tr(w)} ${w}w`).join(", ");
  return (
    <img
      src={tr(widths[widths.length - 1])}
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={className}
      {...(priority ? { fetchPriority: "high" as const } : {})}
    />
  );
}
