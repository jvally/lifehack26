import type { EvidenceStatus } from "@/domain/passport";

const presentation: Record<EvidenceStatus, { label: string; className: string }> = {
  verified: { label: "Verified", className: "bg-emerald-100 text-emerald-800" },
  seller_declared: { label: "Seller declared", className: "bg-blue-100 text-blue-800" },
  ai_inferred: { label: "AI inferred", className: "bg-amber-100 text-amber-800" },
  missing: { label: "Missing", className: "bg-red-100 text-red-800" },
};

export function EvidenceBadge({ status }: { status: EvidenceStatus }) {
  const item = presentation[status];
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${item.className}`}>{item.label}</span>;
}
