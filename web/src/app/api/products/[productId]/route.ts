import { z } from "zod";
import { FeatureScalarSchema } from "@/domain/passport";
import { applySellerAnswer } from "@/features/interviews/answer-application";
import { evaluateListing } from "@/features/evaluation/evaluate-listing";
import { loadIntelligence } from "@/services/application-service";
import {
  ApiRequestError,
  apiSuccess,
  withApiErrors,
} from "@/lib/api-response";
import { getApplicationDependencies } from "@/services/container";

const ParamsSchema = z.object({ productId: z.string().uuid() });

export async function GET(
  _request: Request,
  context: { params: Promise<{ productId: string }> },
) {
  return withApiErrors(async () => {
    const { productId } = ParamsSchema.parse(await context.params);
    const product = await getApplicationDependencies().products.get(productId);
    if (!product) {
      throw new ApiRequestError(
        "PRODUCT_NOT_FOUND",
        "The product was not found.",
        404,
      );
    }
    return apiSuccess(product);
  });
}

const UpdateSchema = z.object({
  featureKey: z.string().min(1),
  label: z.string().min(1),
  value: FeatureScalarSchema,
  unit: z.string().nullable(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ productId: string }> },
) {
  return withApiErrors(async () => {
    const { productId } = ParamsSchema.parse(await context.params);
    const update = UpdateSchema.parse(await request.json());
    const dependencies = getApplicationDependencies();
    const product = await dependencies.products.get(productId);
    if (!product?.passport) {
      throw new ApiRequestError(
        "PRODUCT_PASSPORT_NOT_FOUND",
        "The product does not have a passport.",
        404,
      );
    }
    const intelligence = await loadIntelligence(productId, dependencies);
    const definition = intelligence.features.find(
      (feature) => feature.key === update.featureKey,
    );
    if (!definition) {
      throw new ApiRequestError(
        "FEATURE_NOT_FOUND",
        "The product specification is not supported for this category.",
        400,
      );
    }
    const passport = applySellerAnswer(
      product.passport,
      { ...update, unknown: false, evidenceId: null },
      { supported: false },
    );
    await dependencies.products.savePassport(productId, passport);
    const evaluation = evaluateListing(passport, intelligence);
    await dependencies.products.saveEvaluation(productId, evaluation);
    return apiSuccess({ passport, evaluation });
  });
}
