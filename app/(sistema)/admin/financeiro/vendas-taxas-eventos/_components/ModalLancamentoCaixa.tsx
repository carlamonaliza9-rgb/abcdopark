"use client";

import { PlusCircle, MinusCircle, Trophy } from "lucide-react";

interface ModalLancamentoCaixaProps {
  aberto: boolean;
  onFechar: () => void;
  tipoLancamento: 'entrada' | 'saida';
  eventoSelecionadoId: string;
  eventosAtivos: any[];
  categoriaSelecionada: string;
  handleMudancaCategoria: (cat: string) => void;
  quantidadeLancamento: string;
  handleQtdChange: (qtd: string) => void;
  valorLancamento: string;
  handleValorChange: (val: string) => void;
  equipeSelecionada: string;
  setEquipeSelecionada: (eq: string) => void;
  alunoVinculado: string;
  setAlunoVinculado: (id: string) => void;
  alunos: any[];
  descricaoLancamento: string;
  setDescricaoLancamento: (desc: string) => void;
  registrarTransacao: () => void;
  normalizarCategorias: (cats: any[]) => any[];
}

export function ModalLancamentoCaixa(props: ModalLancamentoCaixaProps) {
  if (!props.aberto) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center md:p-4" onClick={props.onFechar}>
      <div className="bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] p-6 md:p-8 w-full max-w-sm shadow-2xl animate-in slide-in-from-bottom-full md:zoom-in-95" onClick={e => e.stopPropagation()}>
        
        <div className="w-full flex justify-center md:hidden mb-4">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
        </div>

        <div className={`flex items-center gap-4 mb-6 pb-4 border-b ${props.tipoLancamento === 'entrada' ? 'border-green-100' : 'border-rose-100'}`}>
          <div className={`w-14 h-14 rounded-[1.2rem] flex items-center justify-center shrink-0 shadow-inner ${props.tipoLancamento === 'entrada' ? 'bg-green-100 text-green-600' : 'bg-rose-100 text-rose-600'}`}>
            {props.tipoLancamento === 'entrada' ? <PlusCircle size={28}/> : <MinusCircle size={28}/>}
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-black text-slate-800 leading-none">Registrar {props.tipoLancamento === 'entrada' ? 'Ganho' : 'Gasto'}</h2>
            <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${props.tipoLancamento === 'entrada' ? 'text-green-500' : 'text-rose-500'}`}>Caixa do Evento</p>
          </div>
        </div>

        <div className="space-y-4 mb-8">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Item / Categoria</label>
            <select 
              value={props.categoriaSelecionada} 
              onChange={e => props.handleMudancaCategoria(e.target.value)} 
              className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 font-bold text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Selecione a categoria...</option>
              {props.normalizarCategorias(props.tipoLancamento === 'entrada' 
                ? props.eventosAtivos.find(e => String(e.id) === String(props.eventoSelecionadoId))?.categorias_entrada 
                : props.eventosAtivos.find(e => String(e.id) === String(props.eventoSelecionadoId))?.categorias_saida || []
              ).map((cat: any) => (
                <option key={cat.nome} value={cat.nome}>{cat.nome} {cat.valor > 0 ? `(R$ ${cat.valor.toFixed(2)})` : ''}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Qtd.</label>
              <input 
                type="number" 
                value={props.quantidadeLancamento} 
                onChange={e => props.handleQtdChange(e.target.value)} 
                placeholder="1" 
                className={`w-full p-4 rounded-xl border font-black text-xl outline-none focus:ring-2 bg-white ${props.tipoLancamento === 'entrada' ? 'border-green-200 text-green-700 focus:ring-green-100' : 'border-rose-200 text-rose-700 focus:ring-rose-100'}`} 
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Valor (R$)</label>
              <input 
                type="number" 
                step="0.01" 
                value={props.valorLancamento} 
                onChange={e => props.handleValorChange(e.target.value)} 
                placeholder="0.00" 
                className={`w-full p-4 rounded-xl border font-black text-xl outline-none focus:ring-2 bg-white ${props.tipoLancamento === 'entrada' ? 'border-green-200 text-green-700 focus:ring-green-100' : 'border-rose-200 text-rose-700 focus:ring-rose-100'}`} 
              />
            </div>
          </div>

          {props.tipoLancamento === 'entrada' && (
            <div className="flex flex-col gap-4 p-4 rounded-2xl bg-amber-50/50 border border-amber-100">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-1.5 flex items-center gap-1"><Trophy size={12}/> Equipe (Gincana)</label>
                <select value={props.equipeSelecionada} onChange={e => props.setEquipeSelecionada(e.target.value)} className="w-full p-3 rounded-xl border border-amber-200 bg-white font-bold text-sm text-slate-800 outline-none focus:ring-2 focus:ring-amber-200">
                  <option value="">Nenhuma equipe...</option>
                  {(props.eventosAtivos.find(e => String(e.id) === String(props.eventoSelecionadoId))?.equipes || []).map((eq: string) => (
                    <option key={eq} value={eq}>{eq}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Vincular Aluno (Opcional)</label>
                <select value={props.alunoVinculado} onChange={e => props.setAlunoVinculado(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 bg-white font-bold text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-100">
                  <option value="">Lançamento Avulso</option>
                  {props.alunos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Descrição Adicional (Opcional)</label>
            <input type="text" value={props.descricaoLancamento} onChange={e => props.setDescricaoLancamento(e.target.value)} placeholder="Ex: Referente a doações..." className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 font-bold text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-100" />
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={props.onFechar} className="flex-1 py-4 md:py-5 rounded-2xl border border-slate-200 bg-white font-black uppercase tracking-widest text-[10px] md:text-xs text-slate-500 hover:bg-slate-50 active:scale-95 transition-all">Cancelar</button>
          <button onClick={props.registrarTransacao} className={`flex-[2] py-4 md:py-5 rounded-2xl text-white font-black uppercase tracking-widest text-[10px] md:text-xs shadow-xl active:scale-95 transition-all ${props.tipoLancamento === 'entrada' ? 'bg-green-600 hover:bg-green-700 shadow-green-600/20' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'}`}>Registrar</button>
        </div>
      </div>
    </div>
  );
}