"use client";

import { X, ArrowUpRight, ArrowDownRight, Users, Trash2, Search } from "lucide-react";

interface ModalDetalhesExtratoProps {
  aberto: boolean;
  onFechar: () => void;
  detalhesTipo: 'entrada' | 'saida';
  detalhesEventoId: string;
  eventosAtivos: any[];
  historicoPagamentosEventos: any[];
  alunos: any[];
  getDetalhes: (t: any) => any;
  excluirTransacaoEvento: (id: string) => void;
}

export function ModalDetalhesExtrato(props: ModalDetalhesExtratoProps) {
  if (!props.aberto) return null;

  const eventoAtual = props.eventosAtivos.find(e => String(e.id) === String(props.detalhesEventoId));
  const isEncerrado = eventoAtual?.encerrado;

  const transacoesFiltradas = props.historicoPagamentosEventos
    .filter(t => String(props.getDetalhes(t).evento_id) === String(props.detalhesEventoId))
    .filter(t => props.getDetalhes(t).sub_tipo === props.detalhesTipo || (props.detalhesTipo === 'entrada' ? t.tipo === 'evento_entrada' || (!props.getDetalhes(t).sub_tipo && !t.descricao?.includes('[SA')) : t.tipo === 'evento_saida' || t.descricao?.includes('[SAÍDA]')))
    .sort((a,b) => new Date(b.created_at || b.data_pagamento).getTime() - new Date(a.created_at || a.data_pagamento).getTime());

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center md:p-4" onClick={props.onFechar}>
      <div className="bg-white rounded-t-[2rem] md:rounded-[2.5rem] p-4 md:p-8 w-full max-w-2xl shadow-2xl animate-in slide-in-from-bottom-full md:zoom-in-95 max-h-[90vh] md:max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        
        {/* Pílula de arrasto Mobile */}
        <div className="w-full flex justify-center md:hidden mb-4">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
        </div>

        <div className="flex justify-between items-center mb-4 md:mb-6 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 md:p-3 rounded-2xl ${props.detalhesTipo === 'entrada' ? 'bg-green-100 text-green-600' : 'bg-rose-100 text-rose-600'}`}>
              {props.detalhesTipo === 'entrada' ? <ArrowUpRight size={20}/> : <ArrowDownRight size={20}/>}
            </div>
            <div>
              <h2 className="text-lg md:text-2xl font-black text-slate-800 leading-none">Extrato de {props.detalhesTipo === 'entrada' ? 'Ganhos' : 'Custos'}</h2>
              <p className="text-[9px] md:text-xs font-bold uppercase tracking-widest text-slate-400 mt-1">{eventoAtual?.nome}</p>
            </div>
          </div>
          <button onClick={props.onFechar} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors">
            <X size={20}/>
          </button>
        </div>

        <div className="overflow-y-auto custom-scrollbar flex-1 -mx-2 px-2 pb-4">
          <div className="flex flex-col gap-3">
            {transacoesFiltradas.map(t => (
              <div key={t.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 p-3 md:p-4 rounded-xl md:rounded-2xl border border-slate-100 gap-3">
                <div className="flex flex-col pr-4 overflow-hidden">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] md:text-sm font-black text-slate-800 truncate">{props.getDetalhes(t).categoria_tag || "Geral"}</span>
                    {props.getDetalhes(t).quantidade && (
                      <span className="text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-black shrink-0">Qtd: {props.getDetalhes(t).quantidade}</span>
                    )}
                    {props.getDetalhes(t).equipe_nome && (
                      <span className="text-[9px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-black truncate">🏆 {props.getDetalhes(t).equipe_nome}</span>
                    )}
                  </div>
                  <span className="text-[10px] md:text-xs font-bold text-slate-500 line-clamp-1">{t.descricao.replace(/\[ENTRADA\] |\[SAÍDA\] /g, '') || "Sem descrição"}</span>
                  {t.aluno_id && (
                     <span className="text-[9px] md:text-[10px] text-blue-600 font-bold mt-1.5 flex items-center gap-1">
                       <Users size={10}/> {props.alunos.find(a => String(a.id) === String(t.aluno_id))?.nome || "Aluno Excluído"}
                     </span>
                  )}
                  <span className="text-[8px] md:text-[9px] font-black uppercase text-slate-400 mt-1.5">
                    🕒 {new Date(t.created_at || t.data_pagamento).toLocaleString('pt-BR')}
                  </span>
                </div>
                
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 border-t sm:border-t-0 border-slate-200 pt-2 sm:pt-0">
                  <span className={`font-black text-base md:text-lg ${props.detalhesTipo === 'entrada' ? 'text-green-600' : 'text-rose-600'}`}>
                    {props.detalhesTipo === 'entrada' ? '+' : '-'} R$ {parseFloat(t.valor_pago).toFixed(2).replace('.', ',')}
                  </span>
                  {!isEncerrado && (
                    <button 
                      onClick={() => props.excluirTransacaoEvento(t.id)} 
                      className="w-9 h-9 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-200 transition-colors shadow-sm"
                      title="Excluir Lançamento"
                    >
                      <Trash2 size={14}/>
                    </button>
                  )}
                </div>
              </div>
            ))}
            
            {transacoesFiltradas.length === 0 && (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <Search size={32} className="text-slate-200 mb-3" />
                <p className="text-xs font-bold text-slate-400">Nenhuma transação encontrada.</p>
              </div>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <button onClick={props.onFechar} className="w-full py-3.5 md:py-4 rounded-xl md:rounded-2xl bg-slate-800 text-white font-black uppercase tracking-widest text-[10px] md:text-xs shadow-md active:scale-95 transition-all">
            Fechar Extrato
          </button>
        </div>

      </div>
    </div>
  );
}