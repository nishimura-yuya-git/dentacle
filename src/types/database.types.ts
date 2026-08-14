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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      auth_audit_logs: {
        Row: {
          clinic_id: string | null
          created_at: string
          event: string
          id: string
          ip: string | null
          metadata: Json
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string
          event: string
          id?: string
          ip?: string | null
          metadata?: Json
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          clinic_id?: string | null
          created_at?: string
          event?: string
          id?: string
          ip?: string | null
          metadata?: Json
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auth_audit_logs_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      auth_ip_blocks: {
        Row: {
          created_at: string
          created_by: string | null
          deactivated_at: string | null
          deactivated_by: string | null
          id: string
          ip: string
          is_active: boolean
          metadata: Json
          reason: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deactivated_at?: string | null
          deactivated_by?: string | null
          id?: string
          ip: string
          is_active?: boolean
          metadata?: Json
          reason?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deactivated_at?: string | null
          deactivated_by?: string | null
          id?: string
          ip?: string
          is_active?: boolean
          metadata?: Json
          reason?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      auth_presence: {
        Row: {
          clinic_id: string | null
          ip: string | null
          last_seen_at: string
          metadata: Json
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          clinic_id?: string | null
          ip?: string | null
          last_seen_at?: string
          metadata?: Json
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          clinic_id?: string | null
          ip?: string | null
          last_seen_at?: string
          metadata?: Json
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auth_presence_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_blocks: {
        Row: {
          block_type: string
          clinic_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          end_time: string
          id: string
          metadata: Json
          note: string | null
          scheduled_date: string
          start_time: string
          team_id: string | null
          title: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          block_type?: string
          clinic_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          end_time: string
          id?: string
          metadata?: Json
          note?: string | null
          scheduled_date: string
          start_time: string
          team_id?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          block_type?: string
          clinic_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          end_time?: string
          id?: string
          metadata?: Json
          note?: string | null
          scheduled_date?: string
          start_time?: string
          team_id?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "calendar_blocks_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_blocks_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_contract_documents: {
        Row: {
          byte_size: number | null
          clinic_id: string
          content_type: string
          created_at: string
          file_name: string
          id: string
          is_active: boolean
          metadata: Json
          storage_path: string
          updated_at: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          byte_size?: number | null
          clinic_id: string
          content_type?: string
          created_at?: string
          file_name: string
          id?: string
          is_active?: boolean
          metadata?: Json
          storage_path: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          byte_size?: number | null
          clinic_id?: string
          content_type?: string
          created_at?: string
          file_name?: string
          id?: string
          is_active?: boolean
          metadata?: Json
          storage_path?: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_contract_documents_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_contractor_profiles: {
        Row: {
          address: string | null
          clinic_id: string
          corporate_name: string | null
          created_at: string
          created_by: string | null
          invoice_email: string | null
          login_email: string | null
          metadata: Json
          phone: string | null
          postal_code: string | null
          prefecture: string | null
          representative_name: string | null
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          address?: string | null
          clinic_id: string
          corporate_name?: string | null
          created_at?: string
          created_by?: string | null
          invoice_email?: string | null
          login_email?: string | null
          metadata?: Json
          phone?: string | null
          postal_code?: string | null
          prefecture?: string | null
          representative_name?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          address?: string | null
          clinic_id?: string
          corporate_name?: string | null
          created_at?: string
          created_by?: string | null
          invoice_email?: string | null
          login_email?: string | null
          metadata?: Json
          phone?: string | null
          postal_code?: string | null
          prefecture?: string | null
          representative_name?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "clinic_contractor_profiles_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: true
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_day_memos: {
        Row: {
          body: string
          clinic_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          memo_date: string
          metadata: Json
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          body?: string
          clinic_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          memo_date: string
          metadata?: Json
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          body?: string
          clinic_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          memo_date?: string
          metadata?: Json
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "clinic_day_memos_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_members: {
        Row: {
          clinic_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          ended_at: string | null
          id: string
          metadata: Json
          role: string
          started_at: string
          status: string
          updated_at: string
          updated_by: string | null
          user_id: string
          version: number
        }
        Insert: {
          clinic_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          ended_at?: string | null
          id?: string
          metadata?: Json
          role: string
          started_at?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
          user_id: string
          version?: number
        }
        Update: {
          clinic_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          ended_at?: string | null
          id?: string
          metadata?: Json
          role?: string
          started_at?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "clinic_members_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_members_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          code: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_active: boolean
          metadata: Json
          name: string
          timezone: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          code?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json
          name: string
          timezone?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          code?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json
          name?: string
          timezone?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: []
      }
      facilities: {
        Row: {
          address: string | null
          area_label: string | null
          can_batch_visits: boolean
          clinic_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          latitude: number | null
          longitude: number | null
          metadata: Json
          name: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          address?: string | null
          area_label?: string | null
          can_batch_visits?: boolean
          clinic_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          metadata?: Json
          name: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          address?: string | null
          area_label?: string | null
          can_batch_visits?: boolean
          clinic_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          metadata?: Json
          name?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "facilities_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_messages: {
        Row: {
          author_role: string
          body: string
          created_at: string
          id: string
          thread_id: string
          user_id: string
        }
        Insert: {
          author_role: string
          body: string
          created_at?: string
          id?: string
          thread_id: string
          user_id: string
        }
        Update: {
          author_role?: string
          body?: string
          created_at?: string
          id?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "feedback_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      improvement_items: {
        Row: {
          clinic_id: string | null
          created_at: string
          feedback_thread_id: string
          github_issue_number: number | null
          github_issue_url: string | null
          id: string
          page_path: string | null
          product_update_id: string | null
          share_summary: string | null
          share_title: string
          status: string
          status_changed_at: string | null
          status_changed_by: string | null
          updated_at: string
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string
          feedback_thread_id: string
          github_issue_number?: number | null
          github_issue_url?: string | null
          id?: string
          page_path?: string | null
          product_update_id?: string | null
          share_summary?: string | null
          share_title: string
          status?: string
          status_changed_at?: string | null
          status_changed_by?: string | null
          updated_at?: string
        }
        Update: {
          clinic_id?: string | null
          created_at?: string
          feedback_thread_id?: string
          github_issue_number?: number | null
          github_issue_url?: string | null
          id?: string
          page_path?: string | null
          product_update_id?: string | null
          share_summary?: string | null
          share_title?: string
          status?: string
          status_changed_at?: string | null
          status_changed_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "improvement_items_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "improvement_items_feedback_thread_id_fkey"
            columns: ["feedback_thread_id"]
            isOneToOne: true
            referencedRelation: "feedback_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "improvement_items_product_update_id_fkey"
            columns: ["product_update_id"]
            isOneToOne: true
            referencedRelation: "product_updates"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_threads: {
        Row: {
          clinic_id: string | null
          created_at: string
          github_issue_number: number | null
          github_issue_url: string | null
          id: string
          page_path: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string
          github_issue_number?: number | null
          github_issue_url?: string | null
          id?: string
          page_path?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          clinic_id?: string | null
          created_at?: string
          github_issue_number?: number | null
          github_issue_url?: string | null
          id?: string
          page_path?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_threads_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      operation_traces: {
        Row: {
          action: string
          actor_user_id: string | null
          clinic_id: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
          payload: Json
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          clinic_id: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
          payload?: Json
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          clinic_id?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "operation_traces_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_constraints: {
        Row: {
          clinic_id: string
          confirmed_at: string | null
          confirmed_by: string | null
          constraint_type: string
          created_at: string
          created_by: string | null
          day_of_week: number | null
          deleted_at: string | null
          deleted_by: string | null
          effective_from: string | null
          effective_to: string | null
          end_time: string | null
          id: string
          is_hard: boolean
          metadata: Json
          note: string | null
          patient_id: string
          source: string
          specific_date: string | null
          start_time: string | null
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          clinic_id: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          constraint_type: string
          created_at?: string
          created_by?: string | null
          day_of_week?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          effective_from?: string | null
          effective_to?: string | null
          end_time?: string | null
          id?: string
          is_hard?: boolean
          metadata?: Json
          note?: string | null
          patient_id: string
          source?: string
          specific_date?: string | null
          start_time?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          clinic_id?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          constraint_type?: string
          created_at?: string
          created_by?: string | null
          day_of_week?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          effective_from?: string | null
          effective_to?: string | null
          end_time?: string | null
          id?: string
          is_hard?: boolean
          metadata?: Json
          note?: string | null
          patient_id?: string
          source?: string
          specific_date?: string | null
          start_time?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "patient_constraints_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_constraints_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_visit_conditions: {
        Row: {
          clinic_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_provisional: boolean
          last_visit_date: string | null
          locked_fields: string[]
          metadata: Json
          next_due_date: string | null
          patient_id: string
          phone_confirmation_required: boolean
          preferred_time_end: string | null
          preferred_time_start: string | null
          preferred_weekdays: number[]
          priority: number
          requires_doctor: boolean
          standard_duration_minutes: number
          updated_at: string
          updated_by: string | null
          version: number
          visit_frequency: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_provisional?: boolean
          last_visit_date?: string | null
          locked_fields?: string[]
          metadata?: Json
          next_due_date?: string | null
          patient_id: string
          phone_confirmation_required?: boolean
          preferred_time_end?: string | null
          preferred_time_start?: string | null
          preferred_weekdays?: number[]
          priority?: number
          requires_doctor?: boolean
          standard_duration_minutes?: number
          updated_at?: string
          updated_by?: string | null
          version?: number
          visit_frequency?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_provisional?: boolean
          last_visit_date?: string | null
          locked_fields?: string[]
          metadata?: Json
          next_due_date?: string | null
          patient_id?: string
          phone_confirmation_required?: boolean
          preferred_time_end?: string | null
          preferred_time_start?: string | null
          preferred_weekdays?: number[]
          priority?: number
          requires_doctor?: boolean
          standard_duration_minutes?: number
          updated_at?: string
          updated_by?: string | null
          version?: number
          visit_frequency?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_visit_conditions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_visit_conditions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          area_label: string | null
          chart_number: string | null
          clinic_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          facility_id: string | null
          id: string
          is_active: boolean
          latitude: number | null
          longitude: number | null
          metadata: Json
          name_kana: string | null
          name_kanji: string
          phone: string | null
          primary_dh_id: string | null
          primary_doctor_id: string | null
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          address?: string | null
          area_label?: string | null
          chart_number?: string | null
          clinic_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          facility_id?: string | null
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          metadata?: Json
          name_kana?: string | null
          name_kanji: string
          phone?: string | null
          primary_dh_id?: string | null
          primary_doctor_id?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          address?: string | null
          area_label?: string | null
          chart_number?: string | null
          clinic_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          facility_id?: string | null
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          metadata?: Json
          name_kana?: string | null
          name_kanji?: string
          phone?: string | null
          primary_dh_id?: string | null
          primary_doctor_id?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "patients_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_primary_dh_id_fkey"
            columns: ["primary_dh_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_primary_doctor_id_fkey"
            columns: ["primary_doctor_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_admins: {
        Row: {
          created_at: string
          created_by: string | null
          note: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          note?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          note?: string | null
          user_id?: string
        }
        Relationships: []
      }
      platform_ai_settings: {
        Row: {
          cursor_model_id: string
          id: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cursor_model_id?: string
          id?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cursor_model_id?: string
          id?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          deleted_at: string | null
          display_name: string | null
          email: string | null
          id: string
          metadata: Json
          updated_at: string
          version: number
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name?: string | null
          email?: string | null
          id: string
          metadata?: Json
          updated_at?: string
          version?: number
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          metadata?: Json
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      product_updates: {
        Row: {
          body: string | null
          created_at: string
          detail_url: string | null
          id: string
          kind: string
          platform: string
          proposed_at: string
          proposed_by: string | null
          published_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          show_in_progress_badge: boolean
          timeline_mark: string
          version: number
          status: string
          surfaces: string[]
          title: string
          update_number: number | null
          updated_at: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          detail_url?: string | null
          id?: string
          kind: string
          platform?: string
          proposed_at?: string
          proposed_by?: string | null
          published_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          show_in_progress_badge?: boolean
          timeline_mark?: string
          version?: number
          status?: string
          surfaces?: string[]
          title: string
          update_number?: number | null
          updated_at?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          detail_url?: string | null
          id?: string
          kind?: string
          platform?: string
          proposed_at?: string
          proposed_by?: string | null
          published_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          show_in_progress_badge?: boolean
          timeline_mark?: string
          version?: number
          status?: string
          surfaces?: string[]
          title?: string
          update_number?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      schedule_job_items: {
        Row: {
          adopted_visit_id: string | null
          clinic_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          job_id: string
          metadata: Json
          patient_id: string
          proposed_date: string
          proposed_end: string
          proposed_start: string
          reason: string | null
          sequence_no: number
          staff_id: string | null
          status: string
          team_id: string | null
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          adopted_visit_id?: string | null
          clinic_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          job_id: string
          metadata?: Json
          patient_id: string
          proposed_date: string
          proposed_end: string
          proposed_start: string
          reason?: string | null
          sequence_no?: number
          staff_id?: string | null
          status?: string
          team_id?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          adopted_visit_id?: string | null
          clinic_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          job_id?: string
          metadata?: Json
          patient_id?: string
          proposed_date?: string
          proposed_end?: string
          proposed_start?: string
          reason?: string | null
          sequence_no?: number
          staff_id?: string | null
          status?: string
          team_id?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "schedule_job_items_adopted_visit_id_fkey"
            columns: ["adopted_visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_job_items_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_job_items_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "schedule_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_job_items_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_job_items_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_job_items_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_jobs: {
        Row: {
          clinic_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          distance_matrix: Json | null
          error_message: string | null
          finished_at: string | null
          id: string
          input_snapshot: Json
          metadata: Json
          model: string | null
          result_snapshot: Json | null
          started_at: string | null
          status: string
          target_date: string
          team_id: string | null
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          clinic_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          distance_matrix?: Json | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          input_snapshot?: Json
          metadata?: Json
          model?: string | null
          result_snapshot?: Json | null
          started_at?: string | null
          status?: string
          target_date: string
          team_id?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          clinic_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          distance_matrix?: Json | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          input_snapshot?: Json
          metadata?: Json
          model?: string | null
          result_snapshot?: Json | null
          started_at?: string | null
          status?: string
          target_date?: string
          team_id?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "schedule_jobs_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_jobs_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_members: {
        Row: {
          clinic_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          display_name: string
          external_code: string | null
          id: string
          is_active: boolean
          metadata: Json
          staff_type: string
          updated_at: string
          updated_by: string | null
          user_id: string | null
          version: number
        }
        Insert: {
          clinic_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          display_name: string
          external_code?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json
          staff_type: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
          version?: number
        }
        Update: {
          clinic_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          display_name?: string
          external_code?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json
          staff_type?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "staff_members_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          clinic_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          metadata: Json
          staff_id: string
          team_id: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          clinic_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          metadata?: Json
          staff_id: string
          team_id: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          clinic_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          metadata?: Json
          staff_id?: string
          team_id?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "team_members_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          clinic_id: string
          color: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_active: boolean
          metadata: Json
          name: string
          sort_order: number
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          clinic_id: string
          color?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json
          name: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          clinic_id?: string
          color?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json
          name?: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "teams_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      visit_phone_confirmations: {
        Row: {
          clinic_id: string
          constraint_candidate: Json
          contacted_at: string | null
          contacted_by: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          metadata: Json
          patient_id: string
          promoted_constraint_id: string | null
          result_note: string | null
          status: string
          updated_at: string
          updated_by: string | null
          version: number
          visit_id: string
        }
        Insert: {
          clinic_id: string
          constraint_candidate?: Json
          contacted_at?: string | null
          contacted_by?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          metadata?: Json
          patient_id: string
          promoted_constraint_id?: string | null
          result_note?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
          visit_id: string
        }
        Update: {
          clinic_id?: string
          constraint_candidate?: Json
          contacted_at?: string | null
          contacted_by?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          metadata?: Json
          patient_id?: string
          promoted_constraint_id?: string | null
          result_note?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visit_phone_confirmations_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_phone_confirmations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_phone_confirmations_promoted_constraint_id_fkey"
            columns: ["promoted_constraint_id"]
            isOneToOne: false
            referencedRelation: "patient_constraints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_phone_confirmations_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      visits: {
        Row: {
          address_snapshot: string | null
          area_label_snapshot: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          clinic_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          end_time: string
          facility_id: string | null
          id: string
          locked_fields: string[]
          metadata: Json
          patient_id: string
          requires_doctor: boolean
          schedule_job_id: string | null
          scheduled_date: string
          source: string
          staff_id: string | null
          start_time: string
          status: string
          team_id: string | null
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          address_snapshot?: string | null
          area_label_snapshot?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          clinic_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          end_time: string
          facility_id?: string | null
          id?: string
          locked_fields?: string[]
          metadata?: Json
          patient_id: string
          requires_doctor?: boolean
          schedule_job_id?: string | null
          scheduled_date: string
          source?: string
          staff_id?: string | null
          start_time: string
          status?: string
          team_id?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          address_snapshot?: string | null
          area_label_snapshot?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          clinic_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          end_time?: string
          facility_id?: string | null
          id?: string
          locked_fields?: string[]
          metadata?: Json
          patient_id?: string
          requires_doctor?: boolean
          schedule_job_id?: string | null
          scheduled_date?: string
          source?: string
          staff_id?: string | null
          start_time?: string
          status?: string
          team_id?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "visits_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_schedule_job_id_fkey"
            columns: ["schedule_job_id"]
            isOneToOne: false
            referencedRelation: "schedule_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      working_slots: {
        Row: {
          clinic_id: string
          created_at: string
          created_by: string | null
          day_of_week: number | null
          deleted_at: string | null
          deleted_by: string | null
          end_time: string
          id: string
          is_active: boolean
          metadata: Json
          specific_date: string | null
          staff_id: string | null
          start_time: string
          team_id: string | null
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          clinic_id: string
          created_at?: string
          created_by?: string | null
          day_of_week?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          end_time: string
          id?: string
          is_active?: boolean
          metadata?: Json
          specific_date?: string | null
          staff_id?: string | null
          start_time: string
          team_id?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          clinic_id?: string
          created_at?: string
          created_by?: string | null
          day_of_week?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          end_time?: string
          id?: string
          is_active?: boolean
          metadata?: Json
          specific_date?: string | null
          staff_id?: string | null
          start_time?: string
          team_id?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "working_slots_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "working_slots_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "working_slots_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_clinic_member_by_email: {
        Args: { p_clinic_id: string; p_email: string; p_role?: string }
        Returns: string
      }
      block_auth_ip: {
        Args: { p_ip: string; p_reason?: string }
        Returns: string
      }
      clear_auth_presence: { Args: never; Returns: undefined }
      clinic_has_active_member: {
        Args: { p_clinic_id: string }
        Returns: boolean
      }
      create_clinic_with_owner: {
        Args: { p_code?: string; p_name: string }
        Returns: string
      }
      create_improvement_item_for_thread: {
        Args: { p_thread_id: string }
        Returns: string
      }
      improvement_page_to_surfaces: {
        Args: { p_page_path: string }
        Returns: string[]
      }
      has_clinic_role: {
        Args: { p_clinic_id: string; p_roles: string[] }
        Returns: boolean
      }
      is_clinic_admin: { Args: { p_clinic_id: string }; Returns: boolean }
      is_clinic_member: { Args: { p_clinic_id: string }; Returns: boolean }
      is_platform_admin: { Args: never; Returns: boolean }
      is_platform_admin_user: { Args: { p_user_id: string }; Returns: boolean }
      is_request_ip_blocked: { Args: never; Returns: boolean }
      list_auth_presence: {
        Args: { p_within_seconds?: number }
        Returns: {
          clinic_id: string
          clinic_name: string
          display_name: string
          email: string
          ip: string
          last_seen_at: string
          user_agent: string
          user_id: string
        }[]
      }
      log_auth_audit_event: {
        Args: { p_clinic_id?: string; p_event: string }
        Returns: string
      }
      propose_product_update: {
        Args: {
          p_body?: string
          p_detail_url?: string
          p_kind: string
          p_platform?: string
          p_surfaces?: string[]
          p_title: string
        }
        Returns: string
      }
      publish_product_update: { Args: { p_id: string }; Returns: number }
      reject_product_update: { Args: { p_id: string }; Returns: boolean }
      set_product_update_in_progress_badge: {
        Args: { p_id: string; p_show: boolean }
        Returns: boolean
      }
      set_product_update_timeline_mark: {
        Args: { p_id: string; p_mark: string }
        Returns: boolean
      }
      update_product_update_copy: {
        Args: { p_body?: string; p_id: string; p_title: string }
        Returns: boolean
      }
      delete_product_update: {
        Args: { p_id: string }
        Returns: boolean
      }
      set_improvement_item_status: {
        Args: { p_id: string; p_status: string }
        Returns: boolean
      }
      request_client_ip: { Args: never; Returns: string }
      touch_auth_presence: {
        Args: { p_clinic_id?: string }
        Returns: undefined
      }
      unblock_auth_ip: { Args: { p_ip: string }; Returns: boolean }
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
  public: {
    Enums: {},
  },
} as const
