"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

// Importação dos Componentes
import { ModalFichaAlunoTurma } from "@/app/dashboard/turmas/_components/ModalFichaAlunoTurma";
import { ModalAgendaTurma } from "@/app/dashboard/turmas/_components/ModalAgendaTurma";

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

    const [resAlunos, resInfos, resCores] = await Promise.all([
      supabase.from('alunos').select('*'),
      supabase.from('turmas_info').select('*'),
      supabase.from('configuracao_turmas').select('*')
    ]);

    if (resAlunos.data && resInfos.data) {
      setTodosAlunos(resAlunos.data);
      const coresAtuais = resCores.data?.reduce((acc: any, item: any) => { acc[item.nome_turma] = item.cor_hex; return acc; }, {}) || {};
      
      const turmasDoProfessor = resInfos.data.filter(t => 
        t.email_prof_fixo_1 === email || t.email_prof_fixo_2 === email || 
        t.email_prof_especifico_1 === email || t.email_prof_especifico_2 === email
      ).map(t => ({
        nome: t.nome_turma,
        cor: coresAtuais[t.nome_turma] || "#ffffff",
        horario_url: t.horario_url
      }));

      setTurmas(turmasDoProfessor);
    }
    setCarregando(false);
  }

  useEffect(() => { carregarDados(); }, []);

  if (carregando) return <div className="p-10 text-center font-black uppercase text-slate-300 tracking-widest animate-pulse">Carregando turma...</div>;

  return (
    <div className="w-full min-h-screen bg-slate-50/50 p-4 md:p-8 font-sans pb-24 md:pb-8 animate-in fade-in duration-500">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {turmas.length === 0 ? (
          <div className="bg-white p-10 rounded-[2.5rem] border border-slate-50 shadow-sm text-center">
            <p className="text-[10px] font-black uppercase text-slate-300 tracking-widest">
              Você ainda não está vinculado a nenhuma turma no momento.
            </p>
          </div>
        ) : (
          turmas.map(minhaTurma => {
            const alunosTurma = todosAlunos.filter(a => a.turma === minhaTurma.nome).sort((a, b) => a.nome.localeCompare(b.nome));
            
            return (
              <div key={minhaTurma.nome} className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-50">
                
                {/* Header da Turma */}
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-6 mb-8 border-b border-slate-100 pb-8">
                  <div className="flex flex-col">
                    <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tighter m-0 italic flex items-center gap-3">
                      🏫 {minhaTurma.nome}
                    </h1>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">
                      {alunosTurma.length} alunos matriculados
                    </p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <button 
                      onClick={() => abrirAgendaTurma(minhaTurma, 'registrar')} 
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg hover:bg-indigo-700 transition-all active:scale-95"
                    >
                      <span>📝</span> Registrar Agenda
                    </button>
                    <button 
                      onClick={() => abrirAgendaTurma(minhaTurma, 'consultar')} 
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white text-indigo-600 border-2 border-indigo-100 px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:border-indigo-200 transition-all active:scale-95 shadow-sm"
                    >
                      <span>🔍</span> Consultar Histórico
                    </button>
                  </div>
                </div>

                {/* Lista de Alunos (Cards) */}
                <div className="flex flex-col gap-4">
                  {alunosTurma.map((aluno, index) => {
                    // Paleta Cíclica Traduzida para o Tailwind
                    const classesPaleta = [
                      "bg-blue-50 border-blue-500 text-blue-900 hover:border-blue-400 hover:shadow-blue-100",
                      "bg-emerald-50 border-emerald-500 text-emerald-900 hover:border-emerald-400 hover:shadow-emerald-100",
                      "bg-rose-50 border-rose-500 text-rose-900 hover:border-rose-400 hover:shadow-rose-100"
                    ];
                    const corSelecionada = classesPaleta[index % classesPaleta.length];

                    return (
                      <div 
                        key={aluno.id} 
                        onClick={() => abrirFichaAluno(aluno)} 
                        className={`p-5 md:p-6 rounded-[2rem] flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer border-l-8 transition-all hover:-translate-y-0.5 hover:shadow-lg ${corSelecionada} gap-4`}
                      >
                        <div className="flex items-center gap-4 md:gap-6">
                          {/* Avatar */}
                          <div className="w-16 h-16 shrink-0 rounded-[1.2rem] bg-white flex items-center justify-center overflow-hidden border border-white shadow-sm">
                            {aluno.foto_url ? (
                              <img src={aluno.foto_url} className="w-full h-full object-cover" alt="" />
                            ) : (
                              <span className="text-2xl font-black opacity-50">👤</span>
                            )}
                          </div>
                          
                          {/* Info */}
                          <div className="flex flex-col justify-center">
                            <p className="font-black text-base md:text-lg m-0 leading-tight line-clamp-1">{aluno.nome}</p>
                            <div className="flex items-center flex-wrap gap-2 mt-2">
                              <span className="text-[10px] font-black uppercase tracking-widest opacity-80">
                                {calcularIdade(aluno.data_nascimento)}
                              </span>
                              {aluno.tem_alergia && (
                                <span className="text-[8px] md:text-[9px] bg-red-100 text-red-600 px-3 py-1 rounded-lg font-black uppercase tracking-widest shadow-sm">
                                  ⚠️ Alerta de Saúde
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Botão de Ação Visual */}
                        <div className="self-end sm:self-auto flex items-center gap-2 opacity-60">
                          <span className="text-[9px] font-black uppercase tracking-[0.2em] hidden md:block">Acessar Ficha</span>
                          <span className="text-xl">➔</span>
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