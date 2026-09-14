"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

import { FormularioConta } from "@/app/(sistema)/dashboard/financeiro/contas-a-pagar/_components/FormularioConta";
import { ModalEdicaoConta } from "@/app/(sistema)/dashboard/financeiro/contas-a-pagar/_components/ModalEdicaoConta";
import { ModalExclusaoConta } from "@/app/(sistema)/dashboard/financeiro/contas-a-pagar/_components/ModalExclusaoConta";
import { ModalConfirmarPagamento } from "@/app/(sistema)/dashboard/financeiro/contas-a-pagar/_components/ModalConfirmarPagamento";
import { ModalGasto } from "@/app/(sistema)/dashboard/financeiro/_components/ModalGasto";

import { useContasAPagar } from "./_hooks/useContasAPagar";
import { useDespesasVariaveis } from "./_hooks/useDespesasVariaveis";
import { obterStatusConta } from "./_utils/financeUtils";

function VisaoContasAPagar({ userEmail, userCargo }: any) {
  const fx = useContasAPagar();

  function triggerConfirmarExclusao(conta: any) {
    if (conta.is_recorrente) fx.setContaParaExcluir(conta); 
    else {
      if (window.confirm("Tem certeza que deseja excluir permanentemente esta conta?")) {
        fx.processarExclusao(conta.id, false);
      }
    }
  }

  return (
    <div className="py-2.5 font-sans animate-in fade-in duration-300">
      <header className="mb-6">
        <h1 className="text-xl md:text-2xl font-black text-slate-900 m-0">📅 Contas a Pagar</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">Gestão e liquidação de contratos permanentes, aluguéis e fornecedores.</p>
      </header>

      <FormularioConta onSalvar={fx.adicionarConta} />

      <section className="mt-8">
        <h3 className="mb-4 text-sm font-bold text-slate-400 uppercase tracking-wider">Histórico de Lançamentos</h3>
        <div className="flex flex-col gap-3">
          {fx.carregando ? (
            <p className="text-xs font-bold text-slate-400 animate-pulse uppercase">Carregando contas...</p>
          ) : fx.contas.map(conta => {
            const status = obterStatusConta(conta);
            return (
              <div 
                key={conta.id} 
                className={`flex flex-col md:flex-row justify-between items-start md:items-center p-4 bg-white rounded-2xl border gap-4 transition-all hover:border-slate-300 ${conta.pago ? 'border-emerald-100 bg-emerald-50/10' : 'border-slate-200/80'}`}
              >
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <div className={`py-1.5 px-3 rounded-lg text-[10px] font-black uppercase w-[75px] text-center border shrink-0 ${status.bg}`}>
                    {status.texto}
                  </div>
                  <div className="overflow-hidden">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="block text-sm sm:text-base text-slate-800 font-bold truncate">{conta.descricao}</strong>
                      {conta.is_recorrente && <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border border-slate-200">Recorrente</span>}
                    </div>
                    <span className="text-xs text-slate-400 block mt-0.5">Vencimento: {new Date(conta.data_vencimento).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between md:justify-end gap-4 w-full md:w-auto border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                  <div className="text-left sm:text-right flex sm:flex-col justify-between sm:justify-end items-center sm:items-end w-full sm:w-auto gap-1">
                    <span className="text-base sm:text-lg font-black text-slate-900">R$ {conta.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    {conta.pago ? (
                      <div className="flex flex-col items-start sm:items-end gap-1">
                        {conta.data_pagamento && (
                          <span className="text-[10px] text-slate-400 font-medium">
                            Pago: {new Date(conta.data_pagamento + "T12:00:00").toLocaleDateString('pt-BR')}
                          </span>
                        )}
                        <div className="flex gap-3 items-center">
                          <button onClick={() => fx.setContaParaPagar(conta)} className="text-xs text-indigo-600 font-bold hover:underline">Ajustar ⚙️</button>
                          <a href={conta.comprovante_url} target="_blank" rel="noreferrer" className="text-xs text-emerald-600 font-bold hover:underline">Recibo 📄</a>
                        </div>
                        <button onClick={() => fx.desfazerPagamento(conta.id)} className="text-[10px] text-slate-400 hover:text-rose-600 underline mt-0.5">Estornar quitação</button>
                      </div>
                    ) : (
                      <button onClick={() => fx.setContaParaPagar(conta)} className="px-3 py-1.5 rounded-lg border border-rose-500 text-rose-600 hover:bg-rose-50 font-bold text-xs transition-colors">Quitar Título</button>
                    )}
                  </div>
                  
                  <div className="flex sm:flex-col gap-4 border-t sm:border-t-0 sm:border-l border-slate-100 pt-3 sm:pt-0 sm:pl-4 justify-end shrink-0">
                    <button onClick={() => fx.abrirEdicao(conta)} className="text-sm p-1 hover:bg-slate-100 rounded-lg transition-colors" title="Editar">✏️</button>
                    <button onClick={() => triggerConfirmarExclusao(conta)} className="text-sm p-1 hover:bg-rose-50 rounded-lg transition-colors" title="Excluir">🗑️</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {fx.contaEmEdicao && (
        <ModalEdicaoConta 
          aberto={!!fx.contaEmEdicao} contaEmEdicao={fx.contaEmEdicao}
          editDescricao={fx.editDescricao} setEditDescricao={fx.setEditDescricao}
          editValor={fx.editValor} setEditValor={fx.setEditValor}
          editVencimento={fx.editVencimento} setEditVencimento={fx.setEditVencimento}
          editAplicarATodas={fx.editAplicarATodas} setEditAplicarATodas={fx.setEditAplicarATodas}
          onSalvar={fx.salvarEdicao} onFechar={() => fx.setContaEmEdicao(null)}
        />
      )}

      {fx.contaParaExcluir && (
        <ModalExclusaoConta 
          aberto={!!fx.contaParaExcluir} contaParaExcluir={fx.contaParaExcluir}
          onProcessarExclusao={fx.processarExclusao} onFechar={() => fx.setContaParaExcluir(null)}
        />
      )}

      {fx.contaParaPagar && (
        <ModalConfirmarPagamento 
          aberto={!!fx.contaParaPagar} contaParaPagar={fx.contaParaPagar}
          salvandoPgto={fx.processando} onRegistrarPagamento={fx.registrarPagamento} onFechar={() => fx.setContaParaPagar(null)}
        />
      )}
    </div>
  );
}

function VisaoDespesasVariaveis({ userEmail, userCargo }: any) {
  const vr = useDespesasVariaveis(userEmail, userCargo);

  return (
    <div className="w-full animate-in fade-in duration-300">
      <div className="mb-6 flex flex-col xl:flex-row justify-between items-start xl:items-center bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-800 m-0">📉 Livro Caixa de Saídas e Despesas</h1>
          <p className="text-xs text-slate-500 mt-1">Conferência histórica consolidada de investimentos operacionais e compras diárias.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
          <input 
            type="month" value={vr.mesFiltro} onChange={(e) => vr.setMesFiltro(e.target.value)} 
            className="w-full sm:w-auto p-2.5 bg-slate-100 rounded-xl font-bold border border-slate-200 text-indigo-900 outline-none text-sm" 
          />
          <button
            onClick={() => {
              if (userEmail !== 'carlamonaliza9@gmail.com' && userCargo !== 'Admin') return alert("Ação restrita ao perfil de Administrador.");
              vr.setModalGastoAberto(true);
            }}
            className="w-full sm:w-auto px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors whitespace-nowrap"
          >
            + Lançar Nova Despesa
          </button>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 mb-6 flex items-center justify-between border-l-4 border-l-rose-500">
        <div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total de Saídas Efetivadas</span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-800 mt-1">R$ {vr.totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
        </div>
        <div className="h-11 w-11 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center text-lg font-bold shrink-0 border border-rose-100">📉</div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-bold text-slate-500 text-xs uppercase tracking-wider m-0">Histórico Detalhado do Período</h3>
        </div>
        
        <div className="overflow-x-auto w-full custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-wider border-b border-slate-200">
                <th className="p-4 w-32">Data</th>
                <th className="p-4">Descrição da Despesa</th>
                <th className="p-4 text-right w-44">Valor Retirado</th>
                <th className="p-4 text-center w-36">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-600">
              {vr.listaGastosDetalhada.length > 0 ? (
                vr.listaGastosDetalhada.map((gasto) => (
                  <tr key={gasto.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 text-xs text-slate-400">
                      {new Date(gasto.data_gasto + "T12:00:00").toLocaleDateString('pt-BR')}
                    </td>
                    <td className="p-4 font-bold text-slate-800 uppercase text-xs sm:text-sm">
                      {gasto.descricao}
                    </td>
                    <td className="p-4 text-right font-black text-rose-600 text-sm">
                      R$ {parseFloat(gasto.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => vr.handleExcluirGasto(gasto)}
                        disabled={gasto.isContaFixa}
                        className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${gasto.isContaFixa ? "bg-slate-50 text-slate-300 cursor-not-allowed border border-slate-100" : "bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100"}`}
                      >
                        {gasto.isContaFixa ? "🔒 Retido" : "🗑️ Excluir"}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400 italic text-sm">
                    Nenhuma saída financeira registrada para este mês de referência.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ModalGasto 
        aberto={vr.modalGastoAberto} onFechar={() => vr.setModalGastoAberto(false)}
        dataGasto={vr.dataGasto} setDataGasto={vr.setDataGasto} descGasto={vr.descGasto} setDescGasto={vr.setDescGasto}
        valorGasto={vr.valorGasto} setValorGasto={vr.setValorGasto} onAdicionar={vr.adicionarGasto}
      />
    </div>
  );
}

export default function UnificadoContasDespesasPage() {
  const router = useRouter();
  const [visaoAtiva, setVisaoAtiva] = useState<"contas" | "despesas">("contas");
  const [verificandoAcesso, setVerificandoAcesso] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userCargo, setUserCargo] = useState<string | null>(null);

  useEffect(() => {
    async function verificarAcesso() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");

      const emailAtual = user.email || "";
      setUserEmail(emailAtual);
      const { data: perfil } = await supabase.from('perfis').select('cargo').eq('id', user.id).single();
      setUserCargo(perfil?.cargo || null);

      const ehAutorizado = 
        emailAtual === 'carlamonaliza9@gmail.com' || 
        emailAtual === 'diretoria@abcdopark.com' || 
        perfil?.cargo === 'Admin' ||
        perfil?.cargo === 'Direção';

      if (!ehAutorizado) {
        return router.push("/dashboard");
      }
      setVerificandoAcesso(false);
    }
    verificarAcesso();
  }, [router]);

  if (verificandoAcesso) return <div className="p-10 text-center font-black uppercase text-slate-300 tracking-widest text-xs animate-pulse">Autenticando credenciais...</div>;

  return (
    <div className="w-full bg-[#f8fafc] min-h-screen font-sans antialiased text-slate-800 pb-24 md:p-6 lg:p-8 flex flex-col">
      <div className="max-w-[1700px] w-full mx-auto mb-6 px-4">
        <div className="flex bg-slate-200/60 p-1 rounded-xl w-full sm:w-fit border border-slate-300/40">
          <button
            onClick={() => setVisaoAtiva("contas")}
            className={`flex-1 sm:flex-none px-5 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${visaoAtiva === "contas" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            📅 Contas a Pagar
          </button>
          <button
            onClick={() => setVisaoAtiva("despesas")}
            className={`flex-1 sm:flex-none px-5 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${visaoAtiva === "despesas" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            📉 Despesas e Saídas
          </button>
        </div>
      </div>

      <div className="max-w-[1700px] w-full mx-auto px-4 flex-1">
        {visaoAtiva === "contas" ? (
          <VisaoContasAPagar userEmail={userEmail} userCargo={userCargo} />
        ) : (
          <VisaoDespesasVariaveis userEmail={userEmail} userCargo={userCargo} />
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { height: 5px; width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}} />
    </div>
  );
}