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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between">
        <div>
          <div className="h-12 w-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center text-xl mb-4">👕</div>
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Venda de Uniformes Avulsos</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4 font-medium leading-relaxed">Emita faturamentos de camisas, casacos e calças escolares diretamente na ficha corrente do aluno selecionado.</p>
          
          <div className="space-y-3 border-t border-slate-100 pt-4 mb-6">
            <div className="flex justify-between items-center text-xs font-black text-purple-950 mb-1 uppercase tracking-widest">
              <span>📊 Peças Saídas (2026)</span>
              <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-xl">{totalPecasAno} un.</span>
            </div>
            <div>
              <div className="flex justify-between text-[10px] font-black uppercase text-slate-500 mb-1">
                <span>👕 Camisas</span>
                <span className="text-slate-900">{camisasVendidas} pçs</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-purple-500 h-full transition-all duration-500" style={{ width: `${hCamisas}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] font-black uppercase text-slate-500 mb-1">
                <span>👖 Inferiores (Calças/Saias)</span>
                <span className="text-slate-900">{inferioresVendidos} pçs</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-fuchsia-500 h-full transition-all duration-500" style={{ width: `${hInferiores}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] font-black uppercase text-slate-500 mb-1">
                <span>🧥 Casacos de Inverno</span>
                <span className="text-slate-900">{casacosVendidos} pçs</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-indigo-500 h-full transition-all duration-500" style={{ width: `${hCasacos}%` }}></div>
              </div>
            </div>
          </div>
        </div>
        <button onClick={() => setModalUniformeAberto(true)} className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-lg shadow-purple-200 transition-all active:scale-95">
          Registrar Nova Venda
        </button>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start">
            <div className="h-12 w-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center text-xl mb-4">📦</div>
            <button onClick={() => setModalTaxaAvulsaAberto(true)} className="text-[10px] uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-2 rounded-xl font-black hover:bg-emerald-100 transition-colors shadow-sm active:scale-95">
              + Lançar P/ 1 Aluno
            </button>
          </div>
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Faturamento Geral em Lote</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4 font-medium leading-relaxed">Insira cobranças anuais automáticas de Livros Didáticos e Taxas de Materiais para todos os alunos filtrados por segmento de ensino.</p>
          
          <div className="space-y-4 border-t border-slate-100 pt-4 mb-6">
            <div>
              <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest text-slate-700 mb-1">
                <span>🎨 Taxa Material</span>
                <span className="text-emerald-600">{pctMaterial}% Recebido</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${pctMaterial}%` }}></div>
              </div>
              <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 mt-1 uppercase">
                <span>{pagoMaterial} quitados</span>
                <span className="text-rose-500">{faltamMaterial} pendentes</span>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest text-slate-700 mb-1">
                <span>📘 Livros Didáticos</span>
                <span className="text-blue-600">{pctLivros}% Recebido</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${pctLivros}%` }}></div>
              </div>
              <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 mt-1 uppercase">
                <span>{pagoLivros} quitados</span>
                <span className="text-rose-500">{faltamLivros} pendentes</span>
              </div>
            </div>
          </div>
        </div>
        <button onClick={() => setModalTaxasAberto(true)} className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-lg shadow-emerald-200 transition-all active:scale-95">
          Gerar Lote Geral
        </button>
      </div>
    </div>
  );
}