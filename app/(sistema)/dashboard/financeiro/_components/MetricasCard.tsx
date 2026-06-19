"use client";

import { DollarSign, ArrowDown, TrendingUp, Tag, CalendarDays, Info } from "lucide-react";

interface MetricasCardProps {
  metricas: {
    total: number;
    pago: number;
    pendente: number;
    descontos: number;
    gastos: number;
    lucro: number;
  };
  onAbrirListaGastos: () => void;
  onAbrirListaReceitas: () => void;
}

export function MetricasCard({ metricas, onAbrirListaGastos, onAbrirListaReceitas }: MetricasCardProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 md:gap-6 mb-8">
      
      {/* 1. Receita no Mês */}
      <div 
        onClick={onAbrirListaReceitas} 
        className="bg-white rounded-[1.5rem] p-5 md:p-6 border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex items-center gap-4"
      >
        <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
          <DollarSign size={24} strokeWidth={2.5} className="md:w-7 md:h-7" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[11px] md:text-xs font-bold text-slate-500">Receita no mês</span>
            <Info size={12} className="text-slate-300" />
          </div>
          <span className="text-xl md:text-2xl font-black text-emerald-600 leading-none mb-1">R$ {metricas.pago.toLocaleString('pt-BR', {minimumFractionDigits:2})}</span>
          <span className="text-[9px] md:text-[10px] font-medium text-slate-400">Total recebido</span>
        </div>
      </div>

      {/* 2. Gastos no Mês */}
      <div 
        onClick={onAbrirListaGastos} 
        className="bg-white rounded-[1.5rem] p-5 md:p-6 border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex items-center gap-4"
      >
        <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-sm">
          <ArrowDown size={24} strokeWidth={2.5} className="md:w-7 md:h-7" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[11px] md:text-xs font-bold text-slate-500">Gastos no mês</span>
            <Info size={12} className="text-slate-300" />
          </div>
          <span className="text-xl md:text-2xl font-black text-rose-500 leading-none mb-1">R$ {metricas.gastos.toLocaleString('pt-BR', {minimumFractionDigits:2})}</span>
          <span className="text-[9px] md:text-[10px] font-medium text-slate-400">Total de despesas</span>
        </div>
      </div>

      {/* 3. Lucro Real */}
      <div className="bg-white rounded-[1.5rem] p-5 md:p-6 border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] flex items-center gap-4">
        <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center shrink-0 border border-blue-100/50">
          <TrendingUp size={24} strokeWidth={2.5} className="md:w-7 md:h-7" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[11px] md:text-xs font-bold text-slate-500">Lucro real</span>
            <Info size={12} className="text-slate-300" />
          </div>
          <span className="text-xl md:text-2xl font-black text-blue-600 leading-none mb-1">R$ {metricas.lucro.toLocaleString('pt-BR', {minimumFractionDigits:2})}</span>
          <span className="text-[9px] md:text-[10px] font-medium text-slate-400">Receita - Gastos</span>
        </div>
      </div>

      {/* 4. Descontos */}
      <div className="bg-white rounded-[1.5rem] p-5 md:p-6 border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] flex items-center gap-4">
        <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl md:rounded-3xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0 border border-amber-100/50 rotate-3">
          <Tag size={24} strokeWidth={2.5} className="md:w-7 md:h-7 -rotate-3" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[11px] md:text-xs font-bold text-slate-500">Descontos</span>
            <Info size={12} className="text-slate-300" />
          </div>
          <span className="text-xl md:text-2xl font-black text-amber-500 leading-none mb-1">R$ {metricas.descontos.toLocaleString('pt-BR', {minimumFractionDigits:2})}</span>
          <span className="text-[9px] md:text-[10px] font-medium text-slate-400">Concessões no mês</span>
        </div>
      </div>

      {/* 5. Pendente */}
      <div className="bg-white rounded-[1.5rem] p-5 md:p-6 border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] flex items-center gap-4">
        <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center shrink-0 border border-purple-100/50">
          <CalendarDays size={24} strokeWidth={2.5} className="md:w-7 md:h-7" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[11px] md:text-xs font-bold text-slate-500">Pendente no mês</span>
            <Info size={12} className="text-slate-300" />
          </div>
          <span className="text-xl md:text-2xl font-black text-slate-800 leading-none mb-1">R$ {metricas.pendente.toLocaleString('pt-BR', {minimumFractionDigits:2})}</span>
          <span className="text-[9px] md:text-[10px] font-medium text-slate-400">A receber</span>
        </div>
      </div>

    </div>
  );
}