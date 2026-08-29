export type EvidenceRecord = {
  id: string;
  productId: string;
  featureKey: string;
  originalName: string | null;
  mediaType: string;
  storagePath: string | null;
  extractedText: string;
  supported: boolean;
  supportingExcerpt: string | null;
  createdAt: string;
};

export interface EvidenceRepository {
  create(
    input: Omit<EvidenceRecord, "id" | "createdAt">,
  ): Promise<EvidenceRecord>;
  listForProduct(productId: string): Promise<EvidenceRecord[]>;
}