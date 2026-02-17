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
      balancetes: {
        Row: {
          anterior: number
          conta: string
          created_at: string
          creditos: number
          debitos: number
          descricao: string
          id: string
          periodo: string
          reduzido: string
          saldo_atual: number
        }
        Insert: {
          anterior?: number
          conta: string
          created_at?: string
          creditos?: number
          debitos?: number
          descricao: string
          id?: string
          periodo: string
          reduzido: string
          saldo_atual?: number
        }
        Update: {
          anterior?: number
          conta?: string
          created_at?: string
          creditos?: number
          debitos?: number
          descricao?: string
          id?: string
          periodo?: string
          reduzido?: string
          saldo_atual?: number
        }
        Relationships: []
      }
      config: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      custos: {
        Row: {
          cliente_nome: string
          cod_ccusto: string
          cod_departamento: string
          complemento: string
          conta_contabil: string
          created_at: string
          data: string
          documento: string
          historico_mov: string
          id: string
          nome_conta: string
          nome_custo: string
          nome_depto: string
          periodo: string
          produto: string
          rowl: number
          v_cod_conta: string
          vl_custo: number
        }
        Insert: {
          cliente_nome?: string
          cod_ccusto?: string
          cod_departamento?: string
          complemento?: string
          conta_contabil?: string
          created_at?: string
          data?: string
          documento?: string
          historico_mov?: string
          id?: string
          nome_conta?: string
          nome_custo?: string
          nome_depto?: string
          periodo: string
          produto?: string
          rowl: number
          v_cod_conta?: string
          vl_custo?: number
        }
        Update: {
          cliente_nome?: string
          cod_ccusto?: string
          cod_departamento?: string
          complemento?: string
          conta_contabil?: string
          created_at?: string
          data?: string
          documento?: string
          historico_mov?: string
          id?: string
          nome_conta?: string
          nome_custo?: string
          nome_depto?: string
          periodo?: string
          produto?: string
          rowl?: number
          v_cod_conta?: string
          vl_custo?: number
        }
        Relationships: []
      }
      de_para: {
        Row: {
          categoria: string
          conta_origem: string
          created_at: string
          descricao_destino: string
          descricao_origem: string
          id: string
        }
        Insert: {
          categoria: string
          conta_origem: string
          created_at?: string
          descricao_destino: string
          descricao_origem: string
          id?: string
        }
        Update: {
          categoria?: string
          conta_origem?: string
          created_at?: string
          descricao_destino?: string
          descricao_origem?: string
          id?: string
        }
        Relationships: []
      }
      plano_contas: {
        Row: {
          ativo: boolean
          cod_conta: string
          created_at: string
          descricao: string
          grau: number
          id: string
          natureza: string
          reduzido: string
          tipo: string
        }
        Insert: {
          ativo?: boolean
          cod_conta: string
          created_at?: string
          descricao: string
          grau: number
          id?: string
          natureza: string
          reduzido: string
          tipo: string
        }
        Update: {
          ativo?: boolean
          cod_conta?: string
          created_at?: string
          descricao?: string
          grau?: number
          id?: string
          natureza?: string
          reduzido?: string
          tipo?: string
        }
        Relationships: []
      }
      uploads: {
        Row: {
          ano: number | null
          data_upload: string
          id: string
          mes: number | null
          nome_arquivo: string
          registros: number
          tipo: string
        }
        Insert: {
          ano?: number | null
          data_upload?: string
          id?: string
          mes?: number | null
          nome_arquivo: string
          registros?: number
          tipo: string
        }
        Update: {
          ano?: number | null
          data_upload?: string
          id?: string
          mes?: number | null
          nome_arquivo?: string
          registros?: number
          tipo?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
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
