export type Database = {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string
          owner_id: string
          title: string
          description: string
          category: string
          goal: string
          weekly_commitment: string
          location: string
          needed_members: number
          skills: string[]
          status: 'draft' | 'open' | 'closed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          title: string
          description: string
          category: string
          goal: string
          weekly_commitment: string
          location?: string
          needed_members?: number
          skills: string[]
          status?: 'draft' | 'open' | 'closed'
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['projects']['Insert']>
        Relationships: []
      }
      applications: {
        Row: {
          id: string
          project_id: string
          applicant_id: string
          message: string
          status: 'pending' | 'approved' | 'rejected' | 'withdrawn'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          applicant_id: string
          message?: string
          status?: 'pending' | 'approved' | 'rejected' | 'withdrawn'
          created_at?: string
          updated_at?: string
        }
        Update: { status?: 'approved' | 'rejected' | 'withdrawn'; updated_at?: string }
        Relationships: []
      }
      saved_projects: {
        Row: { user_id: string; project_id: string; created_at: string }
        Insert: { user_id: string; project_id: string; created_at?: string }
        Update: never
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      project_status: 'draft' | 'open' | 'closed'
      application_status: 'pending' | 'approved' | 'rejected' | 'withdrawn'
    }
    CompositeTypes: Record<string, never>
  }
}
