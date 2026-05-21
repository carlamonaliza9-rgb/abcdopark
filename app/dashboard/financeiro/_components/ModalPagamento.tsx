"use client";

import { useState, useEffect } from "react";

interface ModalPagamentoProps {
  aberto: boolean;
  onFechar: () => void;
  aluno: any;
  dataPagamento: string;
  setDataPagamento: (val: string) => void;
  tipoPagamento: string;
  setTipoPagamento: (val: string) => void;
  mesReferencia: string;
  setMesReferencia: (val: string) => void;
  mesesAno: string[];
  descricaoOutro: string;
  setDescricaoOutro: (val: string) => void;
  pagamentosMetodos: any;
  setPagamentosMetodos: (val: any) => void;
  onConfirmar: () => void;
  editando: boolean;
  historicoGeral?: any[]; 
}

export function ModalPagamento({
  aberto,
  onFechar,
  aluno,
  dataPagamento,
  setDataPagamento,
  tipoPagamento,
  setTipoPagamento,
  mesReferencia,
  setMesReferencia,
  mesesAno,
  descricaoOutro,
  setDescricaoOutro,
  pagamentosMetodos,
  setPagamentosMetodos,
  onConfirmar,
  editando,
  historicoGeral = []
}: ModalPagamentoProps) {
  const [anoReferencia, setAnoReferencia] = useState(new Date().getFullYear().toString());
  const [mesesDisponiveis, setMesesDisponiveis] = useState<string[]>(mesesAno);

  useEffect(() => {
    if (aberto && tipoPagamento === "mensalidade") {
      const novaDesc = `Mensalidade - ${mesReferencia}/${anoReferencia}`;
      if (descricaoOutro !== novaDesc) {
        setDescricaoOutro(novaDesc);
      }
    }
  }, [mesReferencia, anoReferencia, tipoPagamento, aberto, descricaoOutro, setDescricaoOutro]);

  useEffect(() => {
    if (aberto && tipoPagamento === "mensalidade" && !editando) {
      const mesesPagosNoAno = (historicoGeral || [])
        .filter(h => h.descricao && h.descricao.includes(anoReferencia) && h.status === 'pago')
        .map(h => h.mes_referencia);
      
      const disponiveis = mesesAno.filter(m => !mesesPagosNoAno.includes(m));
      
      if (JSON.stringify(disponiveis) !== JSON.stringify(mesesDisponiveis)) {
        setMesesDisponiveis(disponiveis);
      }
      
      if (!disponiveis.includes(mesReferencia) && disponiveis.length > 0) {
        if (mesReferencia !== disponiveis[0]) {
          setMesReferencia(disponiveis[0]);
        }
      }
    } else {
      if (mesesDisponiveis.length !== 12) setMesesDisponiveis(mesesAno);
    }
  }, [aberto, anoReferencia, tipoPagamento, editando, mesReferencia, mesesAno, historicoGeral, mesesDisponiveis, setMesReferencia]);

  if (!aberto) return null;

  const temValorNoCredito = parseFloat(pagamentosMetodos.cartao_credito ?? pagamentosMetodos.credito) > 0;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, backdropFilter: 'blur(4px)' }}>
      <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '24px', width: '95%', maxWidth: '550px', maxHeight: '95vh', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
        <h2 style={{ textAlign: 'center', marginBottom: 20, color: '#0f172a', fontWeight: '800' }}>{aluno?.nome}</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: 15 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Fluxo de Caixa (Data):</label>
            <input 
              type="date" 
              value={dataPagamento} 
              onChange={(e) => setDataPagamento(e.target.value)} 
              style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', marginTop: '4px' }} 
            />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Categoria:</label>
            <select value={tipoPagamento} onChange={(e) => setTipoPagamento(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', marginTop: '4px' }}>
              <option value="mensalidade">🏫 Mensalidade Regular</option>
              <option value="material">🎨 Taxa de Material Escolar</option>
              <option value="livro">📘 Livros Didáticos</option>
              <option value="uniforme">👕 Uniformes Escolares</option>
              <option value="evento">🎟️ Projetos / Eventos</option>
              <option value="acordo">🤝 Gerar Acordo Financeiro</option>
            </select>
          </div>
        </div>

        {tipoPagamento === "mensalidade" && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '15px' }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Mês de Referência:</label>
              <select value={mesReferencia} onChange={(e) => setMesReferencia(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '4px' }}>
                {mesesDisponiveis.length > 0 ? (
                  mesesDisponiveis.map(m => (<option key={m} value={m}>{m}</option>))
                ) : (
                  <option value="" disabled>Todos os meses quitados</option>
                )}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Ano Letivo:</label>
              <select value={anoReferencia} onChange={(e) => setAnoReferencia(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '4px' }}>
                <option value="2024">2024</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
              </select>
            </div>
          </div>
        )}

        {tipoPagamento === "acordo" ? (
          <div style={{ backgroundColor: '#fffbeb', padding: '20px', borderRadius: '16px', border: '1px solid #fde68a', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <h3 style={{ fontSize: '13px', fontWeight: '800', color: '#b45309', marginBottom: '15px' }}>ESTRUTURA DO ACORDO (GERAÇÃO DE DÍVIDA)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: '700', color: '#92400e' }}>Nº de Parcelas:</label>
                <input type="number" value={pagamentosMetodos.acordo_qtd_parcelas || ""} onChange={(e) => setPagamentosMetodos({ ...pagamentosMetodos, acordo_qtd_parcelas: e.target.value })} placeholder="Ex: 4" style={{ width: '100%', padding: '10px', border: '1px solid #fcd34d', borderRadius: '8px', marginTop: '4px' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: '700', color: '#92400e' }}>Valor de CADA Parcela:</label>
                <input type="number" value={pagamentosMetodos.acordo_valor_parcela || ""} onChange={(e) => setPagamentosMetodos({ ...pagamentosMetodos, acordo_valor_parcela: e.target.value })} placeholder="Ex: 150.00" style={{ width: '100%', padding: '10px', border: '1px solid #fcd34d', borderRadius: '8px', marginTop: '4px' }} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: 11, fontWeight: '700', color: '#92400e' }}>Vencimento da 1ª Parcela:</label>
                <input type="date" value={pagamentosMetodos.acordo_data_vencimento || ""} onChange={(e) => setPagamentosMetodos({ ...pagamentosMetodos, acordo_data_vencimento: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #fcd34d', borderRadius: '8px', marginTop: '4px' }} />
              </div>
            </div>
            <p style={{ fontSize: '10px', color: '#b45309', marginTop: '10px', fontStyle: 'italic' }}>* As parcelas serão geradas automaticamente e ficarão disponíveis como Dívida Ativa para o aluno.</p>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Observações:</label>
              <input 
                type="text" 
                placeholder={tipoPagamento === 'mensalidade' ? "" : "Ex: Camisa Tam M, Livro de Ciências, etc."} 
                value={descricaoOutro} 
                onChange={(e) => setDescricaoOutro(e.target.value)} 
                disabled={tipoPagamento === 'mensalidade'} 
                style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: tipoPagamento === 'mensalidade' ? '#f1f5f9' : 'white', color: tipoPagamento === 'mensalidade' ? '#94a3b8' : '#0f172a', marginTop: '4px' }} 
              />
            </div>

            <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: '800', color: '#334155', marginBottom: '15px', borderBottom: '1px solid #cbd5e1', paddingBottom: '8px' }}>DISTRIBUIÇÃO DOS VALORES RECEBIDOS (R$)</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div><label style={{ fontSize: 11, fontWeight: '700', color: '#475569' }}>Pix:</label><input type="number" value={pagamentosMetodos.pix || ""} onChange={(e) => setPagamentosMetodos({ ...pagamentosMetodos, pix: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', marginTop: '4px' }} /></div>
                <div><label style={{ fontSize: 11, fontWeight: '700', color: '#475569' }}>Dinheiro em Espécie:</label><input type="number" value={pagamentosMetodos.dinheiro || ""} onChange={(e) => setPagamentosMetodos({ ...pagamentosMetodos, dinheiro: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', marginTop: '4px' }} /></div>
                <div><label style={{ fontSize: 11, fontWeight: '700', color: '#475569' }}>Cartão de Crédito:</label><input type="number" value={pagamentosMetodos.cartao_credito ?? pagamentosMetodos.credito ?? ""} onChange={(e) => setPagamentosMetodos({ ...pagamentosMetodos, cartao_credito: e.target.value, credito: undefined })} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', marginTop: '4px' }} /></div>
                <div><label style={{ fontSize: 11, fontWeight: '700', color: '#475569' }}>Cartão de Débito:</label><input type="number" value={pagamentosMetodos.cartao_debito ?? pagamentosMetodos.debito ?? ""} onChange={(e) => setPagamentosMetodos({ ...pagamentosMetodos, cartao_debito: e.target.value, debito: undefined })} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', marginTop: '4px' }} /></div>
                <div><label style={{ fontSize: 11, fontWeight: '700', color: '#475569' }}>Boleto Bancário:</label><input type="number" value={pagamentosMetodos.boleto || ""} onChange={(e) => setPagamentosMetodos({ ...pagamentosMetodos, boleto: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', marginTop: '4px' }} /></div>
                
                <div style={{ backgroundColor: '#f0fdf4', padding: '8px', borderRadius: '10px', border: '1px dashed #22c55e' }}>
                  <label style={{ fontSize: 11, fontWeight: '800', color: '#16a34a' }}>Abater do Crédito:</label>
                  <input type="number" value={pagamentosMetodos.credito_aluno || ""} onChange={(e) => setPagamentosMetodos({ ...pagamentosMetodos, credito_aluno: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #bbf7d0', borderRadius: '8px', marginTop: '4px' }} />
                </div>
                
                {tipoPagamento === "livro" && (
                  <>
                    <div style={{ gridColumn: 'span 2', height: '1px', backgroundColor: '#cbd5e1', margin: '5px 0' }}></div>
                    <div><label style={{ fontSize: 11, fontWeight: '700', color: '#1e3a8a' }}>Pix Editora:</label><input type="number" value={pagamentosMetodos.pix_editora || ""} onChange={(e) => setPagamentosMetodos({ ...pagamentosMetodos, pix_editora: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #93c5fd', borderRadius: '8px', marginTop: '4px' }} /></div>
                    <div><label style={{ fontSize: 11, fontWeight: '700', color: '#1e3a8a' }}>Crédito Editora:</label><input type="number" value={pagamentosMetodos.cartao_credito_editora || ""} onChange={(e) => setPagamentosMetodos({ ...pagamentosMetodos, cartao_credito_editora: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #93c5fd', borderRadius: '8px', marginTop: '4px' }} /></div>
                    <div><label style={{ fontSize: 11, fontWeight: '700', color: '#1e3a8a' }}>Débito Editora:</label><input type="number" value={pagamentosMetodos.cartao_debito_editora || ""} onChange={(e) => setPagamentosMetodos({ ...pagamentosMetodos, cartao_debito_editora: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #93c5fd', borderRadius: '8px', marginTop: '4px' }} /></div>
                  </>
                )}

                {temValorNoCredito && (
                  <div style={{ gridColumn: 'span 2', backgroundColor: '#e0f2fe', padding: '12px', borderRadius: '12px', marginTop: '5px' }}>
                    <label style={{ fontSize: 11, fontWeight: '800', color: '#0369a1' }}>PARCELAMENTO (CARTÃO DE CRÉDITO):</label>
                    <select value={pagamentosMetodos.parcelas || "1"} onChange={(e) => setPagamentosMetodos({ ...pagamentosMetodos, parcelas: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #bae6fd', fontSize: 12, fontWeight: 'bold', backgroundColor: 'white', marginTop: '6px' }}>
                      <option value="1">À vista (1x)</option>
                      {[2,3,4,5,6,7,8,9,10,11,12].map(n => <option key={n} value={n}>{n}x sem juros</option>)}
                    </select>
                  </div>
                )}

                <div style={{ gridColumn: 'span 2', height: '1px', backgroundColor: '#cbd5e1', margin: '5px 0' }}></div>
                <div>
                  <label style={{ fontSize: 11, color: '#2563eb', fontWeight: '800' }}>Desconto Aplicado:</label>
                  <input type="number" value={pagamentosMetodos.desconto || ""} onChange={(e) => setPagamentosMetodos({ ...pagamentosMetodos, desconto: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #2563eb', borderRadius: '8px', marginTop: '4px' }} placeholder="0.00" />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#dc2626', fontWeight: '800' }}>Multa/Juros Aplicado:</label>
                  <input type="number" value={pagamentosMetodos.multa || ""} onChange={(e) => setPagamentosMetodos({ ...pagamentosMetodos, multa: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #dc2626', borderRadius: '8px', marginTop: '4px' }} placeholder="0.00" />
                </div>
              </div>
            </div>
          </>
        )}

        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={onFechar} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid #cbd5e1', cursor: 'pointer', fontWeight: '800', color: '#475569', backgroundColor: 'white' }}>CANCELAR</button>
          <button 
            onClick={onConfirmar} 
            disabled={tipoPagamento === 'mensalidade' && mesesDisponiveis.length === 0}
            style={{ 
              flex: 1, padding: '14px', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', border: 'none',
              backgroundColor: (tipoPagamento === 'mensalidade' && mesesDisponiveis.length === 0) ? '#cbd5e1' : '#10b981', 
              color: 'white' 
            }}
          >
            {tipoPagamento === 'acordo' ? "GERAR ACORDO" : editando ? "ATUALIZAR" : (tipoPagamento === 'mensalidade' && mesesDisponiveis.length === 0) ? "ANO QUITADO" : "CONFIRMAR"}
          </button>
        </div>
      </div>
    </div>
  );
}