export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      ai_usage_daily: {
        Row: {
          day_utc: string;
          updated_at: string;
          used: number;
          user_id: string;
        };
        Insert: {
          day_utc: string;
          updated_at?: string;
          used?: number;
          user_id: string;
        };
        Update: {
          day_utc?: string;
          updated_at?: string;
          used?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      events: {
        Row: {
          created_at: string;
          id: number;
          name: Database["public"]["Enums"]["event_name"];
          payload: Json | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: never;
          name: Database["public"]["Enums"]["event_name"];
          payload?: Json | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: never;
          name?: Database["public"]["Enums"]["event_name"];
          payload?: Json | null;
          user_id?: string;
        };
        Relationships: [];
      };
      list_items: {
        Row: {
          created_at: string;
          display: string;
          id: string;
          list_id: string;
          normalized: string;
          position: number;
        };
        Insert: {
          created_at?: string;
          display: string;
          id?: string;
          list_id: string;
          normalized: string;
          position: number;
        };
        Update: {
          created_at?: string;
          display?: string;
          id?: string;
          list_id?: string;
          normalized?: string;
          position?: number;
        };
        Relationships: [
          {
            foreignKeyName: "list_items_list_id_fkey";
            columns: ["list_id"];
            isOneToOne: false;
            referencedRelation: "lists";
            referencedColumns: ["id"];
          },
        ];
      };
      lists: {
        Row: {
          category: Database["public"]["Enums"]["noun_category"] | null;
          created_at: string;
          first_tested_at: string | null;
          id: string;
          last_accessed_at: string | null;
          last_correct: number | null;
          last_score: number | null;
          last_tested_at: string | null;
          last_wrong: number | null;
          name: string;
          source: Database["public"]["Enums"]["list_source"];
          story: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          category?: Database["public"]["Enums"]["noun_category"] | null;
          created_at?: string;
          first_tested_at?: string | null;
          id?: string;
          last_accessed_at?: string | null;
          last_correct?: number | null;
          last_score?: number | null;
          last_tested_at?: string | null;
          last_wrong?: number | null;
          name: string;
          source?: Database["public"]["Enums"]["list_source"];
          story?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          category?: Database["public"]["Enums"]["noun_category"] | null;
          created_at?: string;
          first_tested_at?: string | null;
          id?: string;
          last_accessed_at?: string | null;
          last_correct?: number | null;
          last_score?: number | null;
          last_tested_at?: string | null;
          last_wrong?: number | null;
          name?: string;
          source?: Database["public"]["Enums"]["list_source"];
          story?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          locale: string;
          theme_preference: string;
          timezone: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          locale?: string;
          theme_preference?: string;
          timezone?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          locale?: string;
          theme_preference?: string;
          timezone?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      tests: {
        Row: {
          completed_at: string;
          correct: number;
          created_at: string;
          id: string;
          items_count: number;
          list_id: string;
          score: number;
          user_id: string;
          wrong: number;
        };
        Insert: {
          completed_at: string;
          correct: number;
          created_at?: string;
          id?: string;
          items_count: number;
          list_id: string;
          score: number;
          user_id: string;
          wrong: number;
        };
        Update: {
          completed_at?: string;
          correct?: number;
          created_at?: string;
          id?: string;
          items_count?: number;
          list_id?: string;
          score?: number;
          user_id?: string;
          wrong?: number;
        };
        Relationships: [
          {
            foreignKeyName: "tests_list_id_fkey";
            columns: ["list_id"];
            isOneToOne: false;
            referencedRelation: "lists";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      complete_test: {
        Args: {
          p_completed_at?: string;
          p_correct: number;
          p_list_id: string;
          p_wrong: number;
        };
        Returns: {
          completed_at: string;
          correct: number;
          created_at: string;
          id: string;
          items_count: number;
          list_id: string;
          score: number;
          user_id: string;
          wrong: number;
        };
        SetofOptions: {
          from: "*";
          to: "tests";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      consume_ai_generation: { Args: never; Returns: Json };
      delete_current_user_account: { Args: never; Returns: undefined };
      touch_list: {
        Args: { p_list_id: string };
        Returns: {
          category: Database["public"]["Enums"]["noun_category"] | null;
          created_at: string;
          first_tested_at: string | null;
          id: string;
          last_accessed_at: string | null;
          last_correct: number | null;
          last_score: number | null;
          last_tested_at: string | null;
          last_wrong: number | null;
          name: string;
          source: Database["public"]["Enums"]["list_source"];
          story: string | null;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "lists";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      unaccent: { Args: { "": string }; Returns: string };
    };
    Enums: {
      event_name:
        | "open_app"
        | "view_dashboard_empty"
        | "start_ai_flow"
        | "ai_generation_failed"
        | "ai_generation_succeeded"
        | "generate_ai_list"
        | "save_ai_list"
        | "create_list"
        | "add_item"
        | "start_test"
        | "complete_test"
        | "list_saved"
        | "delete_list"
        | "delete_account";
      list_source: "manual" | "ai";
      noun_category: "animals" | "food" | "household_items" | "transport" | "jobs";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      event_name: [
        "open_app",
        "view_dashboard_empty",
        "start_ai_flow",
        "ai_generation_failed",
        "ai_generation_succeeded",
        "generate_ai_list",
        "save_ai_list",
        "create_list",
        "add_item",
        "start_test",
        "complete_test",
        "list_saved",
        "delete_list",
        "delete_account",
      ],
      list_source: ["manual", "ai"],
      noun_category: ["animals", "food", "household_items", "transport", "jobs"],
    },
  },
} as const;
