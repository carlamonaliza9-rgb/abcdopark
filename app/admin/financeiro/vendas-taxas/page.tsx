"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

// Importação dos Modais Modularizados da pasta global de componentes
import { ModalUniforme } from "@/app/dashboard/financeiro/_components/ModalUniforme";
import { ModalTaxas } from "@/app/dashboard/financeiro/_components/ModalTaxas";
import { ModalPagamento } from "@/app/dashboard/financeiro/_components/ModalPagamento";

export default function VendasTaxasPage() {
  const router = useRouter();
  const [verificandoAcesso, setVerificandoAcesso] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userCargo, setUserCargo] = useState<string | null>(null);
  const [alunos, setAlunos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [historicoUniformes, setHistoricoUniformes] = useState<any[]>([]);
  const [historicoTaxas, setHistoricoTaxas] = useState<any[]>([]);

  const [buscaUniforme, setBuscaUniforme] = useState("");
  const [buscaTaxa, setBuscaTaxa] = useState("");

  const [modalUniformeAberto, setModalUniformeAberto] = useState(false);
  const [modalTaxasAberto, setModalTaxasAberto] = useState(false);
  const [modalPgtoAberto, setModalPgtoAberto] = useState(false);

  const [taxasSelecionadas, setTaxasSelecionadas] = useState<string[]>([]);
  const [modalEdicaoLoteAberto, setModalEdicaoLoteAberto] = useState(false);
  const [dadosEdicaoLote, setDadosEdicaoLote] = useState({ valor_total: "", data_pagamento: "" });
  
  const [modalTaxaAvulsaAberto, setModalTaxaAvulsaAberto] = useState(false);
  const [taxaAvulsa, setTaxaAvulsa] = useState({ aluno_id: "", tipo: "material", valor_total: "", data_pagamento: new Date().toISOString().split('T')[0], mes_referencia: "Anual" });

  const [alunoSelecionado, setAlunoSelecionado] = useState<any>(null);
  const [idPagamentoEdicao, setIdPagamentoEdicao] = useState<string | null>(null);
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().split('T')[0]); 
  const [tipoPagamento, setTipoPagamento] = useState("uniforme");
  const [descricaoOutro, setDescricaoOutro] = useState("");
  
  const [pagamentosMetodos, setPagamentosMetodos] = useState({ 
    pix: "", dinheiro: "", credito: "", debito: "", multa: "", credito_aluno: "",
    pix_editora: "", credito_editora: "", debito_editora: "", parcelas: "1", desconto: ""
  });
  const [mesReferencia, setMesReferencia] = useState("");

  const SENHA_MESTRA = "1234";
  const mesesAno = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

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

      if (!ehAutorizado) return router.push("/dashboard");
      setVerificandoAcesso(false);
    }
    verificarAcesso();
  }, [router]);

  async function carregarDados() {
    setCarregando(true);
    try {
      const { data: listaAlunos } = await supabase.from('alunos').select('*').order('nome');
      if (listaAlunos) setAlunos(listaAlunos);

      const { data: pgtosExtra } = await supabase
        .from('historico_pagamentos')
        .select('*')
        .in('tipo', ['uniforme', 'livro', 'material']);

      if (pgtosExtra) {
        pgtosExtra.sort((a, b) => new Date(b.created_at || b.data_pagamento).getTime() - new Date(a.created_at || a.data_pagamento).getTime());
        setHistoricoUniformes(pgtosExtra.filter(p => p.tipo === 'uniforme'));
        setHistoricoTaxas(pgtosExtra.filter(p => p.tipo === 'livro' || p.tipo === 'material'));
      }
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setCarregando(false);
      setTaxasSelecionadas([]); 
    }
  }

  useEffect(() => { 
    if (!verificandoAcesso) carregarDados(); 
  }, [verificandoAcesso]);

  function handleIniciarEdicao(pgto: any) {
    if (userEmail !== 'carlamonaliza9@gmail.com' && userCargo !== 'Admin') {
      return alert("A direção não possui permissão para alterar lançamentos salvos.");
    }

    const aluno = alunos.find(a => a.id === pgto.aluno_id);
    setAlunoSelecionado(aluno);
    setIdPagamentoEdicao(pgto.id);
    setTipoPagamento(pgto.tipo);
    setDescricaoOutro(pgto.descricao);
    setDataPagamento(pgto.data_pagamento || new Date().toISOString().split('T')[0]);
    setMesReferencia(pgto.mes_referencia || "");
    
    setPagamentosMetodos(pgto.detalhes_metodos || { 
      pix: "", dinheiro: "", credito: "", debito: "", multa: "", credito_aluno: "",
      pix_editora: "", credito_editora: "", debito_editora: "", parcelas: "1", desconto: ""
    });
    setModalPgtoAberto(true);
  }

  // ================= LÓGICA DE MULTA E PARCELAMENTO CORRIGIDA (ERP PADRÃO) =================
  async function confirmarPagamento() {
    // 1. Soma ESTRITAMENTE o dinheiro real (exclui parcelas, descontos e multas)
    const valoresRecebidos = [ pagamentosMetodos.pix, pagamentosMetodos.dinheiro, pagamentosMetodos.credito, pagamentosMetodos.debito, pagamentosMetodos.pix_editora, pagamentosMetodos.credito_editora, pagamentosMetodos.debito_editora ];
    const somaPaga = valoresRecebidos.reduce((acc, val) => acc + (parseFloat(val as string) || 0), 0);

    const valorMulta = parseFloat(pagamentosMetodos.multa) || 0;
    const valorDesconto = parseFloat(pagamentosMetodos.desconto) || 0;
    const creditoUtilizado = parseFloat(pagamentosMetodos.credito_aluno || "0");
    
    const valorPagoFinal = somaPaga + creditoUtilizado;

    if (valorPagoFinal <= 0 && valorDesconto === 0) return alert("Insira um valor.");

    try {
      const { data: original } = await supabase.from('historico_pagamentos').select('valor_total, detalhes_metodos').eq('id', idPagamentoEdicao).single();
      
      // 2. RECUPERA A DÍVIDA BASE (Remove a multa antiga para não somar duas vezes na edição)
      const multaAntiga = parseFloat(original?.detalhes_metodos?.multa || "0");
      const descontoAntigo = parseFloat(original?.detalhes_metodos?.desconto || "0");
      const dividaBaseOriginal = (parseFloat(original?.valor_total || "0") - multaAntiga) + descontoAntigo;
      
      // 3. A NOVA DÍVIDA REAL
      const novaDividaReal = Math.max(0, dividaBaseOriginal + valorMulta - valorDesconto);
      
      let status = "pago";
      let creditoGerado = 0;

      if (valorPagoFinal > novaDividaReal) {
        creditoGerado = valorPagoFinal - novaDividaReal;
      } else if (valorPagoFinal < novaDividaReal) {
        status = valorPagoFinal === 0 ? "pendente" : "parcial";
      }

      const dadosAtualizados = {
        descricao: descricaoOutro,
        valor_total: novaDividaReal, // Atualizamos o valor total com a nova multa
        valor_pago: valorPagoFinal > novaDividaReal ? novaDividaReal : valorPagoFinal,
        status: status,
        data_pagamento: dataPagamento,
        detalhes_metodos: pagamentosMetodos,
        mes_referencia: mesReferencia
      };

      const { error } = await supabase.from('historico_pagamentos').update(dadosAtualizados).eq('id', idPagamentoEdicao);
      if (error) throw error;

      if (creditoGerado > 0 || creditoUtilizado > 0) {
        const { data: alunoAtual } = await supabase.from('alunos').select('saldo_credito').eq('id', alunoSelecionado.id).single();
        const novoSaldo = (alunoAtual?.saldo_credito || 0) - creditoUtilizado + creditoGerado;
        await supabase.from('alunos').update({ saldo_credito: novoSaldo }).eq('id', alunoSelecionado.id);
      }

      // 4. Geração de Previsões da Maquininha (Contas a Receber)
      const valorCreditoEscola = parseFloat(pagamentosMetodos.credito) || 0;
      const parcelas = parseInt(pagamentosMetodos.parcelas) || 1;

      if (valorCreditoEscola > 0 && parcelas > 1 && status === "pago") {
        const valorPorParcela = parseFloat((valorCreditoEscola / parcelas).toFixed(2));
        const previsoes = [];

        for (let i = 1; i <= parcelas; i++) {
          const dataVencimento = new Date(dataPagamento);
          dataVencimento.setMonth(dataVencimento.getMonth() + i);

          previsoes.push({
            aluno_id: alunoSelecionado.id,
            tipo: 'previsao_cartao',
            descricao: `Previsão Cartão (${i}/${parcelas}) - Ref. ${tipoPagamento.toUpperCase()}`,
            valor_total: valorPorParcela,
            valor_pago: 0,
            status: 'pendente',
            data_pagamento: dataVencimento.toISOString().split('T')[0],
            detalhes_metodos: {}
          });
        }
        
        await supabase.from('historico_pagamentos').insert(previsoes);
      }
      
      setModalPgtoAberto(false);
      carregarDados();
    } catch (e: any) {
      alert("Erro ao atualizar registro: " + e.message);
    }
  }

  async function handleExcluirRegistro(id: string) {
    if (userEmail !== 'carlamonaliza9@gmail.com') return alert("Apenas a Carla possui permissão para remover faturamentos.");
    if (prompt("Senha Mestra para REMOVER REGISTRO:") === SENHA_MESTRA) {
      if (confirm("Confirmar exclusão definitiva deste lançamento do histórico? Os saldos correntes serão recalculados.")) {
        await supabase.from('historico_pagamentos').delete().eq('id', id);
        alert("Lançamento removido!");
        carregarDados();
      }
    } else { alert("Senha incorreta."); }
  }

  async function handleExcluirLoteCompleto(item: any) {
    if (userEmail !== 'carlamonaliza9@gmail.com') return alert("Apenas a Carla possui permissão para remover lotes inteiros.");
    if (prompt(`ATENÇÃO: Você vai deletar essa cobrança de TODOS os alunos que a receberam juntos.\n\nDigite a Senha Mestra para deletar o LOTE INTEIRO:`) === SENHA_MESTRA) {
      if (confirm(`Confirmar exclusão definitiva do lote: "${item.descricao}"?\n\nIsso apagará essa taxa de TODOS os alunos simultaneamente!`)) {
        try {
          const { error } = await supabase.from('historico_pagamentos').delete().eq('tipo', item.tipo).eq('mes_referencia', item.mes_referencia).eq('descricao', item.descricao);
          if (error) throw error;
          alert("Todo o lote foi removido com sucesso!");
          carregarDados();
        } catch (e: any) { alert("Erro ao remover o lote completo: " + e.message); }
      }
    } else { alert("Senha incorreta."); }
  }

  const taxasFiltradas = historicoTaxas.filter(item => {
    const nomeAluno = alunos.find(a => a.id === item.aluno_id)?.nome || "";
    return nomeAluno.toLowerCase().includes(buscaTaxa.toLowerCase());
  });

  const toggleSelecaoTaxa = (id: string) => {
    setTaxasSelecionadas(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAllTaxas = () => {
    if (taxasSelecionadas.length === taxasFiltradas.length && taxasFiltradas.length > 0) {
      setTaxasSelecionadas([]);
    } else { setTaxasSelecionadas(taxasFiltradas.map(t => t.id)); }
  };

  async function handleExcluirLoteSelecionado() {
    if (userEmail !== 'carlamonaliza9@gmail.com') return alert("Apenas a Carla possui permissão para exclusão em lote.");
    if (prompt("Senha Mestra para EXCLUIR SELECIONADOS:") === SENHA_MESTRA) {
      if (confirm(`Tem certeza que deseja excluir as ${taxasSelecionadas.length} cobranças marcadas?`)) {
        try {
          const { error } = await supabase.from('historico_pagamentos').delete().in('id', taxasSelecionadas);
          if (error) throw error;
          alert("Itens selecionados excluídos!");
          carregarDados();
        } catch (e: any) { alert("Erro ao excluir lote: " + e.message); }
      }
    } else { alert("Senha incorreta."); }
  }

  async function handleEditarLote() {
    if (userEmail !== 'carlamonaliza9@gmail.com') return alert("Apenas a Carla possui permissão para edição em lote.");
    if (prompt("Senha Mestra para EDITAR LOTE:") !== SENHA_MESTRA) return alert("Senha incorreta.");
    
    const updates: any = {};
    if (dadosEdicaoLote.valor_total) updates.valor_total = parseFloat(dadosEdicaoLote.valor_total);
    if (dadosEdicaoLote.data_pagamento) updates.data_pagamento = dadosEdicaoLote.data_pagamento;

    if (Object.keys(updates).length > 0) {
      try {
        const { error } = await supabase.from('historico_pagamentos').update(updates).in('id', taxasSelecionadas);
        if (error) throw error;
        alert("Cobranças atualizadas com sucesso!");
        setModalEdicaoLoteAberto(false);
        carregarDados();
      } catch (e: any) { alert("Erro ao editar lote: " + e.message); }
    } else { alert("Nenhum dado informado para alteração."); }
  }

  async function handleLancarTaxaAvulsa() {
    if (!taxaAvulsa.aluno_id || !taxaAvulsa.valor_total) return alert("Por favor, selecione o aluno e informe o valor.");
    try {
      const insertData = {
        aluno_id: taxaAvulsa.aluno_id,
        tipo: taxaAvulsa.tipo,
        descricao: taxaAvulsa.tipo === 'livro' ? 'Livros Didáticos (Matrícula)' : 'Taxa de Material Escolar (Matrícula)',
        valor_total: parseFloat(taxaAvulsa.valor_total),
        valor_pago: 0,
        status: 'pendente',
        data_pagamento: taxaAvulsa.data_pagamento,
        mes_referencia: taxaAvulsa.mes_referencia,
        detalhes_metodos: {}
      };
      const { error } = await supabase.from('historico_pagamentos').insert([insertData]);
      if (error) throw error;
      
      alert("Taxa avulsa lançada com sucesso!");
      setModalTaxaAvulsaAberto(false);
      carregarDados();
    } catch (e: any) { alert("Erro ao lançar taxa: " + e.message); }
  }

  const totalMaterial = historicoTaxas.filter(p => p.tipo === 'material').length;
  const pagoMaterial = historicoTaxas.filter(p => p.tipo === 'material' && p.status === 'pago').length;
  const faltamMaterial = totalMaterial - pagoMaterial;
  const pctMaterial = totalMaterial > 0 ? Math.round((pagoMaterial / totalMaterial) * 100) : 0;

  const totalLivros = historicoTaxas.filter(p => p.tipo === 'livro').length;
  const pagoLivros = historicoTaxas.filter(p => p.tipo === 'livro' && p.status === 'pago').length;
  const faltamLivros = totalLivros - pagoLivros;
  const pctLivros = totalLivros > 0 ? Math.round((pagoLivros / totalLivros) * 100) : 0;

  let totalPecasAno = 0;
  let camisasVendidas = 0;
  let inferioresVendidos = 0; 
  let casacosVendidos = 0;

  historicoUniformes.forEach(item => {
    const anoItem = item.data_pagamento ? item.data_pagamento.split('-')[0] : '';
    if (anoItem === '2026' || item.mes_referencia?.includes('2026')) {
      const desc = item.descricao || '';
      const matches = desc.match(/(\d+)x\s+([^,]+)/g);
      
      if (matches) {
        matches.forEach((m: string) => {
          const qtyMatch = m.match(/(\d+)x/);
          const qty = qtyMatch ? parseInt(qtyMatch[1]) : 0;
          totalPecasAno += qty;
          
          const lowercase = m.toLowerCase();
          if (lowercase.includes('camisa')) camisasVendidas += qty;
          else if (lowercase.includes('casaco')) casacosVendidos += qty;
          else inferioresVendidos += qty;
        });
      }
    }
  });

  const maxPecas = Math.max(camisasVendidas, inferioresVendidos, casacosVendidos, 10);
  const hCamisas = (camisasVendidas / maxPecas) * 100;
  const hInferiores = (inferioresVendidos / maxPecas) * 100;
  const hCasacos = (casacosVendidos / maxPecas) * 100;

  const uniformesFiltrados = historicoUniformes.filter(item => {
    const nomeAluno = alunos.find(a => a.id === item.aluno_id)?.nome || "";
    return nomeAluno.toLowerCase().includes(buscaUniforme.toLowerCase());
  });

  if (verificandoAcesso || carregando) return <div className="p-10 text-center text-slate-400 font-bold uppercase tracking-widest animate-pulse">Carregando controle...</div>;

  return (
    <div className="w-full bg-slate-50 min-h-screen relative font-sans antialiased text-slate-800 pb-24 md:pb-8">
      <div className="mb-8 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">🛍️ Vendas de Uniformes & Taxas</h1>
        <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">Gerenciamento centralizado de faturamentos extras</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div>
            <div className="h-12 w-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center text-xl mb-4">👕</div>
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Venda de Uniformes Avulsos</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4 font-medium leading-relaxed">Emita faturamentos de camisas, casacos e calças escolares diretamente na ficha corrente do aluno selecionado.</p>
            
            <div className="space-y-3 border-t border-slate-100 pt-4 mb-6">
              <div className="flex justify-between items-center text-xs font-black text-purple-950 mb-1 uppercase tracking-widest">
                <span>📊 Peças Saídas (2026)</span>
                <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-xl">{totalPecasAno} un.</span>
              </div>
              <div>
                <div className="flex justify-between text-[10px] font-black uppercase text-slate-500 mb-1">
                  <span>👕 Camisas</span>
                  <span className="text-slate-900">{camisasVendidas} pçs</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-purple-500 h-full transition-all duration-500" style={{ width: `${hCamisas}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] font-black uppercase text-slate-500 mb-1">
                  <span>👖 Inferiores (Calças/Saias)</span>
                  <span className="text-slate-900">{inferioresVendidos} pçs</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-fuchsia-500 h-full transition-all duration-500" style={{ width: `${hInferiores}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] font-black uppercase text-slate-500 mb-1">
                  <span>🧥 Casacos de Inverno</span>
                  <span className="text-slate-900">{casacosVendidos} pçs</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-indigo-500 h-full transition-all duration-500" style={{ width: `${hCasacos}%` }}></div>
                </div>
              </div>
            </div>
          </div>
          <button onClick={() => setModalUniformeAberto(true)} className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-lg shadow-purple-200 transition-all active:scale-95">
            Registrar Nova Venda
          </button>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start">
              <div className="h-12 w-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center text-xl mb-4">📦</div>
              <button onClick={() => setModalTaxaAvulsaAberto(true)} className="text-[10px] uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-2 rounded-xl font-black hover:bg-emerald-100 transition-colors shadow-sm active:scale-95">
                + Lançar P/ 1 Aluno
              </button>
            </div>
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Faturamento Geral em Lote</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4 font-medium leading-relaxed">Insira cobranças anuais automáticas de Livros Didáticos e Taxas de Materiais para todos os alunos filtrados por segmento de ensino.</p>
            
            <div className="space-y-4 border-t border-slate-100 pt-4 mb-6">
              <div>
                <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest text-slate-700 mb-1">
                  <span>🎨 Taxa Material</span>
                  <span className="text-emerald-600">{pctMaterial}% Recebido</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                  <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${pctMaterial}%` }}></div>
                </div>
                <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 mt-1 uppercase">
                  <span>{pagoMaterial} quitados</span>
                  <span className="text-rose-500">{faltamMaterial} pendentes</span>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest text-slate-700 mb-1">
                  <span>📘 Livros Didáticos</span>
                  <span className="text-blue-600">{pctLivros}% Recebido</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                  <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${pctLivros}%` }}></div>
                </div>
                <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 mt-1 uppercase">
                  <span>{pagoLivros} quitados</span>
                  <span className="text-rose-500">{faltamLivros} pendentes</span>
                </div>
              </div>
            </div>
          </div>
          <button onClick={() => setModalTaxasAberto(true)} className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-lg shadow-emerald-200 transition-all active:scale-95">
            Gerar Lote Geral
          </button>
        </div>
      </div>

      {/* ================= RESUMO 1: HISTÓRICO DE UNIFORMES ================= */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden mb-8">
        <div className="p-6 border-b border-slate-100 bg-purple-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h3 className="font-black text-purple-900 text-sm uppercase tracking-widest italic">🛒 Histórico de Uniformes</h3>
          <input
            type="text" placeholder="🔍 Buscar aluno..." value={buscaUniforme} onChange={(e) => setBuscaUniforme(e.target.value)}
            className="px-4 py-2.5 bg-white border border-purple-200 rounded-xl text-xs font-bold text-slate-700 outline-none w-full sm:w-64 focus:border-purple-400 transition-colors"
          />
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-white text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                <th className="p-5">Data</th>
                <th className="p-5">Aluno</th>
                <th className="p-5">Descrição</th>
                <th className="p-5 text-right">Total</th>
                <th className="p-5 text-center">Status</th>
                <th className="p-5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {uniformesFiltrados.length > 0 ? (
                uniformesFiltrados.map((item) => {
                  const nomeAluno = alunos.find(a => a.id === item.aluno_id)?.nome || "Não Encontrado";
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-5 text-slate-500 font-bold text-xs">{item.data_pagamento ? new Date(item.data_pagamento + "T12:00:00").toLocaleDateString('pt-BR') : '--'}</td>
                      <td className="p-5 font-black text-slate-800 uppercase text-xs">{nomeAluno}</td>
                      <td className="p-5 text-slate-600 text-xs font-semibold">{item.descricao?.replace("Venda de Uniforme Avulsa: ", "")}</td>
                      <td className="p-5 text-right font-black text-slate-900">R$ {parseFloat(item.valor_total).toFixed(2)}</td>
                      <td className="p-5 text-center">
                        {item.status !== 'pago' ? (
                          <button onClick={() => handleIniciarEdicao(item)} className="px-3 py-1.5 rounded-lg text-[10px] font-black bg-rose-50 text-rose-600 border border-rose-200 uppercase tracking-widest hover:bg-rose-100 transition-colors">
                            {item.status}
                          </button>
                        ) : (
                          <span className="px-3 py-1.5 rounded-lg text-[10px] font-black bg-emerald-50 text-emerald-600 border border-emerald-200 uppercase tracking-widest">Pago</span>
                        )}
                      </td>
                      <td className="p-5 text-center space-x-2 flex justify-center">
                        <button onClick={() => handleIniciarEdicao(item)} className="text-[10px] uppercase font-black tracking-widest bg-blue-50 text-blue-600 px-3 py-2 rounded-xl hover:bg-blue-100">Editar</button>
                        <button onClick={() => handleExcluirRegistro(item.id)} className="text-[10px] uppercase font-black tracking-widest bg-rose-50 text-rose-600 px-3 py-2 rounded-xl hover:bg-rose-100">Excluir</button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400 font-black uppercase tracking-widest text-[10px]">Nenhuma venda encontrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= RESUMO 2: HISTÓRICO DE TAXAS ANUAIS ================= */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden mb-8 relative">
        {taxasSelecionadas.length > 0 && (
          <div className="absolute top-0 left-0 w-full h-full bg-emerald-50/95 backdrop-blur-sm z-10 flex items-center justify-center p-6 animate-in fade-in duration-200">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-emerald-200 flex flex-col items-center gap-4 max-w-md w-full">
              <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl">📦</div>
              <h3 className="font-black text-emerald-900 text-2xl uppercase tracking-tighter italic">{taxasSelecionadas.length} Selecionadas</h3>
              <div className="flex flex-col gap-3 w-full mt-4">
                <button onClick={() => setModalEdicaoLoteAberto(true)} className="w-full py-4 bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-blue-700 shadow-lg active:scale-95 transition-all">✏️ Editar Data / Valor</button>
                <button onClick={handleExcluirLoteSelecionado} className="w-full py-4 bg-rose-500 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-rose-600 shadow-lg active:scale-95 transition-all">🗑️ Excluir Selecionadas</button>
                <button onClick={() => setTaxasSelecionadas([])} className="w-full py-4 bg-slate-100 text-slate-500 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition-all">Cancelar</button>
              </div>
            </div>
          </div>
        )}

        <div className="p-6 border-b border-slate-100 bg-emerald-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h3 className="font-black text-emerald-900 text-sm uppercase tracking-widest italic">📦 Lançamento de Taxas</h3>
          <input
            type="text" placeholder="🔍 Buscar aluno..." value={buscaTaxa} onChange={(e) => setBuscaTaxa(e.target.value)}
            className="px-4 py-2.5 bg-white border border-emerald-200 rounded-xl text-xs font-bold text-slate-700 outline-none w-full sm:w-64 focus:border-emerald-400 transition-colors"
          />
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-white text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                <th className="p-5 w-10 text-center"><input type="checkbox" onChange={toggleSelectAllTaxas} checked={taxasSelecionadas.length === taxasFiltradas.length && taxasFiltradas.length > 0} className="w-4 h-4 accent-emerald-500 cursor-pointer" /></th>
                <th className="p-5">Período / Venc.</th>
                <th className="p-5">Aluno</th>
                <th className="p-5">Obrigação</th>
                <th className="p-5 text-right">Faturado</th>
                <th className="p-5 text-center">Status</th>
                <th className="p-5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {taxasFiltradas.length > 0 ? (
                taxasFiltradas.map((item) => {
                  const nomeAluno = alunos.find(a => a.id === item.aluno_id)?.nome || "Não Encontrado";
                  const isChecked = taxasSelecionadas.includes(item.id);
                  return (
                    <tr key={item.id} className={`hover:bg-slate-50/50 transition-colors ${isChecked ? 'bg-emerald-50/40' : ''}`}>
                      <td className="p-5 text-center"><input type="checkbox" checked={isChecked} onChange={() => toggleSelecaoTaxa(item.id)} className="w-4 h-4 accent-emerald-500 cursor-pointer" /></td>
                      <td className="p-5 text-slate-500 font-bold text-xs">{item.mes_referencia} <br/><span className="text-[10px] text-slate-400 font-medium uppercase">{new Date(item.data_pagamento).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</span></td>
                      <td className="p-5 font-black text-slate-800 uppercase text-xs">{nomeAluno}</td>
                      <td className="p-5 text-slate-600 font-black text-[10px] uppercase tracking-widest">{item.tipo === 'livro' ? '📘 Livros' : '🎨 Material'}</td>
                      <td className="p-5 text-right font-black text-slate-900">R$ {parseFloat(item.valor_total).toFixed(2)}</td>
                      <td className="p-5 text-center">
                        {item.status !== 'pago' ? (
                          <button onClick={() => handleIniciarEdicao(item)} className="px-3 py-1.5 rounded-lg text-[10px] font-black bg-rose-50 text-rose-600 border border-rose-200 uppercase tracking-widest hover:bg-rose-100 transition-colors">{item.status}</button>
                        ) : (
                          <span className="px-3 py-1.5 rounded-lg text-[10px] font-black bg-emerald-50 text-emerald-600 border border-emerald-200 uppercase tracking-widest">Pago</span>
                        )}
                      </td>
                      <td className="p-5 text-center space-x-1.5 flex items-center justify-center">
                        <button onClick={() => handleIniciarEdicao(item)} className="text-[10px] uppercase font-black tracking-widest bg-blue-50 text-blue-600 px-3 py-2 rounded-xl hover:bg-blue-100">Editar</button>
                        <button onClick={() => handleExcluirLoteCompleto(item)} className="text-[10px] uppercase font-black tracking-widest bg-orange-50 text-orange-600 px-3 py-2 rounded-xl hover:bg-orange-100" title="Deletar de todos os alunos">💥 Lote</button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr><td colSpan={7} className="p-8 text-center text-slate-400 font-black uppercase tracking-widest text-[10px]">Nenhuma taxa encontrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL GLOBAL DE RECEBIMENTO */}
      <ModalPagamento 
        aberto={modalPgtoAberto} onFechar={() => setModalPgtoAberto(false)}
        aluno={alunoSelecionado} dataPagamento={dataPagamento} setDataPagamento={setDataPagamento}
        tipoPagamento={tipoPagamento} setTipoPagamento={setTipoPagamento}
        mesReferencia={mesReferencia} setMesReferencia={setMesReferencia} mesesAno={mesesAno}
        descricaoOutro={descricaoOutro} setDescricaoOutro={setDescricaoOutro}
        pagamentosMetodos={pagamentosMetodos} setPagamentosMetodos={setPagamentosMetodos}
        onConfirmar={confirmarPagamento} editando={!!idPagamentoEdicao}
      />

      {/* MODAIS COMPLEMENTARES DE EMISSÃO */}
      <ModalUniforme aberto={modalUniformeAberto} onFechar={() => setModalUniformeAberto(false)} alunos={alunos} carregarDados={carregarDados} />
      <ModalTaxas aberto={modalTaxasAberto} onFechar={() => setModalTaxasAberto(false)} alunos={alunos} carregarDados={carregarDados} />

      {/* ================= MODAL INLINE: EDIÇÃO EM LOTE ================= */}
      {modalEdicaoLoteAberto && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[4000] backdrop-blur-sm p-4">
          <div className="bg-white p-8 rounded-[2.5rem] w-full max-w-sm shadow-2xl animate-in zoom-in-95">
            <h2 className="text-center font-black text-slate-800 mb-6 text-xl uppercase tracking-tighter italic">✏️ Editar {taxasSelecionadas.length} Itens</h2>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Novo Valor (R$):</label>
                <input 
                  type="number" placeholder="Branco para manter igual" value={dadosEdicaoLote.valor_total} 
                  onChange={(e) => setDadosEdicaoLote({...dadosEdicaoLote, valor_total: e.target.value})} 
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Novo Vencimento:</label>
                <input 
                  type="date" value={dadosEdicaoLote.data_pagamento} 
                  onChange={(e) => setDadosEdicaoLote({...dadosEdicaoLote, data_pagamento: e.target.value})} 
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-blue-400"
                />
              </div>
            </div>
            <div className="flex flex-col gap-3 mt-8">
              <button onClick={handleEditarLote} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg active:scale-95 transition-all">SALVAR LOTE</button>
              <button onClick={() => setModalEdicaoLoteAberto(false)} className="w-full py-4 border border-slate-200 rounded-2xl font-black uppercase tracking-widest text-[10px] text-slate-500 hover:bg-slate-50 transition-all">CANCELAR</button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL INLINE: LANÇAMENTO AVULSO ================= */}
      {modalTaxaAvulsaAberto && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[4000] backdrop-blur-sm p-4">
          <div className="bg-white p-8 rounded-[2.5rem] w-full max-w-md shadow-2xl animate-in zoom-in-95">
            <h2 className="text-center font-black text-emerald-900 mb-8 text-2xl uppercase tracking-tighter italic">📦 Lançar Taxa</h2>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Selecionar Aluno:</label>
                <select 
                  value={taxaAvulsa.aluno_id} onChange={(e) => setTaxaAvulsa({...taxaAvulsa, aluno_id: e.target.value})}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-emerald-400"
                >
                  <option value="">Selecione na lista...</option>
                  {alunos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Categoria:</label>
                  <select 
                    value={taxaAvulsa.tipo} onChange={(e) => setTaxaAvulsa({...taxaAvulsa, tipo: e.target.value})}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-emerald-400"
                  >
                    <option value="material">🎨 Material</option>
                    <option value="livro">📘 Livros</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Ano Letivo:</label>
                  <input 
                    type="text" value={taxaAvulsa.mes_referencia} onChange={(e) => setTaxaAvulsa({...taxaAvulsa, mes_referencia: e.target.value})}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Valor Faturado (R$):</label>
                  <input 
                    type="number" value={taxaAvulsa.valor_total} onChange={(e) => setTaxaAvulsa({...taxaAvulsa, valor_total: e.target.value})} placeholder="0.00"
                    className="w-full p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-sm font-bold outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Vencimento:</label>
                  <input 
                    type="date" value={taxaAvulsa.data_pagamento} onChange={(e) => setTaxaAvulsa({...taxaAvulsa, data_pagamento: e.target.value})}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none"
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3 mt-8">
              <button onClick={handleLancarTaxaAvulsa} className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg active:scale-95 transition-all">LANÇAR NO SISTEMA</button>
              <button onClick={() => setModalTaxaAvulsaAberto(false)} className="w-full py-4 border border-slate-200 rounded-2xl font-black uppercase tracking-widest text-[10px] text-slate-500 hover:bg-slate-50 transition-all">CANCELAR</button>
            </div>
          </div>
        </div>
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}} />
    </div>
  );
}