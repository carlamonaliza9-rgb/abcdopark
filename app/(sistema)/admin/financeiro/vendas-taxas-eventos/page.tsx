"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { removerAcentos } from "@/lib/utils";
import { PlusCircle, MinusCircle, Settings, Trash2, PieChart, Tag, ArrowUpRight, ArrowDownRight, X, Trophy, Users, Search, Printer, Lock, PieChart as PieChartIcon } from "lucide-react";

// Importações de Componentes de Uniformes e Taxas (MANTIDAS INTACTAS)
import { ModalUniforme } from "@/app/(sistema)/dashboard/financeiro/_components/ModalUniforme";
import { ModalTaxas } from "@/app/(sistema)/dashboard/financeiro/_components/ModalTaxas";
import { CardMetricas } from "@/app/(sistema)/admin/financeiro/vendas-taxas/_components/CardMetricas";
import { TabelaUniformes } from "@/app/(sistema)/admin/financeiro/vendas-taxas/_components/TabelaUniformes";
import { TabelaTaxas } from "@/app/(sistema)/admin/financeiro/vendas-taxas/_components/TabelaTaxas";
import { ModaisInline } from "@/app/(sistema)/admin/financeiro/vendas-taxas/_components/ModaisInline";

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

  // =========================================================================
  // --- NOVOS ESTADOS PARA O SUPER PAINEL DE EVENTOS ---
  // =========================================================================
  const [modalSetupAberto, setModalSetupAberto] = useState(false);
  const [modalLancamentoAberto, setModalLancamentoAberto] = useState(false);
  
  const [modalDetalhesAberto, setModalDetalhesAberto] = useState(false);
  const [detalhesEventoId, setDetalhesEventoId] = useState("");
  const [detalhesTipo, setDetalhesTipo] = useState<'entrada' | 'saida'>('entrada');

  const [modalRelatorioAberto, setModalRelatorioAberto] = useState(false);
  const [eventoRelatorio, setEventoRelatorio] = useState<any>(null);
  
  // ESTADO PARA ALTERNAR VISUALIZAÇÃO DO RESULTADO FINAL
  const [mostrarResultadoFinal, setMostrarResultadoFinal] = useState(false);

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
      nome: nomeEvento,
      data_evento: dataEvento,
      categorias_entrada: tagsEntrada,
      categorias_saida: tagsSaida,
      equipes: equipes,
      arquivado: false,
      participantes: alunosSelecionadosEvento,
      total_alunos: alunosSelecionadosEvento.length,
      valor_unitario: 0 
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
    } catch (err: any) {
      alert("⚠️ Erro ao salvar no banco: " + err.message);
    }
  }

  async function encerrarEventoDefinitivamente(id: string) {
    if (prompt(`Para encerrar o evento e travar os lançamentos, digite a Senha Mestra:`) !== SENHA_MESTRA) {
      return alert("Senha incorreta.");
    }
    if (confirm("Confirmar o fechamento deste evento? Todos os botões de controle e lançamentos serão desativados.")) {
      try {
        const { error } = await supabase.from('eventos_controle').update({ encerrado: true }).eq('id', id);
        if (error) throw error;
        alert("🔒 Evento encerrado com sucesso!");
        carregarDados();
      } catch (err: any) {
        alert("Erro ao encerrar: " + err.message);
      }
    }
  }

  function prepararEdicaoSetup(ev: any) {
    if (ev.encerrado) return alert("Este evento está encerrado e não pode ser editado.");
    setIdEdicaoEvento(ev.id);
    setNomeEvento(ev.nome);
    setDataEvento(ev.data_evento || new Date().toISOString().split('T')[0]);
    setTagsEntrada(normalizarCategorias(ev.categorias_entrada));
    setTagsSaida(normalizarCategorias(ev.categorias_saida));
    setEquipes(ev.equipes || []);
    setAlunosSelecionadosEvento(ev.participantes || []);
    setModalSetupAberto(true);
  }

  function abrirLancamento(eventoId: string, tipo: 'entrada' | 'saida') {
    const evento = eventosAtivos.find(e => String(e.id) === String(eventoId));
    if (!evento) return;
    if (evento.encerrado) return alert("Este evento está encerrado.");
    
    setEventoSelecionadoId(String(eventoId));
    setTipoLancamento(tipo);
    
    const borderCategorias = normalizarCategorias(tipo === 'entrada' ? evento.categorias_entrada : evento.categorias_saida);
    
    if (borderCategorias.length > 0) {
      const primCat = borderCategorias[0];
      setCategoriaSelecionada(primCat.nome);
      setValorLancamento(primCat.valor > 0 ? primCat.valor.toString() : "");
      setQuantidadeLancamento(primCat.valor > 0 ? "1" : "");
    } else {
      setCategoriaSelecionada("");
      setValorLancamento("");
      setQuantidadeLancamento("");
    }
    
    setDescricaoLancamento("");
    setAlunoVinculado("");
    setEquipeSelecionada("");
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
    if (precoBase > 0) {
      setValorLancamento(precoBase.toString());
      setQuantidadeLancamento("1");
    } else {
      setValorLancamento("");
      setQuantidadeLancamento("");
    }
  };

  const handleQtdChange = (qtdStr: string) => {
    setQuantidadeLancamento(qtdStr);
    const qtd = parseFloat(qtdStr) || 0;
    const precoBase = getPrecoBaseCat(categoriaSelecionada);
    if (precoBase > 0) {
      setValorLancamento((qtd * precoBase).toFixed(2));
    }
  };

  const handleValorChange = (valStr: string) => {
    setValorLancamento(valStr);
    const val = parseFloat(valStr) || 0;
    const precoBase = getPrecoBaseCat(categoriaSelecionada);
    if (precoBase > 0) {
      setQuantidadeLancamento((val / precoBase).toString());
    }
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
      mes_referencia: 'Avulso',
      valor_total: valorFloat,
      valor_pago: valorFloat,
      status: 'pago',
      data_pagamento: dataLancamento || new Date().toISOString().split('T')[0],
      detalhes_metodos: {
        evento_id: String(eventoSelecionadoId), 
        sub_tipo: tipoLancamento, 
        categoria_tag: categoriaSelecionada,
        equipe_nome: equipeSelecionada,
        quantidade: qtdFloat
      }
    };

    try {
      const { error } = await supabase.from('historico_pagamentos').insert([payload]);
      if (error) throw error;
      alert("✅ Transação registrada com sucesso!");
      setModalLancamentoAberto(false);
      carregarDados();
    } catch (err: any) {
      alert("⚠️ Erro ao registrar transação: " + err.message);
    }
  }

  async function excluirTransacaoEvento(id: string) {
    if (prompt("Digite a Senha Mestra para EXCLUIR transação:") === SENHA_MESTRA) {
      await supabase.from('historico_pagamentos').delete().eq('id', id);
      carregarDados();
    } else {
      alert("Senha incorreta.");
    }
  }

  function abrirDetalhesTransacoes(eventoId: string, tipo: 'entrada' | 'saida') {
    setDetalhesEventoId(String(eventoId));
    setDetalhesTipo(tipo);
    setModalDetalhesAberto(true);
  }

  function abrirRelatorioEvento(ev: any) {
    setEventoRelatorio(ev);
    setMostrarResultadoFinal(false); // Reseta a visualização detalhada ao abrir
    setModalRelatorioAberto(true);
  }

  const renderDonutChart = (distribuicao: Record<string, number>, total: number, cores: string[]) => {
    if (total === 0) return <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-black text-slate-300 uppercase tracking-widest border-4 border-white shadow-inner shrink-0">Vazio</div>;
    
    let currentAngle = 0;
    const gradientStops = Object.entries(distribuicao).map(([tag, valor], index) => {
      const percentage = (Number(valor) / total) * 100;
      const cor = cores[index % cores.length];
      const start = currentAngle;
      const end = currentAngle + percentage;
      currentAngle = end;
      return `${cor} ${start}% ${end}%`;
    }).join(', ');

    return (
      <div 
        className="w-20 h-20 md:w-24 md:h-24 rounded-full shadow-sm relative flex items-center justify-center shrink-0"
        style={{ background: `conic-gradient(${gradientStops})` }}
      >
        <div className="w-12 h-12 md:w-16 md:h-16 bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
          <PieChartIcon size={16} className="text-slate-300" />
        </div>
      </div>
    );
  };

  function handleIniciarEdicao(pgto: any) {
    router.push(`/admin/pdv?alunoId=${pgto.aluno_id}`);
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
    const nomeLimpo = removerAcentos(nomeAluno.toLowerCase());
    const buscaLimpa = removerAcentos(buscaTaxa.toLowerCase());
    return nomeLimpo.includes(buscaLimpa);
  }));

  const uniformesFiltrados = ordenarLista(historicoUniformes.filter(item => {
    const nomeAluno = alunos.find(a => a.id === item.aluno_id)?.nome || "";
    const nomeLimpo = removerAcentos(nomeAluno.toLowerCase());
    const buscaLimpa = removerAcentos(buscaUniforme.toLowerCase());
    return nomeLimpo.includes(buscaLimpa);
  }));

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

  // --- CÁLCULO DINÂMICO PARA O RELATÓRIO DO EVENTO (LÓGICA MATEMÁTICA CORRIGIDA E BLINDADA) ---
  let totalEntradasRel = 0;
  let totalSaidasRel = 0;
  let saldoRel = 0;
  let listaAlunosRelatorio: any[] = [];
  
  let arrecadacaoAvulsa: Record<string, any> = {
    total: 0,
    equipes: {}
  };

  // NOVA ESTRUTURA PARA COMPORTAR QUANTIDADES, VOTOS E INGRESSOS
  let resumoEquipesRelatorio: Record<string, {
    votos: { qtd: number; valor: number };
    ingressos: { qtd: number; valor: number };
    total: number;
  }> = {};

  if (eventoRelatorio) {
    const transacoesDoEvento = historicoPagamentosEventos.filter(t => String(getDetalhes(t).evento_id) === String(eventoRelatorio.id));
    
    const entradasRel = transacoesDoEvento.filter(t => getDetalhes(t).sub_tipo === 'entrada' || t.tipo === 'evento_entrada' || (!getDetalhes(t).sub_tipo && !t.descricao?.includes('[SA')));
    const saidasRel = transacoesDoEvento.filter(t => getDetalhes(t).sub_tipo === 'saida' || t.tipo === 'evento_saida' || t.descricao?.includes('[SAÍDA]'));

    totalEntradasRel = entradasRel.reduce((acc, t) => acc + parseCurrency(t.valor_pago), 0);
    totalSaidasRel = saidasRel.reduce((acc, t) => acc + parseCurrency(t.valor_pago), 0);
    saldoRel = totalEntradasRel - totalSaidasRel;

    const relatorioAlunos: Record<string, any> = {};

    entradasRel.forEach(t => {
      const alunoId = String(t.aluno_id);
      const valor = parseCurrency(t.valor_pago);
      const equipe = getDetalhes(t).equipe_nome || "-";
      const cat = (getDetalhes(t).categoria_tag || "").toLowerCase();
      const qtd = Number(getDetalhes(t).quantidade) || 1;

      // Soma detalhada para o resumo de equipes (mesmo sem aluno vinculado)
      if (equipe !== '-') {
        if (!resumoEquipesRelatorio[equipe]) {
          resumoEquipesRelatorio[equipe] = {
            votos: { qtd: 0, valor: 0 },
            ingressos: { qtd: 0, valor: 0 },
            total: 0
          };
        }
        resumoEquipesRelatorio[equipe].total += valor;

        if (cat.includes('voto')) {
          resumoEquipesRelatorio[equipe].votos.qtd += qtd;
          resumoEquipesRelatorio[equipe].votos.valor += valor;
        } else if (cat.includes('ingresso') || cat.includes('bilhete')) {
          resumoEquipesRelatorio[equipe].ingressos.qtd += qtd;
          resumoEquipesRelatorio[equipe].ingressos.valor += valor;
        }
      }

      if (t.aluno_id && alunoId !== 'null' && alunoId !== 'undefined') {
        if (!relatorioAlunos[alunoId]) {
           const alunoObj = alunos.find(a => String(a.id) === alunoId);
           relatorioAlunos[alunoId] = {
             nome: alunoObj ? alunoObj.nome : "Aluno Desconhecido",
             equipe: equipe,
             votos: 0,
             ingressos: 0,
             total_arrecadado: 0
           };
        }
        
        if (relatorioAlunos[alunoId].equipe === '-' && equipe !== '-') {
           relatorioAlunos[alunoId].equipe = equipe;
        }

        if (cat.includes('voto')) relatorioAlunos[alunoId].votos += qtd;
        else if (cat.includes('ingresso') || cat.includes('bilhete')) relatorioAlunos[alunoId].ingressos += qtd;
        
        relatorioAlunos[alunoId].total_arrecadado += valor;

      } else {
        arrecadacaoAvulsa.total += valor;
        if (equipe !== '-') {
            arrecadacaoAvulsa.equipes[equipe] = (arrecadacaoAvulsa.equipes[equipe] || 0) + valor;
        }
      }
    });

    // Ordenação Alfabética Rigorosa
    listaAlunosRelatorio = Object.values(relatorioAlunos).sort((a: any, b: any) => a.nome.localeCompare(b.nome));
  }

  return (
    <div className="w-full bg-slate-50 min-h-screen relative font-sans antialiased text-slate-800 pb-24 md:pb-8 hide-on-print-setup">
      
      <div className="mb-8 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:border-none print:shadow-none print:hidden">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">💰 Caixa & Faturamentos</h1>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">Escola ABC do Park — Gestão Unificada</p>
        </div>

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
            🛍️ Uniformes & Taxas
          </button>
        </div>
      </div>

      {abaAtiva === "eventos" ? (
        
        <div className="space-y-6 animate-in fade-in duration-500">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-5 md:p-6 rounded-[2rem] border border-slate-100 shadow-sm gap-4 print:hidden">
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                🎟️ Gestão de Eventos e Gincanas
              </h2>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black mt-1">Planejamento Estratégico, Equipes e Fluxo de Caixa</p>
            </div>
            <button
              onClick={() => {
                setIdEdicaoEvento(null); setNomeEvento(""); setDataEvento(new Date().toISOString().split('T')[0]);
                setTagsEntrada([{ nome: "Ingressos", valor: 0 }, { nome: "Votos", valor: 0 }]); 
                setTagsSaida([{ nome: "Decoração", valor: 0 }, { nome: "Som", valor: 0 }]);
                setEquipes(["Equipe Azul", "Equipe Amarela"]);
                setAlunosSelecionadosEvento([]);
                setTagTipoFoco('entrada');
                setModalSetupAberto(true);
              }}
              className="w-full md:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-md transition-all active:scale-95"
            >
              + Configurar Novo Evento
            </button>
          </div>

          <div className="flex flex-col gap-8 print:hidden">
            {eventosAtivos.map(evento => {
              const transacoesEvento = historicoPagamentosEventos.filter(t => String(getDetalhes(t).evento_id) === String(evento.id));
              
              const entradas = transacoesEvento.filter(t => getDetalhes(t).sub_tipo === 'entrada' || t.tipo === 'evento_entrada' || (!getDetalhes(t).sub_tipo && !t.descricao?.includes('[SA')));
              const saidas = transacoesEvento.filter(t => getDetalhes(t).sub_tipo === 'saida' || t.tipo === 'evento_saida' || t.descricao?.includes('[SAÍDA]'));

              const totalEntrada = entradas.reduce((acc, t) => acc + parseCurrency(t.valor_pago), 0);
              const totalSaida = saidas.reduce((acc, t) => acc + parseCurrency(t.valor_pago), 0);
              const lucro = totalEntrada - totalSaida;

              const distEntrada = entradas.reduce((acc, t) => {
                const cat = getDetalhes(t).categoria_tag || "Outros";
                acc[cat] = (acc[cat] || 0) + parseCurrency(t.valor_pago);
                return acc;
              }, {} as Record<string, number>);

              const distSaida = saidas.reduce((acc, t) => {
                const cat = getDetalhes(t).categoria_tag || "Outros";
                acc[cat] = (acc[cat] || 0) + parseCurrency(t.valor_pago);
                return acc;
              }, {} as Record<string, number>);

              const placarEquipes = entradas.reduce((acc, t) => {
                const equipe = getDetalhes(t).equipe_nome;
                if (equipe) {
                  acc[equipe] = (acc[equipe] || 0) + parseCurrency(t.valor_pago);
                }
                return acc;
              }, {} as Record<string, number>);

              if (evento.equipes) {
                evento.equipes.forEach((eq: string) => {
                  if (placarEquipes[eq] === undefined) placarEquipes[eq] = 0;
                });
              }
              
              const placarOrdenado = Object.entries(placarEquipes).sort((a, b) => Number(b[1]) - Number(a[1]));
              const maiorValorEquipe = placarOrdenado.length > 0 ? Number(placarOrdenado[0][1]) : 1; 

              const coresEntrada = ['#16a34a', '#22c55e', '#4ade80', '#86efac', '#bbf7d0'];
              const coresSaida = ['#dc2626', '#ef4444', '#f87171', '#fca5a5', '#fecaca'];

              const isEncerrado = !!evento.encerrado;

              return (
                <div 
                  key={evento.id} 
                  className={`rounded-[2.5rem] border shadow-sm overflow-hidden flex flex-col relative w-full transition-all ${
                    isEncerrado ? 'bg-slate-100 border-slate-200 shadow-inner' : 'bg-white border-slate-100'
                  }`}
                >
                  
                  {!isEncerrado ? (
                    <button 
                      onClick={() => prepararEdicaoSetup(evento)}
                      className="absolute top-6 right-6 p-2 bg-white rounded-full shadow-sm text-slate-400 hover:text-blue-600 transition-colors"
                      title="Editar Configurações do Evento"
                    >
                      <Settings size={18} />
                    </button>
                  ) : (
                    <div className="absolute top-6 right-6 flex gap-2">
                      <span className="flex items-center gap-1 px-3 py-1 bg-slate-200 text-slate-600 border border-slate-300 text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm">
                        <Lock size={12}/> Evento Finalizado
                      </span>
                    </div>
                  )}

                  <div className={`p-6 md:p-8 border-b flex flex-col md:flex-row justify-between items-start gap-4 ${isEncerrado ? 'bg-slate-200/40 border-slate-200' : 'bg-slate-50 border-slate-100'}`}>
                    <div>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className={`text-xl md:text-2xl font-black uppercase tracking-tight leading-none ${isEncerrado ? 'text-slate-500 line-through' : 'text-slate-800'}`}>{evento.nome}</h3>
                      </div>
                      <span className="inline-block px-3 py-1 bg-white border border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm">
                        📅 {new Date(evento.data_evento + "T12:00:00").toLocaleDateString('pt-BR')}
                      </span>
                      {evento.total_alunos > 0 && (
                        <span className="inline-block ml-2 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm">
                          👥 {evento.total_alunos} Participantes
                        </span>
                      )}
                    </div>
                    <div className="text-left md:text-right mt-2 md:mt-0 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm w-full md:w-auto">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{isEncerrado ? "Lucro Realizado Final" : "Lucro Líquido Parcial"}</p>
                      <p className={`text-2xl md:text-3xl font-black ${lucro >= 0 ? 'text-green-600' : 'text-rose-600'}`}>
                        R$ {lucro.toFixed(2).replace('.', ',')}
                      </p>
                    </div>
                  </div>

                  {placarOrdenado.length > 0 && (
                    <div className={`px-6 md:px-8 py-5 border-b ${isEncerrado ? 'border-slate-200 bg-slate-200/20' : 'border-slate-50 bg-slate-50/50'}`}>
                      <h4 className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-amber-600 mb-4 flex items-center gap-2">
                        <Trophy size={14}/> Placar da Gincana / Equipes
                      </h4>
                      <div className="flex flex-col gap-3">
                        {placarOrdenado.map(([nomeEq, valorEq], index) => {
                          const vEq = Number(valorEq);
                          return (
                            <div key={nomeEq} className="flex flex-col gap-1">
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-slate-700 flex items-center gap-2">
                                  {index === 0 && vEq > 0 && <span className="text-amber-500">👑</span>} 
                                  {nomeEq}
                                </span>
                                <span className="font-black text-slate-800">R$ {vEq.toFixed(2).replace('.', ',')}</span>
                              </div>
                              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all ${index === 0 && vEq > 0 ? 'bg-amber-500' : 'bg-blue-500'} ${isEncerrado ? 'saturate-50' : ''}`} 
                                  style={{ width: `${vEq > 0 ? (vEq / Number(maiorValorEquipe)) * 100 : 0}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className={`p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 border-b ${isEncerrado ? 'border-slate-200' : 'border-slate-50'}`}>
                    
                    <div 
                      onClick={() => abrirDetalhesTransacoes(evento.id, 'entrada')}
                      className={`flex items-center gap-6 p-5 md:p-6 rounded-3xl border transition-all cursor-pointer group ${
                        isEncerrado ? 'bg-slate-200/30 border-slate-300/60' : 'bg-green-50/50 border-green-100 hover:bg-green-50 hover:shadow-md'
                      }`}
                    >
                      <div className="transition-transform group-hover:scale-105">
                        {renderDonutChart(distEntrada, totalEntrada, isEncerrado ? ['#94a3b8','#cbd5e1','#e2e8f0'] : coresEntrada)}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="flex justify-between items-center mb-3">
                          <span className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${isEncerrado ? 'text-slate-500' : 'text-green-700'}`}><ArrowUpRight size={14}/> Ganhos</span>
                          <span className={`font-black text-lg ${isEncerrado ? 'text-slate-600' : 'text-green-700'}`}>R$ {totalEntrada.toFixed(2).replace('.', ',')}</span>
                        </div>
                        <div className="flex flex-col gap-2 max-h-[100px] overflow-y-auto custom-scrollbar pr-2">
                          {Object.entries(distEntrada).map(([cat, val], idx) => (
                            <div key={cat} className="flex justify-between text-[11px] font-bold text-slate-600">
                              <span className="flex items-center gap-2 truncate pr-2">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: isEncerrado ? '#94a3b8' : coresEntrada[idx % coresEntrada.length] }}></span>
                                <span className="truncate">{cat}</span>
                              </span>
                              <span className="shrink-0">R$ {Number(val).toFixed(2).replace('.', ',')}</span>
                            </div>
                          ))}
                        </div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-3 text-right">👉 Clique para Ver Histórico</p>
                      </div>
                    </div>

                    <div 
                      onClick={() => abrirDetalhesTransacoes(evento.id, 'saida')}
                      className={`flex items-center gap-6 p-5 md:p-6 rounded-3xl border transition-all cursor-pointer group ${
                        isEncerrado ? 'bg-slate-200/30 border-slate-300/60' : 'bg-rose-50/50 border-rose-100 hover:bg-rose-50 hover:shadow-md'
                      }`}
                    >
                      <div className="transition-transform group-hover:scale-105">
                        {renderDonutChart(distSaida, totalSaida, isEncerrado ? ['#94a3b8','#cbd5e1','#e2e8f0'] : coresSaida)}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="flex justify-between items-center mb-3">
                          <span className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${isEncerrado ? 'text-slate-500' : 'text-rose-700'}`}><ArrowDownRight size={14}/> Custos</span>
                          <span className={`font-black text-lg ${isEncerrado ? 'text-slate-600' : 'text-rose-700'}`}>R$ {totalSaida.toFixed(2).replace('.', ',')}</span>
                        </div>
                        <div className="flex flex-col gap-2 max-h-[100px] overflow-y-auto custom-scrollbar pr-2">
                          {Object.entries(distSaida).map(([cat, val], idx) => (
                            <div key={cat} className="flex justify-between text-[11px] font-bold text-slate-600">
                              <span className="flex items-center gap-2 truncate pr-2">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: isEncerrado ? '#94a3b8' : coresSaida[idx % coresSaida.length] }}></span>
                                <span className="truncate">{cat}</span>
                              </span>
                              <span className="shrink-0">R$ {Number(val).toFixed(2).replace('.', ',')}</span>
                            </div>
                          ))}
                        </div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-3 text-right">👉 Clique para Ver Histórico</p>
                      </div>
                    </div>

                  </div>

                  <div className="p-4 md:p-6 bg-white flex flex-col sm:flex-row gap-3">
                    {!isEncerrado ? (
                      <>
                        <button 
                          onClick={() => abrirLancamento(evento.id, 'entrada')}
                          className="flex-1 py-4 bg-green-100 hover:bg-green-200 text-green-700 font-black text-xs uppercase tracking-widest rounded-2xl transition-colors flex items-center justify-center gap-2 shadow-sm active:scale-95"
                        >
                          <PlusCircle size={18} /> Lançar Ganho
                        </button>
                        <button 
                          onClick={() => abrirLancamento(evento.id, 'saida')}
                          className="flex-1 py-4 bg-rose-100 hover:bg-rose-200 text-rose-700 font-black text-xs uppercase tracking-widest rounded-2xl transition-colors flex items-center justify-center gap-2 shadow-sm active:scale-95"
                        >
                          <MinusCircle size={18} /> Lançar Gasto
                        </button>
                        <button 
                          onClick={() => abrirRelatorioEvento(evento)}
                          className="px-5 py-4 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-600 font-black text-xs uppercase tracking-widest rounded-2xl transition-colors flex items-center justify-center gap-2"
                        >
                          <Printer size={18} /> Relatório
                        </button>
                        <button 
                          onClick={() => encerrarEventoDefinitivamente(evento.id)}
                          className="px-5 py-4 bg-slate-800 hover:bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-colors flex items-center justify-center gap-2 active:scale-95"
                        >
                          🔒 Encerrar Evento
                        </button>
                      </>
                    ) : (
                      <button 
                        onClick={() => abrirRelatorioEvento(evento)}
                        className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-colors flex items-center justify-center gap-2 shadow-md active:scale-95 animate-fadeIn"
                      >
                        <Printer size={18} /> Gerar Relatório Analítico e Extrato Detalhado do Evento
                      </button>
                    )}
                  </div>

                </div>
              );
            })}
            
            {eventosAtivos.length === 0 && (
              <div className="w-full p-16 bg-white rounded-[2.5rem] border border-dashed border-slate-300 text-center shadow-sm print:hidden">
                <Tag size={56} className="mx-auto text-slate-300 mb-4 animate-bounce" />
                <h3 className="text-xl font-black text-slate-700">Nenhum evento estruturado</h3>
                <p className="text-sm font-bold text-slate-400 mt-2 max-w-md mx-auto">Clique em "Configurar Novo Evento" para começar a rastrear entradas e saídas e criar a bilheteria.</p>
              </div>
            )}
          </div>

          {/* --- MODAL SETUP DE EVENTO --- */}
          {modalSetupAberto && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center md:p-4" onClick={() => setModalSetupAberto(false)}>
              <div className="bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] w-full max-w-2xl p-6 md:p-8 shadow-2xl animate-in slide-in-from-bottom-full md:zoom-in-95 max-h-[95vh] md:max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col" onClick={e => e.stopPropagation()}>
                
                <div className="w-full flex justify-center md:hidden mb-4">
                  <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
                </div>

                <h2 className="text-xl md:text-2xl font-black text-slate-800 mb-6 flex items-center gap-3"><Settings size={28} className="text-blue-600"/> Setup de Caixa do Evento</h2>
                
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="flex-[2]">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Nome do Evento</label>
                    <input type="text" value={nomeEvento} onChange={e => setNomeEvento(e.target.value)} placeholder="Ex: Gincana 2026" className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 font-bold text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-100" />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Data Alvo</label>
                    <input type="date" value={dataEvento} onChange={e => setDataEvento(e.target.value)} className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 font-bold text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-100" />
                  </div>
                </div>

                <div className="bg-slate-50 p-5 md:p-6 rounded-2xl border border-slate-100 mb-6">
                  <h3 className="text-sm md:text-base font-black text-slate-800 mb-4 flex items-center gap-2"><Tag size={18} className="text-slate-400"/> Gestor de Regras e Valores</h3>
                  
                  <div className="flex flex-wrap bg-white p-1 rounded-xl shadow-sm mb-5 border border-slate-200">
                    <button onClick={() => setTagTipoFoco('entrada')} className={`flex-1 py-3 px-2 text-[10px] md:text-xs font-black uppercase tracking-widest rounded-lg transition-colors ${tagTipoFoco === 'entrada' ? 'bg-green-100 text-green-700' : 'text-slate-400 hover:bg-slate-50'}`}>Ganhos</button>
                    <button onClick={() => setTagTipoFoco('saida')} className={`flex-1 py-3 px-2 text-[10px] md:text-xs font-black uppercase tracking-widest rounded-lg transition-colors ${tagTipoFoco === 'saida' ? 'bg-rose-100 text-rose-700' : 'text-slate-400 hover:bg-slate-50'}`}>Custos</button>
                    <button onClick={() => setTagTipoFoco('equipe')} className={`flex-1 py-3 px-2 text-[10px] md:text-xs font-black uppercase tracking-widest rounded-lg transition-colors ${tagTipoFoco === 'equipe' ? 'bg-amber-100 text-amber-700' : 'text-slate-400 hover:bg-slate-50'}`}>Equipes</button>
                  </div>

                  {tagTipoFoco === 'equipe' ? (
                    <div className="flex flex-col md:flex-row gap-3 mb-6 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                      <input 
                        type="text" 
                        value={equipeInput} 
                        onChange={e => setEquipeInput(e.target.value)} 
                        onKeyDown={(e) => { if(e.key === 'Enter') adicionarCategoriaOuEquipe() }}
                        placeholder="Ex: Equipe Vermelha..." 
                        className="flex-1 p-3 rounded-xl border border-slate-100 font-bold text-sm text-slate-800 outline-none focus:border-amber-400 bg-slate-50" 
                      />
                      <button onClick={adicionarCategoriaOuEquipe} className="px-6 py-3 rounded-xl font-black text-white bg-amber-500 shadow-sm active:scale-95 transition-transform">ADD EQUIPE</button>
                    </div>
                  ) : (
                    <div className="flex flex-col md:flex-row gap-3 mb-6 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                      <input 
                        type="text" 
                        value={tagNomeInput} 
                        onChange={e => setTagNomeInput(e.target.value)} 
                        placeholder={tagTipoFoco === 'entrada' ? "Ex: Ingresso VIP" : "Ex: Som / DJ"} 
                        className="flex-[2] p-3 rounded-xl border border-slate-100 font-bold text-sm text-slate-800 outline-none focus:border-blue-400 bg-slate-50" 
                      />
                      <div className="flex gap-2 flex-[1.5]">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">R$</span>
                          <input 
                            type="number" 
                            step="0.01"
                            value={tagValorInput} 
                            onChange={e => setTagValorInput(e.target.value)} 
                            onKeyDown={(e) => { if(e.key === 'Enter') adicionarCategoriaOuEquipe() }}
                            placeholder="0.00" 
                            className="w-full pl-9 p-3 rounded-xl border border-slate-100 font-bold text-sm text-slate-800 outline-none focus:border-blue-400 bg-slate-50" 
                          />
                        </div>
                        <button onClick={adicionarCategoriaOuEquipe} className={`px-4 rounded-xl font-black text-white shadow-sm active:scale-95 transition-transform ${tagTipoFoco === 'entrada' ? 'bg-green-600' : 'bg-rose-600'}`}>ADD</button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Itens Cadastrados:</label>
                    {(tagTipoFoco === 'entrada' ? tagsEntrada : tagTipoFoco === 'saida' ? tagsSaida : equipes).length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {tagTipoFoco === 'equipe' ? (
                          equipes.map(eq => (
                            <div key={eq} className="flex justify-between items-center px-4 py-3 rounded-xl border bg-amber-50 border-amber-200">
                              <span className="text-xs font-black truncate text-amber-800">{eq}</span>
                              <button onClick={() => removerCategoria('equipe', eq)} className="w-8 h-8 rounded-lg bg-white/50 flex items-center justify-center hover:bg-white text-slate-500 hover:text-rose-600 transition-colors shrink-0"><X size={14}/></button>
                            </div>
                          ))
                        ) : (
                          (tagTipoFoco === 'entrada' ? tagsEntrada : tagsSaida).map(cat => (
                            <div key={cat.nome} className={`flex justify-between items-center px-4 py-3 rounded-xl border ${tagTipoFoco === 'entrada' ? 'bg-green-50 border-green-200' : 'bg-rose-50 border-rose-200'}`}>
                              <div className="flex flex-col truncate pr-2">
                                <span className={`text-xs font-black truncate ${tagTipoFoco === 'entrada' ? 'text-green-800' : 'text-rose-800'}`}>{cat.nome}</span>
                                <span className={`text-[10px] font-bold ${tagTipoFoco === 'entrada' ? 'text-green-600' : 'text-rose-600'}`}>R$ {Number(cat.valor).toFixed(2)}</span>
                              </div>
                              <button onClick={() => removerCategoria(tagTipoFoco, cat.nome)} className="w-8 h-8 rounded-lg bg-white/50 flex items-center justify-center hover:bg-white text-slate-500 hover:text-rose-600 transition-colors shrink-0"><X size={14}/></button>
                            </div>
                          ))
                        )}
                      </div>
                    ) : (
                      <p className="text-xs font-bold text-slate-400 italic text-center py-4">Nenhum item configurado.</p>
                    )}
                  </div>
                </div>

                <div className="mt-4 border-t border-slate-100 pt-6">
                  <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2"><Users size={18} className="text-blue-500"/> Alunos Participantes</h3>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black uppercase text-slate-400 bg-slate-100 px-2 py-1 rounded-md">{alunosSelecionadosEvento.length} selecionados</span>
                    <button 
                      onClick={() => setAlunosSelecionadosEvento(alunosSelecionadosEvento.length === alunos.length ? [] : alunos.map(a => String(a.id)))} 
                      className="text-[10px] font-black text-blue-600 uppercase hover:underline"
                    >
                      {alunosSelecionadosEvento.length === alunos.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                    </button>
                  </div>
                  <div className="max-h-40 overflow-y-auto custom-scrollbar grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    {alunos.map(a => (
                      <label key={a.id} className="flex items-center gap-3 text-xs font-bold text-slate-700 cursor-pointer p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-colors">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                          checked={alunosSelecionadosEvento.includes(String(a.id))} 
                          onChange={() => {
                            if (alunosSelecionadosEvento.includes(String(a.id))) setAlunosSelecionadosEvento(alunosSelecionadosEvento.filter(id => id !== String(a.id)));
                            else setAlunosSelecionadosEvento([...alunosSelecionadosEvento, String(a.id)]);
                          }} 
                        />
                        <span className="truncate">{a.nome}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 mt-auto pt-6">
                  <button onClick={() => setModalSetupAberto(false)} className="flex-1 py-4 rounded-2xl border border-slate-200 bg-white font-black uppercase tracking-widest text-[10px] md:text-xs text-slate-500 hover:bg-slate-50 active:scale-95 transition-all">Cancelar</button>
                  <button onClick={salvarSetupEvento} className="flex-[2] py-4 rounded-2xl bg-blue-600 text-white font-black uppercase tracking-widest text-[10px] md:text-xs shadow-lg shadow-blue-600/20 active:scale-95 transition-all">Salvar Estrutura</button>
                </div>
              </div>
            </div>
          )}

          {/* --- MODAL LANÇAMENTO DE CAIXA --- */}
          {modalLancamentoAberto && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center md:p-4" onClick={() => setModalLancamentoAberto(false)}>
              <div className="bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] p-6 md:p-8 w-full max-w-sm shadow-2xl animate-in slide-in-from-bottom-full md:zoom-in-95" onClick={e => e.stopPropagation()}>
                
                <div className="w-full flex justify-center md:hidden mb-4">
                  <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
                </div>

                <div className={`flex items-center gap-4 mb-6 pb-4 border-b ${tipoLancamento === 'entrada' ? 'border-green-100' : 'border-rose-100'}`}>
                  <div className={`w-14 h-14 rounded-[1.2rem] flex items-center justify-center shrink-0 shadow-inner ${tipoLancamento === 'entrada' ? 'bg-green-100 text-green-600' : 'bg-rose-100 text-rose-600'}`}>
                    {tipoLancamento === 'entrada' ? <PlusCircle size={28}/> : <MinusCircle size={28}/>}
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-black text-slate-800 leading-none">Registrar {tipoLancamento === 'entrada' ? 'Ganho' : 'Gasto'}</h2>
                    <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${tipoLancamento === 'entrada' ? 'text-green-500' : 'text-rose-500'}`}>Caixa do Evento</p>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Item / Categoria</label>
                    <select 
                      value={categoriaSelecionada} 
                      onChange={e => handleMudancaCategoria(e.target.value)} 
                      className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 font-bold text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="">Selecione a categoria...</option>
                      {normalizarCategorias(tipoLancamento === 'entrada' 
                        ? eventosAtivos.find(e => String(e.id) === String(eventoSelecionadoId))?.categorias_entrada 
                        : eventosAtivos.find(e => String(e.id) === String(eventoSelecionadoId))?.categorias_saida || []
                      ).map((cat: CategoriaPreco) => (
                        <option key={cat.nome} value={cat.nome}>{cat.nome} {cat.valor > 0 ? `(R$ ${cat.valor.toFixed(2)})` : ''}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Qtd.</label>
                      <input 
                        type="number" 
                        value={quantidadeLancamento} 
                        onChange={e => handleQtdChange(e.target.value)} 
                        placeholder="1" 
                        className={`w-full p-4 rounded-xl border font-black text-xl outline-none focus:ring-2 bg-white ${tipoLancamento === 'entrada' ? 'border-green-200 text-green-700 focus:ring-green-100' : 'border-rose-200 text-rose-700 focus:ring-rose-100'}`} 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Valor (R$)</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        value={valorLancamento} 
                        onChange={e => handleValorChange(e.target.value)} 
                        placeholder="0.00" 
                        className={`w-full p-4 rounded-xl border font-black text-xl outline-none focus:ring-2 bg-white ${tipoLancamento === 'entrada' ? 'border-green-200 text-green-700 focus:ring-green-100' : 'border-rose-200 text-rose-700 focus:ring-rose-100'}`} 
                      />
                    </div>
                  </div>

                  {tipoLancamento === 'entrada' && (
                    <div className="flex flex-col gap-4 p-4 rounded-2xl bg-amber-50/50 border border-amber-100">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-1.5 flex items-center gap-1"><Trophy size={12}/> Equipe (Gincana)</label>
                        <select value={equipeSelecionada} onChange={e => setEquipeSelecionada(e.target.value)} className="w-full p-3 rounded-xl border border-amber-200 bg-white font-bold text-sm text-slate-800 outline-none focus:ring-2 focus:ring-amber-200">
                          <option value="">Nenhuma equipe...</option>
                          {(eventosAtivos.find(e => String(e.id) === String(eventoSelecionadoId))?.equipes || []).map((eq: string) => (
                            <option key={eq} value={eq}>{eq}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Vincular Aluno (Opcional)</label>
                        <select value={alunoVinculado} onChange={e => setAlunoVinculado(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 bg-white font-bold text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-100">
                          <option value="">Lançamento Avulso</option>
                          {alunos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                        </select>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Descrição Adicional (Opcional)</label>
                    <input type="text" value={descricaoLancamento} onChange={e => setDescricaoLancamento(e.target.value)} placeholder="Ex: Referente a doações..." className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 font-bold text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-100" />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setModalLancamentoAberto(false)} className="flex-1 py-4 md:py-5 rounded-2xl border border-slate-200 bg-white font-black uppercase tracking-widest text-[10px] md:text-xs text-slate-500 hover:bg-slate-50 active:scale-95 transition-all">Cancelar</button>
                  <button onClick={registrarTransacao} className={`flex-[2] py-4 md:py-5 rounded-2xl text-white font-black uppercase tracking-widest text-[10px] md:text-xs shadow-xl active:scale-95 transition-all ${tipoLancamento === 'entrada' ? 'bg-green-600 hover:bg-green-700 shadow-green-600/20' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'}`}>Registrar</button>
                </div>
              </div>
            </div>
          )}

          {/* --- MODAL: DETALHES GERAIS DA TRANSAÇÃO (LIVRO CAIXA) --- */}
          {modalDetalhesAberto && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center md:p-4" onClick={() => setModalDetalhesAberto(false)}>
              <div className="bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] p-6 md:p-8 w-full max-w-2xl shadow-2xl animate-in slide-in-from-bottom-full md:zoom-in-95 flex flex-col max-h-[95vh] md:max-h-[85vh]" onClick={e => e.stopPropagation()}>
                
                <div className="w-full flex justify-center md:hidden mb-4">
                  <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
                </div>

                <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-2xl ${detalhesTipo === 'entrada' ? 'bg-green-100 text-green-600' : 'bg-rose-100 text-rose-600'}`}>
                      {detalhesTipo === 'entrada' ? <ArrowUpRight size={24}/> : <ArrowDownRight size={24}/>}
                    </div>
                    <div>
                      <h2 className="text-xl md:text-2xl font-black text-slate-800 leading-none">Extrato de {detalhesTipo === 'entrada' ? 'Ganhos' : 'Custos'}</h2>
                      <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-400 mt-1">{eventosAtivos.find(e => String(e.id) === String(detalhesEventoId))?.nome}</p>
                    </div>
                  </div>
                  <button onClick={() => setModalDetalhesAberto(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors">
                    <X size={20}/>
                  </button>
                </div>

                <div className="overflow-y-auto custom-scrollbar flex-1 -mx-2 px-2 pb-4">
                  <div className="flex flex-col gap-3">
                    {historicoPagamentosEventos
                      .filter(t => String(getDetalhes(t).evento_id) === String(detalhesEventoId))
                      .filter(t => getDetalhes(t).sub_tipo === detalhesTipo || (detalhesTipo === 'entrada' ? t.tipo === 'evento_entrada' || (!getDetalhes(t).sub_tipo && !t.descricao?.includes('[SA')) : t.tipo === 'evento_saida' || t.descricao?.includes('[SAÍDA]')))
                      .sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                      .map(t => (
                        <div key={t.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100 gap-4">
                          <div className="flex flex-col pr-4 overflow-hidden">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-black text-slate-800">{getDetalhes(t).categoria_tag || "Geral"}</span>
                              {getDetalhes(t).quantidade && (
                                <span className="text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-black">Qtd: {getDetalhes(t).quantidade}</span>
                              )}
                              {getDetalhes(t).equipe_nome && (
                                <span className="text-[9px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-black truncate">🏆 {getDetalhes(t).equipe_nome}</span>
                              )}
                            </div>
                            <span className="text-xs font-bold text-slate-500">{t.descricao.replace(/\[ENTRADA\] |\[SAÍDA\] /g, '') || "Sem descrição"}</span>
                            {t.aluno_id && (
                               <span className="text-[10px] text-blue-600 font-bold mt-1.5 flex items-center gap-1">
                                 <Users size={12}/> {alunos.find(a => String(a.id) === String(t.aluno_id))?.nome || "Aluno Excluído"}
                               </span>
                            )}
                            <span className="text-[9px] font-black uppercase text-slate-400 mt-2">
                              🕒 {new Date(t.created_at || t.data_pagamento).toLocaleString('pt-BR')}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 border-slate-200 pt-3 sm:pt-0">
                            <span className={`font-black text-lg ${detalhesTipo === 'entrada' ? 'text-green-600' : 'text-rose-600'}`}>
                              {detalhesTipo === 'entrada' ? '+' : '-'} R$ {parseFloat(t.valor_pago).toFixed(2).replace('.', ',')}
                            </span>
                            {!eventosAtivos.find(e => String(e.id) === String(detalhesEventoId))?.encerrado && (
                              <button 
                                onClick={() => excluirTransacaoEvento(t.id)} 
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-200 transition-colors shadow-sm print:hidden"
                                title="Excluir Lançamento"
                              >
                                <Trash2 size={16}/>
                              </button>
                            )}
                          </div>
                        </div>
                    ))}
                    
                    {historicoPagamentosEventos.filter(t => String(getDetalhes(t).evento_id) === String(detalhesEventoId) && (getDetalhes(t).sub_tipo === detalhesTipo || (detalhesTipo === 'entrada' ? t.tipo === 'evento_entrada' || (!getDetalhes(t).sub_tipo && !t.descricao?.includes('[SA')) : t.tipo === 'evento_saida' || t.descricao?.includes('[SAÍDA]')))).length === 0 && (
                      <div className="py-12 flex flex-col items-center justify-center text-center">
                        <Search size={40} className="text-slate-200 mb-3" />
                        <p className="text-sm font-bold text-slate-400">Nenhuma transação encontrada no extrato.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <button onClick={() => setModalDetalhesAberto(false)} className="w-full py-4 rounded-2xl bg-slate-800 text-white font-black uppercase tracking-widest text-xs shadow-md active:scale-95 transition-all">
                    Fechar Extrato
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* --- NOVO MODAL EXTRA: IMPRESSÃO DO RELATÓRIO DO EVENTO --- */}
          {modalRelatorioAberto && eventoRelatorio && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-0 sm:p-4" onClick={() => setModalRelatorioAberto(false)}>
              <div className="bg-white rounded-none sm:rounded-[2.5rem] w-full max-w-4xl p-6 md:p-8 shadow-2xl overflow-y-auto max-h-screen sm:max-h-[90vh] custom-scrollbar flex flex-col" onClick={e => e.stopPropagation()}>
                
                {/* ÁREA IMPRIMÍVEL DO RELATÓRIO */}
                <div id="secao-relatorio-impressao" className="flex-1">
                  <div className="text-center border-b-2 border-slate-800 pb-4 mb-6">
                    <h2 className="text-2xl font-black uppercase text-slate-900 tracking-tight">Escola ABC do Park</h2>
                    <p className="text-xs uppercase tracking-widest font-bold text-slate-500 mt-1">Demonstrativo Financeiro Nominal de Evento</p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400">Evento</p>
                      <p className="text-sm font-black text-slate-800">{eventoRelatorio.nome}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400">Data Alvo</p>
                      <p className="text-sm font-bold text-slate-700">{new Date(eventoRelatorio.data_evento + "T12:00:00").toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400">Participantes</p>
                      <p className="text-sm font-bold text-slate-700">{eventoRelatorio.total_alunos || 0} alunos</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400">Status</p>
                      <p className="text-sm font-black text-slate-800 uppercase">{eventoRelatorio.encerrado ? "🔒 Finalizado" : "🔓 Ativo"}</p>
                    </div>
                  </div>

                  {/* Resumo Geral KPI */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                     <div className="border border-green-200 bg-green-50 p-4 rounded-xl text-center">
                        <p className="text-[10px] uppercase font-black text-green-700 tracking-wider">Total de Ganhos</p>
                        <p className="text-xl font-black text-green-700">R$ {totalEntradasRel.toFixed(2).replace('.', ',')}</p>
                     </div>
                     <div className="border border-rose-200 bg-rose-50 p-4 rounded-xl text-center">
                        <p className="text-[10px] uppercase font-black text-rose-700 tracking-wider">Total de Gastos</p>
                        <p className="text-xl font-black text-rose-700">R$ {totalSaidasRel.toFixed(2).replace('.', ',')}</p>
                     </div>
                     <div className="border border-blue-200 bg-blue-50 p-4 rounded-xl text-center">
                        <p className="text-[10px] uppercase font-black text-blue-700 tracking-wider">Saldo Líquido</p>
                        <p className={`text-xl font-black ${saldoRel >= 0 ? 'text-blue-700' : 'text-rose-700'}`}>R$ {saldoRel.toFixed(2).replace('.', ',')}</p>
                     </div>
                  </div>

                  {/* QUADRO RESUMO POR EQUIPE DETALHADO */}
                  {Object.keys(resumoEquipesRelatorio).length > 0 && (
                    <div className="mb-8 p-5 bg-amber-50/50 border border-amber-200 rounded-xl">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                        <h3 className="text-xs font-black uppercase tracking-wider text-amber-800 border-l-4 border-amber-600 pl-2">
                          Desempenho Geral por Equipe (Gincana)
                        </h3>
                        <button
                          onClick={() => setMostrarResultadoFinal(!mostrarResultadoFinal)}
                          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm transition-all active:scale-95 flex items-center gap-2 print:hidden"
                        >
                          <Trophy size={14}/> {mostrarResultadoFinal ? 'Ocultar Resultado Final' : 'Ver Resultado Final'}
                        </button>
                      </div>

                      {!mostrarResultadoFinal ? (
                        // MODO COMPACTO
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                           {Object.entries(resumoEquipesRelatorio)
                             .sort((a, b) => b[1].total - a[1].total) // Ordena do maior para o menor
                             .map(([equipe, dados], index) => (
                               <div key={equipe} className="flex justify-between items-center bg-white p-3 rounded-lg border border-amber-100 shadow-sm">
                                 <span className="text-xs font-bold text-slate-700 truncate pr-2">
                                   {index === 0 ? "👑 " : "▫️ "} {equipe}
                                 </span>
                                 <span className="text-sm font-black text-amber-700 shrink-0">R$ {dados.total.toFixed(2).replace('.', ',')}</span>
                               </div>
                             ))
                           }
                        </div>
                      ) : (
                        // MODO RESULTADO FINAL (DETALHADO E DISCRIMINADO COM PIE CHART)
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-4 fade-in duration-300">
                           {Object.entries(resumoEquipesRelatorio)
                             .sort((a, b) => b[1].total - a[1].total)
                             .map(([equipe, dados], index) => {
                                // Prepara dados para o Gráfico de Pizza
                                const distEquipe: Record<string, number> = {
                                  "Votos": dados.votos.valor,
                                  "Ingressos": dados.ingressos.valor
                                };
                                const restante = dados.total - (dados.votos.valor + dados.ingressos.valor);
                                if (restante > 0.01) distEquipe["Outros"] = restante;

                                return (
                                  <div key={equipe} className="bg-white p-4 rounded-2xl border border-amber-200 shadow-sm flex items-center gap-4">
                                    <div className="shrink-0">
                                       {renderDonutChart(distEquipe, dados.total, ['#f59e0b', '#3b82f6', '#94a3b8'])}
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                                        <span className="text-sm font-black text-slate-800 truncate">
                                          {index === 0 && <span className="text-amber-500 mr-1">👑</span>}
                                          {equipe}
                                        </span>
                                        <span className="text-sm font-black text-amber-600">R$ {dados.total.toFixed(2).replace('.', ',')}</span>
                                      </div>
                                      <div className="flex flex-col gap-1.5">
                                        <div className="flex justify-between text-[11px]">
                                           <span className="font-bold text-slate-500 flex items-center gap-1">
                                             <span className="w-2 h-2 rounded-full bg-amber-500"></span> 
                                             Votos ({dados.votos.qtd} un)
                                           </span>
                                           <span className="font-black text-slate-700">R$ {dados.votos.valor.toFixed(2).replace('.', ',')}</span>
                                        </div>
                                        <div className="flex justify-between text-[11px]">
                                           <span className="font-bold text-slate-500 flex items-center gap-1">
                                             <span className="w-2 h-2 rounded-full bg-blue-500"></span> 
                                             Ingressos ({dados.ingressos.qtd} un)
                                           </span>
                                           <span className="font-black text-slate-700">R$ {dados.ingressos.valor.toFixed(2).replace('.', ',')}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )
                             })
                           }
                        </div>
                      )}
                    </div>
                  )}

                  {/* TABELA DE EXTRATO AGRUPADO POR ALUNO */}
                  <div className="mb-8">
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 mb-3 border-l-4 border-slate-800 pl-2">Detalhamento de Arrecadação por Aluno</h3>
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b-2 border-slate-800 text-slate-800 font-black uppercase text-[10px]">
                          <th className="py-2.5">Nome da Criança</th>
                          <th className="py-2.5 text-center">Equipe</th>
                          <th className="py-2.5 text-center">Votos</th>
                          <th className="py-2.5 text-center">Ingressos</th>
                          <th className="py-2.5 text-right">Total Arrecadado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {listaAlunosRelatorio.map((aluno: any, idx) => (
                          <tr key={idx} className="border-b border-slate-200 text-slate-700 hover:bg-slate-50">
                            <td className="py-3 font-bold uppercase">{aluno.nome}</td>
                            <td className="py-3 text-center font-black text-amber-600">{aluno.equipe !== '-' ? aluno.equipe : ''}</td>
                            <td className="py-3 text-center">{aluno.votos > 0 ? aluno.votos : '-'}</td>
                            <td className="py-3 text-center">{aluno.ingressos > 0 ? aluno.ingressos : '-'}</td>
                            <td className="py-3 text-right font-black text-green-600">R$ {aluno.total_arrecadado.toFixed(2).replace('.', ',')}</td>
                          </tr>
                        ))}
                        
                        {/* Linha que salva a discrepância: Lançamentos não vinculados a aluno */}
                        {arrecadacaoAvulsa.total > 0 && (
                          <tr className="border-t-2 border-slate-300 bg-slate-100/50">
                             <td className="py-3 font-black text-slate-500 italic">OUTRAS ARRECADAÇÕES (Avulso / Sem Nome)</td>
                             <td className="py-3 text-center text-[10px] font-black text-amber-600/70">
                                {Object.keys(arrecadacaoAvulsa.equipes).length > 0 ? Object.keys(arrecadacaoAvulsa.equipes).join(', ') : '-'}
                             </td>
                             <td className="py-3 text-center text-slate-400">-</td>
                             <td className="py-3 text-center text-slate-400">-</td>
                             <td className="py-3 text-right font-black text-slate-600">R$ {arrecadacaoAvulsa.total.toFixed(2).replace('.', ',')}</td>
                          </tr>
                        )}

                        {listaAlunosRelatorio.length === 0 && arrecadacaoAvulsa.total === 0 && (
                           <tr><td colSpan={5} className="py-6 text-center text-slate-400 font-bold">Nenhuma arrecadação financeira foi registrada ainda.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* RESUMO TOTALIZADOR OPTIMIZADO PARA O RODAPÉ DO PDF */}
                  <div className="border-t-2 border-slate-300 pt-4 flex flex-col sm:flex-row justify-end gap-6 text-right mt-8">
                    <div className="text-xs font-bold text-slate-500">
                      TOTAL ENTRADAS: <span className="text-green-600 font-black">
                        R$ {totalEntradasRel.toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-500">
                      TOTAL SAÍDAS: <span className="text-rose-600 font-black">
                        R$ {totalSaidasRel.toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                    <div className="text-sm font-black text-slate-800 border-t sm:border-t-0 sm:border-l border-slate-300 sm:pl-6">
                      SALDO LÍQUIDO: <span className={saldoRel >= 0 ? 'text-green-600' : 'text-rose-600'}>
                        R$ {saldoRel.toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  </div>

                </div>

                {/* CONTROLES DO MODAL */}
                <div className="flex gap-3 border-t border-slate-100 pt-6 mt-6 print:hidden">
                  <button onClick={() => setModalRelatorioAberto(false)} className="flex-1 py-4 rounded-xl border border-slate-200 font-black uppercase tracking-widest text-[10px] md:text-xs text-slate-500 hover:bg-slate-50">Fechar</button>
                  <button 
                    onClick={() => {
                      const backupConteudo = document.body.innerHTML;
                      const secaoImpressao = document.getElementById("secao-relatorio-impressao")?.innerHTML || "";
                      document.body.innerHTML = `<div style="padding:40px; background:white; font-family:sans-serif;">${secaoImpressao}</div>`;
                      window.print();
                      document.body.innerHTML = backupConteudo;
                      window.location.reload(); 
                    }} 
                    className="flex-[2] py-4 rounded-xl bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] md:text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform"
                  >
                    <Printer size={18}/> Imprimir Relatório Oficial
                  </button>
                </div>

              </div>
            </div>
          )}

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