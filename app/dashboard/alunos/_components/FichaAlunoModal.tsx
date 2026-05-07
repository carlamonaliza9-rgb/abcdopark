"use client";

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
  // Função para sincronia de dados
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

  const abrirWhatsApp = (numero: any) => {
    if (!numero) return;
    const apenasNumeros = String(numero).replace(/\D/g, '');
    window.open(`https://wa.me/55${apenasNumeros}`, '_blank');
  };

  if (!aluno) return null;

  // Mapeamento organizado dos contatos
  const contatos = [
    { nome: aluno.responsavel, whats: aluno.whatsapp, tag: aluno.parentesco1 || "Mãe", cor: "#db2777", bg: "#fdf2f8" },
    { nome: aluno.responsavel2 || aluno.responsavel_2_nome, whats: aluno.whatsapp2 || aluno.responsavel_2_contato, tag: aluno.parentesco2 || "Pai", cor: "#2563eb", bg: "#eff6ff" },
    { nome: aluno.responsavel3 || aluno.responsavel_3_nome, whats: aluno.whatsapp3 || aluno.responsavel_3_contato, tag: aluno.parentesco3 || "Outro", cor: "#16a34a", bg: "#f0fdf4" }
  ];

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '10px' }}>
      <div style={{ backgroundColor: 'white', padding: 'clamp(15px, 5vw, 32px)', borderRadius: '24px', width: '95%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ position: 'relative', marginBottom: '20px' }}>
            {aluno.foto_url ? <img src={aluno.foto_url} style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', border: '4px solid #f8fafc' }} /> : <div style={{ height: '120px', width: '120px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '40px' }}>👤</div>}
            {aluno.e_autista && <span style={{ position: 'absolute', bottom: 5, right: 5, fontSize: '24px', backgroundColor: 'white', borderRadius: '50%', padding: '2px' }}>🧩</span>}
          </div>
          <h2 style={{ fontWeight: '800', color: '#1e293b', margin: '0', textAlign: 'center' }}>{aluno.nome}</h2>
          
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '5px' }}>
            <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 'bold' }}>{calcularIdade(aluno.data_nascimento)}</span>
            <p style={{ color: '#2563eb', fontWeight: 'bold', fontSize: '14px', backgroundColor: '#eff6ff', padding: '4px 15px', borderRadius: '20px', margin: 0 }}>{aluno.turma}</p>
          </div>

          {!verHistorico && !verBoletim ? (
            <div style={{ width: '100%', marginTop: '25px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '15px' }}>
                  <p style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'bold', margin: '0 0 4px' }}>NASCIMENTO</p>
                  <p style={{ margin: '0', fontWeight: '600', color: '#475569', fontSize: '14px' }}>{aluno.data_nascimento ? new Date(aluno.data_nascimento).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : '--'}</p>
                </div>
                <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '15px' }}>
                  <p style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'bold', margin: '0 0 4px' }}>CPF ALUNO</p>
                  <p style={{ margin: '0', fontWeight: '600', color: '#475569', fontSize: '14px' }}>{mCPF(aluno.cpf_aluno) || '--'}</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ backgroundColor: '#f0fdf4', padding: '12px', borderRadius: '15px', border: '1px solid #dcfce7' }}>
                  <p style={{ fontSize: '10px', color: '#166534', fontWeight: 'bold', margin: '0 0 4px' }}>VALOR MENSALIDADE</p>
                  <p style={{ margin: '0', fontWeight: '800', color: '#15803d', fontSize: '15px' }}>{aluno.valor ? parseFloat(aluno.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}</p>
                </div>
                <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '15px' }}>
                  <p style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'bold', margin: '0 0 4px' }}>VENCIMENTO</p>
                  <p style={{ margin: '0', fontWeight: '600', color: '#475569', fontSize: '14px' }}>Dia {aluno.vencimento || '--'}</p>
                </div>
              </div>

              {/* SEÇÃO DE CONTATOS COM TAGS SINGELAS */}
              <div style={{ backgroundColor: '#f8fafc', padding: '15px', borderRadius: '15px', border: '1px solid #f1f5f9' }}>
                <p style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'bold', margin: '0 0 12px', textTransform: 'uppercase' }}>Contatos de Emergência</p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {contatos.map((contato, index) => contato.nome && (
                    <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '9px', fontWeight: '800', color: contato.cor, backgroundColor: contato.bg, padding: '1px 6px', borderRadius: '4px', alignSelf: 'flex-start', textTransform: 'uppercase' }}>
                          {contato.tag}
                        </span>
                        <p style={{ margin: 0, fontWeight: '700', color: '#475569', fontSize: '13px' }}>{contato.nome}</p>
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
                <div style={{ backgroundColor: '#fff5f5', padding: '15px', borderRadius: '15px', border: '1px solid #fed7d7' }}>
                  <p style={{ fontSize: '10px', color: '#c53030', fontWeight: 'bold', margin: '0 0 5px' }}>⚠️ ALERGIA</p>
                  <p style={{ margin: '0', fontWeight: '600', color: '#c53030' }}>{aluno.alergia_descricao}</p>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button onClick={() => onVerBoletim(aluno.id)} style={{ padding: '12px', borderRadius: '12px', backgroundColor: '#fefce8', color: '#854d0e', border: '1px solid #fef08a', fontWeight: 'bold', cursor: 'pointer', fontSize: '11px' }}>📄 BOLETIM ESCOLAR</button>
                  <button onClick={() => onVerHistorico(aluno.id)} style={{ padding: '12px', borderRadius: '12px', backgroundColor: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', fontWeight: 'bold', cursor: 'pointer', fontSize: '11px' }}>💰 PAGAMENTOS</button>
              </div>
            </div>
          ) : verBoletim ? (
              <div style={{ width: '100%', marginTop: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 'bold', margin: 0 }}>Boletim 2026</h3>
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
                                  {!ehVisitante && <th style={{ padding: '8px' }}></th>}
                              </tr>
                          </thead>
                          <tbody>
                              {notas.map((n) => (
                                  <tr key={n.id} style={{ borderBottom: '1px solid #eee' }}>
                                      <td style={{ padding: '8px', fontWeight: 'bold' }}>{n.disciplina}</td>
                                      {['bimestre1', 'bimestre2', 'recuperacao1', 'bimestre3', 'bimestre4', 'recuperacao2'].map((b) => (
                                          <td key={b} style={{ padding: '4px', textAlign: 'center' }}>
                                              <input type="text" defaultValue={n[b] || ""} onBlur={(e) => onSalvarNota(n.id, b, e.target.value)} disabled={ehVisitante} style={{ width: '30px', textAlign: 'center', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '2px', backgroundColor: b.includes('recuperacao') ? '#fff5f5' : 'white' }} />
                                          </td>
                                      ))}
                                      {!ehVisitante && <td style={{ textAlign: 'center' }}><button onClick={() => onExcluirDisciplina(n.id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>🗑️</button></td>}
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          ) : (
            <div style={{ width: '100%', marginTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 'bold', margin: 0 }}>Histórico</h3>
                  <button onClick={onGerarPDFHistorico} style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>📄 EXTRATO</button>
                </div>
                <button onClick={onVoltarParaFicha} style={{ border: 'none', background: 'none', color: '#2563eb', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>VOLTAR</button>
              </div>
              <div style={{ maxHeight: '200px', overflowY: 'auto', backgroundColor: '#f8fafc', borderRadius: '15px', padding: '10px' }}>
                {historico.length > 0 ? historico.map((h, i) => (
                    <div key={i} style={{ padding: '10px', borderBottom: '1px solid #e2e8f0', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginRight: '10px' }}>
                          <span style={{ fontWeight: 'bold' }}>{new Date(h.data_pagamento).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</span>
                          <span style={{ color: '#10b981', fontWeight: 'bold' }}>R$ {h.valor_total?.toLocaleString('pt-BR')}</span>
                        </div>
                        <p style={{ margin: '3px 0 0', color: '#64748b', fontSize: '11px' }}>{h.descricao}</p>
                      </div>
                    </div>
                )) : <p style={{ textAlign: 'center', color: '#64748b', fontSize: '12px', padding: '20px' }}>Nenhum pagamento registrado.</p>}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', width: '100%', marginTop: '30px' }}>
            <button onClick={onFechar} style={{ flex: '1 1 100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', fontWeight: 'bold', cursor: 'pointer', backgroundColor: 'white' }}>FECHAR</button>
            {!ehVisitante && !verBoletim && !verHistorico && (
              <>
                <button onClick={onEditar} style={{ flex: '1 1 70%', padding: '14px', borderRadius: '12px', backgroundColor: '#2563eb', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>EDITAR FICHA</button>
                <button onClick={onExcluir} style={{ flex: '1 1 20%', padding: '14px', borderRadius: '12px', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', cursor: 'pointer' }}>🗑️</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}