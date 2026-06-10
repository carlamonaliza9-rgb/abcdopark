"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

interface ModalUniformeProps {
  aberto: boolean;
  onFechar: () => void;
  alunos: any[];
  carregarDados: () => void;
}

export function ModalUniforme({ aberto, onFechar, alunos, carregarDados }: ModalUniformeProps) {
  const [alunoUniformeId, setAlunoUniformeId] = useState("");
  const [dataVendaUniforme, setDataVendaUniforme] = useState(new Date().toLocaleDateString('en-CA'));
  const [uniformesVenda, setUniformesVenda] = useState({
    camisaPadrao: 0,
    camisaEdFisica: 0,
    calca: 0,
    shortSaia: 0,
    short: 0,
    casaco: 0,
  });
  
  const [uniformesTamanhos, setUniformesTamanhos] = useState({
    camisaPadrao: "4 anos",
    camisaEdFisica: "4 anos",
    calca: "4 anos",
    shortSaia: "4 anos",
    short: "4 anos",
    casaco: "4 anos",
  });

  const precosUniformes = {
    camisaPadrao: 60,
    camisaEdFisica: 60,
    calca: 80,
    shortSaia: 60,
    short: 60,
    casaco: 130,
  };

  const totalVendaUniforme = 
    (uniformesVenda.camisaPadrao * precosUniformes.camisaPadrao) +
    (uniformesVenda.camisaEdFisica * precosUniformes.camisaEdFisica) +
    (uniformesVenda.calca * precosUniformes.calca) +
    (uniformesVenda.shortSaia * precosUniformes.shortSaia) +
    (uniformesVenda.short * precosUniformes.short) +
    (uniformesVenda.casaco * precosUniformes.casaco);

  async function confirmarVendaUniforme() {
    if (!alunoUniformeId) return alert("Selecione um aluno.");
    if (totalVendaUniforme <= 0) return alert("Adicione pelo menos um item.");

    const alunoIdNum = parseInt(alunoUniformeId);

    const itensComprados: string[] = [];
    if (uniformesVenda.camisaPadrao > 0) itensComprados.push(`${uniformesVenda.camisaPadrao}x Camisa Padrão (Tam: ${uniformesTamanhos.camisaPadrao})`);
    if (uniformesVenda.camisaEdFisica > 0) itensComprados.push(`${uniformesVenda.camisaEdFisica}x Camisa Ed. Física (Tam: ${uniformesTamanhos.camisaEdFisica})`);
    if (uniformesVenda.calca > 0) itensComprados.push(`${uniformesVenda.calca}x Calça (Tam: ${uniformesTamanhos.calca})`);
    if (uniformesVenda.shortSaia > 0) itensComprados.push(`${uniformesVenda.shortSaia}x Short-Saia (Tam: ${uniformesTamanhos.shortSaia})`);
    if (uniformesVenda.short > 0) itensComprados.push(`${uniformesVenda.short}x Short (Tam: ${uniformesTamanhos.short})`);
    if (uniformesVenda.casaco > 0) itensComprados.push(`${uniformesVenda.casaco}x Casaco (Tam: ${uniformesTamanhos.casaco})`);

    const descricaoFinal = `Venda de Uniforme Avulsa: ${itensComprados.join(", ")}`;
    const _anoVenda = dataVendaUniforme.split("-")[0];

    const { error } = await supabase.from('historico_pagamentos').insert([{
      aluno_id: alunoIdNum,
      tipo: 'uniforme',
      descricao: descricaoFinal,
      valor_total: totalVendaUniforme,
      valor_pago: 0,
      status: 'pendente',
      data_pagamento: null,
      detalhes_metodos: { pix: "", dinheiro: "", credito: "", debito: "", multa: "" },
      mes_referencia: `Avulso ${_anoVenda}`
    }]);

    if (error) {
      alert("Erro ao salvar venda: " + error.message);
    } else {
      alert(`Venda registrada! Débito de R$ ${totalVendaUniforme.toFixed(2)} inserido pendente na ficha do aluno.`);
      
      setUniformesVenda({ camisaPadrao: 0, camisaEdFisica: 0, calca: 0, shortSaia: 0, short: 0, casaco: 0 });
      setUniformesTamanhos({ camisaPadrao: "4 anos", camisaEdFisica: "4 anos", calca: "4 anos", shortSaia: "4 anos", short: "4 anos", casaco: "4 anos" });
      setAlunoUniformeId("");
      
      carregarDados();
      onFechar();
    }
  }

  if (!aberto) return null;

  return (
    <div 
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, backdropFilter: 'blur(4px)' }}
      onClick={onFechar}
    >
      <div 
        style={{ backgroundColor: 'white', padding: '30px', borderRadius: '24px', width: '95%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#1e3a8a', margin: 0 }}>🛍️ Nova Venda de Uniforme avulsa</h2>
          <button onClick={onFechar} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>SELECIONAR ALUNO</label>
            <select value={alunoUniformeId} onChange={(e) => setAlunoUniformeId(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>
              <option value="">Escolha um aluno...</option>
              {alunos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>DATA DA COMPRA</label>
            <input type="date" value={dataVendaUniforme} onChange={(e) => setDataVendaUniforme(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: 'bold' }} />
          </div>

          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '12px' }}>QUANTIDADE E TAMANHOS</label>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
              {[
                { key: 'camisaPadrao', label: 'Camisa Padrão (R$60)' },
                { key: 'camisaEdFisica', label: 'Camisa Ed. Física (R$60)' },
                { key: 'calca', label: 'Calça (R$80)' },
                { key: 'shortSaia', label: 'Short-Saia (R$60)' },
                { key: 'short', label: 'Short (R$60)' },
                { key: 'casaco', label: 'Casaco (R$130)' },
              ].map((item) => (
                <div key={item.key} style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '8px' }}>{item.label}</span>
                  
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ flex: 1.3 }}>
                      <select
                        value={(uniformesTamanhos as any)[item.key]}
                        onChange={(e) => setUniformesTamanhos(prev => ({ ...prev, [item.key]: e.target.value }))}
                        style={{ width: '100%', padding: '7px 5px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '11px', fontWeight: 'bold', backgroundColor: 'white', color: '#334155' }}
                      >
                        <option value="4 anos">4 anos</option>
                        <option value="6 anos">6 anos</option>
                        <option value="8 anos">8 anos</option>
                        <option value="10 anos">10 anos</option>
                        <option value="12 anos">12 anos</option>
                      </select>
                    </div>

                    <div style={{ flex: 1 }}>
                      <input 
                        type="number" min="0" 
                        value={(uniformesVenda as any)[item.key] || ""} 
                        onChange={(e) => setUniformesVenda(prev => ({ ...prev, [item.key]: Math.max(0, parseInt(e.target.value) || 0) }))} 
                        style={{ width: '100%', padding: '6px 5px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold', fontSize: '11px', textAlign: 'center' }} 
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ backgroundColor: '#eff6ff', padding: '15px', borderRadius: '12px', textAlign: 'center', margin: '10px 0 5px 0' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#1e40af' }}>TOTAL DO UNIFORME</span>
            <h3 style={{ fontSize: '24px', fontWeight: '900', color: '#1e3a8a', margin: '4px 0 0' }}>R$ {totalVendaUniforme.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '25px' }}>
          <button onClick={onFechar} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', backgroundColor: 'white', fontWeight: 'bold', cursor: 'pointer' }}>CANCELAR</button>
          <button onClick={confirmarVendaUniforme} style={{ flex: 2, padding: '12px', borderRadius: '12px', border: 'none', backgroundColor: '#2563eb', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>CONFIRMAR VENDA 👕</button>
        </div>
      </div>
    </div>
  );
}