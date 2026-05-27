"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

// Importações de Componentes de Eventos
import { GestaoEventos } from "@/app/dashboard/financeiro/_components/GestaoEventos";
import { ModalEvento } from "@/app/dashboard/financeiro/_components/ModalEvento";

// Importações de Componentes de Uniformes e Taxas
import { ModalUniforme } from "@/app/dashboard/financeiro/_components/ModalUniforme";
import { ModalTaxas } from "@/app/dashboard/financeiro/_components/ModalTaxas";
import { CardMetricas } from "@/app/admin/financeiro/vendas-taxas/_components/CardMetricas";
import { TabelaUniformes } from "@/app/admin/financeiro/vendas-taxas/_components/TabelaUniformes";
import { TabelaTaxas } from "@/app/admin/financeiro/vendas-taxas/_components/TabelaTaxas";
import { ModaisInline } from "@/app/admin/financeiro/vendas-taxas/_components/ModaisInline";

// Componente Compartilhado de Pagamento
import { ModalPagamento } from "@/app/dashboard/financeiro/_components/ModalPagamento";

// FUNÇÃO BLINDADA DE CONVERSÃO FINANCEIRA
function parseCurrency(val: any) {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  const str = String(val).replace(/\./g, '').replace(',', '.').replace(/\s/g, '');
  return parseFloat(str) || 0;
}

