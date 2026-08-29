import type { EvidenceStatus } from "@/domain/passport";

const presentation: Record<EvidenceStatus, { label: string; className: string }> = {
  verified: { label: "Verified", className: "border border-[#206b4d]/40 bg-[#edf7f1] text-[#206b4d]" },
  seller_declared: { label: "Seller declared", className: "border border-[var(--ink)]/25 bg-white text-[var(--ink)]" },
  ai_inferred: { label: "AI inferred", className: "border border-[#95651c]/40 bg-[#fff9e8] text-[#765018]" },
  missing: { label: "Missing", className: "border border-[var(--missing)]/40 bg-[#fff5f2] text-[var(--missing)]" },
};

export function EvidenceBadge({ status }: { status: EvidenceStatus }) {
  const item = presentation[status];
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${item.className}`}>{item.label}</span>;
}
