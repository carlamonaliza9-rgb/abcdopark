"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase"; // Alterado para usar a conexão segura com cookies
import { useRouter } from "next/navigation";

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

  const [registrosLocal, setRegistrosLocal] = useState<{[key: string]: { 
    presenca: boolean | null, 
    participacao: number,
    comportamento: number,
    atividades: number,
    socioemocional: number
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

          // Dados para o acolhimento de aniversário
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

          // BUSCA DE TURMA: Verifica as 4 colunas de professores
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

          // LÓGICA DE ANIVERSÁRIO (1x por login)
          const { data: todosFuncs } = await supabase.from('funcionarios').select('*');
          const { data: todosAlus } = await supabase.from('alunos').select('*');

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
        console.error("Erro na identificação:", err);
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
      .select('id, nome, foto_url')
      .eq('turma', turmaSelecionada)
      .order('nome', { ascending: true });
    if (data) setAlunos(data);
  }

  async function carregarDadosSalvosDoDia() {
    const { data: freq } = await supabase.from('frequencias').select('aluno_id, presente').eq('data', dataLancamento);
    const { data: aval } = await supabase.from('avaliacoes').select('aluno_id, participacao, comportamento, atividades, socioemocional').eq('data_avaliacao', dataLancamento);

    const estadoInicial: any = {};
    alunos.forEach(aluno => {
      const f = freq?.find(r => r.aluno_id === aluno.id);
      const v = aval?.find(r => r.aluno_id === aluno.id);
      estadoInicial[aluno.id] = { 
        presenca: f ? f.presente : null, 
        participacao: v ? v.participacao : 0,
        comportamento: v ? v.comportamento : 0,
        atividades: v ? v.atividades : 0,
        socioemocional: v ? v.socioemocional : 0
      };
    });
    setRegistrosLocal(estadoInicial);
  }

  async function confirmarSeguranca() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return false;
    const { error } = await supabase.auth.signInWithPassword({ email: user.email, password: senhaConfirmacao });
    if (error) { alert("Senha incorreta!"); return false; }
    return true;
  }

  // --- FUNÇÃO AUXILIAR DE AUDITORIA (LOGS) ---
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
      const ids = alunos.map(a => a.id);
      await supabase.from('frequencias').delete().in('aluno_id', ids).eq('data', dataLancamento);
      await supabase.from('avaliacoes').delete().in('aluno_id', ids).eq('data_avaliacao', dataLancamento);
      
      // Registra a exclusão do Diário de Classe no Log de Auditoria
      await registrarLog("EXCLUSÃO", `Excluiu permanentemente os registros do diário de classe da turma ${turmaSelecionada} na data ${new Date(dataLancamento + "T12:00:00").toLocaleDateString('pt-BR')}`);

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
      for (const alunoId in registrosLocal) {
        const reg = registrosLocal[alunoId];
        const alunoInfo = alunos.find(a => a.id === Number(alunoId));
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
          comentario: ""
        }, { onConflict: 'aluno_id, data_avaliacao' });
      }

      // Registra o lançamento ou edição no Log de Auditoria
      const acaoRealizada = acaoPendente === 'editar' ? "EDIÇÃO" : "INSERÇÃO";
      await registrarLog(
        acaoRealizada, 
        `${acaoRealizada === "EDIÇÃO" ? "Editou" : "Registrou"} o diário de classe (frequência e parâmetros diários) da turma ${turmaSelecionada} na data ${new Date(dataLancamento + "T12:00:00").toLocaleDateString('pt-BR')}`
      );

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
  const handleParametroLocal = (alunoId: number, campo: string, qtd: number) => { setRegistrosLocal(prev => ({ ...prev, [alunoId]: { ...prev[alunoId], [campo]: qtd } })); };
  const obterCores = (turmaNome: string) => {
    const cores: { [key: string]: { border: string; bg: string; text: string } } = { 
      "Maternal": { border: "#b9e2f5", bg: "#f0f9ff", text: "#0369a1" }, 
      "Jardim I": { border: "#c2f0d5", bg: "#f0fdf4", text: "#15803d" }, 
      "Jardim II": { border: "#f7c8e0", bg: "#fdf2f8", text: "#9d174d" },
      "1º Ano": { border: "#d7c0f0", bg: "#f5f3ff", text: "#6d28d9" }
    };
    return cores[turmaNome] || { border: "#e2e8f0", bg: "#ffffff", text: "#1e293b" };
  };
  const corAtual = obterCores(turmaSelecionada);
  const parabensWhatsApp = (persona: any) => {
    const msg = `Parabéns, ${persona.nome.split(' ')[0]}! 🎉 A ABC DO PARK te deseja um dia maravilhoso! 🎂🎈`;
    window.open(`https://wa.me/55${persona.whatsapp?.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (carregando) return <div style={{ padding: '50px', textAlign: 'center' }}>Carregando diário...</div>;

  return (
    <div style={{ padding: '32px 20px', maxWidth: '1000px', margin: '0 auto', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      
      {/* MODAL BDAY */}
      {modalBdayAberto && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '30px', width: '100%', maxWidth: '480px', overflow: 'hidden', textAlign: 'center' }}>
            <div style={{ background: 'linear-gradient(135deg, #2563eb 0%, #8b5cf6 100%)', padding: '40px 20px', color: 'white' }}>
              <span style={{ fontSize: '50px' }}>🎂</span>
              <h2 style={{ fontSize: '24px', fontWeight: '800', marginTop: '10px' }}>
                {aniversariantesHoje.some(p => p.email === userEmail) ? `Parabéns, ${nomeUsuario}! ✨` : "Aniversariante(s) do Dia!"}
              </h2>
              {aniversariantesHoje.some(p => p.email === userEmail) ? (
                <div style={{ padding: '0 20px', marginTop: '15px' }}>
                  <p style={{ opacity: 0.95, fontSize: '15px', lineHeight: '1.6', fontWeight: '500' }}>
                    Hoje o dia amanheceu mais feliz porque é o seu aniversário! 🎈<br/><br/>
                    Que este novo ciclo seja repleto de paz, saúde e conquistas. Você é fundamental na nossa escola. Celebre muito!
                  </p>
                  <p style={{ marginTop: '15px', fontSize: '13px', fontWeight: 'bold', fontStyle: 'italic' }}>— Com carinho, Família ABC DO PARK ❤️</p>
                </div>
              ) : (
                <p style={{ opacity: 0.9, fontSize: '14px', marginTop: '10px' }}>Hoje o dia é de festa e gratidão na nossa escola!</p>
              )}
            </div>
            <div style={{ padding: '30px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {aniversariantesHoje.map(pessoa => {
                  const ehVoce = pessoa.email === userEmail;
                  return (
                    <div key={`${pessoa.tipo}-${pessoa.id}`} style={{ display: 'flex', alignItems: 'center', gap: '15px', textAlign: 'left', backgroundColor: ehVoce ? '#f0f9ff' : '#f8fafc', padding: '15px', borderRadius: '22px', border: `2px solid ${ehVoce ? '#3b82f6' : '#e5e7eb'}` }}>
                      <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#fff', overflow: 'hidden' }}>
                        {pessoa.foto_url ? <img src={pessoa.foto_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{pessoa.nome.charAt(0)}</div>}
                      </div>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '800' }}>{ehVoce ? "Você está de parabéns! 🥳" : pessoa.nome}</h4>
                        <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#64748b' }}>
                          {ehVoce ? '🌟 Celebrando sua vida' : (pessoa.tipo === 'funcionario' ? '⭐ Equipe' : `📚 Aluno - ${pessoa.turma}`)}
                        </span>
                      </div>
                      {!ehVoce && <button onClick={() => parabensWhatsApp(pessoa)} style={{ background: '#22c55e', border: 'none', borderRadius: '50%', width: '40px', height: '40px', color: 'white', cursor: 'pointer' }}>📱</button>}
                    </div>
                  );
                })}
              </div>
              <button onClick={() => setModalBdayAberto(false)} style={{ marginTop: '25px', width: '100%', padding: '16px', borderRadius: '18px', border: 'none', backgroundColor: '#1e3a8a', color: 'white', fontWeight: '800', cursor: 'pointer' }}>
                {aniversariantesHoje.some(p => p.email === userEmail) ? 'RECEBER COM CARINHO ❤️' : 'FECHAR'}
              </button>
            </div>
          </div>
        </div>
      )}

      <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '900', color: '#1e3a8a' }}>Meu Diário de Classe 📒</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '15px' }}>
            <div style={{ backgroundColor: corAtual.bg, border: `2px solid ${corAtual.border}`, color: corAtual.text, padding: '10px 20px', borderRadius: '12px', fontWeight: '800' }}>
              Turma: {turmaSelecionada || "Não localizada"}
            </div>
            <input type="date" value={dataLancamento} onChange={(e) => setDataLancamento(e.target.value)} style={{ padding: '10px', borderRadius: '12px', border: '2px solid #e2e8f0', fontWeight: '600', color: '#475569' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => router.push('/professor/frequencia')} style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '12px 20px', borderRadius: '14px', border: '2px solid #dbeafe', fontWeight: '800', cursor: 'pointer' }}>📋 Ver Frequência</button>
          <button onClick={() => { setAcaoPendente('excluir'); setModalSeguranca(true); }} style={{ backgroundColor: '#ef4444', color: 'white', padding: '12px 20px', borderRadius: '14px', border: 'none', fontWeight: '800', cursor: 'pointer' }}>🗑️ Excluir</button>
          <button onClick={() => { setAcaoPendente('editar'); setModalSeguranca(true); }} style={{ backgroundColor: '#f59e0b', color: 'white', padding: '12px 20px', borderRadius: '14px', border: 'none', fontWeight: '800', cursor: 'pointer' }}>✏️ Editar</button>
          <button onClick={handleSalvarNovo} disabled={salvando} style={{ backgroundColor: '#22c55e', color: 'white', padding: '12px 24px', borderRadius: '14px', border: 'none', fontWeight: '900', cursor: 'pointer' }}>{salvando ? "Salvando..." : "💾 Salvar"}</button>
        </div>
      </header>

      {modalSeguranca && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '24px', width: '90%', maxWidth: '400px', textAlign: 'center' }}>
            <h3 style={{ color: '#1e3a8a', marginBottom: '10px' }}>🔒 Confirmação de Segurança</h3>
            <input type="password" placeholder="Sua senha" value={senhaConfirmacao} onChange={(e) => setSenhaConfirmacao(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '2px solid #e2e8f0', marginBottom: '20px', textAlign: 'center' }} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setModalSeguranca(false); setSenhaConfirmacao(""); }} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', backgroundColor: '#f1f5f9', fontWeight: 'bold' }}>Cancelar</button>
              <button onClick={acaoPendente === 'excluir' ? handleExcluirDiario : handleEditarDiario} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', backgroundColor: acaoPendente === 'excluir' ? '#ef4444' : '#f59e0b', color: 'white', fontWeight: 'bold' }}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {alertaEvasao?.aberto && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(30, 58, 138, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(8px)' }}>
          <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '32px', width: '90%', maxWidth: '450px', textAlign: 'center' }}>
            <div style={{ fontSize: '60px', marginBottom: '20px' }}>⚠️</div>
            <h2 style={{ color: '#1e3a8a', fontWeight: '900', marginBottom: '15px' }}>Atenção Professor(a)!</h2>
            <p style={{ color: '#475569', fontSize: '16px', marginBottom: '25px' }}>O aluno <b>{alertaEvasao.nomeAluno}</b> faltou ontem e hoje.</p>
            <button onClick={() => setAlertaEvasao(null)} style={{ width: '100%', padding: '16px', borderRadius: '16px', border: 'none', backgroundColor: '#1e3a8a', color: 'white', fontWeight: '800', cursor: 'pointer' }}>Ciente</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '40px' }}>
        {alunos.map((aluno) => {
          const reg = registrosLocal[aluno.id] || { presenca: null, participacao: 0, comportamento: 0, atividades: 0, socioemocional: 0 };
          return (
            <div key={aluno.id} style={{ backgroundColor: 'white', padding: '24px', borderRadius: '24px', border: `2px solid ${corAtual.border}`, boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <img src={aluno.foto_url || 'https://via.placeholder.com/50'} style={{ width: '60px', height: '60px', borderRadius: '16px', objectFit: 'cover' }} />
                  <span style={{ fontWeight: '800', color: '#1e3a8a', fontSize: '18px' }}>{aluno.nome}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {reg.presenca === null ? (
                    <>
                      <button onClick={() => handlePresencaLocal(aluno.id, true)} style={{ width: '45px', height: '45px', borderRadius: '12px', border: '2px solid #22c55e', backgroundColor: 'white', color: '#15803d', fontWeight: '900', cursor: 'pointer' }}>P</button>
                      <button onClick={() => handlePresencaLocal(aluno.id, false)} style={{ width: '45px', height: '45px', borderRadius: '12px', border: '2px solid #ef4444', backgroundColor: 'white', color: '#b91c1c', fontWeight: '900', cursor: 'pointer' }}>F</button>
                    </>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ width: '45px', height: '45px', borderRadius: '12px', fontWeight: '900', backgroundColor: reg.presenca ? '#22c55e' : '#ef4444', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{reg.presenca ? 'P' : 'F'}</span>
                      <button onClick={() => handlePresencaLocal(aluno.id, null)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '11px', textDecoration: 'underline', cursor: 'pointer', fontWeight: '800' }}>Desfazer</button>
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', padding: '15px', backgroundColor: '#f8fafc', borderRadius: '16px' }}>
                {[{ label: "🎯 Participação", key: "participacao" }, { label: "🤝 Comportamento", key: "comportamento" }, { label: "📝 Atividades", key: "atividades" }, { label: "🧠 Socioemocional", key: "socioemocional" }].map((item) => (
                  <div key={item.key} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>{item.label}</span>
                    <div style={{ display: 'flex', gap: '2px' }}>
                      {[1, 2, 3, 4, 5].map(num => (
                        <span key={num} onClick={() => handleParametroLocal(aluno.id, item.key, num)} style={{ cursor: 'pointer', fontSize: '20px', color: num <= (reg as any)[item.key] ? '#fbbf24' : '#e2e8f0' }}>★</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}