import type { MarketSignal } from "@/domain/market";
import { ApiRequestError } from "@/lib/api-response";

export type SellerAnswerInput = {
  featureKey: string;
  label: string;
  value: string | number | boolean | string[] | null;
  unit: string | null;
  unknown: boolean;
  evidenceId: string | null;
  evidenceText: string | null;
};

export type ApplicationServices = {
  extractProduct(productId: string): Promise<unknown>;
  evaluateProduct(productId: string): Promise<unknown>;
  startInterview(productId: string): Promise<unknown>;
  answerInterview(sessionId: string, answer: SellerAnswerInput): Promise<unknown>;
  simulateProduct(productId: string, query: string): Promise<unknown>;
  importMarketSignals(signals: MarketSignal[]): Promise<unknown>;
};

function unavailable(): never {
  throw new ApiRequestError(
    "APPLICATION_SERVICE_UNAVAILABLE",
    "The application service has not been connected yet.",
    503,
  );
}

async function unavailableApplicationMethod(): Promise<never> {
  return unavailable();
}

// Role 2 and Role 3 replace this boundary with their composed implementation.
export const applicationServices: ApplicationServices = {
  extractProduct: unavailableApplicationMethod,
  evaluateProduct: unavailableApplicationMethod,
  startInterview: unavailableApplicationMethod,
  answerInterview: unavailableApplicationMethod,
  simulateProduct: unavailableApplicationMethod,
  importMarketSignals: unavailableApplicationMethod,
};

export function getRequiredApplicationServices(): ApplicationServices {
  if (
    applicationServices.importMarketSignals === unavailableApplicationMethod ||
    applicationServices.extractProduct === unavailableApplicationMethod
  ) {
    return unavailable();
  }
  return applicationServices;
}
