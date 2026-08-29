export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      attribution_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          product_id: string
          query: string | null
          referral_token: string
          source: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          product_id: string
          query?: string | null
          referral_token: string
          source: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          product_id?: string
          query?: string | null
          referral_token?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "attribution_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      evaluations: {
        Row: {
          created_at: string
          id: string
          payload: Json
          product_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload: Json
          product_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_records: {
        Row: {
          created_at: string
          extracted_text: string
          feature_key: string
          id: string
          media_type: string
          original_name: string | null
          product_id: string
          storage_path: string | null
          supported: boolean
          supporting_excerpt: string | null
        }
        Insert: {
          created_at?: string
          extracted_text: string
          feature_key: string
          id?: string
          media_type: string
          original_name?: string | null
          product_id: string
          storage_path?: string | null
          supported: boolean
          supporting_excerpt?: string | null
        }
        Update: {
          created_at?: string
          extracted_text?: string
          feature_key?: string
          id?: string
          media_type?: string
          original_name?: string | null
          product_id?: string
          storage_path?: string | null
          supported?: boolean
          supporting_excerpt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evidence_records_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_definitions: {
        Row: {
          answerability: number
          category_slug: string
          competitive_coverage: number
          competitive_direction: string
          constraint_importance: number
          data_type: string
          demand_weight: number
          evidence_required: boolean
          feature_key: string
          id: string
          label: string
          required: boolean
          synonyms: string[]
          unit: string | null
        }
        Insert: {
          answerability: number
          category_slug: string
          competitive_coverage: number
          competitive_direction: string
          constraint_importance: number
          data_type: string
          demand_weight: number
          evidence_required?: boolean
          feature_key: string
          id?: string
          label: string
          required?: boolean
          synonyms?: string[]
          unit?: string | null
        }
        Update: {
          answerability?: number
          category_slug?: string
          competitive_coverage?: number
          competitive_direction?: string
          constraint_importance?: number
          data_type?: string
          demand_weight?: number
          evidence_required?: boolean
          feature_key?: string
          id?: string
          label?: string
          required?: boolean
          synonyms?: string[]
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_definitions_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["slug"]
          },
        ]
      }
      interview_messages: {
        Row: {
          content: string
          created_at: string
          feature_key: string | null
          id: string
          role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at: string
          feature_key?: string | null
          id: string
          role: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string
          feature_key?: string | null
          id?: string
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_sessions: {
        Row: {
          asked_feature_keys: string[]
          created_at: string
          id: string
          product_id: string
        }
        Insert: {
          asked_feature_keys?: string[]
          created_at?: string
          id?: string
          product_id: string
        }
        Update: {
          asked_feature_keys?: string[]
          created_at?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_sessions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      market_signals: {
        Row: {
          category_slug: string
          embedding: string
          feature_keys: string[]
          feature_values: Json
          frequency: number
          fts: unknown
          id: string
          observed_at: string
          parsed_intent: Json | null
          raw_text: string
          signal_type: string
          source_label: string
          source_url: string | null
        }
        Insert: {
          category_slug: string
          embedding: string
          feature_keys?: string[]
          feature_values?: Json
          frequency?: number
          fts?: unknown
          id: string
          observed_at: string
          parsed_intent?: Json | null
          raw_text: string
          signal_type: string
          source_label: string
          source_url?: string | null
        }
        Update: {
          category_slug?: string
          embedding?: string
          feature_keys?: string[]
          feature_values?: Json
          frequency?: number
          fts?: unknown
          id?: string
          observed_at?: string
          parsed_intent?: Json | null
          raw_text?: string
          signal_type?: string
          source_label?: string
          source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "market_signals_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["slug"]
          },
        ]
      }
      product_claims: {
        Row: {
          confidence: number
          created_at: string
          evidence_ids: string[]
          feature_key: string
          id: string
          product_id: string
          status: string
          unit: string | null
          updated_at: string
          value: Json | null
        }
        Insert: {
          confidence: number
          created_at?: string
          evidence_ids?: string[]
          feature_key: string
          id?: string
          product_id: string
          status: string
          unit?: string | null
          updated_at?: string
          value?: Json | null
        }
        Update: {
          confidence?: number
          created_at?: string
          evidence_ids?: string[]
          feature_key?: string
          id?: string
          product_id?: string
          status?: string
          unit?: string | null
          updated_at?: string
          value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "product_claims_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_slug: string
          created_at: string
          currency: string | null
          embedding: string | null
          evaluation: Json | null
          external_id: string | null
          fts: unknown
          id: string
          name: string
          original_passport: Json | null
          passport: Json | null
          price: number | null
          raw_listing: string
          source_type: string
          updated_at: string
        }
        Insert: {
          category_slug: string
          created_at?: string
          currency?: string | null
          embedding?: string | null
          evaluation?: Json | null
          external_id?: string | null
          fts?: unknown
          id?: string
          name: string
          original_passport?: Json | null
          passport?: Json | null
          price?: number | null
          raw_listing: string
          source_type: string
          updated_at?: string
        }
        Update: {
          category_slug?: string
          created_at?: string
          currency?: string | null
          embedding?: string | null
          evaluation?: Json | null
          external_id?: string | null
          fts?: unknown
          id?: string
          name?: string
          original_passport?: Json | null
          passport?: Json | null
          price?: number | null
          raw_listing?: string
          source_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["slug"]
          },
        ]
      }
      recommendation_runs: {
        Row: {
          after_result: Json
          before_result: Json
          created_at: string
          id: string
          intent: Json
          product_id: string
          query: string
          scoring_version: string
        }
        Insert: {
          after_result: Json
          before_result: Json
          created_at?: string
          id?: string
          intent: Json
          product_id: string
          query: string
          scoring_version: string
        }
        Update: {
          after_result?: Json
          before_result?: Json
          created_at?: string
          id?: string
          intent?: Json
          product_id?: string
          query?: string
          scoring_version?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_runs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      hybrid_market_search: {
        Args: {
          query_category: string
          query_embedding: string
          query_text: string
          result_limit: number
        }
        Returns: {
          category_slug: string
          feature_keys: string[]
          feature_values: Json
          frequency: number
          id: string
          observed_at: string
          parsed_intent: Json
          raw_text: string
          score: number
          signal_type: string
          source_label: string
          source_url: string
        }[]
      }
      immutable_text_array_to_string: {
        Args: { input_values: string[] }
        Returns: string
      }
      import_products: {
        Args: { input_products: Json }
        Returns: {
          category_slug: string
          created_at: string
          currency: string | null
          embedding: string | null
          evaluation: Json | null
          external_id: string | null
          fts: unknown
          id: string
          name: string
          original_passport: Json | null
          passport: Json | null
          price: number | null
          raw_listing: string
          source_type: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "products"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      match_products: {
        Args: {
          query_category: string
          query_embedding: string
          result_limit: number
        }
        Returns: {
          id: string
          similarity: number
        }[]
      }
      match_products_with_rows: {
        Args: {
          query_category: string
          query_embedding: string
          result_limit: number
        }
        Returns: {
          category_slug: string
          currency: string | null
          created_at: string
          embedding: string | null
          evaluation: Json | null
          external_id: string | null
          id: string
          name: string
          original_passport: Json | null
          passport: Json | null
          price: number | null
          raw_listing: string
          similarity: number
          source_type: string
          updated_at: string
        }[]
      }
      save_product_evaluation: {
        Args: { input_evaluation: Json; input_product_id: string }
        Returns: string
      }
      save_product_passport: {
        Args: { input_passport: Json; input_product_id: string }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
