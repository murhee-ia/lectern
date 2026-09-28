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
    PostgrestVersion: "14.5"
  }
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
      member_profiles: {
        Row: {
          avatar_path: string | null
          created_at: string
          display_name: string | null
          email: string
          first_name: string | null
          id: string
          last_name: string | null
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
        }
        Relationships: []
      }
      membership_permission_restrictions: {
        Row: {
          created_at: string
          organization_id: string
          permission: Database["public"]["Enums"]["app_permission"]
          restricted_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          organization_id: string
          permission: Database["public"]["Enums"]["app_permission"]
          restricted_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          organization_id?: string
          permission?: Database["public"]["Enums"]["app_permission"]
          restricted_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_permission_restrictions_user_id_organization_id_fkey"
            columns: ["user_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["user_id", "organization_id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          join_method: Database["public"]["Enums"]["membership_join_method"]
          organization_id: string
          role: Database["public"]["Enums"]["organization_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          join_method: Database["public"]["Enums"]["membership_join_method"]
          organization_id: string
          role?: Database["public"]["Enums"]["organization_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          join_method?: Database["public"]["Enums"]["membership_join_method"]
          organization_id?: string
          role?: Database["public"]["Enums"]["organization_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_user_id_profile_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "member_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          organization_id: string
          role: Database["public"]["Enums"]["organization_role"]
          status: string
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          organization_id: string
          role?: Database["public"]["Enums"]["organization_role"]
          status?: string
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["organization_role"]
          status?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invites_accepted_by_profile_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "member_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_invites_invited_by_profile_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "member_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          join_code: string
          limit_overrides: Json
          name: string
          plan: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          join_code?: string
          limit_overrides?: Json
          name: string
          plan?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          join_code?: string
          limit_overrides?: Json
          name?: string
          plan?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
        }
        Relationships: []
      }
      plans: {
        Row: {
          max_members: number | null
          max_minutes_per_session: number | null
          price_cents: number
          solo_session_limit_per_member: number | null
          team_session_limit: number | null
          tier: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          max_members?: number | null
          max_minutes_per_session?: number | null
          price_cents?: number
          solo_session_limit_per_member?: number | null
          team_session_limit?: number | null
          tier: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          max_members?: number | null
          max_minutes_per_session?: number | null
          price_cents?: number
          solo_session_limit_per_member?: number | null
          team_session_limit?: number | null
          tier?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      platform_admins: {
        Row: {
          user_id: string
        }
        Insert: {
          user_id: string
        }
        Update: {
          user_id?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          id: number
          permission: Database["public"]["Enums"]["app_permission"]
          role: Database["public"]["Enums"]["organization_role"]
        }
        Insert: {
          id?: number
          permission: Database["public"]["Enums"]["app_permission"]
          role: Database["public"]["Enums"]["organization_role"]
        }
        Update: {
          id?: number
          permission?: Database["public"]["Enums"]["app_permission"]
          role?: Database["public"]["Enums"]["organization_role"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_organization_invitation: {
        Args: { invitation_token: string }
        Returns: string
      }
      can_delete_own_account: { Args: never; Returns: boolean }
      can_join_team_session: {
        Args: { check_organization_id: string; session_started_by: string }
        Returns: boolean
      }
      cancel_organization_invitations: {
        Args: { invitation_ids: string[]; target_organization_id: string }
        Returns: number
      }
      current_organization_permissions: {
        Args: { check_organization_id: string }
        Returns: Database["public"]["Enums"]["app_permission"][]
      }
      ensure_personal_organization: { Args: never; Returns: string }
      get_organization_invitation_preview: {
        Args: { invitation_token: string }
        Returns: {
          invitation_state: string
          invitee_email: string
          invitee_has_account: boolean
          invitee_role: Database["public"]["Enums"]["organization_role"]
          inviter_display_name: string
          inviter_first_name: string
          inviter_last_name: string
          organization_id: string
          organization_name: string
          viewer_email_matches: boolean
          viewer_is_member: boolean
        }[]
      }
      has_permission: {
        Args: {
          check_organization_id: string
          permission: Database["public"]["Enums"]["app_permission"]
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          check_organization_id: string
          exact_role: Database["public"]["Enums"]["organization_role"]
        }
        Returns: boolean
      }
      hash_invitation_token: {
        Args: { invitation_token: string }
        Returns: string
      }
      is_organization_member: {
        Args: { check_organization_id: string }
        Returns: boolean
      }
      is_platform_admin: { Args: never; Returns: boolean }
      join_organization_by_code: { Args: { code: string }; Returns: string }
      organization_member_limit: {
        Args: { check_organization_id: string }
        Returns: number
      }
      resend_organization_invitations: {
        Args: { invitation_ids: string[]; target_organization_id: string }
        Returns: {
          invitation_id: string
          invitation_token: string
          invitee_email: string
          invitee_role: Database["public"]["Enums"]["organization_role"]
        }[]
      }
      send_organization_invitation: {
        Args: {
          invitee_email: string
          invitee_role: Database["public"]["Enums"]["organization_role"]
          target_organization_id: string
        }
        Returns: string
      }
    }
    Enums: {
      app_permission:
        | "sessions.personal.start"
        | "sessions.team.start"
        | "sessions.team.join"
        | "sessions.end.own"
        | "sessions.end.any"
        | "floor.raise_hand"
        | "floor.grant"
        | "board.post"
        | "board.claim"
        | "library.promote"
        | "library.delete"
        | "invites.manage"
        | "join_code.regenerate"
        | "members.role.change"
        | "members.remove"
        | "members.restrict"
        | "org.settings.manage"
        | "billing.manage"
      membership_join_method:
        | "organization_creation"
        | "join_code"
        | "email_invitation"
      organization_role: "admin" | "session_leader" | "member"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
    Enums: {
      app_permission: [
        "sessions.personal.start",
        "sessions.team.start",
        "sessions.team.join",
        "sessions.end.own",
        "sessions.end.any",
        "floor.raise_hand",
        "floor.grant",
        "board.post",
        "board.claim",
        "library.promote",
        "library.delete",
        "invites.manage",
        "join_code.regenerate",
        "members.role.change",
        "members.remove",
        "members.restrict",
        "org.settings.manage",
        "billing.manage",
      ],
      membership_join_method: [
        "organization_creation",
        "join_code",
        "email_invitation",
      ],
      organization_role: ["admin", "session_leader", "member"],
    },
  },
} as const

