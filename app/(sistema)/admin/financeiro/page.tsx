"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Ícones da Lucide-React (RefreshCcw adicionado para o botão Zerar)
import { AlertTriangle, Info, BarChart2, Wallet, Banknote, CreditCard, RefreshCcw } from "lucide-react";

import { FinanceiroHeader } from "@/app/(sistema)/dashboard/financeiro/_components/FinanceiroHeader";
import { MetricasCard } from "@/app/(sistema)/dashboard/financeiro/_components/MetricasCard";
import { ModalListaGastos } from "@/app/(sistema)/dashboard/financeiro/_components/ModalListaGastos";

// Ícone Customizado para o PIX
const PixIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.25L16.5 6.75L12 11.25L7.5 6.75L12 2.25ZM17.25 7.5L21.75 12L17.25 16.5L12.75 12L17.25 7.5ZM11.25 12.75L15.75 17.25L11.25 21.75L6.75 17.25L11.25 12.75ZM6.75 7.5L11.25 12L6.75 16.5L2.25 12L6.75 7.5Z" />
  </svg>
);

const clean = (val: any) => {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === 'number') return val;
  const str = String(val).trim();
  if (str.includes(',')) return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
  return parseFloat(str) || 0;
};

const getDetalhes = (t: any) => {
  if (!t || !t.detalhes_metodos) return {};
  if (typeof t.detalhes_metodos === 'string') {
      try { return JSON.parse(t.detalhes_metodos); } catch { return {}; }
  }
  return t.detalhes_metodos;
};

