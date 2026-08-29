import { z } from "zod";
import {
  FeatureScalarSchema,
  ProductPassportSchema,
  type ProductPassport,
} from "@/domain/passport";

export const SellerAnswerSchema = z.object({
  featureKey: z.string().min(1),
  label: z.string().min(1),
  value: FeatureScalarSchema.nullable(),
  unit: z.string().nullable(),
  unknown: z.boolean(),
  evidenceId: z.string().nullable(),
});

export type SellerAnswer = z.infer<typeof SellerAnswerSchema>;

export function applySellerAnswer(
  passport: ProductPassport,
  answer: SellerAnswer,
  verification: { supported: boolean },
  now: Date = new Date(),
): ProductPassport {
  const parsed = SellerAnswerSchema.parse(answer);
  if (parsed.unknown) {
    return ProductPassportSchema.parse({
      ...passport,
      updatedAt: now.toISOString(),
    });
  }
  if (parsed.value === null) {
    throw new Error("SELLER_ANSWER_VALUE_REQUIRED");
  }
  const status = verification.supported ? "verified" : "seller_declared";
  const feature = {
    key: parsed.featureKey,
    label: parsed.label,
    value: parsed.value,
    unit: parsed.unit,
    status,
    confidence: verification.supported ? 0.95 : 0.7,
    evidenceIds: parsed.evidenceId ? [parsed.evidenceId] : [],
  } as const;
  const features = passport.features.filter(
    (item) => item.key !== parsed.featureKey,
  );
  features.push(feature);
  return ProductPassportSchema.parse({
    ...passport,
    features,
    updatedAt: now.toISOString(),
  });
}