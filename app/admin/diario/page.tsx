"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

export default function DiarioClasseAdminPage() {
  const router = useRouter();
  const [alunos, setAlunos] = useState<any[]>([]);
  const [turmasDisponiveis, setTurmasDisponiveis] = useState<any[]>([]);
  const [turmaSelecionada, setTurmaSelecionada] = useState("");
  const [dataLancamento, setDataLancamento] = useState(new Date().toISOString().split('T')[0]);
  const [carregando, setCarregando] = useState(true);
  const [frequenciaMensal, setFrequenciaMensal] = useState<any[]>([]);
  const [salvando, setSalvando] = useState(false);
  
  const [modalSeguranca, setModalSeguranca] = useState(false);
  const [senhaConfirmacao, setSenhaConfirmacao] = useState("");
  const [acaoPendente, setAcaoPendente] = useState<'excluir' | 'editar' | null>(null);

  const [alertaEvasao, setAlertaEvasao] = useState<{ aberto: boolean; nomeAluno: string } | null>(null);
  const [registrosLocal, setRegistrosLocal] = useState<{[key: string]: { presenca: boolean | null, estrelas: number }}>({});

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function verificarAcessoAdmin() {
      setCarregando(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");

      const { data: perfil } = await supabase.from('perfis').select('cargo').eq('id', user.id).single();
      const email = user.email || "";
      const ehAdmin = email === 'carlamonaliza9@gmail.com' || email === 'diretoria@abcdopark.com' || perfil?.cargo === 'Admin';

      if (!ehAdmin) return router.push("/dashboard");

      // Carrega todas as turmas para o Admin escolher
      const { data: turmas } = await supabase.from('turmas_info').select('nome_turma').order('nome_turma');
      if (turmas) {
        setTurmasDisponiveis(turmas);
        if (turmas.length > 0) setTurmaSelecionada(turmas[0].nome_turma);
      }
      setCarregando(false);
    }
    verificarAcessoAdmin();
  }, [router]);

  useEffect(() => {
    if (turmaSelecionada) buscarAlunos();
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

  async function confirmarSeguranca() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return false;
    const { error } = await supabase.auth.signInWithPassword({ email: user.email, password: senhaConfirmacao });
    if (error) { alert("Senha incorreta!"); return false; }
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
      setModalSeguranca(false); setSenhaConfirmacao(""); carregarDadosSalvosDoDia(); buscarDadosMensais();
    } catch (e) { alert("Erro ao excluir."); } finally { setSalvando(false); }
  }

  async function handleSalvarNovo() {
    setSalvando(true);
    try {
      for (const alunoId in registrosLocal) {
        const reg = registrosLocal[alunoId];
        if (reg.presenca !== null) {
          await supabase.from('frequencias').upsert({ aluno_id: Number(alunoId), data: dataLancamento, presente: reg.presenca }, { onConflict: 'aluno_id, data' });
        }
        await supabase.from('avaliacoes').upsert({ aluno_id: Number(alunoId), data_avaliacao: dataLancamento, estrelas: Number(reg.estrelas), comentario: "" }, { onConflict: 'aluno_id, data_avaliacao' });
      }
      buscarDadosMensais();
    } catch (error) { alert("Erro ao salvar."); } finally { setSalvando(false); }
  }

  const handlePresencaLocal = (alunoId: number, status: boolean | null) => {
    setRegistrosLocal(prev => ({ ...prev, [alunoId]: { ...prev[alunoId], presenca: status } }));
  };

  const handleEstrelasLocal = (alunoId: number, qtd: number) => {
    setRegistrosLocal(prev => ({ ...prev, [alunoId]: { ...prev[alunoId], estrelas: qtd } }));
  };

  if (carregando) return <div style={{ padding: '40px', textAlign: 'center' }}>Carregando diário administrativo...</div>;

  return (
    <div style={{ padding: '32px 20px', maxWidth: '1000px', margin: '0 auto', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '900', color: '#1e3a8a' }}>Gestão de Diários 📒</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '15px' }}>
            <select 
              value={turmaSelecionada} 
              onChange={(e) => setTurmaSelecionada(e.target.value)}
              style={{ padding: '10px', borderRadius: '12px', border: '2px solid #e2e8f0', fontWeight: '800', color: '#1e3a8a', outline: 'none' }}
            >
              {turmasDisponiveis.map(t => <option key={t.nome_turma} value={t.nome_turma}>{t.nome_turma}</option>)}
            </select>
            <input type="date" value={dataLancamento} onChange={(e) => setDataLancamento(e.target.value)} style={{ padding: '10px', borderRadius: '12px', border: '2px solid #e2e8f0', fontWeight: '600', color: '#475569' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => { setAcaoPendente('excluir'); setModalSeguranca(true); }} style={{ backgroundColor: '#ef4444', color: 'white', padding: '12px 20px', borderRadius: '14px', border: 'none', fontWeight: '800', cursor: 'pointer' }}>🗑️ Excluir</button>
          <button onClick={handleSalvarNovo} disabled={salvando} style={{ backgroundColor: '#22c55e', color: 'white', padding: '12px 24px', borderRadius: '14px', border: 'none', fontWeight: '900', cursor: 'pointer' }}>{salvando ? "Salvando..." : "💾 Salvar"}</button>
        </div>
      </header>

      {/* MODAL DE SEGURANÇA */}
      {modalSeguranca && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '24px', width: '90%', maxWidth: '400px', textAlign: 'center' }}>
            <h3 style={{ color: '#1e3a8a', marginBottom: '10px' }}>🔒 Segurança Admin</h3>
            <input type="password" placeholder="Sua senha" value={senhaConfirmacao} onChange={(e) => setSenhaConfirmacao(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '2px solid #e2e8f0', marginBottom: '20px', textAlign: 'center' }} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setModalSeguranca(false)} style={{ flex: 1, padding: '12px', borderRadius: '12px', backgroundColor: '#f1f5f9', fontWeight: 'bold' }}>Cancelar</button>
              <button onClick={handleExcluirDiario} style={{ flex: 1, padding: '12px', borderRadius: '12px', backgroundColor: '#ef4444', color: 'white', fontWeight: 'bold' }}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* LISTAGEM DE ALUNOS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '40px' }}>
        {alunos.map((aluno) => {
          const reg = registrosLocal[aluno.id] || { presenca: null, estrelas: 0 };
          return (
            <div key={aluno.id} style={{ backgroundColor: 'white', padding: '18px 24px', borderRadius: '20px', border: `2px solid #e2e8f0`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <img src={aluno.foto_url || 'https://via.placeholder.com/50'} style={{ width: '50px', height: '50px', borderRadius: '14px', objectFit: 'cover' }} />
                <span style={{ fontWeight: '800', color: '#1e3a8a' }}>{aluno.nome.split(' ')[0]}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {[1, 2, 3, 4, 5].map(num => (
                    <span key={num} onClick={() => handleEstrelasLocal(aluno.id, num)} style={{ cursor: 'pointer', fontSize: '22px', color: num <= reg.estrelas ? '#fbbf24' : '#e2e8f0' }}>★</span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => handlePresencaLocal(aluno.id, true)} style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: reg.presenca === true ? '#22c55e' : 'white', color: reg.presenca === true ? 'white' : '#15803d', border: '1px solid #e2e8f0', fontWeight: '900' }}>P</button>
                  <button onClick={() => handlePresencaLocal(aluno.id, false)} style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: reg.presenca === false ? '#ef4444' : 'white', color: reg.presenca === false ? 'white' : '#b91c1c', border: '1px solid #e2e8f0', fontWeight: '900' }}>F</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}