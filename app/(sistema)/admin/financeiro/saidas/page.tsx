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
    <div style={{ padding: '10px 0', fontFamily: 'sans-serif' }}>
      <header style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#111827', margin: 0 }}>💸 Contas a Pagar</h1>
        <p style={{ color: '#6b7280' }}>Gestão de saídas e fornecedores do ABC DO PARK</p>
      </header>

      <FormularioConta onSalvar={adicionarConta} />

      <section style={{ marginTop: '40px' }}>
        <h3 style={{ marginBottom: '20px', fontSize: '18px', color: '#111827', fontWeight: '700' }}>Histórico de Lançamentos</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {carregando ? <p>Carregando contas...</p> : contas.map(conta => {
            const status = obterStatus(conta);
            return (
              <div key={conta.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', backgroundColor: 'white', borderRadius: '20px', border: `1px solid ${conta.pago ? '#dcfce7' : '#f1f5f9'}` }}>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ backgroundColor: status.corFundo, color: status.corTexto, padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', width: '80px', textAlign: 'center' }}>
                    {status.texto}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ display: 'block', fontSize: '16px', color: '#111827' }}>{conta.descricao}</strong>
                      {conta.is_recorrente && <span style={{ fontSize: '10px', backgroundColor: '#f3f4f6', color: '#4b5563', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>🔄 Recorrente</span>}
                    </div>
                    <span style={{ fontSize: '13px', color: '#6b7280' }}>Vencimento: {new Date(conta.data_vencimento).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '18px', fontWeight: '800', color: '#111827', display: 'block' }}>R$ {conta.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    
                    {conta.pago ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px', marginTop: '5px' }}>
                        {conta.data_pagamento && (
                          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
                            Pago em: {new Date(conta.data_pagamento + "T12:00:00").toLocaleDateString('pt-BR')}
                          </span>
                        )}
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <button onClick={() => setContaParaPagar(conta)} style={{ fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Editar Pgto ⚙️</button>
                          <a href={conta.comprovante_url} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: '#059669', fontWeight: 'bold', textDecoration: 'none' }}>Ver Comprovante 📄</a>
                        </div>
                        <button onClick={() => desfazerPagamento(conta.id)} style={{ fontSize: '11px', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Desfazer pagamento</button>
                      </div>
                    ) : (
                      <button onClick={() => setContaParaPagar(conta)} style={{ marginTop: '5px', padding: '6px 12px', borderRadius: '8px', border: '1px solid #ef4444', color: '#ef4444', backgroundColor: 'transparent', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>Registrar Pagamento</button>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '1px solid #e5e7eb', paddingLeft: '15px' }}>
                    <button onClick={() => abrirEdicao(conta)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} title="Editar Conta">✏️</button>
                    <button onClick={() => confirmarExclusao(conta)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} title="Excluir Conta">🗑️</button>
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

  if (carregando) return <div className="p-10 text-center">Carregando fluxo de saídas...</div>;

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">💸 Livro Caixas de Saídas e Despesas</h1>
          <p className="text-sm text-gray-500 mt-1">Lançamento de despesas e conferência de custos e contas operacionais liquidadas</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <input 
            type="month" 
            value={mesFiltro} 
            onChange={(e) => setMesFiltro(e.target.value)} 
            className="p-3 bg-gray-100 rounded-xl font-bold border-none text-blue-900 outline-none" 
          />
          <button
            onClick={() => {
              if (userEmail !== 'carlamonaliza9@gmail.com' && userCargo !== 'Admin') return alert("Ação restrita ao perfil de Administrador.");
              setModalGastoAberto(true);
            }}
            className="p-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-sm transition-all"
          >
            + Lançar Nova Despesa
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6 flex items-center justify-between border-l-4 border-l-red-500">
        <div>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total de Saídas Efetivadas</span>
          <h2 className="text-3xl font-black text-gray-900 mt-1">R$ {totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
        </div>
        <div className="h-12 w-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center text-xl font-bold">📉</div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-gray-50/50">
          <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider">Histórico Detalhado do Período</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-600 text-xs font-bold uppercase tracking-wider">
                <th className="p-4">Data</th>
                <th className="p-4">Descrição da Despesa</th>
                <th className="p-4 text-right">Valor Retirado</th>
                <th className="p-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {listaGastosDetalhada.length > 0 ? (
                listaGastosDetalhada.map((gasto) => (
                  <tr key={gasto.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="p-4 font-medium text-gray-500">
                      {new Date(gasto.data_gasto + "T12:00:00").toLocaleDateString('pt-BR')}
                    </td>
                    <td className="p-4 font-bold text-gray-900 uppercase">
                      {gasto.descricao}
                    </td>
                    <td className="p-4 text-right font-black text-red-600">
                      R$ {parseFloat(gasto.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleExcluirGasto(gasto)}
                        disabled={gasto.isContaFixa}
                        className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
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
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-400 italic">
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

  if (verificandoAcesso) return <div className="p-10 text-center font-black uppercase text-slate-300 tracking-widest animate-pulse">Verificando Credenciais...</div>;

  return (
    <div className="w-full bg-[#f8fafc] min-h-screen font-sans antialiased text-slate-800 pb-24 md:p-6 lg:p-8 flex flex-col">
      <div className="max-w-[1700px] w-full mx-auto mb-6 px-4">
        <div className="flex bg-slate-200/60 p-1.5 rounded-2xl w-fit border border-slate-300/40">
          <button
            onClick={() => setVisaoAtiva("contas")}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${visaoAtiva === "contas" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            📅 Contas a Pagar
          </button>
          <button
            onClick={() => setVisaoAtiva("despesas")}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${visaoAtiva === "despesas" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
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
    </div>
  );
}