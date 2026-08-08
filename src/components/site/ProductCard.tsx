import { Link, useNavigate } from "@tanstack/react-router";
import { ShoppingBag, Star, Heart } from "lucide-react";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toggleWishlist } from "@/lib/account.functions";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import type { Product } from "@/lib/types";
import { cart, formatBDT } from "@/lib/cart";
import { Img } from "./Img";

export function ProductCard({ product }: { product: Product }) {
  const nav = useNavigate();
  const { t } = useI18n();
  const wishFn = useServerFn(toggleWishlist);
  const [wished, setWished] = useState(false);
  const [saving, setSaving] = useState(false);

  // Wishlist requires a signed-in user (the server fn calls requireUser), so
  // bounce guests to sign-in and bring them back here.
  async function onWish(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    setSaving(true);
    try {
      const r = await wishFn({ data: { productId: product.id } });
      setWished(!!r.inWishlist);
      toast.success(r.inWishlist ? "Saved to your wishlist" : "Removed from your wishlist");
    } catch {
      toast.message("Sign in to save items", { description: "Your wishlist is kept with your account." });
      nav({ to: "/auth", search: { next: `/product/${product.slug}` } });
    } finally { setSaving(false); }
  }

  const discount = product.compareAt
    ? Math.round(((product.compareAt - product.price) / product.compareAt) * 100)
    : 0;

  return (
    <div className="group relative flex flex-col rounded-xl border bg-card overflow-hidden hover:shadow-lg transition-shadow">
      <Link to="/product/$slug" params={{ slug: product.slug }} className="relative block aspect-square overflow-hidden bg-muted">
        <Img src={product.image} alt={product.name} width={400} height={400} sizes="(max-width: 768px) 50vw, 25vw" widths={[300, 600]} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <button
          onClick={onWish}
          disabled={saving}
          aria-label={wished ? "Remove from wishlist" : "Save to wishlist"}
          title={wished ? "Remove from wishlist" : "Save to wishlist"}
          className="absolute top-2 right-2 z-10 grid place-items-center h-8 w-8 rounded-full bg-white/90 shadow hover:bg-white transition disabled:opacity-60"
        >
          <Heart className={`h-4 w-4 ${wished ? "fill-[var(--color-brand)] text-[var(--color-brand)]" : "text-foreground/70"}`} />
        </button>
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {discount > 0 && <span className="bg-[var(--color-brand)] text-white text-[11px] font-bold px-2 py-0.5 rounded">−{discount}%</span>}
          {product.isNew && <span className="bg-primary text-white text-[11px] font-bold px-2 py-0.5 rounded">NEW</span>}
        </div>
      </Link>
      <div className="p-3 flex flex-col flex-1">
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
          <span className="font-medium text-foreground">{product.rating}</span>
          <span>({product.reviews})</span>
        </div>
        <Link to="/product/$slug" params={{ slug: product.slug }} className="font-medium leading-snug hover:text-primary line-clamp-2">
          {product.name}
        </Link>
        <p className="text-xs text-muted-foreground mt-0.5" style={{ fontFamily: "var(--font-bangla)" }}>{product.bn}</p>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-lg font-bold text-[var(--color-brand)]">{formatBDT(product.price)}</span>
          {product.compareAt && <span className="text-sm text-muted-foreground line-through">{formatBDT(product.compareAt)}</span>}
          {product.unit && <span className="text-xs text-muted-foreground">/{product.unit}</span>}
        </div>
        <button
          onClick={() => {
            const v = product.variants[1] ?? product.variants[0];
            cart.add({
              productId: product.id,
              variantId: v?.id ?? null,
              slug: product.slug,
              name: product.name,
              image: product.image,
              price: v?.price ?? product.price,
              weight: v?.label ?? product.weightOptions[1] ?? product.weightOptions[0] ?? "",
              isDigital: !!product.isDigital,
            });
          }}
          className="mt-3 inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground text-sm font-medium py-2 hover:bg-primary/90 transition"
        >
          <ShoppingBag className="h-4 w-4" /> {t("action.addToCart")}
        </button>
      </div>
    </div>
  );
}
