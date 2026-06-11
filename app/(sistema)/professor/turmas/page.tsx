"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

// Importação dos Componentes com os caminhos atualizados para a nova arquitetura
import { ModalFichaAlunoTurma } from "@/app/(sistema)/dashboard/turmas/_components/ModalFichaAlunoTurma";
import { ModalAgendaTurma } from "@/app/(sistema)/dashboard/turmas/_components/ModalAgendaTurma";

export default function TurmasProfessorPage() {
  const router = useRouter();
  const [turmas, setTurmas] = useState<any[]>([]);
  const [todosAlunos, setTodosAlunos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const [alunoSelecionado, setAlunoSelecionado] = useState<any>(null);
  const [modalFichaAberto, setModalFichaAberto] = useState(false);
  const [modalAgendaAberto, setModalAgendaAberto] = useState(false);
  const [turmaParaAgenda, setTurmaParaAgenda] = useState<any>(null);
  const [modoAgenda, setModoAgenda] = useState<'registrar' | 'consultar'>('registrar');

  const calcularIdade = (dataNasc: string) => {
    if (!dataNasc) return "--";
    const hoje = new Date();
    // Adicionado "T12:00:00" para neutralizar o fuso horário UTC e evitar distorções na data local de Belém
    const nascimento = new Date(dataNasc + "T12:00:00");
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const m = hoje.getMonth() - nascimento.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) idade--;
    return `${idade} ${idade === 1 ? 'ano' : 'anos'}`;
  };

  // --- FUNÇÃO AUXILIAR DE AUDITORIA (LOGS) ---
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
    
    // Log de consulta altamente detalhado com quebra de linhas estruturada
    await registrarLog(
      "CONSULTA", 
      "alunos", 
      `🔍 Acessou a ficha cadastral pedagógica individual do estudante.\n` +
      `• Aluno selecionado: ${aluno.nome}\n` +
      `• Turma vinculada: ${aluno.turma || 'Não definida'}\n` +
      `• Idade atual calculada: ${calcularIdade(aluno.data_nascimento)}`
    );
  }

  async function abrirAgendaTurma(minhaTurma: any, modo: 'registrar' | 'consultar') {
    setTurmaParaAgenda(minhaTurma);
    setModoAgenda(modo);
    setModalAgendaAberto(true);
    
    // Detalha no log de consulta qual foi o intuito da abertura do painel da agenda
    const acaoTexto = modo === 'registrar' ? 'Abertura para inserção/novos lançamentos diários' : 'Abertura para leitura e consulta do histórico';
    await registrarLog(
      "CONSULTA", 
      "eventos_calendario", 
      `🔍 Entrou no painel interativo da Agenda Escolar da classe.\n` +
      `• Turma selecionada: ${minhaTurma.nome}\n` +
      `• Operação desejada: ${acaoTexto} (${modo.toUpperCase()})`
    );
  }

  async function carregarDados() {
    setCarregando(true);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return router.push("/login");

    const email = authData.user.email || "";
    setUserEmail(email);

    // Puxa o nome oficial do professor
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
      
      // NOVA LÓGICA DE VÍNCULO: Procura nas disciplinas ou se ele é auxiliar
      const { data: turmasProf } = await supabase
        .from('turma_disciplinas')
        .select('nome_turma')
        .eq('professor_vinculado', nomeDoProf)
        .eq('ano', '2026');

      const turmasNomes = Array.from(new Set((turmasProf || []).map(t => t.nome_turma)));

      resInfos.data.forEach(t => {
          // Adiciona também se for o Auxiliar da turma
          if (t.auxiliar === nomeDoProf && !turmasNomes.includes(t.nome_turma)) {
              turmasNomes.push(t.nome_turma);
          }
      });

      const turmasDoProfessor = resInfos.data
        .filter(t => turmasNomes.includes(t.nome_turma))
        .map(t => ({
          nome: t.nome_turma,
          cor: coresAtuais[t.nome_turma] || "#ffffff",
          horario_url: t.horario_url
        }));

      setTurmas(turmasDoProfessor);
    }
    setCarregando(false);
  }

  useEffect(() => { carregarDados(); }, []);

  if (carregando) return <div className="min-h-screen bg-white md:bg-slate-50 p-10 flex items-center justify-center text-slate-400 text-xs font-black uppercase tracking-widest animate-pulse">Carregando turma...</div>;

  return (
    <div className="w-full min-h-screen bg-white md:bg-[#f4f7f9] md:p-8 lg:p-10 font-sans pb-32 animate-in fade-in duration-500 overflow-x-hidden">
      {/* Container muito mais largo para não ter sobra de espaço inútil */}
      <div className="w-full max-w-[1600px] mx-auto md:space-y-8">
        
        {turmas.length === 0 ? (
          <div className="bg-white p-10 md:rounded-[2.5rem] border-y md:border border-slate-100 md:shadow-sm text-center mt-4">
            <p className="text-[10px] md:text-xs font-black uppercase text-slate-400 tracking-widest">
              Você ainda não está vinculado a nenhuma turma no momento.
            </p>
          </div>
        ) : (
          turmas.map((minhaTurma, turmaIndex) => {
            const alunosTurma = todosAlunos.filter(a => a.turma === minhaTurma.nome).sort((a, b) => a.nome.localeCompare(b.nome));
            
            return (
              <div key={minhaTurma.nome} className={`bg-white pb-2 pt-6 px-0 md:p-10 md:rounded-[2.5rem] md:shadow-sm border-b-8 md:border border-slate-50 md:border-slate-100 ${turmaIndex > 0 ? 'mt-4 md:mt-0' : ''}`}>
                
                {/* Header da Turma (Mobile Native / Desktop Card) */}
                <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 md:gap-6 mb-4 md:mb-8 border-b border-slate-100 px-4 md:px-0 pb-4 md:pb-8">
                  <div className="flex flex-col">
                    <h1 className="text-2xl md:text-5xl font-black text-slate-800 tracking-tighter m-0 flex items-center gap-2 md:gap-4">
                      <span className="text-2xl md:text-4xl">🏫</span> {minhaTurma.nome}
                    </h1>
                    <p className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-400 mt-1 md:mt-3">
                      {alunosTurma.length} alunos matriculados
                    </p>
                  </div>
                  
                  <div className="flex flex-row md:flex-row gap-2 md:gap-4 w-full lg:w-auto mt-2 md:mt-0">
                    <button 
                      onClick={() => abrirAgendaTurma(minhaTurma, 'registrar')} 
                      className="flex-1 lg:flex-none flex items-center justify-center gap-2 md:gap-3 bg-indigo-600 text-white px-3 py-3 md:px-8 md:py-5 rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-xs shadow-md md:shadow-lg hover:bg-indigo-700 transition-all active:scale-95"
                    >
                      <span className="text-sm md:text-xl">📝</span> <span className="hidden sm:inline">Registrar Agenda</span><span className="sm:hidden">Agenda</span>
                    </button>
                    <button 
                      onClick={() => abrirAgendaTurma(minhaTurma, 'consultar')} 
                      className="flex-1 lg:flex-none flex items-center justify-center gap-2 md:gap-3 bg-slate-100 md:bg-white text-indigo-600 border-none md:border-2 md:border-indigo-100 px-3 py-3 md:px-8 md:py-5 rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-xs hover:bg-slate-200 md:hover:border-indigo-200 transition-all active:scale-95 shadow-sm md:shadow-sm"
                    >
                      <span className="text-sm md:text-xl">🔍</span> Histórico
                    </button>
                  </div>
                </div>

                {/* Lista de Alunos (Mobile Edge-to-Edge List / Desktop Grid) */}
                <div className="flex flex-col md:grid md:grid-cols-2 xl:grid-cols-3 gap-0 md:gap-5 xl:gap-6">
                  {alunosTurma.map((aluno, index) => {
                    // Paleta Cíclica mantida para o Desktop
                    const classesPaleta = [
                      "md:bg-blue-50 md:border-blue-500 md:text-blue-900 md:hover:border-blue-400 md:hover:shadow-blue-100",
                      "md:bg-emerald-50 md:border-emerald-500 md:text-emerald-900 md:hover:border-emerald-400 md:hover:shadow-emerald-100",
                      "md:bg-rose-50 md:border-rose-500 md:text-rose-900 md:hover:border-rose-400 md:hover:shadow-rose-100"
                    ];
                    const corSelecionada = classesPaleta[index % classesPaleta.length];

                    return (
                      <div 
                        key={aluno.id} 
                        onClick={() => abrirFichaAluno(aluno)} 
                        className={`px-4 py-3 md:p-6 bg-white md:bg-transparent border-b border-slate-100 md:border-b-0 md:border-l-8 md:rounded-[2rem] flex flex-row items-center justify-between cursor-pointer transition-all md:hover:-translate-y-1 w-full active:bg-slate-50 md:active:bg-transparent ${corSelecionada}`}
                      >
                        <div className="flex items-center gap-3 md:gap-4 flex-1 overflow-hidden">
                          {/* Avatar */}
                          <div className="w-12 h-12 md:w-16 md:h-16 shrink-0 rounded-full md:rounded-[1.2rem] bg-slate-50 md:bg-white flex items-center justify-center overflow-hidden border border-slate-100 md:border-white shadow-sm">
                            {aluno.foto_url ? (
                              <img src={aluno.foto_url} className="w-full h-full object-cover" alt="" />
                            ) : (
                              <span className="text-xl md:text-2xl font-black text-slate-300 md:opacity-50">👤</span>
                            )}
                          </div>
                          
                          {/* Info */}
                          <div className="flex flex-col justify-center flex-1 overflow-hidden">
                            <p className="font-black text-sm md:text-lg text-slate-800 md:text-inherit m-0 leading-tight truncate" title={aluno.nome}>
                              {aluno.nome}
                            </p>
                            <div className="flex items-center flex-wrap gap-2 mt-1 md:mt-2">
                              <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 md:text-inherit md:opacity-80 whitespace-nowrap">
                                {calcularIdade(aluno.data_nascimento)}
                              </span>
                              {aluno.tem_alergia && (
                                <span className="text-[8px] md:text-[9px] bg-red-100 text-red-600 px-2 py-0.5 md:px-3 md:py-1 rounded-md md:rounded-lg font-black uppercase tracking-widest shadow-none md:shadow-sm whitespace-nowrap">
                                  ⚠️ Alergia
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Botão de Ação Visual (Seta nativa) */}
                        <div className="flex items-center text-slate-300 md:text-inherit md:opacity-60 shrink-0">
                          <span className="text-lg md:text-xl">➔</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
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
    </div>
  );
}