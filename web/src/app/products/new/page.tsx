"use client";

import { useRouter } from "next/navigation";
import { ImportListingForm } from "@/components/import-listing-form";

export default function NewProductPage() { const router = useRouter(); return <main id="main-content" className="min-h-screen px-4 py-12 sm:px-6"><ImportListingForm onImported={(productId) => router.push(`/products/${productId}`)} /></main>; }
