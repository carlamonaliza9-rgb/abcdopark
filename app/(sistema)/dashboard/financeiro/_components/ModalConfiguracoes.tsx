"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface ModalConfiguracoesProps {
  aberto: boolean;
  onFechar: () => void;
  onSalvar: () => void;
}

export function ModalConfiguracoes({ aberto, onFechar, onSalvar }: ModalConfiguracoesProps) {
  const [valorBase, setValorBase] = useState<string>("");
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (aberto) {
      carregarConfiguracao();
    }
  }, [aberto]);

  async function carregarConfiguracao() {
    setCarregando(true);
    try {
      const { data, error } = await supabase
        .from("configuracoes")
        .select("valor")
        .eq("chave", "mensalidade_base")
        .single();

      if (error) throw error;
      if (data) setValorBase(data.valor);
    } catch (err) {
      console.error("Erro ao carregar configuração:", err);
    } finally {
      setCarregando(false);
    }
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    
    try {
      const { error } = await supabase
        .from("configuracoes")
        .update({ valor: valorBase })
        .eq("chave", "mensalidade_base");

      if (error) throw error;
      
      alert("Configurações atualizadas com sucesso!");
      onSalvar(); // Recarrega os dados na página principal e fecha o modal
    } catch (err) {
      console.error("Erro ao salvar configuração:", err);
      alert("Erro ao salvar. Verifique se tem permissões de Administrador.");
    } finally {
      setSalvando(false);
    }
  }

  if (!aberto) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      onClick={onFechar}
    >
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            ⚙️ Configurações do Sistema
          </h2>
          <button onClick={onFechar} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSalvar} className="p-5 space-y-6">
          {carregando ? (
            <div className="text-center text-slate-400 text-sm py-4 animate-pulse">A carregar dados...</div>
          ) : (
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">
                Valor Base da Mensalidade (R$)
              </label>
              <p className="text-xs text-slate-500 mb-2">
                Este valor será usado como referência para calcular os descontos concedidos.
              </p>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={valorBase}
                onChange={(e) => setValorBase(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-700 font-medium"
                placeholder="Ex: 550.00"
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onFechar}
              className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando || carregando}
              className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
            >
              {salvando ? "A guardar..." : "Guardar Alterações"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}