"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Calendar, FileText, AlertCircle } from "lucide-react";

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
    const { data: agenda } = await supabase
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

  if (carregando) return <div className="p-10 text-center text-sm md:text-[10px] font-black uppercase text-slate-300 animate-pulse tracking-widest">Sincronizando pauta familiar...</div>;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10 w-full px-2 relative min-h-screen">
      
      {/* Cabeçalho */}
      <header className="mb-10">
        <h1 className="text-2xl md:text-3xl font-black text-slate-800 uppercase tracking-tighter italic">📝 Agenda Escolar Diária</h1>
        <div className="h-1 w-20 bg-indigo-600 mt-2 rounded-full"></div>
        <p className="text-xs md:text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-3">Acompanhe os conteúdos ministrados e tarefas de casa da plataforma ABC DO PARK</p>
      </header>

      {meusFilhos.length === 0 ? (
        <div className="bg-white rounded-[2.5rem] p-8 text-center border border-slate-50 shadow-sm max-w-2xl mx-auto">
          <span className="text-4xl block mb-4">🔍</span>
          <h3 className="text-sm font-black text-slate-700 uppercase italic">Nenhum estudante vinculado</h3>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mt-2">
            Seu e-mail de acesso não foi localizado nos cadastros de nenhum aluno. Entre em contato com a coordenação.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-8 max-w-4xl">
          
          {/* Barra de Filtros Dinâmicos (Filho + Data) */}
          <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-sm border border-slate-50 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-6">
            
            {/* Seletor de Filho / Nome */}
            <div className="flex items-center gap-4 flex-1">
              <div className="w-14 h-14 rounded-full bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                {alunoSelecionado?.foto_url ? (
                  <img src={alunoSelecionado.foto_url} alt="Foto Aluno" className="w-14 h-14 object-cover" />
                ) : <span className="text-2xl">🧒</span>}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] md:text-[9px] font-black text-slate-400 uppercase tracking-wider block">Estudante Matriculado</span>
                {meusFilhos.length > 1 ? (
                  <select
                    value={alunoSelecionado?.id || ""}
                    onChange={(e) => setAlunoSelecionado(meusFilhos.find(f => f.id === Number(e.target.value)))}
                    className="w-full bg-transparent border-0 text-sm md:text-xs font-bold text-slate-700 uppercase p-0 focus:outline-none focus:ring-0 cursor-pointer mt-0.5"
                  >
                    {meusFilhos.map(filho => (
                      <option key={filho.id} value={filho.id} className="text-slate-700 font-bold bg-white uppercase">
                        {filho.nome.split(' ')[0]} ({filho.turma})
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-sm md:text-xs font-bold text-slate-700 uppercase block truncate mt-0.5">
                    {alunoSelecionado?.nome} <span className="text-indigo-600 font-black">({alunoSelecionado?.turma})</span>
                  </span>
                )}
              </div>
            </div>

            {/* Input de Data */}
            <div className="flex flex-col min-w-[200px] border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
              <span className="text-[10px] md:text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Calendar size={18} strokeWidth={2.5} /> Data da Atividade
              </span>
              <input 
                type="date" 
                value={dataFiltro}
                onChange={(e) => setDataFiltro(e.target.value)}
                className="w-full p-3 bg-slate-50 rounded-2xl border border-slate-100 text-slate-700 font-bold text-sm md:text-xs outline-none focus:border-indigo-500 transition-colors uppercase"
              />
            </div>
          </div>

          {/* Exibição dos Blocos de Conteúdo: grid-cols-1 no celular e md:grid-cols-2 no computador */}
          {carregandoAgenda ? (
            <div className="p-10 text-center text-sm md:text-[10px] font-black uppercase text-slate-300 animate-pulse tracking-widest">
              Buscando caderno virtual...
            </div>
          ) : (!conteudoAula && !tarefaCasa) ? (
            <div className="bg-white rounded-[2.5rem] p-8 text-center border border-slate-50 shadow-sm">
              <span className="text-4xl block mb-4">🍃</span>
              <h3 className="text-sm font-black text-slate-400 uppercase italic">Nenhuma anotação postada</h3>
              <p className="text-xs font-bold text-slate-300 uppercase tracking-wide mt-2">
                Não há registros do corpo docente para este dia.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Bloco 1: O que foi feito em Sala */}
              <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-sm border border-slate-50 group transition-all hover:bg-slate-50/50">
                <div className="flex items-center gap-4 pb-4 border-b border-slate-50 mb-4">
                  <div className="text-indigo-600 flex-shrink-0">
                    <FileText size={18} strokeWidth={2.5} />
                  </div>
                  <span className="text-xs md:text-[9px] font-black text-indigo-600 uppercase tracking-[0.2em]">Conteúdo em Sala</span>
                </div>
                <p className="text-sm md:text-xs font-bold text-slate-700 uppercase leading-relaxed break-words whitespace-pre-wrap">
                  {conteudoAula || "Nenhum conteúdo listado para hoje."}
                </p>
              </div>

              {/* Bloco 2: Atividade de Casa */}
              <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-sm border border-slate-50 group transition-all hover:bg-slate-50/50">
                <div className="flex items-center gap-4 pb-4 border-b border-slate-50 mb-4">
                  <div className="text-rose-600 flex-shrink-0">
                    <AlertCircle size={18} strokeWidth={2.5} />
                  </div>
                  <span className="text-xs md:text-[9px] font-black text-rose-600 uppercase tracking-[0.2em]">Atividade para Casa</span>
                </div>
                <p className="text-sm md:text-xs font-bold text-slate-700 uppercase leading-relaxed break-words whitespace-pre-wrap">
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