export default function FinanceiroAdminPage() {
  const router = useRouter();
  const [verificandoAcesso, setVerificandoAcesso] = useState(true);
  const [userCargo, setUserCargo] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const [mesFiltro, setMesFiltro] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
  const [alunos, setAlunos] = useState<any[]>([]);
  const [metricas, setMetricas] = useState({ total: 0, pago: 0, pendente: 0, descontos: 0, gastos: 0, lucro: 0 });
  const [resumoMetodos, setResumoMetodos] = useState({ pix: 0, dinheiro: 0, credito: 0, debito: 0 });
  
  const [distribuicaoReceitas, setDistribuicaoReceitas] = useState({ mensalidades: 0, extras: 0, pctMensalidades: 0, pctExtras: 0 });
  
  const [carregando, setCarregando] = useState(true);

  const [radarInadimplencia, setRadarInadimplencia] = useState<any[]>([]);
  const [distribuicaoGastos, setDistribuicaoGastos] = useState({ fixas: 0, variaveis: 0, pctFixas: 0, pctVariaveis: 0 });

  const [modalListaGastosAberto, setModalListaGastosAberto] = useState(false); 
  const [modalListaReceitasAberto, setModalListaReceitasAberto] = useState(false);

  const [listaGastosDetalhada, setListaGastosDetalhada] = useState<any[]>([]); 
  const [listaReceitasDetalhada, setListaReceitasDetalhada] = useState<any[]>([]);

  const mesesAno = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  useEffect(() => {
    async function verificarAcesso() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");

      setUserEmail(user.email || null);

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

  // Listener para quando o valor da mensalidade mudar em outra aba
  useEffect(() => {
    const handleRecarregamentoGlobal = () => carregarDados();
    window.addEventListener('recarregarBalançoGlobal', handleRecarregamentoGlobal);
    return () => window.removeEventListener('recarregarBalançoGlobal', handleRecarregamentoGlobal);
  }, [mesFiltro]); // Re-registra se mudar de mês

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

      const transacoesEntrada = pgtosMes.filter(p => {
        const detalhes = getDetalhes(p);
        return p.tipo !== 'evento_saida' && detalhes.sub_tipo !== 'saida' && !(p.descricao && p.descricao.includes('[SAÍDA]'));
      });
      
      const transacoesSaidaDeHistorico = pgtosMes.filter(p => {
        const detalhes = getDetalhes(p);
        return p.tipo === 'evento_saida' || detalhes.sub_tipo === 'saida' || (p.descricao && p.descricao.includes('[SAÍDA]'));
      }).map(item => ({
        id: item.id,
        descricao: `[Evento] ${item.descricao || "Custo do Evento"}`,
        valor: item.valor_pago || item.valor_total || 0,
        data_gasto: item.data_pagamento,
        tabela_origem: 'historico_pagamentos'
      }));

      const nomeMesReferencia = mesesAno[parseInt(mes) - 1];
      const { data: pgtosReferencia = [] } = await supabase.from('historico_pagamentos')
        .select('aluno_id')
        .eq('tipo', 'mensalidade')
        .like('descricao', `%${nomeMesReferencia}%${ano}%`);

      const mapaPgtos = new Map();
      transacoesEntrada.forEach((p: any) => mapaPgtos.set(p.id, p));
      pgtosPendentes.forEach((p: any) => mapaPgtos.set(p.id, p));
      const pgtosFiltrados = Array.from(mapaPgtos.values());

      const normalizeDespesa = (item: any, tabelaOrigem: string) => ({
        id: item.id,
        descricao: item.descricao || "Gasto Operacional",
        valor: item.valor !== undefined ? item.valor : (item.valor_total !== undefined ? item.valor_total : item.preco || 0),
        data_gasto: item.data_gasto || item.data_pagamento || item.data || item.created_at?.split('T')[0],
        tabela_origem: tabelaOrigem
      });

      let deDB_gastos: any[] = [];
      try {
        const { data } = await supabase.from('gastos').select('*').gte('data_gasto', dataInicio).lte('data_gasto', dataFim);
        if (data) deDB_gastos = data.map(i => normalizeDespesa(i, 'gastos'));
      } catch (e) { console.error(e); }

      let deDB_saidas: any[] = [];
      try {
        const { data } = await supabase.from('saidas').select('*').gte('data_pagamento', dataInicio).lte('data_pagamento', dataFim);
        if (data) deDB_saidas = data.map(i => normalizeDespesa(i, 'saidas'));
      } catch (e) { console.error(e); }

      const { data: contasPagasMes = [] } = await supabase.from('contas_a_pagar').select('id, descricao, valor, data_pagamento').eq('pago', true).gte('data_pagamento', dataInicio).lte('data_pagamento', dataFim);
      const contasFormatadas = (contasPagasMes || []).map((account: any) => ({
        id: account.id,
        descricao: `[Conta Fixa] ${account.descricao}`,
        valor: account.valor,
        data_gasto: account.data_pagamento,
        tabela_origem: 'contas_a_pagar'
      }));

      const todasAsDespesas = [...deDB_gastos, ...deDB_saidas, ...transacoesSaidaDeHistorico, ...contasFormatadas];
      setListaGastosDetalhada(todasAsDespesas);

      let vGastos = 0;
      let vFixas = 0;
      let vVariaveis = 0;

      todasAsDespesas.forEach((g: any) => {
        const val = clean(g.valor);
        vGastos += val;
        const isFixa = (g.descricao && g.descricao.includes("[Conta Fixa]")) || g.tabela_origem === 'contas_a_pagar';
        if (isFixa) vFixas += val;
        else vVariaveis += val;
      });

      const totalGastosMestre = vFixas + vVariaveis || 1;
      setDistribuicaoGastos({
        fixas: vFixas, variaveis: vVariaveis, pctFixas: Math.round((vFixas / totalGastosMestre) * 100), pctVariaveis: Math.round((vVariaveis / totalGastosMestre) * 100)
      });

      const pgtosEfetuadosEsteMes = pgtosFiltrados.filter((p: any) => p.data_pagamento && p.data_pagamento >= dataInicio && p.data_pagamento <= dataFim && (p.status === 'pago' || p.status === 'parcial'));
      const vPago = pgtosEfetuadosEsteMes.reduce((acc, curr) => acc + (parseFloat(curr.valor_pago || curr.valor_total) || 0), 0);

      const vMensalidadesPagos = pgtosEfetuadosEsteMes
        .filter((p: any) => p.tipo === 'mensalidade')
        .reduce((acc, curr) => acc + (parseFloat(curr.valor_pago || curr.valor_total) || 0), 0);
        
      const vExtrasPagos = vPago - vMensalidadesPagos;
      const totalReceitasCalc = vPago || 1;

      setDistribuicaoReceitas({
        mensalidades: vMensalidadesPagos, extras: vExtrasPagos, pctMensalidades: Math.round((vMensalidadesPagos / totalReceitasCalc) * 100), pctExtras: Math.round((vExtrasPagos / totalReceitasCalc) * 100)
      });

      setListaReceitasDetalhada(pgtosEfetuadosEsteMes);

      const textResumoMetodos = pgtosEfetuadosEsteMes.reduce((acc, curr) => {
        const det = getDetalhes(curr);
        acc.pix += parseFloat(det.pix || 0); acc.dinheiro += parseFloat(det.dinheiro || 0); acc.credito += parseFloat(det.credito || 0); acc.debito += parseFloat(det.debito || 0);
        return acc;
      }, { pix: 0, dinheiro: 0, credito: 0, debito: 0 });
      setResumoMetodos(textResumoMetodos);

      if (listaAlunos) {
        const idsPagosNestaReferencia = (pgtosReferencia || []).map((p: any) => p.aluno_id);

        const ordenados = listaAlunos.map((aluno: any) => {
          const estaPagoNesseMes = idsPagosNestaReferencia.includes(aluno.id);
          if (estaPagoNesseMes) return { ...aluno, status: 'pago' };

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
        
        // --- 🔴 AQUI ESTÁ A CORREÇÃO CIRÚRGICA 🔴 ---
        const mensalidadeLocal = typeof window !== 'undefined' ? localStorage.getItem('valorPadraoMensalidade') : null;
        const mensalidadeBaseVigente = mensalidadeLocal ? Number(mensalidadeLocal) : 550;

        const stringFiltroMensalidade = `${nomeMesReferencia}/${ano}`;
        
        // 1. Contexto temporal para definir o que é "Atraso"
        const anoFiltro = parseInt(ano);
        const mesFiltroNum = parseInt(mes);
        const hojeAno = hoje.getFullYear();
        const hojeMes = hoje.getMonth() + 1;
        const hojeDia = hoje.getDate();

        const ehMesPassado = anoFiltro < hojeAno || (anoFiltro === hojeAno && mesFiltroNum < hojeMes);
        const ehMesAtual = anoFiltro === hojeAno && mesFiltroNum === hojeMes;

        let vMensalidadesEmAtraso = 0;
        const mapaDevedores = new Map();

        // 2. Calcular Mensalidades (Atrasadas vs Previstas)
        const mensalidadesPrevistasTotal = listaAlunos.reduce((acc, aluno) => {
          const valorAluno = parseFloat(aluno.valor) > 0 ? parseFloat(aluno.valor) : mensalidadeBaseVigente;
          const vencimento = parseInt(aluno.vencimento) || 1;
          
          const pgtosDoAluno = pgtosFiltrados.filter((p: any) => 
            p.tipo === 'mensalidade' && p.aluno_id === aluno.id && p.descricao && p.descricao.includes(stringFiltroMensalidade)
          );
          
          const valorPagoAluno = pgtosDoAluno.reduce((sum, curr) => sum + (parseFloat(curr.valor_pago) || 0), 0);
          const saldoDevedor = Math.max(0, valorAluno - valorPagoAluno);

          if (saldoDevedor > 0) {
            let isAtrasado = false;
            if (ehMesPassado) isAtrasado = true;
            else if (ehMesAtual && hojeDia > vencimento) isAtrasado = true;

            if (isAtrasado) {
              vMensalidadesEmAtraso += saldoDevedor;
              if (!mapaDevedores.has(aluno.id)) mapaDevedores.set(aluno.id, 0);
              mapaDevedores.set(aluno.id, mapaDevedores.get(aluno.id) + saldoDevedor);
            }
          }
          return acc + valorAluno;
        }, 0);

        // 3. Calcular Extras (Atrasados vs Pendentes Gerais)
        const extrasPendentesDesteMes = pgtosFiltrados.filter((p: any) => {
          if (p.tipo === 'mensalidade') return false;

          const dataAlvo = p.data_vencimento || p.data_pagamento || p.created_at;
          const pertenceAoMes = dataAlvo ? dataAlvo.startsWith(mesFiltro) : (p.descricao && p.descricao.includes(nomeMesReferencia) && p.descricao.includes(ano));

          if (!pertenceAoMes) return false;

          let isAtrasado = false;
          if (p.status === 'atrasado') {
             isAtrasado = true;
          } else if (p.status === 'pendente' || p.status === 'parcial') {
             if (p.data_vencimento) {
               isAtrasado = new Date(p.data_vencimento + "T23:59:59") < hoje;
             } else {
               isAtrasado = ehMesPassado;
             }
          }
          return isAtrasado;
        });

        const vExtrasEmAtraso = extrasPendentesDesteMes.reduce((acc, pend) => {
          const saldoDevedor = clean(pend.valor_total) - clean(pend.valor_pago);
          if (saldoDevedor > 0) {
            if (!mapaDevedores.has(pend.aluno_id)) mapaDevedores.set(pend.aluno_id, 0);
            mapaDevedores.set(pend.aluno_id, mapaDevedores.get(pend.aluno_id) + saldoDevedor);
            return acc + saldoDevedor;
          }
          return acc;
        }, 0);

        // O valor Inadimplente real (que já venceu o prazo)
        const totalPendenteAtrasado = vMensalidadesEmAtraso + vExtrasEmAtraso;
        
        // Para manter o "Total" do fluxo coerente
        const vMensalidadesDesteMesPago = pgtosFiltrados
          .filter((p: any) => p.tipo === 'mensalidade' && p.descricao && p.descricao.includes(stringFiltroMensalidade))
          .reduce((acc, curr) => acc + (parseFloat(curr.valor_pago) || 0), 0);
          
        const vMensalidadesTotalPendenteGeral = Math.max(0, mensalidadesPrevistasTotal - vMensalidadesDesteMesPago);
        
        const extrasTotaisPendenteGeral = pgtosFiltrados.filter((p: any) => {
          if (p.tipo === 'mensalidade') return false;
          const statusPendente = p.status === 'pendente' || p.status === 'parcial' || p.status === 'atrasado';
          if (!statusPendente) return false;
          const dataAlvo = p.data_vencimento || p.data_pagamento || p.created_at;
          return dataAlvo ? dataAlvo.startsWith(mesFiltro) : (p.descricao && p.descricao.includes(nomeMesReferencia) && p.descricao.includes(ano));
        }).reduce((acc, curr) => acc + ((parseFloat(curr.valor_total) || 0) - (parseFloat(curr.valor_pago) || 0)), 0);

        const totalPendenteGeral = vMensalidadesTotalPendenteGeral + extrasTotaisPendenteGeral;
        const totalGeralPrevisto = vPago + totalPendenteGeral;

        // Cálculo dos Descontos
        const totalDescontos = listaAlunos.reduce((acc, curr) => {
          const valorAluno = parseFloat(curr.valor);
          if (valorAluno > 0 && valorAluno < mensalidadeBaseVigente) {
             return acc + (mensalidadeBaseVigente - valorAluno);
          }
          return acc;
        }, 0);
        
        // Aplica o totalPendenteAtrasado no lugar do totalGeral para focar na inadimplência
        setMetricas({ total: totalGeralPrevisto, pago: vPago, pendente: totalPendenteAtrasado, descontos: totalDescontos, gastos: vGastos, lucro: vPago - vGastos });

        const radarOrdenado = Array.from(mapaDevedores.entries()).map(([aluno_id, total_devido]) => {
          const al = listaAlunos.find((a: any) => a.id === aluno_id);
          return { nome: al?.nome || "Responsável não localizado", turma: al?.turma || "N/A", total_devido };
        })
        .sort((a, b) => b.total_devido - a.total_devido)
        .slice(0, 3);

        setRadarInadimplencia(radarOrdenado);
      }
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally { setCarregando(false); }
  }

  useEffect(() => { if (!verificandoAcesso) carregarDados(); }, [mesFiltro, verificandoAcesso]);

  async function handleZerarMes() {
    if (userEmail !== 'carlamonaliza9@gmail.com') {
      return alert("Acesso negado. Apenas a administradora principal pode executar esta ação.");
    }

    const senha = prompt("⚠️ AÇÃO DESTRUTIVA ⚠️\nIsso apagará TODOS os pagamentos registrados no mês selecionado.\n\nDigite a senha de segurança para continuar:");
    
    if (senha !== "123456") {
      return alert("Senha incorreta. Operação cancelada.");
    }

    if (!confirm(`Tem certeza ABSOLUTA que deseja zerar os registros de ${mesFiltro}? Esta ação não pode ser desfeita.`)) {
      return;
    }

    setCarregando(true);
    try {
      const [ano, mes] = mesFiltro.split('-');
      const dataInicio = `${ano}-${mes}-01`;
      const ultimoDia = new Date(parseInt(ano), parseInt(mes), 0).getDate();
      const dataFim = `${ano}-${mes}-${String(ultimoDia).padStart(2, '0')}`;

      const { error } = await supabase
        .from('historico_pagamentos')
        .delete()
        .gte('data_pagamento', dataInicio)
        .lte('data_pagamento', dataFim);

      if (error) throw error;

      alert("Registros do mês zerados com sucesso!");
      carregarDados();
    } catch (err: any) {
      alert("Erro ao zerar mês: " + err.message);
    } finally {
      setCarregando(false);
    }
  }

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
      headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], halign: 'center', fontStyle: 'bold' }
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
      styles: { fontSize: 8, textColor: [51, 65, 85] }
    });

    finalY = (doc as any).lastAutoTable.finalY + 10;
    if (finalY > 260) { doc.addPage(); finalY = 20; }
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(220, 38, 38); 
    doc.text("2. RELAÇÃO DE SAÍDAS (DETALHADO)", 15, finalY);

    const gastosDoMes = listaGastosDetalhada.filter((g: any) => {
      const dGasto = g.data_gasto || "";
      return dGasto >= dataInicio && dGasto <= dataFim;
    });

    const rowsSaidas = gastosDoMes.map((g: any) => {
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
      columnStyles: { 0: { halign: 'center', cellWidth: 25 }, 1: { halign: 'left' }, 2: { halign: 'right', cellWidth: 35 } }
    });
    
    finalY = (doc as any).lastAutoTable.finalY + 25;
    if (finalY > 260) { doc.addPage(); finalY = 35; }
    
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
    
    const gastoAlvo = listaGastosDetalhada.find(g => g.id === id);
    const tabelaOrigem = gastoAlvo?.tabela_origem || 'gastos';

    if (confirm("Tem a certeza de que deseja remover esta despesa permanentemente?")) {
      const { error } = await supabase.from(tabelaOrigem).delete().eq('id', id);
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

  // --- LÓGICA DINÂMICA DO GRÁFICO ---
  const valorMaximoReal = Math.max(metricas.pago, metricas.gastos, metricas.lucro);
  const tetoDoGrafico = valorMaximoReal === 0 ? 1000 : valorMaximoReal * 1.15;
  
  const gridStep1 = tetoDoGrafico;
  const gridStep2 = tetoDoGrafico * (2/3);
  const gridStep3 = tetoDoGrafico * (1/3);

  const avatarColors = [
    'bg-rose-100 text-rose-600',
    'bg-amber-100 text-amber-600',
    'bg-purple-100 text-purple-600',
    'bg-emerald-100 text-emerald-600',
    'bg-blue-100 text-blue-600'
  ];

  if (verificandoAcesso || carregando) return (
    <div className="flex justify-center items-center h-screen w-full bg-[#f8fafc]">
        <div className="text-center font-sans text-blue-500 font-bold tracking-widest animate-pulse">A preparar o painel financeiro...</div>
    </div>
  );

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] p-4 md:p-8 font-sans antialiased text-slate-800 pb-24 md:pb-8 animate-in fade-in duration-500">
      <div className="max-w-[1700px] w-full mx-auto space-y-6 md:space-y-8">
        
        {/* ========================================== */}
        {/* HEADER FINANCEIRO (Navegação Superior)     */}
        {/* ========================================== */}
        <div className="bg-white p-4 md:p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 md:gap-6">
          <div className="flex-1">
            <FinanceiroHeader 
              mesFiltro={mesFiltro} 
              setMesFiltro={setMesFiltro}
              onZerarMes={handleZerarMes}
            />
          </div>
          
          {/* OS DOIS BOTÕES LADO A LADO */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto shrink-0 pt-1">
            {userEmail === 'carlamonaliza9@gmail.com' && (
              <button 
                onClick={handleZerarMes} 
                className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-6 py-3.5 bg-white text-rose-600 hover:bg-rose-50 hover:border-rose-200 font-bold text-xs md:text-sm rounded-xl transition-all shadow-sm border border-slate-200 tracking-wide active:scale-95"
                title="Apagar todos os registros deste mês"
              >
                <RefreshCcw size={16} strokeWidth={2.5} />
                Zerar Mês
              </button>
            )}

            <button 
              onClick={gerarRelatorioTesouraria}
              className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs md:text-sm rounded-xl shadow-md shadow-blue-500/20 transition-all tracking-wide active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              Imprimir Balanço
            </button>
          </div>
        </div>

        {/* ========================================== */}
        {/* BLOCOS SUPERIORES: RECEITAS E GASTOS       */}
        {/* ========================================== */}
        <MetricasCard 
          metricas={metricas} 
          onAbrirListaGastos={() => setModalListaGastosAberto(true)} 
          onAbrirListaReceitas={() => setModalListaReceitasAberto(true)}
        />
        
        {/* ========================================== */}
        {/* GRIDS PRINCIPAIS DA TELA                   */}
        {/* ========================================== */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 md:gap-8 items-start">
          
          {/* ESQUERDA (7 Colunas): INADIMPLÊNCIA CRÍTICA */}
          <div className="xl:col-span-7 bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] flex flex-col w-full">
            <div className="flex justify-between items-start mb-6 border-b border-slate-50 pb-4">
              <div>
                <h3 className="text-lg md:text-xl font-black text-slate-800 flex items-center gap-2">
                  <AlertTriangle className="text-rose-500" size={22} strokeWidth={2.5} />
                  Inadimplência Crítica
                </h3>
                <p className="text-xs md:text-sm font-medium text-slate-500 mt-1">Maiores saldos devedores ativos</p>
              </div>
              <span className="bg-rose-50 text-rose-600 border border-rose-100 font-bold px-3 py-1 rounded-lg text-xs tracking-wide">Top 3</span>
            </div>
            
            <div className="flex flex-col gap-3">
              {radarInadimplencia.length > 0 ? radarInadimplencia.map((dev: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center p-4 bg-slate-50/70 rounded-[1.25rem] border border-slate-100 hover:bg-white hover:shadow-sm transition-all group">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-sm md:text-base font-black ${avatarColors[idx % avatarColors.length]}`}>
                      {dev.nome.charAt(0)}
                    </div>
                    <div className="flex flex-col truncate pr-2 max-w-[150px] sm:max-w-[250px]">
                      <span className="text-sm md:text-base font-bold text-slate-900 truncate">{dev.nome}</span>
                      <span className="text-xs text-slate-500 font-medium mt-0.5 truncate">Etapa: {dev.turma}</span>
                    </div>
                  </div>
                  <div className="bg-white px-3 py-1.5 md:px-4 md:py-2 rounded-xl border border-slate-100 shadow-sm shrink-0 transition-transform group-hover:scale-105">
                      <span className="font-extrabold text-rose-600 text-xs md:text-sm whitespace-nowrap">R$ {dev.total_devido.toLocaleString('pt-BR', {minimumFractionDigits:2})}</span>
                  </div>
                </div>
              )) : (
                <div className="py-10 flex items-center justify-center text-slate-400 text-sm font-medium">Nenhum devedor crítico listado.</div>
              )}
            </div>
          </div>

          {/* DIREITA (5 Colunas): DISTRIBUIÇÃO DE DESPESAS */}
          <div className="xl:col-span-5 bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] flex flex-col w-full">
            <div className="flex justify-between items-start mb-8 border-b border-slate-50 pb-4">
              <div>
                <h3 className="text-lg md:text-xl font-black text-slate-800">Distribuição de Despesas</h3>
              </div>
              <select className="bg-slate-50 border border-slate-200 text-slate-700 text-[10px] md:text-xs font-bold py-1.5 px-3 rounded-lg outline-none cursor-pointer hover:bg-slate-100 transition-colors">
                <option>Este mês</option>
              </select>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-8 mb-8">
              {/* Gráfico Donut */}
              <div 
                className="relative w-36 h-36 md:w-40 md:h-40 rounded-full flex items-center justify-center shrink-0 transition-transform hover:scale-105 shadow-sm" 
                style={{ background: `conic-gradient(#ef4444 0% ${distribuicaoGastos.pctFixas}%, #fbbf24 ${distribuicaoGastos.pctFixas}% 100%)` }}
              >
                <div className="w-28 h-28 md:w-32 md:h-32 bg-white rounded-full flex flex-col items-center justify-center shadow-inner z-10 relative">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5 text-center leading-tight">Total<br/>Calculado</span>
                  <span className="text-sm md:text-base font-black text-slate-900 leading-none mt-1">R$ {metricas.gastos.toLocaleString('pt-BR', {minimumFractionDigits:2})}</span>
                </div>
              </div>

              {/* Barras LATERAIS */}
              <div className="flex-1 flex flex-col gap-6 w-full">
                <div className="flex flex-col gap-2.5">
                  <div className="flex justify-between items-center text-xs md:text-sm">
                    <span className="font-bold text-slate-700 flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-rose-500 shadow-sm"></span> Custos Fixos
                    </span>
                    <div className="font-black text-slate-800 text-xs whitespace-nowrap">
                        R$ {distribuicaoGastos.fixas.toLocaleString('pt-BR', {minimumFractionDigits:2})} <span className="text-slate-400 font-medium text-[10px] ml-1">{distribuicaoGastos.pctFixas}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 md:h-3 rounded-full overflow-hidden">
                    <div className="bg-rose-500 h-full rounded-full transition-all duration-1000" style={{ width: `${distribuicaoGastos.pctFixas}%` }} />
                  </div>
                </div>

                <div className="flex flex-col gap-2.5">
                  <div className="flex justify-between items-center text-xs md:text-sm">
                    <span className="font-bold text-slate-700 flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-amber-400 shadow-sm"></span> Variáveis / Eventos
                    </span>
                    <div className="font-black text-slate-800 text-xs whitespace-nowrap">
                        R$ {distribuicaoGastos.variaveis.toLocaleString('pt-BR', {minimumFractionDigits:2})} <span className="text-slate-400 font-medium text-[10px] ml-1">{distribuicaoGastos.pctVariaveis}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 md:h-3 rounded-full overflow-hidden">
                    <div className="bg-amber-400 h-full rounded-full transition-all duration-1000" style={{ width: `${distribuicaoGastos.pctVariaveis}%` }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 bg-blue-50/60 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
               <div className="bg-blue-100 text-blue-600 w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"><Info size={16} strokeWidth={2.5} /></div>
               <p className="text-[11px] md:text-xs font-medium text-slate-600 leading-relaxed pt-1"><span className="font-extrabold text-blue-800">Dica:</span> Mantenha o equilíbrio financeiro da escola.</p>
            </div>
          </div>
        </div>

        {/* ========================================== */}
        {/* LINHA 2: MÉTODOS E BALANÇO GERAL           */}
        {/* ========================================== */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 md:gap-8 items-start">
          
          {/* ESQUERDA (5 Colunas): MÉTODOS */}
          <div className="xl:col-span-5 bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] w-full">
            <h3 className="text-lg md:text-xl font-black text-slate-800 flex items-center gap-2 mb-1">
              <Wallet className="text-indigo-500" size={22} strokeWidth={2.5}/> 
              Métodos de Arrecadação
            </h3>
            <p className="text-xs md:text-sm font-medium text-slate-500 mb-8">Recebido por Método ({mesFiltro})</p>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100 flex items-center gap-4 hover:bg-white hover:shadow-sm transition-all cursor-default">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-emerald-100/50 text-emerald-500 flex items-center justify-center shrink-0">
                  <PixIcon />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">PIX</span>
                  <span className="text-xs md:text-sm font-black text-emerald-600 truncate">R$ {resumoMetodos.pix.toLocaleString('pt-BR', {minimumFractionDigits:2})}</span>
                </div>
              </div>

              <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100 flex items-center gap-4 hover:bg-white hover:shadow-sm transition-all cursor-default">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-emerald-100/50 text-emerald-500 flex items-center justify-center shrink-0">
                  <Banknote size={20} strokeWidth={2.5} className="md:w-6 md:h-6" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Dinheiro</span>
                  <span className="text-xs md:text-sm font-black text-emerald-600 truncate">R$ {resumoMetodos.dinheiro.toLocaleString('pt-BR', {minimumFractionDigits:2})}</span>
                </div>
              </div>

              <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100 flex items-center gap-4 hover:bg-white hover:shadow-sm transition-all cursor-default">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-purple-100/50 text-purple-500 flex items-center justify-center shrink-0">
                  <CreditCard size={20} strokeWidth={2.5} className="md:w-6 md:h-6" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Crédito</span>
                  <span className="text-xs md:text-sm font-black text-emerald-600 truncate">R$ {resumoMetodos.credito.toLocaleString('pt-BR', {minimumFractionDigits:2})}</span>
                </div>
              </div>

              <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100 flex items-center gap-4 hover:bg-white hover:shadow-sm transition-all cursor-default">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-blue-100/50 text-blue-500 flex items-center justify-center shrink-0">
                  <CreditCard size={20} strokeWidth={2.5} className="md:w-6 md:h-6" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Débito</span>
                  <span className="text-xs md:text-sm font-black text-emerald-600 truncate">R$ {resumoMetodos.debito.toLocaleString('pt-BR', {minimumFractionDigits:2})}</span>
                </div>
              </div>
            </div>
          </div>

          {/* DIREITA (7 Colunas): GRÁFICO DINÂMICO */}
          <div className="xl:col-span-7 bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] flex flex-col w-full h-full">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-lg md:text-xl font-black text-slate-800 flex items-center gap-2">
                <BarChart2 className="text-blue-600" size={22} strokeWidth={2.5}/> 
                Balanço Geral ({mesFiltro})
              </h3>
              <select className="bg-slate-50 border border-slate-200 text-slate-700 text-[10px] md:text-xs font-bold py-1.5 px-3 rounded-lg outline-none cursor-pointer hover:bg-slate-100 transition-colors">
                <option>Este mês</option>
              </select>
            </div>

            {/* ÁREA DO GRÁFICO */}
            <div className="relative w-full h-[250px] flex items-end mt-4">
               <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-[2.5rem]">
                  <div className="w-full border-t border-slate-100/70 h-0 flex items-center">
                    <span className="bg-white pr-2 text-[9px] md:text-[10px] font-bold text-slate-400 -translate-y-[2px]">R$ {gridStep1.toLocaleString('pt-BR', {maximumFractionDigits:0})}</span>
                  </div>
                  <div className="w-full border-t border-slate-100/70 h-0 flex items-center">
                    <span className="bg-white pr-2 text-[9px] md:text-[10px] font-bold text-slate-400 -translate-y-[2px]">R$ {gridStep2.toLocaleString('pt-BR', {maximumFractionDigits:0})}</span>
                  </div>
                  <div className="w-full border-t border-slate-100/70 h-0 flex items-center">
                    <span className="bg-white pr-2 text-[9px] md:text-[10px] font-bold text-slate-400 -translate-y-[2px]">R$ {gridStep3.toLocaleString('pt-BR', {maximumFractionDigits:0})}</span>
                  </div>
                  <div className="w-full border-t border-slate-300 h-0 flex items-center">
                    <span className="bg-white pr-2 text-[9px] md:text-[10px] font-bold text-slate-400 -translate-y-[2px]">R$ 0</span>
                  </div>
               </div>

               {(() => {
                  const hReceita = gridStep1 === 0 ? 0 : Math.min(100, (metricas.pago / gridStep1) * 100);
                  const hGastos = gridStep1 === 0 ? 0 : Math.min(100, (metricas.gastos / gridStep1) * 100);
                  const hLucro = gridStep1 === 0 ? 0 : Math.min(100, (Math.max(0, metricas.lucro) / gridStep1) * 100);

                  return (
                    <div className="relative z-10 w-full h-[calc(100%-2.5rem)] flex justify-around items-end ml-10 mb-[2.5rem]">
                      
                      {/* RECEITA */}
                      <div className="relative w-16 md:w-20 group" style={{ height: `${Math.max(hReceita, 2)}%` }}>
                        <span className="absolute -top-6 left-0 right-0 text-center text-[10px] md:text-[11px] font-black text-slate-800 whitespace-nowrap">
                          R$ {metricas.pago.toLocaleString('pt-BR', {minimumFractionDigits:2})}
                        </span>
                        <div className="w-full h-full bg-[#10b981] rounded-t-md transition-all duration-1000 ease-out group-hover:opacity-80 shadow-[0_-4px_10px_rgba(16,185,129,0.1)]"></div>
                        <span className="absolute -bottom-6 left-0 right-0 text-center text-[9px] md:text-[10px] font-black text-slate-600 uppercase tracking-widest">Receita</span>
                      </div>

                      {/* GASTOS */}
                      <div className="relative w-16 md:w-20 group" style={{ height: `${Math.max(hGastos, 2)}%` }}>
                        <span className="absolute -top-6 left-0 right-0 text-center text-[10px] md:text-[11px] font-black text-slate-800 whitespace-nowrap">
                          R$ {metricas.gastos.toLocaleString('pt-BR', {minimumFractionDigits:2})}
                        </span>
                        <div className="w-full h-full bg-[#ef4444] rounded-t-md transition-all duration-1000 ease-out group-hover:opacity-80 shadow-[0_-4px_10px_rgba(239,68,68,0.1)]"></div>
                        <span className="absolute -bottom-6 left-0 right-0 text-center text-[9px] md:text-[10px] font-black text-slate-600 uppercase tracking-widest">Gastos</span>
                      </div>

                      {/* LUCRO */}
                      <div className="relative w-16 md:w-20 group" style={{ height: `${Math.max(hLucro, 2)}%` }}>
                        <span className="absolute -top-6 left-0 right-0 text-center text-[10px] md:text-[11px] font-black text-slate-800 whitespace-nowrap">
                          R$ {metricas.lucro.toLocaleString('pt-BR', {minimumFractionDigits:2})}
                        </span>
                        <div className="w-full h-full bg-[#3b82f6] rounded-t-md transition-all duration-1000 ease-out group-hover:opacity-80 shadow-[0_-4px_10px_rgba(59,130,246,0.1)]"></div>
                        <span className="absolute -bottom-6 left-0 right-0 text-center text-[9px] md:text-[10px] font-black text-slate-600 uppercase tracking-widest">Lucro</span>
                      </div>

                    </div>
                  );
               })()}
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
        distribuicaoReceitas={distribuicaoReceitas}
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
            valor: r.valor_pago || r.valor_total 
          };
        })}
        onExcluir={handleExcluirReceita}
      />

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}} />
    </div>
  );
}