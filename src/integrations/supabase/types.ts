export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      billing_plans: {
        Row: {
          ai_call_minutes: number
          created_at: string
          enrichment_limit: number
          features: Json | null
          id: string
          leads_limit: number
          manual_call_minutes: number
          name: string
          price_monthly: number
        }
        Insert: {
          ai_call_minutes?: number
          created_at?: string
          enrichment_limit?: number
          features?: Json | null
          id?: string
          leads_limit?: number
          manual_call_minutes?: number
          name: string
          price_monthly?: number
        }
        Update: {
          ai_call_minutes?: number
          created_at?: string
          enrichment_limit?: number
          features?: Json | null
          id?: string
          leads_limit?: number
          manual_call_minutes?: number
          name?: string
          price_monthly?: number
        }
        Relationships: []
      }
      calls: {
        Row: {
          ai_script_type: string | null
          call_sid: string | null
          call_summary: string | null
          call_type: string
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          lead_id: string | null
          metadata: Json | null
          notes: string | null
          outcome: string | null
          phone_number: string | null
          recording_url: string | null
          started_at: string | null
          status: string | null
          transcript: string | null
          user_id: string
        }
        Insert: {
          ai_script_type?: string | null
          call_sid?: string | null
          call_summary?: string | null
          call_type?: string
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          notes?: string | null
          outcome?: string | null
          phone_number?: string | null
          recording_url?: string | null
          started_at?: string | null
          status?: string | null
          transcript?: string | null
          user_id: string
        }
        Update: {
          ai_script_type?: string | null
          call_sid?: string | null
          call_summary?: string | null
          call_type?: string
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          notes?: string | null
          outcome?: string | null
          phone_number?: string | null
          recording_url?: string | null
          started_at?: string | null
          status?: string | null
          transcript?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calls_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_connections: {
        Row: {
          api_key: string | null
          api_key_encrypted: boolean | null
          created_at: string
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          name: string
          sync_errors: Json | null
          updated_at: string
          user_id: string
          webhook_url: string
        }
        Insert: {
          api_key?: string | null
          api_key_encrypted?: boolean | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          name: string
          sync_errors?: Json | null
          updated_at?: string
          user_id: string
          webhook_url: string
        }
        Update: {
          api_key?: string | null
          api_key_encrypted?: boolean | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          name?: string
          sync_errors?: Json | null
          updated_at?: string
          user_id?: string
          webhook_url?: string
        }
        Relationships: []
      }
      crm_sync_logs: {
        Row: {
          connection_id: string | null
          created_at: string
          error_message: string | null
          id: string
          lead_id: string | null
          payload: Json | null
          response: Json | null
          retry_count: number | null
          status: string
          user_id: string
        }
        Insert: {
          connection_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          lead_id?: string | null
          payload?: Json | null
          response?: Json | null
          retry_count?: number | null
          status?: string
          user_id: string
        }
        Update: {
          connection_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          lead_id?: string | null
          payload?: Json | null
          response?: Json | null
          retry_count?: number | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_sync_logs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "crm_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_sync_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      enriched_leads: {
        Row: {
          company_summary: string | null
          decision_maker_relevance: number | null
          enriched_at: string
          enrichment_data: Json | null
          id: string
          lead_id: string
          lead_score: number | null
          user_id: string
        }
        Insert: {
          company_summary?: string | null
          decision_maker_relevance?: number | null
          enriched_at?: string
          enrichment_data?: Json | null
          id?: string
          lead_id: string
          lead_score?: number | null
          user_id: string
        }
        Update: {
          company_summary?: string | null
          decision_maker_relevance?: number | null
          enriched_at?: string
          enrichment_data?: Json | null
          id?: string
          lead_id?: string
          lead_score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enriched_leads_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          company_linkedin_url: string | null
          company_name: string | null
          company_revenue: string | null
          company_size: string | null
          company_website: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          industry: string | null
          job_title: string | null
          linkedin_url: string | null
          phone: string | null
          source: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_linkedin_url?: string | null
          company_name?: string | null
          company_revenue?: string | null
          company_size?: string | null
          company_website?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          industry?: string | null
          job_title?: string | null
          linkedin_url?: string | null
          phone?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_linkedin_url?: string | null
          company_name?: string | null
          company_revenue?: string | null
          company_size?: string | null
          company_website?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          industry?: string | null
          job_title?: string | null
          linkedin_url?: string | null
          phone?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_name: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          plan_id: string | null
          subscription_tier: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          plan_id?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          plan_id?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "billing_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_logs: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          quantity: number
          usage_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          quantity?: number
          usage_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          quantity?: number
          usage_type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      decrypt_crm_api_key: { Args: { p_secret_id: string }; Returns: string }
      delete_crm_api_key: { Args: { p_secret_id: string }; Returns: boolean }
      encrypt_crm_api_key: {
        Args: { p_api_key: string; p_connection_id: string }
        Returns: string
      }
      get_user_usage: {
        Args: { _user_id: string }
        Returns: {
          ai_call_minutes: number
          leads_enriched: number
          leads_searched: number
          manual_call_minutes: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      update_crm_api_key: {
        Args: { p_new_api_key: string; p_secret_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
