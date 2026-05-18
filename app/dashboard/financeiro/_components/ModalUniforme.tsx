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
  const [metodosUniforme, setMetodosUniforme] = useState({ pix: "", dinheiro: "", credito: "", debito: "" });

  const precosUniformes = {
    camisaPadrao: 60,
    camisaEdFisica: 60,
    calca: 80,
    shortSaia: 65,
    short: 55,
    casaco: 130,
  };

  const totalVendaUniforme = 
    (uniformesVenda.camisaPadrao * precosUniformes.camisaPadrao) +
    (uniformesVenda.camisaEdFisica * precosUniformes.camisaEdFisica) +
    (uniformesVenda.calca * precosUniformes.calca) +
    (uniformesVenda.shortSaia * precosUniformes.shortSaia) +
    (uniformesVenda.short * precosUniformes.short) +
    (uniformesVenda.casaco * precosUniformes.casaco);

  const preencherTotalMetodo = (campo: string) => {
    setMetodosUniforme({ pix: "", dinheiro: "", credito: "", debito: "", [campo]: totalVendaUniforme.toString() });
  };

  async function confirmarVendaUniforme() {
    if (!alunoUniformeId) return alert("Selecione um aluno.");
    if (totalVendaUniforme <= 0) return alert("Adicione pelo menos um item.");

    const somaMetodos = Object.values(metodosUniforme).reduce((acc, val) => acc + (parseFloat(val as string) || 0), 0);
    const alunoIdNum = parseInt(alunoUniformeId);
    const alunoAtual = alunos.find(a => a.id === alunoIdNum);

    const creditoUtilizado = parseFloat((metodosUniforme as any).credito || 0);
    const saldoDisponivel = parseFloat(alunoAtual?.saldo_credito || 0);

    if (creditoUtilizado > saldoDisponivel) {
      return alert(`O aluno possui apenas R$ ${saldoDisponivel.toFixed(2)} de crédito disponível.`);
    }

    let status = "pago";
    let valorPagoFinal = somaMetodos;
    let creditoGerado = 0;

    if (somaMetodos > totalVendaUniforme) {
      status = "pago";
      valorPagoFinal = totalVendaUniforme;
      creditoGerado = somaMetodos - totalVendaUniforme; 
    } else if (somaMetodos < totalVendaUniforme) {
      status = somaMetodos === 0 ? "pendente" : "parcial";
    }

    const itensComprados: string[] = [];
    if (uniformesVenda.camisaPadrao > 0) itensComprados.push(`${uniformesVenda.camisaPadrao}x Camisa Padrão`);
    if (uniformesVenda.camisaEdFisica > 0) itensComprados.push(`${uniformesVenda.camisaEdFisica}x Camisa Ed. Física`);
    if (uniformesVenda.calca > 0) itensComprados.push(`${uniformesVenda.calca}x Calça`);
    if (uniformesVenda.shortSaia > 0) itensComprados.push(`${uniformesVenda.shortSaia}x Short-Saia`);
    if (uniformesVenda.short > 0) itensComprados.push(`${uniformesVenda.short}x Short`);
    if (uniformesVenda.casaco > 0) itensComprados.push(`${uniformesVenda.casaco}x Casaco`);

    const descricaoFinal = `Venda de Uniforme Avulsa: ${itensComprados.join(", ")}`;
    const _anoVenda = dataVendaUniforme.split("-")[0];

    const { error } = await supabase.from('historico_pagamentos').insert([{
      aluno_id: alunoIdNum,
      tipo: 'uniforme',
      descricao: descricaoFinal,
      valor_total: totalVendaUniforme,
      valor_pago: valorPagoFinal,
      status: status,
      data_pagamento: status === 'pendente' ? null : dataVendaUniforme,
      detalhes_metodos: metodosUniforme,
      mes_referencia: `Avulso ${_anoVenda}`
    }]);

    if (error) {
      alert("Erro ao salvar venda: " + error.message);
    } else {
      const novoSaldoCredito = saldoDisponivel - creditoUtilizado + creditoGerado;
      if (novoSaldoCredito !== saldoDisponivel) {
        await supabase.from('alunos').update({ saldo_credito: novoSaldoCredito }).eq('id', alunoIdNum);
      }
      alert(status === 'pago' ? "Venda registrada com sucesso! 👕" : `Venda registrada! Saldo de R$ ${(totalVendaUniforme - valorPagoFinal).toFixed(2)} pendente na ficha do aluno.`);
      
      // Reseta o modal
      setUniformesVenda({ camisaPadrao: 0, camisaEdFisica: 0, calca: 0, shortSaia: 0, short: 0, casaco: 0 });
      setMetodosUniforme({ pix: "", dinheiro: "", credito: "", debito: "" });
      setAlunoUniformeId("");
      
      carregarDados();
      onFechar();
    }
  }

  if (!aberto) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, backdropFilter: 'blur(4px)' }}>
      <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '24px', width: '95%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
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
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '10px' }}>QUANTIDADE DE ITENS</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
              {[
                { key: 'camisaPadrao', label: 'Camisa Padrão (R$60)' },
                { key: 'camisaEdFisica', label: 'Camisa Ed. Física (R$60)' },
                { key: 'calca', label: 'Calça (R$80)' },
                { key: 'shortSaia', label: 'Short-Saia (R$65)' },
                { key: 'short', label: 'Short (R$55)' },
                { key: 'casaco', label: 'Casaco (R$130)' },
              ].map((item) => (
                <div key={item.key} style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '5px' }}>{item.label}</span>
                  <input 
                    type="number" min="0" 
                    value={(uniformesVenda as any)[item.key] || ""} 
                    onChange={(e) => setUniformesVenda(prev => ({ ...prev, [item.key]: Math.max(0, parseInt(e.target.value) || 0) }))} 
                    style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 'bold' }} 
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
          </div>

          <div style={{ backgroundColor: '#eff6ff', padding: '15px', borderRadius: '12px', textAlign: 'center', margin: '5px 0' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#1e40af' }}>TOTAL DO UNIFORME</span>
            <h3 style={{ fontSize: '24px', fontWeight: '900', color: '#1e3a8a', margin: '4px 0 0' }}>R$ {totalVendaUniforme.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
          </div>

          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px' }}>VALOR PAGO NO ATO (MÉTODO DE RECEBIMENTO)</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
              {['pix', 'dinheiro', 'credito', 'debito'].map((metodo) => (
                <div key={metodo} style={{ position: 'relative' }}>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', marginBottom: '3px' }}>{metodo}</label>
                  <input 
                    type="number" value={(metodosUniforme as any)[metodo] || ""} 
                    onChange={(e) => setMetodosUniforme(prev => ({ ...prev, [metodo]: e.target.value }))} 
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold', fontSize: '13px' }} 
                    placeholder="0.00"
                  />
                  <button 
                    onClick={() => preencherTotalMetodo(metodo)} 
                    style={{ width: '100%', marginTop: '4px', border: 'none', background: '#f1f5f9', color: '#2563eb', fontSize: '9px', fontWeight: 'bold', padding: '3px', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Pagar Tudo
                  </button>
                </div>
              ))}
            </div>
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