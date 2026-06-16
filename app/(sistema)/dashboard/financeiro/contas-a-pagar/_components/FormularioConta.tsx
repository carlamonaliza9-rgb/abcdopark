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
    <section className="bg-white p-5 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-slate-100 mb-8 md:mb-10">
      <h3 className="text-base md:text-lg font-bold text-slate-900 mb-4 md:mb-5 mt-0">Nova Conta</h3>
      
      {/* O Grid Mágico: Empilhado no celular, 2 colunas no tablet, 5 colunas no desktop */}
      <form onSubmit={lidarSubmissao} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 md:gap-4 items-end">
        
        <div className="sm:col-span-2 md:col-span-1">
          <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Descrição</label>
          <input 
            placeholder="Ex: Aluguel, Luz..." 
            value={descricao} 
            onChange={e => setDescricao(e.target.value)} 
            required 
            disabled={salvando} 
            className="w-full p-3 md:p-3.5 rounded-xl border border-slate-200 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all text-sm disabled:bg-slate-50 disabled:text-slate-400" 
          />
        </div>
        
        <div>
          <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Valor (R$)</label>
          <input 
            type="number" 
            step="0.01" 
            min="0" 
            placeholder="0,00" 
            value={valor} 
            onChange={e => setValor(e.target.value)} 
            required 
            disabled={salvando} 
            className="w-full p-3 md:p-3.5 rounded-xl border border-slate-200 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all text-sm disabled:bg-slate-50 disabled:text-slate-400" 
          />
        </div>
        
        <div>
          <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Vencimento</label>
          <input 
            type="date" 
            value={vencimento} 
            onChange={e => setVencimento(e.target.value)} 
            required 
            disabled={salvando} 
            className="w-full p-3 md:p-3.5 rounded-xl border border-slate-200 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all text-sm disabled:bg-slate-50 disabled:text-slate-400" 
          />
        </div>
        
        <div>
          <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Repetir (Meses)</label>
          <select 
            value={repetirMeses} 
            onChange={e => setRepetirMeses(parseInt(e.target.value))} 
            disabled={salvando} 
            className="w-full p-3 md:p-3.5 rounded-xl border border-slate-200 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all text-sm disabled:bg-slate-50 disabled:text-slate-400 bg-white"
          >
            <option value="1">Só este mês</option>
            <option value="3">Próximos 3 meses</option>
            <option value="6">Próximos 6 meses</option>
            <option value="12">1 Ano (12 meses)</option>
          </select>
        </div>

        <button 
          type="submit" 
          disabled={salvando} 
          className={`w-full sm:col-span-2 md:col-span-1 md:w-auto px-6 py-3.5 md:py-4 rounded-xl font-bold text-white text-[10px] md:text-xs uppercase tracking-widest transition-all ${salvando ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-md shadow-blue-600/20'}`}
        >
          {salvando ? "Salvando..." : "Adicionar"}
        </button>
        
      </form>
    </section>
  );
}