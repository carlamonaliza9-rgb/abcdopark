"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

export default function DiarioClassePage() {
  const [alunos, setAlunos] = useState<any[]>([]);
  const [turmaSelecionada, setTurmaSelecionada] = useState("");
  const [dataLancamento, setDataLancamento] = useState(new Date().toISOString().split('T')[0]);
  const [carregando, setCarregando] = useState(true);
  const [frequenciaMensal, setFrequenciaMensal] = useState<any[]>([]);
  const [salvando, setSalvando] = useState(false);
  
  // Estados para o Modal de Exclusão/Segurança
  const [modalSeguranca, setModalSeguranca] = useState(false);
  const [senhaConfirmacao, setSenhaConfirmacao] = useState("");
  const [acaoPendente, setAcaoPendente] = useState<'excluir' | 'editar' | null>(null);

  const [registrosLocal, setRegistrosLocal] = useState<{[key: string]: { presenca: boolean | null, estrelas: number }}>({});

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
    if (turmaSelecionada) {
      buscarAlunos();
    }
  }, [turmaSelecionada]);

  useEffect(() => {
    if (alunos.length > 0) {
      carregarDadosSalvosDoDia();
      buscarDadosMensais();
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
    const { data: aval } = await supabase.from('avaliacoes').select('aluno_id, estrelas').eq('data_avaliacao', dataLancamento);

    const estadoInicial: any = {};
    alunos.forEach(aluno => {
      const f = freq?.find(r => r.aluno_id === aluno.id);
      const v = aval?.find(r => r.aluno_id === aluno.id);
      estadoInicial[aluno.id] = { 
        presenca: f ? f.presente : null, 
        estrelas: v ? v.estrelas : 0 
      };
    });
    setRegistrosLocal(estadoInicial);
  }

  async function buscarDadosMensais() {
    const anoMes = dataLancamento.substring(0, 7);
    const { data } = await supabase
      .from('frequencias')
      .select('*')
      .gte('data', `${anoMes}-01`)
      .lte('data', `${anoMes}-31`);
    if (data) setFrequenciaMensal(data);
  }

  // Lógica de verificação de senha antes de ações críticas
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
      
      alert("🗑️ Diário excluído com sucesso!");
      setModalSeguranca(false);
      setSenhaConfirmacao("");
      carregarDadosSalvosDoDia();
      buscarDadosMensais();
    } catch (e) {
      alert("Erro ao excluir.");
    } finally {
      setSalvando(false);
    }
  }

  async function handleSalvarAvaliacao() {
    if (acaoPendente === 'editar') {
      const autorizado = await confirmarSeguranca();
      if (!autorizado) return;
    }

    setSalvando(true);
    try {
      for (const alunoId in registrosLocal) {
        const reg = registrosLocal[alunoId];
        if (reg.presenca !== null) {
          await supabase.from('frequencias').upsert({
            aluno_id: Number(alunoId),
            data: dataLancamento,
            presente: reg.presenca
          }, { onConflict: 'aluno_id, data' });
        }
        await supabase.from('avaliacoes').upsert({
          aluno_id: Number(alunoId),
          data_avaliacao: dataLancamento,
          estrelas: Number(reg.estrelas),
          comentario: ""
        }, { onConflict: 'aluno_id, data_avaliacao' });
      }
      alert("✅ Salvo com sucesso!");
      setModalSeguranca(false);
      setSenhaConfirmacao("");
      setAcaoPendente(null);
      buscarDadosMensais();
    } catch (error) {
      alert("Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  const handlePresencaLocal = (alunoId: number, status: boolean | null) => {
    setRegistrosLocal(prev => ({ ...prev, [alunoId]: { ...prev[alunoId], presenca: status } }));
  };

  const handleEstrelasLocal = (alunoId: number, qtd: number) => {
    setRegistrosLocal(prev => ({ ...prev, [alunoId]: { ...prev[alunoId], estrelas: qtd } }));
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
  const diasNoMes = new Date(parseInt(dataLancamento.split('-')[0]), parseInt(dataLancamento.split('-')[1]), 0).getDate();

  return (
    <div style={{ padding: '32px 20px', maxWidth: '1000px', margin: '0 auto', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
            onClick={() => { setAcaoPendente('excluir'); setModalSeguranca(true); }}
            style={{ backgroundColor: '#ef4444', color: 'white', padding: '12px 20px', borderRadius: '14px', border: 'none', fontWeight: '800', cursor: 'pointer' }}
          >
            🗑️ Excluir Dia
          </button>
          <button 
            onClick={() => { setAcaoPendente('editar'); setModalSeguranca(true); }}
            style={{ backgroundColor: '#22c55e', color: 'white', padding: '12px 24px', borderRadius: '14px', border: 'none', fontWeight: '900', cursor: 'pointer' }}
          >
            💾 Salvar/Editar
          </button>
        </div>
      </header>

      {/* MODAL DE SEGURANÇA */}
      {modalSeguranca && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '24px', width: '90%', maxWidth: '400px', textAlign: 'center' }}>
            <h3 style={{ color: '#1e3a8a', marginBottom: '10px' }}>🔒 Confirmação de Segurança</h3>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px' }}>Para {acaoPendente} o diário de <b>{dataLancamento.split('-').reverse().join('/')}</b>, digite sua senha de login:</p>
            <input 
              type="password" 
              placeholder="Sua senha" 
              value={senhaConfirmacao} 
              onChange={(e) => setSenhaConfirmacao(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '2px solid #e2e8f0', marginBottom: '20px', textAlign: 'center' }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setModalSeguranca(false); setSenhaConfirmacao(""); }} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', backgroundColor: '#f1f5f9', fontWeight: 'bold', cursor: 'pointer' }}>Cancelar</button>
              <button 
                onClick={acaoPendente === 'excluir' ? handleExcluirDiario : handleSalvarAvaliacao} 
                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', backgroundColor: acaoPendente === 'excluir' ? '#ef4444' : '#22c55e', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LISTAGEM DE ALUNOS - MANTIDA IGUAL */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '40px' }}>
        {alunos.map((aluno) => {
          const reg = registrosLocal[aluno.id] || { presenca: null, estrelas: 0 };
          return (
            <div key={aluno.id} style={{ backgroundColor: corAtual.bg, padding: '18px 24px', borderRadius: '20px', border: `2px solid ${corAtual.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <img src={aluno.foto_url || 'https://via.placeholder.com/50'} style={{ width: '50px', height: '50px', borderRadius: '14px', objectFit: 'cover', border: '2px solid white' }} />
                <span style={{ fontWeight: '800', color: corAtual.text, fontSize: '16px' }}>{aluno.nome.split(' ')[0]}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {[1, 2, 3, 4, 5].map(num => (
                    <span key={num} onClick={() => handleEstrelasLocal(aluno.id, num)} style={{ cursor: 'pointer', fontSize: '22px', color: num <= reg.estrelas ? '#fbbf24' : '#e2e8f0' }}>★</span>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {reg.presenca === null ? (
                    <>
                      <button onClick={() => handlePresencaLocal(aluno.id, true)} style={{ width: '38px', height: '38px', borderRadius: '10px', border: 'none', backgroundColor: 'white', color: '#15803d', fontWeight: '900', cursor: 'pointer' }}>P</button>
                      <button onClick={() => handlePresencaLocal(aluno.id, false)} style={{ width: '38px', height: '38px', borderRadius: '10px', border: 'none', backgroundColor: 'white', color: '#b91c1c', fontWeight: '900', cursor: 'pointer' }}>F</button>
                    </>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ width: '40px', height: '40px', borderRadius: '10px', fontWeight: '900', backgroundColor: reg.presenca ? '#22c55e' : '#ef4444', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{reg.presenca ? 'P' : 'F'}</span>
                      <button onClick={() => handlePresencaLocal(aluno.id, null)} style={{ background: 'none', border: 'none', color: corAtual.text, fontSize: '10px', textDecoration: 'underline', cursor: 'pointer', fontWeight: '800' }}>Desfazer</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* TABELA MENSAL - MANTIDA IGUAL */}
      <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflowX: 'auto' }}>
        <h3 style={{ marginBottom: '20px', color: '#1e3a8a', fontWeight: '800' }}>Resumo Mensal de Frequência</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '10px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>Aluno</th>
              {[...Array(diasNoMes)].map((_, i) => (
                <th key={i} style={{ padding: '5px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', width: '20px' }}>{i + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {alunos.map(aluno => (
              <tr key={aluno.id}>
                <td style={{ padding: '10px', border: '1px solid #e2e8f0', fontWeight: '700' }}>{aluno.nome.split(' ')[0]}</td>
                {[...Array(diasNoMes)].map((_, i) => {
                  const dia = (i + 1).toString().padStart(2, '0');
                  const reg = frequenciaMensal.find(f => f.aluno_id === aluno.id && f.data.endsWith(`-${dia}`));
                  return (
                    <td key={i} style={{ border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 'bold', color: reg ? (reg.presente ? '#22c55e' : '#ef4444') : '#d1d5db' }}>
                      {reg ? (reg.presente ? 'P' : 'F') : '.'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}