"use client";

import { useState } from "react";
import { X, Printer, Trophy, Users } from "lucide-react";

interface ModalRelatorioEventoProps {
  aberto: boolean;
  onFechar: () => void;
  eventoRelatorio: any;
  alunos: any[];
  historicoPagamentosEventos: any[];
  parseCurrency: (val: any) => number;
  getDetalhes: (t: any) => any;
  renderDonutChart: (distribuicao: Record<string, number>, total: number, cores: string[]) => React.ReactNode;
}

export function ModalRelatorioEvento({
  aberto,
  onFechar,
  eventoRelatorio,
  alunos,
  historicoPagamentosEventos,
  parseCurrency,
  getDetalhes,
  renderDonutChart,
}: ModalRelatorioEventoProps) {
  const [mostrarResultadoFinal, setMostrarResultadoFinal] = useState(false);

  if (!aberto || !eventoRelatorio) return null;

  // Lógica matemática isolada dentro do componente do relatório
  const transacoesDoEvento = historicoPagamentosEventos.filter(
    (t) => String(getDetalhes(t).evento_id) === String(eventoRelatorio.id)
  );

  const entradasRel = transacoesDoEvento.filter(
    (t) => getDetalhes(t).sub_tipo === 'entrada' || t.tipo === 'evento_entrada' || (!getDetalhes(t).sub_tipo && !t.descricao?.includes('[SA'))
  );
  const saidasRel = transacoesDoEvento.filter(
    (t) => getDetalhes(t).sub_tipo === 'saida' || t.tipo === 'evento_saida' || t.descricao?.includes('[SAÍDA]')
  );

  const totalEntradasRel = entradasRel.reduce((acc, t) => acc + parseCurrency(t.valor_pago), 0);
  const totalSaidasRel = saidasRel.reduce((acc, t) => acc + parseCurrency(t.valor_pago), 0);
  const saldoRel = totalEntradasRel - totalSaidasRel;

  const relatorioAlunos: Record<string, any> = {};
  const arrecadacaoAvulsa = { total: 0, equipes: {} as Record<string, number> };
  const resumoEquipesRelatorio: Record<string, {
    votos: { qtd: number; valor: number };
    ingressos: { qtd: number; valor: number };
    total: number;
  }> = {};

  entradasRel.forEach((t) => {
    const alunoId = String(t.aluno_id);
    const valor = parseCurrency(t.valor_pago);
    const equipe = getDetalhes(t).equipe_nome || "-";
    const cat = (getDetalhes(t).categoria_tag || "").toLowerCase();
    const qtd = Number(getDetalhes(t).quantidade) || 1;

    if (equipe !== '-') {
      if (!resumoEquipesRelatorio[equipe]) {
        resumoEquipesRelatorio[equipe] = {
          votos: { qtd: 0, valor: 0 },
          ingressos: { qtd: 0, valor: 0 },
          total: 0
        };
      }
      resumoEquipesRelatorio[equipe].total += valor;

      if (cat.includes('voto')) {
        resumoEquipesRelatorio[equipe].votos.qtd += qtd;
        resumoEquipesRelatorio[equipe].votos.valor += valor;
      } else if (cat.includes('ingresso') || cat.includes('bilhete')) {
        resumoEquipesRelatorio[equipe].ingressos.qtd += qtd;
        resumoEquipesRelatorio[equipe].ingressos.valor += valor;
      }
    }

    if (t.aluno_id && alunoId !== 'null' && alunoId !== 'undefined') {
      if (!relatorioAlunos[alunoId]) {
        const alunoObj = alunos.find((a) => String(a.id) === alunoId);
        relatorioAlunos[alunoId] = {
          nome: alunoObj ? alunoObj.nome : "Aluno Desconhecido",
          equipe: equipe,
          votos: 0,
          ingressos: 0,
          total_arrecadado: 0
        };
      }
      if (relatorioAlunos[alunoId].equipe === '-' && equipe !== '-') {
        relatorioAlunos[alunoId].equipe = equipe;
      }
      if (cat.includes('voto')) relatorioAlunos[alunoId].votos += qtd;
      else if (cat.includes('ingresso') || cat.includes('bilhete')) relatorioAlunos[alunoId].ingressos += qtd;
      relatorioAlunos[alunoId].total_arrecadado += valor;
    } else {
      arrecadacaoAvulsa.total += valor;
      if (equipe !== '-') {
        arrecadacaoAvulsa.equipes[equipe] = (arrecadacaoAvulsa.equipes[equipe] || 0) + valor;
      }
    }
  });

  const listaAlunosRelatorio = Object.values(relatorioAlunos).sort((a: any, b: any) => a.nome.localeCompare(b.nome));

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-0 sm:p-4" onClick={onFechar}>
      <div className="bg-white rounded-none sm:rounded-[2.5rem] w-full max-w-4xl p-6 md:p-8 shadow-2xl overflow-y-auto max-h-screen sm:max-h-[90vh] custom-scrollbar flex flex-col" onClick={e => e.stopPropagation()}>
        
        <div id="secao-relatorio-impressao" className="flex-1">
          <div className="text-center border-b-2 border-slate-800 pb-4 mb-6">
            <h2 className="text-2xl font-black uppercase text-slate-900 tracking-tight">Escola ABC do Park</h2>
            <p className="text-xs uppercase tracking-widest font-bold text-slate-500 mt-1">Demonstrativo Financeiro Nominal de Evento</p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400">Evento</p>
              <p className="text-sm font-black text-slate-800">{eventoRelatorio.nome}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400">Data Alvo</p>
              <p className="text-sm font-bold text-slate-700">{new Date(eventoRelatorio.data_evento + "T12:00:00").toLocaleDateString('pt-BR')}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400">Participantes</p>
              <p className="text-sm font-bold text-slate-700">{eventoRelatorio.total_alunos || 0} alunos</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400">Status</p>
              <p className="text-sm font-black text-slate-800 uppercase">{eventoRelatorio.encerrado ? "🔒 Finalizado" : "🔓 Ativo"}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
             <div className="border border-green-200 bg-green-50 p-4 rounded-xl text-center">
                <p className="text-[10px] uppercase font-black text-green-700 tracking-wider">Total de Ganhos</p>
                <p className="text-xl font-black text-green-700">R$ {totalEntradasRel.toFixed(2).replace('.', ',')}</p>
             </div>
             <div className="border border-rose-200 bg-rose-50 p-4 rounded-xl text-center">
                <p className="text-[10px] uppercase font-black text-rose-700 tracking-wider">Total de Gastos</p>
                <p className="text-xl font-black text-rose-700">R$ {totalSaidasRel.toFixed(2).replace('.', ',')}</p>
             </div>
             <div className="border border-blue-200 bg-blue-50 p-4 rounded-xl text-center">
                <p className="text-[10px] uppercase font-black text-blue-700 tracking-wider">Saldo Líquido</p>
                <p className={`text-xl font-black ${saldoRel >= 0 ? 'text-blue-700' : 'text-rose-700'}`}>R$ {saldoRel.toFixed(2).replace('.', ',')}</p>
             </div>
          </div>

          {Object.keys(resumoEquipesRelatorio).length > 0 && (
            <div className="mb-8 p-5 bg-amber-50/50 border border-amber-200 rounded-xl">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-800 border-l-4 border-amber-600 pl-2">
                  Desempenho Geral por Equipe (Gincana)
                </h3>
                <button
                  onClick={() => setMostrarResultadoFinal(!mostrarResultadoFinal)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm transition-all active:scale-95 flex items-center gap-2 print:hidden"
                >
                  <Trophy size={14}/> {mostrarResultadoFinal ? 'Ocultar Resultado Final' : 'Ver Resultado Final'}
                </button>
              </div>

              {!mostrarResultadoFinal ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                   {Object.entries(resumoEquipesRelatorio)
                     .sort((a, b) => b[1].total - a[1].total)
                     .map(([equipe, dados], index) => (
                       <div key={equipe} className="flex justify-between items-center bg-white p-3 rounded-lg border border-amber-100 shadow-sm">
                         <span className="text-xs font-bold text-slate-700 truncate pr-2">
                           {index === 0 ? "👑 " : "▫️ "} {equipe}
                         </span>
                         <span className="text-sm font-black text-amber-700 shrink-0">R$ {dados.total.toFixed(2).replace('.', ',')}</span>
                       </div>
                     ))
                   }
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-4 fade-in duration-300">
                   {Object.entries(resumoEquipesRelatorio)
                     .sort((a, b) => b[1].total - a[1].total)
                     .map(([equipe, dados], index) => {
                        const distEquipe: Record<string, number> = {
                          "Votos": dados.votos.valor,
                          "Ingressos": dados.ingressos.valor
                        };
                        const restante = dados.total - (dados.votos.valor + dados.ingressos.valor);
                        if (restante > 0.01) distEquipe["Outros"] = restante;

                        return (
                          <div key={equipe} className="bg-white p-4 rounded-2xl border border-amber-200 shadow-sm flex items-center gap-4">
                            <div className="shrink-0">
                               {renderDonutChart(distEquipe, dados.total, ['#f59e0b', '#3b82f6', '#94a3b8'])}
                            </div>
                            <div className="flex-1 overflow-hidden">
                              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                                <span className="text-sm font-black text-slate-800 truncate">
                                  {index === 0 && <span className="text-amber-500 mr-1">👑</span>}
                                  {equipe}
                                </span>
                                <span className="text-sm font-black text-amber-600">R$ {dados.total.toFixed(2).replace('.', ',')}</span>
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <div className="flex justify-between text-[11px]">
                                   <span className="font-bold text-slate-500 flex items-center gap-1">
                                     <span className="w-2 h-2 rounded-full bg-amber-500"></span> 
                                     Votos ({dados.votos.qtd} un)
                                   </span>
                                   <span className="font-black text-slate-700">R$ {dados.votos.valor.toFixed(2).replace('.', ',')}</span>
                                </div>
                                <div className="flex justify-between text-[11px]">
                                   <span className="font-bold text-slate-500 flex items-center gap-1">
                                     <span className="w-2 h-2 rounded-full bg-blue-500"></span> 
                                     Ingressos ({dados.ingressos.qtd} un)
                                   </span>
                                   <span className="font-black text-slate-700">R$ {dados.ingressos.valor.toFixed(2).replace('.', ',')}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                     })
                   }
                </div>
              )}
            </div>
          )}

          <div className="mb-8">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 mb-3 border-l-4 border-slate-800 pl-2">Detalhamento de Arrecadação por Aluno</h3>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-800 text-slate-800 font-black uppercase text-[10px]">
                  <th className="py-2.5">Nome da Criança</th>
                  <th className="py-2.5 text-center">Equipe</th>
                  <th className="py-2.5 text-center">Votos</th>
                  <th className="py-2.5 text-center">Ingressos</th>
                  <th className="py-2.5 text-right">Total Arrecadado</th>
                </tr>
              </thead>
              <tbody>
                {listaAlunosRelatorio.map((aluno: any, idx) => (
                  <tr key={idx} className="border-b border-slate-200 text-slate-700 hover:bg-slate-50">
                    <td className="py-3 font-bold uppercase">{aluno.nome}</td>
                    <td className="py-3 text-center font-black text-amber-600">{aluno.equipe !== '-' ? aluno.equipe : ''}</td>
                    <td className="py-3 text-center">{aluno.votos > 0 ? aluno.votos : '-'}</td>
                    <td className="py-3 text-center">{aluno.ingressos > 0 ? aluno.ingressos : '-'}</td>
                    <td className="py-3 text-right font-black text-green-600">R$ {aluno.total_arrecadado.toFixed(2).replace('.', ',')}</td>
                  </tr>
                ))}
                {arrecadacaoAvulsa.total > 0 && (
                  <tr className="border-t-2 border-slate-300 bg-slate-100/50">
                     <td className="py-3 font-black text-slate-500 italic">OUTRAS ARRECADAÇÕES (Avulso / Sem Nome)</td>
                     <td className="py-3 text-center text-[10px] font-black text-amber-600/70">
                        {Object.keys(arrecadacaoAvulsa.equipes).length > 0 ? Object.keys(arrecadacaoAvulsa.equipes).join(', ') : '-'}
                     </td>
                     <td className="py-3 text-center text-slate-400">-</td>
                     <td className="py-3 text-center text-slate-400">-</td>
                     <td className="py-3 text-right font-black text-slate-600">R$ {arrecadacaoAvulsa.total.toFixed(2).replace('.', ',')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex gap-3 border-t border-slate-100 pt-6 mt-6 print:hidden">
          <button onClick={onFechar} className="flex-1 py-4 rounded-xl border border-slate-200 font-black uppercase tracking-widest text-xs text-slate-500 hover:bg-slate-50">Fechar</button>
          <button 
            onClick={() => {
              const backupConteudo = document.body.innerHTML;
              const secaoImpressao = document.getElementById("secao-relatorio-impressao")?.innerHTML || "";
              document.body.innerHTML = `<div style="padding:40px; background:white; font-family:sans-serif;">${secaoImpressao}</div>`;
              window.print();
              document.body.innerHTML = backupConteudo;
              window.location.reload(); 
            }} 
            className="flex-[2] py-4 rounded-xl bg-slate-900 text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2"
          >
            <Printer size={18}/> Imprimir Relatório Oficial
          </button>
        </div>
      </div>
    </div>
  );
}