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
  editando
}: ModalPagamentoProps) {
  // Mantém o seu controle de ano original
  const [anoReferencia, setAnoReferencia] = useState(new Date().getFullYear().toString());

  // Lógica original preservada: se for mensalidade, monta a identificação automaticamente
  useEffect(() => {
    if (aberto && tipoPagamento === "mensalidade") {
      setDescricaoOutro(`Mensalidade - ${mesReferencia}/${anoReferencia}`);
    }
  }, [mesReferencia, anoReferencia, tipoPagamento, aberto, setDescricaoOutro]);

  if (!aberto) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
      <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '20px', width: '95%', maxWidth: '500px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: 15 }}>{aluno?.nome}</h2>
        
        <div style={{ marginBottom: 15 }}>
          <label style={{ fontSize: 10, fontWeight: 'bold' }}>DATA QUE O DINHEIRO CAIU (FLUXO DE CAIXA):</label>
          <input 
            type="date" 
            value={dataPagamento} 
            onChange={(e) => setDataPagamento(e.target.value)} 
            style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd' }} 
          />
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 10, fontWeight: 'bold' }}>CATEGORIA:</label>
          {/* Menu de seleção atualizado com as novas pautas organizacionais */}
          <select value={tipoPagamento} onChange={(e) => setTipoPagamento(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd' }}>
            <option value="mensalidade">🏫 Mensalidade Regular</option>
            <option value="material">🎨 Taxa de Material Escolar</option>
            <option value="livro">📘 Livros Didáticos</option>
            <option value="uniforme">👕 Uniformes Escolares</option>
            <option value="evento">🎟️ Projetos / Eventos Pedagógicos</option>
          </select>
        </div>

        {tipoPagamento === "mensalidade" && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div>
              <label style={{ fontSize: '10px', fontWeight: 'bold' }}>MÊS DE REFERÊNCIA:</label>
              <select value={mesReferencia} onChange={(e) => setMesReferencia(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}>
                {mesesAno.map(m => (<option key={m} value={m}>{m}</option>))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '10px', fontWeight: 'bold' }}>ANO DE REFERÊNCIA:</label>
              <select value={anoReferencia} onChange={(e) => setAnoReferencia(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}>
                <option value="2024">2024</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
              </select>
            </div>
          </div>
        )}

        <div style={{ marginBottom: 15 }}>
          <label style={{ fontSize: 10, fontWeight: 'bold' }}>IDENTIFICAÇÃO NO REGISTRO / OBSERVAÇÕES:</label>
          <input 
            type="text" 
            placeholder={tipoPagamento === 'mensalidade' ? "" : "Ex: Camisa Tam M, Livro de Ciências, etc."} 
            value={descricaoOutro} 
            onChange={(e) => setDescricaoOutro(e.target.value)} 
            disabled={tipoPagamento === 'mensalidade'} // Trava apenas para mensalidades para garantir o padrão do banco
            style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', backgroundColor: tipoPagamento === 'mensalidade' ? '#f1f5f9' : 'white', color: tipoPagamento === 'mensalidade' ? '#64748b' : '#000' }} 
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
          <div><label style={{ fontSize: 10 }}>Pix:</label><input type="number" value={pagamentosMetodos.pix} onChange={(e) => setPagamentosMetodos({ ...pagamentosMetodos, pix: e.target.value })} style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 8 }} /></div>
          <div><label style={{ fontSize: 10 }}>Dinheiro:</label><input type="number" value={pagamentosMetodos.dinheiro} onChange={(e) => setPagamentosMetodos({ ...pagamentosMetodos, dinheiro: e.target.value })} style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 8 }} /></div>
          <div><label style={{ fontSize: 10 }}>Cartão Crédito:</label><input type="number" value={pagamentosMetodos.credito} onChange={(e) => setPagamentosMetodos({ ...pagamentosMetodos, credito: e.target.value })} style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 8 }} /></div>
          <div><label style={{ fontSize: 10 }}>Cartão Débito:</label><input type="number" value={pagamentosMetodos.debito} onChange={(e) => setPagamentosMetodos({ ...pagamentosMetodos, debito: e.target.value })} style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 8 }} /></div>
          <div style={{ gridColumn: 'span 2' }}><label style={{ fontSize: 10, color: 'red', fontWeight: 'bold' }}>Multa/Juros:</label><input type="number" value={pagamentosMetodos.multa} onChange={(e) => setPagamentosMetodos({ ...pagamentosMetodos, multa: e.target.value })} style={{ width: '100%', padding: 8, border: '1px solid red', borderRadius: 8 }} /></div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onFechar} style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid #ddd', cursor: 'pointer' }}>CANCELAR</button>
          <button onClick={onConfirmar} style={{ flex: 1, padding: 12, borderRadius: 10, backgroundColor: '#10b981', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
            {editando ? "ATUALIZAR" : "CONFIRMAR"}
          </button>
        </div>
      </div>
    </div>
  );
}