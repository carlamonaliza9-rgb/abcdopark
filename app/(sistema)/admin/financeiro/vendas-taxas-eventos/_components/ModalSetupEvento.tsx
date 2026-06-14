"use client";

import { Settings, Tag, Users, X } from "lucide-react";

interface CategoriaPreco {
  nome: string;
  valor: number;
}

interface ModalSetupEventoProps {
  aberto: boolean;
  onFechar: () => void;
  nomeEvento: string;
  setNomeEvento: (val: string) => void;
  dataEvento: string;
  setDataEvento: (val: string) => void;
  tagTipoFoco: 'entrada' | 'saida' | 'equipe';
  setTagTipoFoco: (val: 'entrada' | 'saida' | 'equipe') => void;
  equipeInput: string;
  setEquipeInput: (val: string) => void;
  tagNomeInput: string;
  setTagNomeInput: (val: string) => void;
  tagValorInput: string;
  setTagValorInput: (val: string) => void;
  tagsEntrada: CategoriaPreco[];
  tagsSaida: CategoriaPreco[];
  equipes: string[];
  alunosSelecionadosEvento: string[];
  setAlunosSelecionadosEvento: (val: string[]) => void;
  alunos: any[];
  adicionarCategoriaOuEquipe: () => void;
  removerCategoria: (tipo: 'entrada' | 'saida' | 'equipe', nome: string) => void;
  salvarSetupEvento: () => void;
}

