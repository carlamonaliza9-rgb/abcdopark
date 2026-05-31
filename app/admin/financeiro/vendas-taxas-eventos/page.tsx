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
  const [dataEvento, setDataEvento] = useState(new Date().toISOString().split('T')[0]); 
  const [alunosSelecionados, setAlunosSelecionados] = useState<string[]>([]);

  // --- ESTADOS DE FORMULÁRIOS DE TAXAS/LOTE ---
  const [dadosEdicaoLote, setDadosEdicaoLote] = useState({ valor_total: "", data_pagamento: "" });
  const [taxaAvulsa, setTaxaAvulsa] = useState({ 
    aluno_id: "", tipo: "material", valor_total: "", 
    data_pagamento: new Date().toISOString().split('T')[0], mes_referencia: "Anual" 
  });

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

      const { data: listaEventos } = await supabase.from('eventos_controle').select('*').eq('arquivado', false).order('created_at', { ascending: false });
      if (listaEventos) setEventosAtivos(listaEventos);

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

  // --- REDIRECIONAMENTO DIRETO PARA O PDV ---
  function handleIniciarEdicao(pgto: any) {
    router.push(`/admin/pdv?alunoId=${pgto.aluno_id}`);
  }

  // --- CRIAÇÃO DE EVENTOS CONTROLE ---
  async function salvarEvento() {
    if (userEmail !== 'carlamonaliza9@gmail.com' && userCargo !== 'Admin') {
      return alert("A direção não possui permissão para estruturar ou alterar eventos.");
    }
    if (!nomeEvento || !valorEvento || (!idEventoEdicao && alunosSelecionados.length === 0)) return alert("Preencha todos os campos obrigatórios.");
    
    const dados = { 
      nome: nomeEvento, 
      valor_unitario: parseFloat(valorEvento),
      data_evento: dataEvento,
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
    if (userEmail !== 'carlamonaliza9@gmail.com') return alert("Apenas a Carla possui permissão para exclusão in lote.");
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
        alert("Cobranças updated com sucesso!");
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

  // --- CÁLCULO DE MÉTRICAS (UNIFORMES / TAXAS) ---
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

  // --- CÁLCULO DE MÉTRICAS (EVENTOS) ---
  const totalEventosAtivos = eventosAtivos.length;
  const totalAlunosParticipantes = eventosAtivos.reduce((acc, ev) => acc + (ev.participantes?.length || 0), 0);
  const arrecadacaoEsperadaEventos = eventosAtivos.reduce((acc, ev) => acc + ((ev.participantes?.length || 0) * (parseFloat(ev.valor_unitario) || 0)), 0);
  const arrecadacaoPagaEventos = historicoPagamentosEventos.filter(p => p.status === 'pago' || p.status === 'parcial').reduce((acc, p) => acc + (parseFloat(p.valor_pago) || 0), 0);
  const pctArrecadacaoEventos = arrecadacaoEsperadaEventos > 0 ? Math.round((arrecadacaoPagaEventos / arrecadacaoEsperadaEventos) * 100) : 0;

  // Formatador de data local pt-BR
  const formatarData = (dataStr: string) => {
    if (!dataStr) return "Sem data";
    const partes = dataStr.split('-');
    if (partes.length !== 3) return dataStr;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  };

  if (verificandoAcesso || carregando) {
    return <div className="p-10 text-center text-slate-400 font-bold uppercase tracking-widest animate-pulse">Carregando controle financeiro integrado...</div>;
  }

  return (
    <div className="w-full bg-slate-50 min-h-screen relative font-sans antialiased text-slate-800 pb-24 md:pb-8 hide-on-print-setup">
      
      {/* HEADER CENTRALIZADO COM SELETOR DE ABAS */}
      <div className="mb-8 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:border-none print:shadow-none">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">💰 Caixa & Faturamentos</h1>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">Escola ABC do Park — Gestão Unificada</p>
        </div>

        {/* CONTROLE DE ABAS MODERNO */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner w-full md:w-auto print:hidden">
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
            🛍️ Uniformes & Taxas
          </button>
        </div>
      </div>

      {/* PAINEL DINÂMICO CONFORME ABA SELECIONADA */}
      {abaAtiva === "eventos" ? (
        <div className="space-y-6 animate-fadeIn">
          
          {/* HEADER DE CONTROLE DOS EVENTOS COM BOTÕES ATUALIZADOS */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-5 rounded-2xl border border-slate-100 shadow-sm gap-4 print:border-none print:shadow-none">
            <div>
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Arrecadações Pedagógicas</h2>
              <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mt-1">Visão Geral de Gincanas e Passeios</p>
            </div>
            <div className="flex flex-wrap gap-2 w-full md:w-auto print:hidden">
              <button 
                onClick={() => window.print()} 
                className="flex-1 md:flex-none px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition-all text-center flex items-center justify-center gap-2 border border-slate-700"
              >
                📄 Gerar Relatório PDF
              </button>
              <button
                onClick={() => {
                  if (userEmail !== 'carlamonaliza9@gmail.com' && userCargo !== 'Admin') return alert("Ação restrita ao perfil de Administrador.");
                  setIdEventoEdicao(null); 
                  setNomeEvento(""); 
                  setValorEvento(""); 
                  setDataEvento(new Date().toISOString().split('T')[0]);
                  setAlunosSelecionados([]); 
                  setModalEventoAberto(true);
                }}
                className="flex-1 md:flex-none px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-sm transition-all"
              >
                + Novo Evento
              </button>
            </div>
          </div>
          
          {/* VISUAL REESTRUTURADO: DETALHES DE CADA EVENTO E GRÁFICOS COM DADOS REAIS */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">📊 Painel Analítico & Gastos por Evento</h3>
              <p className="text-xs text-slate-400 uppercase mt-0.5">Indicadores financeiros baseados inteiramente em dados reais do banco de dados</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {eventosAtivos.map((ev) => {
                const totalInscritos = ev.participantes?.length || 0;
                const alvoFinanceiro = totalInscritos * (parseFloat(ev.valor_unitario) || 0);
                
                // Filtra as receitas coletadas reais do histórico de pagamentos
                const receitaColetada = historicoPagamentosEventos
                  .filter(p => p.descricao?.toLowerCase().includes(ev.nome?.toLowerCase()) && (p.status === 'pago' || p.status === 'parcial'))
                  .reduce((acc, p) => acc + (parseFloat(p.valor_pago) || 0), 0);
                
                // Puxa estritamente o dado real da tabela
                const despesasReais = ev.gastos ? parseFloat(ev.gastos) : 0;
                const lucroLiquido = receitaColetada - despesasReais;

                const percentualArrecadado = alvoFinanceiro > 0 ? Math.min(100, Math.round((receitaColetada / alvoFinanceiro) * 100)) : 0;
                const percentualGastos = alvoFinanceiro > 0 ? Math.min(100, Math.round((despesasReais / alvoFinanceiro) * 100)) : 0;

                return (
                  <div key={ev.id} className="bg-slate-50 border border-slate-200/60 p-5 rounded-2xl shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all">
                    <div>
                      <div className="flex justify-between items-start gap-2 mb-3">
                        <div>
                          <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">{ev.nome}</h4>
                          <div className="flex flex-wrap gap-2 mt-1.5">
                            <span className="inline-block px-2.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider rounded-md border border-blue-200">
                              📅 Data: {formatarData(ev.data_evento)}
                            </span>
                            {/* BOTÃO INTEGRADO PARA LANÇAR GASTOS REAIS */}
                            <button
                              onClick={async () => {
                                if (userEmail !== 'carlamonaliza9@gmail.com' && userCargo !== 'Admin') {
                                  return alert("Ação restrita ao perfil de Administrador.");
                                }
                                const valor = prompt(`Definir valor total de gastos reais para "${ev.nome}":`, ev.gastos?.toString() || "0");
                                if (valor !== null) {
                                  const numGasto = parseFloat(valor.replace(',', '.'));
                                  if (!isNaN(numGasto)) {
                                    await supabase.from('eventos_controle').update({ gastos: numGasto }).eq('id', ev.id);
                                    carregarDados();
                                  } else {
                                    alert("Valor monetário inválido.");
                                  }
                                }
                              }}
                              className="px-2.5 py-0.5 bg-amber-50 text-amber-700 hover:bg-amber-100 text-[10px] font-bold uppercase tracking-wider rounded-md border border-amber-200 transition-all print:hidden"
                            >
                              💸 Lançar Custo Gasto
                            </button>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Alunos Envolvidos</p>
                          <p className="text-lg font-black text-slate-800">{totalInscritos} <span className="text-xs text-slate-400 font-normal">Alunos</span></p>
                        </div>
                      </div>

                      {/* GRÁFICOS REAIS SEM PLACEHOLDERS */}
                      <div className="space-y-3 my-4 bg-white p-4 rounded-xl border border-slate-200/50">
                        <div>
                          <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                            <span className="uppercase">💰 Caixa Coletado Real ({percentualArrecadado}%)</span>
                            <span>R$ {receitaColetada.toFixed(2).replace('.', ',')} / R$ {alvoFinanceiro.toFixed(2).replace('.', ',')}</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${percentualArrecadado}%` }}></div>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                            <span className="uppercase">📉 Custos e Gastos Efetivos</span>
                            <span className="text-red-600 font-black">R$ {despesasReais.toFixed(2).replace('.', ',')}</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div className="bg-red-500 h-2 rounded-full transition-all" style={{ width: `${percentualGastos}%` }}></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* BALANÇO FINANCEIRO FINAL */}
                    <div className="pt-3 border-t border-slate-200 flex justify-between items-center bg-slate-100/50 -mx-5 -mb-5 p-4 rounded-b-2xl">
                      <span className="text-xs text-slate-500 uppercase font-black">💵 Lucro Líquido Realizado:</span>
                      <span className={`text-sm font-black ${lucroLiquido >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        R$ {lucroLiquido.toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  </div>
                );
              })}
              {eventosAtivos.length === 0 && (
                <div className="col-span-full text-center py-8 text-slate-400 font-medium text-sm bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  Nenhum evento ativo estruturado no momento.
                </div>
              )}
            </div>
          </div>

          <GestaoEventos 
            eventosAtivos={eventosAtivos} eventoParaGerenciar={eventoParaGerenciar} setEventoParaGerenciar={setEventoParaGerenciar}
            alunos={alunos} historicoPagamentosEventos={historicoPagamentosEventos}
            onEditarEvento={(ev) => {
              if (userEmail !== 'carlamonaliza9@gmail.com' && userCargo !== 'Admin') return alert("Ação restrita ao perfil de Administrador.");
              setIdEventoEdicao(ev.id); 
              setNomeEvento(ev.nome); 
              setValorEvento(ev.valor_unitario.toString()); 
              setDataEvento(ev.data_evento || new Date().toISOString().split('T')[0]);
              setAlunosSelecionados(ev.participantes || []);
              setModalEventoAberto(true);
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
            onGerarPDF={() => window.print()} 
            onAtualizarParticipante={async (alunoId, part) => {
              if (userEmail !== 'carlamonaliza9@gmail.com' && userCargo !== 'Admin') return alert("Ação restrita ao perfil de Administrador.");
              const novos = part ? [...(eventoParaGerenciar.participantes || []), alunoId] : (eventoParaGerenciar.participantes || []).filter((id: string) => id !== alunoId);
              await supabase.from('eventos_controle').update({ participantes: novos, total_alunos: novos.length }).eq('id', eventoParaGerenciar.id);
              setEventoParaGerenciar({ ...eventoParaGerenciar, participantes: novos, total_alunos: novos.length });
              carregarDados();
            }}
            onAbrirPagamento={(aluno) => {
              // REDIRECIONAMENTO DIRETO PARA O PDV
              router.push(`/admin/pdv?alunoId=${aluno.id}`);
            }}
            onExcluirPagamento={handleExcluirReceita}
          />
        </div>
      ) : (
        <div className="space-y-6 animate-fadeIn">
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

      {/* MODAL DE EVENTO REACESSANDO DATAS CORRETAMENTE */}
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
      
      {/* SCOPE STYLES INTEGRADOS & CONTROLE AVANÇADO DE IMPRESSÃO (PDF) */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.25s ease-out forwards; }
        
        @media print {
          body { background: #fff !important; color: #000 !important; font-size: 12px; }
          .print\\:hidden, button, .print\\:hidden *, button * { display: none !important; }
          .hide-on-print-setup { background: white !important; padding: 0 !important; }
          .animate-fadeIn { position: absolute; left: 0; top: 0; width: 100%; padding: 0; margin: 0; box-shadow: none !important; transform: none !important; }
          .bg-slate-50, .bg-slate-100\\/50, .bg-white { background: #ffffff !important; border: 1px solid #e2e8f0 !important; }
          .w-full.bg-slate-100 { border: 1px solid #94a3b8 !important; background: #f1f5f9 !important; }
        }
      `}} />
    </div>
  );
}