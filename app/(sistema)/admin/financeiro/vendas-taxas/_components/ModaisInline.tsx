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
          className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[4000] backdrop-blur-sm p-4"
          onClick={() => setModalEdicaoLoteAberto(false)}
        >
          <div 
            className="bg-white p-8 rounded-[2.5rem] w-full max-w-sm shadow-2xl animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-center font-black text-slate-800 mb-6 text-xl uppercase tracking-tighter italic">✏️ Editar {taxasSelecionadas.length} Itens</h2>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Novo Valor (R$):</label>
                <input 
                  type="number" placeholder="Branco para manter igual" value={dadosEdicaoLote.valor_total} 
                  onChange={(e) => setDadosEdicaoLote({...dadosEdicaoLote, valor_total: e.target.value})} 
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Novo Vencimento:</label>
                <input 
                  type="date" value={dadosEdicaoLote.data_pagamento} 
                  onChange={(e) => setDadosEdicaoLote({...dadosEdicaoLote, data_pagamento: e.target.value})} 
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-blue-400"
                />
              </div>
            </div>
            <div className="flex flex-col gap-3 mt-8">
              <button onClick={handleEditarLote} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg active:scale-95 transition-all">SALVAR LOTE</button>
              <button onClick={() => setModalEdicaoLoteAberto(false)} className="w-full py-4 border border-slate-200 rounded-2xl font-black uppercase tracking-widest text-[10px] text-slate-500 hover:bg-slate-50 transition-all">CANCELAR</button>
            </div>
          </div>
        </div>
      )}

      {modalTaxaAvulsaAberto && (
        <div 
          className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[4000] backdrop-blur-sm p-4"
          onClick={() => setModalTaxaAvulsaAberto(false)}
        >
          <div 
            className="bg-white p-8 rounded-[2.5rem] w-full max-w-md shadow-2xl animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-center font-black text-emerald-900 mb-8 text-2xl uppercase tracking-tighter italic">📦 Lançar Taxa</h2>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Selecionar Aluno:</label>
                <select 
                  value={taxaAvulsa.aluno_id} onChange={(e) => setTaxaAvulsa({...taxaAvulsa, aluno_id: e.target.value})}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-emerald-400"
                >
                  <option value="">Selecione na lista...</option>
                  {alunos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Categoria:</label>
                  <select 
                    value={taxaAvulsa.tipo} onChange={(e) => setTaxaAvulsa({...taxaAvulsa, tipo: e.target.value})}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-emerald-400"
                  >
                    <option value="material">🎨 Material</option>
                    <option value="livro">📘 Livros</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Ano Letivo:</label>
                  <input 
                    type="text" value={taxaAvulsa.mes_referencia} onChange={(e) => setTaxaAvulsa({...taxaAvulsa, mes_referencia: e.target.value})}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Valor Faturado (R$):</label>
                  <input 
                    type="number" value={taxaAvulsa.valor_total} onChange={(e) => setTaxaAvulsa({...taxaAvulsa, valor_total: e.target.value})} placeholder="0.00"
                    className="w-full p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-sm font-bold outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Vencimento:</label>
                  <input 
                    type="date" value={taxaAvulsa.data_pagamento} onChange={(e) => setTaxaAvulsa({...taxaAvulsa, data_pagamento: e.target.value})}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none"
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3 mt-8">
              <button onClick={handleLancarTaxaAvulsa} className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg active:scale-95 transition-all">LANÇAR NO SISTEMA</button>
              <button onClick={() => setModalTaxaAvulsaAberto(false)} className="w-full py-4 border border-slate-200 rounded-2xl font-black uppercase tracking-widest text-[10px] text-slate-500 hover:bg-slate-50 transition-all">CANCELAR</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}