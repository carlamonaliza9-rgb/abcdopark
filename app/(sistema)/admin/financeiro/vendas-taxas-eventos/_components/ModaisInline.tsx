"use client";

interface ModaisInlineProps {
  modalEdicaoLoteAberto: boolean;
  setModalEdicaoLoteAberto: (aberto: boolean) => void;
  dadosEdicaoLote: { valor_total: string; data_pagamento: string };
  setDadosEdicaoLote: (dados: any) => void;
  handleEditarLote: () => void;
  taxasSelecionadas: string[];
  modalTaxaAvulsaAberto: boolean;
  setModalTaxaAvulsaAberto: (aberto: boolean) => void;
  taxaAvulsa: { aluno_id: string; tipo: string; valor_total: string; data_pagamento: string; mes_referencia: string };
  setTaxaAvulsa: (taxa: any) => void;
  alunos: any[];
  handleLancarTaxaAvulsa: () => void;
}

export function ModaisInline({
  modalEdicaoLoteAberto, setModalEdicaoLoteAberto, dadosEdicaoLote, setDadosEdicaoLote,
  handleEditarLote, taxasSelecionadas, modalTaxaAvulsaAberto, setModalTaxaAvulsaAberto,
  taxaAvulsa, setTaxaAvulsa, alunos, handleLancarTaxaAvulsa
}: ModaisInlineProps) {
  return (
    <>
      {modalEdicaoLoteAberto && (
        <div 
          className="fixed inset-0 bg-slate-900/60 flex items-end md:items-center justify-center z-[4000] backdrop-blur-sm p-0 md:p-4"
          onClick={() => setModalEdicaoLoteAberto(false)}
        >
          <div 
            className="bg-white p-6 md:p-8 rounded-t-[2rem] md:rounded-[2.5rem] w-full max-w-sm shadow-2xl animate-in slide-in-from-bottom-full md:zoom-in-95 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Pílula de arrasto Mobile */}
            <div className="w-full flex justify-center md:hidden mb-6">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
            </div>

            <h2 className="text-center font-black text-slate-800 mb-6 text-base md:text-xl uppercase tracking-tighter italic">✏️ Editar {taxasSelecionadas.length} Itens</h2>
            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Novo Valor (R$):</label>
                <input 
                  type="number" placeholder="Branco para manter igual" value={dadosEdicaoLote.valor_total} 
                  onChange={(e) => setDadosEdicaoLote({...dadosEdicaoLote, valor_total: e.target.value})} 
                  className="w-full p-3 md:p-4 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl text-xs md:text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 transition-shadow"
                />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Novo Vencimento:</label>
                <input 
                  type="date" value={dadosEdicaoLote.data_pagamento} 
                  onChange={(e) => setDadosEdicaoLote({...dadosEdicaoLote, data_pagamento: e.target.value})} 
                  className="w-full p-3 md:p-4 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl text-xs md:text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 transition-shadow"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-8">
              <button onClick={() => setModalEdicaoLoteAberto(false)} className="flex-1 py-3.5 md:py-4 border border-slate-200 bg-white rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[9px] md:text-xs text-slate-500 hover:bg-slate-50 transition-all active:scale-95">CANCELAR</button>
              <button onClick={handleEditarLote} className="flex-[2] py-3.5 md:py-4 bg-blue-600 text-white rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[9px] md:text-xs shadow-lg shadow-blue-600/20 active:scale-95 transition-all">SALVAR LOTE</button>
            </div>
          </div>
        </div>
      )}

      {modalTaxaAvulsaAberto && (
        <div 
          className="fixed inset-0 bg-slate-900/60 flex items-end md:items-center justify-center z-[4000] backdrop-blur-sm p-0 md:p-4"
          onClick={() => setModalTaxaAvulsaAberto(false)}
        >
          <div 
            className="bg-white p-6 md:p-8 rounded-t-[2rem] md:rounded-[2.5rem] w-full max-w-md shadow-2xl animate-in slide-in-from-bottom-full md:zoom-in-95 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Pílula de arrasto Mobile */}
            <div className="w-full flex justify-center md:hidden mb-6">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
            </div>

            <h2 className="text-center font-black text-emerald-900 mb-6 text-lg md:text-2xl uppercase tracking-tighter italic">📦 Lançar Taxa</h2>
            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Selecionar Aluno:</label>
                <select 
                  value={taxaAvulsa.aluno_id} onChange={(e) => setTaxaAvulsa({...taxaAvulsa, aluno_id: e.target.value})}
                  className="w-full p-3.5 md:p-4 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl text-xs md:text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-100 transition-shadow"
                >
                  <option value="">Selecione na lista...</option>
                  {alunos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Categoria:</label>
                  <select 
                    value={taxaAvulsa.tipo} onChange={(e) => setTaxaAvulsa({...taxaAvulsa, tipo: e.target.value})}
                    className="w-full p-3.5 md:p-4 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl text-xs md:text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-100 transition-shadow"
                  >
                    <option value="material">🎨 Material</option>
                    <option value="livro">📘 Livros</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Ano Letivo:</label>
                  <input 
                    type="text" value={taxaAvulsa.mes_referencia} onChange={(e) => setTaxaAvulsa({...taxaAvulsa, mes_referencia: e.target.value})}
                    className="w-full p-3.5 md:p-4 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl text-xs md:text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-100 transition-shadow"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Valor (R$):</label>
                  <input 
                    type="number" value={taxaAvulsa.valor_total} onChange={(e) => setTaxaAvulsa({...taxaAvulsa, valor_total: e.target.value})} placeholder="0.00"
                    className="w-full p-3.5 md:p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl md:rounded-2xl text-xs md:text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-100 transition-shadow"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Vencimento:</label>
                  <input 
                    type="date" value={taxaAvulsa.data_pagamento} onChange={(e) => setTaxaAvulsa({...taxaAvulsa, data_pagamento: e.target.value})}
                    className="w-full p-3.5 md:p-4 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl text-xs md:text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-100 transition-shadow"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-8">
              <button onClick={() => setModalTaxaAvulsaAberto(false)} className="flex-1 py-3.5 md:py-4 border border-slate-200 bg-white rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[9px] md:text-xs text-slate-500 hover:bg-slate-50 transition-all active:scale-95">CANCELAR</button>
              <button onClick={handleLancarTaxaAvulsa} className="flex-[2] py-3.5 md:py-4 bg-emerald-500 text-white rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[9px] md:text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">LANÇAR NO SISTEMA</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}