export function ModalSetupEvento(props: ModalSetupEventoProps) {
  if (!props.aberto) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center md:p-4" onClick={props.onFechar}>
      <div className="bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] w-full max-w-2xl p-6 md:p-8 shadow-2xl animate-in slide-in-from-bottom-full md:zoom-in-95 max-h-[95vh] md:max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col" onClick={e => e.stopPropagation()}>
        
        <div className="w-full flex justify-center md:hidden mb-4">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
        </div>

        <h2 className="text-xl md:text-2xl font-black text-slate-800 mb-6 flex items-center gap-3">
          <Settings size={28} className="text-blue-600"/> Setup de Caixa do Evento
        </h2>
        
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-[2]">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Nome do Evento</label>
            <input type="text" value={props.nomeEvento} onChange={e => props.setNomeEvento(e.target.value)} placeholder="Ex: Gincana 2026" className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 font-bold text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-100" />
          </div>
          <div className="flex-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Data Alvo</label>
            <input type="date" value={props.dataEvento} onChange={e => props.setDataEvento(e.target.value)} className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 font-bold text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-100" />
          </div>
        </div>

        <div className="bg-slate-50 p-5 md:p-6 rounded-2xl border border-slate-100 mb-6">
          <h3 className="text-sm md:text-base font-black text-slate-800 mb-4 flex items-center gap-2">
            <Tag size={18} className="text-slate-400"/> Gestor de Regras e Valores
          </h3>
          
          <div className="flex flex-wrap bg-white p-1 rounded-xl shadow-sm mb-5 border border-slate-200">
            <button onClick={() => props.setTagTipoFoco('entrada')} className={`flex-1 py-3 px-2 text-[10px] md:text-xs font-black uppercase tracking-widest rounded-lg transition-colors ${props.tagTipoFoco === 'entrada' ? 'bg-green-100 text-green-700' : 'text-slate-400 hover:bg-slate-50'}`}>Ganhos</button>
            <button onClick={() => props.setTagTipoFoco('saida')} className={`flex-1 py-3 px-2 text-[10px] md:text-xs font-black uppercase tracking-widest rounded-lg transition-colors ${props.tagTipoFoco === 'saida' ? 'bg-rose-100 text-rose-700' : 'text-slate-400 hover:bg-slate-50'}`}>Custos</button>
            <button onClick={() => props.setTagTipoFoco('equipe')} className={`flex-1 py-3 px-2 text-[10px] md:text-xs font-black uppercase tracking-widest rounded-lg transition-colors ${props.tagTipoFoco === 'equipe' ? 'bg-amber-100 text-amber-700' : 'text-slate-400 hover:bg-slate-50'}`}>Equipes</button>
          </div>

          {props.tagTipoFoco === 'equipe' ? (
            <div className="flex flex-col md:flex-row gap-3 mb-6 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
              <input 
                type="text" value={props.equipeInput} onChange={e => props.setEquipeInput(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') props.adicionarCategoriaOuEquipe() }}
                placeholder="Ex: Equipe Vermelha..." className="flex-1 p-3 rounded-xl border border-slate-100 font-bold text-sm text-slate-800 outline-none focus:border-amber-400 bg-slate-50" 
              />
              <button onClick={props.adicionarCategoriaOuEquipe} className="px-6 py-3 rounded-xl font-black text-white bg-amber-500 shadow-sm active:scale-95 transition-transform">ADD EQUIPE</button>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row gap-3 mb-6 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
              <input 
                type="text" value={props.tagNomeInput} onChange={e => props.setTagNomeInput(e.target.value)} placeholder={props.tagTipoFoco === 'entrada' ? "Ex: Ingresso VIP" : "Ex: Som / DJ"} 
                className="flex-[2] p-3 rounded-xl border border-slate-100 font-bold text-sm text-slate-800 outline-none focus:border-blue-400 bg-slate-50" 
              />
              <div className="flex gap-2 flex-[1.5]">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">R$</span>
                  <input 
                    type="number" step="0.01" value={props.tagValorInput} onChange={e => props.setTagValorInput(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') props.adicionarCategoriaOuEquipe() }}
                    placeholder="0.00" className="w-full pl-9 p-3 rounded-xl border border-slate-100 font-bold text-sm text-slate-800 outline-none focus:border-blue-400 bg-slate-50" 
                  />
                </div>
                <button onClick={props.adicionarCategoriaOuEquipe} className={`px-4 rounded-xl font-black text-white shadow-sm active:scale-95 transition-transform ${props.tagTipoFoco === 'entrada' ? 'bg-green-600' : 'bg-rose-600'}`}>ADD</button>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Itens Cadastrados:</label>
            {(props.tagTipoFoco === 'entrada' ? props.tagsEntrada : props.tagTipoFoco === 'saida' ? props.tagsSaida : props.equipes).length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {props.tagTipoFoco === 'equipe' ? (
                  props.equipes.map(eq => (
                    <div key={eq} className="flex justify-between items-center px-4 py-3 rounded-xl border bg-amber-50 border-amber-200">
                      <span className="text-xs font-black truncate text-amber-800">{eq}</span>
                      <button onClick={() => props.removerCategoria('equipe', eq)} className="w-8 h-8 rounded-lg bg-white/50 flex items-center justify-center hover:bg-white text-slate-500 hover:text-rose-600 transition-colors shrink-0"><X size={14}/></button>
                    </div>
                  ))
                ) : (
                  (props.tagTipoFoco === 'entrada' ? props.tagsEntrada : props.tagsSaida).map(cat => (
                    <div key={cat.nome} className={`flex justify-between items-center px-4 py-3 rounded-xl border ${props.tagTipoFoco === 'entrada' ? 'bg-green-50 border-green-200' : 'bg-rose-50 border-rose-200'}`}>
                      <div className="flex flex-col truncate pr-2">
                        <span className={`text-xs font-black truncate ${props.tagTipoFoco === 'entrada' ? 'text-green-800' : 'text-rose-800'}`}>{cat.nome}</span>
                        <span className={`text-[10px] font-bold ${props.tagTipoFoco === 'entrada' ? 'text-green-600' : 'text-rose-600'}`}>R$ {Number(cat.valor).toFixed(2)}</span>
                      </div>
                      <button onClick={() => props.removerCategoria(props.tagTipoFoco, cat.nome)} className="w-8 h-8 rounded-lg bg-white/50 flex items-center justify-center hover:bg-white text-slate-500 hover:text-rose-600 transition-colors shrink-0"><X size={14}/></button>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <p className="text-xs font-bold text-slate-400 italic text-center py-4">Nenhum item configurado.</p>
            )}
          </div>
        </div>

        <div className="mt-4 border-t border-slate-100 pt-6">
          <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2"><Users size={18} className="text-blue-500"/> Alunos Participantes</h3>
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-black uppercase text-slate-400 bg-slate-100 px-2 py-1 rounded-md">{props.alunosSelecionadosEvento.length} selecionados</span>
            <button onClick={() => props.setAlunosSelecionadosEvento(props.alunosSelecionadosEvento.length === props.alunos.length ? [] : props.alunos.map(a => String(a.id)))} className="text-[10px] font-black text-blue-600 uppercase hover:underline">
              {props.alunosSelecionadosEvento.length === props.alunos.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
            </button>
          </div>
          <div className="max-h-40 overflow-y-auto custom-scrollbar grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
            {props.alunos.map(a => (
              <label key={a.id} className="flex items-center gap-3 text-xs font-bold text-slate-700 cursor-pointer p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-colors">
                <input 
                  type="checkbox" className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500" checked={props.alunosSelecionadosEvento.includes(String(a.id))} 
                  onChange={() => {
                    if (props.alunosSelecionadosEvento.includes(String(a.id))) props.setAlunosSelecionadosEvento(props.alunosSelecionadosEvento.filter(id => id !== String(a.id)));
                    else props.setAlunosSelecionadosEvento([...props.alunosSelecionadosEvento, String(a.id)]);
                  }} 
                />
                <span className="truncate">{a.nome}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-3 mt-auto pt-6">
          <button onClick={props.onFechar} className="flex-1 py-4 rounded-2xl border border-slate-200 bg-white font-black uppercase tracking-widest text-[10px] md:text-xs text-slate-500 hover:bg-slate-50 active:scale-95 transition-all">Cancelar</button>
          <button onClick={props.salvarSetupEvento} className="flex-[2] py-4 rounded-2xl bg-blue-600 text-white font-black uppercase tracking-widest text-[10px] md:text-xs shadow-lg shadow-blue-600/20 active:scale-95 transition-all">Salvar Estrutura</button>
        </div>
      </div>
    </div>
  );
}