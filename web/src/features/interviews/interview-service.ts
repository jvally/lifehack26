import type { CategoryIntelligence } from "@/domain/market";
import type { AiGateway } from "@/services/ai-gateway";
import type {
  EvidenceRepository,
  ProductRepository,
  SessionRepository,
} from "@/services/repositories/contracts";
import { evaluateListing } from "@/features/evaluation/evaluate-listing";
import { selectNextGap } from "./question-priority";
import {
  applySellerAnswer,
  SellerAnswerSchema,
  type SellerAnswer,
} from "./answer-application";

type InterviewDependencies = {
  products: ProductRepository;
  sessions: SessionRepository;
  evidence: EvidenceRepository;
  ai: AiGateway;
  intelligence: CategoryIntelligence;
};

export async function startInterview(
  productId: string,
  dependencies: InterviewDependencies,
) {
  const product = await dependencies.products.get(productId);
  if (!product?.passport || !product.evaluation) {
    throw new Error("INTERVIEW_PRODUCT_NOT_READY");
  }
  const session = await dependencies.sessions.create(productId);
  const nextGap = selectNextGap(product.evaluation.gaps, []);
  if (nextGap) {
    await dependencies.sessions.appendMessage(session.id, {
      id: crypto.randomUUID(),
      role: "assistant",
      content: nextGap.question,
      featureKey: nextGap.featureKey,
      createdAt: new Date().toISOString(),
    });
  }
  return { session, nextGap };
}

export async function answerInterview(
  sessionId: string,
  answerInput: SellerAnswer & { evidenceText: string | null },
  dependencies: InterviewDependencies,
  now: Date = new Date(),
) {
  const answer = SellerAnswerSchema.parse(answerInput);
  const session = await dependencies.sessions.get(sessionId);
  if (!session) {
    throw new Error("INTERVIEW_SESSION_NOT_FOUND");
  }
  const product = await dependencies.products.get(session.productId);
  if (!product?.passport) {
    throw new Error("INTERVIEW_PRODUCT_PASSPORT_MISSING");
  }
  let supported = false;
  let evidenceId: string | null = null;
  if (!answer.unknown && answerInput.evidenceText?.trim()) {
    const verdict = await dependencies.ai.verifyEvidence({
      featureKey: answer.featureKey,
      value: answer.value,
      evidenceText: answerInput.evidenceText,
    });
    const record = await dependencies.evidence.create({
      productId: product.id,
      featureKey: answer.featureKey,
      originalName: null,
      mediaType: "text/plain",
      storagePath: null,
      extractedText: answerInput.evidenceText,
      supported: verdict.supported,
      supportingExcerpt: verdict.supportingExcerpt,
    });
    supported = verdict.supported;
    evidenceId = record.id;
  }
  const passport = applySellerAnswer(
    product.passport,
    { ...answer, evidenceId },
    { supported },
    now,
  );
  const evaluation = evaluateListing(
    passport,
    dependencies.intelligence,
    now,
  );
  await dependencies.products.savePassport(product.id, passport);
  await dependencies.products.saveEvaluation(product.id, evaluation);
  await dependencies.sessions.markAsked(session.id, answer.featureKey);
  await dependencies.sessions.appendMessage(session.id, {
    id: crypto.randomUUID(),
    role: "seller",
    content: answer.unknown ? "Unknown" : String(answer.value),
    featureKey: answer.featureKey,
    createdAt: now.toISOString(),
  });
  const nextGap = selectNextGap(evaluation.gaps, [
    ...session.askedFeatureKeys,
    answer.featureKey,
  ]);
  return { passport, evaluation, nextGap };
}