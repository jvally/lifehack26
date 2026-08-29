import type { Metadata } from "next";
import { CataloguePage } from "@/components/catalogue-page";

export const metadata: Metadata = {
  title: "Product Catalogue | RetailReady",
  description: "Browse verified product specifications in the RetailReady catalogue.",
};

export default function CatalogPage() {
  return <CataloguePage />;
}
