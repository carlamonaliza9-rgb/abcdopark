"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { FinanceiroHeader } from "@/app/(sistema)/dashboard/financeiro/_components/FinanceiroHeader";
import { MetricasCard } from "@/app/(sistema)/dashboard/financeiro/_components/MetricasCard";
import { BalancoResumo } from "@/app/(sistema)/dashboard/financeiro/_components/BalancoResumo";
import { ModalListaGastos } from "@/app/(sistema)/dashboard/financeiro/_components/ModalListaGastos";

const clean = (val: any) => {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === 'number') return val;
  const str = String(val).trim();
  if (str.includes(',')) return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
  return parseFloat(str) || 0;
};

export default function FinanceiroAdminPage() {
  const router = useRouter();
  const [verificandoAcesso, setVerificandoAcesso] = useState(true);
  const [userCargo, setUserCargo] = useState<string | null>(null);

  const [mesFiltro, setMesFiltro] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
  const [alunos, setAlunos] = useState<any[]>([]);
  const [metricas, setMetricas] = useState({ total: 0, pago: 0, pendente: 0, descontos: 0, gastos: 0, lucro: 0 });
  const [resumoMetodos, setResumoMetodos] = useState({ pix: 0, dinheiro: 0, credito: 0, debito: 0 });
  const [carregando, setCarregando] = useState(true);

  const [radarInadimplencia, setRadarInadimplencia] = useState<any[]>([]);
  const [distribuicaoGastos, setDistribuicaoGastos] = useState({ fixas: 0, variaveis: 0, pctFixas: 0, pctVariaveis: 0 });
  const [timelineDiaria, setTimelineDiaria] = useState<any[]>([]);

  const [modalListaGastosAberto, setModalListaGastosAberto] = useState(false); 
  const [modalListaReceitasAberto, setModalListaReceitasAberto] = useState(false);

  const [listaGastosDetalhada, setListaGastosDetalhada] = useState<any[]>([]); 
  const [listaReceitasDetalhada, setListaReceitasDetalhada] = useState<any[]>([]);

  const mesesAno = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  useEffect(() => {
    async function verificarAcesso() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");

      const { data: perfil } = await supabase.from('perfis').select('cargo').eq('id', user.id).single();
      const cargoUtilizador = perfil?.cargo || "";
      setUserCargo(cargoUtilizador);

      const ehAutorizado = cargoUtilizador === 'Admin' || cargoUtilizador === 'Direção';

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
      
      const { data: pgtosMesDB } = await supabase.from('historico_pagamentos').select('*').gte('data_pagamento', dataInicio).lte('data_pagamento', dataFim);
      const { data: pgtosPendentesDB } = await supabase.from('historico_pagamentos').select('*').in('status', ['pendente', 'parcial', 'atrasado']);

      const pgtosMes = pgtosMesDB || [];
      const pgtosPendentes = pgtosPendentesDB || [];

      const nomeMesReferencia = mesesAno[parseInt(mes) - 1];
      const { data: pgtosReferencia = [] } = await supabase.from('historico_pagamentos')
        .select('aluno_id')
        .eq('tipo', 'mensalidade')
        .like('descricao', `%${nomeMesReferencia}%${ano}%`);

      const mapaPgtos = new Map();
      pgtosMes.forEach((p: any) => mapaPgtos.set(p.id, p));
      pgtosPendentes.forEach((p: any) => mapaPgtos.set(p.id, p));
      const pgtosFiltrados = Array.from(mapaPgtos.values());
      
      setListaReceitasDetalhada(pgtosFiltrados);

      const { data: gastosMes } = await supabase.from('gastos').select('*').gte('data_gasto', dataInicio).lte('data_gasto', dataFim);
      const { data: contasPagasMes = [] } = await supabase.from('contas_a_pagar').select('id, descricao, valor, data_pagamento').eq('pago', true).gte('data_pagamento', dataInicio).lte('data_pagamento', dataFim);

      const contasFormatadas = (contasPagasMes || []).map((account: any) => ({
        id: account.id,
        descricao: `[Conta Fixa] ${account.descricao}`,
        valor: account.valor,
        data_gasto: account.data_pagamento
      }));
      const todasAsDespesas = [...(gastosMes || []), ...contasFormatadas];
      setListaGastosDetalhada(todasAsDespesas);

      const pgtosEfetuadosEsteMes = pgtosFiltrados.filter((p: any) => p.data_pagamento && p.data_pagamento >= dataInicio && p.data_pagamento <= dataFim && (p.status === 'pago' || p.status === 'parcial'));
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
      let vFixas = 0;
      let vVariaveis = 0;

      todasAsDespesas.forEach((g: any) => {
        const val = clean(g.valor);
        vGastos += val;
        if (g.descricao?.includes("[Conta Fixa]")) {
          vFixas += val;
        } else {
          vVariaveis += val;
        }
      });

      const totalGastosMestre = vFixas + vVariaveis || 1;
      setDistribuicaoGastos({
        fixas: vFixas,
        variaveis: vVariaveis,
        pctFixas: Math.round((vFixas / totalGastosMestre) * 100),
        pctVariaveis: Math.round((vVariaveis / totalGastosMestre) * 100)
      });

      const diasNoMes = ultimoDiaObjeto.getDate();
      const mapaDias = Array.from({ length: diasNoMes }, (_, i) => ({ dia: i + 1, valor: 0 }));
      
      pgtosEfetuadosEsteMes.forEach((p: any) => {
        if (p.data_pagamento) {
          const diaComp = parseInt(p.data_pagamento.split('-')[2]);
          if (diaComp <= diasNoMes) {
            mapaDias[diaComp - 1].valor += clean(p.valor_pago || p.valor_total);
          }
        }
      });
      setTimelineDiaria(mapaDias);

      if (listaAlunos) {
        const idsPagosNestaReferencia = (pgtosReferencia || []).map((p: any) => p.aluno_id);

        const ordenados = listaAlunos.map((aluno: any) => {
          const estaPagoNesseMes = idsPagosNestaReferencia.includes(aluno.id);
          if (estaPagoNesseMes) return { ...aluno, status: 'pago' };

          // INTERCEPTAÇÃO DE ACORDOS: Identifica renegociações pendentes ou parciais do mês ativo
          const temAcordoDesteMes = pgtosPendentes.some((p: any) => {
            const isAcordo = p.tipo === 'acordo';
            const pertenceAluno = p.aluno_id === aluno.id;
            const isNoMesFiltro = p.data_pagamento && p.data_pagamento.startsWith(mesFiltro);
            return isAcordo && pertenceAluno && isNoMesFiltro;
          });

          if (temAcordoDesteMes) return { ...aluno, status: 'acordo' };
          
          return hoje.getDate() > (parseInt(aluno.vencimento) || 1) ? { ...aluno, status: 'atrasado' } : { ...aluno, status: 'pendente' };
        });
        
        setAlunos(ordenados);
        
        const mensalidadesPrevistas = listaAlunos.reduce((acc, curr) => acc + (parseFloat(curr.valor) || 0), 0);
        
        const stringFiltroMensalidade = `${nomeMesReferencia}/${ano}`;
        const mensalidadesDesteMes = pgtosFiltrados.filter((p: any) => p.tipo === 'mensalidade' && p.descricao.includes(stringFiltroMensalidade));
        const vMensalidadesDesteMesPago = mensalidadesDesteMes.reduce((acc, curr) => acc + (parseFloat(curr.valor_pago) || 0), 0);
        const vMensalidadesDesteMesPendente = Math.max(0, mensalidadesPrevistas - vMensalidadesDesteMesPago);

        const todasPendenciasExtras = pgtosFiltrados.filter((p: any) => p.status === 'pendente' || p.status === 'parcial' || p.status === 'atrasado');
        
        const extrasPendentesDesteMes = pgtosFiltrados.filter((p: any) => {
          const statusPendente = p.status === 'pendente' || p.status === 'parcial' || p.status === 'atrasado';
          if (!statusPendente) return false;
          if (p.tipo === 'mensalidade') return false;

          const dataAlvo = p.data_pagamento || p.data_vencimento || p.created_at;
          if (dataAlvo) {
            return dataAlvo.startsWith(`${ano}-${mes}`);
          }
          return p.descricao?.includes(nomeMesReferencia) && p.descricao?.includes(ano);
        });

        const vExtrasPendente = extrasPendentesDesteMes.reduce((acc, curr) => acc + ((parseFloat(curr.valor_total) || 0) - (parseFloat(curr.valor_pago) || 0)), 0);

        const totalPendenteCaixa = vMensalidadesDesteMesPendente + vExtrasPendente;
        const totalGeralPrevisto = vPago + totalPendenteCaixa;
        
        const mensalidadeLocal = typeof window !== 'undefined' ? localStorage.getItem('mensalidade_base') : null;
        const mensalidadeBaseVigente = mensalidadeLocal ? Number(mensalidadeLocal) : 550;

        const totalDescontos = listaAlunos.reduce((acc, curr) => acc + Math.max(0, mensalidadeBaseVigente - (parseFloat(curr.valor) || 0)), 0);
        
        setMetricas({ 
          total: totalGeralPrevisto, 
          pago: vPago, 
          pendente: totalPendenteCaixa, 
          descontos: totalDescontos, 
          gastos: vGastos, 
          lucro: vPago - vGastos 
        });

        const mapaDevedores = new Map();
        todasPendenciasExtras.forEach((pend: any) => {
          const saldoDevedor = clean(pend.valor_total) - clean(pend.valor_pago);
          if (saldoDevedor > 0) {
            if (!mapaDevedores.has(pend.aluno_id)) mapaDevedores.set(pend.aluno_id, 0);
            mapaDevedores.set(pend.aluno_id, mapaDevedores.get(pend.aluno_id) + saldoDevedor);
          }
        });

        const radarOrdenado = Array.from(mapaDevedores.entries()).map(([aluno_id, total_devido]) => {
          const al = listaAlunos.find((a: any) => a.id === aluno_id);
          return {
            nome: al?.nome || "Responsável não localizado",
            turma: al?.turma || "N/A",
            total_devido
          };
        })
        .sort((a, b) => b.total_devido - a.total_devido)
        .slice(0, 5);

        setRadarInadimplencia(radarOrdenado);
      }
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally { setCarregando(false); }
  }

  useEffect(() => { if (!verificandoAcesso) carregarDados(); }, [mesFiltro, verificandoAcesso]);

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
    const pgtosEfetuadosEsteMes = listaReceitasDetalhada.filter((p: any) => p.data_pagamento && p.data_pagamento >= dataInicio && p.data_pagamento <= dataFim);

    let finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(16, 124, 65); 
    doc.text("1. RELAÇÃO DE ENTRADAS (DETALHADO)", 15, finalY);

    const rowsEntradas = pgtosEfetuadosEsteMes.map((r: any) => {
      const nomeAluno = alunos.find((a: any) => a.id === r.aluno_id)?.nome || 'OUTRO';
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

    const rowsSaidas = listaGastosDetalhada.map((g: any) => {
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
      columnStyles: { 
        0: { halign: 'center', cellWidth: 22 }, 
        1: { halign: 'left' }, 
        2: { halign: 'right', cellWidth: 28 } 
      }
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
    if (userCargo !== 'Admin') return alert("Operação não autorizada para o seu nível de acesso.");
    if (confirm("Tem a certeza de que deseja remover esta despesa permanentemente?")) {
      const { error } = await supabase.from('gastos').delete().eq('id', id);
      if (error) return alert("Erro ao excluir: Verifique as permissões na base de dados.");
      carregarDados();
    }
  }

  async function handleExcluirReceita(id: string) {
    if (userCargo !== 'Admin') return alert("Operação não autorizada para o seu nível de acesso.");
    if (confirm("Tem a certeza de que deseja remover este registo de receita permanentemente?")) {
      const { error } = await supabase.from('historico_pagamentos').delete().eq('id', id);
      if (error) return alert("Erro ao excluir: Verifique as permissões na base de dados.");
      carregarDados();
    }
  }

  if (verificandoAcesso || carregando) return (
    <div className="flex justify-center items-center h-screen w-full bg-slate-50">
        <div className="text-center font-sans text-indigo-400 font-bold tracking-widest animate-pulse">A preparar o painel financeiro...</div>
    </div>
  );

  return (
    <div className="w-full min-h-screen bg-slate-50 p-4 md:p-8 font-sans antialiased text-slate-800 selection:bg-indigo-100">
      <div className="max-w-[1700px] w-full mx-auto space-y-8">
        
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col xl:flex-row justify-between xl:items-center gap-6">
          <FinanceiroHeader 
            mesFiltro={mesFiltro} 
            setMesFiltro={setMesFiltro}
            onZerarMes={() => {
              if (userCargo !== 'Admin') return alert("Apenas administradores do sistema podem executar esta action.");
              if (confirm("Deseja registar o fecho de lote para o mês atual?")) {
                alert("Ação registada com sucesso.");
              }
            }} 
          />
          <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
            <button 
              onClick={gerarRelatorioTesouraria}
              className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-2xl shadow-sm transition-all tracking-wide"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              Imprimir Balanço
            </button>
          </div>
        </div>

        <MetricasCard 
          metricas={metricas} 
          onAbrirListaGastos={() => setModalListaGastosAberto(true)} 
          onAbrirListaReceitas={() => setModalListaReceitasAberto(true)}
        />
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-8 space-y-8">
            
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col h-[400px]">
              <div className="border-b pb-4 border-slate-50 flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <span className="flex h-3 w-3 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                    </span>
                    Inadimplência Crítica
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">Maiores saldos devedores na base ativa</p>
                </div>
                <span className="bg-rose-100 text-rose-700 font-bold px-3 py-1 rounded-lg text-xs">Top 5</span>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                {radarInadimplencia.length > 0 ? radarInadimplencia.map((dev: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center p-4 bg-slate-50/80 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-sm hover:border-slate-200 transition-all">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-900">{dev.nome}</span>
                      <span className="text-xs text-slate-500 font-medium mt-0.5">Etapa: {dev.turma}</span>
                    </div>
                    <div className="bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
                        <span className="font-extrabold text-rose-600 text-base">R$ {dev.total_devido.toFixed(2)}</span>
                    </div>
                  </div>
                )) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm">Nenhum devedor crítico listado.</div>
                )}
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
              <h3 className="text-base font-bold text-slate-800 mb-6">Métodos de Arrecadação</h3>
              <BalancoResumo resumoMetodos={resumoMetodos} metricas={metricas} mesFiltro={mesFiltro} />
            </div>

          </div>

          <div className="lg:col-span-4 space-y-8">
            
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col h-[400px]">
              <div className="border-b pb-4 border-slate-50 mb-6">
                <h3 className="text-base font-bold text-slate-800">Distribuição de Despesas</h3>
                <p className="text-sm text-slate-500 mt-1">Classificação proporcional de custos</p>
              </div>
              
              <div className="flex-1 flex flex-col justify-center space-y-8">
                <div className="space-y-3">
                  <div className="flex justify-between items-end text-sm">
                    <span className="font-bold text-slate-700 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        Custos Fixos
                    </span>
                    <span className="font-bold text-slate-900">R$ {distribuicaoGastos.fixas.toFixed(2)} <span className="text-slate-400 font-medium text-xs ml-1">({distribuicaoGastos.pctFixas}%)</span></span>
                  </div>
                  <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                    <div className="bg-rose-500 h-full transition-all" style={{ width: `${distribuicaoGastos.pctFixas}%` }} />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-end text-sm">
                    <span className="font-bold text-slate-700 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                        Variáveis / Eventos
                    </span>
                    <span className="font-bold text-slate-900">R$ {distribuicaoGastos.variaveis.toFixed(2)} <span className="text-slate-400 font-medium text-xs ml-1">({distribuicaoGastos.pctVariaveis}%)</span></span>
                  </div>
                  <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                    <div className="bg-amber-400 h-full transition-all" style={{ width: `${distribuicaoGastos.pctVariaveis}%` }} />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center mt-6">
                <span className="text-xs font-bold text-slate-500 block mb-1">Total Calculado</span>
                <span className="font-black text-slate-900 text-2xl">R$ {metricas.gastos.toFixed(2)}</span>
              </div>
            </div>

          </div>

        </div>

      </div>

      <ModalListaGastos 
        aberto={modalListaGastosAberto} onFechar={() => setModalListaGastosAberto(false)}
        mesFiltro={mesFiltro} listaGastos={listaGastosDetalhada} onExcluir={handleExcluirGasto}
      />

      <ModalListaGastos 
        titulo="Detalhamento de Receitas"
        aberto={modalListaReceitasAberto} onFechar={() => setModalListaReceitasAberto(false)}
        mesFiltro={mesFiltro} 
        listaGastos={listaReceitasDetalhada.map((r: any) => {
          const etiquetaCategoria = 
            r.tipo === "mensalidade" ? "MENSALIDADE" :
            r.tipo === "uniforme" ? "UNIFORME" :
            r.tipo === "livro" ? "LIVRO DIDÁTICO" :
            r.tipo === "material" ? "TAXA DE MATERIAL" :
            r.tipo === "evento" ? "EVENTO" : "OUTROS";

          return { 
            ...r, 
            descricao: `[${etiquetaCategoria}] ${alunos.find((a: any) => a.id === r.aluno_id)?.nome || 'Outro'} - ${r.descricao}`, 
            data_gasto: r.data_pagamento, 
            valor: r.valor_total 
          };
        })}
        onExcluir={handleExcluirReceita}
      />

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}} />
    </div>
  );
}