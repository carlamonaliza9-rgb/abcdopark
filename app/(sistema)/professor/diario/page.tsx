"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase"; 
import { useRouter } from "next/navigation";
import { 
  CalendarDays, Save, Trash2, Edit3, ClipboardList, 
  Undo2, CheckCircle2, XCircle, AlertTriangle, ShieldAlert, 
  Cake, Smartphone, BookOpen, MessageSquareText
} from "lucide-react";

export default function DiarioClassePage() {
  const router = useRouter();
  const [alunos, setAlunos] = useState<any[]>([]);
  const [turmaSelecionada, setTurmaSelecionada] = useState("");
  const [nomeUsuario, setNomeUsuario] = useState("Professor");
  const [nomeCompleto, setNomeCompleto] = useState(""); 
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [dataLancamento, setDataLancamento] = useState(new Date().toISOString().split('T')[0]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  
  const [modalSeguranca, setModalSeguranca] = useState(false);
  const [senhaConfirmacao, setSenhaConfirmacao] = useState("");
  const [acaoPendente, setAcaoPendente] = useState<'excluir' | 'editar' | null>(null);

  const [modalBdayAberto, setModalBdayAberto] = useState(false);
  const [aniversariantesHoje, setAniversariantesHoje] = useState<any[]>([]);

  const [alertaEvasao, setAlertaEvasao] = useState<{ aberto: boolean; nomeAluno: string } | null>(null);

  // NOVO ESTADO: Controle do Modal de Observações
  const [modalObsAberto, setModalObsAberto] = useState(false);
  const [obsAtual, setObsAtual] = useState({ alunoId: 0, nomeAluno: "", texto: "", metricaContexto: "" });

  const [registrosLocal, setRegistrosLocal] = useState<{[key: string]: { 
    presenca: boolean | null, 
    participacao: number,
    comportamento: number,
    atividades: number,
    socioemocional: number,
    comentario: string
  }}>({});

  const [registrosOriginais, setRegistrosOriginais] = useState<{[key: string]: { 
    presenca: boolean | null, 
    participacao: number,
    comportamento: number,
    atividades: number,
    socioemocional: number,
    comentario: string
  }}>({});

  useEffect(() => {
    async function identificarProfessor() {
      setCarregando(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: sessionData } = await supabase.auth.getSession();

        if (user) {
          const emailAtual = user.email || "";
          setUserEmail(emailAtual);

          const metadata = user.user_metadata;
          let nome = metadata?.nome || metadata?.name || metadata?.full_name;
          if (!nome && emailAtual) {
            const emailPart = emailAtual.split('@')[0];
            nome = emailPart.charAt(0).toUpperCase() + emailPart.slice(1);
          }
          if (nome) {
            setNomeCompleto(nome);
            setNomeUsuario(nome.split(' ')[0]);
          }

          const { data: turmasInfo } = await supabase.from('turmas_info').select('*');
          const minhaTurma = (turmasInfo || []).find(t => 
            t.email_prof_fixo_1 === emailAtual || 
            t.email_prof_fixo_2 === emailAtual || 
            t.email_prof_especifico_1 === emailAtual || 
            t.email_prof_especifico_2 === emailAtual
          );

          if (minhaTurma) {
            setTurmaSelecionada(minhaTurma.nome_turma);
          }

          const { data: todosFuncs } = await supabase.from('funcionarios').select('*');
          const { data: todosAlus } = await supabase.from('alunos').select('*').neq('status', 'transferido');

          const hoje = new Date();
          const diaAtu = hoje.getDate();
          const mesAtu = hoje.getUTCMonth();
          const hojeStr = hoje.toISOString().split('T')[0];

          const exDia = (d: string) => new Date(d + "T12:00:00").getUTCDate();
          const exMes = (d: string) => new Date(d + "T12:00:00").getUTCMonth();

          const bdayAlunos = (todosAlus || []).filter(a => a.data_nascimento && exMes(a.data_nascimento) === mesAtu && exDia(a.data_nascimento) === diaAtu).map(a => ({ ...a, tipo: 'aluno' }));
          const bdayFuncs = (todosFuncs || []).filter(f => f.data_nascimento && exMes(f.data_nascimento) === mesAtu && exDia(f.data_nascimento) === diaAtu).map(f => ({ ...f, tipo: 'funcionario' }));
          const quemFez = [...bdayAlunos, ...bdayFuncs];

          if (quemFez.length > 0) {
            setAniversariantesHoje(quemFez);
            const sessId = sessionData.session?.access_token.slice(-15) || 'default';
            const bdayKey = `bday_session_${hojeStr}_${sessId}`;
            if (!sessionStorage.getItem(bdayKey)) {
              setModalBdayAberto(true);
              sessionStorage.setItem(bdayKey, "visualizado");
            }
          }
        }
      } catch (err) {
        console.error("Erro na identification:", err);
      } finally {
        setCarregando(false);
      }
    }
    identificarProfessor();
  }, []);

  useEffect(() => {
    if (turmaSelecionada) buscarAlunos();
  }, [turmaSelecionada]);

  useEffect(() => {
    if (alunos.length > 0) carregarDadosSalvosDoDia();
  }, [dataLancamento, alunos]);

  async function buscarAlunos() {
    const { data } = await supabase
      .from('alunos')
      .select('id, nome, foto_url, turma')
      .eq('turma', turmaSelecionada)
      .neq('status', 'transferido') // <--- FILTRO APLICADO: Remove alunos transferidos da pauta do professor
      .order('nome', { ascending: true });
    if (data) setAlunos(data);
  }

  async function carregarDadosSalvosDoDia() {
    const { data: freq } = await supabase.from('frequencias').select('aluno_id, presente').eq('data', dataLancamento);
    const { data: aval } = await supabase.from('avaliacoes').select('aluno_id, participacao, comportamento, atividades, socioemocional, comentario').eq('data_avaliacao', dataLancamento);

    const estadoInicial: any = {};
    alunos.forEach(aluno => {
      const f = freq?.find(r => r.aluno_id === aluno.id);
      const v = aval?.find(r => r.aluno_id === aluno.id);
      estadoInicial[aluno.id] = { 
        presenca: f ? f.presente : null, 
        participacao: v ? v.participacao : 0,
        comportamento: v ? v.comportamento : 0,
        atividades: v ? v.atividades : 0,
        socioemocional: v ? v.socioemocional : 0,
        comentario: v?.comentario || ""
      };
    });
    setRegistrosLocal(estadoInicial);
    setRegistrosOriginais(JSON.parse(JSON.stringify(estadoInicial)));
  }

  async function confirmarSeguranca() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return false;
    const { error } = await supabase.auth.signInWithPassword({ email: user.email, password: senhaConfirmacao });
    if (error) { alert("Senha incorreta!"); return false; }
    return true;
  }

  async function registrarLog(acao: string, detalhes: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('logs_sistema').insert([{
          usuario_email: user.email,
          acao: acao,
          tabela: 'diario_classe',
          detalhes: detalhes
        }]);
      }
    } catch (e) {
      console.error("Erro ao gerar log de auditoria:", e);
    }
  }

  async function handleExcluirDiario() {
    const autorizado = await confirmarSeguranca();
    if (!autorizado) return;
    setSalvando(true);
    try {
      const dataFormatada = new Date(dataLancamento + "T12:00:00").toLocaleDateString('pt-BR');
      const dadosPedagogicosRemovidos: string[] = [];

      alunos.forEach(aluno => {
        const reg = registrosLocal[aluno.id] || { presenca: null, participacao: 0, comportamento: 0, atividades: 0, socioemocional: 0, comentario: "" };
        const textoPresenca = reg.presenca === null ? "Sem pauta" : (reg.presenca ? "Presença (P)" : "Falta (F)");
        dadosPedagogicosRemovidos.push(
          `• ${aluno.nome}:\n` +
          `  - Frequência: ${textoPresenca}\n` +
          `  - Avaliação: [🎯 Part: ${reg.participacao}★] [🤝 Comp: ${reg.comportamento}★] [📝 Ativ: ${reg.atividades}★] [🧠 Socio: ${reg.socioemocional}★]` +
          (reg.comentario ? `\n  - Observação: "${reg.comentario}"` : "")
        );
      });

      const textoDetalhesExclusao = `🗑️ Excluiu permanentemente os registros do diário de classe da turma ${turmaSelecionada} na data ${dataFormatada}.\n` +
                                    `• Histórico pedagógico removido:\n` + dadosPedagogicosRemovidos.join('\n');

      const ids = alunos.map(a => a.id);
      await supabase.from('frequencias').delete().in('aluno_id', ids).eq('data', dataLancamento);
      await supabase.from('avaliacoes').delete().in('aluno_id', ids).eq('data_avaliacao', dataLancamento);
      
      await registrarLog("EXCLUSÃO", textoDetalhesExclusao);

      setModalSeguranca(false);
      setSenhaConfirmacao("");
      carregarDadosSalvosDoDia();
    } catch (e) { alert("Erro ao excluir."); } finally { setSalvando(false); }
  }

  async function verificarFaltasEvasao(alunoId: number, nomeAluno: string) {
    const dataRef = new Date(dataLancamento);
    dataRef.setDate(dataRef.getDate() - 1);
    const dataOntem = dataRef.toISOString().split('T')[0];
    const { data: registroOntem } = await supabase.from('frequencias').select('presente').eq('aluno_id', alunoId).eq('data', dataOntem).maybeSingle();
    if (registroOntem && registroOntem.presente === false) {
      setAlertaEvasao({ aberto: true, nomeAluno });
      const hojeNotificacao = new Date().toISOString().split('T')[0];
      await supabase.from('historico_pedagogico').insert({
        aluno_id: alunoId,
        descricao: `🚨 ALERTA: O aluno ${nomeAluno} faltou por 2 dias consecutivos.`,
        data: hojeNotificacao
      });
    }
  }

  async function handleSalvarNovo() {
    setSalvando(true);
    try {
      const mudancasFiltradas: string[] = [];
      let possuiMudancaEfetiva = false;
      const dataFormatada = new Date(dataLancamento + "T12:00:00").toLocaleDateString('pt-BR');

      for (const alunoId in registrosLocal) {
        const reg = registrosLocal[alunoId];
        const orig = registrosOriginais[alunoId] || { presenca: null, participacao: 0, comportamento: 0, atividades: 0, socioemocional: 0, comentario: "" };
        const alunoInfo = alunos.find(a => a.id === Number(alunoId));

        const mudouPresenca = reg.presenca !== orig.presenca;
        const mudouParticipacao = reg.participacao !== orig.participacao;
        const mudouComportamento = reg.comportamento !== orig.comportamento;
        const mudouAtividades = reg.atividades !== orig.atividades;
        const mudouSocioemocional = reg.socioemocional !== orig.socioemocional;
        const mudouComentario = reg.comentario !== orig.comentario;

        if (mudouPresenca || mudouParticipacao || mudouComportamento || mudouAtividades || mudouSocioemocional || mudouComentario) {
          possuiMudancaEfetiva = true;
          const nomeAluno = alunoInfo?.nome || `ID ${alunoId}`;
          const formatarP = (p: boolean | null) => p === null ? "(Sem pauta)" : (p ? "Presença (P)" : "Falta (F)");
          
          let logAluno = `• ${nomeAluno}:\n`;
          if (mudouPresenca) logAluno += `  - Freq: Antes: ${formatarP(orig.presenca)} ➔ Depois: ${formatarP(reg.presenca)}\n`;
          if (mudouParticipacao) logAluno += `  - Part: Antes: ${orig.participacao}★ ➔ Depois: ${reg.participacao}★\n`;
          if (mudouComportamento) logAluno += `  - Comp: Antes: ${orig.comportamento}★ ➔ Depois: ${reg.comportamento}★\n`;
          if (mudouAtividades) logAluno += `  - Ativ: Antes: ${orig.atividades}★ ➔ Depois: ${reg.atividades}★\n`;
          if (mudouSocioemocional) logAluno += `  - Socio: Antes: ${orig.socioemocional}★ ➔ Depois: ${reg.socioemocional}★\n`;
          if (mudouComentario) logAluno += `  - Obs: Antes: "${orig.comentario}" ➔ Depois: "${reg.comentario}"\n`;
          
          mudancasFiltradas.push(logAluno.trimEnd());
        }

        if (reg.presenca !== null) {
          await supabase.from('frequencias').upsert({ aluno_id: Number(alunoId), data: dataLancamento, presente: reg.presenca }, { onConflict: 'aluno_id, data' });
          if (reg.presenca === false && alunoInfo) await verificarFaltasEvasao(Number(alunoId), alunoInfo.nome);
        }
        await supabase.from('avaliacoes').upsert({
          aluno_id: Number(alunoId),
          data_avaliacao: dataLancamento,
          participacao: Number(reg.participacao),
          comportamento: Number(reg.comportamento),
          atividades: Number(reg.atividades),
          socioemocional: Number(reg.socioemocional),
          comentario: reg.comentario || ""
        }, { onConflict: 'aluno_id, data_avaliacao' });
      }

      if (possuiMudancaEfetiva) {
        const tipoAcao = acaoPendente === 'editar' ? "EDIÇÃO" : "INSERÇÃO";
        const textoRelatorio = `📒 Alterou/Registrou a pauta diária da turma ${turmaSelecionada} na data ${dataFormatada}:\n` + mudancasFiltradas.join('\n');
        await registrarLog(tipoAcao, textoRelatorio);
      }

      setRegistrosOriginais(JSON.parse(JSON.stringify(registrosLocal)));

    } catch (error) { alert("Erro ao salvar lançamento."); } finally { setSalvando(false); }
  }

  async function handleEditarDiario() {
    const autorizado = await confirmarSeguranca();
    if (!autorizado) return;
    await handleSalvarNovo(); 
    setModalSeguranca(false);
    setSenhaConfirmacao("");
    setAcaoPendente(null);
  }

  const handlePresencaLocal = (alunoId: number, status: boolean | null) => { setRegistrosLocal(prev => ({ ...prev, [alunoId]: { ...prev[alunoId], presenca: status } })); };
  
  // NOVA LÓGICA DE AVALIAÇÃO E GATILHO DE MODAL
  const handleParametroLocal = (alunoId: number, nomeAluno: string, campo: string, labelContexto: string, qtd: number) => { 
    setRegistrosLocal(prev => ({ ...prev, [alunoId]: { ...prev[alunoId], [campo]: qtd } })); 
    
    // Dispara o modal se a nota for 3 ou menor e se ainda não houver um comentário sendo digitado
    if (qtd <= 3) {
      abrirModalObs(alunoId, nomeAluno, labelContexto);
    }
  };
  
  function abrirModalObs(alunoId: number, nomeAluno: string, metrica: string) {
    const textoExistente = registrosLocal[alunoId]?.comentario || "";
    setObsAtual({ alunoId, nomeAluno, texto: textoExistente, metricaContexto: metrica });
    setModalObsAberto(true);
  }

  function salvarModalObs() {
    setRegistrosLocal(prev => ({
      ...prev,
      [obsAtual.alunoId]: {
        ...prev[obsAtual.alunoId],
        comentario: obsAtual.texto
      }
    }));
    setModalObsAberto(false);
  }

  const parabensWhatsApp = (persona: any) => {
    const msg = `Parabéns, ${persona.nome.split(' ')[0]}! 🎉 A ABC DO PARK te deseja um dia maravilhoso! 🎂🎈`;
    window.open(`https://wa.me/55${persona.whatsapp?.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const getCorTurmaInfo = (turma: string) => {
    const cores: Record<string, string> = {
      "Maternal": "text-sky-700",
      "Jardim I": "text-emerald-700",
      "Jardim II": "text-pink-700",
      "1º Ano": "text-purple-700"
    };
    return cores[turma] || "text-slate-700";
  };
  const temaTurmaAtual = getCorTurmaInfo(turmaSelecionada);

  if (carregando) return <div className="min-h-screen bg-white md:bg-[#f4f7f9] flex items-center justify-center font-black uppercase text-blue-500 tracking-widest animate-pulse text-xs">Carregando diário...</div>;

  return (
    <div className="w-full min-h-screen bg-white md:bg-[#f4f7f9] pb-24 md:pb-32 font-sans animate-in fade-in duration-500 overflow-x-hidden">
      
      <div className="w-full max-w-[1600px] mx-auto md:p-8 lg:p-10 md:space-y-8">
        
        {/* ================= HEADER DO DIÁRIO (Mobile Native / Desktop Card) ================= */}
        <header className="bg-white md:rounded-[2.5rem] px-4 pt-6 pb-4 md:p-8 md:shadow-sm border-b md:border border-slate-100 flex flex-col xl:flex-row xl:items-center justify-between gap-4 md:gap-6">
          <div className="flex flex-col">
            <h1 className="text-2xl md:text-4xl font-black text-slate-800 tracking-tighter m-0 flex items-center gap-2 md:gap-3">
              <span className="bg-blue-100 text-blue-600 p-2 md:p-2.5 rounded-xl md:rounded-2xl shrink-0"><BookOpen className="w-6 h-6 md:w-7 md:h-7" strokeWidth={2.5}/></span> 
              Diário de Classe
            </h1>
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 md:gap-4 mt-4 md:mt-5">
              <div className={`px-1 md:px-4 md:py-2.5 md:rounded-xl md:border-2 font-black uppercase tracking-widest text-[11px] md:text-[10px] ${temaTurmaAtual}`}>
                Turma: {turmaSelecionada || "Não localizada"}
              </div>
              <div className="flex items-center gap-3 bg-slate-50 md:border md:border-slate-200 px-4 py-3 md:py-2 rounded-xl">
                <CalendarDays size={18} className="text-slate-400 shrink-0" />
                <input 
                  type="date" 
                  value={dataLancamento} 
                  onChange={(e) => setDataLancamento(e.target.value)} 
                  className="bg-transparent border-none font-bold text-slate-700 outline-none w-full sm:w-auto"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-2 md:mt-0">
            <button 
              onClick={() => router.push('/professor/frequencia')} 
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-50 text-slate-600 hover:text-blue-600 hover:bg-blue-50 px-4 py-3 md:px-6 md:py-4 rounded-xl md:rounded-2xl md:border border-slate-200 font-black uppercase tracking-widest text-[10px] transition-all active:scale-95"
            >
              <ClipboardList size={16} className="md:w-[18px] md:h-[18px]" strokeWidth={2.5} /> <span className="hidden md:inline">Relatório Mês</span><span className="md:hidden">Relatório</span>
            </button>
            <button 
              onClick={() => { setAcaoPendente('excluir'); setModalSeguranca(true); }} 
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-rose-50 text-rose-600 hover:bg-rose-100 px-4 py-3 md:px-6 md:py-4 rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95"
            >
              <Trash2 size={16} className="md:w-[18px] md:h-[18px]" strokeWidth={2.5} /> Limpar
            </button>
            <button 
              onClick={() => { setAcaoPendente('editar'); setModalSeguranca(true); }} 
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-amber-50 text-amber-600 hover:bg-amber-100 px-4 py-3 md:px-6 md:py-4 rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95"
            >
              <Edit3 size={16} className="md:w-[18px] md:h-[18px]" strokeWidth={2.5} /> Editar
            </button>
            
            {/* BOTÃO SALVAR (Apenas visível no Desktop aqui no Header) */}
            <button 
              onClick={handleSalvarNovo} 
              disabled={salvando} 
              className="hidden md:flex items-center justify-center gap-2 bg-green-500 text-white px-8 py-4 rounded-2xl shadow-lg shadow-green-500/20 hover:bg-green-600 font-black uppercase tracking-widest text-[11px] transition-all active:scale-95 disabled:opacity-50"
            >
              <Save size={20} strokeWidth={2.5} /> {salvando ? "Salvando..." : "Salvar Pauta"}
            </button>
          </div>
        </header>

        {/* ================= GRID DE ALUNOS (Mobile Native List / Desktop Cards) ================= */}
        <div className="flex flex-col md:grid md:grid-cols-2 xl:grid-cols-3 gap-0 md:gap-6 pt-2 md:pt-0">
          {alunos.map((aluno) => {
            const reg = registrosLocal[aluno.id] || { presenca: null, participacao: 0, comportamento: 0, atividades: 0, socioemocional: 0, comentario: "" };
            const isFalta = reg.presenca === false;
            const isPresente = reg.presenca === true;
            const temComentario = reg.comentario.trim().length > 0;

            return (
              <div 
                key={aluno.id} 
                className={`bg-white p-4 md:p-5 border-b border-slate-100 md:border-2 md:rounded-[2rem] md:shadow-sm flex flex-col justify-between transition-all duration-300 ${isFalta ? 'bg-rose-50/30 md:border-rose-200' : isPresente ? 'md:border-green-200' : 'md:border-slate-100'}`}
              >
                
                {/* TOPO: Avatar, Nome, Botão de Comentário e Frequência */}
                <div className="flex items-start justify-between mb-4 md:mb-6 gap-3 md:gap-4">
                  <div className="flex items-center gap-3 md:gap-4 overflow-hidden flex-1">
                    <img src={aluno.foto_url || 'https://via.placeholder.com/60'} className="w-12 h-12 md:w-14 md:h-14 shrink-0 rounded-full md:rounded-[1.2rem] object-cover border border-slate-100 shadow-sm" alt="" />
                    <div className="flex flex-col">
                      <span className="font-black text-slate-800 text-sm md:text-base leading-tight line-clamp-1" title={aluno.nome}>{aluno.nome}</span>
                      
                      {/* Botão de Observação Pedagógica */}
                      <button 
                        onClick={() => abrirModalObs(aluno.id, aluno.nome, "Geral")}
                        className={`mt-1 flex items-center gap-1.5 w-fit px-2 py-1 rounded-md md:rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors ${
                          temComentario 
                            ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' 
                            : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                        }`}
                      >
                        <MessageSquareText size={12} strokeWidth={2.5} />
                        {temComentario ? 'Obs. Adicionada' : 'Add Observação'}
                      </button>
                    </div>
                  </div>

                  {/* CONTROLO DE FREQUÊNCIA */}
                  <div className="flex items-center gap-2 shrink-0">
                    {reg.presenca === null ? (
                      <div className="flex bg-slate-100 p-1 rounded-xl md:rounded-2xl">
                        <button 
                          onClick={() => handlePresencaLocal(aluno.id, true)} 
                          className="w-8 h-8 md:w-10 md:h-10 rounded-[0.6rem] md:rounded-xl bg-white text-slate-400 hover:text-green-600 hover:shadow-sm font-black transition-all flex items-center justify-center text-sm"
                        >
                          P
                        </button>
                        <button 
                          onClick={() => handlePresencaLocal(aluno.id, false)} 
                          className="w-8 h-8 md:w-10 md:h-10 rounded-[0.6rem] md:rounded-xl bg-white text-slate-400 hover:text-rose-600 hover:shadow-sm font-black transition-all flex items-center justify-center text-sm"
                        >
                          F
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-[0.6rem] md:rounded-2xl flex items-center justify-center shadow-sm ${isPresente ? 'bg-green-500 text-white' : 'bg-rose-500 text-white'}`}>
                          {isPresente ? <CheckCircle2 size={20} strokeWidth={3} className="md:w-6 md:h-6" /> : <XCircle size={20} strokeWidth={3} className="md:w-6 md:h-6" />}
                        </div>
                        <button 
                          onClick={() => handlePresencaLocal(aluno.id, null)} 
                          className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 mt-0.5 md:mt-1"
                        >
                          <Undo2 size={10} /> Desfazer
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* BASE: Avaliação 2x2 Grid */}
                <div className="grid grid-cols-2 gap-2 md:gap-3 p-3 md:p-4 bg-slate-50/80 rounded-2xl md:rounded-[1.5rem] border border-slate-100">
                  {[
                    { label: "Participação", key: "participacao", icon: "🎯" }, 
                    { label: "Comportamento", key: "comportamento", icon: "🤝" }, 
                    { label: "Atividades", key: "atividades", icon: "📝" }, 
                    { label: "Socioemoc.", key: "socioemocional", icon: "🧠" }
                  ].map((item) => (
                    <div key={item.key} className="flex flex-col gap-1.5 bg-white p-2.5 md:p-3 rounded-xl md:rounded-2xl shadow-sm border border-slate-100">
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1 md:gap-1.5 truncate">
                        <span>{item.icon}</span> {item.label}
                      </span>
                      <div className="flex gap-0.5 md:gap-1">
                        {[1, 2, 3, 4, 5].map(num => {
                          const ativo = num <= (reg as any)[item.key];
                          return (
                            <span 
                              key={num} 
                              onClick={() => handleParametroLocal(aluno.id, aluno.nome, item.key, item.label, num)} 
                              className={`cursor-pointer text-base md:text-lg transition-colors hover:scale-110 active:scale-90 ${ativo ? 'text-amber-400 drop-shadow-sm' : 'text-slate-200'}`}
                            >
                              ★
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            );
          })}
        </div>

        {alunos.length === 0 && !carregando && (
          <div className="p-10 mx-4 md:mx-0 text-center bg-white rounded-3xl border border-dashed border-slate-300">
             <p className="text-xs font-black uppercase tracking-widest text-slate-400">Nenhum aluno encontrado para a turma selecionada.</p>
          </div>
        )}

      </div>

      {/* ================= BARRA INFERIOR DE SALVAR (Flutuante no Mobile) ================= */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-4 z-40 shadow-[0_-4px_10px_-1px_rgba(0,0,0,0.05)]">
        <button 
          onClick={handleSalvarNovo} 
          disabled={salvando} 
          className="w-full flex items-center justify-center gap-2 bg-green-500 text-white px-8 py-4 rounded-xl shadow-lg shadow-green-500/20 hover:bg-green-600 font-black uppercase tracking-widest text-[11px] transition-all active:scale-95 disabled:opacity-50"
        >
          <Save size={20} strokeWidth={2.5} /> {salvando ? "Salvando..." : "Salvar Pauta Diária"}
        </button>
      </div>

      {/* ================= MODAL DE OBSERVAÇÃO PEDAGÓGICA ================= */}
      {modalObsAberto && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          onClick={() => setModalObsAberto(false)}
        >
          <div 
            className="bg-white p-6 md:p-8 rounded-[2.5rem] w-full max-w-lg shadow-2xl animate-in zoom-in-95 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
                <MessageSquareText size={24} strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-lg md:text-xl font-black text-slate-800 tracking-tight">Observação Diária</h3>
                <p className="text-[11px] md:text-xs font-bold text-slate-500 line-clamp-1">{obsAtual.nomeAluno}</p>
              </div>
            </div>
            
            <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl mb-6">
              <p className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">Detalhes para o Relatório dos Pais</p>
              <textarea 
                rows={4}
                placeholder={`Registre aqui o motivo da avaliação ou uma observação geral sobre o aluno no dia de hoje...`}
                value={obsAtual.texto}
                onChange={(e) => setObsAtual({ ...obsAtual, texto: e.target.value })}
                className="w-full bg-transparent border-none text-sm font-bold text-slate-700 outline-none resize-none placeholder:text-slate-300 custom-scrollbar"
              />
            </div>
            
            <div className="flex gap-2 md:gap-3 mt-auto">
              <button onClick={() => setModalObsAberto(false)} className="flex-1 py-3.5 md:py-4 rounded-xl md:rounded-2xl bg-slate-100 text-slate-600 font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-colors">
                Cancelar
              </button>
              <button onClick={salvarModalObs} className="flex-[2] py-3.5 md:py-4 rounded-xl md:rounded-2xl bg-blue-600 text-white font-black uppercase tracking-widest text-[10px] hover:bg-blue-700 shadow-md shadow-blue-600/20 transition-all active:scale-95">
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL SEGURANÇA ================= */}
      {modalSeguranca && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          onClick={() => { setModalSeguranca(false); setSenhaConfirmacao(""); }}
        >
          <div 
            className="bg-white p-8 rounded-[2.5rem] w-full max-w-sm text-center shadow-2xl animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <ShieldAlert size={48} className="mx-auto text-amber-500 mb-4" strokeWidth={2} />
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-2">Confirmação de Segurança</h3>
            <p className="text-xs font-bold text-slate-500 mb-6">Insira sua senha para confirmar a {acaoPendente === 'excluir' ? 'exclusão' : 'edição'}.</p>
            <input 
              type="password" 
              placeholder="Sua senha" 
              value={senhaConfirmacao} 
              onChange={(e) => setSenhaConfirmacao(e.target.value)} 
              className="w-full px-4 py-3 rounded-2xl border-2 border-slate-100 mb-6 text-center font-bold text-slate-700 outline-none focus:border-amber-400" 
            />
            <div className="flex gap-3">
              <button onClick={() => { setModalSeguranca(false); setSenhaConfirmacao(""); }} className="flex-1 py-4 rounded-xl bg-slate-100 text-slate-600 font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-colors">Cancelar</button>
              <button onClick={acaoPendente === 'excluir' ? handleExcluirDiario : handleEditarDiario} className={`flex-1 py-4 rounded-xl text-white font-black uppercase tracking-widest text-[10px] transition-colors shadow-md ${acaoPendente === 'excluir' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-amber-500 hover:bg-amber-600'}`}>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= ALERTA EVASÃO ================= */}
      {alertaEvasao?.aberto && (
        <div 
          className="fixed inset-0 bg-rose-900/40 backdrop-blur-md z-[9999] flex items-center justify-center p-4"
          onClick={() => setAlertaEvasao(null)}
        >
          <div 
            className="bg-white p-8 md:p-10 rounded-[3rem] w-full max-w-md text-center shadow-2xl animate-in slide-in-from-bottom-8"
            onClick={(e) => e.stopPropagation()}
          >
            <AlertTriangle size={56} className="mx-auto text-rose-500 mb-6 animate-pulse" strokeWidth={2} />
            <h2 className="text-xl md:text-2xl font-black text-rose-600 uppercase tracking-tighter mb-4">Atenção Professor(a)!</h2>
            <p className="text-slate-700 font-bold text-sm md:text-base mb-6">O aluno <span className="text-rose-600">{alertaEvasao.nomeAluno}</span> faltou ontem e hoje.</p>
            <div className="bg-rose-50 p-4 rounded-2xl mb-8">
              <p className="text-rose-500 font-black uppercase tracking-widest text-[9px]">Rastreamento preventivo acionado na secretaria.</p>
            </div>
            <button onClick={() => setAlertaEvasao(null)} className="w-full py-4 rounded-2xl bg-slate-800 text-white font-black uppercase tracking-widest text-xs hover:bg-slate-900 transition-transform active:scale-95 shadow-lg">Ciente</button>
          </div>
        </div>
      )}

      {/* ================= MODAL BDAY ================= */}
      {modalBdayAberto && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          onClick={() => setModalBdayAberto(false)}
        >
          <div 
            className="bg-white w-full max-w-md rounded-[3rem] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-8 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-8 text-white relative">
              <Cake size={48} className="mx-auto mb-4 drop-shadow-md animate-bounce" strokeWidth={2} />
              <h2 className="text-2xl font-black tracking-tight leading-tight">
                {aniversariantesHoje.some(p => p.email === userEmail) ? `Parabéns, ${nomeUsuario}! ✨` : "Aniversariantes do Dia!"}
              </h2>
              {aniversariantesHoje.some(p => p.email === userEmail) && (
                <p className="mt-4 text-blue-50 text-sm font-medium leading-relaxed px-4">
                  Hoje o dia amanheceu mais feliz porque é o seu aniversário! 🎈 Que este novo ciclo seja repleto de paz, saúde e conquistas.
                </p>
              )}
            </div>
            <div className="p-6 bg-slate-50">
              <div className="flex flex-col gap-3">
                {aniversariantesHoje.map(pessoa => {
                  const ehVoce = pessoa.email === userEmail;
                  return (
                    <div key={`${pessoa.tipo}-${pessoa.id}`} className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${ehVoce ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-100 shadow-sm'}`}>
                      <div className="w-14 h-14 rounded-full bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                        {pessoa.foto_url ? (
                          <img src={pessoa.foto_url} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <span className="font-black text-slate-400 text-lg">{pessoa.nome.charAt(0)}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-base font-black text-slate-800 line-clamp-1">{ehVoce ? "Você está de parabéns! 🥳" : pessoa.nome}</h4>
                        <span className={`text-[9px] font-black uppercase tracking-widest ${ehVoce ? 'text-blue-600' : 'text-slate-500'}`}>
                          {ehVoce ? '🌟 Celebrando sua vida' : `📚 ${pessoa.tipo === 'funcionario' ? 'Equipe' : 'Aluno - ' + pessoa.turma}`}
                        </span>
                      </div>
                      {!ehVoce && (
                        <button onClick={() => parabensWhatsApp(pessoa)} className="w-10 h-10 rounded-xl bg-green-500 hover:bg-green-600 text-white flex items-center justify-center shadow-sm transition-transform active:scale-95 shrink-0">
                          <Smartphone size={18} strokeWidth={2.5} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              <button onClick={() => setModalBdayAberto(false)} className="w-full mt-6 py-4 rounded-2xl bg-slate-800 text-white font-black uppercase tracking-widest transition-all active:scale-95 shadow-md text-[11px]">
                {aniversariantesHoje.some(p => p.email === userEmail) ? 'RECEBER COM CARINHO ❤️' : 'FECHAR'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ajuste de scrollbar */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}} />
    </div>
  );
}