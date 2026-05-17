"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function AgendaPortalPaisPage() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [carregandoAgenda, setCarregandoAgenda] = useState(false);
  
  // Estados para controle dos filhos vinculados
  const [meusFilhos, setMeusFilhos] = useState<any[]>([]);
  const [alunoSelecionado, setAlunoSelecionado] = useState<any>(null);
  
  // Estados da Agenda Escolar
  const [dataFiltro, setDataFiltro] = useState(new Date().toISOString().split('T')[0]);
  const [conteudoAula, setConteudoAula] = useState("");
  const [tarefaCasa, setTarefaCasa] = useState("");

  // --- FUNÇÃO AUXILIAR DE AUDITORIA (LOGS) ---
  async function registrarLogConsulta(turmaNome: string, dataAgenda: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const dataFormatada = new Date(dataAgenda + "T12:00:00").toLocaleDateString('pt-BR');
        await supabase.from('logs_sistema').insert([{
          usuario_email: user.email,
          acao: 'CONSULTA',
          tabela: 'agenda_escolar',
          detalhes: `👨‍👩‍👦 Responsável consultou a agenda escolar da turma ${turmaNome} referente à data ${dataFormatada}`
        }]);
      }
    } catch (e) {
      console.error("Erro ao gerar log de auditoria dos pais:", e);
    }
  }

  // 1. Carrega os alunos vinculados ao e-mail do responsável logado
  useEffect(() => {
    async function inicializarPortalPais() {
      setCarregando(true);
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) return router.push("/login");

      const emailResponsavel = authData.user.email || "";

      // Varre as 3 colunas possíveis de responsáveis para trazer os filhos corretos
      const { data: filhosData, error } = await supabase
        .from('alunos')
        .select('id, nome, turma, foto_url')
        .or(`email_responsavel.eq.${emailResponsavel},email_responsavel_2.eq.${emailResponsavel},email_responsavel_3.eq.${emailResponsavel}`);

      if (error) {
        console.error("Erro ao buscar dependentes:", error.message);
      } else if (filhosData && filhosData.length > 0) {
        setMeusFilhos(filhosData);
        setAlunoSelecionado(filhosData[0]); // Seleciona o primeiro filho por padrão
      }
      setCarregando(false);
    }
    inicializarPortalPais();
  }, [router]);

  // 2. Busca o conteúdo da agenda sempre que mudar o filho selecionado ou a data
  useEffect(() => {
    if (alunoSelecionado?.turma) {
      buscarAgendaDaTurma(alunoSelecionado.turma, dataFiltro);
    } else {
      setConteudoAula("");
      setTarefaCasa("");
    }
  }, [alunoSelecionado, dataFiltro]);

  async function buscarAgendaDaTurma(nomeTurma: string, dataAlvo: string) {
    setCarregandoAgenda(true);
    const { data: agenda, error } = await supabase
      .from('agenda_escolar')
      .select('*')
      .eq('nome_turma', nomeTurma)
      .eq('data', dataAlvo)
      .maybeSingle();

    if (agenda) {
      setConteudoAula(agenda.conteudo_aula || "");
      setTarefaCasa(agenda.tarefa_casa || "");
    } else {
      setConteudoAula("");
      setTarefaCasa("");
    }

    // Grava no log que o pai visualizou a rotina daquela data
    await registrarLogConsulta(nomeTurma, dataAlvo);
    setCarregandoAgenda(false);
  }

  if (carregando) return <div style={{ padding: '50px', textAlign: 'center', fontFamily: 'sans-serif' }}>Carregando dados da família...</div>;

  return (
    <div style={{ width: '100%', padding: '25px', fontFamily: 'sans-serif', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      
      {/* Cabeçalho de Boas-Vindas */}
      <header style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 'bold', color: '#1e3a8a', margin: 0 }}>📝 Agenda Escolar Diária</h1>
        <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>Acompanhe os conteúdos ministrados e tarefas de casa da plataforma ABC DO PARK</p>
      </header>

      {meusFilhos.length === 0 ? (
        <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '45px', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9' }}>
          <span style={{ fontSize: '40px' }}>🔍</span>
          <h3 style={{ color: '#475569', marginTop: '15px' }}>Nenhum estudante vinculado</h3>
          <p style={{ color: '#94a3b8', fontSize: '14px', margin: '5px 0 0' }}>Seu e-mail de acesso não foi localizado nos cadastros de nenhum aluno. Entre em contato com a coordenação.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '25px' }}>
          
          {/* Barra de Filtros Dinâmicos (Filho + Data) */}
          <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
            
            {/* Seletor de Filho (SÓ APARECE SE TIVER MAIS DE 1) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '45px', height: '45px', borderRadius: '50%', backgroundColor: '#eff6ff', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #2563eb' }}>
                {alunoSelecionado?.foto_url ? (
                  <img src={alunoSelecionado.foto_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : <span style={{ fontSize: '18px' }}>🧒</span>}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase' }}>Estudante</label>
                {meusFilhos.length > 1 ? (
                  <select
                    value={alunoSelecionado?.id || ""}
                    onChange={(e) => setAlunoSelecionado(meusFilhos.find(f => f.id === Number(e.target.value)))}
                    style={{ padding: '4px 0', fontSize: '16px', fontWeight: 'bold', color: '#1e293b', border: 'none', background: 'none', outline: 'none', cursor: 'pointer' }}
                  >
                    {meusFilhos.map(filho => <option key={filho.id} value={filho.id}>{filho.nome.split(' ')[0]} ({filho.turma})</option>)}
                  </select>
                ) : (
                  <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e293b' }}>
                    {alunoSelecionado?.nome} <span style={{ color: '#2563eb', fontSize: '13px' }}>({alunoSelecionado?.turma})</span>
                  </span>
                )}
              </div>
            </div>

            {/* Input de Data */}
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: '160px' }}>
              <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Data da Agenda</label>
              <input 
                type="date" 
                value={dataFiltro}
                onChange={(e) => setDataFiltro(e.target.value)}
                style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#1e3a8a', fontWeight: '600', fontSize: '14px', outline: 'none' }}
              />
            </div>
          </div>

          {/* Exibição dos Blocos de Conteúdo */}
          {carregandoAgenda ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Buscando caderno virtual do dia...</div>
          ) : (!conteudoAula && !tarefaCasa) ? (
            <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '50px', textAlign: 'center', border: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '42px' }}>🍃</span>
              <h3 style={{ color: '#475569', marginTop: '15px', fontWeight: '700' }}>Nenhuma atividade registrada</h3>
              <p style={{ color: '#94a3b8', fontSize: '14px', margin: '5px 0 0' }}>Não há anotações do professor nesta turma para a data selecionada.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              
              {/* Bloco 1: O que foi feito em Sala */}
              <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '25px', boxShadow: '0 4px 12px rgba(0,0,0,0.01)', border: '1px solid #f1f5f9', borderTop: '6px solid #2563eb' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                  <span style={{ fontSize: '22px' }}>🏫</span>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#1e293b' }}>Conteúdo em Sala</h3>
                </div>
                <p style={{ margin: 0, color: '#475569', fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                  {conteudoAula || "Nenhum conteúdo listado para hoje."}
                </p>
              </div>

              {/* Bloco 2: Atividade de Casa */}
              <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '25px', boxShadow: '0 4px 12px rgba(0,0,0,0.01)', border: '1px solid #f1f5f9', borderTop: '6px solid #8b5cf6' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                  <span style={{ fontSize: '22px' }}>🏡</span>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#1e293b' }}>Atividade para Casa</h3>
                </div>
                <p style={{ margin: 0, color: '#475569', fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                  {tarefaCasa || "Nenhuma lição de casa registrada para hoje!"}
                </p>
              </div>

            </div>
          )}
          
        </div>
      )}
    </div>
  );
}