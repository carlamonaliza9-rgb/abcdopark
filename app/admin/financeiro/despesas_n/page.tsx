"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

// Importação dos Modais Modularizados da pasta global de componentes
import { ModalGasto } from "@/app/dashboard/financeiro/_components/ModalGasto";

export default function DespesasFinanceiroPage() {
  const router = useRouter();
  const [verificandoAcesso, setVerificandoAcesso] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userCargo, setUserCargo] = useState<string | null>(null);

  // --- ESTADOS DE DADOS ---
  const [mesFiltro, setMesFiltro] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
  const [listaGastosDetalhada, setListaGastosDetalhada] = useState<any[]>([]);
  const [totalDespesas, setTotalDespesas] = useState(0);
  const [carregando, setCarregando] = useState(true);

  // --- ESTADOS DE CONTROLE DE MODAL ---
  const [modalGastoAberto, setModalGastoAberto] = useState(false);

  // --- ESTADOS DE FORMULÁRIO DE GASTOS ---
  const [descGasto, setDescGasto] = useState("");
  const [valorGasto, setValorGasto] = useState("");
  const [dataGasto, setDataGasto] = useState(new Date().toISOString().split('T')[0]);

  const SENHA_MESTRA = "1234";

  // --- TRAVA DE SEGURANÇA ---
  useEffect(() => {
    async function verificarAcesso() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");

      const emailAtual = user.email || "";
      setUserEmail(emailAtual);
      const { data: perfil } = await supabase.from('perfis').select('cargo').eq('id', user.id).single();
      setUserCargo(perfil?.cargo || null);

      const ehAuthorized = 
        emailAtual === 'carlamonaliza9@gmail.com' || 
        emailAtual === 'diretoria@abcdopark.com' || 
        perfil?.cargo === 'Admin' ||
        perfil?.cargo === 'Direção';

      if (!ehAuthorized) {
        return router.push("/dashboard");
      }
      setVerificandoAcesso(false);
    }
    verificarAcesso();
  }, [router]);

  async function carregarDados() {
    setCarregando(true);
    try {
      const [ano, mes] = mesFiltro.split('-');
      const dataInicio = `${ano}-${mes}-01`;
      
      const ultimoDiaObjeto = new Date(parseInt(ano), parseInt(mes), 0);
      const dataFim = `${ano}-${mes}-${String(ultimoDiaObjeto.getDate()).padStart(2, '0')}`;

      // Busca gastos variáveis e contas a pagar consolidadas no mês corrente
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
      
      // Ordena por data de forma decrescente (mais recentes primeiro)
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

  useEffect(() => { 
    if (!verificandoAcesso) carregarDados(); 
  }, [mesFiltro, verificandoAcesso]);

  // --- CADASTRO DE DESPESAS DIÁRIAS ---
  async function adicionarGasto() {
    if (userEmail !== 'carlamonaliza9@gmail.com' && userCargo !== 'Admin') {
      return alert("A direção não possui permissão para registrar novas despesas.");
    }

    if (!descGasto || !valorGasto) return alert("Preencha todos os campos.");

    const { error } = await supabase.from('gastos').insert([{ 
      descricao: descGasto, 
      valor: parseFloat(valorGasto), 
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

  // --- EXCLUSÃO EXCLUSIVA DA DIRETORA MESTRA ---
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

  if (verificandoAcesso || carregando) return <div className="p-10 text-center">Carregando fluxo de saídas...</div>;

  return (
    <div className="w-full bg-gray-50 min-h-screen">
      
      {/* Cabeçalho de Controle Operacional */}
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

      {/* Card Informativo do Total Gasto no Mês */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6 flex items-center justify-between border-l-4 border-l-red-500">
        <div>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total de Saídas Efetivadas</span>
          <h2 className="text-3xl font-black text-gray-900 mt-1">R$ {totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
        </div>
        <div className="h-12 w-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center text-xl font-bold">📉</div>
      </div>

      {/* Listagem em Tempo Real direto na página */}
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

      {/* MODAL DE INCLUSÃO COMPLEMENTAR */}
      <ModalGasto 
        aberto={modalGastoAberto} onFechar={() => setModalGastoAberto(false)}
        dataGasto={dataGasto} setDataGasto={setDataGasto} descGasto={descGasto} setDescGasto={setDescGasto}
        valorGasto={valorGasto} setValorGasto={setValorGasto} onAdicionar={adicionarGasto}
      />

    </div>
  );
}