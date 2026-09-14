import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { converterValorSeguro } from "../_utils/financeUtils";

const SENHA_MESTRA = "1234";

export function useDespesasVariaveis(userEmail: string | null, userCargo: string | null) {
  const [mesFiltro, setMesFiltro] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
  const [listaGastosDetalhada, setListaGastosDetalhada] = useState<any[]>([]);
  const [totalDespesas, setTotalDespesas] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState(false);

  const [modalGastoAberto, setModalGastoAberto] = useState(false);
  const [descGasto, setDescGasto] = useState("");
  const [valorGasto, setValorGasto] = useState("");
  const [dataGasto, setDataGasto] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => { carregarDados(); }, [mesFiltro]);

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
    if (processando) return;
    if (userEmail !== 'carlamonaliza9@gmail.com' && userCargo !== 'Admin') {
      return alert("A direção não possui permissão para registrar novas despesas.");
    }

    if (!descGasto || !valorGasto) return alert("Preencha todos os campos.");

    setProcessando(true);
    try {
      const valorTratado = converterValorSeguro(valorGasto);
      const { error } = await supabase.from('gastos').insert([{ 
        descricao: descGasto, 
        valor: valorTratado, 
        data_gasto: dataGasto 
      }]);

      if (error) throw error;

      setModalGastoAberto(false); 
      setDescGasto(""); 
      setValorGasto(""); 
      await carregarDados();
    } catch (err: any) {
      alert("Erro ao salvar despesa: " + err.message);
    } finally {
      setProcessando(false);
    }
  }

  async function handleExcluirGasto(gasto: any) {
    if (gasto.isContaFixa) {
      return alert("Contas fixas consolidadas devem ser gerenciadas diretamente no painel modular de Contas a Pagar.");
    }
    if (userEmail !== 'carlamonaliza9@gmail.com') return alert("Apenas a Carla possui privilégios de exclusão de fluxo.");
    if (processando) return;

    if (prompt("Senha Mestra para EXCLUIR GASTO:") === SENHA_MESTRA) {
       if (confirm("Confirmar exclusão definitiva deste registro de gasto?")) {
         setProcessando(true);
         try {
           await supabase.from('gastos').delete().eq('id', gasto.id);
           await carregarDados();
         } catch (err: any) {
           alert("Erro ao excluir: " + err.message);
         } finally {
           setProcessando(false);
         }
       }
    } else { 
      alert("Senha incorreta."); 
    }
  }

  return {
    mesFiltro, setMesFiltro, listaGastosDetalhada, totalDespesas, carregando, modalGastoAberto,
    setModalGastoAberto, descGasto, setDescGasto, valorGasto, setValorGasto, dataGasto,
    setDataGasto, adicionarGasto, handleExcluirGasto
  };
}