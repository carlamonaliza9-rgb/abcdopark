"use client";

interface FinanceiroHeaderProps {
  mesFiltro: string;
  setMesFiltro: (val: string) => void;
  onZerarMes: () => void;
}

export function FinanceiroHeader({
  mesFiltro,
  setMesFiltro,
  onZerarMes
}: FinanceiroHeaderProps) {
  return (
    <div className="flex-1 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 w-full">
      
      {/* Lado Esquerdo: Título e Filtro de Mês */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase italic">
          Financeiro ABC DO PARK
        </h1>
        <div className="flex items-center gap-3 mt-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Visualizar Mês:
          </label>
          <input 
            type="month" 
            value={mesFiltro} 
            onChange={(e) => setMesFiltro(e.target.value)} 
            className="bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold px-3 py-1.5 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer shadow-sm hover:border-indigo-300" 
          />
        </div>
      </div>

      {/* Lado Direito: Ação Administrativa (Zerar Mês) */}
      <div className="flex items-center w-full xl:w-auto">
        <button 
          onClick={onZerarMes} 
          className="flex justify-center w-full xl:w-auto items-center gap-2 px-5 py-3.5 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-bold text-xs rounded-xl transition-all shadow-sm border border-slate-200 uppercase tracking-widest"
          title="Resetar status de pagamentos do mês exibido"
        >
          🔄 Zerar Mês
        </button>
      </div>

    </div>
  );
}