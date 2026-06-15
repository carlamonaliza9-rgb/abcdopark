"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { removerAcentos } from "@/lib/utils";
import { Tag, PieChart as PieChartIcon } from "lucide-react";

// --- IMPORTAÇÕES DOS COMPONENTES DE UNIFORMES E TAXAS ---
import { ModalUniforme } from "@/app/(sistema)/dashboard/financeiro/_components/ModalUniforme";
import { ModalTaxas } from "@/app/(sistema)/dashboard/financeiro/_components/ModalTaxas";


// --- IMPORTAÇÕES DOS COMPONENTES (AGORA TODOS UNIFICADOS) ---
import { CardMetricas } from "./_components/CardMetricas";
import { TabelaUniformes } from "./_components/TabelaUniformes";
import { TabelaTaxas } from "./_components/TabelaTaxas";
import { ModaisInline } from "./_components/ModaisInline";

import { CardEvento } from "./_components/CardEvento";
import { ModalSetupEvento } from "./_components/ModalSetupEvento";
import { ModalLancamentoCaixa } from "./_components/ModalLancamentoCaixa";
import { ModalDetalhesExtrato } from "./_components/ModalDetalhesExtrato";
import { ModalRelatorioEvento } from "./_components/ModalRelatorioEvento";

// FUNÇÃO BLINDADA DE CONVERSÃO FINANCEIRA
function parseCurrency(val: any) {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  const str = String(val).replace(/\./g, '').replace(',', '.').replace(/\s/g, '');
  return parseFloat(str) || 0;
}

// Extrator seguro para evitar o bug do JSON Texto vs Objeto
const getDetalhes = (t: any) => {
  if (!t || !t.detalhes_metodos) return {};
  if (typeof t.detalhes_metodos === 'string') {
      try { return JSON.parse(t.detalhes_metodos); } catch { return {}; }
  }
  return t.detalhes_metodos;
};

interface CategoriaPreco {
  nome: string;
  valor: number;
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

  // --- ESTADOS DE CONTROLE DE MODAIS (Uniformes/Taxas) ---
  const [modalUniformeAberto, setModalUniformeAberto] = useState(false);
  const [modalTaxasAberto, setModalTaxasAberto] = useState(false);
  const [modalEdicaoLoteAberto, setModalEdicaoLoteAberto] = useState(false);
  const [modalTaxaAvulsaAberto, setModalTaxaAvulsaAberto] = useState(false);

  const [dadosEdicaoLote, setDadosEdicaoLote] = useState({ valor_total: "", data_pagamento: "" });
  const [taxaAvulsa, setTaxaAvulsa] = useState({ 
    aluno_id: "", tipo: "material", valor_total: "", 
    data_pagamento: new Date().toISOString().split('T')[0], mes_referencia: "Anual" 
  });

  // --- ESTADOS PARA O SUPER PAINEL DE EVENTOS ---
  const [modalSetupAberto, setModalSetupAberto] = useState(false);
  const [modalLancamentoAberto, setModalLancamentoAberto] = useState(false);
  const [modalDetalhesAberto, setModalDetalhesAberto] = useState(false);
  const [modalRelatorioAberto, setModalRelatorioAberto] = useState(false);
  
  const [detalhesEventoId, setDetalhesEventoId] = useState("");
  const [detalhesTipo, setDetalhesTipo] = useState<'entrada' | 'saida'>('entrada');
  const [eventoRelatorio, setEventoRelatorio] = useState<any>(null);

  const [idEdicaoEvento, setIdEdicaoEvento] = useState<string | null>(null);
  const [nomeEvento, setNomeEvento] = useState("");
  const [dataEvento, setDataEvento] = useState(new Date().toISOString().split('T')[0]);
  
  const [tagsEntrada, setTagsEntrada] = useState<CategoriaPreco[]>([{ nome: "Ingressos", valor: 0 }, { nome: "Votos", valor: 0 }]);
  const [tagsSaida, setTagsSaida] = useState<CategoriaPreco[]>([{ nome: "Decoração", valor: 0 }]);
  const [equipes, setEquipes] = useState<string[]>([]);
  const [alunosSelecionadosEvento, setAlunosSelecionadosEvento] = useState<string[]>([]);
  
