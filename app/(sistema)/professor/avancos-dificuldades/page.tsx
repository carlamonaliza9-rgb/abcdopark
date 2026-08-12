"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase"; 
import { useRouter } from "next/navigation";
import { Save, BrainCircuit, Loader2, CheckCircle2, AlertCircle, Lock } from "lucide-react";


const ORDEM_TURMAS = [
  "Maternal",
  "Jardim I",
  "Jardim II",
  "1º Ano",
  "2º Ano",
  "3º Ano",
  "4º Ano",
  "5º Ano"
];

const ordenarTurmas = (turmas: string[]) => {
  return [...turmas].sort((a, b) => {
    const indiceA = ORDEM_TURMAS.indexOf(a);
    const indiceB = ORDEM_TURMAS.indexOf(b);

    // Turmas conhecidas seguem a ordem escolar definida acima.
    // Nomes não previstos ficam depois das turmas conhecidas,
    // mantendo uma ordem alfabética estável entre si.
    if (indiceA === -1 && indiceB === -1) {
      return a.localeCompare(b, "pt-BR");
    }
    if (indiceA === -1) return 1;
    if (indiceB === -1) return -1;
    return indiceA - indiceB;
  });
};

export default function AvancosDificuldadesPage() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [salvandoId, setSalvandoId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [nomeLogado, setNomeLogado] = useState(""); 
  const [ehAdmin, setEhAdmin] = useState(false);
  
  const [listaTurmas, setListaTurmas] = useState<string[]>([]);
  const [turmaSelecionada, setTurmaSelecionada] = useState("");
  const [trimestreSelecionado, setTrimestreSelecionado] = useState("1º Trimestre");
  
  const [alunos, setAlunos] = useState<any[]>([]);
  
  // Estrutura local dos textos por aluno.
  const [textosLocais, setTextosLocais] = useState<{ [alunoId: string]: { avancos: string; dificuldades: string } }>({});
  const [textosOriginais, setTextosOriginais] = useState<{ [alunoId: string]: { avancos: string; dificuldades: string } }>({});

  // Quando existe um registro para o aluno no trimestre selecionado, o parecer está fechado.
  const [registrosExistentes, setRegistrosExistentes] = useState<{
    [alunoId: string]: {
      id: string | number;
      data_registro: string | null;
      professor_nome: string | null;
    }
  }>({});

  useEffect(() => {
    async function inicializar() {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) return router.push("/login");

        const email = user.email || "";
        setUserEmail(email);

        // 1. Busca perfil (Garante que vai pegar o cargo e possivelmente o nome)
        const { data: perfil } = await supabase
          .from('perfis')
          .select('cargo, nome')
          .eq('id', user.id)
          .single();

        // 2. Busca funcionário (Fallback/Primário para o nome)
        const { data: funcData } = await supabase
          .from('funcionarios')
          .select('nome')
          .eq('email', email)
          .single();

        // Resolução meticulosa do nome (remove espaços nas bordas)
        const nomeDoProf = (funcData?.nome || perfil?.nome || "").trim();
        setNomeLogado(nomeDoProf || "Professor");

        // 3. Validação robusta de cargo administrativo
        const cargoStr = perfil?.cargo?.toUpperCase() || "";
        const adminVerificado = 
          email === 'carlamonaliza9@gmail.com' || 
          email === 'diretoria@abcdopark.com' || 
          cargoStr === 'ADMIN' || 
          cargoStr === 'ADMINISTRADOR';
          
        setEhAdmin(adminVerificado);

        if (adminVerificado) {
          const nomesTurmas = [
            "Maternal",
            "Jardim I",
            "Jardim II",
            "1º Ano",
            "2º Ano",
            "3º Ano",
            "4º Ano",
            "5º Ano"
          ];

          const turmasOrdenadas = ordenarTurmas(nomesTurmas);
          setListaTurmas(turmasOrdenadas);

          if (turmasOrdenadas.length > 0) {
            setTurmaSelecionada(turmasOrdenadas[0]);
          }
        } else {
          /*
           * MESMA REGRA OFICIAL DA PÁGINA /professor/turmas
           *
           * 1) Professor vinculado em turma_disciplinas para o ano letivo 2026.
           * 2) Professor cadastrado como auxiliar em turmas_info.
           *
           * NÃO usamos:
           * - ilike/parcial no nome do professor;
           * - email_prof_fixo_1;
           * - email_prof_fixo_2;
           * - outros campos de e-mail.
           *
           * Isso impede que uma turma antiga continue aparecendo
           * somente porque o e-mail ainda está registrado nela.
           */
          const turmasNomes = new Set<string>();

          // 1. Vínculos por disciplina — exatamente como na página /professor/turmas.
          if (nomeDoProf) {
            const { data: turmasProf, error: erroTurmasProf } = await supabase
              .from('turma_disciplinas')
              .select('nome_turma')
              .eq('professor_vinculado', nomeDoProf)
              .eq('ano', '2026');

            if (erroTurmasProf) {
              console.error("Erro ao buscar turmas em turma_disciplinas:", erroTurmasProf);
            }

            (turmasProf || []).forEach(turma => {
              if (turma.nome_turma) {
                turmasNomes.add(turma.nome_turma.trim());
              }
            });
          }

          // 2. Vínculo como auxiliar — exatamente como na página /professor/turmas.
          const { data: resInfos, error: erroTurmasInfo } = await supabase
            .from('turmas_info')
            .select('nome_turma, auxiliar');

          if (erroTurmasInfo) {
            console.error("Erro ao buscar turmas_info:", erroTurmasInfo);
          }

          (resInfos || []).forEach(turma => {
            const auxiliar = typeof turma.auxiliar === "string"
              ? turma.auxiliar.trim()
              : "";

            if (
              nomeDoProf &&
              auxiliar === nomeDoProf &&
              turma.nome_turma
            ) {
              turmasNomes.add(turma.nome_turma.trim());
            }
          });

          const nomesUnicos = ordenarTurmas(Array.from(turmasNomes));

          setListaTurmas(nomesUnicos);

          if (nomesUnicos.length > 0) {
            setTurmaSelecionada(nomesUnicos[0]);
          } else {
            setTurmaSelecionada("");
            console.warn(
              `Nenhuma turma encontrada para o professor "${nomeDoProf}" no ano letivo 2026.`
            );
          }
        }

      } catch (err) {
        console.error("Erro fatal na inicialização:", err);
      } finally {
        setCarregando(false);
      }
    }
    inicializar();
  }, [router]);

  // Carrega alunos da turma e o parecer trimestral existente.
  useEffect(() => {
    async function carregarDadosTrimestre() {
      if (!turmaSelecionada) {
        setAlunos([]);
        setTextosLocais({});
        setTextosOriginais({});
        setRegistrosExistentes({});
        return;
      }

      setCarregando(true);

      try {
        const { data: listaAlunos, error: alunosError } = await supabase
          .from('alunos')
          .select('id, nome, foto_url')
          .eq('turma', turmaSelecionada)
          .order('nome', { ascending: true });

        if (alunosError) throw alunosError;

        const alunosCarregados = listaAlunos || [];
        setAlunos(alunosCarregados);

        if (alunosCarregados.length === 0) {
          setTextosLocais({});
          setTextosOriginais({});
          setRegistrosExistentes({});
          return;
        }

        const idsAlunos = alunosCarregados.map(a => a.id);
        const { data: pareceresBD, error: parecerError } = await supabase
          .from('avancos_dificuldades')
          .select('id, aluno_id, avancos, dificuldades, data_registro, professor_nome')
          .in('aluno_id', idsAlunos)
          .eq('trimestre', trimestreSelecionado)
          .eq('ano', '2026');

        if (parecerError) throw parecerError;

        const mapaTextos: { [alunoId: string]: { avancos: string; dificuldades: string } } = {};
        const mapaRegistros: {
          [alunoId: string]: { id: string | number; data_registro: string | null; professor_nome: string | null }
        } = {};

        alunosCarregados.forEach(aluno => {
          const registro = (pareceresBD || []).find(
            p => String(p.aluno_id) === String(aluno.id)
          );

          mapaTextos[String(aluno.id)] = {
            avancos: registro?.avancos || "",
            dificuldades: registro?.dificuldades || ""
          };

          if (registro) {
            mapaRegistros[String(aluno.id)] = {
              id: registro.id,
              data_registro: registro.data_registro || null,
              professor_nome: registro.professor_nome || null
            };
          }
        });

        setTextosLocais(mapaTextos);
        setTextosOriginais(JSON.parse(JSON.stringify(mapaTextos)));
        setRegistrosExistentes(mapaRegistros);
      } catch (err) {
        console.error("Erro ao carregar parecer trimestral:", err);
        alert("Erro ao carregar os pareceres deste trimestre.");
      } finally {
        setCarregando(false);
      }
    }

    carregarDadosTrimestre();
  }, [turmaSelecionada, trimestreSelecionado]);

  const handleTextoChange = (alunoId: string, campo: "avancos" | "dificuldades", valor: string) => {
    setTextosLocais(prev => ({
      ...prev,
      [alunoId]: {
        ...prev[alunoId],
        [campo]: valor
      }
    }));
  };

  async function salvarFichaIndividual(alunoId: string) {
    const dadosFicha = textosLocais[alunoId];
    if (!dadosFicha) return;

    // Regra principal: um único registro por aluno/trimestre/ano.
    if (registrosExistentes[alunoId]) {
      alert(
        `O parecer do ${trimestreSelecionado} deste aluno já foi registrado e está bloqueado para novas alterações.`
      );
      return;
    }

    if (!dadosFicha.avancos.trim() && !dadosFicha.dificuldades.trim()) {
      alert("Preencha pelo menos um dos campos antes de salvar o parecer.");
      return;
    }

    setSalvandoId(alunoId);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id || null;

      // INSERT proposital: o banco, através do índice UNIQUE, impede uma segunda gravação.
      const { data: novoRegistro, error } = await supabase
        .from('avancos_dificuldades')
        .insert({
          aluno_id: parseInt(alunoId),
          trimestre: trimestreSelecionado,
          ano: "2026",
          avancos: dadosFicha.avancos,
          dificuldades: dadosFicha.dificuldades,
          professor_id: userId,
          professor_nome: nomeLogado || "Professor",
          data_registro: new Date().toISOString()
        })
        .select('id, data_registro, professor_nome')
        .single();

      if (error) throw error;

      setTextosOriginais(prev => ({
        ...prev,
        [alunoId]: { ...dadosFicha }
      }));

      setRegistrosExistentes(prev => ({
        ...prev,
        [alunoId]: {
          id: novoRegistro.id,
          data_registro: novoRegistro.data_registro || null,
          professor_nome: novoRegistro.professor_nome || nomeLogado || "Professor"
        }
      }));

      const nomeAluno = alunos.find(a => String(a.id) === String(alunoId))?.nome || alunoId;
      await supabase.from('logs_sistema').insert([{
        usuario_email: userEmail,
        acao: "GRAVAÇÃO PARECER TRIMESTRAL",
        tabela: "avancos_dificuldades",
        detalhes: `Registrou parecer do ${trimestreSelecionado}/2026 do aluno(a) ${nomeAluno} na turma ${turmaSelecionada}. Data do registro: ${
          novoRegistro.data_registro
            ? new Date(novoRegistro.data_registro).toLocaleString('pt-BR')
            : 'não informada'
        }.`
      }]);
    } catch (err: any) {
      console.error("Erro ao salvar parecer:", err);

      if (err?.code === "23505") {
        alert("Este parecer já foi registrado para este aluno neste trimestre. O sistema bloqueou uma segunda gravação.");
        await carregarDadosTrimestreParaAluno(alunoId);
      } else {
        alert("Erro ao salvar dados: " + (err?.message || "erro desconhecido"));
      }
    } finally {
      setSalvandoId(null);
    }
  }

  async function carregarDadosTrimestreParaAluno(alunoId: string) {
    const { data, error } = await supabase
      .from('avancos_dificuldades')
      .select('id, avancos, dificuldades, data_registro, professor_nome')
      .eq('aluno_id', Number(alunoId))
      .eq('trimestre', trimestreSelecionado)
      .eq('ano', '2026')
      .maybeSingle();

    if (error || !data) return;

    setTextosLocais(prev => ({
      ...prev,
      [alunoId]: {
        avancos: data.avancos || "",
        dificuldades: data.dificuldades || ""
      }
    }));

    setTextosOriginais(prev => ({
      ...prev,
      [alunoId]: {
        avancos: data.avancos || "",
        dificuldades: data.dificuldades || ""
      }
    }));

    setRegistrosExistentes(prev => ({
      ...prev,
      [alunoId]: {
        id: data.id,
        data_registro: data.data_registro || null,
        professor_nome: data.professor_nome || null
      }
    }));
  }

  const formatarDataRegistro = (data: string | null) => {
    if (!data) return "Data não registrada";
    const dataObj = new Date(data);
    if (Number.isNaN(dataObj.getTime())) return "Data inválida";
    return dataObj.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div className="animate-in fade-in duration-500 w-full min-h-screen pb-10 bg-white md:bg-[#d8e8f2]">
      <div className="w-full max-w-[1500px] mx-auto flex flex-col md:gap-6 md:p-8">
        
        {/* ============================================== */}
        {/* CABEÇALHO FILTROS (Mobile Native / Desktop Card) */}
        {/* ============================================== */}
        <header className="bg-white md:rounded-[2rem] px-4 pt-6 pb-4 md:p-8 md:shadow-sm border-b md:border md:border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4 md:gap-6">
          <div className="flex flex-col">
            <h1 className="text-2xl md:text-4xl font-black text-slate-800 tracking-tighter m-0 flex items-center gap-2 md:gap-3">
              <span className="bg-indigo-100 text-indigo-600 p-2 md:p-2.5 rounded-xl md:rounded-2xl shrink-0">
                <BrainCircuit className="w-6 h-6 md:w-7 md:h-7" strokeWidth={2.5}/>
              </span> 
              Avanços e Dificuldades
            </h1>
            <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mt-1.5 md:mt-2">
              {ehAdmin ? "Acompanhamento Pedagógico Global" : `Registro de Pareceres Trimestrais • Prof. ${nomeLogado}`}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 md:bg-slate-50 md:p-3 md:rounded-2xl border-none md:border md:border-slate-100 w-full lg:w-auto">
            <div className="flex flex-col gap-1.5 flex-1 sm:w-56">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Selecione a Turma</label>
              <select 
                value={turmaSelecionada} 
                onChange={(e) => setTurmaSelecionada(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 md:bg-white text-slate-700 font-bold outline-none focus:ring-2 focus:ring-indigo-100 md:focus:border-indigo-400 transition-colors shadow-sm md:shadow-sm"
              >
                <option value="">Escolha a turma...</option>
                {listaTurmas.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1.5 flex-1 sm:w-48">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Trimestre</label>
              <select 
                value={trimestreSelecionado} 
                onChange={(e) => setTrimestreSelecionado(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 md:bg-white text-slate-700 font-bold outline-none focus:ring-2 focus:ring-indigo-100 md:focus:border-indigo-400 transition-colors shadow-sm md:shadow-sm"
              >
                <option value="1º Trimestre">1º Trimestre</option>
                <option value="2º Trimestre">2º Trimestre</option>
                <option value="3º Trimestre">3º Trimestre</option>
                <option value="4º Trimestre">4º Trimestre</option>
              </select>
            </div>
          </div>
        </header>

        {/* ============================================== */}
        {/* CONTEÚDO / CARDS DOS ALUNOS */}
        {/* ============================================== */}
        {turmaSelecionada && alunos.length > 0 ? (
          <div className="flex flex-col md:grid md:grid-cols-1 xl:grid-cols-2 gap-0 md:gap-6 relative">
            
            {alunos.map(aluno => {
              const local = textosLocais[String(aluno.id)] || { avancos: "", dificuldades: "" };
              const original = textosOriginais[String(aluno.id)] || { avancos: "", dificuldades: "" };
              const registro = registrosExistentes[String(aluno.id)];
              
              const foiAlterado = local.avancos !== original.avancos || local.dificuldades !== original.dificuldades;
              const estaPreenchido = local.avancos.trim().length > 3 || local.dificuldades.trim().length > 3;
              const isSaving = salvandoId === String(aluno.id);
              const estaBloqueado = Boolean(registro);

              return (
                <div key={aluno.id} className="bg-white md:rounded-[2rem] border-b-[8px] md:border border-slate-50 md:border-slate-100 md:shadow-sm p-4 md:p-6 flex flex-col justify-between md:hover:shadow-md transition-all gap-4 md:gap-5 relative overflow-hidden group">
                  
                  {/* Status superior de preenchimento */}
                  <div className="absolute top-0 right-0 m-4 md:m-5 flex flex-col items-end gap-1.5">
                    {estaBloqueado ? (
                      <>
                        <span className="text-[9px] font-black uppercase bg-slate-800 text-white px-2.5 py-1 rounded-md flex items-center gap-1">
                          <Lock size={10} strokeWidth={3}/> Parecer registrado
                        </span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wide">
                          {formatarDataRegistro(registro?.data_registro || null)}
                        </span>
                      </>
                    ) : foiAlterado ? (
                      <span className="text-[9px] font-black uppercase bg-amber-100 text-amber-700 px-2.5 py-1 rounded-md animate-pulse">Não Salvo</span>
                    ) : estaPreenchido ? (
                      <span className="text-[9px] font-black uppercase bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-md flex items-center gap-1">
                        <CheckCircle2 size={10} strokeWidth={3}/> <span className="hidden sm:inline">Pronto para salvar</span>
                      </span>
                    ) : (
                      <span className="text-[9px] font-black uppercase bg-rose-50 text-rose-500 px-2.5 py-1 rounded-md flex items-center gap-1 border border-rose-100">
                        <AlertCircle size={10} strokeWidth={3}/> <span className="hidden sm:inline">Pendente</span>
                      </span>
                    )}
                  </div>

                  {/* Informações Básicas do Aluno */}
                  <div className="flex items-center gap-3 md:gap-4 border-b border-slate-50 pb-3 md:pb-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-slate-100 border-2 border-white shadow-sm md:shadow-md overflow-hidden shrink-0">
                      {aluno.foto_url ? (
                        <img src={aluno.foto_url} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-black text-slate-400 text-sm bg-gradient-to-tr from-slate-100 to-slate-50">
                          {aluno.nome.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col pr-20 md:pr-16">
                      <span className="text-sm md:text-base font-black text-slate-800 leading-tight line-clamp-1" title={aluno.nome}>
                        {aluno.nome}
                      </span>
                      <span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Ficha do Estudante</span>
                    </div>
                  </div>

                  {/* Inputs de Texto Amplo (Avanços e Dificuldades) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                    
                    {/* Bloco de Avanços */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest px-1 flex items-center gap-1">
                        <span>✨</span> Avanços Observados
                      </label>
                      <textarea
                        value={local.avancos}
                        onChange={(e) => handleTextoChange(String(aluno.id), "avancos", e.target.value)}
                        readOnly={estaBloqueado}
                        placeholder="Quais foram as conquistas pedagógicas, evolução na leitura, escrita, raciocínio ou socialização neste semestre?"
                        rows={5}
                        className={`w-full p-3.5 text-xs font-semibold text-slate-600 placeholder-slate-300 md:placeholder-slate-400 rounded-xl border border-slate-200 outline-none transition-all resize-none leading-relaxed ${estaBloqueado ? 'bg-slate-100 cursor-not-allowed text-slate-500' : 'bg-slate-50 md:bg-slate-50/50 focus:ring-2 focus:ring-emerald-100 md:focus:border-emerald-400 focus:bg-white'}`}
                      />
                    </div>

                    {/* Bloco de Dificuldades */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest px-1 flex items-center gap-1">
                        <span>⚠️</span> Dificuldades Observadas
                      </label>
                      <textarea
                        value={local.dificuldades}
                        onChange={(e) => handleTextoChange(String(aluno.id), "dificuldades", e.target.value)}
                        readOnly={estaBloqueado}
                        placeholder="Quais conteúdos exigem maior fixação? Há alguma barreira comportamental, de concentração ou faltas que prejudicaram o rendimento?"
                        rows={5}
                        className={`w-full p-3.5 text-xs font-semibold text-slate-600 placeholder-slate-300 md:placeholder-slate-400 rounded-xl border border-slate-200 outline-none transition-all resize-none leading-relaxed ${estaBloqueado ? 'bg-slate-100 cursor-not-allowed text-slate-500' : 'bg-slate-50 md:bg-slate-50/50 focus:ring-2 focus:ring-rose-100 md:focus:border-rose-400 focus:bg-white'}`}
                      />
                    </div>

                  </div>

                  {/* Rodapé do Card com o Botão de Salvar daquele Aluno */}
                  <div className="flex justify-end pt-3 mt-1 md:border-t md:border-slate-50">
                    <button
                      onClick={() => salvarFichaIndividual(String(aluno.id))}
                      disabled={isSaving || estaBloqueado || !foiAlterado}
                      className={`w-full md:w-auto px-5 py-3 md:py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center md:justify-start gap-2 transition-all ${
                        isSaving 
                          ? 'bg-indigo-300 text-indigo-50 cursor-not-allowed' 
                          : foiAlterado
                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 active:scale-95'
                            : 'bg-slate-100 md:bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {isSaving ? <Loader2 size={14} className="animate-spin" /> : estaBloqueado ? <Lock size={14} /> : <Save size={14} />}
                      {isSaving ? "Gravando..." : estaBloqueado ? "Parecer Bloqueado" : "Salvar Parecer"}
                    </button>
                  </div>

                </div>
              );
            })}

          </div>
        ) : (
          <div className="bg-white md:rounded-[2.5rem] p-8 md:p-12 text-center border-y md:border border-slate-100 md:shadow-sm mt-4 md:mt-6">
            <p className="text-[10px] md:text-xs font-black uppercase text-slate-400 tracking-widest m-0">
              {!turmaSelecionada 
                ? "Por favor, escolha uma turma acima para liberar a chamada dos pareceres." 
                : "Não há alunos matriculados nesta turma ou turmas vinculadas ao professor."}
            </p>
          </div>
        )}

      </div>
    </div>
  );
}