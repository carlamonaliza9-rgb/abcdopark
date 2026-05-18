"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Importação dos Componentes de Layout Essenciais para o Dashboard
import { FinanceiroHeader } from "@/app/dashboard/financeiro/_components/FinanceiroHeader";
import { MetricasCard } from "@/app/dashboard/financeiro/_components/MetricasCard";
import { BalancoResumo } from "@/app/dashboard/financeiro/_components/BalancoResumo";

// Importação dos Modais de Consulta de Listas Rápidas
import { ModalListaGastos } from "@/app/dashboard/financeiro/_components/ModalListaGastos";

export default function FinanceiroAdminPage() {
  const router = useRouter();
  const [verificandoAcesso, setVerificandoAcesso] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // --- ESTADOS DE DADOS ---
  const [valorPadrao, setValorPadrao] = useState(550);
  const [editandoValor, setEditandoValor] = useState(false);
  const [mesFiltro, setMesFiltro] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
  const [alunos, setAlunos] = useState<any[]>([]);
  const [metricas, setMetricas] = useState({ total: 0, pago: 0, pendente: 0, descontos: 0, gastos: 0, lucro: 0 });
  const [resumoMetodos, setResumoMetodos] = useState({ pix: 0, dinheiro: 0, credito: 0, debito: 0 });
  const [carregando, setCarregando] = useState(true);

  // --- ESTADOS DE CONTROLE DE MODAIS DE LISTAGEM ---
  const [modalListaGastosAberto, setModalListaGastosAberto] = useState(false); 
  const [modalListaReceitasAberto, setModalListaReceitasAberto] = useState(false);

  // --- ESTADOS DE FORMULÁRIOS E HISTÓRICOS ---
  const [listaGastosDetalhada, setListaGastosDetalhada] = useState<any[]>([]); 
  const [listaReceitasDetalhada, setListaReceitasDetalhada] = useState<any[]>([]);

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
      
      const { data: pgtosMes = [] } = await supabase.from('historico_pagamentos').select('*').gte('data_pagamento', dataInicio).lte('data_pagamento', dataFim);
      const { data: pgtosPendentes = [] } = await supabase.from('historico_pagamentos').select('*').in('status', ['pendente', 'parcial']);

      const nomeMesReferencia = mesesAno[parseInt(mes) - 1];
      const { data: pgtosReferencia = [] } = await supabase.from('historico_pagamentos')
        .select('aluno_id')
        .eq('tipo', 'mensalidade')
        .like('descricao', `%${nomeMesReferencia}%${ano}%`);

      const mapaPgtos = new Map();
      (pgtosMes || []).forEach(p => mapaPgtos.set(p.id, p));
      (pgtosPendentes || []).forEach(p => mapaPgtos.set(p.id, p));
      const pgtosFiltrados = Array.from(mapaPgtos.values());
      
      setListaReceitasDetalhada(pgtosFiltrados);

      const { data: gastosMes } = await supabase.from('gastos').select('*').gte('data_gasto', dataInicio).lte('data_gasto', dataFim);
      const { data: contasPagasMes = [] } = await supabase.from('contas_a_pagar').select('id, descricao, valor, data_pagamento').eq('pago', true).gte('data_pagamento', dataInicio).lte('data_pagamento', dataFim);

      const contasFormatadas = (contasPagasMes || []).map(account => ({
        id: account.id,
        descricao: `[Conta Fixa] ${account.descricao}`,
        valor: account.valor,
        data_gasto: account.data_pagamento
      }));
      setListaGastosDetalhada([...(gastosMes || []), ...contasFormatadas]);

      const pgtosEfetuadosEsteMes = pgtosFiltrados.filter(p => p.data_pagamento && p.data_pagamento >= dataInicio && p.data_pagamento <= dataFim);
      const vPago = pgtosEfetuadosEsteMes.reduce((acc, curr) => acc + (parseFloat(curr.valor_pago || curr.valor_total) || 0), 0);

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
        const idsPagosNestaReferencia = (pgtosReferencia || []).map((p: any) => p.aluno_id);

        const ordenados = listaAlunos.map(aluno => {
          const estaPagoNesseMes = idsPagosNestaReferencia.includes(aluno.id);
          if (estaPagoNesseMes) return { ...aluno, status: 'pago' };
          return hoje.getDate() > (parseInt(aluno.vencimento) || 1) ? { ...aluno, status: 'atrasado' } : { ...aluno, status: 'pendente' };
        });
        
        setAlunos(ordenados);
        
        const mensalidadesPrevistas = listaAlunos.reduce((acc, curr) => acc + (parseFloat(curr.valor) || 0), 0);
        
        const stringFiltroMensalidade = `${nomeMesReferencia}/${ano}`;
        const mensalidadesDesteMes = pgtosFiltrados.filter(p => p.tipo === 'mensalidade' && p.descricao.includes(stringFiltroMensalidade));
        const vMensalidadesDesteMesPago = mensalidadesDesteMes.reduce((acc, curr) => acc + (parseFloat(curr.valor_pago) || 0), 0);
        const vMensalidadesDesteMesPendente = Math.max(0, mensalidadesPrevistas - vMensalidadesDesteMesPago);

        const todasPendenciasExtras = pgtosFiltrados.filter(p => p.status === 'pendente' || p.status === 'parcial');
        const vExtrasPendente = todasPendenciasExtras.reduce((acc, curr) => acc + ((parseFloat(curr.valor_total) || 0) - (parseFloat(curr.valor_pago) || 0)), 0);

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

  // --- EMISSOR DE PDF DETALHADO POR CORES SÓLIDAS ---
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
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}, ${new Date().toLocaleTimeString('pt-BR')}`, 195, 33, { align: "right" });

    autoTable(doc, {
      startY: 40,
      head: [['RESUMO DO PERÍODO', 'VALOR ACUMULADO']],
      body: [
        ['(+) TOTAL DE ENTRADAS (RECEBIMENTOS)', `R$ ${metricas.pago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
        ['(-) TOTAL DE SAÍDAS (DESPESAS E CONTAS)', `R$ ${metricas.gastos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
        ['(=) SALDO LÍQUIDO EM CAIXA', `R$ ${metricas.lucro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`]
      ],
      theme: 'grid',
      headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], halign: 'center', fontStyle: 'bold' },
      styles: { halign: 'right', fontSize: 9.5, fontStyle: 'bold', textColor: [30, 41, 59] },
      columnStyles: { 0: { halign: 'left' } }
    });

    const dataInicio = `${ano}-${mesNum}-01`;
    const ultimoDiaObjeto = new Date(parseInt(ano), parseInt(mesNum), 0);
    const dataFim = `${ano}-${mesNum}-${String(ultimoDiaObjeto.getDate()).padStart(2, '0')}`;
    const pgtosEfetuadosEsteMes = listaReceitasDetalhada.filter(p => p.data_pagamento && p.data_pagamento >= dataInicio && p.data_pagamento <= dataFim);

    let finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(16, 124, 65); 
    doc.text("1. RELAÇÃO DE ENTRADAS (DETALHADO)", 15, finalY);

    const rowsEntradas = pgtosEfetuadosEsteMes.map(r => {
      const nomeAluno = alunos.find(a => a.id === r.aluno_id)?.nome || 'OUTRO';
      const dataFormated = r.data_pagamento ? new Date(r.data_pagamento + "T12:00:00").toLocaleDateString('pt-BR') : '--';
      const valorFormated = `R$ ${parseFloat(r.valor_pago || r.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
      return [dataFormated, nomeAluno.toUpperCase(), r.descricao?.toUpperCase() || '', valorFormated];
    });

    autoTable(doc, {
      startY: finalY + 4,
      head: [['DATA', 'ALUNO/ORIGEM', 'DESCRIÇÃO', 'VALOR']],
      body: rowsEntradas,
      theme: 'grid',
      headStyles: { fillColor: [16, 124, 65], textColor: [255, 255, 255], halign: 'center', fontStyle: 'bold' }, 
      styles: { fontSize: 8, textColor: [51, 65, 85] },
      columnStyles: { 0: { halign: 'center', cellWidth: 22 }, 1: { halign: 'left', cellWidth: 55 }, 2: { halign: 'left' }, 3: { halign: 'right', cellWidth: 28 } }
    });

    finalY = (doc as any).lastAutoTable.finalY + 10;
    if (finalY > 260) { doc.addPage(); finalY = 20; }
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(220, 38, 38); 
    doc.text("2. RELAÇÃO DE SAÍDAS (DETALHADO)", 15, finalY);

    const rowsSaidas = listaGastosDetalhada.map(g => {
      const dataFormated = g.data_gasto ? new Date(g.data_gasto + "T12:00:00").toLocaleDateString('pt-BR') : '--';
      const valorFormated = `R$ ${parseFloat(g.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
      return [dataFormated, g.descricao?.toUpperCase() || '', valorFormated];
    });

    autoTable(doc, {
      startY: finalY + 4,
      head: [['DATA', 'DESCRIÇÃO DA DESPESA', 'VALOR']],
      body: rowsSaidas,
      theme: 'grid',
      headStyles: { fillColor: [220, 38, 38], textColor: [255, 255, 255], halign: 'center', fontStyle: 'bold' }, 
      styles: { fontSize: 8, textColor: [51, 65, 85] },
      columnStyles: { 0: { halign: 'center', cellWidth: 22 }, 1: { halign: 'left' }, 2: { halign: 'right', cellWidth: 28 } }
    });

    finalY = (doc as any).lastAutoTable.finalY + 22;
    if (finalY > 250) { doc.addPage(); finalY = 35; }
    
    doc.setDrawColor(203, 213, 225);
    doc.line(20, finalY, 90, finalY);
    doc.line(120, finalY, 190, finalY);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text("TESOURARIA / RESPONSÁVEL", 55, finalY + 5, { align: "center" });
    doc.text("DIREÇÃO ESCOLAR", 155, finalY + 5, { align: "center" });

    doc.save(`Fechamento_Tesouraria_${nomeMes}_${ano}.pdf`);
  }

  async function handleExcluirGasto(id: string) {
    if (userEmail !== 'carlamonaliza9@gmail.com') return alert("Apenas a Carla pode excluir.");
    if (prompt("Senha Mestra:") === SENHA_MESTRA) {
      await supabase.from('gastos').delete().eq('id', id);
      carregarDados();
    }
  }

  async function handleExcluirReceita(id: string) {
    if (userEmail !== 'carlamonaliza9@gmail.com') return alert("Apenas a Carla pode excluir.");
    if (prompt("Senha Mestra:") === SENHA_MESTRA) {
      await supabase.from('historico_pagamentos').delete().eq('id', id);
      carregarDados();
    }
  }

  if (verificandoAcesso || carregando) return <div className="p-10 text-center font-sans text-slate-400 font-medium">Carregando painel financeiro global...</div>;

  return (
    // Removido estilos embutidos e envelopado em uma Grid semântica com espaçamento profissional do Tailwind
    <div className="w-full min-h-screen bg-slate-50/50 p-6 md:p-8 font-sans antialiased text-slate-800">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Bloco 1: Header de Filtros */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <FinanceiroHeader 
            mesFiltro={mesFiltro} setMesFiltro={setMesFiltro}
            onNovoEvento={() => router.push("/admin/financeiro/eventos")}
            onRegistrarGasto={() => router.push("/admin/financeiro/despesas")}
            onVendaUniforme={() => router.push("/admin/financeiro/vendas-taxas")}
            onZerarMes={() => {}} 
            valorPadrao={valorPadrao} setValorPadrao={setValorPadrao}
            editandoValor={editandoValor} setEditandoValor={setEditandoValor}
            senhaMestra={SENHA_MESTRA}
          />
        </div>

        {/* Bloco 2: Barra de Ações Secundárias Reestilizada (Estilo SimplesVet) */}
        <div className="flex justify-end">
          <button 
            onClick={gerarRelatorioTesouraria}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-xl shadow-sm transition-all border border-slate-950/20 tracking-wide uppercase"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-slate-300">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            Gerar Relatório Balanço Consolidado (PDF)
          </button>
        </div>

        {/* Bloco 3: Grid de Informações Financeiras */}
        <div className="space-y-6">
          <MetricasCard 
            metricas={metricas} 
            onAbrirListaGastos={() => setModalListaGastosAberto(true)} 
            onAbrirListaReceitas={() => setModalListaReceitasAberto(true)}
          />
          
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <BalancoResumo resumoMetodos={resumoMetodos} metricas={metricas} mesFiltro={mesFiltro} />
          </div>
        </div>

      </div>

      {/* MODAIS DE CONVENIÊNCIA */}
      <ModalListaGastos 
        aberto={modalListaGastosAberto} onFechar={() => setModalListaGastosAberto(false)}
        mesFiltro={mesFiltro} listaGastos={listaGastosDetalhada} onExcluir={handleExcluirGasto}
      />

      <ModalListaGastos 
        titulo="Detalhamento de Receitas"
        aberto={modalListaReceitasAberto} onFechar={() => setModalListaReceitasAberto(false)}
        mesFiltro={mesFiltro} 
        listaGastos={listaReceitasDetalhada.map(r => {
          const etiquetaCategoria = 
            r.tipo === "mensalidade" ? "MENSALIDADE" :
            r.tipo === "uniforme" ? "UNIFORME" :
            r.tipo === "livro" ? "LIVRO DIDÁTICO" :
            r.tipo === "material" ? "TAXA DE MATERIAL" :
            r.tipo === "evento" ? "EVENTO" : "OUTROS";

          return { 
            ...r, 
            descricao: `[${etiquetaCategoria}] ${alunos.find(a => a.id === r.aluno_id)?.nome || 'Outro'} - ${r.descricao}`, 
            data_gasto: r.data_pagamento, 
            valor: r.valor_total 
          };
        })}
        onExcluir={handleExcluirReceita}
      />
    </div>
  );
}