  const [tagNomeInput, setTagNomeInput] = useState("");
  const [tagValorInput, setTagValorInput] = useState("");
  const [equipeInput, setEquipeInput] = useState("");
  const [tagTipoFoco, setTagTipoFoco] = useState<'entrada' | 'saida' | 'equipe'>('entrada');

  const [eventoSelecionadoId, setEventoSelecionadoId] = useState("");
  const [tipoLancamento, setTipoLancamento] = useState<'entrada' | 'saida'>('entrada');
  const [categoriaSelecionada, setCategoriaSelecionada] = useState("");
  const [valorLancamento, setValorLancamento] = useState("");
  const [quantidadeLancamento, setQuantidadeLancamento] = useState(""); 
  const [descricaoLancamento, setDescricaoLancamento] = useState("");
  const [dataLancamento, setDataLancamento] = useState(new Date().toISOString().split('T')[0]);
  const [alunoVinculado, setAlunoVinculado] = useState("");
  const [equipeSelecionada, setEquipeSelecionada] = useState("");

  const SENHA_MESTRA = "1234";

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
      const { data: listaAlunos } = await supabase.from('alunos').select('*');
      if (listaAlunos) {
        const ordemHierarquicaTurmas = ["maternal", "jardim", "jardim i", "jardim ii", "jardim 1", "jardim 2", "1º ano", "2º ano", "3º ano", "4º ano", "5º ano"];
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
        .in('tipo', ['evento', 'evento_entrada', 'evento_saida', 'uniforme', 'livro', 'material']);

      if (todosPgtos) {
        todosPgtos.sort((a, b) => new Date(b.created_at || b.data_pagamento).getTime() - new Date(a.created_at || a.data_pagamento).getTime());
        setHistoricoPagamentosEventos(todosPgtos.filter(p => p.tipo === 'evento' || p.tipo === 'evento_entrada' || p.tipo === 'evento_saida'));
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

  const normalizarCategorias = (cats: any[]): CategoriaPreco[] => {
    if (!cats) return [];
    return cats.map(c => typeof c === 'string' ? { nome: c, valor: 0 } : c);
  };

  const adicionarCategoriaOuEquipe = () => {
    if (tagTipoFoco === 'equipe') {
      const nomeLimpo = equipeInput.trim();
      if (!nomeLimpo) return;
      if (!equipes.includes(nomeLimpo)) setEquipes([...equipes, nomeLimpo]);
      setEquipeInput("");
      return;
    }
    const nomeLimpo = tagNomeInput.trim();
    if (!nomeLimpo) return;
    const valorFloat = parseFloat(tagValorInput.replace(',', '.')) || 0;
    const novaCat = { nome: nomeLimpo, valor: valorFloat };

    if (tagTipoFoco === 'entrada') setTagsEntrada([...tagsEntrada.filter(t => t.nome !== nomeLimpo), novaCat]);
    else setTagsSaida([...tagsSaida.filter(t => t.nome !== nomeLimpo), novaCat]);
    
    setTagNomeInput("");
    setTagValorInput("");
  };

  const removerCategoria = (tipo: 'entrada' | 'saida' | 'equipe', nome: string) => {
    if (tipo === 'entrada') setTagsEntrada(tagsEntrada.filter(t => t.nome !== nome));
    else if (tipo === 'saida') setTagsSaida(tagsSaida.filter(t => t.nome !== nome));
    else setEquipes(equipes.filter(e => e !== nome));
  };

  async function salvarSetupEvento() {
    if (userEmail !== 'carlamonaliza9@gmail.com' && userCargo !== 'Admin') return alert("Acesso restrito.");
    if (!nomeEvento) return alert("O nome do evento é obrigatório.");

    const payload = {
      nome: nomeEvento, data_evento: dataEvento, categorias_entrada: tagsEntrada, categorias_saida: tagsSaida,
      equipes: equipes, arquivado: false, participantes: alunosSelecionadosEvento, total_alunos: alunosSelecionadosEvento.length, valor_unitario: 0 
    };

    try {
      if (idEdicaoEvento) {
        const { error } = await supabase.from('eventos_controle').update(payload).eq('id', idEdicaoEvento);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('eventos_controle').insert([payload]);
        if (error) throw error;
      }
      alert("✅ Estrutura do evento salva com sucesso!");
      setModalSetupAberto(false);
      carregarDados();
    } catch (err: any) { alert("⚠️ Erro ao salvar no banco: " + err.message); }
  }

  async function encerrarEventoDefinitivamente(id: string) {
    if (prompt(`Para encerrar o evento e travar os lançamentos, digite a Senha Mestra:`) !== SENHA_MESTRA) return alert("Senha incorreta.");
    if (confirm("Confirmar o fechamento deste evento? Todos os botões de controle e lançamentos serão desativados.")) {
      try {
        const { error } = await supabase.from('eventos_controle').update({ encerrado: true }).eq('id', id);
        if (error) throw error;
        alert("🔒 Evento encerrado com sucesso!");
        carregarDados();
      } catch (err: any) { alert("Erro ao encerrar: " + err.message); }
    }
  }

  // --- NOVA FUNÇÃO: REABRIR EVENTO ---
  async function reabrirEvento(id: string) {
    if (prompt(`Para REABRIR este evento, digite a Senha Mestra:`) !== SENHA_MESTRA) return alert("Senha incorreta.");
    if (confirm("Confirmar a reabertura deste evento? Os lançamentos poderão ser feitos novamente.")) {
      try {
        const { error } = await supabase.from('eventos_controle').update({ encerrado: false }).eq('id', id);
        if (error) throw error;
        alert("🔓 Evento reaberto com sucesso!");
        carregarDados();
      } catch (err: any) { alert("Erro ao reabrir: " + err.message); }
    }
  }

  function prepararEdicaoSetup(ev: any) {
    if (ev.encerrado) return alert("Este evento está encerrado e não pode ser editado.");
    setIdEdicaoEvento(ev.id); setNomeEvento(ev.nome); setDataEvento(ev.data_evento || new Date().toISOString().split('T')[0]);
    setTagsEntrada(normalizarCategorias(ev.categorias_entrada)); setTagsSaida(normalizarCategorias(ev.categorias_saida));
    setEquipes(ev.equipes || []); setAlunosSelecionadosEvento(ev.participantes || []);
    setModalSetupAberto(true);
  }

  function abrirLancamento(eventoId: string, tipo: 'entrada' | 'saida') {
    const evento = eventosAtivos.find(e => String(e.id) === String(eventoId));
    if (!evento) return;
    if (evento.encerrado) return alert("Este evento está encerrado.");
    
    setEventoSelecionadoId(String(eventoId)); setTipoLancamento(tipo);
    const borderCategorias = normalizarCategorias(tipo === 'entrada' ? evento.categorias_entrada : evento.categorias_saida);
    
    if (borderCategorias.length > 0) {
      const primCat = borderCategorias[0];
      setCategoriaSelecionada(primCat.nome); setValorLancamento(primCat.valor > 0 ? primCat.valor.toString() : ""); setQuantidadeLancamento(primCat.valor > 0 ? "1" : "");
    } else {
      setCategoriaSelecionada(""); setValorLancamento(""); setQuantidadeLancamento("");
    }
    setDescricaoLancamento(""); setAlunoVinculado(""); setEquipeSelecionada("");
    setModalLancamentoAberto(true);
  }

  const getPrecoBaseCat = (nomeCat: string) => {
    const eventoObj = eventosAtivos.find(e => String(e.id) === String(eventoSelecionadoId));
    if (!eventoObj) return 0;
    const catList = normalizarCategorias(tipoLancamento === 'entrada' ? eventoObj.categorias_entrada : eventoObj.categorias_saida);
    const catDef = catList.find(c => c.nome === nomeCat);
    return catDef ? catDef.valor : 0;
  };

  const handleMudancaCategoria = (nomeCat: string) => {
    setCategoriaSelecionada(nomeCat);
    const precoBase = getPrecoBaseCat(nomeCat);
    if (precoBase > 0) { setValorLancamento(precoBase.toString()); setQuantidadeLancamento("1"); } 
    else { setValorLancamento(""); setQuantidadeLancamento(""); }
  };

  const handleQtdChange = (qtdStr: string) => {
    setQuantidadeLancamento(qtdStr);
    const qtd = parseFloat(qtdStr) || 0;
    const precoBase = getPrecoBaseCat(categoriaSelecionada);
    if (precoBase > 0) setValorLancamento((qtd * precoBase).toFixed(2));
  };

  const handleValorChange = (valStr: string) => {
    setValorLancamento(valStr);
    const val = parseFloat(valStr) || 0;
    const precoBase = getPrecoBaseCat(categoriaSelecionada);
    if (precoBase > 0) setQuantidadeLancamento((val / precoBase).toString());
  };

  async function registrarTransacao() {
    if (!valorLancamento || !categoriaSelecionada) return alert("Preencha o valor e a categoria.");
    const valorFloat = parseFloat(valorLancamento.replace(',', '.'));
    if (isNaN(valorFloat) || valorFloat <= 0) return alert("Valor inválido.");
    const qtdFloat = quantidadeLancamento ? parseFloat(quantidadeLancamento) : 1;

    const payload = {
      aluno_id: alunoVinculado ? parseInt(alunoVinculado) : null,
      tipo: 'evento', 
      descricao: `[${tipoLancamento.toUpperCase()}] ${categoriaSelecionada}${descricaoLancamento ? ' - ' + descricaoLancamento : ''}`,
      mes_referencia: 'Avulso', valor_total: valorFloat, valor_pago: valorFloat, status: 'pago',
      data_pagamento: dataLancamento || new Date().toISOString().split('T')[0],
      detalhes_metodos: { evento_id: String(eventoSelecionadoId), sub_tipo: tipoLancamento, categoria_tag: categoriaSelecionada, equipe_nome: equipeSelecionada, quantidade: qtdFloat }
    };

    try {
      const { error } = await supabase.from('historico_pagamentos').insert([payload]);
      if (error) throw error;
      alert("✅ Transação registrada com sucesso!");
      setModalLancamentoAberto(false);
      carregarDados();
    } catch (err: any) { alert("⚠️ Erro ao registrar transação: " + err.message); }
  }

  async function excluirTransacaoEvento(id: string) {
    if (prompt("Digite a Senha Mestra para EXCLUIR transação:") === SENHA_MESTRA) {
      await supabase.from('historico_pagamentos').delete().eq('id', id);
      carregarDados();
    } else { alert("Senha incorreta."); }
  }

  function abrirDetalhesTransacoes(eventoId: string, tipo: 'entrada' | 'saida') {
    setDetalhesEventoId(String(eventoId)); setDetalhesTipo(tipo); setModalDetalhesAberto(true);
  }

  function abrirRelatorioEvento(ev: any) {
    setEventoRelatorio(ev); setModalRelatorioAberto(true);
  }

  const renderDonutChart = (distribuicao: Record<string, number>, total: number, cores: string[]) => {
    if (total === 0) return <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-black text-slate-300 uppercase tracking-widest border-4 border-white shadow-inner shrink-0">Vazio</div>;
    let currentAngle = 0;
    const gradientStops = Object.entries(distribuicao).map(([tag, valor], index) => {
      const percentage = (Number(valor) / total) * 100;
      const cor = cores[index % cores.length];
      const start = currentAngle; const end = currentAngle + percentage;
      currentAngle = end;
      return `${cor} ${start}% ${end}%`;
    }).join(', ');

    return (
      <div className="w-20 h-20 md:w-24 md:h-24 rounded-full shadow-sm relative flex items-center justify-center shrink-0" style={{ background: `conic-gradient(${gradientStops})` }}>
        <div className="w-12 h-12 md:w-16 md:h-16 bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
          <PieChartIcon size={16} className="text-slate-300" />
        </div>
      </div>
    );
  };

  function handleIniciarEdicao(pgto: any) { router.push(`/admin/pdv?alunoId=${pgto.aluno_id}`); }

  async function handleExcluirRegistro(id: string) {
    if (userEmail !== 'carlamonaliza9@gmail.com') return alert("Apenas a Carla possui permissão para remover faturamentos.");
    if (prompt("Senha Mestra para REMOVER REGISTRO:") === SENHA_MESTRA) {
      if (confirm("Confirmar exclusão definitiva deste lançamento do histórico? Os saldos correntes serão recalculados.")) {
        await supabase.from('historico_pagamentos').delete().eq('id', id);
        alert("Lançamento removido!"); carregarDados();
      }
    } else { alert("Senha incorreta."); }
  }

  async function handleExcluirLoteCompleto(item: any) {
    if (userEmail !== 'carlamonaliza9@gmail.com') return alert("Apenas a Carla possui permissão para remover lotes inteiros.");
    if (prompt(`ATENÇÃO: Você vai deletar essa cobrança de TODOS os alunos que a receberam juntos.\n\nDigite a Senha Mestra:`) === SENHA_MESTRA) {
      if (confirm(`Confirmar exclusão definitiva do lote: "${item.descricao}"?`)) {
        try {
          await supabase.from('historico_pagamentos').delete().eq('tipo', item.tipo).eq('mes_referencia', item.mes_referencia).eq('descricao', item.descricao);
          alert("Todo o lote foi removido com sucesso!"); carregarDados();
        } catch (e: any) { alert("Erro ao remover o lote: " + e.message); }
      }
    } else { alert("Senha incorreta."); }
  }

  async function handleExcluirLoteSelecionado() {
    if (userEmail !== 'carlamonaliza9@gmail.com') return alert("Apenas a Carla possui permissão para exclusão in lote.");
    if (prompt("Senha Mestra para EXCLUIR SELECIONADOS:") === SENHA_MESTRA) {
      if (confirm(`Tem certeza que deseja excluir as ${taxasSelecionadas.length} cobranças marcadas?`)) {
        try {
          await supabase.from('historico_pagamentos').delete().in('id', taxasSelecionadas);
          alert("Itens selecionados excluídos!"); carregarDados();
        } catch (e: any) { alert("Erro ao excluir lote: " + e.message); }
      }
    } else { alert("Senha incorreta."); }
  }

  async function handleEditarLote() {
    if (userEmail !== 'carlamonaliza9@gmail.com') return alert("Apenas a Carla possui permissão para edição em lote.");
    if (prompt("Senha Mestra para EDITAR LOTE:") !== SENHA_MESTRA) return alert("Senha incorreta.");
    
    const updates: any = {};
    if (dadosEdicaoLote.valor_total) updates.valor_total = parseCurrency(dadosEdicaoLote.valor_total);
    if (dadosEdicaoLote.data_pagamento) updates.data_pagamento = dadosEdicaoLote.data_pagamento !== "" ? dadosEdicaoLote.data_pagamento : new Date().toISOString().split('T')[0];

    if (Object.keys(updates).length > 0) {
      try {
        await supabase.from('historico_pagamentos').update(updates).in('id', taxasSelecionadas);
        alert("Cobranças updated com sucesso!"); setModalEdicaoLoteAberto(false); carregarDados();
      } catch (e: any) { alert("Erro ao editar lote: " + e.message); }
    } else { alert("Nenhum dado informado para alteração."); }
  }

  async function handleLancarTaxaAvulsa() {
    if (!taxaAvulsa.aluno_id || !taxaAvulsa.valor_total) return alert("Por favor, selecione o aluno e informe o valor.");
    const dataSeguraLote = taxaAvulsa.data_pagamento && taxaAvulsa.data_pagamento !== "" ? taxaAvulsa.data_pagamento : new Date().toISOString().split('T')[0];

    try {
      const insertData = {
        aluno_id: taxaAvulsa.aluno_id, tipo: taxaAvulsa.tipo, descricao: taxaAvulsa.tipo === 'livro' ? 'Livros Didáticos (Matrícula)' : 'Taxa de Material Escolar (Matrícula)',
        valor_total: parseCurrency(taxaAvulsa.valor_total), valor_pago: 0, status: 'pendente', data_pagamento: dataSeguraLote, mes_referencia: taxaAvulsa.mes_referencia, detalhes_metodos: {}
      };
      await supabase.from('historico_pagamentos').insert([insertData]);
      alert("Taxa avulsa lançada com sucesso!"); setModalTaxaAvulsaAberto(false);
      setTaxaAvulsa({ aluno_id: "", tipo: "material", valor_total: "", data_pagamento: new Date().toISOString().split('T')[0], mes_referencia: "Anual" });
      carregarDados();
    } catch (e: any) { alert("Erro ao lançar taxa: " + e.message); }
  }

  const ordenarLista = (lista: any[]) => lista.sort((a, b) => {
    if (a.status === 'pago' && b.status !== 'pago') return 1;
    if (a.status !== 'pago' && b.status === 'pago') return -1;
    return (alunos.find(al => al.id === a.aluno_id)?.nome || "").localeCompare(alunos.find(al => al.id === b.aluno_id)?.nome || "");
  });

  const taxasFiltradas = ordenarLista(historicoTaxas.filter(item => removerAcentos((alunos.find(a => a.id === item.aluno_id)?.nome || "").toLowerCase()).includes(removerAcentos(buscaTaxa.toLowerCase()))));
  const uniformesFiltrados = ordenarLista(historicoUniformes.filter(item => removerAcentos((alunos.find(a => a.id === item.aluno_id)?.nome || "").toLowerCase()).includes(removerAcentos(buscaUniforme.toLowerCase()))));

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
          const qtyMatch = m.match(/(\d+)x/); const qty = qtyMatch ? parseInt(qtyMatch[1]) : 0;
          totalPecasAno += qty; const lowercase = m.toLowerCase();
          if (lowercase.includes('camisa')) camisasVendidas += qty; else if (lowercase.includes('casaco')) casacosVendidos += qty; else inferioresVendidos += qty;
        });
      }
    }
  });

  const maxPecas = Math.max(camisasVendidas, inferioresVendidos, casacosVendidos, 10);
  const hCamisas = (camisasVendidas / maxPecas) * 100; const hInferiores = (inferioresVendidos / maxPecas) * 100; const hCasacos = (casacosVendidos / maxPecas) * 100;

  if (verificandoAcesso || carregando) {
    return <div className="p-10 text-center text-slate-400 font-bold uppercase tracking-widest animate-pulse">Carregando controle financeiro integrado...</div>;
  }

  return (
    <div className="w-full bg-slate-50 min-h-screen relative font-sans antialiased text-slate-800 pb-24 md:pb-8 hide-on-print-setup">
      
      <div className="mb-8 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:border-none print:shadow-none print:hidden">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">💰 Caixa & Faturamentos</h1>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">Escola ABC do Park — Gestão Unificada</p>
        </div>

        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner w-full md:w-auto">
          <button onClick={() => setAbaAtiva("eventos")} className={`flex-1 md:flex-none px-6 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${abaAtiva === "eventos" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>🎟️ Eventos & Gincanas</button>
          <button onClick={() => setAbaAtiva("vendas_taxas")} className={`flex-1 md:flex-none px-6 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${abaAtiva === "vendas_taxas" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>🛍️ Uniformes & Taxas</button>
        </div>
      </div>

      {abaAtiva === "eventos" ? (
        <div className="space-y-6 animate-in fade-in duration-500">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-5 md:p-6 rounded-[2rem] border border-slate-100 shadow-sm gap-4 print:hidden">
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">🎟️ Gestão de Eventos e Gincanas</h2>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black mt-1">Planejamento Estratégico, Equipes e Fluxo de Caixa</p>
            </div>
            <button
              onClick={() => {
                setIdEdicaoEvento(null); setNomeEvento(""); setDataEvento(new Date().toISOString().split('T')[0]);
                setTagsEntrada([{ nome: "Ingressos", valor: 0 }, { nome: "Votos", valor: 0 }]); 
                setTagsSaida([{ nome: "Decoração", valor: 0 }, { nome: "Som", valor: 0 }]);
                setEquipes(["Equipe Azul", "Equipe Amarela"]); setAlunosSelecionadosEvento([]); setTagTipoFoco('entrada');
                setModalSetupAberto(true);
              }}
              className="w-full md:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-md transition-all active:scale-95"
            >
              + Configurar Novo Evento
            </button>
          </div>

          <div className="flex flex-col gap-8 print:hidden">
            {eventosAtivos.map(evento => (
              <CardEvento
                key={evento.id}
                evento={evento}
                historicoPagamentosEventos={historicoPagamentosEventos}
                parseCurrency={parseCurrency}
                getDetalhes={getDetalhes}
                renderDonutChart={renderDonutChart}
                prepararEdicaoSetup={prepararEdicaoSetup}
                abrirDetalhesTransacoes={abrirDetalhesTransacoes}
                abrirLancamento={abrirLancamento}
                abrirRelatorioEvento={abrirRelatorioEvento}
                encerrarEventoDefinitivamente={encerrarEventoDefinitivamente}
                reabrirEvento={reabrirEvento} // <--- Função passada para o componente
              />
            ))}
            
            {eventosAtivos.length === 0 && (
              <div className="w-full p-16 bg-white rounded-[2.5rem] border border-dashed border-slate-300 text-center shadow-sm print:hidden">
                <Tag size={56} className="mx-auto text-slate-300 mb-4 animate-bounce" />
                <h3 className="text-xl font-black text-slate-700">Nenhum evento estruturado</h3>
                <p className="text-sm font-bold text-slate-400 mt-2 max-w-md mx-auto">Clique em "Configurar Novo Evento" para começar a rastrear entradas e saídas e criar a bilheteria.</p>
              </div>
            )}
          </div>

          {/* --- INSERÇÃO DE TODOS OS MODAIS DE EVENTOS COMPONENTIZADOS --- */}
          <ModalSetupEvento 
            aberto={modalSetupAberto}
            onFechar={() => setModalSetupAberto(false)}
            nomeEvento={nomeEvento}
            setNomeEvento={setNomeEvento}
            dataEvento={dataEvento}
            setDataEvento={setDataEvento}
            tagTipoFoco={tagTipoFoco}
            setTagTipoFoco={setTagTipoFoco}
            equipeInput={equipeInput}
            setEquipeInput={setEquipeInput}
            tagNomeInput={tagNomeInput}
            setTagNomeInput={setTagNomeInput}
            tagValorInput={tagValorInput}
            setTagValorInput={setTagValorInput}
            tagsEntrada={tagsEntrada}
            tagsSaida={tagsSaida}
            equipes={equipes}
            alunosSelecionadosEvento={alunosSelecionadosEvento}
            setAlunosSelecionadosEvento={setAlunosSelecionadosEvento}
            alunos={alunos}
            adicionarCategoriaOuEquipe={adicionarCategoriaOuEquipe}
            removerCategoria={removerCategoria}
            salvarSetupEvento={salvarSetupEvento}
          />

          <ModalLancamentoCaixa 
            aberto={modalLancamentoAberto}
            onFechar={() => setModalLancamentoAberto(false)}
            tipoLancamento={tipoLancamento}
            eventoSelecionadoId={eventoSelecionadoId}
            eventosAtivos={eventosAtivos}
            categoriaSelecionada={categoriaSelecionada}
            handleMudancaCategoria={handleMudancaCategoria}
            quantidadeLancamento={quantidadeLancamento}
            handleQtdChange={handleQtdChange}
            valorLancamento={valorLancamento}
            handleValorChange={handleValorChange}
            equipeSelecionada={equipeSelecionada}
            setEquipeSelecionada={setEquipeSelecionada}
            alunoVinculado={alunoVinculado}
            setAlunoVinculado={setAlunoVinculado}
            alunos={alunos}
            descricaoLancamento={descricaoLancamento}
            setDescricaoLancamento={setDescricaoLancamento}
            registrarTransacao={registrarTransacao}
            normalizarCategorias={normalizarCategorias}
          />

          <ModalDetalhesExtrato 
            aberto={modalDetalhesAberto}
            onFechar={() => setModalDetalhesAberto(false)}
            detalhesTipo={detalhesTipo}
            detalhesEventoId={detalhesEventoId}
            eventosAtivos={eventosAtivos}
            historicoPagamentosEventos={historicoPagamentosEventos}
            alunos={alunos}
            getDetalhes={getDetalhes}
            excluirTransacaoEvento={excluirTransacaoEvento}
          />

          <ModalRelatorioEvento
            aberto={modalRelatorioAberto}
            onFechar={() => setModalRelatorioAberto(false)}
            eventoRelatorio={eventoRelatorio}
            alunos={alunos}
            historicoPagamentosEventos={historicoPagamentosEventos}
            parseCurrency={parseCurrency}
            getDetalhes={getDetalhes}
            renderDonutChart={renderDonutChart}
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

      <ModalUniforme aberto={modalUniformeAberto} onFechar={() => setModalUniformeAberto(false)} alunos={alunos} carregarDados={carregarDados} />
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