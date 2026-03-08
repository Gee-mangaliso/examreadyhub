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
      admin_suggestions: {
        Row: {
          content_id: string
          content_title: string
          content_type: string
          created_at: string
          id: string
          message: string | null
          read: boolean
          subject_name: string | null
          suggested_by: string
          user_id: string
        }
        Insert: {
          content_id: string
          content_title: string
          content_type?: string
          created_at?: string
          id?: string
          message?: string | null
          read?: boolean
          subject_name?: string | null
          suggested_by: string
          user_id: string
        }
        Update: {
          content_id?: string
          content_title?: string
          content_type?: string
          created_at?: string
          id?: string
          message?: string | null
          read?: boolean
          subject_name?: string | null
          suggested_by?: string
          user_id?: string
        }
        Relationships: []
      }
      badges: {
        Row: {
          badge_type: string
          created_at: string
          criteria_value: number | null
          description: string | null
          icon: string
          id: string
          name: string
        }
        Insert: {
          badge_type?: string
          created_at?: string
          criteria_value?: number | null
          description?: string | null
          icon?: string
          id?: string
          name: string
        }
        Update: {
          badge_type?: string
          created_at?: string
          criteria_value?: number | null
          description?: string | null
          icon?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      content_views: {
        Row: {
          content_id: string
          content_type: string
          id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          content_id: string
          content_type?: string
          id?: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          content_id?: string
          content_type?: string
          id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: []
      }
      exam_completions: {
        Row: {
          completed_at: string
          exam_paper_id: string
          id: string
          score: number
          total_marks: number
          user_id: string
        }
        Insert: {
          completed_at?: string
          exam_paper_id: string
          id?: string
          score?: number
          total_marks?: number
          user_id: string
        }
        Update: {
          completed_at?: string
          exam_paper_id?: string
          id?: string
          score?: number
          total_marks?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_completions_exam_paper_id_fkey"
            columns: ["exam_paper_id"]
            isOneToOne: false
            referencedRelation: "exam_papers"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_papers: {
        Row: {
          created_at: string
          file_url: string | null
          id: string
          province: string
          subject_id: string
          term: string
          title: string
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          file_url?: string | null
          id?: string
          province: string
          subject_id: string
          term: string
          title: string
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          file_url?: string | null
          id?: string
          province?: string
          subject_id?: string
          term?: string
          title?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "exam_papers_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      grades: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      leaderboard_snapshots: {
        Row: {
          avg_percentage: number
          created_at: string
          current_streak: number
          id: string
          rank: number
          total_questions: number
          total_score: number
          user_id: string
          week_start: string
          weekly_avg: number | null
          weekly_quizzes: number
        }
        Insert: {
          avg_percentage?: number
          created_at?: string
          current_streak?: number
          id?: string
          rank: number
          total_questions?: number
          total_score?: number
          user_id: string
          week_start: string
          weekly_avg?: number | null
          weekly_quizzes?: number
        }
        Update: {
          avg_percentage?: number
          created_at?: string
          current_streak?: number
          id?: string
          rank?: number
          total_questions?: number
          total_score?: number
          user_id?: string
          week_start?: string
          weekly_avg?: number | null
          weekly_quizzes?: number
        }
        Relationships: []
      }
      memo_requests: {
        Row: {
          admin_note: string | null
          created_at: string
          exam_paper_id: string
          id: string
          memo_url: string | null
          responded_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          exam_paper_id: string
          id?: string
          memo_url?: string | null
          responded_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          exam_paper_id?: string
          id?: string
          memo_url?: string | null
          responded_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memo_requests_exam_paper_id_fkey"
            columns: ["exam_paper_id"]
            isOneToOne: false
            referencedRelation: "exam_papers"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          content: string | null
          created_at: string
          id: string
          sort_order: number
          subject_id: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          sort_order?: number
          subject_id: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          sort_order?: number
          subject_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          metadata: Json | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          grade: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          grade?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          grade?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          answers: Json
          completed_at: string
          id: string
          quiz_id: string
          score: number
          total_questions: number
          user_id: string
        }
        Insert: {
          answers?: Json
          completed_at?: string
          id?: string
          quiz_id: string
          score?: number
          total_questions?: number
          user_id: string
        }
        Update: {
          answers?: Json
          completed_at?: string
          id?: string
          quiz_id?: string
          score?: number
          total_questions?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          correct_answer: string
          created_at: string
          explanation: string | null
          id: string
          options: Json
          question: string
          quiz_id: string
          sort_order: number
        }
        Insert: {
          correct_answer: string
          created_at?: string
          explanation?: string | null
          id?: string
          options?: Json
          question: string
          quiz_id: string
          sort_order?: number
        }
        Update: {
          correct_answer?: string
          created_at?: string
          explanation?: string | null
          id?: string
          options?: Json
          question?: string
          quiz_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          created_at: string
          description: string | null
          id: string
          subject_id: string
          time_limit_minutes: number | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          subject_id: string
          time_limit_minutes?: number | null
          title: string
          type?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          subject_id?: string
          time_limit_minutes?: number | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      search_history: {
        Row: {
          created_at: string
          id: string
          query: string
          result_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          query: string
          result_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          query?: string
          result_count?: number
          user_id?: string
        }
        Relationships: []
      }
      slides: {
        Row: {
          content: string | null
          created_at: string
          file_url: string | null
          id: string
          sort_order: number
          subject_id: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          sort_order?: number
          subject_id: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          sort_order?: number
          subject_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "slides_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      study_guides: {
        Row: {
          content: string | null
          created_at: string
          file_url: string | null
          id: string
          sort_order: number
          subject_id: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          sort_order?: number
          subject_id: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          sort_order?: number
          subject_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_guides_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      study_progress: {
        Row: {
          created_at: string
          id: string
          last_studied_at: string | null
          notes_read: number
          quizzes_completed: number
          subject_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_studied_at?: string | null
          notes_read?: number
          quizzes_completed?: number
          subject_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_studied_at?: string | null
          notes_read?: number
          quizzes_completed?: number
          subject_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_progress_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          created_at: string
          description: string | null
          grade_id: string
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          grade_id: string
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          grade_id?: string
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_grade_id_fkey"
            columns: ["grade_id"]
            isOneToOne: false
            referencedRelation: "grades"
            referencedColumns: ["id"]
          },
        ]
      }
      textbooks: {
        Row: {
          created_at: string
          description: string | null
          file_url: string | null
          id: string
          sort_order: number
          subject_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_url?: string | null
          id?: string
          sort_order?: number
          subject_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          file_url?: string | null
          id?: string
          sort_order?: number
          subject_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "textbooks_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          awarded_at: string
          awarded_by: string | null
          badge_id: string
          id: string
          user_id: string
          week_start: string | null
        }
        Insert: {
          awarded_at?: string
          awarded_by?: string | null
          badge_id: string
          id?: string
          user_id: string
          week_start?: string | null
        }
        Update: {
          awarded_at?: string
          awarded_by?: string | null
          badge_id?: string
          id?: string
          user_id?: string
          week_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_subjects: {
        Row: {
          created_at: string
          id: string
          subject_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          subject_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          subject_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      worked_examples: {
        Row: {
          content: string | null
          created_at: string
          file_url: string | null
          id: string
          sort_order: number
          subject_id: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          sort_order?: number
          subject_id: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          sort_order?: number
          subject_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "worked_examples_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_get_all_students: {
        Args: never
        Returns: {
          avatar_url: string
          avg_percentage: number
          created_at: string
          email: string
          full_name: string
          grade: string
          last_quiz_at: string
          subjects_enrolled: number
          total_questions: number
          total_quizzes_taken: number
          total_score: number
          user_id: string
        }[]
      }
      admin_get_platform_stats: {
        Args: never
        Returns: {
          active_this_week: number
          active_today: number
          avg_score: number
          total_quiz_attempts: number
          total_students: number
        }[]
      }
      admin_get_student_attempts: {
        Args: { _student_id: string }
        Returns: {
          attempt_id: string
          completed_at: string
          grade_name: string
          percentage: number
          quiz_title: string
          score: number
          subject_name: string
          total_questions: number
        }[]
      }
      create_notification: {
        Args: {
          _message: string
          _metadata?: Json
          _title: string
          _type: string
          _user_id: string
        }
        Returns: undefined
      }
      get_enhanced_leaderboard: {
        Args: { limit_count?: number }
        Returns: {
          avatar_url: string
          avg_percentage: number
          badge_count: number
          current_streak: number
          full_name: string
          prev_weekly_avg: number
          quizzes_taken: number
          total_questions: number
          total_score: number
          trend: string
          user_id: string
          weekly_avg: number
          weekly_quizzes: number
        }[]
      }
      get_leaderboard: {
        Args: { limit_count?: number }
        Returns: {
          avatar_url: string
          avg_percentage: number
          full_name: string
          quizzes_taken: number
          total_questions: number
          total_score: number
          user_id: string
        }[]
      }
      get_study_streak: { Args: { _user_id: string }; Returns: number }
      get_subject_leaderboard: {
        Args: { _subject_id: string; limit_count?: number }
        Returns: {
          avatar_url: string
          avg_percentage: number
          badge_count: number
          current_streak: number
          full_name: string
          prev_weekly_avg: number
          quizzes_taken: number
          total_questions: number
          total_score: number
          trend: string
          user_id: string
          weekly_avg: number
          weekly_quizzes: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
