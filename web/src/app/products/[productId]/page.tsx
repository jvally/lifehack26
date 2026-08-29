import { ProductDashboard } from "@/components/product-dashboard";

export default async function ProductPage({ params }: { params: Promise<{ productId: string }> }) { const { productId } = await params; return <ProductDashboard productId={productId} />; }
