export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          logo_url: string | null
          plan: string
          max_members: number
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          logo_url?: string | null
          plan?: string
          max_members?: number
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          logo_url?: string | null
          plan?: string
          max_members?: number
          settings?: Json
          created_at?: string
          updated_at?: string
        }
      }
      teams: {
        Row: {
          id: string
          org_id: string
          name: string
          is_active: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          name: string
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          name?: string
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      project_categories: {
        Row: {
          id: string
          org_id: string
          name: string
          is_active: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          name: string
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          name?: string
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      members: {
        Row: {
          id: string
          org_id: string
          auth_user_id: string | null
          name: string
          email: string
          login_id: string | null
          team_id: string | null
          role: string
          annual_salary: number
          is_approved: boolean
          is_active: boolean
          join_date: string
          color: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          auth_user_id?: string | null
          name: string
          email: string
          login_id?: string | null
          team_id?: string | null
          role?: string
          annual_salary?: number
          is_approved?: boolean
          is_active?: boolean
          join_date?: string
          color?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          auth_user_id?: string | null
          name?: string
          email?: string
          login_id?: string | null
          team_id?: string | null
          role?: string
          annual_salary?: number
          is_approved?: boolean
          is_active?: boolean
          join_date?: string
          color?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          org_id: string
          name: string
          category_id: string | null
          team_id: string | null
          status: string
          start_date: string
          end_date: string
          contract_amount: number
          direct_costs: number
          margin_amount: number
          confirmed: boolean
          payment_stage: string | null
          starred: boolean
          contact_name: string | null
          contact_phone: string | null
          memo: string | null
          company_share_percent: number
          is_settled: boolean
          settled_at: string | null
          color: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          name: string
          category_id?: string | null
          team_id?: string | null
          status?: string
          start_date: string
          end_date: string
          contract_amount?: number
          direct_costs?: number
          margin_amount?: number
          confirmed?: boolean
          payment_stage?: string | null
          starred?: boolean
          contact_name?: string | null
          contact_phone?: string | null
          memo?: string | null
          company_share_percent?: number
          is_settled?: boolean
          settled_at?: string | null
          color?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          name?: string
          category_id?: string | null
          team_id?: string | null
          status?: string
          start_date?: string
          end_date?: string
          contract_amount?: number
          direct_costs?: number
          margin_amount?: number
          confirmed?: boolean
          payment_stage?: string | null
          starred?: boolean
          contact_name?: string | null
          contact_phone?: string | null
          memo?: string | null
          company_share_percent?: number
          is_settled?: boolean
          settled_at?: string | null
          color?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      project_member_allocations: {
        Row: {
          id: string
          org_id: string
          project_id: string
          member_id: string
          balance_percent: number
          allocated_amount: number
          planned_days: number
          start_date: string | null
          end_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          project_id: string
          member_id: string
          balance_percent?: number
          allocated_amount?: number
          planned_days?: number
          start_date?: string | null
          end_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          project_id?: string
          member_id?: string
          balance_percent?: number
          allocated_amount?: number
          planned_days?: number
          start_date?: string | null
          end_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      schedules: {
        Row: {
          id: string
          org_id: string
          project_id: string
          member_id: string
          date: string
          minutes: number
          start_time: string | null
          end_time: string | null
          description: string | null
          google_event_id: string | null
          is_google_read_only: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          project_id: string
          member_id: string
          date: string
          minutes?: number
          start_time?: string | null
          end_time?: string | null
          description?: string | null
          google_event_id?: string | null
          is_google_read_only?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          project_id?: string
          member_id?: string
          date?: string
          minutes?: number
          start_time?: string | null
          end_time?: string | null
          description?: string | null
          google_event_id?: string | null
          is_google_read_only?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      receipts: {
        Row: {
          id: string
          org_id: string
          project_id: string
          date: string
          amount: number
          memo: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          project_id: string
          date: string
          amount: number
          memo?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          project_id?: string
          date?: string
          amount?: number
          memo?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      expenses: {
        Row: {
          id: string
          org_id: string
          project_id: string
          date: string
          amount: number
          category: string | null
          memo: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          project_id: string
          date: string
          amount: number
          category?: string | null
          memo?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          project_id?: string
          date?: string
          amount?: number
          category?: string | null
          memo?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      opex: {
        Row: {
          id: string
          org_id: string
          year_month: string
          amount: number
          memo: string | null
          items: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          year_month: string
          amount: number
          memo?: string | null
          items?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          year_month?: string
          amount?: number
          memo?: string | null
          items?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      holidays: {
        Row: {
          id: string
          org_id: string
          date: string
          name: string
          type: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          date: string
          name: string
          type?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          date?: string
          name?: string
          type?: string
          created_at?: string
          updated_at?: string
        }
      }
      work_time_settings: {
        Row: {
          id: string
          org_id: string
          work_minutes_per_day: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          work_minutes_per_day?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          work_minutes_per_day?: number
          created_at?: string
          updated_at?: string
        }
      }
      invitations: {
        Row: {
          id: string
          org_id: string
          email: string
          role: string
          invited_by: string | null
          token: string
          expires_at: string
          accepted_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          email: string
          role?: string
          invited_by?: string | null
          token: string
          expires_at: string
          accepted_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          email?: string
          role?: string
          invited_by?: string | null
          token?: string
          expires_at?: string
          accepted_at?: string | null
          created_at?: string
        }
      }
      performance_comments: {
        Row: {
          id: string
          org_id: string
          project_id: string
          member_id: string
          author_id: string
          content: string
          is_read: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          project_id: string
          member_id: string
          author_id: string
          content: string
          is_read?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          project_id?: string
          member_id?: string
          author_id?: string
          content?: string
          is_read?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_org_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_member_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// 편의를 위한 타입 별칭
export type Organization = Database['public']['Tables']['organizations']['Row']
export type Team = Database['public']['Tables']['teams']['Row']
export type ProjectCategory = Database['public']['Tables']['project_categories']['Row']
export type Member = Database['public']['Tables']['members']['Row']
export type Project = Database['public']['Tables']['projects']['Row']
export type ProjectMemberAllocation = Database['public']['Tables']['project_member_allocations']['Row']
export type Schedule = Database['public']['Tables']['schedules']['Row']
export type Receipt = Database['public']['Tables']['receipts']['Row']
export type Expense = Database['public']['Tables']['expenses']['Row']
export type Opex = Database['public']['Tables']['opex']['Row']
export type Holiday = Database['public']['Tables']['holidays']['Row']
export type WorkTimeSetting = Database['public']['Tables']['work_time_settings']['Row']
export type Invitation = Database['public']['Tables']['invitations']['Row']
export type PerformanceComment = Database['public']['Tables']['performance_comments']['Row']

// Insert/Update 타입
export type MemberInsert = Database['public']['Tables']['members']['Insert']
export type MemberUpdate = Database['public']['Tables']['members']['Update']
export type ProjectInsert = Database['public']['Tables']['projects']['Insert']
export type ProjectUpdate = Database['public']['Tables']['projects']['Update']
export type ScheduleInsert = Database['public']['Tables']['schedules']['Insert']
export type ScheduleUpdate = Database['public']['Tables']['schedules']['Update']
export type TeamInsert = Database['public']['Tables']['teams']['Insert']
export type TeamUpdate = Database['public']['Tables']['teams']['Update']

// 확장된 타입 (관계 포함)
export interface MemberWithRelations extends Member {
  team?: {
    id: string;
    name: string;
  } | null;
  organization?: Organization | null;
}
