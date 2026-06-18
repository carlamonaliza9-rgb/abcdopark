"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { 
  ChevronRight, 
  Search, 
  FileText, 
  AlertTriangle, 
  LayoutGrid
} from "lucide-react";

// Importação dos Componentes
import { ModalFichaAlunoTurma } from "@/app/(sistema)/dashboard/turmas/_components/ModalFichaAlunoTurma";
import { ModalAgendaTurma } from "@/app/(sistema)/dashboard/turmas/_components/ModalAgendaTurma";

export default function TurmasProfessorPage() {
  const router = useRouter();
  const [turmas, setTurmas] = useState<any[]>([]);
  const [todosAlunos, setTodosAlunos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const [turmaAtiva, setTurmaAtiva] = useState<any>(null);
  const [alunoSelecionado, setAlunoSelecionado] = useState<any>(null);
  const [modalFichaAberto, setModalFichaAberto] = useState(false);
  const [modalAgendaAberto, setModalAgendaAberto] = useState(false);
  const [turmaParaAgenda, setTurmaParaAgenda] = useState<any>(null);
  const [modoAgenda, setModoAgenda] = useState<'registrar' | 'consultar'>('registrar');

  const calcularIdade = (dataNasc: string) => {
    if (!dataNasc) return "--";
    const hoje = new Date();
    const nascimento = new Date(dataNasc + "T12:00:00");
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const m = hoje.getMonth() - nascimento.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) idade--;
    return `${idade} ${idade === 1 ? 'ano' : 'anos'}`;
  };

  async function registrarLog(acao: string, tabela: string, detalhes: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('logs_sistema').insert([{
          usuario_email: user.email,
          acao: acao,
          tabela: tabela,
          detalhes: detalhes
        }]);
      }
    } catch (e) {
      console.error("Erro ao gerar log de auditoria:", e);
    }
  }

  async function abrirFichaAluno(aluno: any) {
    setAlunoSelecionado(aluno);
    setModalFichaAberto(true);
    await registrarLog(
      "CONSULTA", 
      "alunos", 
      `🔍 Acessou a ficha individual de ${aluno.nome}`
    );
  }

  async function abrirAgendaTurma(minhaTurma: any, modo: 'registrar' | 'consultar') {
    setTurmaParaAgenda(minhaTurma);
    setModoAgenda(modo);
    setModalAgendaAberto(true);
    await registrarLog(
      "CONSULTA", 
      "eventos_calendario", 
      `🔍 Abriu agenda da turma ${minhaTurma.nome}`
    );
  }

  async function carregarDados() {
    setCarregando(true);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return router.push("/login");

    const email = authData.user.email || "";
    setUserEmail(email);

    const { data: funcData } = await supabase.from('funcionarios').select('nome').eq('email', email).single();
    const nomeDoProf = funcData?.nome || "";

    const [resAlunos, resInfos, resCores] = await Promise.all([
      supabase.from('alunos').select('*'),
      supabase.from('turmas_info').select('*'),
      supabase.from('configuracao_turmas').select('*')
    ]);

    if (resAlunos.data && resInfos.data && nomeDoProf) {
      setTodosAlunos(resAlunos.data);
      const coresAtuais = resCores.data?.reduce((acc: any, item: any) => { acc[item.nome_turma] = item.cor_hex; return acc; }, {}) || {};
      
      const { data: turmasProf } = await supabase
        .from('turma_disciplinas')
        .select('nome_turma')
        .eq('professor_vinculado', nomeDoProf)
        .eq('ano', '2026');

      const turmasNomes = Array.from(new Set((turmasProf || []).map(t => t.nome_turma)));

      resInfos.data.forEach(t => {
          if (t.auxiliar === nomeDoProf && !turmasNomes.includes(t.nome_turma)) {
              turmasNomes.push(t.nome_turma);
          }
      });

      const turmasDoProfessor = resInfos.data
        .filter(t => turmasNomes.includes(t.nome_turma))
        .map(t => ({
          nome: t.nome_turma,
          cor: coresAtuais[t.nome_turma] || "#4f46e5",
          horario_url: t.horario_url
        }));

      setTurmas(turmasDoProfessor);
      if (turmasDoProfessor.length > 0) setTurmaAtiva(turmasDoProfessor[0]);
    }
    setCarregando(false);
  }

  useEffect(() => { carregarDados(); }, []);

  const hexToRgba = (hex: string, alpha: number) => {
    let r = 0, g = 0, b = 0;
    if (hex && hex.length === 7) {
      r = parseInt(hex.slice(1, 3), 16);
      g = parseInt(hex.slice(3, 5), 16);
      b = parseInt(hex.slice(5, 7), 16);
    } else {
      return `rgba(79, 70, 229, ${alpha})`;
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  if (carregando) return <div className="min-h-screen bg-[#f4f7f9] p-10 flex items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-widest animate-pulse">Carregando painel de turmas...</div>;

  const alunosTurmaAtiva = turmaAtiva ? todosAlunos.filter(a => a.turma === turmaAtiva.nome).sort((a, b) => a.nome.localeCompare(b.nome)) : [];

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] p-4 md:p-8 lg:p-10 font-sans pb-32 animate-in fade-in duration-500 overflow-x-hidden">
      
      <div className="w-full max-w-[1400px] mx-auto">
        
        {turmas.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-[2rem] border border-slate-200 shadow-sm mt-10">
            <p className="text-sm font-bold text-slate-400">Nenhuma turma vinculada ao seu perfil no momento.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-8 md:gap-10">
            
            {/* TÓPICOS DE SELEÇÃO (TABS) */}
            <div className="flex flex-col gap-3">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 flex items-center gap-1.5">
                <LayoutGrid size={14} /> Selecione a Turma
              </span>
              <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-3">
                {turmas.map(t => {
                  const isActive = turmaAtiva?.nome === t.nome;
                  return (
                    <button
                      key={t.nome}
                      onClick={() => setTurmaAtiva(t)}
                      className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl font-bold text-[11px] md:text-sm whitespace-nowrap transition-all border-2 shrink-0 ${
                        isActive 
                          ? 'border-transparent shadow-md text-white' 
                          : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200 hover:bg-slate-50'
                      }`}
                      style={{ backgroundColor: isActive ? t.cor : '' }}
                    >
                      {isActive ? (
                        <span className="w-2.5 h-2.5 rounded-full bg-white/40"></span>
                      ) : (
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.cor }}></span>
                      )}
                      {t.nome}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* PAINEL DA TURMA ATIVA */}
            {turmaAtiva && (
              <div className="flex flex-col animate-in slide-in-from-bottom-4 duration-500">
                
                {/* CABEÇALHO DA TURMA */}
                <div className="bg-white rounded-[2rem] border border-slate-100 p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm mb-6 relative overflow-hidden">
                  {/* Detalhe de fundo suave */}
                  <div className="absolute top-0 right-0 w-64 h-full pointer-events-none" style={{ background: `linear-gradient(to left, ${hexToRgba(turmaAtiva.cor, 0.05)}, transparent)` }}></div>

                  <div className="flex items-center gap-5 relative z-10">
                    <div 
                      className="w-16 h-16 rounded-[1.2rem] flex items-center justify-center text-3xl shadow-sm border border-slate-100"
                      style={{ backgroundColor: hexToRgba(turmaAtiva.cor, 0.1) }}
                    >
                      🏫
                    </div>
                    <div>
                      <h2 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight">
                        {turmaAtiva.nome}
                      </h2>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs font-bold text-slate-500">
                          {alunosTurmaAtiva.length} Alunos
                        </span>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                          Letivo 2026
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 w-full md:w-auto relative z-10">
                    <button 
                      onClick={() => abrirAgendaTurma(turmaAtiva, 'consultar')} 
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white text-slate-600 border-2 border-slate-100 hover:border-slate-200 hover:bg-slate-50 px-5 py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
                    >
                      <Search size={16} strokeWidth={2.5} /> Histórico
                    </button>
                    <button 
                      onClick={() => abrirAgendaTurma(turmaAtiva, 'registrar')} 
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 text-white px-6 py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest shadow-md hover:scale-105 transition-all"
                      style={{ backgroundColor: turmaAtiva.cor, boxShadow: `0 4px 15px -3px ${hexToRgba(turmaAtiva.cor, 0.4)}` }}
                    >
                      <FileText size={16} strokeWidth={2.5} /> Registrar Agenda
                    </button>
                  </div>
                </div>

                {/* LISTA DE ALUNOS EM LINHA */}
                <div className="flex flex-col gap-3">
                  {alunosTurmaAtiva.length === 0 ? (
                    <div className="p-10 text-center text-slate-400 font-medium bg-white rounded-3xl border border-slate-100">Nenhum aluno matriculado nesta turma.</div>
                  ) : (
                    alunosTurmaAtiva.map((aluno) => (
                      <div 
                        key={aluno.id} 
                        onClick={() => abrirFichaAluno(aluno)} 
                        className="group bg-white rounded-[1.5rem] border border-slate-100 p-4 md:p-5 flex items-center justify-between shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
                      >
                        {/* Marcador lateral colorido curvo (mistura do design de grid para a lista) */}
                        <div 
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-14 rounded-r-full transition-all duration-300 group-hover:h-full group-hover:rounded-none group-hover:w-1.5"
                          style={{ backgroundColor: turmaAtiva.cor }}
                        ></div>

                        {/* Fundo que acende de leve no hover */}
                        <div 
                          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                          style={{ background: `linear-gradient(to right, ${hexToRgba(turmaAtiva.cor, 0.04)}, transparent)` }}
                        ></div>

                        <div className="flex items-center gap-4 md:gap-6 pl-4 relative z-10">
                          {/* Avatar Ampliado */}
                          <div className="w-14 h-14 md:w-16 md:h-16 rounded-full overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                            {aluno.foto_url ? (
                              <img src={aluno.foto_url} className="w-full h-full object-cover" alt={aluno.nome} />
                            ) : (
                              <span className="w-full h-full flex items-center justify-center text-2xl text-slate-300">👤</span>
                            )}
                          </div>
                          
                          <div className="flex flex-col">
                            <h4 className="font-bold text-slate-800 text-base md:text-lg tracking-tight group-hover:text-slate-900">
                              {aluno.nome}
                            </h4>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-[11px] md:text-xs font-semibold text-slate-400">
                                {calcularIdade(aluno.data_nascimento)}
                              </span>
                              
                              {/* Tag Alergia */}
                              {aluno.tem_alergia && (
                                <span className="flex items-center gap-1.5 text-rose-500 font-bold text-[9px] uppercase tracking-widest bg-rose-50 px-2.5 py-0.5 rounded-md border border-rose-100">
                                  <AlertTriangle size={12} strokeWidth={2.5} /> Alergia
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 pr-2 relative z-10">
                          <div className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center bg-slate-50 text-slate-300 group-hover:bg-white transition-all shadow-none group-hover:shadow-sm">
                            <ChevronRight 
                              size={20} 
                              className="transition-colors group-hover:translate-x-0.5" 
                              style={{ color: turmaAtiva.cor }}
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

              </div>
            )}
          </div>
        )}

        {/* Modais */}
        {modalFichaAberto && (
          <ModalFichaAlunoTurma 
            aluno={alunoSelecionado} 
            ehAdmin={false} 
            onClose={() => setModalFichaAberto(false)} 
            calcularIdade={calcularIdade} 
          />
        )}
        
        {modalAgendaAberto && (
          <ModalAgendaTurma 
            turma={turmaParaAgenda} 
            userEmail={userEmail} 
            modo={modoAgenda} 
            ehAdmin={false} 
            onClose={() => setModalAgendaAberto(false)} 
          />
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}} />
    </div>
  );
}