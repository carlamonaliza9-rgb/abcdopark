"use client";

interface TabelaTaxasProps {
  taxasFiltradas: any[];
  taxasSelecionadas: string[];
  alunos: any[];
  buscaTaxa: string;
  setBuscaTaxa: (busca: string) => void;
  toggleSelectAllTaxas: () => void;
  toggleSelecaoTaxa: (id: string) => void;
  handleIniciarEdicao: (item: any) => void;
  handleExcluirLoteCompleto: (item: any) => void;
  setModalEdicaoLoteAberto: (aberto: boolean) => void;
  handleExcluirLoteSelecionado: () => void;
  setTaxasSelecionadas: (selecionadas: string[]) => void;
}

export function TabelaTaxas({
  taxasFiltradas, taxasSelecionadas, alunos, buscaTaxa, setBuscaTaxa,
  toggleSelectAllTaxas, toggleSelecaoTaxa, handleIniciarEdicao,
  handleExcluirLoteCompleto, setModalEdicaoLoteAberto, handleExcluirLoteSelecionado,
  setTaxasSelecionadas
}: TabelaTaxasProps) {
  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden mb-8 relative">
      
      {/* OVERLAY DE LOTE (MANTIDO) */}
      {taxasSelecionadas.length > 0 && (
        <div className="absolute inset-0 bg-emerald-50/95 backdrop-blur-sm z-10 flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-emerald-200 flex flex-col items-center gap-4 max-w-md w-full">
            <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl">📦</div>
            <h3 className="font-black text-emerald-900 text-2xl uppercase tracking-tighter italic">{taxasSelecionadas.length} Selecionadas</h3>
            <div className="flex flex-col gap-3 w-full mt-4">
              <button onClick={() => setModalEdicaoLoteAberto(true)} className="w-full py-4 bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-blue-700 transition-all">✏️ Editar Data / Valor</button>
              <button onClick={handleExcluirLoteSelecionado} className="w-full py-4 bg-rose-500 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-rose-600 transition-all">🗑️ Excluir Selecionadas</button>
              <button onClick={() => setTaxasSelecionadas([])} className="w-full py-4 bg-slate-100 text-slate-500 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition-all">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="p-6 border-b border-slate-100 bg-emerald-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h3 className="font-black text-emerald-900 text-sm uppercase tracking-widest italic">📦 Lançamento de Taxas</h3>
        <input
          type="text" placeholder="🔍 Buscar aluno..." value={buscaTaxa} onChange={(e) => setBuscaTaxa(e.target.value)}
          className="px-4 py-2.5 bg-white border border-emerald-200 rounded-xl text-xs font-bold text-slate-700 outline-none w-full sm:w-64 focus:border-emerald-400 transition-colors"
        />
      </div>

      {/* TABELA RESPONSIVA */}
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse block md:table md:min-w-[800px]">
          <thead className="hidden md:table-header-group bg-white text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
            <tr>
              <th className="p-5 w-10 text-center"><input type="checkbox" onChange={toggleSelectAllTaxas} checked={taxasSelecionadas.length === taxasFiltradas.length && taxasFiltradas.length > 0} className="w-4 h-4 accent-emerald-500 cursor-pointer" /></th>
              <th className="p-5">Período / Venc.</th>
              <th className="p-5">Aluno</th>
              <th className="p-5">Obrigação</th>
              <th className="p-5 text-right">Faturado</th>
              <th className="p-5 text-center">Status</th>
              <th className="p-5 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="block md:table-row-group divide-y divide-slate-50 text-sm">
            {taxasFiltradas.length > 0 ? (
              taxasFiltradas.map((item) => {
                const nomeAluno = alunos.find(a => a.id === item.aluno_id)?.nome || "Não Encontrado";
                const isChecked = taxasSelecionadas.includes(item.id);
                const dataVencimento = item.data_pagamento && item.data_pagamento !== "" && !item.data_pagamento.startsWith("1970")
                  ? new Date(item.data_pagamento).toLocaleDateString('pt-BR', {timeZone: 'UTC'})
                  : (item.created_at ? new Date(item.created_at).toLocaleDateString('pt-BR') : '--');

                return (
                  <tr key={item.id} className={`block md:table-row hover:bg-slate-50/50 transition-colors ${isChecked ? 'bg-emerald-50/40' : ''} p-2 md:p-0`}>
                    
                    <td className="hidden md:table-cell p-5 text-center"><input type="checkbox" checked={isChecked} onChange={() => toggleSelecaoTaxa(item.id)} className="w-4 h-4 accent-emerald-500 cursor-pointer" /></td>
                    
                    <td className="block md:table-cell p-2 md:p-5 text-slate-500 font-bold text-[10px] md:text-xs">
                      <span className="md:hidden text-[9px] font-black uppercase tracking-widest text-slate-400 mr-2">PERÍODO:</span>
                      {item.mes_referencia} <span className="md:block text-[10px] text-slate-400 font-medium uppercase">{dataVencimento}</span>
                    </td>
                    
                    <td className="block md:table-cell p-2 md:p-5 font-black text-slate-800 uppercase text-xs">
                      {nomeAluno}
                    </td>

                    <td className="block md:table-cell p-2 md:p-5 text-slate-600 font-black text-[10px] uppercase tracking-widest">
                      {item.tipo === 'livro' ? '📘 Livros' : '🎨 Material'}
                    </td>

                    <td className="block md:table-cell p-2 md:p-5 text-right font-black text-slate-900 text-xs md:text-sm">
                      <span className="md:hidden text-[9px] font-black uppercase tracking-widest text-slate-400 mr-2">TOTAL:</span>
                      R$ {parseFloat(item.valor_total).toFixed(2)}
                    </td>

                    <td className="block md:table-cell p-2 md:p-5 text-left md:text-center">
                      {item.status !== 'pago' ? (
                        <button onClick={() => handleIniciarEdicao(item)} className="px-3 py-1.5 rounded-lg text-[9px] md:text-[10px] font-black bg-rose-50 text-rose-600 border border-rose-200 uppercase tracking-widest hover:bg-rose-100 transition-colors">
                          {item.status}
                        </button>
                      ) : (
                        <span className="px-3 py-1.5 rounded-lg text-[9px] md:text-[10px] font-black bg-emerald-50 text-emerald-600 border border-emerald-200 uppercase tracking-widest">
                          Pago
                        </span>
                      )}
                    </td>

                    <td className="block md:table-cell p-2 md:p-5 text-left md:text-center">
                      <div className="flex gap-2 justify-start md:justify-center">
                         <button onClick={() => handleIniciarEdicao(item)} className="text-[10px] uppercase font-black tracking-widest bg-blue-50 text-blue-600 px-3 py-2 rounded-xl hover:bg-blue-100">Editar</button>
                         <button onClick={() => handleExcluirLoteCompleto(item)} className="text-[10px] uppercase font-black tracking-widest bg-orange-50 text-orange-600 px-3 py-2 rounded-xl hover:bg-orange-100" title="Deletar de todos os alunos">💥 Lote</button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr><td colSpan={7} className="p-8 text-center text-slate-400 font-black uppercase tracking-widest text-[10px]">Nenhuma taxa encontrada.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}