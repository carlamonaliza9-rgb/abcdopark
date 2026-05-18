"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Importação dos Componentes de Layout
import { FinanceiroHeader } from "@/app/dashboard/financeiro/_components/FinanceiroHeader";
import { MetricasCard } from "@/app/dashboard/financeiro/_components/MetricasCard";
import { PainelAuditoria } from "@/app/dashboard/financeiro/_components/PainelAuditoria";
import { TabelaMensalidades } from "@/app/dashboard/financeiro/_components/TabelaMensalidades";
import { BalancoResumo } from "@/app/dashboard/financeiro/_components/BalancoResumo";
import { GestaoEventos } from "@/app/dashboard/financeiro/_components/GestaoEventos";

// Importação dos Modais Modularizados
import { ModalPagamento } from "@/app/dashboard/financeiro/_components/ModalPagamento";
import { ModalGasto } from "@/app/dashboard/financeiro/_components/ModalGasto";
import { ModalEvento } from "@/app/dashboard/financeiro/_components/ModalEvento";
import { ModalListaGastos } from "@/app/dashboard/financeiro/_components/ModalListaGastos";
import { ModalUniforme } from "@/app/dashboard/financeiro/_components/ModalUniforme";
import { ModalTaxas } from "@/app/dashboard/financeiro/_components/ModalTaxas";

