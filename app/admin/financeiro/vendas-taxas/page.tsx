"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

import { ModalUniforme } from "@/app/dashboard/financeiro/_components/ModalUniforme";
import { ModalTaxas } from "@/app/dashboard/financeiro/_components/ModalTaxas";
import { ModalPagamento } from "@/app/dashboard/financeiro/_components/ModalPagamento";

// Importações Modulares
import { CardMetricas } from "./_components/CardMetricas";
import { TabelaUniformes } from "./_components/TabelaUniformes";
import { TabelaTaxas } from "./_components/TabelaTaxas";
import { ModaisInline } from "./_components/ModaisInline";

// FUNÇÃO BLINDADA DE CONVERSÃO FINANCEIRA (Remove pontos, troca vírgula por ponto)
function parseCurrency(val: any) {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  const str = String(val).replace(/\./g, '').replace(',', '.').replace(/\s/g, '');
  return parseFloat(str) || 0;
}

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
    pix: "", dinheiro: "", credito: "", debito: "", multa: "", credito_aluno: "", boleto: "",
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
    
    // Higienizador contra o Bug 1970
    const dataSegura = pgto.data_pagamento && !pgto.data_pagamento.startsWith("1970") 
      ? pgto.data_pagamento 
      : new Date().toISOString().split('T')[0];
      
    setDataPagamento(dataSegura);
    setMesReferencia(pgto.mes_referencia || "");
    
    // Mescla Segura: Garante que os campos não virem nulos na reabertura
    setPagamentosMetodos({ 
      pix: "", dinheiro: "", credito: "", debito: "", multa: "", credito_aluno: "", boleto: "",
      pix_editora: "", credito_editora: "", debito_editora: "", parcelas: "1", desconto: "",
      ...(pgto.detalhes_metodos || {})
    });
    setModalPgtoAberto(true);
  }

  async function confirmarPagamento() {
    // 1. FAXINA DE DADOS: Limpa lixo e zeros do JSON (Erro de Tipagem Corrigido)
    const metodosLimpos: any = {};
    for (const [key, value] of Object.entries(pagamentosMetodos)) {
      if (value !== "" && value !== "0" && value !== "0.00" && value !== null && Number(value) !== 0) {
        metodosLimpos[key] = value;
      }
    }

    // 2. RECUPERA TODOS OS VALORES POSSÍVEIS (Tratando ponto, vírgula e string vazia)
    const valorCredEscola = parseCurrency(pagamentosMetodos.credito) || parseCurrency((pagamentosMetodos as any).cartao);
    const valorCredEditora = parseCurrency(pagamentosMetodos.credito_editora) || parseCurrency((pagamentosMetodos as any).cartao_editora);
    const totalCreditoTransacionado = valorCredEscola + valorCredEditora;

    // Remove variável "parcelas" se foi pago à vista / dinheiro
    if (totalCreditoTransacionado <= 0) {
      delete metodosLimpos.parcelas;
    } else if (!metodosLimpos.parcelas) {
      metodosLimpos.parcelas = "1";
    }

    // Soma Global de Entrada (Dinâmica para garantir que nenhum método de pagamento fique de fora)
    let somaPaga = 0;
    for (const [key, value] of Object.entries(pagamentosMetodos)) {
      if (!['multa', 'desconto', 'parcelas', 'credito_aluno'].includes(key)) {
        somaPaga += parseCurrency(value);
      }
    }

    const valorMulta = parseCurrency(pagamentosMetodos.multa);
    const valorDesconto = parseCurrency(pagamentosMetodos.desconto);
    const creditoUtilizado = parseCurrency(pagamentosMetodos.credito_aluno);
    
    const valorPagoFinal = somaPaga + creditoUtilizado;

    if (valorPagoFinal <= 0 && valorDesconto === 0) return alert("Insira um valor financeiro válido.");

    // Sanitização de Data
    const dataAlvoFinal = dataPagamento && dataPagamento !== "" ? dataPagamento : new Date().toISOString().split('T')[0];

    try {
      const { data: original } = await supabase.from('historico_pagamentos').select('valor_total, detalhes_metodos').eq('id', idPagamentoEdicao).single();
      
      const multaAntiga = parseCurrency(original?.detalhes_metodos?.multa);
      const descontoAntigo = parseCurrency(original?.detalhes_metodos?.desconto);
      const dividaBaseOriginal = (parseCurrency(original?.valor_total) - multaAntiga) + descontoAntigo;
      
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
        valor_total: novaDividaReal,
        valor_pago: valorPagoFinal > novaDividaReal ? novaDividaReal : valorPagoFinal,
        status: status,
        data_pagamento: dataAlvoFinal,
        detalhes_metodos: metodosLimpos, // Salvamento otimizado
        mes_referencia: mesReferencia
      };

      const { error } = await supabase.from('historico_pagamentos').update(dadosAtualizados).eq('id', idPagamentoEdicao);
      if (error) throw error;

      if (creditoGerado > 0 || creditoUtilizado > 0) {
        const { data: alunoAtual } = await supabase.from('alunos').select('saldo_credito').eq('id', alunoSelecionado.id).single();
        const novoSaldo = parseCurrency(alunoAtual?.saldo_credito) - creditoUtilizado + creditoGerado;
        await supabase.from('alunos').update({ saldo_credito: novoSaldo }).eq('id', alunoSelecionado.id);
      }

      // 3. MOTOR DE PREVISÕES DE CARTÃO DA ESCOLA E DA EDITORA
      const parcelas = parseInt(metodosLimpos.parcelas) || 1;

      if (totalCreditoTransacionado > 0 && parcelas > 1 && status === "pago") {
        const valorPorParcela = parseFloat((totalCreditoTransacionado / parcelas).toFixed(2));
        const previsoes = [];

        for (let i = 1; i <= parcelas; i++) {
          const dataVencimento = new Date(dataAlvoFinal);
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

  // =======================================================================
  // ORDENAÇÃO DUPLA (STATUS PAGO PRO FINAL + ORDEM ALFABÉTICA)
  // =======================================================================
  const ordenarLista = (lista: any[]) => {
    return lista.sort((a, b) => {
      if (a.status === 'pago' && b.status !== 'pago') return 1;
      if (a.status !== 'pago' && b.status === 'pago') return -1;
      
      const nomeA = alunos.find(al => al.id === a.aluno_id)?.nome || "";
      const nomeB = alunos.find(al => al.id === b.aluno_id)?.nome || "";
      return nomeA.localeCompare(nomeB);
    });
  };

  const taxasFiltradas = ordenarLista(historicoTaxas.filter(item => {
    const nomeAluno = alunos.find(a => a.id === item.aluno_id)?.nome || "";
    return nomeAluno.toLowerCase().includes(buscaTaxa.toLowerCase());
  }));

  const uniformesFiltrados = ordenarLista(historicoUniformes.filter(item => {
    const nomeAluno = alunos.find(a => a.id === item.aluno_id)?.nome || "";
    return nomeAluno.toLowerCase().includes(buscaUniforme.toLowerCase());
  }));

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
    if (dadosEdicaoLote.valor_total) updates.valor_total = parseCurrency(dadosEdicaoLote.valor_total);
    if (dadosEdicaoLote.data_pagamento) {
      updates.data_pagamento = dadosEdicaoLote.data_pagamento !== "" ? dadosEdicaoLote.data_pagamento : new Date().toISOString().split('T')[0];
    }

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
    
    // Bloqueia salvamento de 1970 em taxa avulsa
    const dataSeguraLote = taxaAvulsa.data_pagamento && taxaAvulsa.data_pagamento !== "" 
      ? taxaAvulsa.data_pagamento 
      : new Date().toISOString().split('T')[0];

    try {
      const insertData = {
        aluno_id: taxaAvulsa.aluno_id,
        tipo: taxaAvulsa.tipo,
        descricao: taxaAvulsa.tipo === 'livro' ? 'Livros Didáticos (Matrícula)' : 'Taxa de Material Escolar (Matrícula)',
        valor_total: parseCurrency(taxaAvulsa.valor_total),
        valor_pago: 0,
        status: 'pendente',
        data_pagamento: dataSeguraLote,
        mes_referencia: taxaAvulsa.mes_referencia,
        detalhes_metodos: {}
      };
      const { error } = await supabase.from('historico_pagamentos').insert([insertData]);
      if (error) throw error;
      
      alert("Taxa avulsa lançada com sucesso!");
      setModalTaxaAvulsaAberto(false);
      setTaxaAvulsa({ aluno_id: "", tipo: "material", valor_total: "", data_pagamento: new Date().toISOString().split('T')[0], mes_referencia: "Anual" });
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

  let totalPecasAno = 0; let camisasVendidas = 0; let inferioresVendidos = 0; let casacosVendidos = 0;
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

  if (verificandoAcesso || carregando) return <div className="p-10 text-center text-slate-400 font-bold uppercase tracking-widest animate-pulse">Carregando controle...</div>;

  return (
    <div className="w-full bg-slate-50 min-h-screen relative font-sans antialiased text-slate-800 pb-24 md:pb-8">
      <div className="mb-8 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">🛍️ Vendas de Uniformes & Taxas</h1>
        <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">Gerenciamento centralizado de faturamentos extras</p>
      </div>

      <CardMetricas 
        totalPecasAno={totalPecasAno} camisasVendidas={camisasVendidas} inferioresVendidos={inferioresVendidos} casacosVendidos={casacosVendidos}
        hCamisas={hCamisas} hInferiores={hInferiores} hCasacos={hCasacos} pagoMaterial={pagoMaterial} totalMaterial={totalMaterial}
        pctMaterial={pctMaterial} faltamMaterial={faltamMaterial} pagoLivros={pagoLivros} totalLivros={totalLivros} pctLivros={pctLivros}
        faltamLivros={faltamLivros} setModalUniformeAberto={setModalUniformeAberto} setModalTaxasAberto={setModalTaxasAberto} setModalTaxaAvulsaAberto={setModalTaxaAvulsaAberto}
      />

      <TabelaUniformes 
        uniformesFiltrados={uniformesFiltrados} alunos={alunos} buscaUniforme={buscaUniforme}
        setBuscaUniforme={setBuscaUniforme} handleIniciarEdicao={handleIniciarEdicao} handleExcluirRegistro={handleExcluirRegistro}
      />

      <TabelaTaxas 
        taxasFiltradas={taxasFiltradas} taxasSelecionadas={taxasSelecionadas} alunos={alunos} buscaTaxa={buscaTaxa} setBuscaTaxa={setBuscaTaxa}
        toggleSelectAllTaxas={toggleSelectAllTaxas} toggleSelecaoTaxa={toggleSelecaoTaxa} handleIniciarEdicao={handleIniciarEdicao}
        handleExcluirLoteCompleto={handleExcluirLoteCompleto} setModalEdicaoLoteAberto={setModalEdicaoLoteAberto}
        handleExcluirLoteSelecionado={handleExcluirLoteSelecionado} setTaxasSelecionadas={setTaxasSelecionadas}
      />

      <ModalPagamento 
        aberto={modalPgtoAberto} onFechar={() => setModalPgtoAberto(false)}
        aluno={alunoSelecionado} dataPagamento={dataPagamento} setDataPagamento={setDataPagamento}
        tipoPagamento={tipoPagamento} setTipoPagamento={setTipoPagamento}
        mesReferencia={mesReferencia} setMesReferencia={setMesReferencia} mesesAno={mesesAno}
        descricaoOutro={descricaoOutro} setDescricaoOutro={setDescricaoOutro}
        pagamentosMetodos={pagamentosMetodos} setPagamentosMetodos={setPagamentosMetodos}
        onConfirmar={confirmarPagamento} editando={!!idPagamentoEdicao}
      />

      <ModalUniforme aberto={modalUniformeAberto} onFechar={() => setModalUniformeAberto(false)} alunos={alunos} carregarDados={carregarDados} />
      <ModalTaxas aberto={modalTaxasAberto} onFechar={() => setModalTaxasAberto(false)} alunos={alunos} carregarDados={carregarDados} />

      <ModaisInline 
        modalEdicaoLoteAberto={modalEdicaoLoteAberto} setModalEdicaoLoteAberto={setModalEdicaoLoteAberto} dadosEdicaoLote={dadosEdicaoLote}
        setDadosEdicaoLote={setDadosEdicaoLote} handleEditarLote={handleEditarLote} taxasSelecionadas={taxasSelecionadas}
        modalTaxaAvulsaAberto={modalTaxaAvulsaAberto} setModalTaxaAvulsaAberto={setModalTaxaAvulsaAberto} taxaAvulsa={taxaAvulsa}
        setTaxaAvulsa={setTaxaAvulsa} alunos={alunos} handleLancarTaxaAvulsa={handleLancarTaxaAvulsa}
      />
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}} />
    </div>
  );
}