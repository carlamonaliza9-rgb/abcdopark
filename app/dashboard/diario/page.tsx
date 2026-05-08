"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

export default function DiarioClassePage() {
  const [alunos, setAlunos] = useState<any[]>([]);
  const [turmaSelecionada, setTurmaSelecionada] = useState("");
  const [dataLancamento, setDataLancamento] = useState(new Date().toISOString().split('T')[0]);
  const [carregando, setCarregando] = useState(true);
  const [frequenciaMensal, setFrequenciaMensal] = useState<any[]>([]);
  
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
        // UNIFICADO: Busca na tabela mestre 'turmas_info' usando o e-mail logado
        const { data: turmaData } = await supabase
          .from('turmas_info') 
          .select('nome_turma')
          .eq('email_prof_fixo_1', user.email)
          .maybeSingle();

        if (turmaData) {
          setTurmaSelecionada(turmaData.nome_turma);
        }
      }
      setCarregando(false);
    }
    identificarProfessor();
  }, []);

  useEffect(() => {
    if (turmaSelecionada) {
      buscarAlunos();
      buscarDadosMensais();
    }
  }, [turmaSelecionada, dataLancamento]);

  async function buscarAlunos() {
    const { data } = await supabase
      .from('alunos')
      .select('id, nome, foto_url')
      .eq('turma', turmaSelecionada)
      .order('nome', { ascending: true });
    
    if (data) {
      setAlunos(data);
      const inicial: any = {};
      data.forEach(a => {
        inicial[a.id] = { presenca: null, estrelas: 0 };
      });
      setRegistrosLocal(inicial);
    }
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

  async function salvarNoBanco(alunoId: number, tipo: 'frequencia' | 'estrelas', valor: any) {
    if (tipo === 'frequencia') {
      await supabase.from('frequencias').upsert({
        aluno_id: alunoId,
        data: dataLancamento,
        presenca: valor
      }, { onConflict: 'aluno_id, data' });
      buscarDadosMensais();
    } else {
      await supabase.from('avaliacoes').upsert({
        aluno_id: alunoId,
        data: dataLancamento,
        estrelas: valor
      }, { onConflict: 'aluno_id, data' });
    }
  }

  const handlePresenca = (alunoId: number, status: boolean | null) => {
    setRegistrosLocal(prev => ({
      ...prev,
      [alunoId]: { ...prev[alunoId], presenca: status }
    }));
    if (status !== null) salvarNoBanco(alunoId, 'frequencia', status);
  };

  const handleEstrelas = (alunoId: number, qtd: number) => {
    setRegistrosLocal(prev => ({
      ...prev,
      [alunoId]: { ...prev[alunoId], estrelas: qtd }
    }));
    salvarNoBanco(alunoId, 'estrelas', qtd);
  };

  const obterCores = (turmaNome: string) => {
    const cores: { [key: string]: { border: string; bg: string; text: string } } = { 
      "Maternal": { border: "#b9e2f5", bg: "#f0f9ff", text: "#0369a1" }, 
      "Jardim I": { border: "#c2f0d5", bg: "#f0fdf4", text: "#15803d" }, 
      "Jardim II": { border: "#f7c8e0", bg: "#fdf2f8", text: "#9d174d" },
      "1º Ano": { border: "#d7c0f0", bg: "#f5f3ff", text: "#6d28d9" },
      "2º Ano": { border: "#f9d9b4", bg: "#fff7ed", text: "#c2410c" },
      "3º Ano": { border: "#c5c5fc", bg: "#eef2ff", text: "#4338ca" }
    };
    return cores[turmaNome] || { border: "#e2e8f0", bg: "#ffffff", text: "#1e293b" };
  };

  const corAtual = obterCores(turmaSelecionada);
  const diasNoMes = new Date(parseInt(dataLancamento.split('-')[0]), parseInt(dataLancamento.split('-')[1]), 0).getDate();

  if (carregando) return <div style={{ textAlign: 'center', padding: '100px', color: '#1e3a8a', fontWeight: 'bold' }}>Carregando seu Diário...</div>;

  return (
    <div style={{ padding: '32px 20px', maxWidth: '1000px', margin: '0 auto', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '900', color: '#1e3a8a' }}>Meu Diário de Classe 📒</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '15px' }}>
          <div style={{ backgroundColor: corAtual.bg, border: `2px solid ${corAtual.border}`, color: corAtual.text, padding: '10px 20px', borderRadius: '12px', fontWeight: '800' }}>
            Turma: {turmaSelecionada || "Não localizada"}
          </div>
          <input 
            type="date" 
            value={dataLancamento} 
            onChange={(e) => setDataLancamento(e.target.value)} 
            style={{ padding: '10px', borderRadius: '12px', border: '2px solid #e2e8f0', fontWeight: '600', outline: 'none', color: '#475569' }} 
          />
        </div>
      </header>

      {!turmaSelecionada && !carregando && (
         <div style={{ padding: '20px', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '12px', fontWeight: 'bold', textAlign: 'center' }}>
            ⚠️ Nenhuma turma vinculada ao e-mail logado na tabela 'turmas_info'.
         </div>
      )}

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
                <div style={{ display: 'flex', gap: '4px', backgroundColor: 'rgba(255,255,255,0.5)', padding: '8px 12px', borderRadius: '12px' }}>
                  {[1, 2, 3, 4, 5].map(num => (
                    <span key={num} onClick={() => handleEstrelas(aluno.id, num)} style={{ cursor: 'pointer', fontSize: '22px', color: num <= reg.estrelas ? '#fbbf24' : '#e2e8f0' }}>★</span>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '100px', justifyContent: 'flex-end' }}>
                  {reg.presenca === null ? (
                    <>
                      <button onClick={() => handlePresenca(aluno.id, true)} style={{ width: '38px', height: '38px', borderRadius: '10px', border: 'none', backgroundColor: 'white', color: '#15803d', fontWeight: '900', cursor: 'pointer' }}>P</button>
                      <button onClick={() => handlePresenca(aluno.id, false)} style={{ width: '38px', height: '38px', borderRadius: '10px', border: 'none', backgroundColor: 'white', color: '#b91c1c', fontWeight: '900', cursor: 'pointer' }}>F</button>
                    </>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ width: '40px', height: '40px', borderRadius: '10px', fontWeight: '900', fontSize: '16px', backgroundColor: reg.presenca ? '#22c55e' : '#ef4444', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{reg.presenca ? 'P' : 'F'}</span>
                      <button onClick={() => handlePresenca(aluno.id, null)} style={{ background: 'none', border: 'none', color: corAtual.text, fontSize: '10px', textDecoration: 'underline', cursor: 'pointer', fontWeight: '800' }}>Desfazer</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

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
                    <td key={i} style={{ border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 'bold', color: reg ? (reg.presenca ? '#22c55e' : '#ef4444') : '#d1d5db' }}>
                      {reg ? (reg.presenca ? 'P' : 'F') : '.'}
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