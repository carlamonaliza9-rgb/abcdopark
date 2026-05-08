"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

interface FichaAlunoModalProps {
  aluno: any;
  verBoletim: boolean;
  verHistorico: boolean;
  notas: any[];
  historico: any[];
  ehVisitante: boolean;
  mCPF: (v: string) => string;
  mWhatsApp: (v: string) => string;
  onFechar: () => void;
  onEditar: () => void;
  onExcluir: () => void;
  onVerBoletim: (id: string) => void;
  onVerHistorico: (id: string) => void;
  onVoltarParaFicha: () => void;
  onSalvarNota: (id: string, campo: string, valor: string) => void;
  onAdicionarDisciplina: () => void;
  onExcluirDisciplina: (id: string) => void;
  onGerarPDFBoletim: () => void;
  onGerarPDFHistorico: () => void;
  calcularIdade: (data: string) => string;
}

export function FichaAlunoModal(props: FichaAlunoModalProps) {
  const { 
    aluno, verBoletim, verHistorico, notas, historico, ehVisitante, 
    mCPF, mWhatsApp, onFechar, onEditar, onExcluir, onVerBoletim, 
    onVerHistorico, onVoltarParaFicha, onSalvarNota, onAdicionarDisciplina, 
    onExcluirDisciplina, onGerarPDFBoletim, onGerarPDFHistorico,
    calcularIdade 
  } = props;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [mediaEstrelas, setMediaEstrelas] = useState(0);
  const [percentualPresenca, setPercentualPresenca] = useState(100);

  useEffect(() => {
    if (aluno?.id) {
      buscarDadosAdicionais();
    }
  }, [aluno?.id]);

  async function buscarDadosAdicionais() {
    const { data: avs } = await supabase
      .from('avaliacoes')
      .select('estrelas')
      .eq('aluno_id', aluno.id);
    
    if (avs && avs.length > 0) {
      const soma = avs.reduce((acc: number, curr: any) => acc + curr.estrelas, 0);
      setMediaEstrelas(soma / avs.length);
    }

    const { data: freqs } = await supabase
      .from('frequencias')
      .select('presenca')
      .eq('aluno_id', aluno.id);
    
    if (freqs && freqs.length > 0) {
      const presentes = freqs.filter((f: any) => f.presenca).length;
      setPercentualPresenca((presentes / freqs.length) * 100);
    }
  }

  const abrirWhatsApp = (numero: any) => {
    if (!numero) return;
    const apenasNumeros = String(numero).replace(/\D/g, '');
    window.open(`https://wa.me/55${apenasNumeros}`, '_blank');
  };

  if (!aluno) return null;

  const contatos = [
    { 
      nome: aluno.responsavel, 
      whats: aluno.whatsapp, 
      cpf: aluno.responsavel_cpf || aluno.cpf_responsavel,
      tag: aluno.parentesco1 || aluno.parentesco_1 || "Responsável 1", 
      cor: "#db2777", bg: "#fdf2f8" 
    },
    { 
      nome: aluno.responsavel2 || aluno.responsavel_2_nome, 
      whats: aluno.whatsapp2 || aluno.responsavel_2_contato, 
      cpf: aluno.responsavel_2_cpf,
      tag: aluno.parentesco2 || aluno.parentesco_2 || "Responsável 2", 
      cor: "#2563eb", bg: "#eff6ff" 
    },
    { 
      nome: aluno.responsavel3 || aluno.responsavel_3_nome, 
      whats: aluno.whatsapp3 || aluno.responsavel_3_contato, 
      cpf: aluno.responsavel_3_cpf,
      tag: aluno.parentesco3 || aluno.parentesco_3 || "Responsável 3", 
      cor: "#16a34a", bg: "#f0fdf4" 
    }
  ];

  const EstiloLabel: React.CSSProperties = { fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px', display: 'block' };
  const EstiloDado: React.CSSProperties = { fontSize: '14px', color: '#1e293b', fontWeight: '600', margin: 0 };
  const EstiloCard: React.CSSProperties = { backgroundColor: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #f1f5f9' };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '10px' }}>
      <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '24px', width: '95%', maxWidth: '550px', maxHeight: '90vh', overflowY: 'auto' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ position: 'relative', marginBottom: '16px' }}>
            {aluno.foto_url ? <img src={aluno.foto_url} style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #f1f5f9' }} /> : <div style={{ height: '100px', width: '100px', borderRadius: '50%', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', fontSize: '40px' }}>👤</div>}
            {aluno.e_autista && <span style={{ position: 'absolute', bottom: 0, right: 0, fontSize: '20px', backgroundColor: 'white', borderRadius: '50%', padding: '2px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>🧩</span>}
          </div>
          
          <h2 style={{ fontWeight: '800', color: '#0f172a', margin: '0', fontSize: '20px', textAlign: 'center' }}>{aluno.nome}</h2>
          
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px', marginBottom: '24px' }}>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>{calcularIdade(aluno.data_nascimento)}</span>
            <span style={{ color: '#2563eb', fontWeight: 'bold', fontSize: '12px', backgroundColor: '#eff6ff', padding: '2px 10px', borderRadius: '10px' }}>{aluno.turma}</span>
          </div>

          {!verHistorico && !verBoletim ? (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ ...EstiloCard, backgroundColor: '#fffbeb', borderColor: '#fef3c7', textAlign: 'center' }}>
                  <span style={{ ...EstiloLabel, color: '#b45309' }}>Avaliação</span>
                  <p style={{ ...EstiloDado, color: '#92400e' }}>{mediaEstrelas > 0 ? "⭐".repeat(Math.round(mediaEstrelas)) : "S/ Nota"}</p>
                </div>
                <div style={{ ...EstiloCard, textAlign: 'center' }}>
                  <span style={EstiloLabel}>Frequência</span>
                  <p style={{ ...EstiloDado, color: '#0d9488' }}>{percentualPresenca.toFixed(0)}%</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={EstiloCard}>
                  <span style={EstiloLabel}>Nascimento</span>
                  <p style={EstiloDado}>{aluno.data_nascimento ? new Date(aluno.data_nascimento).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : '--'}</p>
                </div>
                <div style={EstiloCard}>
                  <span style={EstiloLabel}>CPF Aluno</span>
                  <p style={EstiloDado}>{mCPF(aluno.cpf_aluno) || '--'}</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ ...EstiloCard, backgroundColor: '#f0fdf4' }}>
                  <span style={{ ...EstiloLabel, color: '#166534' }}>Mensalidade</span>
                  <p style={{ ...EstiloDado, color: '#15803d' }}>{aluno.valor ? parseFloat(aluno.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}</p>
                </div>
                <div style={EstiloCard}>
                  <span style={EstiloLabel}>Vencimento</span>
                  <p style={EstiloDado}>Dia {aluno.vencimento || '--'}</p>
                </div>
              </div>

              <div style={EstiloCard}>
                <span style={{ ...EstiloLabel, marginBottom: '12px' }}>Contatos de Emergência</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {contatos.map((contato, index) => contato.nome && (
                    <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                           <p style={EstiloDado}>{contato.nome}</p>
                           <span style={{ fontSize: '9px', fontWeight: '800', color: contato.cor, backgroundColor: contato.bg, padding: '1px 6px', borderRadius: '4px' }}>{contato.tag}</span>
                        </div>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>{mWhatsApp(contato.whats)} • CPF: {mCPF(contato.cpf)}</span>
                      </div>
                      {contato.whats && (
                        <button onClick={() => abrirWhatsApp(contato.whats)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px', opacity: 0.8 }}>
                          <span style={{ fontSize: '20px' }}>📱</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {aluno.tem_alergia && (
                <div style={{ ...EstiloCard, backgroundColor: '#fff5f5', borderColor: '#fed7d7' }}>
                  <span style={{ ...EstiloLabel, color: '#c53030' }}>⚠️ Alergia</span>
                  <p style={{ ...EstiloDado, color: '#c53030' }}>{aluno.alergia_descricao}</p>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                  <button onClick={() => onVerBoletim(aluno.id)} style={{ padding: '12px', borderRadius: '12px', backgroundColor: '#fefce8', color: '#854d0e', border: '1px solid #fef08a', fontWeight: '700', cursor: 'pointer', fontSize: '11px' }}>📄 BOLETIM</button>
                  <button onClick={() => onVerHistorico(aluno.id)} style={{ padding: '12px', borderRadius: '12px', backgroundColor: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', fontWeight: '700', cursor: 'pointer', fontSize: '11px' }}>💰 PAGAMENTOS</button>
              </div>
            </div>
          ) : (
             <div style={{ width: '100%', marginTop: '20px' }}>
                <button onClick={onVoltarParaFicha} style={{ border: 'none', background: 'none', color: '#2563eb', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px', marginBottom: '15px' }}>← VOLTAR PARA FICHA</button>
             </div>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', width: '100%', marginTop: '24px' }}>
            <button onClick={onFechar} style={{ flex: '1 1 100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', fontWeight: '700', cursor: 'pointer', backgroundColor: 'white', color: '#64748b' }}>FECHAR</button>
            {!ehVisitante && !verBoletim && !verHistorico && (
              <>
                <button onClick={onEditar} style={{ flex: '1 1 70%', padding: '14px', borderRadius: '12px', backgroundColor: '#2563eb', color: 'white', fontWeight: '700', cursor: 'pointer' }}>EDITAR FICHA</button>
                <button onClick={onExcluir} style={{ flex: '1 1 20%', padding: '14px', borderRadius: '12px', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', cursor: 'pointer' }}>🗑️</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}