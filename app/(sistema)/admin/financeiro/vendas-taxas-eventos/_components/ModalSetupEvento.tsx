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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center p-0 md:p-4" onClick={props.onFechar}>
      <div className="bg-white rounded-t-[2rem] md:rounded-[2.5rem] w-full max-w-2xl p-4 md:p-8 shadow-2xl animate-in slide-in-from-bottom-full md:zoom-in-95 max-h-[95vh] overflow-y-auto custom-scrollbar flex flex-col" onClick={e => e.stopPropagation()}>
        
        <div className="w-full flex justify-center md:hidden mb-4">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
        </div>

        <h2 className="text-lg md:text-2xl font-black text-slate-800 mb-6 flex items-center gap-3">
          <Settings size={24} className="text-blue-600"/> Setup do Evento
        </h2>
        
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-[2]">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Nome do Evento</label>
            <input type="text" value={props.nomeEvento} onChange={e => props.setNomeEvento(e.target.value)} placeholder="Ex: Gincana 2026" className="w-full p-3 md:p-4 rounded-xl border border-slate-200 bg-slate-50 font-bold text-xs md:text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-100" />
          </div>
          <div className="flex-1">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Data Alvo</label>
            <input type="date" value={props.dataEvento} onChange={e => props.setDataEvento(e.target.value)} className="w-full p-3 md:p-4 rounded-xl border border-slate-200 bg-slate-50 font-bold text-xs md:text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-100" />
          </div>
        </div>

        <div className="bg-slate-50 p-4 md:p-6 rounded-2xl border border-slate-100 mb-6">
          <h3 className="text-xs md:text-base font-black text-slate-800 mb-4 flex items-center gap-2">
            <Tag size={16} className="text-slate-400"/> Regras e Valores
          </h3>
          
          <div className="flex flex-wrap bg-white p-1 rounded-xl shadow-sm mb-5 border border-slate-200">
            <button onClick={() => props.setTagTipoFoco('entrada')} className={`flex-1 py-2.5 px-2 text-[9px] md:text-xs font-black uppercase tracking-widest rounded-lg transition-colors ${props.tagTipoFoco === 'entrada' ? 'bg-green-100 text-green-700' : 'text-slate-400 hover:bg-slate-50'}`}>Ganhos</button>
            <button onClick={() => props.setTagTipoFoco('saida')} className={`flex-1 py-2.5 px-2 text-[9px] md:text-xs font-black uppercase tracking-widest rounded-lg transition-colors ${props.tagTipoFoco === 'saida' ? 'bg-rose-100 text-rose-700' : 'text-slate-400 hover:bg-slate-50'}`}>Custos</button>
            <button onClick={() => props.setTagTipoFoco('equipe')} className={`flex-1 py-2.5 px-2 text-[9px] md:text-xs font-black uppercase tracking-widest rounded-lg transition-colors ${props.tagTipoFoco === 'equipe' ? 'bg-amber-100 text-amber-700' : 'text-slate-400 hover:bg-slate-50'}`}>Equipes</button>
          </div>

          <div className="flex flex-col md:flex-row gap-3 mb-6 bg-white p-2 md:p-3 rounded-2xl border border-slate-200 shadow-sm">
            <input 
              type="text" value={props.tagTipoFoco === 'equipe' ? props.equipeInput : props.tagNomeInput} 
              onChange={e => props.tagTipoFoco === 'equipe' ? props.setEquipeInput(e.target.value) : props.setTagNomeInput(e.target.value)} 
              placeholder={props.tagTipoFoco === 'equipe' ? "Nome da equipe..." : "Nome do item..."} 
              className="flex-1 p-3 rounded-xl border border-slate-100 font-bold text-xs md:text-sm text-slate-800 outline-none focus:border-blue-400 bg-slate-50" 
            />
            {props.tagTipoFoco !== 'equipe' && (
               <div className="relative flex-1">
                 <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                 <input type="number" step="0.01" value={props.tagValorInput} onChange={e => props.setTagValorInput(e.target.value)} placeholder="0.00" className="w-full pl-8 p-3 rounded-xl border border-slate-100 font-bold text-xs md:text-sm text-slate-800 outline-none focus:border-blue-400 bg-slate-50" />
               </div>
            )}
            <button onClick={props.adicionarCategoriaOuEquipe} className={`px-4 py-3 rounded-xl font-black text-white shadow-sm active:scale-95 transition-transform text-[10px] ${props.tagTipoFoco === 'entrada' ? 'bg-green-600' : props.tagTipoFoco === 'saida' ? 'bg-rose-600' : 'bg-amber-500'}`}>ADD</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(props.tagTipoFoco === 'entrada' ? props.tagsEntrada : props.tagTipoFoco === 'saida' ? props.tagsSaida : props.equipes).map((item: any) => (
               <div key={item.nome || item} className={`flex justify-between items-center px-4 py-2.5 rounded-xl border ${props.tagTipoFoco === 'entrada' ? 'bg-green-50 border-green-200' : props.tagTipoFoco === 'saida' ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200'}`}>
                 <div className="flex flex-col truncate pr-2">
                   <span className={`text-[11px] font-black truncate ${props.tagTipoFoco === 'entrada' ? 'text-green-800' : props.tagTipoFoco === 'saida' ? 'text-rose-800' : 'text-amber-800'}`}>{item.nome || item}</span>
                   {item.valor !== undefined && <span className={`text-[9px] font-bold ${props.tagTipoFoco === 'entrada' ? 'text-green-600' : 'text-rose-600'}`}>R$ {Number(item.valor).toFixed(2)}</span>}
                 </div>
                 <button onClick={() => props.removerCategoria(props.tagTipoFoco, item.nome || item)} className="w-7 h-7 rounded-lg bg-white/50 flex items-center justify-center hover:bg-white text-slate-500 hover:text-rose-600 transition-colors shrink-0"><X size={12}/></button>
               </div>
            ))}
          </div>
        </div>

        <div className="mt-auto pt-2">
          <h3 className="text-xs font-black text-slate-800 mb-3 flex items-center gap-2"><Users size={16} className="text-blue-500"/> Alunos Participantes</h3>
          <div className="flex justify-between items-center mb-2">
            <span className="text-[9px] font-black uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{props.alunosSelecionadosEvento.length} selecionados</span>
            <button onClick={() => props.setAlunosSelecionadosEvento(props.alunosSelecionadosEvento.length === props.alunos.length ? [] : props.alunos.map(a => String(a.id)))} className="text-[9px] font-black text-blue-600 uppercase hover:underline">
              {props.alunosSelecionadosEvento.length === props.alunos.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
            </button>
          </div>
          <div className="h-32 overflow-y-auto custom-scrollbar grid grid-cols-1 sm:grid-cols-2 gap-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
            {props.alunos.map(a => (
              <label key={a.id} className="flex items-center gap-2 text-[11px] font-bold text-slate-700 cursor-pointer p-1.5 hover:bg-white rounded-lg border border-transparent transition-colors">
                <input type="checkbox" className="w-3.5 h-3.5 rounded text-blue-600" checked={props.alunosSelecionadosEvento.includes(String(a.id))} onChange={() => {
                  if (props.alunosSelecionadosEvento.includes(String(a.id))) props.setAlunosSelecionadosEvento(props.alunosSelecionadosEvento.filter(id => id !== String(a.id)));
                  else props.setAlunosSelecionadosEvento([...props.alunosSelecionadosEvento, String(a.id)]);
                }} />
                {a.nome}
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-3 mt-8 pt-2 border-t border-slate-100">
          <button onClick={props.onFechar} className="flex-1 py-3.5 border border-slate-200 bg-white rounded-xl font-black uppercase tracking-widest text-[10px] text-slate-500 hover:bg-slate-50 active:scale-95 transition-all">Cancelar</button>
          <button onClick={props.salvarSetupEvento} className="flex-[2] py-3.5 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-600/20 active:scale-95 transition-all">Salvar Estrutura</button>
        </div>
      </div>
    </div>
  );
}