"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import { Wallet, QrCode, Calendar, CheckCircle2, Clock, PartyPopper, FileText, Eye, AlertCircle, Info } from "lucide-react";

export default function FinanceiroPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  
  const [aluno, setAluno] = useState<any>(null);
  const [cronogramaAnual, setCronogramaAnual] = useState<any[]>([]);
  const [eventosTaxas, setEventosTaxas] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  const CHAVE_PIX = "escolaabcdopark@gmail.com";
  const mesesAno = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  useEffect(() => {
    if (id) buscarDadosFinanceiros();
  }, [id]);

  async function buscarDadosFinanceiros() {
    setCarregando(true);
    
    // 1. Busca dados mestres do aluno (Valor e Vencimento do cadastro principal)
    const { data: a } = await supabase
      .from("alunos")
      .select("nome, valor, vencimento") // No admin as colunas são 'valor' e 'vencimento'
      .eq("id", id)
      .single();
    
    if (a) setAluno(a);

    // 2. Busca o histórico real de pagamentos
    const { data: hData } = await supabase
      .from("historico_pagamentos")
      .select("*")
      .eq("aluno_id", id);

    // 3. Busca Eventos na tabela 'eventos_controle'
    const { data: eData } = await supabase
      .from("eventos_controle")
      .select("*")
      .contains('participantes', [id]); // No admin, eventos usam array de participantes
    
    if (eData) {
      const eventosProcessados = eData.map(ev => {
        const pgtoEv = hData?.find(h => h.tipo === 'evento' && h.descricao.includes(ev.nome));
        return {
          ...ev,
          pago: !!pgtoEv,
          data_pagamento: pgtoEv?.data_pagamento,
          valor_pago: pgtoEv?.valor_total,
          comprovante: pgtoEv?.comprovante_url
        };
      });
      setEventosTaxas(eventosProcessados);
    }

    // 4. LÓGICA DO ADMIN: Geração do cronograma Jan-Dez cruzando com histórico
    if (a) {
      const hoje = new Date();
      const diaVenc = parseInt(a.vencimento) || 10;
      const valorMensalidade = parseFloat(a.valor) || 0;

      const cronograma = mesesAno.map((mesNome, index) => {
        // Define a data de vencimento para o mês atual no loop
        const dataVencimento = new Date(2026, index, diaVenc, 23, 59, 59);
        
        // Procura no histórico um pagamento de mensalidade que cite este mês
        const pagamento = hData?.find(h => 
          h.tipo === 'mensalidade' && 
          h.descricao.toLowerCase().includes(mesNome.toLowerCase())
        );

        return {
          mes: mesNome,
          vencimento: dataVencimento.toISOString().split('T')[0],
          valor: valorMensalidade,
          status: pagamento ? 'pago' : (hoje > dataVencimento ? 'atrasado' : 'pendente'),
          data_pagamento: pagamento?.data_pagamento,
          forma_pagamento: pagamento?.tipo,
          valor_pago: pagamento?.valor_total,
          comprovante_url: pagamento?.comprovante_url,
          descricao: pagamento?.descricao || `Mensalidade de ${mesNome}`
        };
      });

      setCronogramaAnual(cronograma);
    }

    setCarregando(false);
  }

  const handlePagarPix = (valor: number, descricao: string) => {
    alert(`Chave PIX: ${CHAVE_PIX}\nValor: R$ ${valor.toFixed(2)}\n\nReferente a: ${descricao}`);
  };

  const formatarMoeda = (valor: any) => parseFloat(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatarData = (d: string) => d ? d.split("-").reverse().join("/") : "---";

  if (carregando) return <div className="p-10 text-center text-[10px] font-black uppercase text-slate-300 animate-pulse tracking-widest">Sincronizando fluxo financeiro...</div>;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10 w-full px-2">
      <header className="mb-10">
        <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter italic">Financeiro</h1>
        <p className="text-[9px] font-bold uppercase text-slate-400 tracking-widest mt-2 italic">Acompanhamento: <span className="text-indigo-600 font-black">{aluno?.nome}</span></p>
      </header>

      {/* CABEÇALHO DE RESUMO (DADOS DO CADASTRO) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        <div className="bg-indigo-600 rounded-[2rem] p-6 text-white flex items-center gap-5 shadow-xl shadow-indigo-100">
          <div className="bg-white/20 p-4 rounded-2xl"><Wallet size={24} /></div>
          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.2em] opacity-70">Valor da Mensalidade</p>
            <p className="text-2xl font-black italic">{formatarMoeda(aluno?.valor)}</p>
          </div>
        </div>
        <div className="bg-white border border-slate-100 rounded-[2rem] p-6 flex items-center gap-5 shadow-sm">
          <div className="bg-slate-50 p-4 rounded-2xl text-slate-400"><Calendar size={24} /></div>
          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">Dia de Vencimento</p>
            <p className="text-2xl font-black text-slate-800 italic">Dia {aluno?.vencimento || "10"}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* SEÇÃO: MENSALIDADES (JANEIRO A DEZEMBRO) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600"><CheckCircle2 size={20} /></div>
            <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest">Mensalidades 2026</h2>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {cronogramaAnual.map((m, idx) => (
              <div key={idx} className={`bg-white rounded-[2.5rem] border p-6 transition-all ${m.status === 'pago' ? 'border-slate-100 opacity-90' : 'border-indigo-50 shadow-sm'}`}>
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${m.status === 'pago' ? 'bg-emerald-50 text-emerald-500' : m.status === 'atrasado' ? 'bg-rose-50 text-rose-500' : 'bg-slate-50 text-indigo-500'}`}>
                      {m.status === 'pago' ? <CheckCircle2 size={20} /> : <Calendar size={20} />}
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-slate-700 uppercase">{m.mes}</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Vencimento: {formatarData(m.vencimento)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-6">
                    <div className="text-right">
                      <p className={`text-sm font-black ${m.status === 'atrasado' ? 'text-rose-600' : 'text-slate-800'}`}>{formatarMoeda(m.valor)}</p>
                      <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded-md ${m.status === 'pago' ? 'bg-emerald-50 text-emerald-600' : (m.status === 'atrasado' ? 'bg-rose-50 text-rose-600 flex items-center gap-1' : 'bg-amber-50 text-amber-600')}`}>
                        {m.status === 'pago' ? 'Liquidado' : (m.status === 'atrasado' ? <> <AlertCircle size={8}/> Vencido </> : 'Pendente')}
                      </span>
                    </div>

                    {m.status !== "pago" && (
                      <button onClick={() => handlePagarPix(m.valor, `Mensalidade ${m.mes}`)} className="bg-slate-900 text-white px-5 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-indigo-600 active:scale-95 transition-all flex items-center gap-2">
                        <QrCode size={14} /> Pagar
                      </button>
                    )}
                  </div>
                </div>

                {/* DETALHAMENTO DO PAGAMENTO (IGUAL AO QUE VOCÊ PEDIU) */}
                {m.status === "pago" && (
                  <div className="mt-5 pt-5 border-t border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50/50 p-4 rounded-2xl">
                    <div>
                      <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Data do Pagamento</p>
                      <p className="text-[10px] font-bold text-slate-600">{formatarData(m.data_pagamento)}</p>
                    </div>
                    <div>
                      <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Forma / Valor</p>
                      <p className="text-[10px] font-bold text-slate-600 uppercase">{m.forma_pagamento || "PIX"} • {formatarMoeda(m.valor_pago)}</p>
                    </div>
                    <div className="col-span-2 flex justify-end">
                      {m.comprovante_url && (
                        <a href={m.comprovante_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-[9px] font-black text-indigo-600 uppercase hover:bg-indigo-50 shadow-sm">
                          <FileText size={12} /> Comprovante
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* SEÇÃO: EVENTOS E TAXAS */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-50">
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-amber-50 p-3 rounded-2xl text-amber-600"><PartyPopper size={20} /></div>
              <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest">Eventos e Taxas</h2>
            </div>
            
            <div className="space-y-4">
              {eventosTaxas.length > 0 ? eventosTaxas.map((e, idx) => (
                <div key={idx} className={`p-5 rounded-2xl border transition-all ${e.pago ? 'bg-slate-50 border-slate-100' : 'bg-amber-50/30 border-amber-100'}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-[10px] font-black text-slate-700 uppercase leading-tight">{e.nome}</p>
                      <p className="text-[7px] font-bold text-slate-400 uppercase mt-1">Valor: {formatarMoeda(e.valor_unitario)}</p>
                    </div>
                    {e.pago ? <CheckCircle2 size={18} className="text-emerald-500" /> : <Clock size={18} className="text-amber-500" />}
                  </div>
                  
                  {e.pago ? (
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <span className="text-[7px] font-black text-emerald-600 uppercase">Pago: {formatarData(e.data_pagamento)}</span>
                      {e.comprovante && <a href={e.comprovante} target="_blank" className="text-indigo-600 hover:scale-110 transition-transform"><Eye size={14} /></a>}
                    </div>
                  ) : (
                    <button onClick={() => handlePagarPix(e.valor_unitario, e.nome)} className="w-full bg-indigo-600 text-white py-2.5 rounded-xl text-[8px] font-black uppercase shadow-md hover:bg-indigo-700">Pagar Taxa</button>
                  )}
                </div>
              )) : (
                <div className="text-center py-6">
                  <PartyPopper size={24} className="mx-auto mb-2 text-slate-200" />
                  <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Nenhuma taxa extra.</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-center text-white shadow-xl">
            <Info size={24} className="mx-auto mb-4 text-indigo-400 opacity-50" />
            <p className="text-[10px] font-black uppercase tracking-widest mb-6 leading-relaxed">Dúvidas financeiras? Fale com a secretaria.</p>
            <button className="w-full bg-white text-slate-900 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-50 transition-all">WhatsApp Suporte</button>
          </div>
        </div>
      </div>
    </div>
  );
}