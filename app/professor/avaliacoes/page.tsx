"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function AvaliacoesProfessorPage() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [userEmail, setUserEmail] = useState("");
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

      // 1. Verifica se o usuário é Admin
      const { data: perfil } = await supabase.from('perfis').select('cargo').eq('id', user.id).single();
      const adminVerificado = email === 'carlamonaliza9@gmail.com' || email === 'diretoria@abcdopark.com' || perfil?.cargo === 'Admin';
      setEhAdmin(adminVerificado);

      if (adminVerificado) {
        // Se for Admin, carrega os nomes das turmas fixas para o seletor
        const nomesTurmas = ["Maternal", "Jardim I", "Jardim II", "1º Ano", "2º Ano", "3º Ano", "4º Ano", "5º Ano"];
        setListaTurmas(nomesTurmas);
      } else {
        // 2. Lógica para Professores (Fixos e Especialistas)
        // Busca todas as turmas onde o e-mail aparece em qualquer um dos campos de professor
        const { data: turmasData } = await supabase
          .from('turmas_info')
          .select('nome_turma')
          .or(`email_prof_fixo_1.eq.${email},email_prof_fixo_2.eq.${email},email_prof_especifico_1.eq.${email},email_prof_especifico_2.eq.${email}`);

        if (turmasData && turmasData.length > 0) {
          const nomesEncontrados = turmasData.map(t => t.nome_turma);
          setListaTurmas(nomesEncontrados);
          
          // Se o professor só tiver uma turma, já seleciona automaticamente
          if (nomesEncontrados.length === 1) {
            setTurmaSelecionada(nomesEncontrados[0]);
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
      
      const { data: discData } = await supabase
        .from('turma_disciplinas')
        .select('disciplina')
        .eq('nome_turma', turmaSelecionada)
        .eq('ano', '2026');
      
      if (discData && discData.length > 0) {
        setDisciplinas(discData);
        setDisciplinaSelecionada(discData[0].disciplina);
      } else {
        setDisciplinas([]);
        setDisciplinaSelecionada("");
      }
    }
    buscarMateriasDaTurma();
  }, [turmaSelecionada]);

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
      setNotasOriginais({ ...mapaNotas }); // Salva cópia imutável para a checagem posterior
    }
  }

  const handleNotaChange = (alunoId: string, valor: string) => {
    setNotasLocais(prev => ({ ...prev, [alunoId]: valor.replace(',', '.') }));
  };

  // --- FUNÇÃO AUXILIAR DE AUDITORIA (LOGS) ---
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

        // Se o valor digitado mudou em relação ao banco, estruturamos a linha
        if (valorAntigo !== valorNovo) {
          temAlteracaoReal = true;
          const nomeAluno = alunos.find(a => String(a.id) === alunoId)?.nome || `ID ${alunoId}`;
          const exibicaoAntes = valorAntigo === "" ? "(Sem nota)" : valorAntigo;
          const exibicaoDepois = valorNovo === "" ? "(Nota excluída)" : valorNovo;
          
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
      
      // Só dispara o gatilho de gravação de log caso alguma nota tenha de fato mudado
      if (temAlteracaoReal) {
        const bimestreLabel = colunasAvaliacao.find(col => col.id === bimestreSelecionado)?.label || bimestreSelecionado;
        const textoRelatorio = `📊 Alterou/Lançou a pauta de notas de ${disciplinaSelecionada} da turma ${turmaSelecionada} (${bimestreLabel}):\n` + 
                              mudancasOcorridas.join('\n');

        await registrarLog("EDIÇÃO", textoRelatorio);
      }

      alert(`Notas de ${disciplinaSelecionada} salvas com sucesso!`);
      setNotasOriginais({ ...notasLocais }); // Sincroniza o estado original com os novos dados salvos
    } catch (err: any) {
      alert("Erro ao salvar: " + err.message);
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) return <div className="p-10 text-center text-xl sm:text-2xl md:text-[10px] font-black uppercase text-slate-300 animate-pulse tracking-widest">Sincronizando pauta...</div>;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10 w-full px-4 md:max-w-4xl md:mx-auto md:p-8 font-sans">
      <header className="mb-10">
        <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter italic">Lançamento de Notas</h1>
        <div className="h-1 w-20 bg-indigo-600 mt-2 rounded-full mb-2"></div>
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
          {ehAdmin ? "Painel Administrativo" : `Professor(a): ${userEmail}`}
        </p>
        
        {/* Painel de Filtros (Responsivo) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-50">
          
          {/* Seletor de Turma */}
          {(ehAdmin || listaTurmas.length > 1) ? (
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selecione a Turma</label>
              <select 
                value={turmaSelecionada} 
                onChange={(e) => setTurmaSelecionada(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-100 bg-slate-50 text-slate-700 font-bold outline-none focus:border-indigo-300 transition-colors"
              >
                <option value="">Escolha uma turma...</option>
                {listaTurmas.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Turma Vinculada</label>
              <div className="w-full px-4 py-3 rounded-2xl bg-indigo-50 border border-indigo-100 font-black text-indigo-700">
                {turmaSelecionada || "Nenhuma turma"}
              </div>
            </div>
          )}

          {/* Seletor de Matéria */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Matéria</label>
            <select 
              value={disciplinaSelecionada} 
              onChange={(e) => setDisciplinaSelecionada(e.target.value)}
              disabled={disciplinas.length === 0}
              className="w-full px-4 py-3 rounded-2xl border border-slate-100 bg-slate-50 text-slate-700 font-bold outline-none focus:border-indigo-300 transition-colors disabled:opacity-50"
            >
              {disciplinas.length > 0 ? (
                disciplinas.map(d => <option key={d.disciplina} value={d.disciplina}>{d.disciplina}</option>)
              ) : (
                <option value="">Sem matérias</option>
              )}
            </select>
          </div>

          {/* Seletor de Bimestre */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bimestre</label>
            <select 
              value={bimestreSelecionado} 
              onChange={(e) => setBimestreSelecionado(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-slate-100 bg-slate-50 text-slate-700 font-bold outline-none focus:border-indigo-300 transition-colors"
            >
              {colunasAvaliacao.map(col => <option key={col.id} value={col.id}>{col.label}</option>)}
            </select>
          </div>
        </div>
      </header>

      {turmaSelecionada && disciplinas.length > 0 ? (
        <>
          {/* ======================= */}
          {/* VISUALIZAÇÃO DESKTOP    */}
          {/* Mantém a tabela clássica */}
          {/* ======================= */}
          <div className="hidden md:block bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-50">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="pb-4 text-xs font-black text-slate-400 uppercase tracking-widest">Aluno</th>
                  <th className="pb-4 text-xs font-black text-slate-400 uppercase tracking-widest text-center w-32">Nota</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {alunos.map((aluno) => {
                  const notaAtualStr = notasLocais[String(aluno.id)] || "";
                  const isVermelha = notaAtualStr !== "" && parseFloat(notaAtualStr) < 7;
                  
                  return (
                    <tr key={aluno.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 font-bold text-slate-700">{aluno.nome}</td>
                      <td className="py-4 text-center">
                        <input 
                          type="text"
                          value={notaAtualStr}
                          onChange={(e) => handleNotaChange(String(aluno.id), e.target.value)}
                          placeholder="0.0"
                          className={`w-20 p-2 text-center rounded-xl border-2 font-black outline-none transition-colors ${
                            isVermelha 
                              ? 'border-rose-200 bg-rose-50 text-rose-600 focus:border-rose-400' 
                              : 'border-slate-100 bg-slate-50 text-indigo-600 focus:border-indigo-400 focus:bg-white'
                          }`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ======================= */}
          {/* VISUALIZAÇÃO MOBILE     */}
          {/* Estilo App/Portal Pais  */}
          {/* ======================= */}
          <div className="md:hidden space-y-4">
            {alunos.map((aluno) => {
              const notaAtualStr = notasLocais[String(aluno.id)] || "";
              const isVermelha = notaAtualStr !== "" && parseFloat(notaAtualStr) < 7;
              
              return (
                <div key={aluno.id} className="bg-white rounded-[2rem] p-5 shadow-sm border border-slate-50 flex items-center justify-between gap-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Aluno</span>
                    <span className="text-sm font-bold text-slate-700 leading-tight">{aluno.nome}</span>
                  </div>
                  
                  <div className="flex-shrink-0">
                    <input 
                      type="text"
                      inputMode="decimal"
                      value={notaAtualStr}
                      onChange={(e) => handleNotaChange(String(aluno.id), e.target.value)}
                      placeholder="--"
                      className={`w-16 h-12 text-center rounded-[1rem] border-2 font-black text-lg outline-none transition-all shadow-inner ${
                        isVermelha 
                          ? 'border-rose-200 bg-rose-50 text-rose-600 focus:border-rose-400 focus:bg-white' 
                          : 'border-slate-100 bg-slate-50 text-indigo-600 focus:border-indigo-400 focus:bg-white'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* BOTÃO SALVAR (Responsivo) */}
          <div className="mt-8 flex justify-end">
            <button 
              onClick={salvarNotas}
              disabled={salvando}
              className={`w-full md:w-auto px-8 py-5 rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 ${
                salvando 
                  ? 'bg-indigo-300 text-indigo-50 cursor-not-allowed shadow-none' 
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
              }`}
            >
              {salvando ? "Sincronizando..." : "Salvar Pauta"}
            </button>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-[2.5rem] p-10 text-center border border-slate-50 shadow-sm mt-8">
          <p className="text-lg md:text-[10px] font-black uppercase text-slate-300 tracking-widest">
            {!turmaSelecionada 
              ? "Selecione a turma para visualizar a pauta." 
              : "Sem matérias cadastradas para esta turma."}
          </p>
        </div>
      )}
    </div>
  );
}