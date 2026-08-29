import { z } from "zod";

export const AttributionSourceSchema = z.enum([
  "retail_ready_simulator",
  "chatgpt",
  "shopping_agent",
  "other",
]);

export const AttributionEventSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  source: AttributionSourceSchema,
  eventType: z.enum(["recommendation_served", "product_view", "conversion"]),
  referralToken: z.string().min(8),
  query: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export type AttributionSource = z.infer<typeof AttributionSourceSchema>;
export type AttributionEvent = z.infer<typeof AttributionEventSchema>;
