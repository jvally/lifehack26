import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type {
  InterviewMessage,
  InterviewSession,
  SessionRepository,
} from "./contracts";

type SupabaseAdminClient = ReturnType<typeof getSupabaseAdmin>;

const SessionRowSchema = z.object({
  id: z.string().min(1),
  product_id: z.string().min(1),
  asked_feature_keys: z.array(z.string()),
  created_at: z.string(),
});

const MessageRowSchema = z.object({
  id: z.string().min(1),
  role: z.enum(["assistant", "seller"]),
  content: z.string(),
  feature_key: z.string().nullable(),
  created_at: z.string(),
});

function mapMessage(input: unknown): InterviewMessage {
  const row = MessageRowSchema.parse(input);
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    featureKey: row.feature_key,
    createdAt: row.created_at,
  };
}

export class SupabaseSessionRepository implements SessionRepository {
  constructor(private readonly client: SupabaseAdminClient = getSupabaseAdmin()) {}

  async create(productId: string): Promise<InterviewSession> {
    const { data, error } = await this.client
      .from("interview_sessions")
      .insert({ product_id: productId })
      .select("*")
      .single();
    if (error) {
      throw new Error("SESSION_REPOSITORY_CREATE_FAILED", { cause: error });
    }
    const row = SessionRowSchema.parse(data);
    return {
      id: row.id,
      productId: row.product_id,
      askedFeatureKeys: row.asked_feature_keys,
      messages: [],
      createdAt: row.created_at,
    };
  }

  async get(sessionId: string): Promise<InterviewSession | null> {
    const { data, error } = await this.client
      .from("interview_sessions")
      .select("*")
      .eq("id", sessionId)
      .maybeSingle();
    if (error) {
      throw new Error("SESSION_REPOSITORY_GET_FAILED", { cause: error });
    }
    if (data === null) return null;
    const row = SessionRowSchema.parse(data);
    const { data: messages, error: messageError } = await this.client
      .from("interview_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });
    if (messageError) {
      throw new Error("SESSION_REPOSITORY_MESSAGES_FAILED", {
        cause: messageError,
      });
    }
    return {
      id: row.id,
      productId: row.product_id,
      askedFeatureKeys: row.asked_feature_keys,
      messages: MessageRowSchema.array().parse(messages ?? []).map(mapMessage),
      createdAt: row.created_at,
    };
  }

  async appendMessage(
    sessionId: string,
    message: InterviewMessage,
  ): Promise<void> {
    const { error } = await this.client.from("interview_messages").insert({
      id: message.id,
      session_id: sessionId,
      role: message.role,
      content: message.content,
      feature_key: message.featureKey,
      created_at: message.createdAt,
    });
    if (error) {
      throw new Error("SESSION_REPOSITORY_APPEND_MESSAGE_FAILED", {
        cause: error,
      });
    }
  }

  async markAsked(sessionId: string, featureKey: string): Promise<void> {
    const session = await this.get(sessionId);
    if (!session) throw new Error("INTERVIEW_SESSION_NOT_FOUND");
    const askedFeatureKeys = [...new Set([...session.askedFeatureKeys, featureKey])];
    const { error } = await this.client
      .from("interview_sessions")
      .update({ asked_feature_keys: askedFeatureKeys })
      .eq("id", sessionId);
    if (error) {
      throw new Error("SESSION_REPOSITORY_MARK_ASKED_FAILED", { cause: error });
    }
  }
}