export default function FinanceiroAdminPage() {
  const router = useRouter();
  const [verificandoAcesso, setVerificandoAcesso] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userCargo, setUserCargo] = useState<string | null>(null);

  // --- ESTADOS DE CONFIGURAÇÃO E DADOS ---
  const [valorPadrao, setValorPadrao] = useState(550);
  const [editandoValor, setEditandoValor] = useState(false);
  const [mesFiltro, setMesFiltro] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
  const [filtroNome, setFiltroNome] = useState(""); 
  const [alunos, setAlunos] = useState<any[]>([]);
  const [eventosAtivos, setEventosAtivos] = useState<any[]>([]);
  const [metricas, setMetricas] = useState({ total: 0, pago: 0, pendente: 0, descontos: 0, gastos: 0, lucro: 0 });
  const [resumoMetodos, setResumoMetodos] = useState({ pix: 0, dinheiro: 0, credito: 0, debito: 0 });
  const [carregando, setCarregando] = useState(true);
  
  // --- ESTADO DE PRIVACIDADE VISUAL DAS MÉTRICAS ---
  const [mostrarValores, setMostrarValores] = useState(false);

  // --- ESTADOS DE CONTROLE DE MODAIS ---
  const [modalPgtoAberto, setModalPgtoAberto] = useState(false);
  const [modalGastoAberto, setModalGastoAberto] = useState(false);
  const [modalListaGastosAberto, setModalListaGastosAberto] = useState(false); 
  const [modalListaReceitasAberto, setModalListaReceitasAberto] = useState(false);
  const [modalEventoAberto, setModalEventoAberto] = useState(false);
  const [modalUniformeAberto, setModalUniformeAberto] = useState(false);
  const [modalTaxasAberto, setModalTaxasAberto] = useState(false);

  // --- ESTADOS DE FORMULÁRIOS FINANCEIROS ---
  const [listaGastosDetalhada, setListaGastosDetalhada] = useState<any[]>([]); 
  const [listaReceitasDetalhada, setListaReceitasDetalhada] = useState<any[]>([]);
  const [alunoSelecionado, setAlunoSelecionado] = useState<any>(null);
  const [descGasto, setDescGasto] = useState("");
  const [valorGasto, setValorGasto] = useState("");
  const [dataGasto, setDataGasto] = useState(new Date().toISOString().split('T')[0]); 
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().split('T')[0]); 
  const [tipoPagamento, setTipoPagamento] = useState("mensalidade");
  const [descricaoOutro, setDescricaoOutro] = useState("");
  const [pagamentosMetodos, setPagamentosMetodos] = useState({ pix: "", dinheiro: "", credito: "", debito: "", multa: "" });
  const [mesReferencia, setMesReferencia] = useState(["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"][new Date().getMonth()]);
  const [idEventoEdicao, setIdEventoEdicao] = useState<string | null>(null);
  const [idPagamentoEdicao, setIdPagamentoEdicao] = useState<string | null>(null);
  const [nomeEvento, setNomeEvento] = useState("");
  const [valorEvento, setValorEvento] = useState("");
  const [alunosSelecionados, setAlunosSelecionados] = useState<string[]>([]);
  const [eventoParaGerenciar, setEventoParaGerenciar] = useState<any>(null);
  const [historicoPagamentosEventos, setHistoricoPagamentosEventos] = useState<any[]>([]);

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

      if (!ehAutorizado) {
        return router.push("/dashboard");
      }
      setVerificandoAcesso(false);
    }
    verificarAcesso();
  }, [router]);

  async function carregarDados() {
    setCarregando(true);
    try {
      const hoje = new Date();
      const [ano, mes] = mesFiltro.split('-');
      const dataInicio = `${ano}-${mes}-01`;
      
      const ultimoDiaObjeto = new Date(parseInt(ano), parseInt(mes), 0);
      const dataFim = `${ano}-${mes}-${String(ultimoDiaObjeto.getDate()).padStart(2, '0')}`;

      const { data: listaAlunos } = await supabase.from('alunos').select('*');
      
      // 1. Busca receitas consolidadas pagas dentro do mês corrente (Fluxo de Caixa)
      const { data: pgtosMes = [] } = await supabase.from('historico_pagamentos').select('*').gte('data_pagamento', dataInicio).lte('data_pagamento', dataFim);
      
      // 2. Busca TODAS as receitas que estão com status pendente ou parcial de forma atemporal (Garante visibilidade das dívidas avulsas)
      const { data: pgtosPendentes = [] } = await supabase.from('historico_pagamentos').select('*').in('status', ['pendente', 'parcial']);

      // 3. Busca pgtos (Mês de Referência) para validação correta do status da tabela de mensalidades
      const nomeMesReferencia = mesesAno[parseInt(mes) - 1];
      const { data: pgtosReferencia = [] } = await supabase.from('historico_pagamentos')
        .select('aluno_id')
        .eq('tipo', 'mensalidade')
        .like('descricao', `%${nomeMesReferencia}%${ano}%`);

      // Unifica as listas removendo duplicidades por ID para alimentar a listagem geral da página
      const mapaPgtos = new Map();
      (pgtosMes || []).forEach(p => mapaPgtos.set(p.id, p));
      (pgtosPendentes || []).forEach(p => mapaPgtos.set(p.id, p));
      const pgtosFiltrados = Array.from(mapaPgtos.values());
      
      setListaReceitasDetalhada(pgtosFiltrados);

      const { data: gastosMes } = await supabase.from('gastos').select('*').gte('data_gasto', dataInicio).lte('data_gasto', dataFim);
      const { data: contasPagasMes } = await supabase.from('contas_a_pagar').select('id, descricao, valor, data_pagamento').eq('pago', true).gte('data_pagamento', dataInicio).lte('data_pagamento', dataFim);

      const { data: todosPgtosEventos } = await supabase.from('historico_pagamentos').select('*').eq('tipo', 'evento');
      if (todosPgtosEventos) setHistoricoPagamentosEventos(todosPgtosEventos);

      const { data: listaEventos } = await supabase.from('eventos_controle').select('*').eq('arquivado', false);
      if (listaEventos) setEventosAtivos(listaEventos);

      const contasFormatadas = (contasPagasMes || []).map(account => ({
        id: account.id,
        descricao: `[Conta Fixa] ${account.descricao}`,
        valor: account.valor,
        data_gasto: account.data_pagamento
      }));
      setListaGastosDetalhada([...(gastosMes || []), ...contasFormatadas]);

      // --- ENTRADAS EM MÍDIA (FLUXO DE CAIXA DO MÊS ATUAL) ---
      const pgtosEfetuadosEsteMes = pgtosFiltrados.filter(p => p.data_pagamento && p.data_pagamento >= dataInicio && p.data_pagamento <= dataFim);
      const vPago = pgtosEfetuadosEsteMes.reduce((acc, curr) => acc + (parseFloat(curr.valor_pago || curr.valor_total) || 0), 0);

      // Correção ortográfica de indexador ("dinero" -> "dinheiro") para expurgar bugs no painel
      const metodosResumo = pgtosEfetuadosEsteMes.reduce((acc, curr) => {
        const det = curr.detalhes_metodos || {};
        acc.pix += parseFloat(det.pix || 0);
        acc.dinheiro += parseFloat(det.dinheiro || 0);
        acc.credito += parseFloat(det.credito || 0);
        acc.debito += parseFloat(det.debito || 0);
        return acc;
      }, { pix: 0, dinheiro: 0, credito: 0, debito: 0 });
      setResumoMetodos(metodosResumo);
      
      let vGastos = 0;
      if (gastosMes) vGastos += gastosMes.reduce((acc, curr) => acc + (parseFloat(curr.valor) || 0), 0);
      if (contasPagasMes) vGastos += contasPagasMes.reduce((acc, curr) => acc + (parseFloat(curr.valor) || 0), 0);

      if (listaAlunos) {
        setAlunos(listaAlunos);
        const idsPagosNestaReferencia = (pgtosReferencia || []).map((p: any) => p.aluno_id);

        // MANTER RIGOROSAMENTE A SUA ORDENAÇÃO ORIGINAL POR DATA DE VENCIMENTO / STATUS DE MENSALIDADE
        const ordenados = listaAlunos.map(aluno => {
          const estaPagoNesseMes = idsPagosNestaReferencia.includes(aluno.id);
          if (estaPagoNesseMes) return { ...aluno, status: 'pago' };
          return hoje.getDate() > (parseInt(aluno.vencimento) || 1) ? { ...aluno, status: 'atrasado' } : { ...aluno, status: 'pendente' };
        }).sort((a, b) => (a.status === 'pago' ? 1 : 0) - (b.status === 'pago' ? 1 : 0) || (parseInt(a.vencimento) || 0) - (parseInt(b.vencimento) || 0));
        
        setAlunos(ordenados);
        
        // --- CÁLCULO DAS MÉTRICAS GLOBAIS INTEGRANDO AS TAXAS AVULSAS E EM LOTE ---
        const mensalidadesPrevistas = listaAlunos.reduce((acc, curr) => acc + (parseFloat(curr.valor) || 0), 0);
        
        const stringFiltroMensalidade = `${nomeMesReferencia}/${ano}`;
        const mensalidadesDesteMes = pgtosFiltrados.filter(p => p.tipo === 'mensalidade' && p.descricao.includes(stringFiltroMensalidade));
        const vMensalidadesDesteMesPago = mensalidadesDesteMes.reduce((acc, curr) => acc + (parseFloat(curr.valor_pago) || 0), 0);
        const vMensalidadesDesteMesPendente = Math.max(0, mensalidadesPrevistas - vMensalidadesDesteMesPago);

        const todasPendenciasExtras = pgtosFiltrados.filter(p => p.status === 'pendente' || p.status === 'parcial');
        const vExtrasPendente = todasPendenciasExtras.reduce((acc, curr) => acc + ((parseFloat(curr.valor_total) || 0) - (parseFloat(curr.valor_pago) || 0)), 0);

        // Consolidação dos Cards Financeiros
        const totalPendenteCaixa = vMensalidadesDesteMesPendente + vExtrasPendente;
        const totalGeralPrevisto = vPago + totalPendenteCaixa;

        const totalDescontos = listaAlunos.reduce((acc, curr) => acc + Math.max(0, valorPadrao - (parseFloat(curr.valor) || 0)), 0);
        
        setMetricas({ 
          total: totalGeralPrevisto, 
          pago: vPago, 
          pendente: totalPendenteCaixa, 
          descontos: totalDescontos, 
          gastos: vGastos, 
          lucro: vPago - vGastos 
        });
      }
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally { setCarregando(false); }
  }

  useEffect(() => { if (!verificandoAcesso) carregarDados(); }, [mesFiltro, valorPadrao, verificandoAcesso]);

  function gerarRelatorioTesouraria() {
    const doc = new jsPDF();
    const [ano, mesNum] = mesFiltro.split('-');
    const nomeMes = mesesAno[parseInt(mesNum) - 1];
    const logoUrl = "https://mnmakhazghgncqummksu.supabase.co/storage/v1/object/public/assets/logo.png";

    try { doc.addImage(logoUrl, "PNG", 15, 10, 25, 25); } catch (e) {}
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("BALANÇO FINANCEIRO MENSAL", 105, 20, { align: "center" });
    doc.setFontSize(12);
    doc.text(`ESCOLA ABC DO PARK - ${nomeMes.toUpperCase()} / ${ano}`, 105, 28, { align: "center" });
    doc.setFontSize(9);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 105, 33, { align: "center" });

    autoTable(doc, {
      startY: 45,
      head: [['RESUMO DO PERÍODO', 'VALOR ACUMULADO']],
      body: [
        ['(+) TOTAL DE ENTRADAS (RECEBIMENTOS)', `R$ ${metricas.pago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
        ['(-) TOTAL DE SAÍDAS (DESPESAS E CONTAS)', `R$ ${metricas.gastos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
        ['(=) SALDO LÍQUIDO EM CAIXA', `R$ ${metricas.lucro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`]
      ],
      theme: 'grid',
      headStyles: { fillColor: [30, 58, 138], halign: 'center' },
      styles: { halign: 'right', fontSize: 10, fontStyle: 'bold' },
      columnStyles: { 0: { halign: 'left' } },
      didParseCell: (data) => {
        if (data.section === 'body' && data.row.index === 2) {
          data.cell.styles.textColor = metricas.lucro >= 0 ? [22, 101, 52] : [153, 27, 27];
        }
      }
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("1. RELAÇÃO DE ENTRADAS (DETALHADO)", 15, (doc as any).lastAutoTable.finalY + 12);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 15,
      head: [['DATA', 'ALUNO / ORIGEM', 'DESCRIÇÃO', 'VALOR EFETIVADO']],
      body: listaReceitasDetalhada.map(p => {
        const alunoNome = alunos.find(a => a.id === p.aluno_id)?.nome || "DIVERSOS / OUTRO";
        return [
          p.data_pagamento ? new Date(p.data_pagamento + "T12:00:00").toLocaleDateString('pt-BR') : '--',
          alunoNome.toUpperCase(),
          p.descricao.toUpperCase(),
          `R$ ${parseFloat(p.valor_pago || p.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        ];
      }),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [16, 185, 129] },
      alternateRowStyles: { fillColor: [240, 253, 244] }
    });

    doc.setFont("helvetica", "bold");
    doc.text("2. RELAÇÃO DE SAÍDAS (DETALHADO)", 15, (doc as any).lastAutoTable.finalY + 12);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 15,
      head: [['DATA', 'DESCRIÇÃO DA DESPESA', 'VALOR']],
      body: listaGastosDetalhada.map(g => [
        new Date(g.data_gasto + "T12:00:00").toLocaleDateString('pt-BR'),
        g.descricao.toUpperCase(),
        `R$ ${parseFloat(g.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [239, 68, 68] },
      alternateRowStyles: { fillColor: [254, 242, 242] }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 35;
    if (finalY > 270) doc.addPage();
    doc.line(20, finalY, 90, finalY);
    doc.line(120, finalY, 190, finalY);
    doc.setFontSize(9);
    doc.text("TESOURARIA / RESPONSÁVEL", 55, finalY + 5, { align: "center" });
    doc.text("DIREÇÃO ESCOLAR", 155, finalY + 5, { align: "center" });

    doc.save(`Fechamento_Tesouraria_${nomeMes}.pdf`);
  }

  // --- AMORTIZAÇÃO E RECEBIMENTO UNIVERSAL ---
  async function confirmarPagamento() {
    if (idPagamentoEdicao && userEmail !== 'carlamonaliza9@gmail.com' && userCargo !== 'Admin') {
      return alert("A direção não possui permissão para alterar ou editar lançamentos salvos.");
    }

    const somaPaga = Object.values(pagamentosMetodos).reduce((acc, val) => acc + (parseFloat(val as string) || 0), 0);
    if (somaPaga <= 0) return alert("Insira um valor.");

    const creditoUtilizado = parseFloat((pagamentosMetodos as any).credito || 0);
    const saldoDisponivel = parseFloat(alunoSelecionado?.saldo_credito || 0);

    if (creditoUtilizado > saldoDisponivel) {
      return alert(`O aluno possui apenas R$ ${saldoDisponivel.toFixed(2)} de crédito disponível.`);
    }

    const anoFiltro = mesFiltro.split('-')[0];
    const descRef = tipoPagamento === 'mensalidade' ? `Mensalidade - ${mesReferencia}/${anoFiltro}` : `Evento: ${eventoParaGerenciar?.nome}`;
    
    let valorEsperado = 0;
    if (tipoPagamento === 'mensalidade') {
      valorEsperado = parseFloat(alunoSelecionado.valor) || valorPadrao;
    } else if (tipoPagamento === 'evento') {
      valorEsperado = parseFloat(eventoParaGerenciar?.valor_unitario) || 0;
    } else if (idPagamentoEdicao) {
      const existente = listaReceitasDetalhada.find(r => r.id === idPagamentoEdicao);
      valorEsperado = parseFloat(existente?.valor_total) || 0;
    }

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

    const dados = { 
      aluno_id: alunoSelecionado.id, 
      tipo: tipoPagamento, 
      descricao: descricaoOutro || descRef, 
      valor_total: valorEsperado > 0 ? valorEsperado : somaPaga, 
      valor_pago: valorPagoFinal,
      status: status,
      data_pagamento: dataPagamento, 
      detalhes_metodos: pagamentosMetodos 
    };

    if (idPagamentoEdicao) {
      await supabase.from('historico_pagamentos').update(dados).eq('id', idPagamentoEdicao);
    } else {
      await supabase.from('historico_pagamentos').insert([dados]);
    }

    const novoSaldoCredito = saldoDisponivel - creditoUtilizado + creditoGerado;
    if (novoSaldoCredito !== saldoDisponivel) {
      await supabase.from('alunos').update({ saldo_credito: novoSaldoCredito }).eq('id', alunoSelecionado.id);
    }

    if (tipoPagamento === "mensalidade") {
      await supabase.from('alunos').update({ status: status === 'pago' ? 'pago' : 'pendente' }).eq('id', alunoSelecionado.id);
    }

    setModalPgtoAberto(false); 
    carregarDados();
  }

  async function handleExcluirGasto(id: string) {
    if (userEmail !== 'carlamonaliza9@gmail.com') return alert("Apenas a Carla pode excluir.");
    if (prompt("Senha Mestra para EXCLUIR GASTO:") === SENHA_MESTRA) {
       if(confirm("Confirmar exclusão definitiva deste gasto?")) {
          await supabase.from('gastos').delete().eq('id', id);
          carregarDados();
       }
    } else { alert("Senha incorreta."); }
  }

  async function handleExcluirReceita(id: string) {
    if (userEmail !== 'carlamonaliza9@gmail.com') return alert("Apenas a Carla pode excluir.");
    if (prompt("Senha Mestra para EXCLUIR RECEITA:") === SENHA_MESTRA) {
      if(confirm("Confirmar exclusão desta receita? O status do aluno voltará para pendente.")) {
        const { data: pgto } = await supabase.from('historico_pagamentos').select('aluno_id, tipo').eq('id', id).single();
        if (pgto?.tipo === 'mensalidade') await supabase.from('alunos').update({ status: 'pendente' }).eq('id', pgto.aluno_id);
        await supabase.from('historico_pagamentos').delete().eq('id', id);
        carregarDados();
      }
    } else { alert("Senha incorreta."); }
  }

  async function salvarEvento() {
    if (userEmail !== 'carlamonaliza9@gmail.com' && userCargo !== 'Admin') {
      return alert("A direção não possui permissão para estruturar ou alterar eventos.");
    }

    if (!nomeEvento || !valorEvento || (!idEventoEdicao && alunosSelecionados.length === 0)) return alert("Preencha tudo.");
    const dados = { nome: nomeEvento, valor_unitario: parseFloat(valorEvento), total_alunos: idEventoEdicao ? eventosAtivos.find(e => e.id === idEventoEdicao)?.total_alunos : alunosSelecionados.length, participantes: idEventoEdicao ? eventosAtivos.find(e => e.id === idEventoEdicao)?.participantes : alunosSelecionados, arquivado: false };
    if (idEventoEdicao) await supabase.from('eventos_controle').update(dados).eq('id', idEventoEdicao);
    else await supabase.from('eventos_controle').insert([dados]);
    setModalEventoAberto(false); carregarDados();
  }

  async function adicionarGasto() {
    if (userEmail !== 'carlamonaliza9@gmail.com' && userCargo !== 'Admin') {
      return alert("A direção não possui permissão para registrar novas despesas.");
    }

    await supabase.from('gastos').insert([{ descricao: descGasto, valor: parseFloat(valorGasto), data_gasto: dataGasto }]);
    setModalGastoAberto(false); setDescGasto(""); setValorGasto(""); carregarDados();
  }

  const alunosFiltrados = alunos.filter(aluno => aluno.nome?.toLowerCase().includes(filtroNome.toLowerCase()));

  return (
    <div style={{ width: '100%', padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
      
      <FinanceiroHeader 
        mesFiltro={mesFiltro} setMesFiltro={setMesFiltro}
        onNovoEvento={() => {
          if (userEmail !== 'carlamonaliza9@gmail.com' && userCargo !== 'Admin') return alert("Ação restrita ao perfil de Administrador.");
          setIdEventoEdicao(null); setNomeEvento(""); setValorEvento(""); setAlunosSelecionados([]); setModalEventoAberto(true);
        }}
        onRegistrarGasto={() => {
          if (userEmail !== 'carlamonaliza9@gmail.com' && userCargo !== 'Admin') return alert("Ação restrita ao perfil de Administrador.");
          setModalGastoAberto(true);
        }}
        onVendaUniforme={() => setModalUniformeAberto(true)}
        onZerarMes={() => {}} 
        valorPadrao={valorPadrao} setValorPadrao={setValorPadrao}
        editandoValor={editandoValor} setEditandoValor={setEditandoValor}
        senhaMestra={SENHA_MESTRA}
      />

      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
        <button 
          onClick={() => setModalTaxasAberto(true)}
          style={{ padding: '12px 24px', borderRadius: '12px', backgroundColor: '#10b981', color: 'white', fontWeight: 'bold', border: 'none', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
        >
          📦 Gerar Taxas Anuais (Lote)
        </button>
        <button 
          onClick={gerarRelatorioTesouraria}
          style={{ padding: '12px 24px', borderRadius: '12px', backgroundColor: '#1e3a8a', color: 'white', fontWeight: 'bold', border: 'none', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
        >
          📊 Gerar Relatório Tesouraria Profissional (PDF)
        </button>
      </div>

      {/* RECURSO DE PRIVACIDADE: CARD DE MÉTRICAS COM DESFOQUE SELETIVO */}
      <div style={{ position: 'relative', marginBottom: '25px' }}>
        <div style={{ filter: mostrarValores ? 'none' : 'blur(8px)', transition: 'filter 0.3s ease', pointerEvents: mostrarValores ? 'auto' : 'none' }}>
          <MetricasCard 
            metricas={metricas} 
            onAbrirListaGastos={() => setModalListaGastosAberto(true)} 
            onAbrirListaReceitas={() => setModalListaReceitasAberto(true)}
          />
        </div>
        {!mostrarValores && (
          <div 
            onClick={() => setMostrarValores(true)}
            style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(243, 244, 246, 0.3)', cursor: 'pointer', zIndex: 10, borderRadius: '20px' }}
          >
            <button 
              style={{ padding: '12px 24px', backgroundColor: '#1e3a8a', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(30, 58, 138, 0.3)' }}
            >
              👁️ Liberar Visualização do Mês
            </button>
          </div>
        )}
      </div>

      {/* PAINEL COMPLEMENTAR MODULARIZADO (AUDITORIA DE CONTAS CORRENTES GLOBAL) */}
      <PainelAuditoria alunos={alunos} listaReceitasDetalhada={listaReceitasDetalhada} />

      <TabelaMensalidades 
        alunos={alunosFiltrados} filtroNome={filtroNome} setFiltroNome={setFiltroNome}
        onPagamento={(a) => { setAlunoSelecionado(a); setTipoPagamento("mensalidade"); setPagamentosMetodos({ pix: (a.valor || valorPadrao).toString(), dinheiro: "", credito: "", debito: "", multa: "" }); setModalPgtoAberto(true); }}
        onCobrar={(a) => {
          const msg = `Olá! Passando para lembrar que a mensalidade escolar de *${a.nome}*, referente a *${mesReferencia}*, venceu no dia *${a.vencimento}*.\n\n• *Valor:* ${a.valor || valorPadrao}\n\nCaso já tenha realizado o pagamento, por favor, desconsidere esta mensagem ou nos envie o comprovante para darmos a baixa no sistema. \n\nTenha um excelente dia! ✨`;
           window.open(`https://wa.me/55${a.whatsapp?.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
        }}
        onDesfazer={async (id) => { 
          if (userEmail !== 'carlamonaliza9@gmail.com') return alert("Apenas a Carla Monaliza pode desfazer registros salvos.");
          if (prompt("Digite a Senha Mestra para confirmar:") !== SENHA_MESTRA) return alert("Senha incorreta.");
          if(confirm("Desfazer mensalidade? O registro sumirá da ficha do aluno.")) { 
            const [ano, mes] = mesFiltro.split('-');
            const nomeMesRef = mesesAno[parseInt(mes) - 1];
            await supabase.from('alunos').update({ status: 'pendente' }).eq('id', id); 
            await supabase.from('historico_pagamentos').delete().eq('aluno_id', id).eq('tipo', 'mensalidade').like('descricao', `%${nomeMesRef}%${ano}%`);
            carregarDados(); 
          } 
        }}
      />

      <BalancoResumo resumoMetodos={resumoMetodos} metricas={metricas} mesFiltro={mesFiltro} />

      <GestaoEventos 
        eventosAtivos={eventosAtivos} eventoParaGerenciar={eventoParaGerenciar} setEventoParaGerenciar={setEventoParaGerenciar}
        alunos={alunos} historicoPagamentosEventos={historicoPagamentosEventos}
        onEditarEvento={(ev) => {
          if (userEmail !== 'carlamonaliza9@gmail.com' && userCargo !== 'Admin') return alert("Ação restrita ao perfil de Administrador.");
          setIdEventoEdicao(ev.id); setNomeEvento(ev.nome); setValorEvento(ev.valor_unitario.toString()); setModalEventoAberto(true);
        }}
        onExcluirEvento={async (id) => { 
          if (userEmail !== 'carlamonaliza9@gmail.com') return alert("Apenas a Carla Monaliza pode excluir eventos.");
          if (prompt("Digite a Senha Mestra:") !== SENHA_MESTRA) return alert("Senha incorreta.");
          if(confirm("Excluir evento e todos os pagamentos registrados para ele?")) { 
            const evento = eventosAtivos.find((e: any) => e.id === id);
            if (evento) await supabase.from('historico_pagamentos').delete().eq('tipo', 'evento').like('descricao', `%${evento.nome}%`);
            await supabase.from('eventos_controle').delete().eq('id', id); carregarDados(); 
          } 
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
          if (pgto) { setIdPagamentoEdicao(pgto.id); setPagamentosMetodos(pgto.detalhes_metodos); setDescricaoOutro(pgto.descricao); }
          else { setIdPagamentoEdicao(null); setPagamentosMetodos({ pix: ev.valor_unitario.toString(), dinheiro: "", credito: "", debito: "", multa: "" }); setDescricaoOutro(`Evento: ${ev.nome}`); }
          setModalPgtoAberto(true);
        }}
        onExcluirPagamento={handleExcluirReceita}
      />

      {/* CHAMADAS DOS MODAIS MODULARIZADOS COM CAMINHO GLOBAL DE PROJETO */}
      <ModalUniforme aberto={modalUniformeAberto} onFechar={() => setModalUniformeAberto(false)} alunos={alunos} carregarDados={carregarDados} />
      
      <ModalTaxas aberto={modalTaxasAberto} onFechar={() => setModalTaxasAberto(false)} alunos={alunos} carregarDados={carregarDados} />

      <ModalPagamento 
        aberto={modalPgtoAberto} onFechar={() => setModalPgtoAberto(false)}
        aluno={alunoSelecionado} dataPagamento={dataPagamento} setDataPagamento={setDataPagamento}
        tipoPagamento={tipoPagamento} setTipoPagamento={setTipoPagamento}
        mesReferencia={mesReferencia} setMesReferencia={setMesReferencia} mesesAno={mesesAno}
        descricaoOutro={descricaoOutro} setDescricaoOutro={setDescricaoOutro}
        pagamentosMetodos={pagamentosMetodos} setPagamentosMetodos={setPagamentosMetodos}
        onConfirmar={confirmarPagamento} editando={!!idPagamentoEdicao}
      />

      <ModalGasto 
        aberto={modalGastoAberto} onFechar={() => setModalGastoAberto(false)}
        dataGasto={dataGasto} setDataGasto={setDataGasto} descGasto={descGasto} setDescGasto={setDescGasto}
        valorGasto={valorGasto} setValorGasto={setValorGasto} onAdicionar={adicionarGasto}
      />

      <ModalEvento 
        aberto={modalEventoAberto} onFechar={() => setModalEventoAberto(false)}
        idEventoEdicao={idEventoEdicao} nomeEvento={nomeEvento} setNomeEvento={setNomeEvento}
        valorEvento={valorEvento} setValorEvento={setValorEvento}
        alunos={alunos} alunosSelecionados={alunosSelecionados}
        toggleAlunoSelecao={(id) => setAlunosSelecionados(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id])}
        toggleSelecionarTodos={() => setAlunosSelecionados(alunosSelecionados.length === alunos.length ? [] : alunos.map(a => a.id))}
        onSalvar={salvarEvento}
      />

      <ModalListaGastos 
        aberto={modalListaGastosAberto} onFechar={() => setModalListaGastosAberto(false)}
        mesFiltro={mesFiltro} listaGastos={listaGastosDetalhada}
        onExcluir={handleExcluirGasto}
      />

      <ModalListaGastos 
        titulo="Detalhamento de Receitas"
        aberto={modalListaReceitasAberto} onFechar={() => setModalListaReceitasAberto(false)}
        mesFiltro={mesFiltro} 
        listaGastos={listaReceitasDetalhada.map(r => ({ 
          ...r, 
          descricao: `${alunos.find(a => a.id === r.aluno_id)?.nome || 'Outro'} - ${r.descricao}`, 
          data_gasto: r.data_pagamento, 
          valor: r.valor_total 
        }))}
        onExcluir={handleExcluirReceita}
      />

    </div>
  );
}