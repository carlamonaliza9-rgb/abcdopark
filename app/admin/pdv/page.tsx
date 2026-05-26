"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

// Auxiliar de conversão
const clean = (val: any) => parseFloat(String(val).replace(/\./g, '').replace(',', '.') || "0") || 0;

export default function PDVPage() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  
  // Dados Globais
  const [alunos, setAlunos] = useState<any[]>([]);
  const [historicoGeral, setHistoricoGeral] = useState<any[]>([]);
  
  // Estados do PDV
  const [buscaAluno, setBuscaAluno] = useState("");
  const [alunoSelecionado, setAlunoSelecionado] = useState<any>(null);
  const [dividasAluno, setDividasAluno] = useState<any[]>([]);
  const [carrinho, setCarrinho] = useState<any[]>([]);
  
  // Estados de Nova Venda Avulsa
  const [novoItem, setNovoItem] = useState({ tipo: 'uniforme', descricao: '', valor: '' });
  
  // Fechamento e Pagamento
  const [pagamentos, setPagamentos] = useState({ pix: "", dinheiro: "", credito: "", debito: "", boleto: "", credito_aluno: "", pix_editora: "", credito_editora: "", debito_editora: "", parcelas: "1" });
  const [acrescimos, setAcrescimos] = useState({ multa: "", desconto: "" });
  const [processando, setProcessando] = useState(false);
  
  // Estado para controlar o destino do troco
  const [acaoTroco, setAcaoTroco] = useState<'credito' | 'devolver'>('credito');

  useEffect(() => {
    carregarDadosBase();
  }, []);

  async function carregarDadosBase() {
    setCarregando(true);
    const { data: listaAlunos } = await supabase.from('alunos').select('*').order('nome');
    const { data: historico } = await supabase.from('historico_pagamentos').select('*').in('status', ['pendente', 'parcial', 'atrasado']);
    
    if (listaAlunos) setAlunos(listaAlunos);
    if (historico) setHistoricoGeral(historico);
    setCarregando(false);
  }

  // Efeito ao selecionar um aluno: Puxar dívidas dele e resetar o caixa
  useEffect(() => {
    if (alunoSelecionado) {
      const pendencias = historicoGeral.filter(h => h.aluno_id === alunoSelecionado.id);
      setDividasAluno(pendencias);
      setCarrinho([]); 
      setPagamentos({ pix: "", dinheiro: "", credito: "", debito: "", boleto: "", credito_aluno: "", pix_editora: "", credito_editora: "", debito_editora: "", parcelas: "1" });
      setAcrescimos({ multa: "", desconto: "" });
      setAcaoTroco('credito'); // Reseta a ação do troco
    } else {
      setDividasAluno([]);
      setCarrinho([]);
    }
  }, [alunoSelecionado, historicoGeral]);

  const adicionarAoCarrinho = (item: any) => {
    if (!carrinho.find(c => c.id === item.id)) {
      setCarrinho([...carrinho, item]);
    }
  };

  const removerDoCarrinho = (id: string) => {
    setCarrinho(carrinho.filter(c => c.id !== id));
  };

  const lancarItemAvulsoNoCarrinho = () => {
    if (!novoItem.descricao || !novoItem.valor) return alert("Preencha descrição e valor do item.");
    
    const itemTemp = {
      id: `novo_${Date.now()}`,
      tipo: novoItem.tipo,
      descricao: novoItem.descricao,
      valor_total: clean(novoItem.valor),
      valor_pago: 0,
      status: 'pendente',
      isNovo: true 
    };
    
    setCarrinho([...carrinho, itemTemp]);
    setNovoItem({ tipo: 'uniforme', descricao: '', valor: '' });
  };

  // Cálculos do PDV
  const subtotalCarrinho = carrinho.reduce((acc, item) => acc + (clean(item.valor_total) - clean(item.valor_pago)), 0);
  const totalComAcrescimos = Math.max(0, subtotalCarrinho + clean(acrescimos.multa) - clean(acrescimos.desconto));
  
  const somaDinheiroEntrante = clean(pagamentos.pix) + clean(pagamentos.dinheiro) + clean(pagamentos.credito) + clean(pagamentos.debito) + clean(pagamentos.boleto) + clean(pagamentos.pix_editora) + clean(pagamentos.credito_editora) + clean(pagamentos.debito_editora);
  const creditoUtilizado = clean(pagamentos.credito_aluno);
  const totalPagoRodada = somaDinheiroEntrante + creditoUtilizado;
  
  const faltaPagar = Math.max(0, totalComAcrescimos - totalPagoRodada);
  const trocoGerado = totalPagoRodada > totalComAcrescimos ? totalPagoRodada - totalComAcrescimos : 0;
  const saldoAtualAluno = alunoSelecionado ? clean(alunoSelecionado.saldo_credito) : 0;

  const finalizarVenda = async () => {
    if (carrinho.length === 0) return alert("O carrinho está vazio.");
    if (totalPagoRodada <= 0 && clean(acrescimos.desconto) <= 0 && carrinho.every(i => !i.isNovo)) return alert("Insira os valores de pagamento.");
    if (creditoUtilizado > saldoAtualAluno) return alert("Crédito do aluno insuficiente.");

    setProcessando(true);
    try {
      const dataHoje = new Date().toISOString().split('T')[0];
      let saldoParaDistribuir = totalPagoRodada + clean(acrescimos.desconto) - clean(acrescimos.multa);

      // Desconta o valor do troco se ele for ser devolvido ao cliente (não abate nas dívidas)
      if (trocoGerado > 0 && acaoTroco === 'devolver') {
         saldoParaDistribuir -= trocoGerado;
      }

      for (const item of carrinho) {
        const restanteDestaDivida = clean(item.valor_total) - clean(item.valor_pago);
        const valorAbatido = Math.max(0, Math.min(restanteDestaDivida, saldoParaDistribuir));
        saldoParaDistribuir -= valorAbatido;

        const novoValorPago = clean(item.valor_pago) + valorAbatido;
        
        let novoStatus = 'pendente';
        if (novoValorPago >= clean(item.valor_total)) {
            novoStatus = 'pago';
        } else if (novoValorPago > 0) {
            novoStatus = 'parcial';
        }

        // Se o item for antigo e não recebeu nenhum abatimento nesta transação, pula para não fazer query inútil
        if (valorAbatido === 0 && !item.isNovo && clean(acrescimos.desconto) === 0 && clean(acrescimos.multa) === 0) {
            continue;
        }

        const formasStrArray = [];
        if (clean(pagamentos.pix) > 0) formasStrArray.push("Pix");
        if (clean(pagamentos.dinheiro) > 0) formasStrArray.push("Dinheiro");
        if (clean(pagamentos.credito) > 0) formasStrArray.push("Cartão de Crédito");
        if (clean(pagamentos.debito) > 0) formasStrArray.push("Cartão de Débito");
        if (creditoUtilizado > 0) formasStrArray.push("Crédito Retido");
        
        const registroParcial = {
          data_recebimento: dataHoje,
          valor_pago_rodada: valorAbatido,
          formas: formasStrArray.length > 0 ? formasStrArray.join(" + ") : "Ajuste/Avulso",
          desconto: acrescimos.desconto,
          multa: acrescimos.multa
        };

        const historicoAntigo = Array.isArray(item.detalhes_metodos?.historico_parciais) ? item.detalhes_metodos.historico_parciais : [];
        const historico_parciais = valorAbatido > 0 || clean(acrescimos.desconto) > 0 
            ? [...historicoAntigo, registroParcial] 
            : historicoAntigo;

        const payloadMetodos = { ...pagamentos, historico_parciais };

        if (item.isNovo) {
          await supabase.from('historico_pagamentos').insert({
            aluno_id: alunoSelecionado.id,
            tipo: item.tipo,
            descricao: item.descricao,
            mes_referencia: 'Avulso',
            valor_total: item.valor_total,
            valor_pago: novoValorPago,
            status: novoStatus,
            data_pagamento: dataHoje,
            detalhes_metodos: payloadMetodos
          });
        } else {
          await supabase.from('historico_pagamentos').update({ 
            status: novoStatus, 
            valor_pago: novoValorPago,
            data_pagamento: novoStatus === 'pago' ? dataHoje : item.data_pagamento, 
            detalhes_metodos: payloadMetodos 
          }).eq('id', item.id);
        }
      }

      // Atualiza a conta corrente do aluno (Abate crédito usado + Adiciona Troco apenas se escolhido)
      const trocoParaAdicionar = acaoTroco === 'credito' ? trocoGerado : 0;
      
      if (creditoUtilizado > 0 || trocoParaAdicionar > 0) {
        const novoSaldo = saldoAtualAluno - creditoUtilizado + trocoParaAdicionar;
        await supabase.from('alunos').update({ saldo_credito: novoSaldo }).eq('id', alunoSelecionado.id);
      }

      alert("Transação finalizada com sucesso!");
      setAlunoSelecionado(null);
      await carregarDadosBase();

    } catch (error: any) {
      alert("Erro ao finalizar: " + error.message);
    } finally {
      setProcessando(false);
    }
  };

  const alunosFiltrados = buscaAluno === "" 
    ? alunos.slice(0, 5) 
    : alunos.filter(a => a.nome.toLowerCase().includes(buscaAluno.toLowerCase())).slice(0, 5);

  if (carregando) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <div className="text-slate-500 font-medium tracking-wide animate-pulse">Iniciando Terminal PDV...</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 font-sans text-slate-800 pb-24 selection:bg-indigo-100 selection:text-indigo-900">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Cabeçalho */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60 flex justify-between items-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
          <div className="flex items-center gap-4">
            <div className="bg-indigo-50 p-3 rounded-xl">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Terminal de Caixa</h1>
              <p className="text-sm text-slate-500 mt-0.5">Central Unificada de Recebimentos e Vendas</p>
            </div>
          </div>
          <button 
            onClick={() => router.push('/admin/dashboard')} 
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 font-medium text-sm rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Voltar
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 md:gap-8">
          
          {/* COLUNA ESQUERDA: Identificação e Lançamentos */}
          <div className="xl:col-span-7 space-y-6">
            
            {/* Bloco 1: Seleção de Aluno */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60">
              <h2 className="text-sm font-bold text-slate-800 mb-5 flex items-center gap-2.5 uppercase tracking-wide">
                <span className="bg-slate-100 text-slate-600 w-7 h-7 rounded-lg flex items-center justify-center text-xs border border-slate-200">1</span> 
                Identificação do Cliente
              </h2>
              
              {!alunoSelecionado ? (
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </div>
                  <input 
                    type="text" 
                    placeholder="Buscar aluno por nome..." 
                    value={buscaAluno} 
                    onChange={(e) => setBuscaAluno(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all shadow-sm"
                  />
                  {buscaAluno && (
                    <div className="absolute z-10 w-full mt-2 border border-slate-200 rounded-xl overflow-hidden shadow-xl bg-white">
                      {alunosFiltrados.map(a => (
                        <div key={a.id} onClick={() => setAlunoSelecionado(a)} className="p-3.5 border-b border-slate-50 hover:bg-indigo-50 cursor-pointer transition-colors flex justify-between items-center group">
                          <span className="font-medium text-sm text-slate-700 group-hover:text-indigo-700">{a.nome}</span>
                          <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md">{a.turma}</span>
                        </div>
                      ))}
                      {alunosFiltrados.length === 0 && (
                         <div className="p-6 text-center text-sm text-slate-500">Nenhum aluno encontrado para "<span className="font-medium text-slate-700">{buscaAluno}</span>"</div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex justify-between items-center bg-gradient-to-r from-indigo-50 to-blue-50/30 p-5 rounded-xl border border-indigo-100 shadow-inner">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-white text-indigo-600 rounded-xl shadow-sm border border-indigo-100 flex items-center justify-center text-xl font-bold">
                      {alunoSelecionado.nome.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">{alunoSelecionado.nome}</h3>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-md flex items-center gap-1 border border-emerald-200/50">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          Saldo: R$ {saldoAtualAluno.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setAlunoSelecionado(null)} 
                    className="text-xs bg-white border border-slate-200 text-slate-600 font-semibold px-4 py-2.5 rounded-lg hover:bg-slate-50 hover:text-rose-600 transition-colors shadow-sm"
                  >
                    Trocar Cliente
                  </button>
                </div>
              )}
            </div>

            {/* Bloco 2: Dívidas em Aberto */}
            {alunoSelecionado && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4">
                 <h2 className="text-sm font-bold text-slate-800 mb-5 flex items-center gap-2.5 uppercase tracking-wide">
                  <span className="bg-rose-100 text-rose-700 w-7 h-7 rounded-lg flex items-center justify-center text-xs border border-rose-200">2</span> 
                  Dívidas em Aberto
                </h2>
                <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                  {dividasAluno.length > 0 ? dividasAluno.map(div => {
                    const devedor = clean(div.valor_total) - clean(div.valor_pago);
                    const noCarrinho = carrinho.find(c => c.id === div.id);
                    if (devedor <= 0) return null;
                    
                    return (
                      <div key={div.id} className={`p-4 rounded-xl border flex justify-between items-center transition-all duration-200 hover:-translate-y-0.5 ${noCarrinho ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md'}`}>
                        <div>
                          <span className="block text-sm font-bold text-slate-800">{div.descricao}</span>
                          <span className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            Venceu em: {new Date(div.data_pagamento).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-bold text-rose-600">R$ {devedor.toFixed(2)}</span>
                          <button 
                            onClick={() => noCarrinho ? removerDoCarrinho(div.id) : adicionarAoCarrinho(div)}
                            className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-medium transition-all ${noCarrinho ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 hover:bg-indigo-700' : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                          >
                            {noCarrinho ? (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="flex flex-col items-center justify-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      </div>
                      <p className="text-sm text-slate-500 font-medium">O aluno não possui pendências.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Bloco 3: Lançamento Avulso Rápido */}
            {alunoSelecionado && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60 transition-all duration-300 animate-in fade-in slide-in-from-bottom-6">
                 <h2 className="text-sm font-bold text-slate-800 mb-5 flex items-center gap-2.5 uppercase tracking-wide">
                  <span className="bg-sky-100 text-sky-700 w-7 h-7 rounded-lg flex items-center justify-center text-xs border border-sky-200">3</span> 
                  Venda Avulsa
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <select 
                    value={novoItem.tipo} 
                    onChange={(e) => setNovoItem({...novoItem, tipo: e.target.value})} 
                    className="sm:col-span-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all shadow-sm"
                  >
                    <option value="uniforme">Uniforme</option>
                    <option value="material">Material</option>
                    <option value="evento">Evento</option>
                    <option value="acordo">Outros</option>
                  </select>
                  <input 
                    type="text" 
                    placeholder="Descrição detalhada..." 
                    value={novoItem.descricao} 
                    onChange={(e) => setNovoItem({...novoItem, descricao: e.target.value})} 
                    className="sm:col-span-4 p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all shadow-sm" 
                  />
                  <div className="sm:col-span-3 relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">R$</span>
                    <input 
                      type="number" step="0.01" min="0" 
                      placeholder="0.00" 
                      value={novoItem.valor} 
                      onChange={(e) => setNovoItem({...novoItem, valor: e.target.value})} 
                      className="w-full pl-10 p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all shadow-sm" 
                    />
                  </div>
                  <button 
                    onClick={lancarItemAvulsoNoCarrinho} 
                    className="sm:col-span-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-sm rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Incluir
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* COLUNA DIREITA: Carrinho e Fechamento */}
          <div className="xl:col-span-5 relative">
            <div className="bg-white p-6 md:p-7 rounded-2xl shadow-xl border border-slate-200/80 sticky top-6 flex flex-col min-h-[600px] border-t-4 border-t-indigo-500">
              
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                  Resumo do Caixa
                </h2>
                <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-md text-xs font-bold border border-slate-200">
                  {carrinho.length} {carrinho.length === 1 ? 'ITEM' : 'ITENS'}
                </span>
              </div>

              {/* Lista do Carrinho */}
              <div className="flex-1 space-y-3 mb-6 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
                {carrinho.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center space-y-3 opacity-60">
                    <div className="bg-slate-100 p-4 rounded-full">
                      <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                    </div>
                    <p className="text-slate-500 font-medium text-sm">Nenhum item selecionado</p>
                  </div>
                ) : carrinho.map((item, idx) => {
                  const valorExibir = clean(item.valor_total) - clean(item.valor_pago);
                  return (
                    <div key={idx} className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100 group hover:border-slate-300 transition-colors">
                      <div className="truncate pr-3">
                        <span className="text-sm font-bold text-slate-800 block truncate">{item.descricao}</span>
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-wider mt-1 inline-block">
                          {item.isNovo ? 'Nova Venda' : 'Quitação'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-sm font-bold text-slate-800">R$ {valorExibir.toFixed(2)}</span>
                        <button 
                          onClick={() => removerDoCarrinho(item.id)} 
                          className="text-slate-400 hover:text-rose-600 font-medium w-7 h-7 flex items-center justify-center rounded-lg hover:bg-rose-50 transition-colors"
                          title="Remover item"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Ajustes Financeiros */}
              <div className="bg-[#f8fafc] p-5 rounded-2xl border border-slate-200/80 space-y-4 mb-6">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-semibold text-slate-500">Subtotal</span>
                  <span className="font-bold text-slate-800">R$ {subtotalCarrinho.toFixed(2)}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Desconto (R$)</label>
                    <input 
                      type="number" step="0.01" min="0" 
                      value={acrescimos.desconto} 
                      onChange={(e) => setAcrescimos({...acrescimos, desconto: e.target.value})} 
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-800 font-medium text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm" 
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Multa (R$)</label>
                    <input 
                      type="number" step="0.01" min="0" 
                      value={acrescimos.multa} 
                      onChange={(e) => setAcrescimos({...acrescimos, multa: e.target.value})} 
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-800 font-medium text-sm focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all shadow-sm" 
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                  <span className="text-sm font-bold text-slate-800 uppercase">Total a Pagar</span>
                  <span className="text-2xl font-black text-indigo-700 tracking-tight">R$ {totalComAcrescimos.toFixed(2)}</span>
                </div>
              </div>

              {/* Formas de Pagamento Dinâmicas */}
              <div className="space-y-4 mb-8">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2">Formas de Pagamento</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative group">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold uppercase group-focus-within:text-indigo-500 transition-colors">Pix</span>
                    <input type="number" value={pagamentos.pix} onChange={e => setPagamentos({...pagamentos, pix: e.target.value})} className="w-full pl-11 pr-3 py-2.5 bg-white border border-slate-200 text-slate-800 font-medium text-sm rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm" placeholder="0.00" />
                  </div>
                  <div className="relative group">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold uppercase group-focus-within:text-indigo-500 transition-colors">Espécie</span>
                    <input type="number" value={pagamentos.dinheiro} onChange={e => setPagamentos({...pagamentos, dinheiro: e.target.value})} className="w-full pl-16 pr-3 py-2.5 bg-white border border-slate-200 text-slate-800 font-medium text-sm rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm" placeholder="0.00" />
                  </div>
                  <div className="relative group">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold uppercase group-focus-within:text-indigo-500 transition-colors">Crédito</span>
                    <input type="number" value={pagamentos.credito} onChange={e => setPagamentos({...pagamentos, credito: e.target.value})} className="w-full pl-16 pr-3 py-2.5 bg-white border border-slate-200 text-slate-800 font-medium text-sm rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm" placeholder="0.00" />
                  </div>
                  <div className="relative group">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold uppercase group-focus-within:text-indigo-500 transition-colors">Débito</span>
                    <input type="number" value={pagamentos.debito} onChange={e => setPagamentos({...pagamentos, debito: e.target.value})} className="w-full pl-14 pr-3 py-2.5 bg-white border border-slate-200 text-slate-800 font-medium text-sm rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm" placeholder="0.00" />
                  </div>
                </div>

                {saldoAtualAluno > 0 && (
                  <div className="mt-4 p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-xl flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                      <span className="text-sm font-bold text-emerald-800">Usar Saldo Virtual</span>
                    </div>
                    <div className="relative w-28 group">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-emerald-600/50 font-bold text-sm">R$</span>
                      <input type="number" placeholder="0.00" value={pagamentos.credito_aluno} onChange={e => setPagamentos({...pagamentos, credito_aluno: e.target.value})} className="w-full pl-8 py-2 bg-white border border-emerald-200 text-emerald-800 text-sm rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 font-bold transition-all shadow-sm" />
                    </div>
                  </div>
                )}
              </div>

              {/* OPÇÕES DE DESTINO DO TROCO (Aparece dinamicamente) */}
              {trocoGerado > 0 && (
                <div className="mb-4 p-4 bg-emerald-50 rounded-xl border border-emerald-200 shadow-sm transition-all animate-in fade-in zoom-in-95">
                  <h4 className="text-xs font-bold text-emerald-800 uppercase mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                    Destino do Troco (R$ {trocoGerado.toFixed(2)})
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setAcaoTroco('credito')}
                      className={`py-2 px-3 rounded-lg text-sm font-bold border transition-all ${acaoTroco === 'credito' ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-100'}`}
                    >
                      Guardar na Carteira
                    </button>
                    <button
                       onClick={() => setAcaoTroco('devolver')}
                       className={`py-2 px-3 rounded-lg text-sm font-bold border transition-all ${acaoTroco === 'devolver' ? 'bg-slate-700 text-white border-slate-700 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                    >
                      Devolver ao Cliente
                    </button>
                  </div>
                </div>
              )}

              {/* Totalizador Dinâmico */}
              <div className="flex justify-between items-center mb-6 p-5 rounded-xl bg-slate-50 border border-slate-200 mt-auto shadow-inner">
                <span className="text-sm font-bold text-slate-600 uppercase tracking-wide">
                  {faltaPagar > 0 ? 'Falta Receber' : (acaoTroco === 'credito' ? 'Crédito Gerado' : 'Troco a Devolver')}
                </span>
                <span className={`text-2xl font-black tracking-tight ${faltaPagar > 0 ? 'text-rose-600' : (acaoTroco === 'credito' ? 'text-emerald-600' : 'text-amber-600')}`}>
                  R$ {faltaPagar > 0 ? faltaPagar.toFixed(2) : trocoGerado.toFixed(2)}
                </span>
              </div>

              {/* Botão Finalizar */}
              <button 
                onClick={finalizarVenda}
                disabled={processando || !alunoSelecionado || carrinho.length === 0}
                className={`w-full py-4 rounded-xl font-bold text-sm uppercase tracking-wider transition-all duration-200 flex justify-center items-center gap-2 ${
                  processando || !alunoSelecionado || carrinho.length === 0 
                  ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-700 hover:to-blue-700 shadow-md hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98]'
                }`}
              >
                {processando ? (
                   <>
                     <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                     Processando...
                   </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Finalizar Recebimento
                  </>
                )}
              </button>
            </div>
          </div>

        </div>
      </div>
      
      {/* Scrollbar Customizada Global do Componente */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}} />
    </div>
  );
}