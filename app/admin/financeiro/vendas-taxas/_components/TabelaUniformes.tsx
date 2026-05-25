"use client";

interface TabelaUniformesProps {
  uniformesFiltrados: any[];
  alunos: any[];
  buscaUniforme: string;
  setBuscaUniforme: (busca: string) => void;
  handleIniciarEdicao: (item: any) => void;
  handleExcluirRegistro: (id: string) => void;
}

export function TabelaUniformes({
  uniformesFiltrados, alunos, buscaUniforme, setBuscaUniforme,
  handleIniciarEdicao, handleExcluirRegistro
}: TabelaUniformesProps) {
  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden mb-8">
      <div className="p-6 border-b border-slate-100 bg-purple-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h3 className="font-black text-purple-900 text-sm uppercase tracking-widest italic">🛒 Histórico de Uniformes</h3>
        <input
          type="text" placeholder="🔍 Buscar aluno..." value={buscaUniforme} onChange={(e) => setBuscaUniforme(e.target.value)}
          className="px-4 py-2.5 bg-white border border-purple-200 rounded-xl text-xs font-bold text-slate-700 outline-none w-full sm:w-64 focus:border-purple-400 transition-colors"
        />
      </div>
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-white text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
              <th className="p-5">Data</th>
              <th className="p-5">Aluno</th>
              <th className="p-5">Descrição</th>
              <th className="p-5 text-right">Total</th>
              <th className="p-5 text-center">Status</th>
              <th className="p-5 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-sm">
            {uniformesFiltrados.length > 0 ? (
              uniformesFiltrados.map((item) => {
                const nomeAluno = alunos.find(a => a.id === item.aluno_id)?.nome || "Não Encontrado";
                const dataFormatada = item.data_pagamento && item.data_pagamento !== "" && !item.data_pagamento.startsWith("1970")
                  ? new Date(item.data_pagamento + "T12:00:00").toLocaleDateString('pt-BR')
                  : (item.created_at ? new Date(item.created_at).toLocaleDateString('pt-BR') : '--');

                return (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-5 text-slate-500 font-bold text-xs">{dataFormatada}</td>
                    <td className="p-5 font-black text-slate-800 uppercase text-xs">{nomeAluno}</td>
                    <td className="p-5 text-slate-600 text-xs font-semibold">{item.descricao?.replace("Venda de Uniforme Avulsa: ", "")}</td>
                    <td className="p-5 text-right font-black text-slate-900">R$ {parseFloat(item.valor_total).toFixed(2)}</td>
                    <td className="p-5 text-center">
                      {item.status !== 'pago' ? (
                        <button onClick={() => handleIniciarEdicao(item)} className="px-3 py-1.5 rounded-lg text-[10px] font-black bg-rose-50 text-rose-600 border border-rose-200 uppercase tracking-widest hover:bg-rose-100 transition-colors">
                          {item.status}
                        </button>
                      ) : (
                        <span className="px-3 py-1.5 rounded-lg text-[10px] font-black bg-emerald-50 text-emerald-600 border border-emerald-200 uppercase tracking-widest">
                          Pago
                        </span>
                      )}
                    </td>
                    <td className="p-5 text-center space-x-2 flex justify-center">
                      <button onClick={() => handleIniciarEdicao(item)} className="text-[10px] uppercase font-black tracking-widest bg-blue-50 text-blue-600 px-3 py-2 rounded-xl hover:bg-blue-100">Editar</button>
                      <button onClick={() => handleExcluirRegistro(item.id)} className="text-[10px] uppercase font-black tracking-widest bg-rose-50 text-rose-600 px-3 py-2 rounded-xl hover:bg-rose-100">Excluir</button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr><td colSpan={6} className="p-8 text-center text-slate-400 font-black uppercase tracking-widest text-[10px]">Nenhuma venda encontrada.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}