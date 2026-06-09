"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase"; 
import { useRouter } from "next/navigation";
import { Save, Filter, BookOpenCheck, Loader2 } from "lucide-react";

export default function AvaliacoesProfessorPage() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [nomeLogado, setNomeLogado] = useState(""); // NOVO: Guarda o nome oficial do professor
  const [ehAdmin, setEhAdmin] = useState(false);
  
  const [listaTurmas, setListaTurmas] = useState<string[]>([]);
  const [turmaSelecionada, setTurmaSelecionada] = useState("");
  
  const [disciplinas, setDisciplinas] = useState<any[]>([]);
  const [disciplinaSelecionada, setDisciplinaSelecionada] = useState("");
  const [bimestreSelecionado, setBimestreSelecionado] = useState("bimestre1");
  
  const [alunos, setAlunos] = useState<any[]>([]);
  const [notasLocais, setNotasLocais] = useState<{ [key: string]: string }>({});
  
  // Estado para persistir e comparar os valores originais das notas (Antes x Depois)
  const [notasOriginais, setNotasOriginais] = useState<{ [key: string]: string }>({});

  const colunasAvaliacao = [
    { id: "bimestre1", label: "1º Bimestre" },
    { id: "bimestre2", label: "2º Bimestre" },
    { id: "recuperacao1", label: "Recuperação 1" },
    { id: "bimestre3", label: "3º Bimestre" },
    { id: "bimestre4", label: "4º Bimestre" },
    { id: "recuperacao2", label: "Recuperação 2" },
  ];

  useEffect(() => {
    async function inicializar() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");

      const email = user.email || "";
      setUserEmail(email);

      // 1. Busca o nome oficial do professor usando o email logado
      const { data: funcData } = await supabase.from('funcionarios').select('nome').eq('email', email).single();
      const nomeDoProf = funcData?.nome || "";
      setNomeLogado(nomeDoProf);

      // 2. Verifica se o usuário é Admin
      const { data: perfil } = await supabase.from('perfis').select('cargo').eq('id', user.id).single();
      const adminVerificado = email === 'carlamonaliza9@gmail.com' || email === 'diretoria@abcdopark.com' || perfil?.cargo === 'Admin';
      setEhAdmin(adminVerificado);

      if (adminVerificado) {
        // Se for Admin, carrega os nomes de todas as turmas
        const nomesTurmas = ["Maternal", "Jardim I", "Jardim II", "1º Ano", "2º Ano", "3º Ano", "4º Ano", "5º Ano"];
        setListaTurmas(nomesTurmas);
      } else {
        // --- NOVO BLOQUEIO RBAC PARA PROFESSORES ---
        // Procura na nova matriz disciplinar em quais turmas este professor específico dá aula
        if (nomeDoProf) {
            const { data: turmasDoProf } = await supabase
              .from('turma_disciplinas')
              .select('nome_turma')
              .eq('professor_vinculado', nomeDoProf)
              .eq('ano', '2026');

            if (turmasDoProf && turmasDoProf.length > 0) {
              // Remove nomes duplicados de turmas (ex: se ele dá PT e MAT na mesma turma)
              const nomesUnicos = Array.from(new Set(turmasDoProf.map(t => t.nome_turma)));
              setListaTurmas(nomesUnicos);
              
              if (nomesUnicos.length === 1) {
                setTurmaSelecionada(nomesUnicos[0]);
              }
            }
        }
      }
      setCarregando(false);
    }
    inicializar();
  }, [router]);

  // Busca as matérias oficiais sempre que a turma mudar
  useEffect(() => {
    async function buscarMateriasDaTurma() {
      if (!turmaSelecionada) return;
      
      let query = supabase
        .from('turma_disciplinas')
        .select('disciplina, professor_vinculado')
        .eq('nome_turma', turmaSelecionada)
        .eq('ano', '2026');
      
      // Se NÃO FOR ADMIN, aplica o filtro de visão por matéria também
      if (!ehAdmin && nomeLogado) {
          query = query.eq('professor_vinculado', nomeLogado);
      }

      const { data: discData } = await query;
      
      if (discData && discData.length > 0) {
        setDisciplinas(discData);
        setDisciplinaSelecionada(discData[0].disciplina);
      } else {
        setDisciplinas([]);
        setDisciplinaSelecionada("");
      }
    }
    buscarMateriasDaTurma();
  }, [turmaSelecionada, ehAdmin, nomeLogado]);

  // Carrega alunos e notas sempre que mudar a turma, matéria ou o bimestre
  useEffect(() => {
    if (turmaSelecionada && disciplinaSelecionada) {
      carregarDadosLancamento();
    } else {
      setAlunos([]);
      setNotasLocais({});
      setNotasOriginais({});
    }
  }, [turmaSelecionada, disciplinaSelecionada, bimestreSelecionado]);

  async function carregarDadosLancamento() {
    const { data: listaAlunos } = await supabase
      .from('alunos')
      .select('id, nome, foto_url')
      .eq('turma', turmaSelecionada)
      .order('nome', { ascending: true });

    if (listaAlunos) {
      setAlunos(listaAlunos);

      const { data: notasData } = await supabase
        .from('boletins')
        .select('*')
        .eq('disciplina', disciplinaSelecionada)
        .eq('ano', '2026');

      const mapaNotas: { [key: string]: string } = {};
      listaAlunos.forEach((aluno) => {
        const notaReg = notasData?.find((n: any) => n.aluno_id === aluno.id);
        const valorNota = notaReg ? notaReg[bimestreSelecionado as keyof typeof notaReg] : "";
        mapaNotas[String(aluno.id)] = valorNota !== null ? String(valorNota) : "";
      });
      setNotasLocais(mapaNotas);
      setNotasOriginais({ ...mapaNotas });
    }
  }

  const handleNotaChange = (alunoId: string, valor: string) => {
    setNotasLocais(prev => ({ ...prev, [alunoId]: valor.replace(',', '.') }));
  };

  async function registrarLog(acao: string, detalhes: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('logs_sistema').insert([{
          usuario_email: user.email,
          acao: acao,
          tabela: 'boletins',
          detalhes: detalhes
        }]);
      }
    } catch (e) {
      console.error("Erro ao gerar log de auditoria:", e);
    }
  }

  async function salvarNotas() {
    if (!disciplinaSelecionada) return alert("Selecione uma matéria.");
    setSalvando(true);
    try {
      const mudancasOcorridas: string[] = [];
      let temAlteracaoReal = false;

      for (const alunoId of Object.keys(notasLocais)) {
        const valorNota = notasLocais[alunoId] === "" ? null : parseFloat(notasLocais[alunoId]);
        const valorAntigo = notasOriginais[alunoId] || "";
        const valorNovo = notasLocais[alunoId] || "";

        if (valorAntigo !== valorNovo) {
          temAlteracaoReal = true;
          const nomeAluno = alunos.find(a => String(a.id) === alunoId)?.nome || `ID ${alunoId}`;
          const exibicaoAntes = valorAntigo === "" ? "(Sem nota)" : valorAntigo;
          const exibicaoDepois = valorNovo === "" ? "(Excluída)" : valorNovo;
          
          mudancasOcorridas.push(`• ${nomeAluno}:\n  Antes: ${exibicaoAntes} ➔ Depois: ${exibicaoDepois}`);
        }

        const { error } = await supabase
          .from('boletins')
          .upsert({
            aluno_id: parseInt(alunoId),
            disciplina: disciplinaSelecionada,
            ano: "2026",
            [bimestreSelecionado]: valorNota
          }, { onConflict: 'aluno_id, disciplina, ano' });
          
        if (error) throw error;
      }
      
      if (temAlteracaoReal) {
        const bimestreLabel = colunasAvaliacao.find(col => col.id === bimestreSelecionado)?.label || bimestreSelecionado;
        const textoRelatorio = `📊 Alterou a pauta de notas de ${disciplinaSelecionada} da turma ${turmaSelecionada} (${bimestreLabel}):\n` + 
                              mudancasOcorridas.join('\n');
        await registrarLog("EDIÇÃO", textoRelatorio);
      }

      setNotasOriginais({ ...notasLocais });
    } catch (err: any) {
      alert("Erro ao salvar: " + err.message);
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) return (
    <div className="min-h-screen bg-[#f4f7f9] flex flex-col items-center justify-center text-blue-600 gap-3">
      <Loader2 size={32} className="animate-spin" strokeWidth={3} />
      <span className="font-bold uppercase tracking-widest text-xs">Sincronizando Pauta...</span>
    </div>
  );

  return (
    <div className="animate-in fade-in duration-700 pb-32 w-full px-4 md:px-8 py-6 relative min-h-screen bg-[#f4f7f9] overflow-x-hidden">
      
      {/* Container Full Width para Aproveitamento da Tela */}
      <div className="w-full max-w-[1600px] mx-auto space-y-6">
        
        {/* ============================================== */}
        {/* HEADER & FILTROS (Grid Responsivo) */}
        {/* ============================================== */}
        <header className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-slate-100 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="flex flex-col">
            <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tighter m-0 flex items-center gap-3">
              <span className="bg-blue-100 text-blue-600 p-2.5 rounded-2xl"><BookOpenCheck size={28} strokeWidth={2.5}/></span> 
              Avaliações
            </h1>
            <p className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mt-3">
              {ehAdmin ? "Administração Global de Pautas" : `Portal do Professor • ${nomeLogado}`}
            </p>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 w-full xl:w-auto">
            <div className="flex items-center gap-2 text-slate-400 shrink-0 hidden lg:flex">
              <Filter size={18} strokeWidth={2.5} />
            </div>

            {/* Seletor de Turma */}
            <div className="flex flex-col gap-1.5 flex-1 xl:w-48">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Minhas Turmas</label>
              {(ehAdmin || listaTurmas.length > 1) ? (
                <select 
                  value={turmaSelecionada} 
                  onChange={(e) => setTurmaSelecionada(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold outline-none focus:border-blue-400 transition-colors shadow-sm"
                >
                  <option value="">Escolha...</option>
                  {listaTurmas.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              ) : (
                <div className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 font-bold text-slate-700 shadow-sm truncate">
                  {turmaSelecionada || "Nenhuma turma vinculada"}
                </div>
              )}
            </div>

            {/* Seletor de Matéria */}
            <div className="flex flex-col gap-1.5 flex-1 xl:w-48">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Disciplina</label>
              <select 
                value={disciplinaSelecionada} 
                onChange={(e) => setDisciplinaSelecionada(e.target.value)}
                disabled={disciplinas.length === 0}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold outline-none focus:border-blue-400 transition-colors disabled:opacity-50 shadow-sm"
              >
                {disciplinas.length > 0 ? (
                  disciplinas.map(d => <option key={d.disciplina} value={d.disciplina}>{d.disciplina}</option>)
                ) : (
                  <option value="">Sem matérias</option>
                )}
              </select>
            </div>

            {/* Seletor de Bimestre */}
            <div className="flex flex-col gap-1.5 flex-1 xl:w-48">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Período Letivo</label>
              <select 
                value={bimestreSelecionado} 
                onChange={(e) => setBimestreSelecionado(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold outline-none focus:border-blue-400 transition-colors shadow-sm"
              >
                {colunasAvaliacao.map(col => <option key={col.id} value={col.id}>{col.label}</option>)}
              </select>
            </div>
          </div>
        </header>

        {/* ============================================== */}
        {/* ÁREA DE LANÇAMENTO DE NOTAS */}
        {/* ============================================== */}
        {turmaSelecionada && disciplinas.length > 0 ? (
          <div className="space-y-6">
            
            {/* GRID DESKTOP (Aproveitamento total da tela: 3 ou 4 alunos por linha) */}
            <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {alunos.map((aluno) => {
                const notaAtualStr = notasLocais[String(aluno.id)] || "";
                const isVermelha = notaAtualStr !== "" && parseFloat(notaAtualStr) < 7;
                const foiAlterada = notasLocais[String(aluno.id)] !== notasOriginais[String(aluno.id)];
                
                return (
                  <div key={aluno.id} className="bg-white p-4 rounded-[1.5rem] shadow-sm border border-slate-100 flex items-center justify-between gap-4 hover:border-blue-200 transition-colors relative overflow-hidden group">
                    {foiAlterada && <div className="absolute top-0 right-0 w-2 h-2 m-3 bg-amber-400 rounded-full animate-pulse" title="Nota não salva"></div>}
                    <div className="flex flex-col flex-1 overflow-hidden">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Aluno</span>
                      <span className="text-sm font-bold text-slate-700 truncate" title={aluno.nome}>{aluno.nome}</span>
                    </div>
                    <div className="shrink-0">
                      <input 
                        type="text"
                        inputMode="decimal"
                        value={notaAtualStr}
                        onChange={(e) => handleNotaChange(String(aluno.id), e.target.value)}
                        placeholder="--"
                        className={`w-16 h-12 text-center rounded-[1rem] border-2 font-black text-lg outline-none transition-all shadow-inner ${
                          isVermelha 
                            ? 'border-rose-200 bg-rose-50 text-rose-600 focus:border-rose-400' 
                            : 'border-slate-100 bg-slate-50 text-blue-600 focus:border-blue-400 focus:bg-white'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* LISTA MOBILE (1 aluno por linha, otimizado para o polegar) */}
            <div className="md:hidden space-y-3">
              {alunos.map((aluno) => {
                const notaAtualStr = notasLocais[String(aluno.id)] || "";
                const isVermelha = notaAtualStr !== "" && parseFloat(notaAtualStr) < 7;
                
                return (
                  <div key={aluno.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                        {aluno.foto_url ? <img src={aluno.foto_url} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center font-black text-slate-400">{aluno.nome.charAt(0)}</div>}
                      </div>
                      <span className="text-sm font-bold text-slate-700 leading-tight truncate">{aluno.nome}</span>
                    </div>
                    
                    <div className="shrink-0">
                      <input 
                        type="text"
                        inputMode="decimal"
                        value={notaAtualStr}
                        onChange={(e) => handleNotaChange(String(aluno.id), e.target.value)}
                        placeholder="--"
                        className={`w-14 h-12 text-center rounded-xl border-2 font-black text-base outline-none transition-all shadow-inner ${
                          isVermelha 
                            ? 'border-rose-200 bg-rose-50 text-rose-600 focus:border-rose-400' 
                            : 'border-slate-100 bg-slate-50 text-blue-600 focus:border-blue-400 focus:bg-white'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* BOTÃO SALVAR GLOBAL */}
            <div className="mt-8 flex justify-end sticky bottom-24 md:bottom-8 z-40">
              <button 
                onClick={salvarNotas}
                disabled={salvando}
                className={`w-full md:w-auto px-10 py-5 rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-3 ${
                  salvando 
                    ? 'bg-blue-300 text-blue-50 cursor-not-allowed shadow-none' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20 active:scale-95 hover:-translate-y-1'
                }`}
              >
                {salvando ? <Loader2 size={24} className="animate-spin" /> : <Save size={24} strokeWidth={2.5} />}
                {salvando ? "Salvando..." : "Salvar Pauta"}
              </button>
            </div>
            
          </div>
        ) : (
          <div className="bg-white rounded-[2.5rem] p-10 text-center border border-slate-50 shadow-sm mt-8">
            <p className="text-xs font-black uppercase text-slate-400 tracking-widest">
              {!turmaSelecionada 
                ? "Aguardando seleção..." 
                : "Seu perfil não possui disciplinas vinculadas a esta turma."}
            </p>
          </div>
        )}

      </div>
    </div>
  );
}