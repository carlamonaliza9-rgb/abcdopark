"use client";
import { useState } from "react";

interface FormularioContaProps {
  onSalvar: (dados: { descricao: string, valor: number, vencimento: string, repetirMeses: number }) => Promise<void>;
}

export function FormularioConta({ onSalvar }: FormularioContaProps) {
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [vencimento, setVencimento] = useState("");
  const [repetirMeses, setRepetirMeses] = useState(1);
  const [salvando, setSalvando] = useState(false);

  async function lidarSubmissao(e: React.FormEvent) {
    e.preventDefault();

    // TRAVA 1: Impedir valor negativo por segurança adicional (além do min="0" no HTML)
    if (parseFloat(valor) <= 0) {
      alert("O valor da conta deve ser maior que zero.");
      return;
    }

    // TRAVA 2: Bloquear múltiplos cliques
    setSalvando(true);

    try {
      await onSalvar({
        descricao,
        valor: parseFloat(valor),
        vencimento,
        repetirMeses
      });

      // Se deu tudo certo, limpa os campos
      setDescricao("");
      setValor("");
      setVencimento("");
      setRepetirMeses(1);
    } finally {
      // Libera o botão novamente, dando certo ou errado
      setSalvando(false);
    }
  }

  return (
    <section style={{ backgroundColor: 'white', padding: '25px', borderRadius: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', marginBottom: '40px' }}>
      <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '18px' }}>Nova Conta</h3>
      <form onSubmit={lidarSubmissao} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '15px', alignItems: 'end' }}>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#4b5563', display: 'block', marginBottom: '5px' }}>DESCRIÇÃO</label>
          <input placeholder="Ex: Aluguel, Luz..." value={descricao} onChange={e => setDescricao(e.target.value)} required disabled={salvando} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', backgroundColor: salvando ? '#f8fafc' : 'white' }} />
        </div>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#4b5563', display: 'block', marginBottom: '5px' }}>VALOR (R$)</label>
          <input type="number" step="0.01" min="0" placeholder="0,00" value={valor} onChange={e => setValor(e.target.value)} required disabled={salvando} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', backgroundColor: salvando ? '#f8fafc' : 'white' }} />
        </div>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#4b5563', display: 'block', marginBottom: '5px' }}>VENCIMENTO</label>
          <input type="date" value={vencimento} onChange={e => setVencimento(e.target.value)} required disabled={salvando} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', backgroundColor: salvando ? '#f8fafc' : 'white' }} />
        </div>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#4b5563', display: 'block', marginBottom: '5px' }}>REPETIR (MESES)</label>
          <select value={repetirMeses} onChange={e => setRepetirMeses(parseInt(e.target.value))} disabled={salvando} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', backgroundColor: salvando ? '#f8fafc' : '#fff' }}>
            <option value="1">Só este mês</option>
            <option value="3">Próximos 3 meses</option>
            <option value="6">Próximos 6 meses</option>
            <option value="12">1 Ano (12 meses)</option>
          </select>
        </div>

        <button type="submit" disabled={salvando} style={{ padding: '14px 25px', borderRadius: '12px', border: 'none', backgroundColor: salvando ? '#93c5fd' : '#2563eb', color: 'white', fontWeight: 'bold', cursor: salvando ? 'not-allowed' : 'pointer' }}>
          {salvando ? "SALVANDO..." : "ADICIONAR"}
        </button>
      </form>
    </section>
  );
}