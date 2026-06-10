"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

interface ModalDetalhesTurmaProps {
  turma: any;
  onClose: () => void;
  onAbrirFichaAluno: (aluno: any) => void;
}

export function ModalDetalhesTurma({ turma, onClose, onAbrirFichaAluno }: ModalDetalhesTurmaProps) {
  const [frequenciaMensal, setFrequenciaMensal] = useState<any[]>([]);
  const [avaliacoesMensais, setAvaliacoesMensais] = useState<any[]>([]); // Novo estado para estrelas
  const [mesAtual, setMesAtual] = useState(new Date().getMonth());
  const [anoAtual, setAnoAtual] = useState(new Date().getFullYear());

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    if (turma?.nome) {
      buscarDadosSincronizados();
    }
  }, [turma?.nome, mesAtual]);

  async function buscarDadosSincronizados() {
    const dataInicio = new Date(anoAtual, mesAtual, 1).toISOString().split('T')[0];
    const dataFim = new Date(anoAtual, mesAtual + 1, 0).toISOString().split('T')[0];

    // 1. Busca Frequência (coluna 'presente')
    const { data: freq } = await supabase
      .from('frequencias')
      .select('*')
      .gte('data', dataInicio)
      .lte('data', dataFim);
    
    // 2. Busca Estrelas (tabela 'avaliacoes', coluna 'data_avaliacao')
    const { data: aval } = await supabase
      .from('avaliacoes')
      .select('*')
      .gte('data_avaliacao', dataInicio)
      .lte('data_avaliacao', dataFim);
    
    if (freq) setFrequenciaMensal(freq);
    if (aval) setAvaliacoesMensais(aval);
  }

  async function alternarFrequencia(alunoId: number, dia: number) {
    const dataObj = new Date(anoAtual, mesAtual, dia);
    const dataFormatada = dataObj.toISOString().split('T')[0];
    
    // Sincronizado para buscar na coluna 'presente'
    const registroExistente = frequenciaMensal.find(f => f.aluno_id === alunoId && f.data === dataFormatada);

    let novoStatus: boolean | null = true;
    if (registroExistente) {
      if (registroExistente.presente === true) {
        novoStatus = false;
      } else {
        novoStatus = null;
      }
    }

    if (novoStatus === null) {
      await supabase.from('frequencias').delete().eq('aluno_id', alunoId).eq('data', dataFormatada);
    } else {
      await supabase.from('frequencias').upsert({
        aluno_id: alunoId,
        data: dataFormatada,
        presente: novoStatus // Nome correto da coluna
      }, { onConflict: 'aluno_id, data' });
    }
    
    buscarDadosSincronizados();
  }

  if (!turma) return null;

  const diasNoMes = new Date(anoAtual, mesAtual + 1, 0).getDate();
  const nomeMes = new Date(anoAtual, mesAtual).toLocaleString('pt-BR', { month: 'long' });

  return (
    <div 
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div 
        style={{ backgroundColor: 'white', borderRadius: '24px', width: '95%', maxWidth: '850px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}
        onClick={(e) => e.stopPropagation()}
      >
        
        <div style={{ backgroundColor: turma.cor, padding: '20px', textAlign: 'center' }}>
          <h2 style={{ margin: 0, color: turma.texto }}>{turma.nome}</h2>
          <button onClick={onClose} style={{ position: 'absolute', top: 15, right: 15, background: 'white', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>✕</button>
        </div>
        
        <div style={{ padding: '25px', overflowY: 'auto' }}>
          <div style={{ marginBottom: '25px' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>📅 Quadro de Horários</h4>
            {turma.horario_url ? (
              <div style={{ border: '2px solid #f1f5f9', borderRadius: '16px', overflow: 'hidden', backgroundColor: '#f8fafc' }}>
                <img src={turma.horario_url} alt="Horário Escolar" style={{ width: '100%', height: 'auto', display: 'block' }} />
              </div>
            ) : (
              <div style={{ padding: '20px', borderRadius: '16px', background: '#f8fafc', border: '2px dashed #e2e8f0', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>Nenhum horário cadastrado para esta turma.</p>
              </div>
            )}
          </div>

          <h4 style={{ fontSize: '14px', color: '#64748b', marginBottom: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>👥 Alunos da Turma</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '30px' }}>
            {turma.alunos?.map((aluno: any) => {
              // Busca as estrelas do dia de hoje para mostrar na lista de alunos do Admin
              const hoje = new Date().toISOString().split('T')[0];
              const avalHoje = avaliacoesMensais.find(a => a.aluno_id === aluno.id && a.data_avaliacao === hoje);

              return (
                <div key={aluno.id} onClick={() => onAbrirFichaAluno(aluno)} style={{ padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: '12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontWeight: 'bold', color: '#1f2937' }}>{aluno.nome}</span>
                    {avalHoje && <span style={{ fontSize: '12px', color: '#fbbf24' }}>★ {avalHoje.estrelas}</span>}
                  </div>
                  <div style={{ fontSize: '18px' }}>
                    {aluno.e_autista && "🧩"} {aluno.tem_alergia && "⚠️"}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ borderTop: '2px solid #f1f5f9', paddingTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h4 style={{ fontSize: '14px', color: '#1e3a8a', margin: 0, fontWeight: 'bold', textTransform: 'uppercase' }}>📊 Caderneta de Frequência: {nomeMes}</h4>
              <div style={{ display: 'flex', gap: '5px' }}>
                <button onClick={() => setMesAtual(m => m - 1)} style={{ border: 'none', background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer' }}>◀</button>
                <button onClick={() => setMesAtual(m => m + 1)} style={{ border: 'none', background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer' }}>▶</button>
              </div>
            </div>

            <div style={{ overflowX: 'auto', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc' }}>
                    <th style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'left', minWidth: '120px' }}>ALUNO</th>
                    {[...Array(diasNoMes)].map((_, i) => (
                      <th key={i} style={{ border: '1px solid #e2e8f0', width: '20px', padding: '4px' }}>{i + 1}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {turma.alunos?.map((aluno: any) => (
                    <tr key={aluno.id}>
                      <td style={{ padding: '8px', border: '1px solid #e2e8f0', fontWeight: 'bold' }}>{aluno.nome.split(' ')[0]}</td>
                      {[...Array(diasNoMes)].map((_, i) => {
                        const dia = i + 1;
                        const dataComp = `${anoAtual}-${(mesAtual + 1).toString().padStart(2, '0')}-${dia.toString().padStart(2, '0')}`;
                        
                        // LER COLUNA 'presente' PARA O ADMIN
                        const reg = frequenciaMensal.find(f => f.aluno_id === aluno.id && f.data === dataComp);
                        
                        return (
                          <td 
                            key={i} 
                            onClick={() => alternarFrequencia(aluno.id, dia)}
                            style={{ 
                              border: '1px solid #e2e8f0', 
                              textAlign: 'center', 
                              cursor: 'pointer',
                              fontWeight: '900',
                              color: reg ? (reg.presente ? '#22c55e' : '#ef4444') : '#cbd5e1',
                              backgroundColor: reg ? (reg.presente ? '#f0fdf4' : '#fef2f2') : 'transparent'
                            }}
                          >
                            {reg ? (reg.presente ? 'P' : 'F') : '.'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ fontSize: '10px', color: '#94a3b8', marginTop: '10px', fontStyle: 'italic' }}>* Clique em um quadradinho para alterar (P {">"} F {">"} Limpar)</p>
          </div>
        </div>
      </div>
    </div>
  );
}