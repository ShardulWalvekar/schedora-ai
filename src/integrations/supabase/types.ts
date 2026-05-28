export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          full_name: string | null;
          email: string | null;
          avatar_url: string | null;
          timezone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          full_name?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string | null;
          full_name?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      event_types: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          duration: number;
          platform: string;
          location: string;
          color: string;
          buffer_time: number;
          availability: Json;
          slug: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          is_paid: boolean;
          price: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          duration?: number;
          platform?: string;
          location?: string;
          color?: string;
          buffer_time?: number;
          availability?: Json;
          slug: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          is_paid?: boolean;
          price?: number;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          duration?: number;
          platform?: string;
          location?: string;
          color?: string;
          buffer_time?: number;
          availability?: Json;
          slug?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          is_paid?: boolean;
          price?: number;
        };
        Relationships: [];
      };
      bookings: {
        Row: {
          id: string;
          user_id: string;
          attendee_name: string;
          attendee_email: string;
          event_type: string;
          meeting_platform: string;
          duration: number;
          booking_date: string;
          booking_time: string;
          notes: string | null;
          status: string;
          created_at: string;
          meeting_provider: string | null;
          meeting_link: string | null;
          meeting_status: string;
          payment_status: string;
          stripe_payment_intent_id: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          attendee_name: string;
          attendee_email: string;
          event_type: string;
          meeting_platform: string;
          duration: number;
          booking_date: string;
          booking_time: string;
          notes?: string | null;
          status?: string;
          created_at?: string;
          meeting_provider?: string | null;
          meeting_link?: string | null;
          meeting_status?: string;
          payment_status?: string;
          stripe_payment_intent_id?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          attendee_name?: string;
          attendee_email?: string;
          event_type?: string;
          meeting_platform?: string;
          duration?: number;
          booking_date?: string;
          booking_time?: string;
          notes?: string | null;
          status?: string;
          created_at?: string;
          meeting_provider?: string | null;
          meeting_link?: string | null;
          meeting_status?: string;
          payment_status?: string;
          stripe_payment_intent_id?: string | null;
        };
        Relationships: [];
      };
      integrations: {
        Row: {
          id: string;
          user_id: string;
          provider: string;
          provider_email: string | null;
          connection_data: Json;
          status: string;
          sync_status: string;
          last_synced: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          provider: string;
          provider_email?: string | null;
          connection_data?: Json;
          status?: string;
          sync_status?: string;
          last_synced?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          provider?: string;
          provider_email?: string | null;
          connection_data?: Json;
          status?: string;
          sync_status?: string;
          last_synced?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      calendar_events: {
        Row: {
          id: string;
          user_id: string;
          provider: string;
          external_event_id: string | null;
          title: string | null;
          start_time: string;
          end_time: string;
          status: string;
          synced_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          provider: string;
          external_event_id?: string | null;
          title?: string | null;
          start_time: string;
          end_time: string;
          status?: string;
          synced_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          provider?: string;
          external_event_id?: string | null;
          title?: string | null;
          start_time?: string;
          end_time?: string;
          status?: string;
          synced_at?: string;
        };
        Relationships: [];
      };
      integration_sync_logs: {
        Row: {
          id: string;
          integration_id: string;
          sync_status: string;
          sync_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          integration_id: string;
          sync_status: string;
          sync_message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          integration_id?: string;
          sync_status?: string;
          sync_message?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      teams: {
        Row: {
          id: string;
          name: string;
          owner_id: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          owner_id: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          owner_id?: string;
          description?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      team_members: {
        Row: {
          id: string;
          team_id: string;
          user_id: string | null;
          email: string;
          name: string | null;
          role: string;
          status: string;
          joined_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          user_id?: string | null;
          email: string;
          name?: string | null;
          role?: string;
          status?: string;
          joined_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          user_id?: string | null;
          email?: string;
          name?: string | null;
          role?: string;
          status?: string;
          joined_at?: string;
        };
        Relationships: [];
      };
      team_invites: {
        Row: {
          id: string;
          team_id: string;
          sender_id: string;
          recipient_email: string;
          role: string;
          invite_token: string;
          status: string;
          accepted_at: string | null;
          declined_at: string | null;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          sender_id: string;
          recipient_email: string;
          role?: string;
          invite_token?: string;
          status?: string;
          accepted_at?: string | null;
          declined_at?: string | null;
          expires_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          sender_id?: string;
          recipient_email?: string;
          role?: string;
          invite_token?: string;
          status?: string;
          accepted_at?: string | null;
          declined_at?: string | null;
          expires_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      availability_settings: {
        Row: {
          id: string;
          user_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          is_available: boolean;
          buffer_before: number;
          buffer_after: number;
          daily_limit: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          day_of_week: number;
          start_time?: string;
          end_time?: string;
          is_available?: boolean;
          buffer_before?: number;
          buffer_after?: number;
          daily_limit?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          day_of_week?: number;
          start_time?: string;
          end_time?: string;
          is_available?: boolean;
          buffer_before?: number;
          buffer_after?: number;
          daily_limit?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          plan: string;
          status: string;
          current_period_start: string | null;
          current_period_end: string | null;
          created_at: string;
          updated_at: string;
          subscription_plan: string;
          subscription_status: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          billing_cycle: string;
          subscription_start: string;
          subscription_end: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan?: string;
          status?: string;
          current_period_start?: string | null;
          current_period_end?: string | null;
          created_at?: string;
          updated_at?: string;
          subscription_plan?: string;
          subscription_status?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          billing_cycle?: string;
          subscription_start?: string;
          subscription_end?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          plan?: string;
          status?: string;
          current_period_start?: string | null;
          current_period_end?: string | null;
          created_at?: string;
          updated_at?: string;
          subscription_plan?: string;
          subscription_status?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          billing_cycle?: string;
          subscription_start?: string;
          subscription_end?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
