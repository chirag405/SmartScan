export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      ai_conversations: {
        Row: {
          context_window_size: number | null;
          created_at: string | null;
          id: string;
          is_active: boolean | null;
          last_message_at: string | null;
          message_count: number | null;
          system_prompt: string | null;
          title: string | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          context_window_size?: number | null;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          last_message_at?: string | null;
          message_count?: number | null;
          system_prompt?: string | null;
          title?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          context_window_size?: number | null;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          last_message_at?: string | null;
          message_count?: number | null;
          system_prompt?: string | null;
          title?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ai_conversations_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_messages: {
        Row: {
          attached_files: Json | null;
          content: string;
          conversation_id: string | null;
          created_at: string | null;
          id: string;
          input_tokens: number | null;
          model_used: string | null;
          output_tokens: number | null;
          processing_time_ms: number | null;
          referenced_documents: string[] | null;
          retrieved_chunks: string[] | null;
          role: string;
          similarity_scores: number[] | null;
          tools_used: string[] | null;
          user_id: string | null;
        };
        Insert: {
          attached_files?: Json | null;
          content: string;
          conversation_id?: string | null;
          created_at?: string | null;
          id?: string;
          input_tokens?: number | null;
          model_used?: string | null;
          output_tokens?: number | null;
          processing_time_ms?: number | null;
          referenced_documents?: string[] | null;
          retrieved_chunks?: string[] | null;
          role: string;
          similarity_scores?: number[] | null;
          tools_used?: string[] | null;
          user_id?: string | null;
        };
        Update: {
          attached_files?: Json | null;
          content?: string;
          conversation_id?: string | null;
          created_at?: string | null;
          id?: string;
          input_tokens?: number | null;
          model_used?: string | null;
          output_tokens?: number | null;
          processing_time_ms?: number | null;
          referenced_documents?: string[] | null;
          retrieved_chunks?: string[] | null;
          role?: string;
          similarity_scores?: number[] | null;
          tools_used?: string[] | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "ai_conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_messages_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      document_access_logs: {
        Row: {
          access_type: string;
          conversation_id: string | null;
          created_at: string | null;
          document_id: string | null;
          id: string;
          message_id: string | null;
          query_used: string | null;
          user_id: string | null;
        };
        Insert: {
          access_type: string;
          conversation_id?: string | null;
          created_at?: string | null;
          document_id?: string | null;
          id?: string;
          message_id?: string | null;
          query_used?: string | null;
          user_id?: string | null;
        };
        Update: {
          access_type?: string;
          conversation_id?: string | null;
          created_at?: string | null;
          document_id?: string | null;
          id?: string;
          message_id?: string | null;
          query_used?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "document_access_logs_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "ai_conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "document_access_logs_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "document_access_logs_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "ai_messages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "document_access_logs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      document_embeddings: {
        Row: {
          chunk_index: number;
          chunk_metadata: Json | null;
          chunk_type: string | null;
          content_chunk: string;
          created_at: string | null;
          document_id: string | null;
          embedding: string | null;
          id: string;
          tokens_count: number | null;
        };
        Insert: {
          chunk_index: number;
          chunk_metadata?: Json | null;
          chunk_type?: string | null;
          content_chunk: string;
          created_at?: string | null;
          document_id?: string | null;
          embedding?: string | null;
          id?: string;
          tokens_count?: number | null;
        };
        Update: {
          chunk_index?: number;
          chunk_metadata?: Json | null;
          chunk_type?: string | null;
          content_chunk?: string;
          created_at?: string | null;
          document_id?: string | null;
          embedding?: string | null;
          id?: string;
          tokens_count?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "document_embeddings_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
        ];
      };
      documents: {
        Row: {
          created_at: string | null;
          document_type: string | null;
          file_size_bytes: number;
          file_type: string;
          filename: string;
          id: string;
          last_accessed_at: string | null;
          mime_type: string;
          ocr_confidence_score: number | null;
          ocr_status: string | null;
          original_filename: string;
          processed_at: string | null;
          processed_text: string | null;
          supabase_storage_path: string;
          thumbnail_path: string | null;
          title: string | null;
          updated_at: string | null;
          uploaded_at: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          document_type?: string | null;
          file_size_bytes: number;
          file_type: string;
          filename: string;
          id?: string;
          last_accessed_at?: string | null;
          mime_type: string;
          ocr_confidence_score?: number | null;
          ocr_status?: string | null;
          original_filename: string;
          processed_at?: string | null;
          processed_text?: string | null;
          supabase_storage_path: string;
          thumbnail_path?: string | null;
          title?: string | null;
          updated_at?: string | null;
          uploaded_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          document_type?: string | null;
          file_size_bytes?: number;
          file_type?: string;
          filename?: string;
          id?: string;
          last_accessed_at?: string | null;
          mime_type?: string;
          ocr_confidence_score?: number | null;
          ocr_status?: string | null;
          original_filename?: string;
          processed_at?: string | null;
          processed_text?: string | null;
          supabase_storage_path?: string;
          thumbnail_path?: string | null;
          title?: string | null;
          updated_at?: string | null;
          uploaded_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "documents_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      users: {
        Row: {
          created_at: string | null;
          document_count: number | null;
          email: string;
          email_verification_token: string | null;
          email_verified: boolean | null;
          full_name: string;
          id: string;
          password_reset_expires: string | null;
          password_reset_token: string | null;
          storage_used_mb: number | null;
          subscription_tier: string | null;
          timezone: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          document_count?: number | null;
          email: string;
          email_verification_token?: string | null;
          email_verified?: boolean | null;
          full_name: string;
          id?: string;
          password_reset_expires?: string | null;
          password_reset_token?: string | null;
          storage_used_mb?: number | null;
          subscription_tier?: string | null;
          timezone?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          document_count?: number | null;
          email?: string;
          email_verification_token?: string | null;
          email_verified?: boolean | null;
          full_name?: string;
          id?: string;
          password_reset_expires?: string | null;
          password_reset_token?: string | null;
          storage_used_mb?: number | null;
          subscription_tier?: string | null;
          timezone?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      binary_quantize: {
        Args: { "": string } | { "": unknown };
        Returns: unknown;
      };
      halfvec_avg: {
        Args: { "": number[] };
        Returns: unknown;
      };
      halfvec_out: {
        Args: { "": unknown };
        Returns: unknown;
      };
      halfvec_send: {
        Args: { "": unknown };
        Returns: string;
      };
      halfvec_typmod_in: {
        Args: { "": unknown[] };
        Returns: number;
      };
      hnsw_bit_support: {
        Args: { "": unknown };
        Returns: unknown;
      };
      hnsw_halfvec_support: {
        Args: { "": unknown };
        Returns: unknown;
      };
      hnsw_sparsevec_support: {
        Args: { "": unknown };
        Returns: unknown;
      };
      hnswhandler: {
        Args: { "": unknown };
        Returns: unknown;
      };
      ivfflat_bit_support: {
        Args: { "": unknown };
        Returns: unknown;
      };
      ivfflat_halfvec_support: {
        Args: { "": unknown };
        Returns: unknown;
      };
      ivfflathandler: {
        Args: { "": unknown };
        Returns: unknown;
      };
      l2_norm: {
        Args: { "": unknown } | { "": unknown };
        Returns: number;
      };
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown };
        Returns: unknown;
      };
      search_document_embeddings: {
        Args: {
          query_embedding: string;
          match_threshold?: number;
          match_count?: number;
          user_id?: string;
        };
        Returns: {
          id: string;
          document_id: string;
          content_chunk: string;
          chunk_index: number;
          chunk_type: string;
          chunk_metadata: Json;
          tokens_count: number;
          created_at: string;
          similarity: number;
        }[];
      };
      sparsevec_out: {
        Args: { "": unknown };
        Returns: unknown;
      };
      sparsevec_send: {
        Args: { "": unknown };
        Returns: string;
      };
      sparsevec_typmod_in: {
        Args: { "": unknown[] };
        Returns: number;
      };
      vector_avg: {
        Args: { "": number[] };
        Returns: string;
      };
      vector_dims: {
        Args: { "": string } | { "": unknown };
        Returns: number;
      };
      vector_norm: {
        Args: { "": string };
        Returns: number;
      };
      vector_out: {
        Args: { "": string };
        Returns: unknown;
      };
      vector_send: {
        Args: { "": string };
        Returns: string;
      };
      vector_typmod_in: {
        Args: { "": unknown[] };
        Returns: number;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DefaultSchema = Database[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
