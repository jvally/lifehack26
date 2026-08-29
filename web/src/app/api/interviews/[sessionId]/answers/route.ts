import { z } from "zod";
import { apiSuccess, withApiErrors } from "@/lib/api-response";
import { getApplicationDependencies } from "@/services/container";

const ParamsSchema = z.object({ sessionId: z.string().uuid() });
const AnswerRequestSchema = z
  .object({
    featureKey: z.string().min(1).max(200),
    label: z.string().min(1).max(500),
    value: z
      .union([z.string(), z.number(), z.boolean(), z.array(z.string())])
      .nullable(),
    unit: z.string().max(50).nullable(),
    unknown: z.boolean(),
    evidenceId: z.string().max(500).nullable(),
    evidenceText: z.string().max(20_000).nullable(),
  })
  .strict()
  .superRefine((answer, context) => {
    if (!answer.unknown && answer.value === null) {
      context.addIssue({
        code: "custom",
        path: ["value"],
        message: "A value is required unless the answer is Unknown.",
      });
    }
  });

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  return withApiErrors(async () => {
    const { sessionId } = ParamsSchema.parse(await context.params);
    const answer = AnswerRequestSchema.parse(await request.json());
    return apiSuccess(
      await getApplicationDependencies().application.answerInterview(
        sessionId,
        answer,
      ),
    );
  });
}
