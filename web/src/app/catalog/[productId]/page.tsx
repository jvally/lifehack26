import type { Metadata } from "next";
import { CatalogueProductDetail } from "@/components/catalogue-product-detail";

export const metadata: Metadata = {
  title: "Product Details | RetailReady",
  description: "View verified product details and specifications in the RetailReady catalogue.",
};

export default async function CatalogProductDetailPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  return <CatalogueProductDetail productId={productId} />;
}
