import React from "react";
import { supabase } from "@/lib/supabase"; // ADICIONADO PARA O ESTORNO FUNCIONAR AQUI

// --- ESTILOS COMPARTILHADOS ---
const EstiloLabel: React.CSSProperties = { fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px', display: 'block' };
const EstiloDado: React.CSSProperties = { fontSize: '14px', color: '#1e293b', fontWeight: '600', margin: 0 };
const EstiloCard: React.CSSProperties = { backgroundColor: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #f1f5f9' };

// --- FUNÇÕES AUXILIARES VISUAIS ---
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
  const metodos = Object.keys(detalhes).filter(key => parseFloat(detalhes[key]) > 0 && key !== 'historico_parciais');
  return metodos.length > 0 ? metodos.join(" + ").toUpperCase() : null;
};

// --- COMPONENTES DE VISÃO ---

export function VisaoPrincipal({ 
  aluno, calcularIdade, saldoCreditoVisivel, setVerCreditoGlobal, totalPendenteGeral, setVerDividasGlobais, 
  mediaEstrelas, percentualPresenca, mCPF, mWhatsApp, anoSelecionado, onVerBoletim, anoPagamentoSelecionado, onVerHistorico, ehVisitante 
}: any) {
  
  const contatos = [
    { nome: aluno.responsavel, whats: aluno.whatsapp, cpf: aluno.responsavel_cpf || aluno.cpf_responsavel, profissao: aluno.profissao_responsavel || aluno.responsavel_profissao, tag: aluno.parentesco1 || aluno.parentesco_1 || "Responsável 1", cor: "#db2777", bg: "#fdf2f8" },
    { nome: aluno.responsavel2 || aluno.responsavel_2_nome, whats: aluno.whatsapp2 || aluno.responsavel_2_contato, cpf: aluno.cpf_responsavel2 || aluno.cpf_responsavel_2, profissao: aluno.profissao_responsavel2 || aluno.responsavel_2_profissao, tag: aluno.parentesco2 || aluno.parentesco_2 || "Responsável 2", cor: "#2563eb", bg: "#eff6ff" },
    { nome: aluno.responsavel3 || aluno.responsavel_3_nome, whats: aluno.whatsapp3 || aluno.responsavel_3_contato, cpf: aluno.cpf_responsavel_3, profissao: aluno.profissao_responsavel3, tag: aluno.parentesco3 || aluno.parentesco_3 || "Responsável 3", cor: "#16a34a", bg: "#f0fdf4" }
  ];

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {(saldoCreditoVisivel > 0 || totalPendenteGeral > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '4px', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <div 
            onClick={() => { if(saldoCreditoVisivel > 0) setVerCreditoGlobal(true); }}
            style={{ ...EstiloCard, backgroundColor: saldoCreditoVisivel > 0 ? '#f0fdf4' : '#fff', borderColor: saldoCreditoVisivel > 0 ? '#bbf7d0' : '#f1f5f9', textAlign: 'center', border: 'none', cursor: saldoCreditoVisivel > 0 ? 'pointer' : 'default', transition: 'transform 0.1s' }}
            onMouseOver={(e) => { if(saldoCreditoVisivel > 0) e.currentTarget.style.transform = 'scale(1.02)'; }}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <span style={{ ...EstiloLabel, color: saldoCreditoVisivel > 0 ? '#16a34a' : '#64748b' }}>💰 Crédito</span>
            <p style={{ ...EstiloDado, color: saldoCreditoVisivel > 0 ? '#14532d' : '#1e293b', fontSize: '15px', fontWeight: '800' }}>
              {saldoCreditoVisivel > 0 ? `R$ ${saldoCreditoVisivel.toFixed(2)}` : 'R$ 0,00'}
            </p>
          </div>
          <div 
            onClick={() => { if(totalPendenteGeral > 0) setVerDividasGlobais(true); }}
            style={{ ...EstiloCard, backgroundColor: totalPendenteGeral > 0 ? '#fdf2f2' : '#fff', borderColor: totalPendenteGeral > 0 ? '#fecaca' : '#f1f5f9', textAlign: 'center', border: 'none', cursor: totalPendenteGeral > 0 ? 'pointer' : 'default', transition: 'transform 0.1s' }}
            onMouseOver={(e) => { if(totalPendenteGeral > 0) e.currentTarget.style.transform = 'scale(1.02)'; }}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <span style={{ ...EstiloLabel, color: totalPendenteGeral > 0 ? '#dc2626' : '#64748b' }}>⚠️ Dívida</span>
            <p style={{ ...EstiloDado, color: totalPendenteGeral > 0 ? '#991b1b' : '#1e293b', fontSize: '15px', fontWeight: '800' }}>
              {totalPendenteGeral > 0 ? `R$ ${totalPendenteGeral.toFixed(2)}` : 'R$ 0,00'}
            </p>
          </div>
        </div>
      )}

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
          <span style={EstiloLabel}>Sexo</span>
          <p style={EstiloDado}>{aluno.sexo || '--'}</p>
        </div>
      </div>

      <div style={EstiloCard}>
        <span style={EstiloLabel}>CPF Aluno</span>
        <p style={EstiloDado}>{mCPF(aluno.cpf_aluno) || '--'}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div style={{ ...EstiloCard, backgroundColor: '#f8fafc' }}>
          <span style={{ ...EstiloLabel }}>Mensalidade Base</span>
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
  );
}

