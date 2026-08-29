import { ProductPassportDraftSchema, OpenAIAiGateway } from "@/services/ai-gateway";

async function main() {
  const draft = await new OpenAIAiGateway().extractProduct({
    externalId: "contract-check-shoe",
    name: "Contract Check Runner",
    category: "running_shoes",
    rawListing: "Road running shoe. Stated weight: 240 g. Price: S$160.",
    price: 160,
    currency: "SGD",
    sourceType: "text",
  });
  const parsed = ProductPassportDraftSchema.parse(draft);
  console.log(
    JSON.stringify({
      keys: Object.keys(parsed),
      features: parsed.features.map(({ key, status }) => ({ key, status })),
    }),
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "AI_CONTRACT_CHECK_FAILED");
  process.exitCode = 1;
});
