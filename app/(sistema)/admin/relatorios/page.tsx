"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase"; 
import { useRouter } from "next/navigation";
import { BrainCircuit, Search, FileText, AlertCircle, CheckCircle2, Printer, User, X, BookOpen } from "lucide-react";

const ORDEM_TURMAS = [
  "Maternal", "Jardim I", "Jardim II", 
  "1º Ano", "2º Ano", "3º Ano", "4º Ano", "5º Ano"
];

export default function AdminRelatoriosPedagogicosPage() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  
  const [turmasDisponiveis, setTurmasDisponiveis] = useState<string[]>(ORDEM_TURMAS);
  const [turmaSelecionada, setTurmaSelecionada] = useState("Jardim I");
  const [trimestreSelecionado, setTrimestreSelecionado] = useState("1º Trimestre");
  
  const [alunos, setAlunos] = useState<any[]>([]);
  const [relatorios, setRelatorios] = useState<any[]>([]);

  const [alunoModalAberto, setAlunoModalAberto] = useState<any | null>(null);

  useEffect(() => {
    async function verificarAcesso() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");

      const { data: perfil } = await supabase.from('perfis').select('cargo').eq('id', user.id).single();
      const email = user.email || "";
      const cargoStr = perfil?.cargo?.toUpperCase() || "";
      
      const ehAdmin = email === 'carlamonaliza9@gmail.com' || email === 'diretoria@abcdopark.com' || cargoStr === 'ADMIN' || cargoStr === 'ADMINISTRADOR';
      
      if (!ehAdmin) {
        alert("Acesso negado. Apenas administradores podem visualizar o painel geral de relatórios.");
        return router.push("/dashboard");
      }
      
      const { data: turmasBD } = await supabase.from('alunos').select('turma').neq('status', 'transferido');
      if (turmasBD) {
        const turmasUnicas = Array.from(new Set(turmasBD.map(t => t.turma).filter(Boolean)));
        turmasUnicas.sort((a, b) => {
          const indexA = ORDEM_TURMAS.indexOf(a);
          const indexB = ORDEM_TURMAS.indexOf(b);
          if (indexA === -1 && indexB === -1) return a.localeCompare(b);
          if (indexA === -1) return 1;
          if (indexB === -1) return -1;
          return indexA - indexB;
        });
        setTurmasDisponiveis(turmasUnicas.length > 0 ? turmasUnicas : ORDEM_TURMAS);
        if (turmasUnicas.length > 0 && !turmasUnicas.includes(turmaSelecionada)) {
          setTurmaSelecionada(turmasUnicas[0]);
        }
      }
    }
    verificarAcesso();
  }, []);

  useEffect(() => {
    async function buscarDados() {
      setCarregando(true);
      try {
        const { data: listaAlunos } = await supabase
          .from('alunos')
          .select('id, nome, foto_url, turma')
          .eq('turma', turmaSelecionada)
          .neq('status', 'transferido')
          .order('nome', { ascending: true });

        const alunosCarregados = listaAlunos || [];
        setAlunos(alunosCarregados);

        if (alunosCarregados.length > 0) {
          const idsAlunos = alunosCarregados.map(a => a.id);
          
          const { data: relatoriosBD } = await supabase
            .from('avancos_dificuldades')
            .select('*')
            .in('aluno_id', idsAlunos)
            .eq('trimestre', trimestreSelecionado)
            .eq('ano', '2026')
            .order('data_registro', { ascending: false }); // Traz os mais recentes primeiro

          setRelatorios(relatoriosBD || []);
        } else {
          setRelatorios([]);
        }
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
      } finally {
        setCarregando(false);
      }
    }

    if (turmaSelecionada) {
      buscarDados();
    }
  }, [turmaSelecionada, trimestreSelecionado]);

  // AGORA BUSCAMOS TODOS OS RELATÓRIOS DO ALUNO (Não apenas o primeiro)
  const alunosComRelatorios = alunos.map(aluno => {
    const relatoriosDoAluno = relatorios.filter(r => String(r.aluno_id) === String(aluno.id));
    return { ...aluno, relatorios: relatoriosDoAluno };
  });

  const dadosFiltrados = alunosComRelatorios.filter(a => a.nome.toLowerCase().includes(busca.toLowerCase()));
  
  const totalAlunos = alunos.length;
  // Conta quantos alunos têm pelo menos 1 relatório entregue
  const totalEntregues = alunosComRelatorios.filter(a => a.relatorios.length > 0).length;
  const progressoTurma = totalAlunos > 0 ? Math.round((totalEntregues / totalAlunos) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 md:p-8 p-4">
      <div className="max-w-[1600px] mx-auto space-y-6 relative">
        
        {/* CABEÇALHO E FILTROS */}
        <header className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col xl:flex-row justify-between gap-6 items-start xl:items-center">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
              <BrainCircuit size={28} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Supervisão de Pareceres</h1>
              <p className="text-sm font-medium text-slate-500 mt-1">Acompanhe e valide os relatórios pedagógicos dos professores.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Buscar aluno..." 
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-indigo-400 focus:bg-white transition-all"
              />
            </div>
            
            <select 
              value={turmaSelecionada}
              onChange={(e) => setTurmaSelecionada(e.target.value)}
              className="py-3 px-4 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-indigo-400 cursor-pointer shadow-sm"
            >
              {turmasDisponiveis.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <select 
              value={trimestreSelecionado}
              onChange={(e) => setTrimestreSelecionado(e.target.value)}
              className="py-3 px-4 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-indigo-400 cursor-pointer shadow-sm"
            >
              <option value="1º Trimestre">1º Trimestre</option>
              <option value="2º Trimestre">2º Trimestre</option>
              <option value="3º Trimestre">3º Trimestre</option>
              <option value="4º Trimestre">4º Trimestre</option>
            </select>
            
            <button onClick={() => window.print()} className="py-3 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-sm">
              <Printer size={18} /> <span className="hidden sm:inline">Imprimir</span>
            </button>
          </div>
        </header>

        {/* BARRA DE PROGRESSO */}
        {!carregando && totalAlunos > 0 && (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1 w-full">
              <div className="flex justify-between items-end mb-2">
                <span className="text-sm font-black text-slate-700 uppercase tracking-wide">Alunos com Relatórios: {turmaSelecionada}</span>
                <span className="text-lg font-black text-indigo-600">{progressoTurma}%</span>
              </div>
              <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${progressoTurma === 100 ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                  style={{ width: `${progressoTurma}%` }}
                ></div>
              </div>
            </div>
            <div className="flex gap-4 w-full md:w-auto">
              <div className="bg-emerald-50 border border-emerald-100 px-4 py-3 rounded-2xl flex-1 text-center">
                <span className="block text-2xl font-black text-emerald-600">{totalEntregues}</span>
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest">Avaliados</span>
              </div>
              <div className="bg-rose-50 border border-rose-100 px-4 py-3 rounded-2xl flex-1 text-center">
                <span className="block text-2xl font-black text-rose-600">{totalAlunos - totalEntregues}</span>
                <span className="text-[10px] font-bold text-rose-800 uppercase tracking-widest">Pendentes</span>
              </div>
            </div>
          </div>
        )}

        {/* LISTAGEM DE ALUNOS COMPACTA */}
        {carregando ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
            <p className="text-sm font-bold text-slate-500">Carregando relatórios...</p>
          </div>
        ) : dadosFiltrados.length === 0 ? (
          <div className="bg-white p-16 rounded-3xl border border-slate-200 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">Nenhum aluno encontrado</h3>
            <p className="text-slate-500 text-sm">Não há dados para exibir nesta turma ou com este filtro.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {dadosFiltrados.map((aluno) => {
              const qtdRelatorios = aluno.relatorios.length;
              const temRelatorio = qtdRelatorios > 0;
              
              return (
                <div 
                  key={aluno.id} 
                  onClick={() => setAlunoModalAberto(aluno)}
                  className={`group cursor-pointer bg-white rounded-2xl border-l-[6px] border border-y-slate-200 border-r-slate-200 p-4 flex flex-col gap-3 transition-all hover:shadow-md hover:-translate-y-0.5 ${temRelatorio ? 'border-l-emerald-500 hover:border-r-emerald-200 hover:border-y-emerald-200' : 'border-l-rose-400 hover:border-r-rose-200 hover:border-y-rose-200'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-slate-100 overflow-hidden shrink-0 border-2 border-white shadow-sm">
                      {aluno.foto_url ? (
                        <img src={aluno.foto_url} alt={aluno.nome} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-indigo-600 font-black text-sm">
                          {aluno.nome.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-slate-800 text-sm leading-tight truncate" title={aluno.nome}>{aluno.nome}</h3>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{aluno.turma}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                    {temRelatorio ? (
                      <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border border-emerald-100">
                        <CheckCircle2 size={12} /> {qtdRelatorios} {qtdRelatorios === 1 ? 'Entregue' : 'Entregues'}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 bg-rose-50 text-rose-500 border border-rose-100 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider">
                        <AlertCircle size={12} /> Pendente
                      </span>
                    )}
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest group-hover:text-indigo-800 flex items-center gap-1">
                      Abrir <span className="text-sm">&rarr;</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* MODAL DE VISUALIZAÇÃO DO RELATÓRIO */}
      {alunoModalAberto && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={() => setAlunoModalAberto(null)}
        >
          <div 
            className="bg-slate-50 w-full max-w-3xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()} 
          >
            {/* Cabeçalho do Modal */}
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-white rounded-t-3xl shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full overflow-hidden bg-white border-2 border-slate-200 shadow-sm shrink-0">
                  {alunoModalAberto.foto_url ? (
                    <img src={alunoModalAberto.foto_url} alt={alunoModalAberto.nome} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-indigo-600 font-black text-lg">
                      {alunoModalAberto.nome.charAt(0)}
                    </div>
                  )}
                </div>
                <div>
                  <h2 className="text-lg md:text-xl font-black text-slate-800 leading-tight">{alunoModalAberto.nome}</h2>
                  <p className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                    {alunoModalAberto.turma} • {trimestreSelecionado}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setAlunoModalAberto(null)} 
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 bg-white rounded-xl border border-slate-200 shadow-sm transition-colors"
                title="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            {/* Corpo do Modal com scroll */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
              {alunoModalAberto.relatorios && alunoModalAberto.relatorios.length > 0 ? (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen size={16} className="text-slate-400" />
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                      {alunoModalAberto.relatorios.length} Parecer(es) Registrado(s)
                    </span>
                  </div>

                  {/* Renderiza todos os relatórios daquele aluno */}
                  {alunoModalAberto.relatorios.map((rel: any) => (
                    <div key={rel.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                      {/* Cabeçalho de cada professor */}
                      <div className="bg-slate-800 p-4 flex justify-between items-center">
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Professor(a)</span>
                          <h4 className="text-sm font-black text-white">{rel.professor_nome}</h4>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Data de Envio</span>
                          <p className="text-xs font-bold text-slate-300">
                            {new Date(rel.data_registro).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                          </p>
                        </div>
                      </div>
                      
                      {/* Textos */}
                      <div className="p-5 space-y-5">
                        <div className="bg-emerald-50/40 p-4 md:p-5 rounded-xl border border-emerald-100">
                          <h4 className="text-[11px] font-black text-emerald-700 uppercase tracking-widest flex items-center gap-2 mb-2">
                            <span className="text-lg">✨</span> Avanços
                          </h4>
                          <p className="text-sm font-medium text-slate-700 whitespace-pre-wrap leading-relaxed">
                            {rel.avancos || <span className="text-slate-400 italic">Nenhum avanço registrado.</span>}
                          </p>
                        </div>
                        
                        <div className="bg-rose-50/40 p-4 md:p-5 rounded-xl border border-rose-100">
                          <h4 className="text-[11px] font-black text-rose-700 uppercase tracking-widest flex items-center gap-2 mb-2">
                            <span className="text-lg">⚠️</span> Dificuldades
                          </h4>
                          <p className="text-sm font-medium text-slate-700 whitespace-pre-wrap leading-relaxed">
                            {rel.dificuldades || <span className="text-slate-400 italic">Nenhuma dificuldade registrada.</span>}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-slate-100">
                    <User size={32} className="text-slate-300" />
                  </div>
                  <h3 className="text-xl font-black text-slate-800 mb-2">Parecer Pendente</h3>
                  <p className="text-sm font-medium text-slate-500 text-center">
                    Nenhum professor preencheu e salvou<br/>o relatório deste aluno para o {trimestreSelecionado}.
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}