"use client";

interface CardMetricasProps {
  totalPecasAno: number;
  camisasVendidas: number;
  inferioresVendidos: number;
  casacosVendidos: number;
  hCamisas: number;
  hInferiores: number;
  hCasacos: number;
  pagoMaterial: number;
  totalMaterial: number;
  pctMaterial: number;
  faltamMaterial: number;
  pagoLivros: number;
  totalLivros: number;
  pctLivros: number;
  faltamLivros: number;
  setModalUniformeAberto: (aberto: boolean) => void;
  setModalTaxasAberto: (aberto: boolean) => void;
  setModalTaxaAvulsaAberto: (aberto: boolean) => void;
}

export function CardMetricas({
  totalPecasAno, camisasVendidas, inferioresVendidos, casacosVendidos,
  hCamisas, hInferiores, hCasacos, pagoMaterial, totalMaterial,
  pctMaterial, faltamMaterial, pagoLivros, totalLivros, pctLivros,
  faltamLivros, setModalUniformeAberto, setModalTaxasAberto, setModalTaxaAvulsaAberto
}: CardMetricasProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-8">
      
      {/* CARD UNIFORMES */}
      <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between">
        <div>
          <div className="h-10 w-10 md:h-12 md:w-12 bg-purple-100 text-purple-600 rounded-xl md:rounded-2xl flex items-center justify-center text-lg md:text-xl mb-3 md:mb-4">👕</div>
          <h3 className="text-base md:text-lg font-black text-slate-900 uppercase tracking-tight">Venda de Uniformes</h3>
          <p className="text-[10px] md:text-xs text-slate-500 mt-1 mb-3 md:mb-4 font-medium leading-relaxed">Emita faturamentos de camisas, casacos e calças escolares diretamente na ficha do aluno.</p>
          
          <div className="space-y-3 border-t border-slate-100 pt-4 mb-4">
            <div className="flex justify-between items-center text-[10px] md:text-xs font-black text-purple-950 mb-1 uppercase tracking-widest">
              <span>📊 Peças Saídas (2026)</span>
              <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-lg">{totalPecasAno} un.</span>
            </div>
            {/* Barras de Progresso */}
            <div className="space-y-2">
              {[
                { label: "👕 Camisas", val: camisasVendidas, h: hCamisas, col: "bg-purple-500" },
                { label: "👖 Inferiores", val: inferioresVendidos, h: hInferiores, col: "bg-fuchsia-500" },
                { label: "🧥 Casacos", val: casacosVendidos, h: hCasacos, col: "bg-indigo-500" }
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-[9px] uppercase font-black text-slate-500 mb-0.5">
                    <span>{item.label}</span>
                    <span className="text-slate-900">{item.val} pçs</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className={`${item.col} h-full transition-all duration-500`} style={{ width: `${item.h}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <button onClick={() => setModalUniformeAberto(true)} className="w-full py-3 md:py-4 bg-purple-600 hover:bg-purple-700 text-white font-black uppercase tracking-widest text-[9px] md:text-[10px] rounded-xl md:rounded-2xl shadow-lg shadow-purple-200 transition-all active:scale-95 mt-2">
          Registrar Nova Venda
        </button>
      </div>

      {/* CARD TAXAS */}
      <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start">
            <div className="h-10 w-10 md:h-12 md:w-12 bg-emerald-100 text-emerald-600 rounded-xl md:rounded-2xl flex items-center justify-center text-lg md:text-xl mb-3 md:mb-4">📦</div>
            <button onClick={() => setModalTaxaAvulsaAberto(true)} className="text-[9px] uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg font-black hover:bg-emerald-100 transition-colors shadow-sm active:scale-95">
              + Lançar P/ 1 Aluno
            </button>
          </div>
          <h3 className="text-base md:text-lg font-black text-slate-900 uppercase tracking-tight">Faturamento em Lote</h3>
          <p className="text-[10px] md:text-xs text-slate-500 mt-1 mb-3 md:mb-4 font-medium leading-relaxed">Insira cobranças anuais automáticas de Livros e Materiais.</p>
          
          <div className="space-y-3 border-t border-slate-100 pt-4 mb-4">
             {[
                { title: "🎨 Taxa Material", pct: pctMaterial, pago: pagoMaterial, faltam: faltamMaterial, col: "bg-emerald-500" },
                { title: "📘 Livros Didáticos", pct: pctLivros, pago: pagoLivros, faltam: faltamLivros, col: "bg-blue-500" }
             ].map(taxa => (
                <div key={taxa.title}>
                  <div className="flex justify-between items-center text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-700 mb-1">
                    <span>{taxa.title}</span>
                    <span className={taxa.title.includes('Material') ? 'text-emerald-600' : 'text-blue-600'}>{taxa.pct}% Recebido</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                    <div className={`${taxa.col} h-full transition-all duration-500`} style={{ width: `${taxa.pct}%` }}></div>
                  </div>
                  <div className="flex justify-between items-center text-[8px] md:text-[9px] font-bold text-slate-400 mt-1 uppercase">
                    <span>{taxa.pago} quitados</span>
                    <span className="text-rose-500">{taxa.faltam} pendentes</span>
                  </div>
                </div>
             ))}
          </div>
        </div>
        <button onClick={() => setModalTaxasAberto(true)} className="w-full py-3 md:py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-widest text-[9px] md:text-[10px] rounded-xl md:rounded-2xl shadow-lg shadow-emerald-200 transition-all active:scale-95 mt-2">
          Gerar Lote Geral
        </button>
      </div>
    </div>
  );
}