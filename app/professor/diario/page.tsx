"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

export default function DiarioClassePage() {
  const router = useRouter();
  const [alunos, setAlunos] = useState<any[]>([]);
  const [turmaSelecionada, setTurmaSelecionada] = useState("");
  const [dataLancamento, setDataLancamento] = useState(new Date().toISOString().split('T')[0]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  
  const [modalSeguranca, setModalSeguranca] = useState(false);
  const [senhaConfirmacao, setSenhaConfirmacao] = useState("");
  const [acaoPendente, setAcaoPendente] = useState<'excluir' | 'editar' | null>(null);

  const [alertaEvasao, setAlertaEvasao] = useState<{ aberto: boolean; nomeAluno: string } | null>(null);

  const [registrosLocal, setRegistrosLocal] = useState<{[key: string]: { 
    presenca: boolean | null, 
    participacao: number,
    comportamento: number,
    atividades: number,
    socioemocional: number
  }}>({});

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function identificarProfessor() {
      setCarregando(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: turmaData } = await supabase
          .from('turmas_info') 
          .select('nome_turma')
          .eq('email_prof_fixo_1', user.email)
          .maybeSingle();

        if (turmaData) setTurmaSelecionada(turmaData.nome_turma);
      }
      setCarregando(false);
    }
    identificarProfessor();
  }, []);

  useEffect(() => {
    if (turmaSelecionada) buscarAlunos();
  }, [turmaSelecionada]);

  useEffect(() => {
    if (alunos.length > 0) {
      carregarDadosSalvosDoDia();
    }
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
    const { error } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: senhaConfirmacao,
    });
    if (error) {
      alert("Senha incorreta! Ação não autorizada.");
      return false;
    }
    return true;
  }

  async function handleExcluirDiario() {
    const autorizado = await confirmarSeguranca();
    if (!autorizado) return;
    setSalvando(true);
    try {
      const ids = alunos.map(a => a.id);
      await supabase.from('frequencias').delete().in('aluno_id', ids).eq('data', dataLancamento);
      await supabase.from('avaliacoes').delete().in('aluno_id', ids).eq('data_avaliacao', dataLancamento);
      setModalSeguranca(false);
      setSenhaConfirmacao("");
      carregarDadosSalvosDoDia();
    } catch (e) { alert("Erro ao excluir."); } finally { setSalvando(false); }
  }

  async function verificarFaltasEvasao(alunoId: number, nomeAluno: string) {
    const dataRef = new Date(dataLancamento);
    dataRef.setDate(dataRef.getDate() - 1);
    const dataOntem = dataRef.toISOString().split('T')[0];
    
    const { data: registroOntem } = await supabase
      .from('frequencias')
      .select('presente')
      .eq('aluno_id', alunoId)
      .eq('data', dataOntem)
      .maybeSingle();

    if (registroOntem && registroOntem.presente === false) {
      setAlertaEvasao({ aberto: true, nomeAluno });
      
      const hojeNotificacao = new Date().toISOString().split('T')[0];

      await supabase.from('historico_pedagogico').insert({
        aluno_id: alunoId,
        descricao: `🚨 ALERTA: O aluno ${nomeAluno} faltou por 2 dias consecutivos. Professor(a) orientado(a) a contatar os responsáveis.`,
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
          await supabase.from('frequencias').upsert({
            aluno_id: Number(alunoId),
            data: dataLancamento,
            presente: reg.presenca
          }, { onConflict: 'aluno_id, data' });

          if (reg.presenca === false && alunoInfo) {
            await verificarFaltasEvasao(Number(alunoId), alunoInfo.nome);
          }
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
      // REMOVIDO: alert("Lançamento salvo com sucesso!"); para remover o quadro preto
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

  const handlePresencaLocal = (alunoId: number, status: boolean | null) => {
    setRegistrosLocal(prev => ({ ...prev, [alunoId]: { ...prev[alunoId], presenca: status } }));
  };

  const handleParametroLocal = (alunoId: number, campo: string, qtd: number) => {
    setRegistrosLocal(prev => ({ ...prev, [alunoId]: { ...prev[alunoId], [campo]: qtd } }));
  };

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

  if (carregando) return <div style={{ padding: '50px', textAlign: 'center' }}>Carregando diário...</div>;

  return (
    <div style={{ padding: '32px 20px', maxWidth: '1000px', margin: '0 auto', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '900', color: '#1e3a8a' }}>Meu Diário de Classe 📒</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '15px' }}>
            <div style={{ backgroundColor: corAtual.bg, border: `2px solid ${corAtual.border}`, color: corAtual.text, padding: '10px 20px', borderRadius: '12px', fontWeight: '800' }}>
              Turma: {turmaSelecionada || "Não localizada"}
            </div>
            <input type="date" value={dataLancamento} onChange={(e) => setDataLancamento(e.target.value)} style={{ padding: '10px', borderRadius: '12px', border: '2px solid #e2e8f0', fontWeight: '600', outline: 'none', color: '#475569' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => router.push('/professor/frequencia')}
            style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '12px 20px', borderRadius: '14px', border: '2px solid #dbeafe', fontWeight: '800', cursor: 'pointer' }}
          >
            📋 Ver Frequência
          </button>

          <button onClick={() => { setAcaoPendente('excluir'); setModalSeguranca(true); }} style={{ backgroundColor: '#ef4444', color: 'white', padding: '12px 20px', borderRadius: '14px', border: 'none', fontWeight: '800', cursor: 'pointer' }}>🗑️ Excluir</button>
          <button onClick={() => { setAcaoPendente('editar'); setModalSeguranca(true); }} style={{ backgroundColor: '#f59e0b', color: 'white', padding: '12px 20px', borderRadius: '14px', border: 'none', fontWeight: '800', cursor: 'pointer' }}>✏️ Editar</button>
          <button onClick={handleSalvarNovo} disabled={salvando} style={{ backgroundColor: '#22c55e', color: 'white', padding: '12px 24px', borderRadius: '14px', border: 'none', fontWeight: '900', cursor: 'pointer', opacity: salvando ? 0.7 : 1 }}>{salvando ? "Salvando..." : "💾 Salvar"}</button>
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
          <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '32px', width: '90%', maxWidth: '450px', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '60px', marginBottom: '20px' }}>⚠️</div>
            <h2 style={{ color: '#1e3a8a', fontWeight: '900', marginBottom: '15px' }}>Atenção Professor(a)!</h2>
            <p style={{ color: '#475569', fontSize: '16px', lineHeight: '1.6', marginBottom: '25px' }}>
              O aluno <b>{alertaEvasao.nomeAluno}</b> faltou ontem e hoje. 
            </p>
            <div style={{ backgroundColor: '#fffbeb', padding: '15px', borderRadius: '16px', border: '1px solid #fef3c7', marginBottom: '30px' }}>
              <p style={{ color: '#92400e', fontSize: '14px', fontWeight: '700', margin: 0 }}>
                📌 Por gentileza, entre em contato com o responsável agora para verificar o motivo da ausência. A coordenação já foi notificada.
              </p>
            </div>
            <button onClick={() => setAlertaEvasao(null)} style={{ width: '100%', padding: '16px', borderRadius: '16px', border: 'none', backgroundColor: '#1e3a8a', color: 'white', fontWeight: '800', fontSize: '16px', cursor: 'pointer' }}>Ciente, vou entrar em contato</button>
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
                  <img src={aluno.foto_url || 'https://via.placeholder.com/50'} style={{ width: '60px', height: '60px', borderRadius: '16px', objectFit: 'cover', border: '2px solid #f1f5f9' }} />
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
                {[
                  { label: "🎯 Participação", key: "participacao" },
                  { label: "🤝 Comportamento", key: "comportamento" },
                  { label: "📝 Atividades", key: "atividades" },
                  { label: "🧠 Socioemocional", key: "socioemocional" }
                ].map((item) => (
                  <div key={item.key} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>{item.label}</span>
                    <div style={{ display: 'flex', gap: '2px' }}>
                      {[1, 2, 3, 4, 5].map(num => (
                        <span 
                          key={num} 
                          onClick={() => handleParametroLocal(aluno.id, item.key, num)} 
                          style={{ cursor: 'pointer', fontSize: '20px', color: num <= (reg as any)[item.key] ? '#fbbf24' : '#e2e8f0', transition: '0.2s' }}
                        >
                          ★
                        </span>
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