export function VisaoDividas({ 
  totalPendenteGeral, setVerDividasGlobais, setIdRenegociacao, ehVisitante, setModalPDVAberto, 
  listaPendenciasGerais, clean, idRenegociacao, formRenegociacao, setFormRenegociacao, confirmarRenegociacao 
}: any) {
  return (
    <div style={{ width: '100%', marginTop: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: '#dc2626' }}>⚠️ Detalhamento da Dívida</h3>
        <button onClick={() => { setVerDividasGlobais(false); setIdRenegociacao(null); }} style={{ border: 'none', background: 'none', color: '#64748b', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>VOLTAR</button>
      </div>

      <div style={{ backgroundColor: '#fdf2f2', border: '1px solid #fecaca', padding: '15px', borderRadius: '12px', textAlign: 'center', marginBottom: '20px' }}>
        <span style={{ fontSize: '11px', color: '#dc2626', fontWeight: 'bold', textTransform: 'uppercase' }}>Valor Total em Aberto</span>
        <p style={{ margin: 0, color: '#991b1b', fontSize: '22px', fontWeight: '900' }}>R$ {totalPendenteGeral.toFixed(2)}</p>
        
        {!ehVisitante && (
          <button 
            onClick={() => setModalPDVAberto(true)}
            style={{ marginTop: '10px', backgroundColor: '#10b981', color: 'white', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', margin: '10px auto 0 auto' }}
          >
            💰 RECEBER DÍVIDAS
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto', paddingRight: '5px' }}>
        {listaPendenciasGerais.length > 0 ? listaPendenciasGerais.map((pend: any, i: number) => {
          const valorTotal = clean(pend.valor_total);
          const valorPago = clean(pend.valor_pago);
          const restante = valorTotal - valorPago;
          const renegociandoEste = idRenegociacao === pend.id;

          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', padding: '12px', backgroundColor: renegociandoEste ? '#fffbeb' : '#fff', borderRadius: '12px', border: `1px solid ${renegociandoEste ? '#fcd34d' : '#fecaca'}`, transition: 'all 0.2s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b' }}>{pend.descricao}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Venc: {new Date(pend.data_pagamento).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</span>
                    <span style={{ fontSize: '9px', fontWeight: '800', color: pend.atraso_automatico ? '#dc2626' : '#d97706', backgroundColor: pend.atraso_automatico ? '#fee2e2' : '#fef3c7', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>
                      {pend.atraso_automatico ? 'NÃO PAGO' : pend.status}
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '14px', fontWeight: '900', color: '#dc2626', display: 'block' }}>R$ {restante.toFixed(2)}</span>
                  {!renegociandoEste && <button onClick={() => setIdRenegociacao(pend.id)} style={{ marginTop: '4px', background: 'none', border: '1px solid #d97706', color: '#b45309', fontSize: '9px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}>🔄 DIVIDIR</button>}
                </div>
              </div>

              {renegociandoEste && (
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed #fcd34d', display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '9px', fontWeight: 'bold', color: '#92400e' }}>PARCELAS:</label>
                    <input type="number" value={formRenegociacao.parcelas} onChange={(e) => setFormRenegociacao({...formRenegociacao, parcelas: e.target.value})} style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #fcd34d', fontSize: '11px' }} />
                  </div>
                  <div style={{ flex: 2 }}>
                    <label style={{ fontSize: '9px', fontWeight: 'bold', color: '#92400e' }}>1º VENCIMENTO:</label>
                    <input type="date" value={formRenegociacao.vencimentoInicial} onChange={(e) => setFormRenegociacao({...formRenegociacao, vencimentoInicial: e.target.value})} style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #fcd34d', fontSize: '11px' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button onClick={() => setIdRenegociacao(null)} style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: 'white', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>X</button>
                    <button onClick={() => confirmarRenegociacao(pend)} style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', backgroundColor: '#d97706', color: 'white', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>OK</button>
                  </div>
                </div>
              )}
            </div>
          );
        }) : <p style={{ textAlign: 'center', color: '#64748b', fontSize: '13px' }}>Nenhuma pendência encontrada.</p>}
      </div>
    </div>
  );
}

export function VisaoCredito({ 
  setVerCreditoGlobal, editandoCredito, novoValorCredito, setNovoValorCredito, setEditandoCredito, 
  handleSalvarCredito, saldoCreditoVisivel, ehVisitante, handleZerarCredito 
}: any) {
  return (
    <div style={{ width: '100%', marginTop: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: '#16a34a' }}>💰 Detalhamento do Crédito</h3>
        <button onClick={() => setVerCreditoGlobal(false)} style={{ border: 'none', background: 'none', color: '#64748b', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>VOLTAR</button>
      </div>

      <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '20px', borderRadius: '12px', textAlign: 'center', marginBottom: '20px' }}>
        <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 'bold', textTransform: 'uppercase' }}>Saldo Atual Retido</span>
        
        {editandoCredito ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
            <input 
              type="number" 
              value={novoValorCredito} 
              onChange={(e) => setNovoValorCredito(e.target.value)} 
              placeholder="0.00"
              style={{ padding: '10px', borderRadius: '8px', border: '1px solid #22c55e', fontSize: '16px', fontWeight: 'bold', textAlign: 'center', width: '150px' }} 
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setEditandoCredito(false)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>CANCELAR</button>
              <button onClick={handleSalvarCredito} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#16a34a', color: 'white', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>SALVAR</button>
            </div>
          </div>
        ) : (
          <>
            <p style={{ margin: '5px 0 15px 0', color: '#14532d', fontSize: '28px', fontWeight: '900' }}>R$ {saldoCreditoVisivel.toFixed(2)}</p>
            {!ehVisitante && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <button 
                  onClick={() => { setNovoValorCredito(saldoCreditoVisivel.toString()); setEditandoCredito(true); }} 
                  style={{ background: 'none', border: '1px solid #22c55e', color: '#15803d', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  ✏️ Ajustar
                </button>
                <button 
                  onClick={handleZerarCredito} 
                  style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#dc2626', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  🗑️ Zerar
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function VisaoBoletim({ 
  anoSelecionado, setAnoSelecionado, onVerBoletim, aluno, onGerarPDFBoletim, ehVisitante, 
  onAdicionarDisciplina, onVoltarParaFicha, notas, onSalvarNota, onExcluirDisciplina 
}: any) {
  return (
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
                  {notas.length > 0 ? notas.map((n: any) => {
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
                            <td style={{ textAlign: 'center', fontWeight: '900', color: parseFloat(media) < 7 ? '#ef4444' : '#2563eb' }}>{media}</td>
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
  );
}

export function VisaoHistorico({ 
  anoPagamentoSelecionado, setAnoPagamentoSelecionado, onVerHistorico, aluno, onGerarPDFHistorico, onVoltarParaFicha, 
  saldoCreditoVisivel, setVerCreditoGlobal, totalPendenteGeral, setVerDividasGlobais, 
  historicoLocal, // RECEBENDO DADO PURO DO PAI (MURALHA DE FERRO)
  userEmail, clean, onEditarPagamento, handleExcluirFaturamento, 
  onRecarregar, senhaMestra 
}: any) {

  // ============================================================================
  // 🛡️ A MURALHA DE FERRO: FILTRO SEGURO PARA O EXTRATO
  // ============================================================================
  const historicoFiltradoExibicao = (historicoLocal || []).filter((h: any) => {
    // 1. Esconde créditos puros daqui (vão para a carteira virtual)
    if (h.tipo?.toLowerCase() === 'credito') return false;

    // 2. Se o usuário escolher "todos", exibe absolutamente tudo
    if (anoPagamentoSelecionado === 'todos') return true;

    // 3. Procura o ano em qualquer lugar possível (Data, Vencimento, Descrição, Criação)
    const strData = h.data_pagamento ? String(h.data_pagamento) : "";
    const strDesc = h.descricao ? String(h.descricao) : "";
    const strVenc = h.data_vencimento ? String(h.data_vencimento) : "";
    const strCreated = h.created_at ? String(h.created_at) : "";

    return strData.includes(anoPagamentoSelecionado) ||
           strDesc.includes(anoPagamentoSelecionado) ||
           strVenc.includes(anoPagamentoSelecionado) ||
           strCreated.includes(anoPagamentoSelecionado);
  });

  // ============================================================================
  // 🔴 ESTORNO CIRÚRGICO: DESFAZ PARCELAS INDIVIDUAIS E RECUPERA CRÉDITO
  // ============================================================================
  const estornoCirurgico = async (pgto: any) => {
    if (prompt("Digite a Senha Mestra para ESTORNAR/DESFAZER:") !== (senhaMestra || "1234")) {
      return alert("Senha incorreta.");
    }

    // Busca o dado ao vivo do banco de dados (A Verdade Absoluta)
    const { data: registroReal, error: fetchError } = await supabase
      .from('historico_pagamentos')
      .select('*')
      .eq('id', pgto.id)
      .single();

    if (fetchError || !registroReal) return alert("Não foi possível encontrar este registro na base de dados.");

    let metodosObj = registroReal.detalhes_metodos;
    if (typeof metodosObj === 'string') {
      try { metodosObj = JSON.parse(metodosObj); } catch (e) { metodosObj = {}; }
    }

    const historicoParciais = metodosObj?.historico_parciais || [];
    let indexParaEstornar = -1;
    let valorSendoEstornado = clean(registroReal.valor_pago);

    if (historicoParciais.length > 0) {
      let msg = "Esta cobrança possui pagamentos parciais.\nQual parcela deseja CANCELAR?\n\n";
      historicoParciais.forEach((p: any, i: number) => {
        let dataFormatada = p.data_recebimento;
        if (dataFormatada && dataFormatada.includes('-')) dataFormatada = dataFormatada.split('-').reverse().join('/');
        msg += `[${i + 1}] Dia ${dataFormatada} - R$ ${clean(p.valor_pago_rodada).toFixed(2)} (${p.formas})\n`;
      });
      msg += "\n[0] CANCELAR TUDO (Zerar a cobrança inteira)";

      const resposta = prompt(msg);
      if (resposta === null) return;

      const op = parseInt(resposta);
      if (isNaN(op) || op < 0 || op > historicoParciais.length) return alert("Opção inválida. Operação cancelada.");

      indexParaEstornar = op - 1;
      if (indexParaEstornar !== -1) {
          valorSendoEstornado = clean(historicoParciais[indexParaEstornar].valor_pago_rodada);
      }
    } else {
      if (!confirm("Deseja realmente estornar este faturamento? O valor pago será zerado.")) return;
    }

    // GESTÃO DE TROCO / CRÉDITO
    let mudancaSaldo = 0;
    const saldoAtualSeguro = saldoCreditoVisivel || 0;

    const usouSaldo = confirm(`Atenção: Essa parcela de R$ ${valorSendoEstornado.toFixed(2)} foi paga usando SALDO VIRTUAL do aluno?\n\n(OK = Sim, Cancelar = Não)`);
    if (usouSaldo) {
        const val = prompt(`Qual valor de saldo virtual deve ser DEVOLVIDO à conta do aluno?\n(Exemplo: 50.00)`);
        if (val) mudancaSaldo += Math.abs(clean(val));
    } else {
        const gerouSaldo = confirm(`Esse pagamento GEROU troco/crédito na conta do aluno na época?\n\n(OK = Sim, Cancelar = Não)`);
        if (gerouSaldo) {
            const val = prompt(`Qual valor de troco/crédito deve ser RETIRADO da conta do aluno agora? (Saldo atual: R$ ${saldoAtualSeguro.toFixed(2)})\n(Exemplo: 15.00)`);
            if (val) mudancaSaldo -= Math.abs(clean(val));
        }
    }

    try {
      if (indexParaEstornar === -1) {
        const { error } = await supabase.from('historico_pagamentos').update({
          status: 'pendente',
          valor_pago: 0,
          detalhes_metodos: {}
        }).eq('id', pgto.id);
        if (error) throw error;
      } else {
        const parcelaRemovida = historicoParciais[indexParaEstornar];
        const valorAAbater = clean(parcelaRemovida.valor_pago_rodada);
        const novoValorPago = clean(registroReal.valor_pago) - valorAAbater;

        const novoStatus = novoValorPago <= 0 ? 'pendente' : 'parcial';

        const novoHistorico = [...historicoParciais];
        novoHistorico.splice(indexParaEstornar, 1);
        const novosMetodos = { ...metodosObj, historico_parciais: novoHistorico };

        const { error } = await supabase.from('historico_pagamentos').update({
          status: novoStatus,
          valor_pago: Math.max(0, novoValorPago),
          detalhes_metodos: novoHistorico.length === 0 ? {} : novosMetodos
        }).eq('id', pgto.id);
        if (error) throw error;
      }

      if (mudancaSaldo !== 0) {
          const novoSaldo = Math.max(0, saldoAtualSeguro + mudancaSaldo);
          await supabase.from('alunos').update({ saldo_credito: novoSaldo }).eq('id', aluno.id);

          await supabase.from('historico_pagamentos').insert({
              aluno_id: aluno.id,
              tipo: 'credito',
              descricao: mudancaSaldo > 0 ? 'ESTORNO: Saldo Devolvido à Conta' : 'ESTORNO: Troco Removido',
              valor_total: Math.abs(mudancaSaldo),
              valor_pago: Math.abs(mudancaSaldo),
              status: 'pago',
              data_pagamento: new Date().toISOString().split('T')[0],
              detalhes_metodos: { forma_geradora: "Ajuste Sistêmico Automático", e_subtracao: mudancaSaldo < 0 }
          });
      }

      alert("Estorno processado e saldos ajustados com sucesso!");
      // 🛡️ AVISA O PAI PARA RECARREGAR O BANCO DE DADOS
      if (onRecarregar) onRecarregar();
    } catch (error: any) {
      alert("Erro operacional ao estornar: " + error.message);
    }
  };

  return (
    <div style={{ width: '100%', marginTop: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', margin: 0 }}>Extrato de Pagamentos</h3>
          
          <select 
            value={anoPagamentoSelecionado} 
            onChange={(e) => {
              setAnoPagamentoSelecionado(e.target.value);
              onVerHistorico(aluno.id, e.target.value);
            }}
            style={{ padding: '4px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 'bold', outline: 'none' }}
          >
            <option value="todos">Mostrar Todos</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
          </select>
          <button onClick={onGerarPDFHistorico} style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>📄 IMPRIMIR</button>
        </div>
        <button onClick={onVoltarParaFicha} style={{ border: 'none', background: 'none', color: '#64748b', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>VOLTAR</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
        <div onClick={() => { if(saldoCreditoVisivel > 0) setVerCreditoGlobal(true); }} style={{ backgroundColor: saldoCreditoVisivel > 0 ? '#f0fdf4' : '#f8fafc', border: `1px solid ${saldoCreditoVisivel > 0 ? '#bbf7d0' : '#e2e8f0'}`, padding: '10px', borderRadius: '10px', textAlign: 'center', cursor: saldoCreditoVisivel > 0 ? 'pointer' : 'default' }}>
          <span style={{ fontSize: '10px', color: '#16a34a', fontWeight: 'bold', textTransform: 'uppercase' }}>Crédito Atual</span>
          <p style={{ margin: 0, color: '#14532d', fontSize: '14px', fontWeight: '900' }}>{saldoCreditoVisivel > 0 ? `R$ ${saldoCreditoVisivel.toFixed(2)}` : 'R$ 0,00'}</p>
        </div>
        <div onClick={() => { if(totalPendenteGeral > 0) setVerDividasGlobais(true); }} style={{ backgroundColor: totalPendenteGeral > 0 ? '#fdf2f2' : '#f8fafc', border: `1px solid ${totalPendenteGeral > 0 ? '#fecaca' : '#e2e8f0'}`, padding: '10px', borderRadius: '10px', textAlign: 'center', cursor: totalPendenteGeral > 0 ? 'pointer' : 'default' }}>
          <span style={{ fontSize: '10px', color: totalPendenteGeral > 0 ? '#dc2626' : '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Dívida Global</span>
          <p style={{ margin: 0, color: totalPendenteGeral > 0 ? '#991b1b' : '#334155', fontSize: '14px', fontWeight: '900' }}>{totalPendenteGeral > 0 ? `R$ ${totalPendenteGeral.toFixed(2)}` : 'R$ 0,00'}</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {historicoFiltradoExibicao.length > 0 ? historicoFiltradoExibicao.map((pgto: any, i: number) => {
          const forma = extrairFormaPagamento(pgto.detalhes_metodos);
          const podeGerenciar = userEmail === 'carlamonaliza9@gmail.com';
          const devedorRestante = clean(pgto.valor_total) - clean(pgto.valor_pago);
          
          // 🛡️ A ARMADURA DO EXTRATO: IDENTIFICA REGISTROS SAGRADOS
          const isSagrado = pgto.tipo?.toLowerCase() === 'mensalidade' || pgto.tipo?.toLowerCase() === 'acordo';
          
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#334155' }}>
                      {pgto.descricao}
                      {pgto.status === 'estornado' && <span style={{ marginLeft: '8px', fontSize: '9px', backgroundColor: '#fee2e2', color: '#dc2626', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>Estornado</span>}
                      {pgto.status === 'cancelado' && <span style={{ marginLeft: '8px', fontSize: '9px', backgroundColor: '#e2e8f0', color: '#475569', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>Cancelado</span>}
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>🗓️ Venda/Lançamento: {new Date(pgto.data_pagamento).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</span>
                    {forma && <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#0369a1', marginTop: '2px' }}>💳 Método Principal: {forma}</span>}
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Valor Original: R$ {clean(pgto.valor_total).toFixed(2)}</span>
                    <span style={{ fontSize: '14px', fontWeight: '900', color: pgto.status === 'pago' ? '#16a34a' : pgto.status === 'parcial' ? '#d97706' : '#dc2626', display: 'block' }}>Pago: R$ {clean(pgto.valor_pago).toFixed(2)}</span>
                    {devedorRestante > 0 && <span style={{ fontSize: '10px', fontWeight: '700', color: '#dc2626' }}>Saldo Devedor: R$ {devedorRestante.toFixed(2)}</span>}
                  </div>

                  {podeGerenciar && (
                    <div style={{ display: 'flex', gap: '6px', borderLeft: '1px solid #cbd5e1', paddingLeft: '8px', alignItems: 'center' }}>
                      <button onClick={() => onEditarPagamento(pgto)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px' }} title="Editar">✏️</button>
                      
                      <button onClick={() => estornoCirurgico(pgto)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px' }} title="Desfazer Lançamento/Estornar">🔄</button>
                      
                      {/* 🛡️ A LIXEIRA ESTÁ CONDICIONADA A NÃO SER UMA MENSALIDADE */}
                      {!isSagrado && (
                         <button onClick={() => handleExcluirFaturamento(pgto)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px' }} title="Excluir Permanentemente (Apenas Taxas Avulsas)">🗑️</button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {pgto.detalhes_metodos?.historico_parciais && pgto.detalhes_metodos.historico_parciais.length > 0 && (
                <div style={{ marginTop: '4px', paddingTop: '8px', borderTop: '1px dashed #cbd5e1', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Histórico de Recebimentos:</span>
                  {pgto.detalhes_metodos.historico_parciais.map((parcial: any, idx: number) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#475569', backgroundColor: '#fff', padding: '4px 8px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                      <span>📅 Pago em: {new Date(parcial.data_recebimento).toLocaleDateString('pt-BR', {timeZone: 'UTC'})} • 💳 Canal: {parcial.formas}</span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {(parseFloat(parcial.desconto) > 0 || parseFloat(parcial.multa) > 0) && (
                          <span style={{ color: '#94a3b8', fontSize: '9px' }}>
                            {parseFloat(parcial.desconto) > 0 ? `(- R$ ${parseFloat(parcial.desconto).toFixed(2)})` : ''} 
                            {parseFloat(parcial.multa) > 0 ? `(+ R$ ${parseFloat(parcial.multa).toFixed(2)})` : ''}
                          </span>
                        )}
                        <span style={{ fontWeight: 'bold', color: '#16a34a' }}>+ R$ {clean(parcial.valor_pago_rodada).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        }) : <p style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic', margin: 0, textAlign: 'center' }}>Nenhum pagamento referenciado para este filtro.</p>}
      </div>
    </div>
  );
}