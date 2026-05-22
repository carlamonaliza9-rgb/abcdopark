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

  if (carregando) return <div className="p-10 text-center font-medium text-slate-500">Carregando sistema de notas...</div>;

  return (
    <div className="w-full min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* CABEÇALHO RESPONSIVO */}
        <header className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-6">
          <div>
            <h1 className="text-2xl font-bold text-blue-900">Lançamento de Notas</h1>
            <p className="text-sm text-slate-500 mt-1">
              {ehAdmin ? "Painel Administrativo" : `Professor(a): ${userEmail}`}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
            
            {/* Seletor de Turma */}
            {(ehAdmin || listaTurmas.length > 1) ? (
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Selecione a Turma</label>
                <select 
                  value={turmaSelecionada} 
                  onChange={(e) => setTurmaSelecionada(e.target.value)}
                  className="w-full p-3 bg-white rounded-xl border border-slate-200 text-sm font-bold text-slate-700 outline-none"
                >
                  <option value="">Escolha uma turma...</option>
                  {listaTurmas.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Sua Turma</label>
                <div className="w-full p-3 bg-white rounded-xl border border-slate-200 text-sm font-bold text-blue-900 flex items-center h-[46px]">
                  {turmaSelecionada || "Nenhuma turma vinculada"}
                </div>
              </div>
            )}

            {/* Seletor de Matéria */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Matéria</label>
              <select 
                value={disciplinaSelecionada} 
                onChange={(e) => setDisciplinaSelecionada(e.target.value)}
                disabled={disciplinas.length === 0}
                className="w-full p-3 bg-white rounded-xl border border-slate-200 text-sm font-bold text-slate-700 outline-none disabled:bg-slate-100"
              >
                {disciplinas.length > 0 ? (
                  disciplinas.map(d => <option key={d.disciplina} value={d.disciplina}>{d.disciplina}</option>)
                ) : (
                  <option value="">Sem matérias cadastradas</option>
                )}
              </select>
            </div>

            {/* Seletor de Bimestre */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Período de Avaliação</label>
              <select 
                value={bimestreSelecionado} 
                onChange={(e) => setBimestreSelecionado(e.target.value)}
                className="w-full p-3 bg-white rounded-xl border border-slate-200 text-sm font-bold text-slate-700 outline-none"
              >
                {colunasAvaliacao.map(col => <option key={col.id} value={col.id}>{col.label}</option>)}
              </select>
            </div>
          </div>
        </header>

        {turmaSelecionada && disciplinas.length > 0 ? (
          <>
            {/* RENDERIZAÇÃO RESPONSIVA: Cards no Mobile, Tabela no Desktop */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-4 md:p-0">
              
              {/* VISÃO DESKTOP (TABELA) - Oculta em celulares */}
              <div className="hidden md:block w-full overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Aluno</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center w-32">Nota</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {alunos.map((aluno) => {
                      const notaAtualStr = notasLocais[String(aluno.id)] || "";
                      const notaNum = parseFloat(notaAtualStr);
                      const isVermelha = !isNaN(notaNum) && notaNum < 7;
                      
                      return (
                        <tr key={aluno.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 text-sm font-bold text-slate-800 flex items-center gap-3">
                            {/* Opcional: Avatar do Aluno */}
                            {aluno.foto_url ? (
                              <img src={aluno.foto_url} alt="" className="w-8 h-8 rounded-full object-cover bg-slate-200" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-bold">
                                {aluno.nome.charAt(0)}
                              </div>
                            )}
                            {aluno.nome}
                          </td>
                          <td className="p-4 text-center">
                            <input 
                              type="text"
                              value={notaAtualStr}
                              onChange={(e) => handleNotaChange(String(aluno.id), e.target.value)}
                              placeholder="0.0"
                              className={`w-20 p-2 text-center rounded-lg border-2 font-black text-sm outline-none transition-colors ${
                                isVermelha 
                                  ? 'border-red-200 bg-red-50 text-red-600 focus:border-red-400' 
                                  : 'border-slate-200 bg-white text-blue-600 focus:border-blue-400'
                              }`}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* VISÃO MOBILE (CARDS) - Oculta no Desktop */}
              <div className="md:hidden flex flex-col gap-3">
                <div className="flex justify-between items-center mb-2 px-1">
                  <span className="text-xs font-bold text-slate-500 uppercase">Lista de Alunos</span>
                  <span className="text-xs font-bold text-slate-500 uppercase text-center w-[70px]">Nota</span>
                </div>
                {alunos.map((aluno) => {
                  const notaAtualStr = notasLocais[String(aluno.id)] || "";
                  const notaNum = parseFloat(notaAtualStr);
                  const isVermelha = !isNaN(notaNum) && notaNum < 7;
                  
                  return (
                    <div key={aluno.id} className="flex justify-between items-center p-4 bg-white rounded-xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                      <div className="flex items-center gap-3 pr-2">
                        {aluno.foto_url ? (
                          <img src={aluno.foto_url} alt="" className="w-10 h-10 rounded-full object-cover bg-slate-200 border-2 border-white shadow-sm" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 font-bold">
                            {aluno.nome.charAt(0)}
                          </div>
                        )}
                        <span className="text-sm font-bold text-slate-800 leading-tight">{aluno.nome}</span>
                      </div>
                      
                      <input 
                        type="text"
                        inputMode="decimal"
                        value={notaAtualStr}
                        onChange={(e) => handleNotaChange(String(aluno.id), e.target.value)}
                        placeholder="--"
                        className={`w-[70px] h-[46px] p-2 text-center rounded-xl border-2 font-black text-lg outline-none transition-colors shrink-0 shadow-inner ${
                          isVermelha 
                            ? 'border-red-200 bg-red-50 text-red-600 focus:border-red-400 focus:bg-white' 
                            : 'border-slate-200 bg-slate-50 text-blue-600 focus:border-blue-400 focus:bg-white'
                        }`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* BOTÃO SALVAR FIXO/FLUTUANTE NO MOBILE OU NORMAL NO DESKTOP */}
            <div className="mt-6 flex justify-end pb-8">
              <button 
                onClick={salvarNotas}
                disabled={salvando}
                className={`w-full md:w-auto px-8 py-4 rounded-xl font-bold text-white shadow-md transition-all active:scale-95 ${
                  salvando ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {salvando ? "Gravando Pauta..." : "Gravar e Salvar Notas"}
              </button>
            </div>
          </>
        ) : (
          <div className="bg-white p-10 rounded-2xl border border-slate-100 shadow-sm text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center text-3xl mb-4">📋</div>
            <h3 className="text-lg font-bold text-slate-700">Aguardando Lançamento</h3>
            <p className="text-sm text-slate-500 mt-2 max-w-sm">
              {!turmaSelecionada 
                ? "Por favor, selecione uma turma e uma matéria no painel acima para abrir a pauta de alunos." 
                : "Esta turma ainda não possui matérias cadastradas na Grade Anual."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}