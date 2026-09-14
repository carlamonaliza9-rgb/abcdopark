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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      agenda_escolar: {
        Row: {
          conteudo_aula: string | null
          created_at: string | null
          data: string | null
          id: string
          nome_turma: string
          professor_email: string | null
          tarefa_casa: string | null
        }
        Insert: {
          conteudo_aula?: string | null
          created_at?: string | null
          data?: string | null
          id?: string
          nome_turma: string
          professor_email?: string | null
          tarefa_casa?: string | null
        }
        Update: {
          conteudo_aula?: string | null
          created_at?: string | null
          data?: string | null
          id?: string
          nome_turma?: string
          professor_email?: string | null
          tarefa_casa?: string | null
        }
        Relationships: []
      }
      alunos: {
        Row: {
          alergia_descricao: string | null
          bairro: string | null
          cep: string | null
          cidade: string | null
          cpf_aluno: string | null
          cpf_responsavel: string | null
          cpf_responsavel_2: string | null
          created_at: string
          data_nascimento: string | null
          data_transferencia: string | null
          e_autista: boolean | null
          email_responsavel: string | null
          email_responsavel_2: string | null
          email_responsavel_3: string | null
          endereco: string | null
          estado: string | null
          foto_url: string | null
          id: number
          nome: string | null
          numero: string | null
          observacao_transferencia: string | null
          observacoes: string | null
          observacoes_financeiras: string | null
          parentesco_1: string | null
          parentesco_2: string | null
          parentesco_3: string | null
          professor_nome: string | null
          profissao_responsavel: string | null
          profissao_responsavel_2: string | null
          responsavel: string | null
          responsavel_2_contato: string | null
          responsavel_2_nome: string | null
          responsavel_3_contato: string | null
          responsavel_3_nome: string | null
          saldo_credito: number | null
          sexo: string | null
          situacao_academica: string | null
          somente_leitura: boolean | null
          status: string | null
          tem_alergia: boolean | null
          turma: string | null
          turno: string | null
          valor: number | null
          vencimento: string | null
          whatsapp: string | null
        }
        Insert: {
          alergia_descricao?: string | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cpf_aluno?: string | null
          cpf_responsavel?: string | null
          cpf_responsavel_2?: string | null
          created_at?: string
          data_nascimento?: string | null
          data_transferencia?: string | null
          e_autista?: boolean | null
          email_responsavel?: string | null
          email_responsavel_2?: string | null
          email_responsavel_3?: string | null
          endereco?: string | null
          estado?: string | null
          foto_url?: string | null
          id?: number
          nome?: string | null
          numero?: string | null
          observacao_transferencia?: string | null
          observacoes?: string | null
          observacoes_financeiras?: string | null
          parentesco_1?: string | null
          parentesco_2?: string | null
          parentesco_3?: string | null
          professor_nome?: string | null
          profissao_responsavel?: string | null
          profissao_responsavel_2?: string | null
          responsavel?: string | null
          responsavel_2_contato?: string | null
          responsavel_2_nome?: string | null
          responsavel_3_contato?: string | null
          responsavel_3_nome?: string | null
          saldo_credito?: number | null
          sexo?: string | null
          situacao_academica?: string | null
          somente_leitura?: boolean | null
          status?: string | null
          tem_alergia?: boolean | null
          turma?: string | null
          turno?: string | null
          valor?: number | null
          vencimento?: string | null
          whatsapp?: string | null
        }
        Update: {
          alergia_descricao?: string | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cpf_aluno?: string | null
          cpf_responsavel?: string | null
          cpf_responsavel_2?: string | null
          created_at?: string
          data_nascimento?: string | null
          data_transferencia?: string | null
          e_autista?: boolean | null
          email_responsavel?: string | null
          email_responsavel_2?: string | null
          email_responsavel_3?: string | null
          endereco?: string | null
          estado?: string | null
          foto_url?: string | null
          id?: number
          nome?: string | null
          numero?: string | null
          observacao_transferencia?: string | null
          observacoes?: string | null
          observacoes_financeiras?: string | null
          parentesco_1?: string | null
          parentesco_2?: string | null
          parentesco_3?: string | null
          professor_nome?: string | null
          profissao_responsavel?: string | null
          profissao_responsavel_2?: string | null
          responsavel?: string | null
          responsavel_2_contato?: string | null
          responsavel_2_nome?: string | null
          responsavel_3_contato?: string | null
          responsavel_3_nome?: string | null
          saldo_credito?: number | null
          sexo?: string | null
          situacao_academica?: string | null
          somente_leitura?: boolean | null
          status?: string | null
          tem_alergia?: boolean | null
          turma?: string | null
          turno?: string | null
          valor?: number | null
          vencimento?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      avaliacoes: {
        Row: {
          aluno_id: number | null
          atividades: number | null
          comentario: string | null
          comportamento: number | null
          data_avaliacao: string | null
          estrelas: number | null
          id: number
          nota: number | null
          observacao: string | null
          participacao: number | null
          socioemocional: number | null
          visivel_para_pais: boolean | null
        }
        Insert: {
          aluno_id?: number | null
          atividades?: number | null
          comentario?: string | null
          comportamento?: number | null
          data_avaliacao?: string | null
          estrelas?: number | null
          id?: number
          nota?: number | null
          observacao?: string | null
          participacao?: number | null
          socioemocional?: number | null
          visivel_para_pais?: boolean | null
        }
        Update: {
          aluno_id?: number | null
          atividades?: number | null
          comentario?: string | null
          comportamento?: number | null
          data_avaliacao?: string | null
          estrelas?: number | null
          id?: number
          nota?: number | null
          observacao?: string | null
          participacao?: number | null
          socioemocional?: number | null
          visivel_para_pais?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "avaliacoes_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "view_aniversariantes_hoje"
            referencedColumns: ["id"]
          },
        ]
      }
      avancos_dificuldades: {
        Row: {
          aluno_id: number | null
          ano: string
          avancos: string | null
          data_atualizacao: string | null
          data_registro: string | null
          dificuldades: string | null
          id: string
          professor_id: string | null
          professor_nome: string | null
          semestre: string
          trimestre: string | null
        }
        Insert: {
          aluno_id?: number | null
          ano: string
          avancos?: string | null
          data_atualizacao?: string | null
          data_registro?: string | null
          dificuldades?: string | null
          id?: string
          professor_id?: string | null
          professor_nome?: string | null
          semestre: string
          trimestre?: string | null
        }
        Update: {
          aluno_id?: number | null
          ano?: string
          avancos?: string | null
          data_atualizacao?: string | null
          data_registro?: string | null
          dificuldades?: string | null
          id?: string
          professor_id?: string | null
          professor_nome?: string | null
          semestre?: string
          trimestre?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "avancos_dificuldades_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avancos_dificuldades_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "view_aniversariantes_hoje"
            referencedColumns: ["id"]
          },
        ]
      }
      boletins: {
        Row: {
          aluno_id: number | null
          ano: string
          bimestre1: number | null
          bimestre2: number | null
          bimestre3: number | null
          bimestre4: number | null
          created_at: string | null
          disciplina: string
          id: string
          media: number | null
          recuperacao1: number | null
          recuperacao2: number | null
        }
        Insert: {
          aluno_id?: number | null
          ano: string
          bimestre1?: number | null
          bimestre2?: number | null
          bimestre3?: number | null
          bimestre4?: number | null
          created_at?: string | null
          disciplina: string
          id?: string
          media?: number | null
          recuperacao1?: number | null
          recuperacao2?: number | null
        }
        Update: {
          aluno_id?: number | null
          ano?: string
          bimestre1?: number | null
          bimestre2?: number | null
          bimestre3?: number | null
          bimestre4?: number | null
          created_at?: string | null
          disciplina?: string
          id?: string
          media?: number | null
          recuperacao1?: number | null
          recuperacao2?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "boletins_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boletins_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "view_aniversariantes_hoje"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracao_turmas: {
        Row: {
          cor_hex: string
          id: string
          nome_turma: string
        }
        Insert: {
          cor_hex: string
          id?: string
          nome_turma: string
        }
        Update: {
          cor_hex?: string
          id?: string
          nome_turma?: string
        }
        Relationships: []
      }
      configuracoes: {
        Row: {
          chave: string
          descricao: string | null
          id: string
          valor: string
        }
        Insert: {
          chave: string
          descricao?: string | null
          id?: string
          valor: string
        }
        Update: {
          chave?: string
          descricao?: string | null
          id?: string
          valor?: string
        }
        Relationships: []
      }
      contas_a_pagar: {
        Row: {
          comprovante_url: string | null
          created_at: string | null
          data_pagamento: string | null
          data_venc_original: string | null
          data_vencimento: string
          descricao: string
          grupo_id: string | null
          id: string
          is_recorrente: boolean | null
          pago: boolean | null
          valor: number
        }
        Insert: {
          comprovante_url?: string | null
          created_at?: string | null
          data_pagamento?: string | null
          data_venc_original?: string | null
          data_vencimento: string
          descricao: string
          grupo_id?: string | null
          id?: string
          is_recorrente?: boolean | null
          pago?: boolean | null
          valor: number
        }
        Update: {
          comprovante_url?: string | null
          created_at?: string | null
          data_pagamento?: string | null
          data_venc_original?: string | null
          data_vencimento?: string
          descricao?: string
          grupo_id?: string | null
          id?: string
          is_recorrente?: boolean | null
          pago?: boolean | null
          valor?: number
        }
        Relationships: []
      }
      dispositivos_push: {
        Row: {
          created_at: string
          id: string
          onesignal_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          onesignal_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          onesignal_id?: string
          user_id?: string
        }
        Relationships: []
      }
      documentos_alunos: {
        Row: {
          aluno_id: number | null
          data_atualizacao: string | null
          id: string
          status: string | null
          tipo_documento: string
          url_arquivo: string
        }
        Insert: {
          aluno_id?: number | null
          data_atualizacao?: string | null
          id?: string
          status?: string | null
          tipo_documento: string
          url_arquivo: string
        }
        Update: {
          aluno_id?: number | null
          data_atualizacao?: string | null
          id?: string
          status?: string | null
          tipo_documento?: string
          url_arquivo?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_alunos_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_alunos_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "view_aniversariantes_hoje"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos_calendario: {
        Row: {
          created_at: string | null
          data: string
          id: number
          titulo: string
        }
        Insert: {
          created_at?: string | null
          data: string
          id?: never
          titulo: string
        }
        Update: {
          created_at?: string | null
          data?: string
          id?: never
          titulo?: string
        }
        Relationships: []
      }
      eventos_controle: {
        Row: {
          arquivado: boolean | null
          categorias_entrada: Json | null
          categorias_saida: Json | null
          created_at: string
          data_evento: string | null
          encerrado: boolean | null
          equipes: Json | null
          id: number
          nome: string
          participantes: Json | null
          total_alunos: number | null
          valor_unitario: number | null
        }
        Insert: {
          arquivado?: boolean | null
          categorias_entrada?: Json | null
          categorias_saida?: Json | null
          created_at?: string
          data_evento?: string | null
          encerrado?: boolean | null
          equipes?: Json | null
          id?: number
          nome: string
          participantes?: Json | null
          total_alunos?: number | null
          valor_unitario?: number | null
        }
        Update: {
          arquivado?: boolean | null
          categorias_entrada?: Json | null
          categorias_saida?: Json | null
          created_at?: string
          data_evento?: string | null
          encerrado?: boolean | null
          equipes?: Json | null
          id?: number
          nome?: string
          participantes?: Json | null
          total_alunos?: number | null
          valor_unitario?: number | null
        }
        Relationships: []
      }
      frequencias: {
        Row: {
          aluno_id: number | null
          created_at: string | null
          data: string | null
          id: number
          justificativa: string | null
          presente: boolean | null
        }
        Insert: {
          aluno_id?: number | null
          created_at?: string | null
          data?: string | null
          id?: number
          justificativa?: string | null
          presente?: boolean | null
        }
        Update: {
          aluno_id?: number | null
          created_at?: string | null
          data?: string | null
          id?: number
          justificativa?: string | null
          presente?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "frequencias_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frequencias_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "view_aniversariantes_hoje"
            referencedColumns: ["id"]
          },
        ]
      }
      funcionarios: {
        Row: {
          cargo: string | null
          cep: string | null
          certidao_nascimento_url: string | null
          comprovante_residencia_url: string | null
          cpf: string | null
          created_at: string
          data_nascimento: string | null
          email: string | null
          endereco: string | null
          foto_url: string | null
          id: number
          nome: string
          rg_url: string | null
          status: string | null
          whatsapp: string | null
        }
        Insert: {
          cargo?: string | null
          cep?: string | null
          certidao_nascimento_url?: string | null
          comprovante_residencia_url?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          endereco?: string | null
          foto_url?: string | null
          id?: number
          nome: string
          rg_url?: string | null
          status?: string | null
          whatsapp?: string | null
        }
        Update: {
          cargo?: string | null
          cep?: string | null
          certidao_nascimento_url?: string | null
          comprovante_residencia_url?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          endereco?: string | null
          foto_url?: string | null
          id?: number
          nome?: string
          rg_url?: string | null
          status?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      gastos: {
        Row: {
          created_at: string | null
          data_gasto: string
          descricao: string
          id: number
          mes_referencia: string | null
          valor: number
        }
        Insert: {
          created_at?: string | null
          data_gasto: string
          descricao: string
          id?: never
          mes_referencia?: string | null
          valor: number
        }
        Update: {
          created_at?: string | null
          data_gasto?: string
          descricao?: string
          id?: never
          mes_referencia?: string | null
          valor?: number
        }
        Relationships: []
      }
      historico_documentos: {
        Row: {
          aluno_id: number | null
          aluno_nome: string | null
          data_emissao: string
          emitido_por: string | null
          id: string
          tipo_documento: string
          titulo_documento: string
        }
        Insert: {
          aluno_id?: number | null
          aluno_nome?: string | null
          data_emissao?: string
          emitido_por?: string | null
          id?: string
          tipo_documento: string
          titulo_documento: string
        }
        Update: {
          aluno_id?: number | null
          aluno_nome?: string | null
          data_emissao?: string
          emitido_por?: string | null
          id?: string
          tipo_documento?: string
          titulo_documento?: string
        }
        Relationships: [
          {
            foreignKeyName: "historico_documentos_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_documentos_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "view_aniversariantes_hoje"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_escolar_anos: {
        Row: {
          aluno_id: number
          ano_letivo: string
          carga_horaria_anual: number | null
          created_at: string
          estabelecimento: string | null
          id: number
          municipio: string | null
          observacao: string | null
          ordem: number | null
          origem: string
          resultado_final: string | null
          serie_ano: string | null
          total_aulas_anual: number | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          aluno_id: number
          ano_letivo: string
          carga_horaria_anual?: number | null
          created_at?: string
          estabelecimento?: string | null
          id?: number
          municipio?: string | null
          observacao?: string | null
          ordem?: number | null
          origem?: string
          resultado_final?: string | null
          serie_ano?: string | null
          total_aulas_anual?: number | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          aluno_id?: number
          ano_letivo?: string
          carga_horaria_anual?: number | null
          created_at?: string
          estabelecimento?: string | null
          id?: number
          municipio?: string | null
          observacao?: string | null
          ordem?: number | null
          origem?: string
          resultado_final?: string | null
          serie_ano?: string | null
          total_aulas_anual?: number | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "historico_escolar_anos_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_escolar_anos_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "view_aniversariantes_hoje"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_escolar_disciplinas: {
        Row: {
          carga_horaria: number | null
          componente_curricular: string
          conceito: string | null
          created_at: string
          grupo: string
          historico_ano_id: number
          id: number
          nota_final: number | null
          observacao: string | null
          updated_at: string
        }
        Insert: {
          carga_horaria?: number | null
          componente_curricular: string
          conceito?: string | null
          created_at?: string
          grupo?: string
          historico_ano_id: number
          id?: number
          nota_final?: number | null
          observacao?: string | null
          updated_at?: string
        }
        Update: {
          carga_horaria?: number | null
          componente_curricular?: string
          conceito?: string | null
          created_at?: string
          grupo?: string
          historico_ano_id?: number
          id?: number
          nota_final?: number | null
          observacao?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "historico_escolar_disciplinas_historico_ano_id_fkey"
            columns: ["historico_ano_id"]
            isOneToOne: false
            referencedRelation: "historico_escolar_anos"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_pagamentos: {
        Row: {
          aluno_id: number | null
          caixa_id: string | null
          created_at: string
          credito: number | null
          data_pagamento: string | null
          debito: number | null
          descricao: string | null
          detalhes_metodos: Json | null
          forma_pagamento: string | null
          id: number
          mes_referencia: string | null
          multa: number | null
          status: string | null
          tipo: string | null
          valor_pago: number | null
          valor_total: number | null
        }
        Insert: {
          aluno_id?: number | null
          caixa_id?: string | null
          created_at?: string
          credito?: number | null
          data_pagamento?: string | null
          debito?: number | null
          descricao?: string | null
          detalhes_metodos?: Json | null
          forma_pagamento?: string | null
          id?: number
          mes_referencia?: string | null
          multa?: number | null
          status?: string | null
          tipo?: string | null
          valor_pago?: number | null
          valor_total?: number | null
        }
        Update: {
          aluno_id?: number | null
          caixa_id?: string | null
          created_at?: string
          credito?: number | null
          data_pagamento?: string | null
          debito?: number | null
          descricao?: string | null
          detalhes_metodos?: Json | null
          forma_pagamento?: string | null
          id?: number
          mes_referencia?: string | null
          multa?: number | null
          status?: string | null
          tipo?: string | null
          valor_pago?: number | null
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "historico_pagamentos_caixa_id_fkey"
            columns: ["caixa_id"]
            isOneToOne: false
            referencedRelation: "sessoes_caixa"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_pedagogico: {
        Row: {
          aluno_id: number | null
          created_at: string | null
          data: string | null
          descricao: string | null
          id: number
        }
        Insert: {
          aluno_id?: number | null
          created_at?: string | null
          data?: string | null
          descricao?: string | null
          id?: number
        }
        Update: {
          aluno_id?: number | null
          created_at?: string | null
          data?: string | null
          descricao?: string | null
          id?: number
        }
        Relationships: [
          {
            foreignKeyName: "historico_pedagogico_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_pedagogico_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "view_aniversariantes_hoje"
            referencedColumns: ["id"]
          },
        ]
      }
      logs_sistema: {
        Row: {
          acao: string
          criado_em: string
          detalhes: string
          id: number
          tabela: string
          usuario_email: string
        }
        Insert: {
          acao: string
          criado_em?: string
          detalhes: string
          id?: number
          tabela: string
          usuario_email: string
        }
        Update: {
          acao?: string
          criado_em?: string
          detalhes?: string
          id?: number
          tabela?: string
          usuario_email?: string
        }
        Relationships: []
      }
      Mensalidade: {
        Row: {
          alunoId: string
          dataVencimento: string
          id: string
          mesReferencia: string
          pagoEm: string | null
          status: string
          valorCobrado: number
        }
        Insert: {
          alunoId: string
          dataVencimento: string
          id: string
          mesReferencia: string
          pagoEm?: string | null
          status: string
          valorCobrado: number
        }
        Update: {
          alunoId?: string
          dataVencimento?: string
          id?: string
          mesReferencia?: string
          pagoEm?: string | null
          status?: string
          valorCobrado?: number
        }
        Relationships: []
      }
      movimentacoes_caixa: {
        Row: {
          caixa_id: string | null
          data_movimentacao: string | null
          descricao: string
          id: string
          tipo: string
          valor: number
        }
        Insert: {
          caixa_id?: string | null
          data_movimentacao?: string | null
          descricao: string
          id?: string
          tipo: string
          valor: number
        }
        Update: {
          caixa_id?: string | null
          data_movimentacao?: string | null
          descricao?: string
          id?: string
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_caixa_caixa_id_fkey"
            columns: ["caixa_id"]
            isOneToOne: false
            referencedRelation: "sessoes_caixa"
            referencedColumns: ["id"]
          },
        ]
      }
      perfis: {
        Row: {
          cargo: string | null
          criado_em: string | null
          email: string
          id: string
          nome: string | null
        }
        Insert: {
          cargo?: string | null
          criado_em?: string | null
          email: string
          id: string
          nome?: string | null
        }
        Update: {
          cargo?: string | null
          criado_em?: string | null
          email?: string
          id?: string
          nome?: string | null
        }
        Relationships: []
      }
      sessoes_caixa: {
        Row: {
          data_abertura: string
          data_fechamento: string | null
          fundo_inicial: number
          id: string
          operador_nome: string
          quebra_caixa: number | null
          resumo_metodos: Json | null
          status: string | null
          total_apurado: number | null
          valor_em_dinheiro_informado: number | null
        }
        Insert: {
          data_abertura?: string
          data_fechamento?: string | null
          fundo_inicial?: number
          id?: string
          operador_nome?: string
          quebra_caixa?: number | null
          resumo_metodos?: Json | null
          status?: string | null
          total_apurado?: number | null
          valor_em_dinheiro_informado?: number | null
        }
        Update: {
          data_abertura?: string
          data_fechamento?: string | null
          fundo_inicial?: number
          id?: string
          operador_nome?: string
          quebra_caixa?: number | null
          resumo_metodos?: Json | null
          status?: string | null
          total_apurado?: number | null
          valor_em_dinheiro_informado?: number | null
        }
        Relationships: []
      }
      solicitacoes_documentos: {
        Row: {
          aluno_id: number | null
          arquivo_url: string | null
          created_at: string | null
          id: string
          status: string | null
          tipo_documento: string | null
        }
        Insert: {
          aluno_id?: number | null
          arquivo_url?: string | null
          created_at?: string | null
          id?: string
          status?: string | null
          tipo_documento?: string | null
        }
        Update: {
          aluno_id?: number | null
          arquivo_url?: string | null
          created_at?: string | null
          id?: string
          status?: string | null
          tipo_documento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_documentos_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_documentos_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "view_aniversariantes_hoje"
            referencedColumns: ["id"]
          },
        ]
      }
      Turma: {
        Row: {
          id: number
          nome_turma: string | null
          professor_id: number | null
          professor_nome: string | null
        }
        Insert: {
          id?: number
          nome_turma?: string | null
          professor_id?: number | null
          professor_nome?: string | null
        }
        Update: {
          id?: number
          nome_turma?: string | null
          professor_id?: number | null
          professor_nome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Turma_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      turma_disciplinas: {
        Row: {
          ano: string | null
          disciplina: string
          id: string
          nome_turma: string
          professor_vinculado: string | null
        }
        Insert: {
          ano?: string | null
          disciplina: string
          id?: string
          nome_turma: string
          professor_vinculado?: string | null
        }
        Update: {
          ano?: string | null
          disciplina?: string
          id?: string
          nome_turma?: string
          professor_vinculado?: string | null
        }
        Relationships: []
      }
      turmas_info: {
        Row: {
          auxiliar: string | null
          email_prof_especifico_1: string | null
          email_prof_especifico_2: string | null
          email_prof_fixo_1: string | null
          email_prof_fixo_2: string | null
          horario_url: string | null
          id: string
          nome_turma: string
          prof_especifico_1: string | null
          prof_especifico_2: string | null
          prof_fixo_1: string | null
          prof_fixo_2: string | null
          professor_email: string | null
          professor_nome: string | null
        }
        Insert: {
          auxiliar?: string | null
          email_prof_especifico_1?: string | null
          email_prof_especifico_2?: string | null
          email_prof_fixo_1?: string | null
          email_prof_fixo_2?: string | null
          horario_url?: string | null
          id?: string
          nome_turma: string
          prof_especifico_1?: string | null
          prof_especifico_2?: string | null
          prof_fixo_1?: string | null
          prof_fixo_2?: string | null
          professor_email?: string | null
          professor_nome?: string | null
        }
        Update: {
          auxiliar?: string | null
          email_prof_especifico_1?: string | null
          email_prof_especifico_2?: string | null
          email_prof_fixo_1?: string | null
          email_prof_fixo_2?: string | null
          horario_url?: string | null
          id?: string
          nome_turma?: string
          prof_especifico_1?: string | null
          prof_especifico_2?: string | null
          prof_fixo_1?: string | null
          prof_fixo_2?: string | null
          professor_email?: string | null
          professor_nome?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      view_aniversariantes_hoje: {
        Row: {
          id: number | null
          nome: string | null
          responsavel: string | null
          turma: string | null
        }
        Insert: {
          id?: number | null
          nome?: string | null
          responsavel?: string | null
          turma?: string | null
        }
        Update: {
          id?: number | null
          nome?: string | null
          responsavel?: string | null
          turma?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      fechar_caixa_automatico: { Args: never; Returns: undefined }
      is_admin: { Args: never; Returns: boolean }
      zerar_mes_financeiro: {
        Args: { data_fim: string; data_inicio: string }
        Returns: undefined
      }
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
