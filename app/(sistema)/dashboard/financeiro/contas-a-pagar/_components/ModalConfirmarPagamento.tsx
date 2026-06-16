"use client";

import { useState, useEffect } from "react";
import { UploadComprovante } from "./UploadComprovante";

interface ModalConfirmarPagamentoProps {
  aberto: boolean;
  contaParaPagar: any;
  salvandoPgto: boolean;
  onRegistrarPagamento: (file: File | null, dataPgto: string) => void;
  onFechar: () => void;
}

export function ModalConfirmarPagamento({ aberto, contaParaPagar, salvandoPgto, onRegistrarPagamento, onFechar }: ModalConfirmarPagamentoProps) {
  const [dataPagamento, setDataPagamento] = useState("");
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null);

  useEffect(() => {
    if (aberto && contaParaPagar) {
      const dataInicial = contaParaPagar.data_pagamento || new Date().toISOString().split('T')[0];
      setDataPagamento(dataInicial);
      setArquivoSelecionado(null);
    }
  }, [aberto, contaParaPagar]);

  if (!aberto || !contaParaPagar) return null;

  const ehEdicao = !!contaParaPagar.pago;

  return (
    <div 
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-end md:items-center justify-center md:p-4"
      onClick={onFechar}
    >
      <div 
        className="bg-white p-4 md:p-10 rounded-t-[2rem] md:rounded-[30px] w-full max-w-[400px] text-center shadow-2xl animate-in slide-in-from-bottom-full md:zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4 md:hidden"></div>

        <h2 className="m-0 mb-1 text-base md:text-2xl font-black text-slate-800">
          {ehEdicao ? "Editar Pagamento" : "Confirmar Pgto."}
        </h2>
        <p className="text-slate-500 mb-4 text-[10px] md:text-sm">
          {ehEdicao ? "Atualizando:" : "Pagamento de:"} 
          <strong className="text-slate-700 block"> {contaParaPagar.descricao} (R$ {contaParaPagar.valor.toLocaleString('pt-BR')})</strong>
        </p>

        <div className="mb-4 text-left">
          <label className="text-[8px] md:text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Data</label>
          <input 
            type="date" 
            value={dataPagamento} 
            onChange={(e) => setDataPagamento(e.target.value)}
            className="w-full p-2 md:p-3 rounded-lg border-2 border-slate-200 outline-none text-slate-600 font-bold text-xs md:text-sm focus:border-blue-400 transition-colors"
          />
        </div>
        
        {salvandoPgto ? (
          <div className="py-6 font-bold text-blue-600 animate-pulse text-xs">Salvando...</div>
        ) : (
          <div className="flex flex-col gap-2">
            <UploadComprovante onFileSelect={(file) => setArquivoSelecionado(file)} />
            
            {arquivoSelecionado && <p className="text-[9px] text-emerald-500 font-bold m-0">✓ Arquivo anexado</p>}

            <button 
              onClick={() => onRegistrarPagamento(arquivoSelecionado, dataPagamento)}
              disabled={!arquivoSelecionado && !ehEdicao}
              className={`w-full p-2.5 md:p-4 rounded-xl border-none text-white font-black uppercase tracking-widest text-[9px] md:text-xs transition-all ${
                (arquivoSelecionado || ehEdicao) 
                  ? 'bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-md' 
                  : 'bg-blue-300 cursor-not-allowed opacity-50'
              }`}
            >
              {ehEdicao ? "Salvar" : "Confirmar"}
            </button>
          </div>
        )}

        <button 
          onClick={onFechar} 
          disabled={salvandoPgto}
          className="mt-3 bg-transparent border-none text-slate-400 font-bold text-[9px] md:text-xs uppercase tracking-widest cursor-pointer hover:text-slate-600"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}