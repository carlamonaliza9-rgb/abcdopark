import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { converterValorSeguro } from "../_utils/financeUtils";

export function useContasAPagar() {
  const [contas, setContas] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState(false);
  
  const [contaParaPagar, setContaParaPagar] = useState<any>(null);
  const [contaEmEdicao, setContaEmEdicao] = useState<any>(null);
  const [contaParaExcluir, setContaParaExcluir] = useState<any>(null);

  const [editDescricao, setEditDescricao] = useState("");
  const [editValor, setEditValor] = useState("");
  const [editVencimento, setEditVencimento] = useState("");
  const [editAplicarATodas, setEditAplicarATodas] = useState(false);

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
    if (processando) return;
    setProcessando(true);
    try {
      const parcelas = [];
      const dataBase = new Date(dados.vencimento + "T12:00:00"); 
      const grupoId = dados.repetirMeses > 1 ? Date.now().toString() : null; 

      for (let i = 0; i < dados.repetirMeses; i++) {
        const dataVencimento = new Date(dataBase);
        dataVencimento.setMonth(dataBase.getMonth() + i);
        parcelas.push({
          descricao: dados.repetirMeses > 1 ? `${dados.descricao} (${i + 1}/${dados.repetirMeses})` : dados.descricao,
          valor: converterValorSeguro(dados.valor),
          data_vencimento: dataVencimento.toISOString().split('T')[0],
          is_recorrente: dados.repetirMeses > 1,
          grupo_id: grupoId 
        });
      }

      const { error } = await supabase.from('contas_a_pagar').insert(parcelas);
      if (error) throw error;
      await carregarContas();
    } catch (err: any) {
      alert("Erro ao salvar conta: " + err.message);
    } finally {
      setProcessando(false);
    }
  }

  async function processarExclusao(id: string, excluirTodas: boolean, grupoId?: string, baseDescricao?: string) {
    if (processando) return;
    setProcessando(true);
    try {
      if (excluirTodas) {
        if (grupoId) {
          await supabase.from('contas_a_pagar').delete().eq('grupo_id', grupoId);
        } else if (baseDescricao) {
          const base = baseDescricao.replace(/\s\(\d+\/\d+\)$/, '');
          await supabase.from('contas_a_pagar').delete().like('descricao', `${base}%`).eq('is_recorrente', true);
        }
      } else {
        await supabase.from('contas_a_pagar').delete().eq('id', id);
      }
      setContaParaExcluir(null);
      await carregarContas();
    } catch (err: any) {
      alert("Erro ao excluir: " + err.message);
    } finally {
      setProcessando(false);
    }
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
    if (processando) return;
    setProcessando(true);

    try {
      const valorTratado = converterValorSeguro(editValor);
      const { error } = await supabase.from('contas_a_pagar').update({
        descricao: editDescricao, 
        valor: valorTratado, 
        data_vencimento: editVencimento
      }).eq('id', contaEmEdicao.id);

      if (error) throw error;

      if (editAplicarATodas) {
        if (contaEmEdicao.grupo_id) {
          await supabase.from('contas_a_pagar').update({ valor: valorTratado }).eq('grupo_id', contaEmEdicao.grupo_id).neq('id', contaEmEdicao.id);
        } else {
          const base = contaEmEdicao.descricao.replace(/\s\(\d+\/\d+\)$/, '');
          await supabase.from('contas_a_pagar').update({ valor: valorTratado }).like('descricao', `${base}%`).eq('is_recorrente', true).neq('id', contaEmEdicao.id);
        }
      }
      setContaEmEdicao(null);
      await carregarContas();
    } catch (err: any) {
      alert("Erro ao atualizar: " + err.message);
    } finally {
      setProcessando(false);
    }
  }

  async function registrarPagamento(file: File | null, dataPgto: string) {
    if (!contaParaPagar || processando) return;
    setProcessando(true);

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
      await carregarContas();
    } catch (err: any) {
      alert("Erro no processo de pagamento: " + err.message);
    } finally {
      setProcessando(false);
    }
  }

  async function desfazerPagamento(id: string) {
    if (processando) return;
    if (!window.confirm("Tem certeza que deseja desfazer este pagamento? O comprovante será desvinculado.")) return;
    
    setProcessando(true);
    try {
      const { error } = await supabase.from('contas_a_pagar').update({ pago: false, data_pagamento: null, comprovante_url: null }).eq('id', id);
      if (error) throw error;
      await carregarContas();
    } catch (err: any) {
      alert("Erro ao desfazer: " + err.message);
    } finally {
      setProcessando(false);
    }
  }

  return {
    contas, carregando, processando, contaParaPagar, setContaParaPagar, contaEmEdicao, setContaEmEdicao,
    contaParaExcluir, setContaParaExcluir, editDescricao, setEditDescricao, editValor, setEditValor,
    editVencimento, setEditVencimento, editAplicarATodas, setEditAplicarATodas, adicionarConta,
    processarExclusao, abrirEdicao, salvarEdicao, registrarPagamento, desfazerPagamento
  };
}