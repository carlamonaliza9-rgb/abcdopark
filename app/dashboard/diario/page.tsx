"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

export default function DiarioClassePage() {
  const [alunos, setAlunos] = useState<any[]>([]);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [turmaSelecionada, setTurmaSelecionada] = useState("");
  const [dataLancamento, setDataLancamento] = useState(new Date().toISOString().split('T')[0]);
  const [carregando, setCarregando] = useState(false);
  const [ehAdmin, setEhAdmin] = useState(false);
  const [frequenciaMensal, setFrequenciaMensal] = useState<any[]>([]);
  
  const [registrosLocal, setRegistrosLocal] = useState<{[key: string]: { presenca: boolean | null, estrelas: number }}>({});

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    verificarAcesso();
  }, []);

  useEffect(() => {
    if (turmaSelecionada) {
      buscarAlunos();
      if (ehAdmin) buscarDadosMensais();
    }
  }, [turmaSelecionada, dataLancamento, ehAdmin]);

  async function verificarAcesso() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const adminEmails = ['carlamonaliza9@gmail.com', 'diretoria@abcdopark.com'];
      const isAdmin = adminEmails.includes(user.email || "");
      setEhAdmin(isAdmin);
      buscarTurmas(user.email || "", isAdmin);
    }
  }

  async function buscarTurmas(email: string, isAdmin: boolean) {
    let query = supabase.from('Turma').select('*');
    
    // Se não for admin, filtra apenas a turma que tem o e-mail do professor
    if (!isAdmin) {
      query = query.eq('professor_email', email); 
    }

    const { data } = await query;
    if (data && data.length > 0) {
      const ordemHierarquica: { [key: string]: number } = {
        "Maternal": 1, "Jardim I": 2, "Jardim II": 3, "1º Ano": 4, "2º Ano": 5, "3º Ano": 6, "4º Ano": 7, "5º Ano": 8
      };
      const ordenadas = data.sort((a, b) => (ordemHierarquica[a.nome_turma] || 99) - (ordemHierarquica[b.nome_turma] || 99));
      setTurmas(ordenadas);
      setTurmaSelecionada(ordenadas[0].nome_turma);
    }
  }

  async function buscarAlunos() {
    setCarregando(true);
    const { data } = await supabase.from('alunos').select('id, nome, foto_url').eq('turma', turmaSelecionada).order('nome', { ascending: true });
    if (data) {
      setAlunos(data);
      const inicial: any = {};
      data.forEach(a => { inicial[a.id] = { presenca: null, estrelas: 0 }; });
      setRegistrosLocal(inicial);
    }
    setCarregando(false);
  }

  async function buscarDadosMensais() {
    const anoMes = dataLancamento.substring(0, 7); // Pega "YYYY-MM"
    const { data } = await supabase.from('frequencias').select('*').gte('data', `${anoMes}-01`).lte('data', `${anoMes}-31`);
    if (data) setFrequenciaMensal(data);
  }

  async function salvarNoBanco(alunoId: number, tipo: 'frequencia' | 'estrelas', valor: any) {
    if (tipo === 'frequencia') {
      await supabase.from('frequencias').upsert({ aluno_id: alunoId, data: dataLancamento, presenca: valor }, { onConflict: 'aluno_id, data' });
      if (ehAdmin) buscarDadosMensais();
    } else {
      await supabase.from('avaliacoes').upsert({ aluno_id: alunoId, data: dataLancamento, estrelas: valor }, { onConflict: 'aluno_id, data' });
    }
  }

  const handlePresenca = (alunoId: number, status: boolean | null) => {
    setRegistrosLocal(prev => ({ ...prev, [alunoId]: { ...prev[alunoId], presenca: status } }));
    if (status !== null) salvarNoBanco(alunoId, 'frequencia', status);
  };

  const handleEstrelas = (alunoId: number, qtd: number) => {
    setRegistrosLocal(prev => ({ ...prev, [alunoId]: { ...prev[alunoId], estrelas: qtd } }));
    salvarNoBanco(alunoId, 'estrelas', qtd);
  };

  const obterCores = (turmaNome: string) => {
    const cores: { [key: string]: { border: string; bg: string; text: string } } = { 
      "Maternal": { border: "#b9e2f5", bg: "#f0f9ff", text: "#0369a1" }, 
      "Jardim I": { border: "#c2f0d5", bg: "#f0fdf4", text: "#15803d" }, 
      "Jardim II": { border: "#f7c8e0", bg: "#fdf2f8", text: "#9d174d" },
      "1º Ano": { border: "#d7c0f0", bg: "#f5f3ff", text: "#6d28d9" }, 
      "2º Ano": { border: "#f9d9b4", bg: "#fff7ed", text: "#c2410c" }, 
      "3º Ano": { border: "#c5c5fc", bg: "#eef2ff", text: "#4338ca" },
      "4º Ano": { border: "#b4eaea", bg: "#f0fdfa", text: "#0f766e" }, 
      "5º Ano": { border: "#f9e89d", bg: "#fefce8", text: "#854d0e" }
    };
    return cores[turmaNome] || { border: "#e2e8f0", bg: "#ffffff", text: "#1e293b" };
  };

  const corAtual = obterCores(turmaSelecionada);

  return (
    <div style={{ padding: '32px 20px', maxWidth: '1100px', margin: '0 auto', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '900', color: '#1e3a8a' }}>Diário de Classe 📒</h1>
        <p style={{ color: '#64748b' }}>{ehAdmin ? "Visão Administrativa" : "Lançamento do Professor"}</p>
      </header>

      {/* Cards de Filtro */}
      <div style={{ display: 'flex', gap: '15px', marginBottom: '32px', backgroundColor: 'white', padding: '20px', borderRadius: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>Turma</label>
          <select value={turmaSelecionada} onChange={(e) => setTurmaSelecionada(e.target.value)} style={{ padding: '12px', borderRadius: '12px', border: '2px solid #f1f5f9', fontWeight: '700' }}>
            {turmas.map(t => <option key={t.nome_turma} value={t.nome_turma}>{t.nome_turma}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>Data</label>
          <input type="date" value={dataLancamento} onChange={(e) => setDataLancamento(e.target.value)} style={{ padding: '12px', borderRadius: '12px', border: '2px solid #f1f5f9', fontWeight: '600' }} />
        </div>
      </div>

      {/* LISTA DE CARDS (VISÍVEL PARA TODOS) */}
      <div style={{ display: 'grid', gridTemplateColumns: ehAdmin ? '1fr' : '1fr', gap: '12px', marginBottom: '40px' }}>
        {alunos.map((aluno) => {
          const reg = registrosLocal[aluno.id] || { presenca: null, estrelas: 0 };
          return (
            <div key={aluno.id} style={{ backgroundColor: corAtual.bg, padding: '18px 24px', borderRadius: '20px', border: `2px solid ${corAtual.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <img src={aluno.foto_url || 'https://via.placeholder.com/50'} style={{ width: '50px', height: '50px', borderRadius: '14px', objectFit: 'cover', border: '2px solid white' }} />
                <span style={{ fontWeight: '800', color: corAtual.text, fontSize: '16px' }}>{aluno.nome.split(' ')[0]}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                <div style={{ display: 'flex', gap: '4px', backgroundColor: 'rgba(255,255,255,0.5)', padding: '8px 12px', borderRadius: '12px' }}>
                  {[1, 2, 3, 4, 5].map(num => (
                    <span key={num} onClick={() => handleEstrelas(aluno.id, num)} style={{ cursor: 'pointer', fontSize: '22px', color: num <= reg.estrelas ? '#fbbf24' : '#d1d5db' }}>★</span>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {reg.presenca === null ? (
                    <>
                      <button onClick={() => handlePresenca(aluno.id, true)} style={{ width: '38px', height: '38px', borderRadius: '10px', border: 'none', backgroundColor: 'white', color: '#15803d', fontWeight: '900', cursor: 'pointer' }}>P</button>
                      <button onClick={() => handlePresenca(aluno.id, false)} style={{ width: '38px', height: '38px', borderRadius: '10px', border: 'none', backgroundColor: 'white', color: '#b91c1c', fontWeight: '900', cursor: 'pointer' }}>F</button>
                    </>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ width: '40px', height: '40px', borderRadius: '10px', fontWeight: '900', backgroundColor: reg.presenca ? '#22c55e' : '#ef4444', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{reg.presenca ? 'P' : 'F'}</span>
                      <button onClick={() => handlePresenca(aluno.id, null)} style={{ background: 'none', border: 'none', color: corAtual.text, fontSize: '10px', textDecoration: 'underline', cursor: 'pointer', fontWeight: '800' }}>Desfazer</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* TABELA DE CADERNETA (SÓ ADMIN VÊ) */}
      {ehAdmin && (
        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflowX: 'auto' }}>
          <h3 style={{ marginBottom: '20px', color: '#1e3a8a', fontWeight: '800' }}>Relatório Mensal de Frequência</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '10px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>Aluno</th>
                {[...Array(31)].map((_, i) => (
                  <th key={i} style={{ padding: '5px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', width: '20px' }}>{i + 1}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {alunos.map(aluno => (
                <tr key={aluno.id}>
                  <td style={{ padding: '10px', border: '1px solid #e2e8f0', fontWeight: '700' }}>{aluno.nome.split(' ')[0]}</td>
                  {[...Array(31)].map((_, i) => {
                    const dia = (i + 1).toString().padStart(2, '0');
                    const reg = frequenciaMensal.find(f => f.aluno_id === aluno.id && f.data.endsWith(`-${dia}`));
                    return (
                      <td key={i} style={{ 
                        border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 'bold',
                        color: reg ? (reg.presenca ? '#22c55e' : '#ef4444') : '#d1d5db'
                      }}>
                        {reg ? (reg.presenca ? 'P' : 'F') : '.'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}