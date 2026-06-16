"use client";

import { useState } from "react";
import { X, UserMinus, AlertTriangle } from "lucide-react";

interface ModalTransferenciaProps {
  aberto: boolean;
  onFechar: () => void;
  aluno: any;
  onConfirmar: (dataTransferencia: string, observacao: string) => void;
}

export function ModalTransferencia({ aberto, onFechar, aluno, onConfirmar }: ModalTransferenciaProps) {
  const [dataTransferencia, setDataTransferencia] = useState(new Date().toISOString().split('T')[0]);
  const [observacao, setObservacao] = useState("");

  if (!aberto || !aluno) return null;

  const lidarComSalvar = () => {
    if (!dataTransferencia) return alert("A data da transferência é obrigatória.");
    onConfirmar(dataTransferencia, observacao);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={onFechar}>
      <div 
        className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <UserMinus size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 leading-tight">Transferir Aluno</h2>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mudança de Status</p>
            </div>
          </div>
          <button onClick={onFechar} className="p-2 bg-slate-50 text-slate-400 hover:text-slate-600 rounded-full transition-colors">
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl mb-6 flex gap-3 text-amber-800">
          <AlertTriangle size={20} className="shrink-0 text-amber-500" />
          <p className="text-xs font-bold leading-relaxed">
            O aluno <span className="font-black">{aluno.nome}</span> não será excluído do sistema. O histórico financeiro será mantido, mas ele deixará de constar nas listas ativas de frequência da turma.
          </p>
        </div>

        <div className="space-y-5 mb-8">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Data da Efetivação</label>
            <input 
              type="date" 
              value={dataTransferencia}
              onChange={(e) => setDataTransferencia(e.target.value)}
              className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-rose-100 transition-all"
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Motivo / Observações (Opcional)</label>
            <textarea 
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex: Mudança de cidade, transferência para escola estadual..."
              rows={3}
              className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 font-bold text-sm text-slate-800 outline-none focus:ring-2 focus:ring-rose-100 transition-all resize-none custom-scrollbar"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onFechar} className="flex-1 py-4 rounded-2xl border border-slate-200 text-slate-500 font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button onClick={lidarComSalvar} className="flex-[2] py-4 rounded-2xl bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-600/20 text-white font-black text-xs uppercase tracking-widest transition-all active:scale-[0.98]">
            Efetivar Transferência
          </button>
        </div>
      </div>
    </div>
  );
}