"use client";

// Importamos o ícone Unlock para o novo botão de reabrir
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
  reabrirEvento: (id: string) => void; // <--- Adicionado na tipagem
}

export function CardEvento({
  evento,
  historicoPagamentosEventos,
  parseCurrency,
  getDetalhes,
  renderDonutChart,
  prepararEdicaoSetup,
  abrirDetalhesTransacoes,
  abrirLancamento,
  abrirRelatorioEvento,
  encerrarEventoDefinitivamente,
  reabrirEvento // <--- Desestruturado aqui
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
    evento.equipes.forEach((eq: string) => {
      if (placarEquipes[eq] === undefined) placarEquipes[eq] = 0;
    });
  }
  
  const placarOrdenado = Object.entries(placarEquipes).sort((a, b) => Number(b[1]) - Number(a[1]));
  const maiorValorEquipe = placarOrdenado.length > 0 ? Number(placarOrdenado[0][1]) : 1; 

  const coresEntrada = ['#16a34a', '#22c55e', '#4ade80', '#86efac', '#bbf7d0'];
  const coresSaida = ['#dc2626', '#ef4444', '#f87171', '#fca5a5', '#fecaca'];
  const isEncerrado = !!evento.encerrado;

  return (
    <div className={`rounded-[2.5rem] border shadow-sm overflow-hidden flex flex-col relative w-full transition-all ${isEncerrado ? 'bg-slate-100 border-slate-200 shadow-inner' : 'bg-white border-slate-100'}`}>
      
      {!isEncerrado ? (
        <button onClick={() => prepararEdicaoSetup(evento)} className="absolute top-6 right-6 p-2 bg-white rounded-full shadow-sm text-slate-400 hover:text-blue-600 transition-colors" title="Editar Configurações do Evento">
          <Settings size={18} />
        </button>
      ) : (
        <div className="absolute top-6 right-6 flex gap-2">
          <span className="flex items-center gap-1 px-3 py-1 bg-slate-200 text-slate-600 border border-slate-300 text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm">
            <Lock size={12}/> Evento Finalizado
          </span>
        </div>
      )}

      <div className={`p-6 md:p-8 border-b flex flex-col md:flex-row justify-between items-start gap-4 ${isEncerrado ? 'bg-slate-200/40 border-slate-200' : 'bg-slate-50 border-slate-100'}`}>
        <div>
          <h3 className={`text-xl md:text-2xl font-black uppercase tracking-tight leading-none mb-2 ${isEncerrado ? 'text-slate-500 line-through' : 'text-slate-800'}`}>{evento.nome}</h3>
          <span className="inline-block px-3 py-1 bg-white border border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm">
            📅 {new Date(evento.data_evento + "T12:00:00").toLocaleDateString('pt-BR')}
          </span>
          {evento.total_alunos > 0 && (
            <span className="inline-block ml-2 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm">
              👥 {evento.total_alunos} Participantes
            </span>
          )}
        </div>
        <div className="text-left md:text-right bg-white p-4 rounded-2xl border border-slate-100 shadow-sm w-full md:w-auto">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{isEncerrado ? "Lucro Realizado Final" : "Lucro Líquido Parcial"}</p>
          <p className={`text-2xl md:text-3xl font-black ${lucro >= 0 ? 'text-green-600' : 'text-rose-600'}`}>
            R$ {lucro.toFixed(2).replace('.', ',')}
          </p>
        </div>
      </div>

      {placarOrdenado.length > 0 && (
        <div className={`px-6 md:px-8 py-5 border-b ${isEncerrado ? 'border-slate-200 bg-slate-200/20' : 'border-slate-50 bg-slate-50/50'}`}>
          <h4 className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-amber-600 mb-4 flex items-center gap-2">
            <Trophy size={14}/> Placar da Gincana / Equipes
          </h4>
          <div className="flex flex-col gap-3">
            {placarOrdenado.map(([nomeEq, valorEq], index) => {
              const vEq = Number(valorEq);
              return (
                <div key={nomeEq} className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-700 flex items-center gap-2">
                      {index === 0 && vEq > 0 && <span className="text-amber-500">👑</span>} 
                      {nomeEq}
                    </span>
                    <span className="font-black text-slate-800">R$ {vEq.toFixed(2).replace('.', ',')}</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${index === 0 && vEq > 0 ? 'bg-amber-500' : 'bg-blue-500'} ${isEncerrado ? 'saturate-50' : ''}`} style={{ width: `${vEq > 0 ? (vEq / Number(maiorValorEquipe)) * 100 : 0}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className={`p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 border-b ${isEncerrado ? 'border-slate-200' : 'border-slate-50'}`}>
        <div onClick={() => abrirDetalhesTransacoes(evento.id, 'entrada')} className={`flex items-center gap-6 p-5 md:p-6 rounded-3xl border transition-all cursor-pointer group ${isEncerrado ? 'bg-slate-200/30 border-slate-300/60' : 'bg-green-50/50 border-green-100 hover:bg-green-50 hover:shadow-md'}`}>
          <div>{renderDonutChart(distEntrada, totalEntrada, isEncerrado ? ['#94a3b8','#cbd5e1','#e2e8f0'] : coresEntrada)}</div>
          <div className="flex-1 overflow-hidden">
            <div className="flex justify-between items-center mb-3">
              <span className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${isEncerrado ? 'text-slate-500' : 'text-green-700'}`}><ArrowUpRight size={14}/> Ganhos</span>
              <span className={`font-black text-lg ${isEncerrado ? 'text-slate-600' : 'text-green-700'}`}>R$ {totalEntrada.toFixed(2).replace('.', ',')}</span>
            </div>
            <div className="flex flex-col gap-2 max-h-[100px] overflow-y-auto custom-scrollbar pr-2">
              {Object.entries(distEntrada).map(([cat, val], idx) => (
                <div key={cat} className="flex justify-between text-[11px] font-bold text-slate-600">
                  <span className="flex items-center gap-2 truncate pr-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: isEncerrado ? '#94a3b8' : coresEntrada[idx % coresEntrada.length] }}></span>
                    <span className="truncate">{cat}</span>
                  </span>
                  <span>R$ {Number(val).toFixed(2).replace('.', ',')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div onClick={() => abrirDetalhesTransacoes(evento.id, 'saida')} className={`flex items-center gap-6 p-5 md:p-6 rounded-3xl border transition-all cursor-pointer group ${isEncerrado ? 'bg-slate-200/30 border-slate-300/60' : 'bg-rose-50/50 border-rose-100 hover:bg-rose-50 hover:shadow-md'}`}>
          <div>{renderDonutChart(distSaida, totalSaida, isEncerrado ? ['#94a3b8','#cbd5e1','#e2e8f0'] : coresSaida)}</div>
          <div className="flex-1 overflow-hidden">
            <div className="flex justify-between items-center mb-3">
              <span className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${isEncerrado ? 'text-slate-500' : 'text-rose-700'}`}><ArrowDownRight size={14}/> Custos</span>
              <span className={`font-black text-lg ${isEncerrado ? 'text-slate-600' : 'text-rose-700'}`}>R$ {totalSaida.toFixed(2).replace('.', ',')}</span>
            </div>
            <div className="flex flex-col gap-2 max-h-[100px] overflow-y-auto custom-scrollbar pr-2">
              {Object.entries(distSaida).map(([cat, val], idx) => (
                <div key={cat} className="flex justify-between text-[11px] font-bold text-slate-600">
                  <span className="flex items-center gap-2 truncate pr-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: isEncerrado ? '#94a3b8' : coresSaida[idx % coresSaida.length] }}></span>
                    <span className="truncate">{cat}</span>
                  </span>
                  <span>R$ {Number(val).toFixed(2).replace('.', ',')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 bg-white flex flex-col sm:flex-row gap-3">
        {!isEncerrado ? (
          <>
            <button onClick={() => abrirLancamento(evento.id, 'entrada')} className="flex-1 py-4 bg-green-100 hover:bg-green-200 text-green-700 font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 shadow-sm active:scale-95">
              <PlusCircle size={18} /> Lançar Ganho
            </button>
            <button onClick={() => abrirLancamento(evento.id, 'saida')} className="flex-1 py-4 bg-rose-100 hover:bg-rose-200 text-rose-700 font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 shadow-sm active:scale-95">
              <MinusCircle size={18} /> Lançar Gasto
            </button>
            <button onClick={() => abrirRelatorioEvento(evento)} className="px-5 py-4 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-600 font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2">
              <Printer size={18} /> Relatório
            </button>
            <button onClick={() => encerrarEventoDefinitivamente(evento.id)} className="px-5 py-4 bg-slate-800 hover:bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 active:scale-95">
              🔒 Encerrar Evento
            </button>
          </>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3 w-full animate-fadeIn">
            <button onClick={() => abrirRelatorioEvento(evento)} className="flex-[2] py-4 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all">
              <Printer size={18} /> Gerar Relatório Analítico e Extrato
            </button>
            <button onClick={() => reabrirEvento(evento.id)} className="flex-1 py-4 bg-amber-100 hover:bg-amber-200 text-amber-700 font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all">
              <Unlock size={18} /> Reabrir Evento
            </button>
          </div>
        )}
      </div>

    </div>
  );
}