export default function DashboardFinanceiroPage() {
  const router = useRouter();
  
  // --- ESTADOS DE CONTROLE DE ACESSO E CONTEXTO ---
  const [verificandoAcesso, setVerificandoAcesso] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userCargo, setUserCargo] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState<"eventos" | "vendas_taxas">("eventos");

  // --- ESTADOS DE DADOS COMPARTILHADOS ---
  const [alunos, setAlunos] = useState<any[]>([]);
  const [eventosAtivos, setEventosAtivos] = useState<any[]>([]);
  const [historicoPagamentosEventos, setHistoricoPagamentosEventos] = useState<any[]>([]);
  const [historicoUniformes, setHistoricoUniformes] = useState<any[]>([]);
  const [historicoTaxas, setHistoricoTaxas] = useState<any[]>([]);

  // --- ESTADOS DE BUSCA E SELEÇÃO ---
  const [buscaUniforme, setBuscaUniforme] = useState("");
  const [buscaTaxa, setBuscaTaxa] = useState("");
  const [taxasSelecionadas, setTaxasSelecionadas] = useState<string[]>([]);

  // --- ESTADOS DE CONTROLE DE MODAIS ---
  const [modalPgtoAberto, setModalPgtoAberto] = useState(false);
  const [modalEventoAberto, setModalEventoAberto] = useState(false);
  const [modalUniformeAberto, setModalUniformeAberto] = useState(false);
  const [modalTaxasAberto, setModalTaxasAberto] = useState(false);
  const [modalEdicaoLoteAberto, setModalEdicaoLoteAberto] = useState(false);
  const [modalTaxaAvulsaAberto, setModalTaxaAvulsaAberto] = useState(false);

  // --- ESTADOS DE FORMULÁRIOS DE EVENTOS ---
  const [eventoParaGerenciar, setEventoParaGerenciar] = useState<any>(null);
  const [idEventoEdicao, setIdEventoEdicao] = useState<string | null>(null);
  const [nomeEvento, setNomeEvento] = useState("");
  const [valorEvento, setValorEvento] = useState("");
  const [alunosSelecionados, setAlunosSelecionados] = useState<string[]>([]);

  // --- ESTADOS DE FORMULÁRIOS DE TAXAS/LOTE ---
  const [dadosEdicaoLote, setDadosEdicaoLote] = useState({ valor_total: "", data_pagamento: "" });
  const [taxaAvulsa, setTaxaAvulsa] = useState({ 
    aluno_id: "", tipo: "material", valor_total: "", 
    data_pagamento: new Date().toISOString().split('T')[0], mes_referencia: "Anual" 
  });

  // --- ESTADOS UNIFICADOS DO MODAL DE RECEBIMENTO ---
  const [alunoSelecionado, setAlunoSelecionado] = useState<any>(null);
  const [idPagamentoEdicao, setIdPagamentoEdicao] = useState<string | null>(null);
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().split('T')[0]); 
  const [tipoPagamento, setTipoPagamento] = useState("evento");
  const [descricaoOutro, setDescricaoOutro] = useState("");
  const [mesReferencia, setMesReferencia] = useState("");
  const [pagamentosMetodos, setPagamentosMetodos] = useState({ 
    pix: "", dinheiro: "", credito: "", debito: "", multa: "", credito_aluno: "", boleto: "",
    pix_editora: "", credito_editora: "", debito_editora: "", parcelas: "1", desconto: ""
  });

  const SENHA_MESTRA = "1234";
  const mesesAno = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  // --- TRAVA DE SEGURANÇA ---
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

  // --- CARREGAMENTO INTEGRADO COM ORDENAÇÃO PEDAGÓGICA ---
  async function carregarDados() {
    setCarregando(true);
    try {
      const { data: listaAlunos } = await supabase.from('alunos').select('*');
      if (listaAlunos) {
        const ordemHierarquicaTurmas = [
          "maternal", "jardim", "jardim i", "jardim ii", "jardim 1", "jardim 2",
          "1º ano", "2º ano", "3º ano", "4º ano", "5º ano"
        ];

        const obterPesoPedagogico = (turmaNome: string) => {
          const nomeMinusculo = (turmaNome || "").toLowerCase().trim();
          const index = ordemHierarquicaTurmas.findIndex(t => nomeMinusculo.includes(t));
          return index === -1 ? 999 : index;
        };

        const ordenados = [...listaAlunos].sort((a, b) => {
          const pesoA = obterPesoPedagogico(a.turma);
          const pesoB = obterPesoPedagogico(b.turma);
          if (pesoA !== pesoB) return pesoA - pesoB;
          const compTurmaString = (a.turma || "").localeCompare(b.turma || "", "pt-BR");
          if (compTurmaString !== 0) return compTurmaString;
          return (a.nome || "").localeCompare(b.nome || "", "pt-BR");
        });
        setAlunos(ordenados);
      }

      // Carrega todo o histórico financeiro pertinente de uma só vez
      const { data: todosPgtos } = await supabase
        .from('historico_pagamentos')
        .select('*')
        .in('tipo', ['evento', 'uniforme', 'livro', 'material']);

      if (todosPgtos) {
        todosPgtos.sort((a, b) => new Date(b.created_at || b.data_pagamento).getTime() - new Date(a.created_at || a.data_pagamento).getTime());
        setHistoricoPagamentosEventos(todosPgtos.filter(p => p.tipo === 'evento'));
        setHistoricoUniformes(todosPgtos.filter(p => p.tipo === 'uniforme'));
        setHistoricoTaxas(todosPgtos.filter(p => p.tipo === 'livro' || p.tipo === 'material'));
      }

      const { data: listaEventos } = await supabase.from('eventos_controle').select('*').eq('arquivado', false);
      if (listaEventos) setEventosAtivos(listaEventos);

    } catch (err) {
      console.error("Erro ao carregar dados integrados:", err);
    } finally {
      setCarregando(false);
      setTaxasSelecionadas([]); 
    }
  }

  useEffect(() => { 
    if (!verificandoAcesso) carregarDados(); 
  }, [verificandoAcesso]);

  // --- CONFIGURAÇÃO DE EDICÃO (UNIFORMES / TAXAS) ---
  function handleIniciarEdicao(pgto: any) {
    if (userEmail !== 'carlamonaliza9@gmail.com' && userCargo !== 'Admin') {
      return alert("A direção não possui permissão para alterar lançamentos salvos.");
    }
    const aluno = alunos.find(a => a.id === pgto.aluno_id);
    setAlunoSelecionado(aluno);
    setIdPagamentoEdicao(pgto.id);
    setTipoPagamento(pgto.tipo);
    setDescricaoOutro(pgto.descricao);
    
    const dataSegura = pgto.data_pagamento && !pgto.data_pagamento.startsWith("1970") 
      ? pgto.data_pagamento 
      : new Date().toISOString().split('T')[0];
      
    setDataPagamento(dataSegura);
    setMesReferencia(pgto.mes_referencia || "");
    setPagamentosMetodos({ 
      pix: "", dinheiro: "", credito: "", debito: "", multa: "", credito_aluno: "", boleto: "",
      pix_editora: "", credito_editora: "", debito_editora: "", parcelas: "1", desconto: "",
      ...(pgto.detalhes_metodos || {})
    });
    setModalPgtoAberto(true);
  }

  // --- MOTOR CENTRALIZADO E UNIFICADO DE CONFIRMAÇÃO DE PAGAMENTOS ---
  async function confirmarPagamento() {
    if (idPagamentoEdicao && userEmail !== 'carlamonaliza9@gmail.com' && userCargo !== 'Admin') {
      return alert("A direção não possui permissão para alterar ou editar lançamentos salvos.");
    }

    const dataAlvoFinal = dataPagamento && dataPagamento !== "" ? dataPagamento : new Date().toISOString().split('T')[0];

    // FLUXO A: PAGAMENTO DE EVENTOS PEDAGÓGICOS
    if (tipoPagamento === "evento") {
      const somaPaga = Object.values(pagamentosMetodos).reduce((acc, val) => acc + (parseFloat(val as string) || 0), 0);
      if (somaPaga <= 0) return alert("Insira um valor.");

      const creditoUtilizado = parseFloat((pagamentosMetodos as any).credito || 0);
      const saldoDisponivel = parseFloat(alunoSelecionado?.saldo_credito || 0);

      if (creditoUtilizado > saldoDisponivel) {
        return alert("Crédito selecionado maior do que o saldo disponível do aluno.");
      }

      const valorEsperado = parseFloat(eventoParaGerenciar?.valor_unitario) || 0;
      let status = "pago";
      let valorPagoFinal = somaPaga;
      let creditoGerado = 0;

      if (valorEsperado > 0) {
        if (somaPaga > valorEsperado) {
          status = "pago";
          valorPagoFinal = valorEsperado;
          creditoGerado = somaPaga - valorEsperado; 
        } else if (somaPaga < valorEsperado) {
          status = somaPaga === 0 ? "pendente" : "parcial";
        }
      }

      const dadosEvento = { 
        aluno_id: alunoSelecionado.id, 
        tipo: "evento", 
        descricao: descricaoOutro || `Evento: ${eventoParaGerenciar?.nome}`, 
        valor_total: valorEsperado > 0 ? valorEsperado : somaPaga, 
        valor_pago: valorPagoFinal,
        status: status,
        data_pagamento: dataAlvoFinal, 
        detalhes_metodos: pagamentosMetodos 
      };

      if (idPagamentoEdicao) {
        await supabase.from('historico_pagamentos').update(dadosEvento).eq('id', idPagamentoEdicao);
      } else {
        await supabase.from('historico_pagamentos').insert([dadosEvento]);
      }

      const novoSaldoCredito = saldoDisponivel - creditoUtilizado + creditoGerado;
      if (novoSaldoCredito !== saldoDisponivel) {
        await supabase.from('alunos').update({ saldo_credito: novoSaldoCredito }).eq('id', alunoSelecionado.id);
      }

    // FLUXO B: PAGAMENTO DE UNIFORMES, LIVROS OU MATERIAIS
    } else {
      const metodosLimpos: any = {};
      for (const [key, value] of Object.entries(pagamentosMetodos)) {
        if (value !== "" && value !== "0" && value !== "0.00" && value !== null && Number(value) !== 0) {
          metodosLimpos[key] = value;
        }
      }

      const valorCredEscola = parseCurrency(pagamentosMetodos.credito) || parseCurrency((pagamentosMetodos as any).cartao);
      const valorCredEditora = parseCurrency(pagamentosMetodos.credito_editora) || parseCurrency((pagamentosMetodos as any).cartao_editora);
      const totalCreditoTransacionado = valorCredEscola + valorCredEditora;

      if (totalCreditoTransacionado <= 0) {
        delete metodosLimpos.parcelas;
      } else if (!metodosLimpos.parcelas) {
        metodosLimpos.parcelas = "1";
      }

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
          detalhes_metodos: metodosLimpos,
          mes_referencia: mesReferencia
        };

        const { error } = await supabase.from('historico_pagamentos').update(dadosAtualizados).eq('id', idPagamentoEdicao);
        if (error) throw error;

        if (creditoGerado > 0 || creditoUtilizado > 0) {
          const { data: alunoAtual } = await supabase.from('alunos').select('saldo_credito').eq('id', alunoSelecionado.id).single();
          const novoSaldo = parseCurrency(alunoAtual?.saldo_credito) - creditoUtilizado + creditoGerado;
          await supabase.from('alunos').update({ saldo_credito: novoSaldo }).eq('id', alunoSelecionado.id);
        }

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
      } catch (e: any) {
        return alert("Erro ao atualizar faturamento: " + e.message);
      }
    }

    setModalPgtoAberto(false);
    carregarDados();
  }

  // --- CRIAÇÃO DE EVENTOS CONTROLE ---
  async function salvarEvento() {
    if (userEmail !== 'carlamonaliza9@gmail.com' && userCargo !== 'Admin') {
      return alert("A direção não possui permissão para estruturar ou alterar eventos.");
    }
    if (!nomeEvento || !valorEvento || (!idEventoEdicao && alunosSelecionados.length === 0)) return alert("Preencha todos os campos.");
    
    const dados = { 
      nome: nomeEvento, 
      valor_unitario: parseFloat(valorEvento), 
      total_alunos: idEventoEdicao ? eventosAtivos.find(e => e.id === idEventoEdicao)?.total_alunos : alunosSelecionados.length, 
      participantes: idEventoEdicao ? eventosAtivos.find(e => e.id === idEventoEdicao)?.participantes : alunosSelecionados, 
      arquivado: false 
    };

    if (idEventoEdicao) await supabase.from('eventos_controle').update(dados).eq('id', idEventoEdicao);
    else await supabase.from('eventos_controle').insert([dados]);
    
    setModalEventoAberto(false); 
    carregarDados();
  }

  // --- REMOÇÃO E EXCLUSÕES ---
  async function handleExcluirReceita(id: string) {
    if (userEmail !== 'carlamonaliza9@gmail.com') return alert("Apenas a Carla pode excluir.");
    if (prompt("Senha Mestra para EXCLUIR RECEITA:") === SENHA_MESTRA) {
      if(confirm("Confirmar a exclusão deste pagamento associado ao evento?")) {
        await supabase.from('historico_pagamentos').delete().eq('id', id);
        carregarDados();
      }
    } else { alert("Senha incorreta."); }
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
    if (prompt(`ATENÇÃO: Você vai deletar essa cobrança de TODOS os alunos que a receberam juntos.\n\nDigite a Senha Mestra:`) === SENHA_MESTRA) {
      if (confirm(`Confirmar exclusão definitiva do lote: "${item.descricao}"?`)) {
        try {
          const { error } = await supabase.from('historico_pagamentos').delete().eq('tipo', item.tipo).eq('mes_referencia', item.mes_referencia).eq('descricao', item.descricao);
          if (error) throw error;
          alert("Todo o lote foi removido com sucesso!");
          carregarDados();
        } catch (e: any) { alert("Erro ao remover o lote: " + e.message); }
      }
    } else { alert("Senha incorreta."); }
  }

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

  // --- EDICÃO EM LOTE E TAXA AVULSA ---
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
    const dataSeguraLote = taxaAvulsa.data_pagamento && taxaAvulsa.data_pagamento !== "" ? taxaAvulsa.data_pagamento : new Date().toISOString().split('T')[0];

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

  // --- TRATAMENTO E FILTROS DE LISTAGENS ---
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

  // --- CÁLCULO DE MÉTRICAS DE UNIFORMES / TAXAS ---
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

  if (verificandoAcesso || carregando) {
    return <div className="p-10 text-center text-slate-400 font-bold uppercase tracking-widest animate-pulse">Carregando controle financeiro integrado...</div>;
  }

  return (
    <div className="w-full bg-slate-50 min-h-screen relative font-sans antialiased text-slate-800 pb-24 md:pb-8">
      
      {/* HEADER CENTRALIZADO COM SELETOR DE ABAS */}
      <div className="mb-8 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">💰 Caixa Executivo & Faturamentos</h1>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">Escola ABC do Park — Gestão Unificada</p>
        </div>

        {/* CONTROLE DE ABAS MODERNO */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner w-full md:w-auto">
          <button
            onClick={() => setAbaAtiva("eventos")}
            className={`flex-1 md:flex-none px-6 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
              abaAtiva === "eventos" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            🎟️ Eventos & Gincanas
          </button>
          <button
            onClick={() => setAbaAtiva("vendas_taxas")}
            className={`flex-1 md:flex-none px-6 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
              abaAtiva === "vendas_taxas" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            🛍️ Uniformes & Taxas Matrícula
          </button>
        </div>
      </div>

      {/* PAINEL DINÂMICO CONFORME ABA SELECIONADA */}
      {abaAtiva === "eventos" ? (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Arrecadações Pedagógicas</h2>
              <p className="text-xs text-slate-400">Gerencie passeios, gincanas e festas sazonais</p>
            </div>
            <button
              onClick={() => {
                if (userEmail !== 'carlamonaliza9@gmail.com' && userCargo !== 'Admin') return alert("Ação restrita ao perfil de Administrador.");
                setIdEventoEdicao(null); setNomeEvento(""); setValorEvento(""); setAlunosSelecionados([]); setModalEventoAberto(true);
              }}
              className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm transition-all"
            >
              + Estruturar Novo Evento
            </button>
          </div>

          <GestaoEventos 
            eventosAtivos={eventosAtivos} eventoParaGerenciar={eventoParaGerenciar} setEventoParaGerenciar={setEventoParaGerenciar}
            alunos={alunos} historicoPagamentosEventos={historicoPagamentosEventos}
            onEditarEvento={(ev) => {
              if (userEmail !== 'carlamonaliza9@gmail.com' && userCargo !== 'Admin') return alert("Ação restrita ao perfil de Administrador.");
              setIdEventoEdicao(ev.id); setNomeEvento(ev.nome); setValorEvento(ev.valor_unitario.toString()); setModalEventoAberto(true);
            }}
            onExcluirEvento={async (id) => { 
              if (userEmail !== 'carlamonaliza9@gmail.com') return alert("Apenas a Carla Monaliza pode excluir eventos.");
              if (prompt("Digite a Senha Mestra:") === SENHA_MESTRA) {
                if(confirm("Excluir evento e todos os pagamentos registrados para ele?")) { 
                  const evento = eventosAtivos.find((e: any) => e.id === id);
                  if (evento) await supabase.from('historico_pagamentos').delete().eq('tipo', 'evento').like('descricao', `%${evento.nome}%`);
                  await supabase.from('eventos_controle').delete().eq('id', id); 
                  carregarDados(); 
                }
              } else { alert("Senha incorreta."); }
            }}
            onGerarPDF={() => {}} 
            onAtualizarParticipante={async (alunoId, part) => {
              if (userEmail !== 'carlamonaliza9@gmail.com' && userCargo !== 'Admin') return alert("Ação restrita ao perfil de Administrador.");
              const novos = part ? [...(eventoParaGerenciar.participantes || []), alunoId] : (eventoParaGerenciar.participantes || []).filter((id: string) => id !== alunoId);
              await supabase.from('eventos_controle').update({ participantes: novos, total_alunos: novos.length }).eq('id', eventoParaGerenciar.id);
              setEventoParaGerenciar({ ...eventoParaGerenciar, participantes: novos, total_alunos: novos.length });
              carregarDados();
            }}
            onAbrirPagamento={(aluno, ev, pgto) => {
              if (pgto && (userEmail !== 'carlamonaliza9@gmail.com' || prompt("Senha Mestra para Editar:") !== SENHA_MESTRA)) return alert("Acesso negado.");
              setAlunoSelecionado(aluno); setEventoParaGerenciar(ev); setTipoPagamento("evento");
              if (pgto) { 
                setIdPagamentoEdicao(pgto.id); 
                setPagamentosMetodos({
                  pix: "", dinheiro: "", credito: "", debito: "", multa: "", credito_aluno: "", boleto: "",
                  pix_editora: "", credito_editora: "", debito_editora: "", parcelas: "1", desconto: "",
                  ...(pgto.detalhes_metodos || {})
                }); 
                setDescricaoOutro(pgto.descricao); 
              } else { 
                setIdPagamentoEdicao(null); 
                setPagamentosMetodos({ pix: ev.valor_unitario.toString(), dinheiro: "", credito: "", debito: "", multa: "", credito_aluno: "", boleto: "", pix_editora: "", credito_editora: "", debito_editora: "", parcelas: "1", desconto: "" }); 
                setDescricaoOutro(`Evento: ${ev.nome}`); 
              }
              setModalPgtoAberto(true);
            }}
            onExcluirPagamento={handleExcluirReceita}
          />
        </div>
      ) : (
        <div className="space-y-6 animate-fadeIn">
          {/* CARDS INDICADORES E CONTRATOS */}
          <CardMetricas 
            totalPecasAno={totalPecasAno} camisasVendidas={camisasVendidas} inferioresVendidos={inferioresVendidos} casacosVendidos={casacosVendidos}
            hCamisas={hCamisas} hInferiores={hInferiores} hCasacos={hCasacos} pagoMaterial={pagoMaterial} totalMaterial={totalMaterial}
            pctMaterial={pctMaterial} faltamMaterial={faltamMaterial} pagoLivros={pagoLivros} totalLivros={totalLivros} pctLivros={pctLivros}
            faltamLivros={faltamLivros} setModalUniformeAberto={setModalUniformeAberto} setModalTaxasAberto={setModalTaxasAberto} setModalTaxaAvulsaAberto={setModalTaxaAvulsaAberto}
          />

          {/* TABELAS DE GERENCIAMENTO EXCLUSIVAS DA SEGUNDA ABA */}
          <TabelaUniformes 
            uniformesFiltrados={uniformesFiltrados} alunos={alunos} buscaUniforme={buscaUniforme}
            setBuscaUniforme={setBuscaUniforme} handleIniciarEdicao={handleIniciarEdicao} handleExcluirRegistro={handleExcluirRegistro}
          />

          <TabelaTaxas 
            taxasFiltradas={taxasFiltradas} taxasSelecionadas={taxasSelecionadas} alunos={alunos} buscaTaxa={buscaTaxa} setBuscaTaxa={setBuscaTaxa}
            toggleSelectAllTaxas={() => {
              if (taxasSelecionadas.length === taxasFiltradas.length && taxasFiltradas.length > 0) setTaxasSelecionadas([]);
              else setTaxasSelecionadas(taxasFiltradas.map(t => t.id));
            }} 
            toggleSelecaoTaxa={(id) => setTaxasSelecionadas(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])} 
            handleIniciarEdicao={handleIniciarEdicao}
            handleExcluirLoteCompleto={handleExcluirLoteCompleto} setModalEdicaoLoteAberto={setModalEdicaoLoteAberto}
            handleExcluirLoteSelecionado={handleExcluirLoteSelecionado} setTaxasSelecionadas={setTaxasSelecionadas}
          />
        </div>
      )}

      {/* MODAL DE RECEBIMENTO COMPARTILHADO */}
      <ModalPagamento 
        aberto={modalPgtoAberto} onFechar={() => setModalPgtoAberto(false)}
        aluno={alunoSelecionado} dataPagamento={dataPagamento} setDataPagamento={setDataPagamento}
        tipoPagamento={tipoPagamento} setTipoPagamento={setTipoPagamento}
        mesReferencia={mesReferencia} setMesReferencia={setMesReferencia} mesesAno={mesesAno}
        descricaoOutro={descricaoOutro} setDescricaoOutro={setDescricaoOutro}
        pagamentosMetodos={pagamentosMetodos} setPagamentosMetodos={setPagamentosMetodos}
        onConfirmar={confirmarPagamento} editando={!!idPagamentoEdicao}
      />

      {/* MODAIS COMPLEMENTARES DE ACORDO COM AS FUNÇÕES ORIGINAIS */}
      <ModalEvento 
        aberto={modalEventoAberto} onFechar={() => setModalEventoAberto(false)}
        idEventoEdicao={idEventoEdicao} nomeEvento={nomeEvento} setNomeEvento={setNomeEvento}
        valorEvento={valorEvento} setValorEvento={setValorEvento}
        alunos={alunos} alunosSelecionados={alunosSelecionados}
        toggleAlunoSelecao={(id) => setAlunosSelecionados(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id])}
        toggleSelecionarTodos={() => setAlunosSelecionados(alunosSelecionados.length === alunos.length ? [] : alunos.map(a => a.id))}
        onSalvar={salvarEvento}
      />

      <ModalUniforme aberto={modalUniformeAberto} onFechar={() => setModalUniformeAberto(false)} alunos={alunos} carregarDados={carregarDados} />
      <ModalTaxas aberto={modalTaxasAberto} onFechar={() => setModalTaxasAberto(false)} alunos={alunos} carregarDados={carregarDados} />

      <ModaisInline 
        modalEdicaoLoteAberto={modalEdicaoLoteAberto} setModalEdicaoLoteAberto={setModalEdicaoLoteAberto} dadosEdicaoLote={dadosEdicaoLote}
        setDadosEdicaoLote={setDadosEdicaoLote} handleEditarLote={handleEditarLote} taxasSelecionadas={taxasSelecionadas}
        modalTaxaAvulsaAberto={modalTaxaAvulsaAberto} setModalTaxaAvulsaAberto={setModalTaxaAvulsaAberto} taxaAvulsa={taxaAvulsa}
        setTaxaAvulsa={setTaxaAvulsa} alunos={alunos} handleLancarTaxaAvulsa={handleLancarTaxaAvulsa}
      />
      
      {/* SCOPE STYLES INTEGRADOS */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.25s ease-out forwards; }
      `}} />
    </div>
  );
}