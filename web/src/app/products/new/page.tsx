"use client";

import { useRouter } from "next/navigation";
import { ImportListingForm } from "@/components/import-listing-form";

export default function NewProductPage() {
  const router = useRouter();

  return (
    <main id="main-content" className="min-h-[calc(100vh-72px)] px-4 py-12 sm:px-6 sm:py-16">
      <ImportListingForm
        offlineDemo={process.env.NEXT_PUBLIC_OFFLINE_DEMO === "true"}
        onImported={(productId) => router.push(`/products/${productId}`)}
      />
    </main>
  );
}
