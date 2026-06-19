"use client";

import { CalendarDays } from "lucide-react";

interface FinanceiroHeaderProps {
  mesFiltro: string;
  setMesFiltro: (val: string) => void;
  onZerarMes: () => void;
  userEmail?: string | null;
}

export function FinanceiroHeader({
  mesFiltro,
  setMesFiltro,
}: FinanceiroHeaderProps) {
  return (
    <div className="flex-1 flex flex-col xl:flex-row justify-between items-start xl:items-start gap-6 w-full">
      <div className="flex flex-col">
        <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
          Financeiro ABC DO PARK
        </h1>
        <p className="text-xs md:text-sm font-medium text-slate-500 mt-1 mb-5 md:mb-6">
          Acompanhe as finanças da escola de forma simples e eficiente.
        </p>
        
        <div className="flex items-center gap-3">
          <label className="text-xs md:text-sm font-medium text-slate-500">
            Visualizar mês:
          </label>
          <div className="relative flex items-center group">
            <CalendarDays className="absolute left-3 text-slate-400 pointer-events-none transition-colors group-hover:text-blue-500" size={16} strokeWidth={2.5} />
            <input 
              type="month" 
              value={mesFiltro} 
              onChange={(e) => setMesFiltro(e.target.value)} 
              className="pl-9 pr-4 py-2.5 bg-white border border-slate-200 text-slate-800 text-xs md:text-sm font-bold rounded-xl outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all cursor-pointer shadow-sm hover:border-blue-300 hover:bg-slate-50" 
            />
          </div>
        </div>
      </div>
    </div>
  );
}