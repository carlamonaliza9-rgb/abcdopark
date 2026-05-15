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
  userEmail?: string | null; // CIRURGIA: Tornado opcional (?) para destravar o Vercel
  mCPF: (v: string) => string;
  mWhatsApp: (v: string) => string;
  onFechar: () => void;
  onEditar: () => void;
  onExcluir: () => void;
  onVerBoletim: (id: string, ano?: string) => void;
  onVerHistorico: (id: string, ano?: string) => void;
  onVoltarParaFicha: () => void;
  onSalvarNota: (id: string, campo: string, valor: string) => void;
  onAdicionarDisciplina: () => void;
  onExcluirDisciplina: (id: string) => void;
  onGerarPDFBoletim: () => void;
  onGerarPDFHistorico: () => void;
  onEditarPagamento?: (pagamento: any) => void; // CIRURGIA: Tornado opcional (?) para destravar o Vercel
  onExcluirPagamento?: (id: string) => void; // CIRURGIA: Tornado opcional (?) para destravar o Vercel
  calcularIdade: (data: string) => string;
}

export function FichaAlunoModal(props: FichaAlunoModalProps) {
  const { 
    aluno, verBoletim, verHistorico, notas, historico, ehVisitante, userEmail,
    mCPF, mWhatsApp, onFechar, onEditar, onExcluir, onVerBoletim, 
    onVerHistorico, onVoltarParaFicha, onSalvarNota, onAdicionarDisciplina, 
    onExcluirDisciplina, onGerarPDFBoletim, onGerarPDFHistorico,
    onEditarPagamento, onExcluirPagamento,
    calcularIdade 
  } = props;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [mediaEstrelas, setMediaEstrelas] = useState(0);
  const [percentualPresenca, setPercentualPresenca] = useState(100);
  const [anoSelecionado, setAnoSelecionado] = useState("2026");
  const [anoPagamentoSelecionado, setAnoPagamentoSelecionado] = useState("2026");
  
  const SENHA_MESTRA = "1234";

  useEffect(() => {
    if (aluno?.id) {
      buscarDadosAdicionais();
    }
  }, [aluno?.id]);

  async function buscarDadosAdicionais() {
    const { data: avs } = await supabase
      .from('avaliacoes')
      .select('participacao, comportamento, atividades, socioemocional')
      .eq('aluno_id', aluno.id);
    
    if (avs && avs.length > 0) {
      const somaDasMediasDiarias = avs.reduce((acc: number, curr: any) => {
        const mediaDoDia = (
          (curr.participacao || 0) + 
          (curr.comportamento || 0) + 
          (curr.atividades || 0) + 
          (curr.socioemocional || 0)
        ) / 4;
        return acc + mediaDoDia;
      }, 0);
      setMediaEstrelas(somaDasMediasDiarias / avs.length);
    }

    const { data: freqs } = await supabase
      .from('frequencias')
      .select('presente')
      .eq('aluno_id', aluno.id);
    
    if (freqs && freqs.length > 0) {
      const presentes = freqs.filter((f: any) => f.presente).length;
      setPercentualPresenca((presentes / freqs.length) * 100);
    }
  }

  const abrirWhatsApp = (numero: any) => {
    if (!numero) return;
    const apenasNumeros = String(numero).replace(/\D/g, '');
    window.open(`https://wa.me/55${apenasNumeros}`, '_blank');
  };

  const obterMediaFinal = (n: any) => {
    const bimestres = [n.bimestre1, n.bimestre2, n.bimestre3, n.bimestre4].map(v => parseFloat(v) || 0);
    const soma = bimestres.reduce((acc, curr) => acc + curr, 0);
    return (soma / 4).toFixed(1);
  };

  const extrairFormaPagamento = (detalhes: any) => {
    if (!detalhes) return null;
    const metodos = Object.keys(detalhes).filter(key => parseFloat(detalhes[key]) > 0);
    return metodos.length > 0 ? metodos.join(" + ").toUpperCase() : null;
  };

  if (!aluno) return null;

  const contatos = [
    { nome: aluno.responsavel, whats: aluno.whatsapp, cpf: aluno.responsavel_cpf || aluno.cpf_responsavel, profissao: aluno.profissao_responsavel || aluno.responsavel_profissao, tag: aluno.parentesco1 || aluno.parentesco_1 || "Responsável 1", cor: "#db2777", bg: "#fdf2f8" },
    { nome: aluno.responsavel2 || aluno.responsavel_2_nome, whats: aluno.whatsapp2 || aluno.responsavel_2_contato, cpf: aluno.responsavel_2_cpf || aluno.cpf_responsavel2, profissao: aluno.profissao_responsavel2 || aluno.responsavel_2_profissao, tag: aluno.parentesco2 || aluno.parentesco_2 || "Responsável 2", cor: "#2563eb", bg: "#eff6ff" },
    { nome: aluno.responsavel3 || aluno.responsavel_3_nome, whats: aluno.whatsapp3 || aluno.responsavel_3_contato, cpf: aluno.responsavel_3_cpf, profissao: aluno.profissao_responsavel3, tag: aluno.parentesco3 || aluno.parentesco_3 || "Responsável 3", cor: "#16a34a", bg: "#f0fdf4" }
  ];

  const EstiloLabel: React.CSSProperties = { fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px', display: 'block' };
  const EstiloDado: React.CSSProperties = { fontSize: '14px', color: '#1e293b', fontWeight: '600', margin: 0 };
  const EstiloCard: React.CSSProperties = { backgroundColor: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #f1f5f9' };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '10px' }}>
      <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '24px', width: '95%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ position: 'relative', marginBottom: '20px' }}>
            {aluno.foto_url ? (
              <img src={aluno.foto_url} style={{ width: '140px', height: '140px', borderRadius: '50%', objectFit: 'cover', border: '4px solid #f1f5f9' }} />
            ) : (
              <div style={{ height: '140px', width: '140px', borderRadius: '50%', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', fontSize: '60px' }}>👤</div>
            )}
            {aluno.e_autista && <span style={{ position: 'absolute', bottom: '5px', right: '5px', fontSize: '24px', backgroundColor: 'white', borderRadius: '50%', padding: '3px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>🧩</span>}
          </div>
          
          <h2 style={{ fontWeight: '800', color: '#0f172a', margin: '0', fontSize: '20px', textAlign: 'center' }}>{aluno.nome}</h2>
          
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px', marginBottom: '24px' }}>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>{calcularIdade(aluno.data_nascimento)}</span>
            <span style={{ color: '#2563eb', fontWeight: 'bold', fontSize: '12px', backgroundColor: '#eff6ff', padding: '2px 10px', borderRadius: '10px' }}>{aluno.turma} • {aluno.turno || 'Turno não inf.'}</span>
          </div>

          {!verHistorico && !verBoletim ? (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ ...EstiloCard, backgroundColor: '#fffbeb', borderColor: '#fef3c7', textAlign: 'center' }}>
                  <span style={{ ...EstiloLabel, color: '#b45309' }}>Média Pedagógica</span>
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
                <div style={{ ...EstiloCard, backgroundColor: '#f8fafc' }}>
                  <span style={{ ...EstiloLabel }}>Mensalidade</span>
                  <p style={{ ...EstiloDado, color: '#15803d' }}>{aluno.valor ? parseFloat(aluno.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}</p>
                </div>
                <div style={EstiloCard}>
                  <span style={EstiloLabel}>Vencimento</span>
                  <p style={EstiloDado}>Dia {aluno.vencimento || '--'}</p>
                </div>
              </div>

              <div style={EstiloCard}>
                <span style={{ ...EstiloLabel, marginBottom: '12px' }}>Contatos e Responsáveis</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {contatos.map((contato, index) => contato.nome && (
                    <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <p style={EstiloDado}>{contato.nome}</p>
                            <span style={{ fontSize: '9px', fontWeight: '800', color: contato.cor, backgroundColor: contato.bg, padding: '1px 6px', borderRadius: '4px' }}>{contato.tag}</span>
                        </div>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>{mWhatsApp(contato.whats)} • CPF: {mCPF(contato.cpf)}</span>
                        {contato.profissao && <span style={{ fontSize: '11px', color: '#475569', fontWeight: '600' }}>💼 Profissão: {contato.profissao}</span>}
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

              <div style={{ ...EstiloCard, backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}>
                <span style={{ ...EstiloLabel, color: '#15803d' }}>Endereço Residencial</span>
                <p style={EstiloDado}>
                  {aluno.endereco ? `${aluno.endereco}, ${aluno.numero || 'S/N'}` : 'Endereço não cadastrado'}
                </p>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
                  {aluno.bairro ? `${aluno.bairro} • ${aluno.cidade}-${aluno.estado}` : ''}
                  {aluno.cep ? ` • CEP: ${aluno.cep}` : ''}
                </span>
              </div>

              {aluno.observacoes && (
                <div style={{ ...EstiloCard, backgroundColor: '#f8fafc', borderLeft: '4px solid #2563eb' }}>
                  <span style={{ ...EstiloLabel, color: '#2563eb' }}>Observações Pedagógicas</span>
                  <p style={{ ...EstiloDado, fontSize: '12px', whiteSpace: 'pre-wrap', color: '#475569', fontWeight: '500' }}>{aluno.observacoes}</p>
                </div>
              )}

              {aluno.tem_alergia && (
                <div style={{ ...EstiloCard, backgroundColor: '#fff5f5', borderColor: '#fed7d7' }}>
                  <span style={{ ...EstiloLabel, color: '#c53030' }}>⚠️ Alergia</span>
                  <p style={{ ...EstiloDado, color: '#c53030' }}>{aluno.alergia_descricao}</p>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                  <button onClick={() => onVerBoletim(aluno.id, anoSelecionado)} style={{ padding: '12px', borderRadius: '12px', backgroundColor: '#fefce8', color: '#854d0e', border: '1px solid #fef08a', fontWeight: '700', cursor: 'pointer', fontSize: '11px' }}>📄 BOLETIM</button>
                  <button onClick={() => onVerHistorico(aluno.id, anoPagamentoSelecionado)} style={{ padding: '12px', borderRadius: '12px', backgroundColor: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', fontWeight: '700', cursor: 'pointer', fontSize: '11px' }}>💰 PAGAMENTOS</button>
              </div>
            </div>
          ) : verBoletim ? (
            <div style={{ width: '100%', marginTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <h3 style={{ fontSize: '14px', fontWeight: 'bold', margin: 0 }}>Boletim</h3>
                      <select 
                        value={anoSelecionado} 
                        onChange={(e) => {
                          setAnoSelecionado(e.target.value);
                          onVerBoletim(aluno.id, e.target.value);
                        }}
                        style={{ padding: '4px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 'bold', outline: 'none' }}
                      >
                        <option value="2026">2026</option>
                        <option value="2025">2025</option>
                        <option value="2024">2024</option>
                      </select>
                      <button onClick={onGerarPDFBoletim} style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>📄 PDF</button>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        {!ehVisitante && <button onClick={onAdicionarDisciplina} style={{ color: '#2563eb', border: '1px solid #2563eb', padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold', background: 'none', cursor: 'pointer' }}>+ MATÉRIA</button>}
                        <button onClick={onVoltarParaFicha} style={{ border: 'none', background: 'none', color: '#64748b', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>VOLTAR</button>
                    </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f1f5f9' }}>
                                <th style={{ padding: '8px', textAlign: 'left' }}>DISCIPLINA</th>
                                <th>1ºB</th><th>2ºB</th><th style={{ color: '#ef4444' }}>R1</th>
                                <th>3ºB</th><th>4ºB</th><th style={{ color: '#ef4444' }}>R2</th>
                                <th style={{ color: '#2563eb' }}>MÉD</th>
                                {!ehVisitante && <th style={{ padding: '8px' }}></th>}
                            </tr>
                        </thead>
                        <tbody>
                            {notas.length > 0 ? notas.map((n) => {
                                const media = obterMediaFinal(n);
                                return (
                                  <tr key={n.id} style={{ borderBottom: '1px solid #eee' }}>
                                      <td style={{ padding: '8px', fontWeight: 'bold' }}>{n.disciplina}</td>
                                      {['bimestre1', 'bimestre2', 'recuperacao1', 'bimestre3', 'bimestre4', 'recuperacao2'].map((b) => (
                                          <td key={b} style={{ padding: '4px', textAlign: 'center' }}>
                                              <input 
                                                type="text" 
                                                defaultValue={n[b] || ""} 
                                                onBlur={(e) => onSalvarNota(n.id, b, e.target.value)} 
                                                disabled={ehVisitante} 
                                                style={{ 
                                                  width: '30px', 
                                                  textAlign: 'center', 
                                                  border: '1px solid #e2e8f0', 
                                                  borderRadius: '4px', 
                                                  padding: '2px', 
                                                  backgroundColor: b.includes('recuperacao') ? '#fff5f5' : 'white',
                                                  color: parseFloat(n[b]) < 7 ? '#ef4444' : '#1e293b',
                                                  fontWeight: 'bold'
                                                }} 
                                              />
                                          </td>
                                      ))}
                                      <td style={{ textAlign: 'center', fontWeight: '900', color: parseFloat(media) < 7 ? '#ef4444' : '#2563eb' }}>
                                        {media}
                                      </td>
                                      {!ehVisitante && <td style={{ textAlign: 'center' }}><button onClick={() => onExcluirDisciplina(n.id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>🗑️</button></td>}
                                  </tr>
                                );
                            }) : (
                              <tr>
                                <td colSpan={9} style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Nenhum dado encontrado para o ano {anoSelecionado}.</td>
                              </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
          ) : (
            <div style={{ width: '100%', marginTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 'bold', margin: 0 }}>Histórico</h3>
                  <select 
                    value={anoPagamentoSelecionado} 
                    onChange={(e) => {
                      setAnoPagamentoSelecionado(e.target.value);
                      onVerHistorico(aluno.id, e.target.value);
                    }}
                    style={{ padding: '4px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 'bold', outline: 'none' }}
                  >
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                    <option value="2024">2024</option>
                  </select>
                  <button onClick={onGerarPDFHistorico} style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>📄 EXTRATO</button>
                </div>
                <button onClick={onVoltarParaFicha} style={{ border: 'none', background: 'none', color: '#2563eb', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>VOLTAR</button>
              </div>
              <div style={{ maxHeight: '250px', overflowY: 'auto', backgroundColor: '#f8fafc', borderRadius: '15px', padding: '10px' }}>
                {historico.length > 0 ? historico.map((h, i) => {
                  const forma = extrairFormaPagamento(h.detalhes_metodos);
                  const podeGerenciar = userEmail === 'carlamonaliza9@gmail.com';

                  return (
                    <div key={i} style={{ padding: '10px', borderBottom: '1px solid #e2e8f0', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginRight: '10px' }}>
                          <span style={{ fontWeight: 'bold' }}>{new Date(h.data_pagamento).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</span>
                          <span style={{ color: '#10b981', fontWeight: 'bold' }}>R$ {h.valor_total?.toLocaleString('pt-BR')}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '3px' }}>
                          <p style={{ margin: 0, color: '#64748b', fontSize: '11px' }}>{h.descricao}</p>
                          {forma && (
                            <span style={{ fontSize: '9px', fontWeight: '800', color: '#0369a1', backgroundColor: '#e0f2fe', padding: '1px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>
                              {forma}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {podeGerenciar && (
                        <div style={{ display: 'flex', gap: '8px', marginLeft: '15px', borderLeft: '1px solid #e2e8f0', paddingLeft: '12px' }}>
                          <button 
                            onClick={() => {
                              if (prompt("Digite a Senha Mestra para EDITAR:") === SENHA_MESTRA) {
                                if (onEditarPagamento) onEditarPagamento(h); // CIRURGIA: Check de existência
                              } else {
                                alert("Senha incorreta.");
                              }
                            }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}
                            title="Editar registro"
                          >
                            ✏️
                          </button>
                          <button 
                            onClick={() => {
                              if (prompt("Digite a Senha Mestra para EXCLUIR:") === SENHA_MESTRA) {
                                if(confirm("Deseja realmente excluir este registro permanentemente?")) {
                                  if (onExcluirPagamento) onExcluirPagamento(h.id); // CIRURGIA: Check de existência
                                }
                              } else {
                                alert("Senha incorreta.");
                              }
                            }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}
                            title="Excluir registro"
                          >
                            🗑️
                          </button>
                        </div>
                      )}
                    </div>
                  );
                }) : <p style={{ textAlign: 'center', color: '#64748b', fontSize: '12px', padding: '20px' }}>Nenhum pagamento registrado em {anoPagamentoSelecionado}.</p>}
              </div>
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