"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

export default function ConsultaFrequenciaPage() {
  const [alunos, setAlunos] = useState<any[]>([]);
  const [turmaSelecionada, setTurmaSelecionada] = useState("");
  const [mesFiltro, setMesFiltro] = useState(new Date().toISOString().substring(0, 7)); // Formato YYYY-MM
  const [frequenciaMensal, setFrequenciaMensal] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

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
    }
    identificarProfessor();
  }, []);

  useEffect(() => {
    if (turmaSelecionada) {
      buscarAlunosEFrequencia();
    }
  }, [turmaSelecionada, mesFiltro]);

  // --- FUNÇÃO AUXILIAR DE AUDITORIA (LOGS) ---
  async function registrarLog(acao: string, detalhes: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('logs_sistema').insert([{
          usuario_email: user.email,
          acao: acao,
          tabela: 'frequencias',
          detalhes: detalhes
        }]);
      }
    } catch (e) {
      console.error("Erro ao gerar log de auditoria:", e);
    }
  }

  async function buscarAlunosEFrequencia() {
    setCarregando(true);
    // Busca alunos da turma
    const { data: listaAlunos } = await supabase
      .from('alunos')
      .select('id, nome')
      .eq('turma', turmaSelecionada)
      .order('nome', { ascending: true });

    if (listaAlunos) setAlunos(listaAlunos);

    // Busca frequências do mês selecionado
    const { data: faltas } = await supabase
      .from('frequencias')
      .select('*')
      .gte('data', `${mesFiltro}-01`)
      .lte('data', `${mesFiltro}-31`);

    if (faltas) setFrequenciaMensal(faltas);

    // Registra o log de consulta após carregar os dados na tela
    if (listaAlunos && turmaSelecionada) {
      await registrarLog("CONSULTA", `Consultou o relatório de histórico de frequência mensal da turma ${turmaSelecionada} para o período ${mesFiltro}`);
    }

    setCarregando(false);
  }

  const diasNoMes = new Date(parseInt(mesFiltro.split('-')[0]), parseInt(mesFiltro.split('-')[1]), 0).getDate();
  const nomeMes = new Date(mesFiltro + "-01").toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

  if (carregando && alunos.length === 0) return <div style={{ padding: '50px', textAlign: 'center' }}>Carregando histórico de presenças...</div>;

  return (
    <div style={{ padding: '32px 20px', maxWidth: '1200px', margin: '0 auto', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <header style={{ margin: '0 0 32px 0' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '900', color: '#1e3a8a', margin: 0 }}>Histórico de Frequência 📋</h1>
        <p style={{ color: '#64748b', marginTop: '5px' }}>Consulta mensal de faltas e presenças - {turmaSelecionada}</p>
        
        <div style={{ marginTop: '20px', display: 'flex', gap: '15px', alignItems: 'center' }}>
          <label style={{ fontWeight: 'bold', color: '#475569', fontSize: '14px' }}>Selecionar Mês:</label>
          <input 
            type="month" 
            value={mesFiltro} 
            onChange={(e) => setMesFiltro(e.target.value)} 
            style={{ padding: '10px', borderRadius: '12px', border: '2px solid #e2e8f0', fontWeight: '600', color: '#1e3a8a', outline: 'none' }}
          />
        </div>
      </header>

      <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflowX: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, color: '#1e3a8a', fontWeight: '800', textTransform: 'capitalize' }}>{nomeMes}</h3>
            <div style={{ display: 'flex', gap: '15px', fontSize: '12px', fontWeight: 'bold' }}>
                <span style={{ color: '#22c55e' }}>● Presença (P)</span>
                <span style={{ color: '#ef4444' }}>● Falta (F)</span>
            </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', position: 'sticky', left: 0, zIndex: 10, minWidth: '150px' }}>Aluno</th>
              {[...Array(diasNoMes)].map((_, i) => (
                <th key={i} style={{ padding: '5px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', textAlign: 'center', width: '25px' }}>{i + 1}</th>
              ))}
              <th style={{ padding: '10px', border: '1px solid #e2e8f0', backgroundColor: '#eff6ff', color: '#1e3a8a', textAlign: 'center' }}>Total Faltas</th>
            </tr>
          </thead>
          <tbody>
            {alunos.map(aluno => {
              let totalFaltas = 0;
              return (
                <tr key={aluno.id}>
                  <td style={{ padding: '12px', border: '1px solid #e2e8f0', fontWeight: '700', color: '#334155', backgroundColor: 'white', position: 'sticky', left: 0, zIndex: 5 }}>
                    {aluno.nome.split(' ')[0]} {aluno.nome.split(' ').slice(-1)}
                  </td>
                  {[...Array(diasNoMes)].map((_, i) => {
                    const dia = (i + 1).toString().padStart(2, '0');
                    const reg = frequenciaMensal.find(f => f.aluno_id === aluno.id && f.data === `${mesFiltro}-${dia}`);
                    
                    if (reg && reg.presente === false) totalFaltas++;

                    return (
                      <td key={i} style={{ border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 'bold', color: reg ? (reg.presente ? '#22c55e' : '#ef4444') : '#d1d5db' }}>
                        {reg ? (reg.presente ? 'P' : 'F') : '-'}
                      </td>
                    );
                  })}
                  <td style={{ border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: '800', color: totalFaltas > 3 ? '#ef4444' : '#64748b', backgroundColor: '#f8fafc' }}>
                    {totalFaltas}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      <button 
        onClick={() => window.print()} 
        style={{ marginTop: '30px', padding: '12px 24px', borderRadius: '12px', border: 'none', backgroundColor: '#1e3a8a', color: 'white', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
      >
        🖨️ Imprimir Relatório
      </button>
    </div>
  );
}