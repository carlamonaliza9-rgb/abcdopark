"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

// Componentes importados da pasta original do dashboard (Contas a Pagar)
import { FormularioConta } from "@/app/(sistema)/dashboard/financeiro/contas-a-pagar/_components/FormularioConta";
import { ModalEdicaoConta } from "@/app/(sistema)/dashboard/financeiro/contas-a-pagar/_components/ModalEdicaoConta";
import { ModalExclusaoConta } from "@/app/(sistema)/dashboard/financeiro/contas-a-pagar/_components/ModalExclusaoConta";
import { ModalConfirmarPagamento } from "@/app/(sistema)/dashboard/financeiro/contas-a-pagar/_components/ModalConfirmarPagamento";

// Importação dos Modais Modularizados da pasta global de componentes (Despesas)
import { ModalGasto } from "@/app/(sistema)/dashboard/financeiro/_components/ModalGasto";

const SENHA_MESTRA = "1234";

// Função utilitária para prevenir NaN e lidar com vírgulas
const converterValorSeguro = (val: string | number) => {
  if (!val) return 0;
  if (typeof val === "number") return val;
  return parseFloat(val.replace(',', '.')) || 0;
};

// ============================================================================
// 1. COMPONENTE: CONTAS A PAGAR
// ============================================================================
function VisaoContasAPagar({ userEmail, userCargo }: { userEmail: string | null, userCargo: string | null }) {
  const [contas, setContas] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  
  const [contaParaPagar, setContaParaPagar] = useState<any>(null);
  const [salvandoPgto, setSalvandoPgto] = useState(false);
  
  const [contaEmEdicao, setContaEmEdicao] = useState<any>(null);
  const [editDescricao, setEditDescricao] = useState("");
  const [editValor, setEditValor] = useState("");
  const [editVencimento, setEditVencimento] = useState("");
  const [editAplicarATodas, setEditAplicarATodas] = useState(false);
  
  const [contaParaExcluir, setContaParaExcluir] = useState<any>(null);

  useEffect(() => { carregarContas(); }, []);

  async function carregarContas() {
    setCarregando(true);
    const { data } = await supabase
      .from('contas_a_pagar')
      .select('*')
      .order('pago', { ascending: true })
      .order('data_vencimento', { ascending: true });
    
    if (data) setContas(data);
    setCarregando(false);
  }

  async function adicionarConta(dados: { descricao: string, valor: number, vencimento: string, repetirMeses: number }) {
    const parcelas = [];
    const dataBase = new Date(dados.vencimento + "T12:00:00"); 
    const grupoId = dados.repetirMeses > 1 ? Date.now().toString() : null; 

    for (let i = 0; i < dados.repetirMeses; i++) {
      const dataVencimento = new Date(dataBase);
      dataVencimento.setMonth(dataBase.getMonth() + i);
      parcelas.push({
        descricao: dados.repetirMeses > 1 ? `${dados.descricao} (${i + 1}/${dados.repetirMeses})` : dados.descricao,
        valor: dados.valor,
        data_vencimento: dataVencimento.toISOString().split('T')[0],
        is_recorrente: dados.repetirMeses > 1,
        grupo_id: grupoId 
      });
    }

    const { error } = await supabase.from('contas_a_pagar').insert(parcelas);
    if (error) {
      alert("Erro ao salvar conta: " + error.message);
      throw error; 
    } else {
      carregarContas();
    }
  }

  function confirmarExclusao(conta: any) {
    if (conta.is_recorrente) setContaParaExcluir(conta); 
    else {
      if (window.confirm("Tem certeza que deseja excluir permanentemente esta conta?")) processarExclusao(conta.id, false);
    }
  }

  async function processarExclusao(id: string, excluirTodas: boolean, grupoId?: string, baseDescricao?: string) {
    if (excluirTodas) {
      if (grupoId) await supabase.from('contas_a_pagar').delete().eq('grupo_id', grupoId);
      else if (baseDescricao) {
        const base = baseDescricao.replace(/\s\(\d+\/\d+\)$/, '');
        await supabase.from('contas_a_pagar').delete().like('descricao', `${base}%`).eq('is_recorrente', true);
      }
    } else {
      await supabase.from('contas_a_pagar').delete().eq('id', id);
    }
    setContaParaExcluir(null);
    carregarContas();
  }

  function abrirEdicao(conta: any) {
    setContaEmEdicao(conta);
    setEditDescricao(conta.descricao);
    setEditValor(conta.valor.toString());
    setEditVencimento(conta.data_vencimento);
    setEditAplicarATodas(false);
  }

  async function salvarEdicao(e: React.FormEvent) {
    e.preventDefault();
    const valorTratado = converterValorSeguro(editValor);

    const { error } = await supabase.from('contas_a_pagar').update({
      descricao: editDescricao, 
      valor: valorTratado, 
      data_vencimento: editVencimento
    }).eq('id', contaEmEdicao.id);

    if (error) return alert("Erro ao atualizar: " + error.message);

    if (editAplicarATodas) {
      if (contaEmEdicao.grupo_id) {
        await supabase.from('contas_a_pagar').update({ valor: valorTratado }).eq('grupo_id', contaEmEdicao.grupo_id).neq('id', contaEmEdicao.id);
      } else {
        const base = contaEmEdicao.descricao.replace(/\s\(\d+\/\d+\)$/, '');
        await supabase.from('contas_a_pagar').update({ valor: valorTratado }).like('descricao', `${base}%`).eq('is_recorrente', true).neq('id', contaEmEdicao.id);
      }
    }
    setContaEmEdicao(null);
    carregarContas();
  }

  async function registrarPagamento(file: File | null, dataPgto: string) {
    if (!contaParaPagar) return;
    setSalvandoPgto(true);

    try {
      let urlFinal = contaParaPagar.comprovante_url;

      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `comprovante_${contaParaPagar.id}_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('comprovantes').upload(fileName, file);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('comprovantes').getPublicUrl(fileName);
        urlFinal = urlData.publicUrl;
      }

      const { error: dbError } = await supabase.from('contas_a_pagar').update({
        pago: true, 
        data_pagamento: dataPgto, 
        comprovante_url: urlFinal
      }).eq('id', contaParaPagar.id);

      if (dbError) throw dbError;
      
      setContaParaPagar(null);
      carregarContas();
    } catch (err: any) {
      alert("Erro no processo: " + err.message);
    } finally {
      setSalvandoPgto(false);
    }
  }

  async function desfazerPagamento(id: string) {
    if (!window.confirm("Tem certeza que deseja desfazer este pagamento? O comprovante será desvinculado.")) return;
    const { error } = await supabase.from('contas_a_pagar').update({ pago: false, data_pagamento: null, comprovante_url: null }).eq('id', id);
    if (error) alert("Erro ao desfazer pagamento: " + error.message);
    else carregarContas();
  }

  function obterStatus(conta: any) {
    if (conta.pago) return { texto: "Pago", corFundo: "#dcfce7", corTexto: "#166534" };
    const hoje = new Date().toISOString().split('T')[0];
    if (conta.data_vencimento < hoje) return { texto: "Pendente", corFundo: "#fee2e2", corTexto: "#991b1b" }; 
    return { texto: "A Vencer", corFundo: "#fef3c7", corTexto: "#92400e" }; 
  }

  return (
    <div className="py-2.5 md:py-[10px] font-sans">
      <header className="mb-6 md:mb-[30px]">
        <h1 className="text-[24px] md:text-[28px] font-[800] text-[#111827] m-0">💸 Contas a Pagar</h1>
        <p className="text-sm text-[#6b7280]">Gestão de saídas e fornecedores do ABC DO PARK</p>
      </header>

      <FormularioConta onSalvar={adicionarConta} />

      <section className="mt-8 md:mt-[40px]">
        <h3 className="mb-4 md:mb-[20px] text-[16px] md:text-[18px] text-[#111827] font-[700]">Histórico de Lançamentos</h3>
        <div className="flex flex-col gap-3 md:gap-[12px]">
          {carregando ? <p className="text-sm font-bold text-gray-400">Carregando contas...</p> : contas.map(conta => {
            const status = obterStatus(conta);
            return (
              <div key={conta.id} className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 md:p-[20px] bg-white rounded-xl md:rounded-[20px] border gap-4 md:gap-0" style={{ borderColor: conta.pago ? '#dcfce7' : '#f1f5f9' }}>
                
                <div className="flex items-start md:items-center gap-3 md:gap-[15px] w-full md:w-auto">
                  <div className="py-1.5 px-3 md:py-[6px] md:px-[12px] rounded-lg md:rounded-[8px] text-[10px] md:text-[12px] font-bold w-[70px] md:w-[80px] text-center shrink-0" style={{ backgroundColor: status.corFundo, color: status.corTexto }}>
                    {status.texto}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5 md:gap-[8px]">
                      <strong className="block text-[14px] md:text-[16px] text-[#111827]">{conta.descricao}</strong>
                      {conta.is_recorrente && <span className="text-[9px] md:text-[10px] bg-[#f3f4f6] text-[#4b5563] px-1.5 py-0.5 md:py-[2px] md:px-[6px] rounded md:rounded-[4px] font-bold">🔄 Recorrente</span>}
                    </div>
                    <span className="text-[11px] md:text-[13px] text-[#6b7280] block mt-0.5 md:mt-0">Vencimento: {new Date(conta.data_vencimento).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</span>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row items-end md:items-center gap-3 md:gap-[20px] w-full md:w-auto border-t md:border-t-0 pt-3 md:pt-0 border-gray-100">
                  <div className="text-right w-full md:w-auto flex flex-row md:flex-col justify-between md:justify-end items-center md:items-end">
                    <span className="text-[16px] md:text-[18px] font-[800] text-[#111827] block">R$ {conta.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    
                    {conta.pago ? (
                      <div className="flex flex-col items-end gap-1 md:gap-[5px] mt-1 md:mt-[5px]">
                        {conta.data_pagamento && (
                          <span className="text-[9px] md:text-[11px] text-[#64748b] font-[600]">
                            Pago em: {new Date(conta.data_pagamento + "T12:00:00").toLocaleDateString('pt-BR')}
                          </span>
                        )}
                        <div className="flex gap-2 md:gap-[10px] items-center">
                          <button onClick={() => setContaParaPagar(conta)} className="text-[10px] md:text-[12px] text-[#2563eb] font-bold bg-transparent border-none cursor-pointer p-0">Editar Pgto ⚙️</button>
                          <a href={conta.comprovante_url} target="_blank" rel="noreferrer" className="text-[10px] md:text-[12px] text-[#059669] font-bold no-underline">Ver Comprovante 📄</a>
                        </div>
                        <button onClick={() => desfazerPagamento(conta.id)} className="text-[9px] md:text-[11px] text-[#94a3b8] bg-transparent border-none cursor-pointer underline p-0 mt-0.5 md:mt-0">Desfazer pagamento</button>
                      </div>
                    ) : (
                      <button onClick={() => setContaParaPagar(conta)} className="mt-0 md:mt-[5px] px-3 py-1.5 md:py-[6px] md:px-[12px] rounded-lg md:rounded-[8px] border border-[#ef4444] text-[#ef4444] bg-transparent font-bold cursor-pointer text-[10px] md:text-[12px] w-auto">Registrar Pagamento</button>
                    )}
                  </div>
                  
                  <div className="flex flex-row md:flex-col gap-4 md:gap-[8px] md:border-l md:border-gray-200 md:pl-[15px] w-full md:w-auto justify-end mt-1 md:mt-0">
                    <button onClick={() => abrirEdicao(conta)} className="bg-transparent border-none cursor-pointer text-[14px] md:text-[16px] p-0" title="Editar Conta">✏️</button>
                    <button onClick={() => confirmarExclusao(conta)} className="bg-transparent border-none cursor-pointer text-[14px] md:text-[16px] p-0" title="Excluir Conta">🗑️</button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </section>

      {/* Trava Condicional de Segurança: Os modais só renderizam se houver dados injetados */}
      {contaEmEdicao && (
        <ModalEdicaoConta 
          aberto={!!contaEmEdicao} 
          contaEmEdicao={contaEmEdicao}
          editDescricao={editDescricao} setEditDescricao={setEditDescricao}
          editValor={editValor} setEditValor={setEditValor}
          editVencimento={editVencimento} setEditVencimento={setEditVencimento}
          editAplicarATodas={editAplicarATodas} setEditAplicarATodas={setEditAplicarATodas}
          onSalvar={salvarEdicao} onFechar={() => setContaEmEdicao(null)}
        />
      )}

      {contaParaExcluir && (
        <ModalExclusaoConta 
          aberto={!!contaParaExcluir} 
          contaParaExcluir={contaParaExcluir}
          onProcessarExclusao={processarExclusao} onFechar={() => setContaParaExcluir(null)}
        />
      )}

      {contaParaPagar && (
        <ModalConfirmarPagamento 
          aberto={!!contaParaPagar} 
          contaParaPagar={contaParaPagar}
          salvandoPgto={salvandoPgto} onRegistrarPagamento={registrarPagamento} onFechar={() => setContaParaPagar(null)}
        />
      )}
    </div>
  );
}

// ============================================================================
// 2. COMPONENTE: DESPESAS E SAÍDAS
// ============================================================================
function VisaoDespesasVariaveis({ userEmail, userCargo }: { userEmail: string | null, userCargo: string | null }) {
  const [mesFiltro, setMesFiltro] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
  const [listaGastosDetalhada, setListaGastosDetalhada] = useState<any[]>([]);
  const [totalDespesas, setTotalDespesas] = useState(0);
  const [carregando, setCarregando] = useState(true);

  const [modalGastoAberto, setModalGastoAberto] = useState(false);

  const [descGasto, setDescGasto] = useState("");
  const [valorGasto, setValorGasto] = useState("");
  const [dataGasto, setDataGasto] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => { 
    carregarDados(); 
  }, [mesFiltro]);

  async function carregarDados() {
    setCarregando(true);
    try {
      const [ano, mes] = mesFiltro.split('-');
      const dataInicio = `${ano}-${mes}-01`;
      
      const ultimoDiaObjeto = new Date(parseInt(ano), parseInt(mes), 0);
      const dataFim = `${ano}-${mes}-${String(ultimoDiaObjeto.getDate()).padStart(2, '0')}`;

      const { data: gastosMes } = await supabase.from('gastos').select('*').gte('data_gasto', dataInicio).lte('data_gasto', dataFim);
      const { data: contasPagasMes } = await supabase.from('contas_a_pagar').select('id, descricao, valor, data_pagamento').eq('pago', true).gte('data_pagamento', dataInicio).lte('data_pagamento', dataFim);

      const contasFormatadas = (contasPagasMes || []).map(account => ({
        id: account.id,
        descricao: `[Conta Fixa] ${account.descricao}`,
        valor: account.valor,
        data_gasto: account.data_pagamento,
        isContaFixa: true
      }));

      const todosGastos = [...(gastosMes || []), ...contasFormatadas];
      
      todosGastos.sort((a, b) => new Date(b.data_gasto).getTime() - new Date(a.data_gasto).getTime());
      
      setListaGastosDetalhada(todosGastos);

      const vGastos = todosGastos.reduce((acc, curr) => acc + (parseFloat(curr.valor) || 0), 0);
      setTotalDespesas(vGastos);
    } catch (err) {
      console.error("Erro ao carregar fluxo de saídas:", err);
    } finally {
      setCarregando(false);
    }
  }

  async function adicionarGasto() {
    if (userEmail !== 'carlamonaliza9@gmail.com' && userCargo !== 'Admin') {
      return alert("A direção não possui permissão para registrar novas despesas.");
    }

    if (!descGasto || !valorGasto) return alert("Preencha todos os campos.");

    const valorTratado = converterValorSeguro(valorGasto);

    const { error } = await supabase.from('gastos').insert([{ 
      descricao: descGasto, 
      valor: valorTratado, 
      data_gasto: dataGasto 
    }]);

    if (error) {
      alert("Erro ao salvar despesa: " + error.message);
    } else {
      setModalGastoAberto(false); 
      setDescGasto(""); 
      setValorGasto(""); 
      carregarDados();
    }
  }

  async function handleExcluirGasto(gasto: any) {
    if (gasto.isContaFixa) {
      return alert("Contas fixas consolidadas devem ser gerenciadas diretamente no painel modular de Contas a Pagar.");
    }
    
    if (userEmail !== 'carlamonaliza9@gmail.com') return alert("Apenas a Carla possui privilégios de exclusão de fluxo.");
    
    if (prompt("Senha Mestra para EXCLUIR GASTO:") === SENHA_MESTRA) {
       if(confirm("Confirmar exclusão definitiva deste registro de gasto?")) {
         await supabase.from('gastos').delete().eq('id', gasto.id);
         carregarDados();
       }
    } else { alert("Senha incorreta."); }
  }

  if (carregando) return <div className="p-10 text-center text-sm font-bold text-gray-400">Carregando fluxo de saídas...</div>;

  return (
    <div className="w-full">
      <div className="mb-4 md:mb-6 flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 m-0">💸 Livro Caixas de Saídas e Despesas</h1>
          <p className="text-[10px] md:text-sm text-gray-500 mt-1">Lançamento de despesas e conferência de custos e contas operacionais liquidadas</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto justify-end">
          <input 
            type="month" 
            value={mesFiltro} 
            onChange={(e) => setMesFiltro(e.target.value)} 
            className="w-full sm:w-auto p-3 md:p-3 bg-gray-100 rounded-xl font-bold border-none text-blue-900 outline-none text-sm md:text-base" 
          />
          <button
            onClick={() => {
              if (userEmail !== 'carlamonaliza9@gmail.com' && userCargo !== 'Admin') return alert("Ação restrita ao perfil de Administrador.");
              setModalGastoAberto(true);
            }}
            className="w-full sm:w-auto p-3 md:p-3 bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] md:text-sm rounded-xl shadow-sm transition-all"
          >
            + Lançar Nova Despesa
          </button>
        </div>
      </div>

      <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 mb-4 md:mb-6 flex items-center justify-between border-l-4 border-l-red-500">
        <div>
          <span className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider block">Total de Saídas Efetivadas</span>
          <h2 className="text-xl md:text-3xl font-black text-gray-900 mt-0.5 md:mt-1 m-0">R$ {totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
        </div>
        <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center text-lg md:text-xl font-bold">📉</div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 md:p-5 border-b border-gray-100 bg-gray-50/50">
          <h3 className="font-bold text-gray-800 text-xs md:text-sm uppercase tracking-wider m-0">Histórico Detalhado do Período</h3>
        </div>
        
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse block md:table">
            <thead className="hidden md:table-header-group">
              <tr className="bg-gray-100 text-gray-600 text-xs font-bold uppercase tracking-wider">
                <th className="p-4">Data</th>
                <th className="p-4">Descrição da Despesa</th>
                <th className="p-4 text-right">Valor Retirado</th>
                <th className="p-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="block md:table-row-group divide-y divide-gray-100 text-sm">
              {listaGastosDetalhada.length > 0 ? (
                listaGastosDetalhada.map((gasto) => (
                  <tr key={gasto.id} className="block md:table-row hover:bg-gray-50/80 transition-colors p-3 md:p-0 border-b border-slate-100 md:border-none">
                    <td className="block md:table-cell p-2 md:p-4 font-medium text-gray-500 text-[11px] md:text-sm">
                      <span className="md:hidden text-[9px] uppercase font-bold text-gray-400 block mb-0.5">Data</span>
                      {new Date(gasto.data_gasto + "T12:00:00").toLocaleDateString('pt-BR')}
                    </td>
                    <td className="block md:table-cell p-2 md:p-4 font-bold text-gray-900 uppercase text-[11px] md:text-sm">
                      <span className="md:hidden text-[9px] uppercase font-bold text-gray-400 block mb-0.5">Descrição</span>
                      {gasto.descricao}
                    </td>
                    <td className="block md:table-cell p-2 md:p-4 md:text-right font-black text-red-600 text-xs md:text-sm">
                      <span className="md:hidden text-[9px] uppercase font-bold text-gray-400 block mb-0.5">Valor Retirado</span>
                      R$ {parseFloat(gasto.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="block md:table-cell p-2 md:p-4 text-left md:text-center mt-2 md:mt-0">
                      <button
                        onClick={() => handleExcluirGasto(gasto)}
                        disabled={gasto.isContaFixa}
                        className={`px-3 py-2 md:py-1.5 rounded-lg font-bold text-[10px] md:text-xs transition-all ${
                          gasto.isContaFixa 
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                            : "bg-red-50 text-red-600 hover:bg-red-100"
                        }`}
                      >
                        {gasto.isContaFixa ? "🔒 Retido" : "🗑️ Excluir"}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="block md:table-row">
                  <td colSpan={4} className="block md:table-cell p-6 md:p-8 text-center text-gray-400 italic text-[11px] md:text-sm border-b-0">
                    Nenhuma saída financeira registrada para este mês de referência.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ModalGasto 
        aberto={modalGastoAberto} onFechar={() => setModalGastoAberto(false)}
        dataGasto={dataGasto} setDataGasto={setDataGasto} descGasto={descGasto} setDescGasto={setDescGasto}
        valorGasto={valorGasto} setValorGasto={setValorGasto} onAdicionar={adicionarGasto}
      />
    </div>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL MESTRE
// ============================================================================
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

  if (verificandoAcesso) return <div className="p-10 text-center font-black uppercase text-slate-300 tracking-widest text-[11px] md:text-sm animate-pulse">Verificando Credenciais...</div>;

  return (
    <div className="w-full bg-[#f8fafc] min-h-screen font-sans antialiased text-slate-800 pb-24 md:p-6 lg:p-8 flex flex-col">
      <div className="max-w-[1700px] w-full mx-auto mb-4 md:mb-6 px-3 md:px-4">
        <div className="flex bg-slate-200/60 p-1 md:p-1.5 rounded-xl md:rounded-2xl w-full sm:w-fit overflow-x-auto custom-scrollbar border border-slate-300/40">
          <button
            onClick={() => setVisaoAtiva("contas")}
            className={`flex-1 sm:flex-none px-4 md:px-6 py-2 md:py-2.5 rounded-lg md:rounded-xl text-[11px] md:text-sm font-bold transition-all whitespace-nowrap ${visaoAtiva === "contas" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            📅 Contas a Pagar
          </button>
          <button
            onClick={() => setVisaoAtiva("despesas")}
            className={`flex-1 sm:flex-none px-4 md:px-6 py-2 md:py-2.5 rounded-lg md:rounded-xl text-[11px] md:text-sm font-bold transition-all whitespace-nowrap ${visaoAtiva === "despesas" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            📉 Despesas e Saídas
          </button>
        </div>
      </div>

      <div className="max-w-[1700px] w-full mx-auto px-2 md:px-4 flex-1">
        {visaoAtiva === "contas" ? (
          <VisaoContasAPagar userEmail={userEmail} userCargo={userCargo} />
        ) : (
          <VisaoDespesasVariaveis userEmail={userEmail} userCargo={userCargo} />
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { height: 4px; width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}} />
    </div>
  );
}