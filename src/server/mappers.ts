import type { Product } from "@/lib/types";
import type { products as productsTable, productVariants } from "./db/schema";

type ProductRow = typeof productsTable.$inferSelect;
type VariantRow = typeof productVariants.$inferSelect;

export function toProduct(row: ProductRow, variants: VariantRow[] = []): Product {
  const sortedVariants = [...variants].sort((a, b) => a.sort - b.sort);
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    bn: row.bn,
    category: row.categorySlug,
    price: row.price,
    compareAt: row.compareAt ?? undefined,
    unit: row.unit,
    weightOptions: sortedVariants.length ? sortedVariants.map((v) => v.label) : (row.weightOptions ?? []),
    optionGroups: (row.optionGroups ?? []) as Product["optionGroups"],
    image: row.image,
    images: row.images ?? [],
    stock: row.stock,
    rating: row.rating,
    reviews: row.reviewsCount,
    isNew: row.isNewArrival,
    isBest: row.isBestSeller,
    description: row.description,
    variants: sortedVariants.map((v) => ({ id: v.id, label: v.label, price: v.price, stock: v.stock, sku: v.sku ?? undefined, attributes: (v as { attributes?: { name: string; value: string }[] }).attributes ?? [] })),
    tags: row.tags ?? [],
    attributes: row.attributes ?? [],
    sku: row.sku ?? undefined,
    brand: row.brand ?? undefined,
    taxClass: (row as { taxClass?: string }).taxClass ?? "standard",
    shippingClass: (row as { shippingClass?: string }).shippingClass ?? "",
    lowStockThreshold: (row as { lowStockThreshold?: number }).lowStockThreshold ?? 0,
    isDigital: (row as { isDigital?: boolean }).isDigital ?? false,
    downloadUrl: (row as { downloadUrl?: string }).downloadUrl ?? "",
    noindex: (row as { noindex?: boolean }).noindex ?? false,
    focusKeyword: (row as { focusKeyword?: string }).focusKeyword ?? "",
    metaTitle: row.metaTitle ?? undefined,
    metaDescription: row.metaDescription ?? undefined,
    ogImage: row.ogImage ?? undefined,
  };
}
