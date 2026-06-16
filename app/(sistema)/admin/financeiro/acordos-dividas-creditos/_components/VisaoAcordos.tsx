"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { removerAcentos } from "@/lib/utils"; 
import { Trophy } from "lucide-react";

const clean = (val: any) => {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === 'number') return val;
  const str = String(val).trim();
  if (str.includes(',')) return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
  return parseFloat(str) || 0;
};
const SENHA_MESTRA = "1234";

interface VisaoAcordosProps {
  userEmail: string | null;
}

export function VisaoAcordos({ userEmail }: VisaoAcordosProps) {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [acordosAgrupados, setAcordosAgrupados] = useState<any[]>([]);
  const [filtroNome, setFiltroNome] = useState("");
  const [alunoExpandido, setAlunoExpandido] = useState<string | null>(null);
  const [editandoObs, setEditandoObs] = useState<string | null>(null);
  const [textoObs, setTextoObs] = useState("");

  const emitirRecarregamento = () => {
    window.dispatchEvent(new Event('recarregarBalançoGlobal'));
  };

  useEffect(() => { carregarDados(); }, []);

  async function carregarDados() {
    setCarregando(true);
    try {
      const hoje = new Date().toISOString().split('T')[0];
      const { data: listaAlunos } = await supabase.from('alunos').select('*');
      const { data: todosAcordos } = await supabase.from('historico_pagamentos').select('*').eq('tipo', 'acordo').order('data_pagamento', { ascending: true });

      if (listaAlunos && todosAcordos) {
        const agrupados = listaAlunos.map((aluno: any) => {
          const parcelasDoAluno = todosAcordos.filter((a: any) => a.aluno_id === aluno.id);
          if (parcelasDoAluno.length === 0) return null;

          const contratosMap = new Map();
          parcelasDoAluno.forEach((p: any) => {
             const chave = p.created_at ? p.created_at.substring(0, 16) : p.data_pagamento;
             if (!contratosMap.has(chave)) contratosMap.set(chave, []);
             contratosMap.get(chave).push({
               ...p,
               status: (p.status !== 'pago' && p.data_pagamento < hoje) ? 'atrasado' : p.status
             });
          });

          const contratosArray = Array.from(contratosMap.values()).map((parcelasContrato: any) => {
             const valorTotal = parcelasContrato.reduce((acc: number, p: any) => acc + clean(p.valor_total), 0);
             const valorPago = parcelasContrato.filter((p: any) => p.status === 'pago').reduce((acc: number, p: any) => acc + clean(p.valor_pago || p.valor_total), 0);
             const dataInicio = parcelasContrato[0]?.created_at?.split('T')[0] || parcelasContrato[0]?.data_pagamento;
             const responsavel = parcelasContrato[0]?.detalhes_metodos?.criado_por || "Sistema/Admin";
             const qtdParcelas = parcelasContrato.length;

             return {
                idBase: parcelasContrato[0].id,
                parcelas: parcelasContrato,
                valorTotal,
                valorPago,
                dataInicio,
                responsavel,
                qtdParcelas,
                progresso: Math.round((valorPago / valorTotal) * 100) || 0
             };
          });

          const totalGeralPago = contratosArray.reduce((acc: number, c: any) => acc + c.valorPago, 0);
          const totalGeralDevido = contratosArray.reduce((acc: number, c: any) => acc + c.valorTotal, 0);
          const progressoGeral = Math.round((totalGeralPago / totalGeralDevido) * 100) || 0;
          const resumoParcelas = contratosArray.map((c: any) => `${c.qtdParcelas}x`).join(' e ');

          return { 
            ...aluno, 
            contratos: contratosArray,
            totalGeralPago,
            totalGeralDevido,
            progressoGeral,
            qtdAcordos: contratosArray.length,
            resumoParcelas,
            observacoes_financeiras: aluno.observacoes_financeiras
          };
        }).filter((item: any) => !!item);

        setAcordosAgrupados(agrupados as any[]);
      }
    } catch (e) { console.error(e); }
    setCarregando(false);
  }

  async function salvarObservacao(alunoId: string) {
    await supabase.from('alunos').update({ observacoes_financeiras: textoObs }).eq('id', alunoId);
    setAcordosAgrupados(acordosAgrupados.map((a: any) => a.id === alunoId ? { ...a, observacoes_financeiras: textoObs } : a));
    setEditandoObs(null);
  }

  async function desfazerParcela(id: string) {
    if (prompt("Digite a Senha Mestra para ESTORNAR o pagamento desta parcela:") !== SENHA_MESTRA) return alert("Senha incorreta.");
    await supabase.from('historico_pagamentos').update({ status: 'pendente', valor_pago: 0, detalhes_metodos: {} }).eq('id', id);
    emitirRecarregamento();
    carregarDados();
  }

  async function excluirParcela(id: string) {
    if (prompt("Digite a Senha Mestra para EXCLUIR esta parcela:") !== SENHA_MESTRA) return alert("Senha incorreta.");
    await supabase.from('historico_pagamentos').delete().eq('id', id);
    emitirRecarregamento();
    carregarDados();
  }

  async function excluirAcordoInteiro(parcelas: any[]) {
    if (prompt("ATENÇÃO: Digite a Senha Mestra para EXCLUIR O CONTRATO INTEIRO (todas as parcelas):") !== SENHA_MESTRA) return alert("Senha incorreta.");
    const ids = parcelas.map(p => p.id);
    await supabase.from('historico_pagamentos').delete().in('id', ids);
    emitirRecarregamento();
    carregarDados();
  }

  async function editarParcela(parcela: any) {
    if (prompt("Digite a Senha Mestra para EDITAR os valores:") !== SENHA_MESTRA) return alert("Senha incorreta.");
    const novoValor = prompt("Novo valor da parcela (ex: 150.00):", clean(parcela.valor_total).toString());
    if (!novoValor) return;
    const novaData = prompt("Novo vencimento (AAAA-MM-DD):", parcela.data_pagamento);
    if (!novaData) return;
    
    await supabase.from('historico_pagamentos').update({
      valor_total: clean(novoValor),
      data_pagamento: novaData
    }).eq('id', parcela.id);
    emitirRecarregamento();
    carregarDados();
  }

  const dadosFiltrados = acordosAgrupados.filter((a: any) => {
    const nomeLimpo = removerAcentos(a.nome?.toLowerCase());
    const buscaLimpa = removerAcentos(filtroNome.toLowerCase());
    return nomeLimpo.includes(buscaLimpa);
  });

  if (carregando) return <div className="p-10 text-center font-black uppercase text-slate-300 tracking-widest animate-pulse">Carregando Dívida Ativa...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">🤝 Acordos Realizados</h1>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Parcelamentos Especiais e Histórico Detalhado</p>
        </div>
        <input type="text" placeholder="🔍 Buscar aluno..." value={filtroNome} onChange={(e) => setFiltroNome(e.target.value)} className="w-full md:w-64 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 transition-colors text-sm" />
      </div>

      <div className="space-y-4">
        {dadosFiltrados.length === 0 ? (
          <div className="text-center p-10 text-slate-400 font-bold bg-white rounded-2xl border border-slate-100 shadow-sm">Nenhum acordo registrado.</div>
        ) : (
          dadosFiltrados.map((aluno: any) => {
            return (
              <div key={aluno.id} className="bg-white rounded-[2rem] md:rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-5 md:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setAlunoExpandido(alunoExpandido === aluno.id ? null : aluno.id)}>
                  <div className="flex w-full md:w-auto items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-xl shrink-0">{aluno.nome.charAt(0)}</div>
                    <div className="flex-1">
                      <h2 className="font-bold text-slate-800 text-[16px] md:text-[18px] leading-tight line-clamp-1">{aluno.nome}</h2>
                      <p className="text-[11px] md:text-xs text-slate-500 font-semibold mt-1">
                        📝 {aluno.qtdAcordos} acordo(s) ativo(s) em: <b className="text-indigo-600">{aluno.resumoParcelas}</b>
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-start md:items-end w-full md:w-auto md:min-w-[220px]">
                    <span className="text-[11px] md:text-xs font-bold text-slate-500 mb-1.5">Quitado Geral: <b className="text-emerald-500">R$ {aluno.totalGeralPago.toFixed(2)}</b> de R$ {aluno.totalGeralDevido.toFixed(2)}</span>
                    <div className="w-full bg-slate-100 rounded-full h-2 shadow-inner"><div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${aluno.progressoGeral}%` }} /></div>
                  </div>
                </div>

                {alunoExpandido === aluno.id && (
                  <div className="p-5 md:p-6 border-t border-slate-100 bg-slate-50/80 flex flex-col lg:grid lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
                    
                    <div className="lg:col-span-8 space-y-4">
                      {aluno.contratos.map((contrato: any, cIdx: number) => (
                        <div key={cIdx} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 pb-3 border-b border-slate-100">
                            <span className="font-bold text-slate-700 text-[11px] md:text-xs uppercase tracking-wider">
                              Contrato {cIdx + 1} - Firmado em {contrato.dataInicio?.split('-').reverse().join('/')} ({contrato.qtdParcelas} Parcela(s))
                            </span>
                            <button onClick={() => excluirAcordoInteiro(contrato.parcelas)} className="w-full sm:w-auto text-[10px] text-rose-500 font-bold hover:underline bg-rose-50 px-3 py-2 rounded-lg text-center transition-colors">
                              🗑️ Excluir Contrato Inteiro
                            </button>
                          </div>
                          
                          <div className="space-y-2">
                            {contrato.parcelas.map((parcela: any) => {
                              const estaPago = parcela.status === 'pago';
                              return (
                                <div key={parcela.id} className={`flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 p-3.5 rounded-xl border text-xs transition-colors ${estaPago ? 'bg-slate-100/50 border-slate-200 opacity-70' : 'bg-slate-50 border-slate-200 hover:border-indigo-300'}`}>
                                  <div className="flex flex-col gap-1">
                                    <span className={`font-bold uppercase ${estaPago ? 'text-slate-500 line-through' : 'text-slate-800'}`}>{parcela.descricao}</span>
                                    <span className="text-[10px] text-slate-400">Vencimento: {parcela.data_pagamento?.split('-').reverse().join('/')}</span>
                                  </div>
                                  <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                                    <span className={`font-black text-sm ${estaPago ? 'text-slate-400' : 'text-slate-800'}`}>R$ {clean(parcela.valor_total).toFixed(2)}</span>
                                    <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider ${estaPago ? 'bg-emerald-100 text-emerald-700' : parcela.status === 'atrasado' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>{parcela.status}</span>
                                    
                                    <div className="flex gap-2 border-l border-slate-200 pl-3 ml-1">
                                      {estaPago ? (
                                        <button onClick={() => desfazerParcela(parcela.id)} className="text-slate-400 hover:text-amber-600 text-lg p-1" title="Estornar Pagamento">🔄</button>
                                      ) : (
                                        <>
                                          <button onClick={() => editarParcela(parcela)} className="text-slate-400 hover:text-indigo-600 text-lg p-1" title="Editar Parcela">✏️</button>
                                          <button onClick={() => excluirParcela(parcela.id)} className="text-slate-400 hover:text-rose-600 text-lg p-1" title="Excluir Parcela">🗑️</button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="lg:col-span-4 flex flex-col h-full mt-2 lg:mt-0">
                      <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Observações Internas da Secretaria</h4>
                      {editandoObs === aluno.id ? (
                        <div className="flex flex-col gap-3 flex-1 bg-white p-3 rounded-2xl border border-indigo-100 shadow-sm">
                          <textarea value={textoObs} onChange={(e) => setTextoObs(e.target.value)} className="w-full flex-1 p-3 rounded-xl border border-slate-200 outline-none text-xs md:text-sm resize-none bg-slate-50 focus:bg-white focus:border-indigo-300 transition-colors min-h-[140px]" placeholder="Insira os termos firmados de pagamento..." />
                          <div className="flex gap-2 justify-end mt-auto">
                            <button onClick={() => setEditandoObs(null)} className="px-4 py-2 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl">Cancelar</button>
                            <button onClick={() => salvarObservacao(aluno.id)} className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md">Gravar Notas</button>
                          </div>
                        </div>
                      ) : (
                        <div onClick={() => { setTextoObs(aluno.observacoes_financeiras || ""); setEditandoObs(aluno.id); }} className="flex-1 p-5 bg-white border border-slate-200 rounded-2xl text-xs md:text-sm text-slate-600 cursor-pointer hover:border-indigo-300 hover:shadow-sm transition-all whitespace-pre-wrap min-h-[140px] relative group leading-relaxed">
                          {aluno.observacoes_financeiras || <span className="text-slate-400 italic">Nenhum termo registrado. Clique para adicionar detalhes operacionais...</span>}
                          <div className="absolute bottom-3 right-3 bg-slate-100 px-2 py-1 rounded text-slate-500 font-bold text-[10px]">✏️ EDITAR</div>
                        </div>
                      )}
                    </div>

                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}