"use client";

import { Settings, Lock, Trophy, ArrowUpRight, ArrowDownRight, PlusCircle, MinusCircle, Printer, Unlock } from "lucide-react";

interface CardEventoProps {
  evento: any;
  historicoPagamentosEventos: any[];
  parseCurrency: (val: any) => number;
  getDetalhes: (t: any) => any;
  renderDonutChart: (distribuicao: Record<string, number>, total: number, cores: string[]) => React.ReactNode;
  prepararEdicaoSetup: (ev: any) => void;
  abrirDetalhesTransacoes: (id: string, tipo: 'entrada' | 'saida') => void;
  abrirLancamento: (id: string, tipo: 'entrada' | 'saida') => void;
  abrirRelatorioEvento: (ev: any) => void;
  encerrarEventoDefinitivamente: (id: string) => void;
  reabrirEvento: (id: string) => void;
}

export function CardEvento({
  evento, historicoPagamentosEventos, parseCurrency, getDetalhes, renderDonutChart,
  prepararEdicaoSetup, abrirDetalhesTransacoes, abrirLancamento, abrirRelatorioEvento,
  encerrarEventoDefinitivamente, reabrirEvento
}: CardEventoProps) {
  const transacoesEvento = historicoPagamentosEventos.filter(t => String(getDetalhes(t).evento_id) === String(evento.id));
  
  const entradas = transacoesEvento.filter(t => getDetalhes(t).sub_tipo === 'entrada' || t.tipo === 'evento_entrada' || (!getDetalhes(t).sub_tipo && !t.descricao?.includes('[SA')));
  const saidas = transacoesEvento.filter(t => getDetalhes(t).sub_tipo === 'saida' || t.tipo === 'evento_saida' || t.descricao?.includes('[SAÍDA]'));

  const totalEntrada = entradas.reduce((acc, t) => acc + parseCurrency(t.valor_pago), 0);
  const totalSaida = saidas.reduce((acc, t) => acc + parseCurrency(t.valor_pago), 0);
  const lucro = totalEntrada - totalSaida;

  const distEntrada = entradas.reduce((acc, t) => {
    const cat = getDetalhes(t).categoria_tag || "Outros";
    acc[cat] = (acc[cat] || 0) + parseCurrency(t.valor_pago);
    return acc;
  }, {} as Record<string, number>);

  const distSaida = saidas.reduce((acc, t) => {
    const cat = getDetalhes(t).categoria_tag || "Outros";
    acc[cat] = (acc[cat] || 0) + parseCurrency(t.valor_pago);
    return acc;
  }, {} as Record<string, number>);

  const placarEquipes = entradas.reduce((acc, t) => {
    const equipe = getDetalhes(t).equipe_nome;
    if (equipe) acc[equipe] = (acc[equipe] || 0) + parseCurrency(t.valor_pago);
    return acc;
  }, {} as Record<string, number>);

  if (evento.equipes) {
    evento.equipes.forEach((eq: string) => { if (placarEquipes[eq] === undefined) placarEquipes[eq] = 0; });
  }
  
  const placarOrdenado = Object.entries(placarEquipes).sort((a, b) => Number(b[1]) - Number(a[1]));
  const maiorValorEquipe = placarOrdenado.length > 0 ? Number(placarOrdenado[0][1]) : 1; 

  const coresEntrada = ['#16a34a', '#22c55e', '#4ade80', '#86efac', '#bbf7d0'];
  const coresSaida = ['#dc2626', '#ef4444', '#f87171', '#fca5a5', '#fecaca'];
  const isEncerrado = !!evento.encerrado;

  return (
    <div className={`rounded-[2rem] md:rounded-[2.5rem] border shadow-sm overflow-hidden flex flex-col relative w-full transition-all ${isEncerrado ? 'bg-slate-100 border-slate-200 shadow-inner' : 'bg-white border-slate-100'}`}>
      
      {/* BOTÕES DE CONTROLE TOP */}
      {!isEncerrado ? (
        <button onClick={() => prepararEdicaoSetup(evento)} className="absolute top-4 right-4 md:top-6 md:right-6 p-2 bg-white rounded-full shadow-sm text-slate-400 hover:text-blue-600 transition-colors" title="Editar">
          <Settings size={16} />
        </button>
      ) : (
        <div className="absolute top-4 right-4 md:top-6 md:right-6">
          <span className="flex items-center gap-1 px-2 py-1 md:px-3 md:py-1 bg-slate-200 text-slate-600 border border-slate-300 text-[8px] md:text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm">
            <Lock size={10}/> Encerrado
          </span>
        </div>
      )}

      {/* HEADER DO EVENTO */}
      <div className={`p-4 md:p-8 border-b flex flex-col justify-between items-start gap-3 ${isEncerrado ? 'bg-slate-200/40 border-slate-200' : 'bg-slate-50 border-slate-100'}`}>
        <div className="w-full">
          <h3 className={`text-lg md:text-2xl font-black uppercase tracking-tight leading-none mb-1.5 ${isEncerrado ? 'text-slate-500 line-through' : 'text-slate-800'}`}>{evento.nome}</h3>
          <div className="flex flex-wrap gap-2">
            <span className="inline-block px-2.5 py-0.5 md:px-3 md:py-1 bg-white border border-slate-200 text-slate-500 text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm">
              📅 {new Date(evento.data_evento + "T12:00:00").toLocaleDateString('pt-BR')}
            </span>
            {evento.total_alunos > 0 && (
              <span className="inline-block px-2.5 py-0.5 md:px-3 md:py-1 bg-blue-50 border border-blue-200 text-blue-600 text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm">
                👥 {evento.total_alunos} Alunos
              </span>
            )}
          </div>
        </div>
        <div className="text-left bg-white p-3 md:p-4 rounded-xl md:rounded-2xl border border-slate-100 shadow-sm w-full md:w-auto">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">{isEncerrado ? "Lucro Final" : "Lucro Parcial"}</p>
          <p className={`text-xl md:text-3xl font-black ${lucro >= 0 ? 'text-green-600' : 'text-rose-600'}`}>
            R$ {lucro.toFixed(2).replace('.', ',')}
          </p>
        </div>
      </div>

      {/* PLACAR DE EQUIPES */}
      {placarOrdenado.length > 0 && (
        <div className={`px-4 md:px-8 py-4 border-b ${isEncerrado ? 'border-slate-200 bg-slate-200/20' : 'border-slate-50 bg-slate-50/50'}`}>
          <h4 className="text-[9px] font-black uppercase tracking-widest text-amber-600 mb-3 flex items-center gap-1.5">
            <Trophy size={12}/> Placar de Equipes
          </h4>
          <div className="flex flex-col gap-2">
            {placarOrdenado.map(([nomeEq, valorEq], index) => {
              const vEq = Number(valorEq);
              return (
                <div key={nomeEq} className="flex flex-col gap-0.5">
                  <div className="flex justify-between items-center text-[10px] md:text-xs">
                    <span className="font-bold text-slate-700 truncate">{nomeEq}</span>
                    <span className="font-black text-slate-800">R$ {vEq.toFixed(2).replace('.', ',')}</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${index === 0 && vEq > 0 ? 'bg-amber-500' : 'bg-blue-500'} ${isEncerrado ? 'saturate-50' : ''}`} style={{ width: `${vEq > 0 ? (vEq / Number(maiorValorEquipe)) * 100 : 0}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CARDS DE TRANSAÇÕES */}
      <div className={`p-4 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-4 border-b ${isEncerrado ? 'border-slate-200' : 'border-slate-50'}`}>
        <div onClick={() => abrirDetalhesTransacoes(evento.id, 'entrada')} className={`flex items-center gap-4 p-4 md:p-6 rounded-2xl md:rounded-3xl border transition-all cursor-pointer ${isEncerrado ? 'bg-slate-200/30 border-slate-300/60' : 'bg-green-50/50 border-green-100 hover:bg-green-50 hover:shadow-sm'}`}>
          <div className="hidden sm:block">{renderDonutChart(distEntrada, totalEntrada, isEncerrado ? ['#94a3b8','#cbd5e1'] : coresEntrada)}</div>
          <div className="flex-1 overflow-hidden">
            <div className="flex justify-between items-center mb-2">
              <span className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1 ${isEncerrado ? 'text-slate-500' : 'text-green-700'}`}><ArrowUpRight size={12}/> Ganhos</span>
              <span className={`font-black text-sm ${isEncerrado ? 'text-slate-600' : 'text-green-700'}`}>R$ {totalEntrada.toFixed(2).replace('.', ',')}</span>
            </div>
            <div className="text-[10px] text-slate-500 font-bold truncate">{Object.keys(distEntrada).length} categorias registradas</div>
          </div>
        </div>

        <div onClick={() => abrirDetalhesTransacoes(evento.id, 'saida')} className={`flex items-center gap-4 p-4 md:p-6 rounded-2xl md:rounded-3xl border transition-all cursor-pointer ${isEncerrado ? 'bg-slate-200/30 border-slate-300/60' : 'bg-rose-50/50 border-rose-100 hover:bg-rose-50 hover:shadow-sm'}`}>
          <div className="hidden sm:block">{renderDonutChart(distSaida, totalSaida, isEncerrado ? ['#94a3b8','#cbd5e1'] : coresSaida)}</div>
          <div className="flex-1 overflow-hidden">
            <div className="flex justify-between items-center mb-2">
              <span className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1 ${isEncerrado ? 'text-slate-500' : 'text-rose-700'}`}><ArrowDownRight size={12}/> Custos</span>
              <span className={`font-black text-sm ${isEncerrado ? 'text-slate-600' : 'text-rose-700'}`}>R$ {totalSaida.toFixed(2).replace('.', ',')}</span>
            </div>
            <div className="text-[10px] text-slate-500 font-bold truncate">{Object.keys(distSaida).length} categorias registradas</div>
          </div>
        </div>
      </div>

      {/* BOTÕES DE AÇÃO */}
      <div className="p-4 md:p-6 bg-white flex flex-col sm:flex-row gap-2">
        {!isEncerrado ? (
          <>
            <button onClick={() => abrirLancamento(evento.id, 'entrada')} className="flex-1 py-3.5 bg-green-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all">
              <PlusCircle size={14} /> Ganho
            </button>
            <button onClick={() => abrirLancamento(evento.id, 'saida')} className="flex-1 py-3.5 bg-rose-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all">
              <MinusCircle size={14} /> Gasto
            </button>
            <button onClick={() => abrirRelatorioEvento(evento)} className="px-4 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[10px] uppercase tracking-widest rounded-xl flex items-center justify-center gap-2">
              <Printer size={14} />
            </button>
            <button onClick={() => encerrarEventoDefinitivamente(evento.id)} className="px-4 py-3.5 bg-slate-800 hover:bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 active:scale-95">
              <Lock size={14} />
            </button>
          </>
        ) : (
          <div className="flex flex-col sm:flex-row gap-2 w-full animate-fadeIn">
            <button onClick={() => abrirRelatorioEvento(evento)} className="flex-[2] py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-[10px] uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all">
              <Printer size={14} /> Relatório Analítico
            </button>
            <button onClick={() => reabrirEvento(evento.id)} className="flex-1 py-3.5 bg-amber-100 hover:bg-amber-200 text-amber-700 font-black text-[10px] uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all">
              <Unlock size={14} /> Reabrir
            </button>
          </div>
        )}
      </div>
    </div>
  );
}