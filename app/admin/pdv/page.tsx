"use client";

import { useState, useEffect, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Auxiliar de conversão financeira blindada
const clean = (val: any) => {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === 'number') return val;
  const str = String(val).trim();
  if (str.includes(',')) return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
  return parseFloat(str) || 0;
};

function PDVContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [carregando, setCarregando] = useState(true);
  
  // Dados Globais
  const [alunos, setAlunos] = useState<any[]>([]);
  const [historicoGeral, setHistoricoGeral] = useState<any[]>([]);
  
  // Dados do Acompanhamento Diário
  const [inadimplentesTop5, setInadimplentesTop5] = useState<any[]>([]);
  const [recebimentosHoje, setRecebimentosHoje] = useState<any[]>([]);
  
  // Estados do PDV
  const [buscaAluno, setBuscaAluno] = useState("");
  const [alunoSelecionado, setAlunoSelecionado] = useState<any>(null);
  const [dividasAluno, setDividasAluno] = useState<any[]>([]);
  const [carrinho, setCarrinho] = useState<any[]>([]);
  const [dataPagamentoPDV, setDataPagamentoPDV] = useState(new Date().toISOString().split('T')[0]);
  
  // Estados de Nova Venda Avulsa (Geral)
  const [novoItem, setNovoItem] = useState({ tipo: 'uniforme', descricao: '', valor: '' });

  // Estados de Nova Venda Avulsa (Catálogo de Uniformes)
  const [uniformesVenda, setUniformesVenda] = useState({
    camisaPadrao: 0, camisaEdFisica: 0, calca: 0, shortSaia: 0, short: 0, casaco: 0,
  });
  const [uniformesTamanhos, setUniformesTamanhos] = useState({
    camisaPadrao: "4 anos", camisaEdFisica: "4 anos", calca: "4 anos", shortSaia: "4 anos", short: "4 anos", casaco: "4 anos",
  });
  const precosUniformes = {
    camisaPadrao: 60, camisaEdFisica: 60, calca: 80, shortSaia: 60, short: 60, casaco: 130,
  };
  const totalVendaUniforme = 
    (uniformesVenda.camisaPadrao * precosUniformes.camisaPadrao) +
    (uniformesVenda.camisaEdFisica * precosUniformes.camisaEdFisica) +
    (uniformesVenda.calca * precosUniformes.calca) +
    (uniformesVenda.shortSaia * precosUniformes.shortSaia) +
    (uniformesVenda.short * precosUniformes.short) +
    (uniformesVenda.casaco * precosUniformes.casaco);
  
  // Fechamento e Pagamento
  const [pagamentos, setPagamentos] = useState({ pix: "", dinheiro: "", credito: "", debito: "", boleto: "", credito_aluno: "", pix_editora: "", credito_editora: "", debito_editora: "", parcelas: "1" });
  
  // ACRESCENTADO: juros_cartao
  const [acrescimos, setAcrescimos] = useState({ multa: "", desconto: "", juros_cartao: "" });
  const [processando, setProcessando] = useState(false);
  
  // Estado para controlar o destino do troco
  const [acaoTroco, setAcaoTroco] = useState<'credito' | 'devolver'>('credito');

  const dataHojeStr = new Date().toISOString().split('T')[0];
  const mesesAno = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const SENHA_MESTRA = "1234";

  // Verificador se há algum livro no carrinho para mostrar as opções da editora
  const temLivroNoCarrinho = carrinho.some(item => item.tipo === 'livro' || (item.descricao || '').toLowerCase().includes('livro'));

  useEffect(() => {
    carregarDadosBase();
  }, []);

  async function carregarDadosBase() {
    setCarregando(true);
    
    const { data: listaAlunos } = await supabase.from('alunos').select('*').order('nome');
    
    const { data: historico } = await supabase
      .from('historico_pagamentos')
      .select('*')
      .neq('status', 'cancelado')
      .neq('status', 'estornado');
    
    if (listaAlunos && historico) {
      setAlunos(listaAlunos);
      setHistoricoGeral(historico);

      const urlAlunoId = searchParams.get('alunoId');
      if (urlAlunoId) {
        const alunoPreSelecionado = listaAlunos.find((a: any) => String(a.id) === String(urlAlunoId));
        if (alunoPreSelecionado) {
          setAlunoSelecionado(alunoPreSelecionado);
          window.history.replaceState(null, '', window.location.pathname);
        }
      }
      
      const recebidos = historico.filter(h => h.data_pagamento === dataHojeStr && (h.status === 'pago' || h.status === 'parcial') && clean(h.valor_pago) > 0);
      setRecebimentosHoje(recebidos);

      const mapaDevedores = new Map();
      
      const pendenciasAtivas = historico.filter(h => h.status !== 'pago' && h.status !== 'renegociado');
      
      pendenciasAtivas.forEach(pend => {
        const devedorRestante = clean(pend.valor_total) - clean(pend.valor_pago);
        if (devedorRestante > 0) {
          if (!mapaDevedores.has(pend.aluno_id)) mapaDevedores.set(pend.aluno_id, 0);
          mapaDevedores.set(pend.aluno_id, mapaDevedores.get(pend.aluno_id) + devedorRestante);
        }
      });

      const radarFormatado = Array.from(mapaDevedores.entries()).map(([aluno_id, total_devido]) => {
        const alunoReferencia = listaAlunos.find(a => a.id === aluno_id);
        return {
          alunoRaw: alunoReferencia,
          nome: alunoReferencia?.nome || 'Desconhecido',
          total_devido
        };
      })
      .filter(item => item.alunoRaw)
      .sort((a, b) => b.total_devido - a.total_devido)
      .slice(0, 5);

      setInadimplentesTop5(radarFormatado);
    }
    
    setCarregando(false);
  }

  useEffect(() => {
    if (alunoSelecionado) {
      const buscarPendenciasDoAluno = async () => {
        const { data: dataHistorico } = await supabase
          .from('historico_pagamentos')
          .select('*')
          .eq('aluno_id', alunoSelecionado.id);
          
        let registrosPuros = dataHistorico || [];

        let dataMensalidades: any[] = [];
        try {
          const { data: mData, error: mError } = await supabase
            .from('mensalidades')
            .select('*')
            .eq('aluno_id', alunoSelecionado.id);

          if (!mError && mData) {
            dataMensalidades = mData.map((m: any) => ({
              id: m.id,
              aluno_id: m.aluno_id,
              tipo: 'mensalidade',
              descricao: m.descricao || `Mensalidade - Ref: ${m.mes_referencia || 'Recorrente'}`,
              valor_total: m.valor_total || m.valor || 0,
              valor_pago: m.valor_pago || 0,
              status: m.status || 'pendente',
              data_pagamento: m.data_vencimento || m.vencimento || dataHojeStr,
              isMensalidadeTable: true 
            }));
          }
        } catch (e) {
        }

        registrosPuros = [...registrosPuros, ...dataMensalidades];

        const dataAtual = new Date();
        const mesAtualNum = dataAtual.getMonth(); 
        const diaAtual = dataAtual.getDate();
        const anoAtual = dataAtual.getFullYear().toString();
        const diaVencimentoAluno = parseInt(alunoSelecionado.vencimento) || 5;
        const valorMensalidadeBase = parseFloat(alunoSelecionado.valor) || 0;

        if (valorMensalidadeBase > 0) {
          for (let i = 0; i <= mesAtualNum; i++) {
            const nomeMes = mesesAno[i];
            if (i === mesAtualNum && diaAtual <= diaVencimentoAluno) continue;

            const jaExisteNoBanco = registrosPuros.some((h: any) => 
              (h.tipo?.toLowerCase() === 'mensalidade' || h.tipo?.toLowerCase() === 'acordo') && 
              h.mes_referencia?.toLowerCase().trim() === nomeMes.toLowerCase() && 
              (h.data_pagamento?.startsWith(anoAtual) || (h.descricao || "").includes(anoAtual)) &&
              !['cancelado', 'estornado', 'renegociado'].includes(h.status)
            );

            if (!jaExisteNoBanco) {
              registrosPuros.push({
                id: `temp_${nomeMes}_${Date.now()}`,
                tipo: 'mensalidade',
                descricao: `Mensalidade em Atraso - ${nomeMes}/${anoAtual}`,
                mes_referencia: nomeMes,
                valor_total: valorMensalidadeBase,
                valor_pago: 0,
                data_pagamento: new Date(dataAtual.getFullYear(), i, diaVencimentoAluno).toISOString(),
                status: 'atrasado',
                atraso_automatico: true,
                isTemp: true
              });
            }
          }
        }

        if (registrosPuros.length > 0) {
          const pendenciasReais = registrosPuros.filter((h: any) => {
            const statusBanco = (h.status || '').toLowerCase().trim();
            const vTotal = clean(h.valor_total); 
            const vPago = clean(h.valor_pago);
            const saldoDevedor = vTotal - vPago;

            return !['pago', 'renegociado', 'cancelado', 'estornado'].includes(statusBanco) && saldoDevedor > 0;
          });

          setDividasAluno(pendenciasReais);
        } else {
          setDividasAluno([]);
        }
      };

      buscarPendenciasDoAluno();
      setCarrinho([]); 
      setPagamentos({ pix: "", dinheiro: "", credito: "", debito: "", boleto: "", credito_aluno: "", pix_editora: "", credito_editora: "", debito_editora: "", parcelas: "1" });
      setAcrescimos({ multa: "", desconto: "", juros_cartao: "" });
      setAcaoTroco('credito'); 
      setDataPagamentoPDV(dataHojeStr);
    } else {
      setDividasAluno([]);
      setCarrinho([]);
    }
  }, [alunoSelecionado]);

  const adicionarAoCarrinho = (item: any) => {
    if (!carrinho.find(c => c.id === item.id)) {
      setCarrinho([...carrinho, item]);
    }
  };

  const removerDoCarrinho = (id: string) => {
    setCarrinho(carrinho.filter(c => c.id !== id));
  };

  const lancarItemAvulsoNoCarrinho = () => {
    if (novoItem.tipo === 'uniforme') {
      if (totalVendaUniforme <= 0) return alert("Adicione pelo menos um item de uniforme na grade.");

      const itensComprados: string[] = [];
      if (uniformesVenda.camisaPadrao > 0) itensComprados.push(`${uniformesVenda.camisaPadrao}x Camisa Padrão (${uniformesTamanhos.camisaPadrao})`);
      if (uniformesVenda.camisaEdFisica > 0) itensComprados.push(`${uniformesVenda.camisaEdFisica}x Camisa Ed. Física (${uniformesTamanhos.camisaEdFisica})`);
      if (uniformesVenda.calca > 0) itensComprados.push(`${uniformesVenda.calca}x Calça (${uniformesTamanhos.calca})`);
      if (uniformesVenda.shortSaia > 0) itensComprados.push(`${uniformesVenda.shortSaia}x Short-Saia (${uniformesTamanhos.shortSaia})`);
      if (uniformesVenda.short > 0) itensComprados.push(`${uniformesVenda.short}x Short (${uniformesTamanhos.short})`);
      if (uniformesVenda.casaco > 0) itensComprados.push(`${uniformesVenda.casaco}x Casaco (${uniformesTamanhos.casaco})`);

      const descricaoFinal = `Venda de Uniforme Avulsa: ${itensComprados.join(", ")}`;

      const itemTemp = {
        id: `novo_${Date.now()}`,
        tipo: 'uniforme',
        descricao: descricaoFinal,
        valor_total: totalVendaUniforme,
        valor_pago: 0,
        status: 'pendente',
        isNovo: true 
      };
      
      setCarrinho([...carrinho, itemTemp]);
      setUniformesVenda({ camisaPadrao: 0, camisaEdFisica: 0, calca: 0, shortSaia: 0, short: 0, casaco: 0 });
      setUniformesTamanhos({ camisaPadrao: "4 anos", camisaEdFisica: "4 anos", calca: "4 anos", shortSaia: "4 anos", short: "4 anos", casaco: "4 anos" });
    } else {
      if (!novoItem.descricao || !novoItem.valor) return alert("Preencha descrição e valor do item avulso.");
      
      const itemTemp = {
        id: `novo_${Date.now()}`,
        tipo: novoItem.tipo,
        descricao: novoItem.descricao,
        valor_total: clean(novoItem.valor),
        valor_pago: 0,
        status: 'pendente',
        isNovo: true 
      };
      
      setCarrinho([...carrinho, itemTemp]);
      setNovoItem({ ...novoItem, descricao: '', valor: '' });
    }
  };

  const subtotalCarrinho = carrinho.reduce((acc, item) => acc + (clean(item.valor_total) - clean(item.valor_pago)), 0);
  
  // ATUALIZADO: Cálculo englobando os Juros do Cartão no valor devedor final
  const totalComAcrescimos = Math.max(0, subtotalCarrinho + clean(acrescimos.multa) + clean(acrescimos.juros_cartao) - clean(acrescimos.desconto));
  
  const somaDinheiroEntrante = clean(pagamentos.pix) + clean(pagamentos.dinheiro) + clean(pagamentos.credito) + clean(pagamentos.debito) + clean(pagamentos.boleto) + clean(pagamentos.pix_editora) + clean(pagamentos.credito_editora) + clean(pagamentos.debito_editora);
  const creditoUtilizado = clean(pagamentos.credito_aluno);
  const totalPagoRodada = somaDinheiroEntrante + creditoUtilizado;
  
  const faltaPagar = Math.max(0, totalComAcrescimos - totalPagoRodada);
  const trocoGerado = totalPagoRodada > totalComAcrescimos ? totalPagoRodada - totalComAcrescimos : 0;
  const saldoAtualAluno = alunoSelecionado ? clean(alunoSelecionado.saldo_credito) : 0;

  function gerarPDFRecibo(aluno: any, itensCarrinho: any[], pagamentosFeitos: any, acrescimosFeitos: any, totalVenda: number, troco: number) {
    const doc = new jsPDF();
    const logoUrl = "https://mnmakhazghgncqummksu.supabase.co/storage/v1/object/public/assets/logo.png";
    try { doc.addImage(logoUrl, "PNG", 15, 12, 22, 22); } catch (e) {}

    doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(30, 41, 59); doc.text("ESCOLA ABC DO PARK", 42, 18);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(100, 116, 139);
    doc.text("Recibo Oficial de Pagamento (PDV)", 42, 24);

    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(30, 41, 59); doc.text("RECIBO FINANCEIRO", 195, 18, { align: "right" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(148, 163, 184); 
    doc.text(`Data do Lançamento: ${dataPagamentoPDV.split('-').reverse().join('/')}`, 195, 24, { align: "right" });
    doc.text(`Emissão do Recibo: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 195, 29, { align: "right" });

    doc.setDrawColor(226, 232, 240); doc.line(15, 34, 195, 34);

    autoTable(doc, {
      startY: 38,
      body: [
        [ 
          { content: `ALUNO(A):\n${aluno.nome.toUpperCase()}`, styles: { fontStyle: 'bold' } }, 
          { content: `TURMA:\n${aluno.turma?.toUpperCase() || 'N/A'}`, styles: { fontStyle: 'bold' } },
          { content: `CPF:\n${aluno.cpf_aluno || aluno.cpf_responsavel || 'N/A'}`, styles: { fontStyle: 'bold' } }
        ]
      ],
      theme: 'plain', styles: { fontSize: 9, cellPadding: 3, textColor: [71, 85, 105], fillColor: [248, 250, 252] }
    });

    const tableRows = itensCarrinho.map(item => {
      const saldoDevedorAnterior = clean(item.valor_total) - clean(item.valor_pago);
      return [
        (item.tipo || 'Lançamento').toUpperCase(),
        item.descricao.toUpperCase(),
        `R$ ${clean(item.valor_total).toFixed(2)}`,
        `R$ ${saldoDevedorAnterior.toFixed(2)}`
      ];
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 6,
      head: [['TIPO DE CONTA', 'DESCRIÇÃO DO ITEM COBRADO', 'VALOR ORIGINAL', 'SALDO DEVEDOR ANTERIOR']],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
      styles: { fontSize: 8, cellPadding: 4, textColor: [30, 41, 59] },
      columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right', fontStyle: 'bold', textColor: [153, 27, 27] } }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 8;

    const metodosUsados = [];
    if (clean(pagamentosFeitos.pix) > 0) metodosUsados.push(['Pix:', `R$ ${clean(pagamentosFeitos.pix).toFixed(2)}`]);
    if (clean(pagamentosFeitos.dinheiro) > 0) metodosUsados.push(['Dinheiro em Espécie:', `R$ ${clean(pagamentosFeitos.dinheiro).toFixed(2)}`]);
    
    // ATUALIZADO: Descritivo do Cartão de Crédito
    if (clean(pagamentosFeitos.credito) > 0) {
      let desc = `Cartão de Crédito ${pagamentosFeitos.parcelas}x:`;
      if (clean(acrescimosFeitos.juros_cartao) > 0) desc = `Cartão de Crédito ${pagamentosFeitos.parcelas}x (c/ Juros):`;
      metodosUsados.push([desc, `R$ ${clean(pagamentosFeitos.credito).toFixed(2)}`]);
    }
    
    if (clean(pagamentosFeitos.debito) > 0) metodosUsados.push(['Cartão de Débito:', `R$ ${clean(pagamentosFeitos.debito).toFixed(2)}`]);
    if (clean(pagamentosFeitos.boleto) > 0) metodosUsados.push(['Boleto Bancário:', `R$ ${clean(pagamentosFeitos.boleto).toFixed(2)}`]);
    
    // Métodos da Editora no PDF
    if (clean(pagamentosFeitos.pix_editora) > 0) metodosUsados.push(['Pix (Editora/FTD):', `R$ ${clean(pagamentosFeitos.pix_editora).toFixed(2)}`]);
    if (clean(pagamentosFeitos.credito_editora) > 0) metodosUsados.push([`Cartão de Crédito (Editora) ${pagamentosFeitos.parcelas}x:`, `R$ ${clean(pagamentosFeitos.credito_editora).toFixed(2)}`]);
    if (clean(pagamentosFeitos.debito_editora) > 0) metodosUsados.push(['Cartão de Débito (Editora):', `R$ ${clean(pagamentosFeitos.debito_editora).toFixed(2)}`]);
    
    if (clean(pagamentosFeitos.credito_aluno) > 0) metodosUsados.push(['Saldo Virtual (Carteira do Aluno):', `R$ ${clean(pagamentosFeitos.credito_aluno).toFixed(2)}`]);

    const subtotalBase = subtotalCarrinho;
    const valorMultaAplicada = clean(acrescimosFeitos.multa);
    const valorDescontoAplicado = clean(acrescimosFeitos.desconto);
    const valorJurosCartao = clean(acrescimosFeitos.juros_cartao); // NOVO
    const totalRecebidoSomado = metodosUsados.reduce((acc, curr) => acc + clean(curr[1].replace('R$ ', '')), 0);

    const corpoResumo: any[] = [
      ['SUBTOTAL DAS CONTAS:', `R$ ${subtotalBase.toFixed(2)}`],
      ...(valorDescontoAplicado > 0 ? [['DESCONTOS APLICADOS:', `- R$ ${valorDescontoAplicado.toFixed(2)}`]] : []),
      ...(valorMultaAplicada > 0 ? [['MULTA / JUROS:', `+ R$ ${valorMultaAplicada.toFixed(2)}`]] : []),
      ...(valorJurosCartao > 0 ? [['JUROS DA MÁQUINA:', `+ R$ ${valorJurosCartao.toFixed(2)}`]] : []), // NOVO
      [{ content: 'VALOR TOTAL APURADO:', styles: { fontStyle: 'bold', textColor: [15, 23, 42] } }, { content: `R$ ${totalVenda.toFixed(2)}`, styles: { fontStyle: 'bold', textColor: [15, 23, 42] } }],
      ['-', '-'],
      [{ content: 'FORMAS DE PAGAMENTO UTILIZADAS', colSpan: 2, styles: { fontStyle: 'bold', halign: 'left', fillColor: [248, 250, 252] } }],
      ...metodosUsados,
      [{ content: 'TOTAL EFETIVAMENTE PAGO:', styles: { fontStyle: 'bold', textColor: [22, 163, 74] } }, { content: `R$ ${totalRecebidoSomado.toFixed(2)}`, styles: { fontStyle: 'bold', textColor: [22, 163, 74] } }]
    ];

    if (troco > 0) {
      corpoResumo.push([{ content: `TROCO GERADO (${acaoTroco === 'credito' ? 'Guardado na Carteira' : 'Devolvido'}):`, styles: { fontStyle: 'bold', textColor: [217, 119, 6] } }, { content: `R$ ${troco.toFixed(2)}`, styles: { fontStyle: 'bold', textColor: [217, 119, 6] } }]);
    }

    autoTable(doc, {
      startY: finalY, margin: { left: 95 }, 
      body: corpoResumo,
      theme: 'plain', styles: { fontSize: 8.5, cellPadding: 3.5, halign: 'right', textColor: [71, 85, 105] }, 
      columnStyles: { 0: { cellWidth: 70 }, 1: { cellWidth: 30, fontStyle: 'bold', halign: 'right' } }
    });

    const pageHeight = doc.internal.pageSize.height;
    doc.setFont("helvetica", "italic"); doc.setFontSize(7); doc.setTextColor(148, 163, 184);
    doc.text("Este documento é um recibo de pagamento emitido eletronicamente e comprova a quitação/amortização dos itens acima descritos.", 105, pageHeight - 15, { align: 'center' });
    doc.save(`Recibo_PDV_${aluno.nome.replace(/\s+/g, '_')}_${dataPagamentoPDV}.pdf`);
  }

  // --- MOTOR DE FINALIZAÇÃO BLINDADO DO PDV ---
  const finalizarVenda = async () => {
    if (processando) return; // TRAVA DE DUPLO CLIQUE
    if (carrinho.length === 0) return alert("O carrinho está vazio.");
    if (totalPagoRodada <= 0 && clean(acrescimos.desconto) <= 0 && carrinho.every(i => !i.isNovo)) return alert("Insira os valores recebidos para dar baixa.");
    if (creditoUtilizado > saldoAtualAluno) return alert("Crédito do aluno insuficiente.");

    setProcessando(true);
    try {
      let saldoParaDistribuir = totalPagoRodada + clean(acrescimos.desconto) - clean(acrescimos.multa) - clean(acrescimos.juros_cartao);

      if (trocoGerado > 0 && acaoTroco === 'devolver') {
         saldoParaDistribuir -= trocoGerado;
      }

      let idsProcessados: string[] = [];

      for (const item of carrinho) {
        const idString = String(item.id || "");
        const restanteDestaDivida = clean(item.valor_total) - clean(item.valor_pago);
        const valorAbatido = Math.max(0, Math.min(restanteDestaDivida, saldoParaDistribuir));
        saldoParaDistribuir -= valorAbatido;

        const novoValorPago = clean(item.valor_pago) + valorAbatido;
        
        let novoStatus = 'pendente';
        if (novoValorPago >= clean(item.valor_total) - 0.01) {
            novoStatus = 'pago';
        } else if (novoValorPago > 0) {
            novoStatus = 'parcial';
        }

        if (valorAbatido === 0 && !item.isNovo && clean(acrescimos.desconto) === 0 && clean(acrescimos.multa) === 0 && clean(acrescimos.juros_cartao) === 0) {
            continue;
        }

        // ATUALIZADO: Geração do Extrato de Formas Dinâmico para as Parcelas e Juros
        const formasStrArray = [];
        if (clean(pagamentos.pix) > 0) formasStrArray.push("Pix");
        if (clean(pagamentos.dinheiro) > 0) formasStrArray.push("Dinheiro");
        
        if (clean(pagamentos.credito) > 0) {
          let strCredito = `Cartão de Crédito ${pagamentos.parcelas}x`;
          if (clean(acrescimos.juros_cartao) > 0) {
            strCredito += ` (Juros R$ ${clean(acrescimos.juros_cartao).toFixed(2)})`;
          }
          formasStrArray.push(strCredito);
        }
        
        if (clean(pagamentos.debito) > 0) formasStrArray.push("Cartão de Débito");
        if (clean(pagamentos.boleto) > 0) formasStrArray.push("Boleto");
        if (clean(pagamentos.pix_editora) > 0) formasStrArray.push("Pix (Editora)");
        if (clean(pagamentos.credito_editora) > 0) formasStrArray.push(`Cartão de Crédito (Editora) ${pagamentos.parcelas}x`);
        if (clean(pagamentos.debito_editora) > 0) formasStrArray.push("Cartão de Débito (Editora)");
        if (creditoUtilizado > 0) formasStrArray.push("Saldo Virtual");
        
        const registroParcial = {
          data_recebimento: dataPagamentoPDV,
          valor_pago_rodada: valorAbatido,
          formas: formasStrArray.length > 0 ? formasStrArray.join(" + ") : "Ajuste/Avulso",
          desconto: acrescimos.desconto,
          multa: acrescimos.multa,
          juros_cartao: acrescimos.juros_cartao // NOVO NO HISTÓRICO
        };

        const historicoAntigo = Array.isArray(item.detalhes_metodos?.historico_parciais) ? item.detalhes_metodos.historico_parciais : [];
        const historico_parciais = valorAbatido > 0 || clean(acrescimos.desconto) > 0 
          ? [...historicoAntigo, registroParcial] 
          : historicoAntigo;

        const payloadMetodos = { ...pagamentos, historico_parciais };

        let savedId = item.id;

        if (item.isNovo || item.isTemp || idString.startsWith('temp_')) {
          const { data } = await supabase.from('historico_pagamentos').insert({
            aluno_id: alunoSelecionado.id,
            tipo: item.tipo || 'mensalidade',
            descricao: item.descricao,
            mes_referencia: item.mes_referencia || 'Avulso',
            valor_total: item.valor_total,
            valor_pago: novoValorPago,
            status: novoStatus,
            data_pagamento: dataPagamentoPDV,
            detalhes_metodos: payloadMetodos
          }).select('id').single();
          if (data) savedId = data.id;
        } else if (item.isMensalidadeTable) {
          await supabase.from('mensalidades').update({
            status: novoStatus,
            valor_pago: novoValorPago
          }).eq('id', item.id);

          const { data } = await supabase.from('historico_pagamentos').insert({
            aluno_id: alunoSelecionado.id,
            tipo: 'mensalidade',
            descricao: item.descricao,
            mes_referencia: 'Recorrente',
            valor_total: item.valor_total,
            valor_pago: novoValorPago,
            status: novoStatus,
            data_pagamento: dataPagamentoPDV,
            detalhes_metodos: payloadMetodos
          }).select('id').single();
          if (data) savedId = data.id;
        } else {
          await supabase.from('historico_pagamentos').update({ 
            status: novoStatus, 
            valor_pago: novoValorPago,
            data_pagamento: novoStatus === 'pago' ? dataPagamentoPDV : item.data_pagamento, 
            detalhes_metodos: payloadMetodos 
          }).eq('id', item.id);
        }

        if (savedId) idsProcessados.push(String(savedId));
      }

      // GERAÇÃO DE CRÉDITO COM O DNA VINCULADO
      const trocoParaAdicionar = acaoTroco === 'credito' ? trocoGerado : 0;
      if (creditoUtilizado > 0 || trocoParaAdicionar > 0) {
        const novoSaldo = saldoAtualAluno - creditoUtilizado + trocoParaAdicionar;
        await supabase.from('alunos').update({ saldo_credito: novoSaldo }).eq('id', alunoSelecionado.id);

        if (trocoParaAdicionar > 0) {
            const formasStrArray = [];
            if (clean(pagamentos.pix) > 0) formasStrArray.push("Pix");
            if (clean(pagamentos.dinheiro) > 0) formasStrArray.push("Dinheiro");
            if (clean(pagamentos.credito) > 0) formasStrArray.push("Cartão de Crédito");
            if (clean(pagamentos.debito) > 0) formasStrArray.push("Cartão de Débito");
            if (clean(pagamentos.boleto) > 0) formasStrArray.push("Boleto");
            if (clean(pagamentos.pix_editora) > 0) formasStrArray.push("Pix (Editora)");
            if (clean(pagamentos.credito_editora) > 0) formasStrArray.push("Cartão de Crédito (Editora)");
            if (clean(pagamentos.debito_editora) > 0) formasStrArray.push("Cartão de Débito (Editora)");
            
            const formaTexto = formasStrArray.length > 0 ? formasStrArray.join(" + ") : "Adição Automática";

            const nomesItens = carrinho.map((c: any) => c.descricao).join(", ");
            const descricaoTroco = `Crédito de Troco gerado na quitação de: ${nomesItens}. (Total Devido: R$ ${totalComAcrescimos.toFixed(2)} | Total Pago: R$ ${totalPagoRodada.toFixed(2)})`;

            await supabase.from('historico_pagamentos').insert({
              aluno_id: alunoSelecionado.id,
              tipo: 'credito',
              descricao: descricaoTroco,
              mes_referencia: 'Avulso',
              valor_total: trocoParaAdicionar,
              valor_pago: trocoParaAdicionar,
              status: 'pago',
              data_pagamento: dataPagamentoPDV,
              detalhes_metodos: { forma_geradora: formaTexto, ids_origem: idsProcessados }
            });
        }
      }

      alert("Transação registrada com sucesso no banco de dados!");
      
      if (window.confirm("Deseja gerar o Recibo Oficial em PDF detalhando esta operação?")) {
        gerarPDFRecibo(alunoSelecionado, carrinho, pagamentos, acrescimos, totalComAcrescimos, trocoGerado);
      }
      
      setAlunoSelecionado(null);
      await carregarDadosBase();

    } catch (error: any) {
      alert("Erro ao finalizar: " + error.message);
    } finally {
      setProcessando(false);
    }
  };

  // --- MOTOR DE ESTORNO DO PDV (IDÊNTICO AO PERFIL DO ALUNO) ---
  const estornarPagamento = async (pgto: any) => {
    if (processando) return;
    const isAdmin = prompt(`Digite a Senha Mestra para ESTORNAR:`);
    if (isAdmin !== SENHA_MESTRA) return alert("Senha incorreta.");

    let variacaoSaldoCredito = 0;
    let idsParaDeletar: string[] = [];
    let idsParaZerar: string[] = [];
    let mensagem = "⚠️ DETALHES DO ESTORNO:\n\n";

    const isCredito = pgto.tipo === 'credito' || pgto.descricao?.toLowerCase().includes('crédito') || pgto.descricao?.toLowerCase().includes('troco');
    
    if (isCredito) {
        const valorCredito = clean(pgto.valor_total);
        const isSubtracao = pgto.detalhes_metodos?.e_subtracao === true;
        
        if (!isSubtracao) {
            variacaoSaldoCredito -= valorCredito;
            idsParaDeletar.push(pgto.id);
            mensagem += `- Remoção do Crédito/Troco da carteira: -R$ ${valorCredito.toFixed(2)}\n`;

            const origens = pgto.detalhes_metodos?.ids_origem;
            if (origens) {
                const strOrigens = Array.isArray(origens) ? origens.map(String) : [String(origens)];
                const dividasVinculadas = historicoGeral.filter(h => strOrigens.includes(String(h.id)));
                
                for (const div of dividasVinculadas) {
                    idsParaZerar.push(div.id);
                    let creditoUsado = clean(div.detalhes_metodos?.credito_utilizado_nesta_parcela);
                    if (creditoUsado === 0 && clean(div.detalhes_metodos?.credito_aluno) > 0) creditoUsado = clean(div.detalhes_metodos?.credito_aluno);
                    
                    if (creditoUsado > 0) {
                        variacaoSaldoCredito += creditoUsado;
                        mensagem += `- Reembolso (Parcela Vinculada usou crédito): +R$ ${creditoUsado.toFixed(2)}\n`;
                    }
                }
                if (dividasVinculadas.length > 0) {
                    mensagem += `- ${dividasVinculadas.length} parcela(s) originais voltarão a ficar PENDENTES.\n`;
                }
            }
        } else {
            variacaoSaldoCredito += Math.abs(valorCredito);
            idsParaDeletar.push(pgto.id);
            mensagem += `- Reversão de Subtração (O valor voltará para a carteira): +R$ ${Math.abs(valorCredito).toFixed(2)}\n`;
        }
    } else {
        idsParaZerar.push(pgto.id);
        mensagem += `- A transação voltará para PENDENTE (R$ 0,00 pago).\n`;
        
        let creditoUsado = clean(pgto.detalhes_metodos?.credito_utilizado_nesta_parcela);
        if (creditoUsado === 0 && clean(pgto.detalhes_metodos?.credito_aluno) > 0) creditoUsado = clean(pgto.detalhes_metodos?.credito_aluno);
        
        if (creditoUsado > 0) {
            variacaoSaldoCredito += creditoUsado;
            mensagem += `- Devolução do Crédito Virtual usado no pagamento: +R$ ${creditoUsado.toFixed(2)}\n`;
        }

        const creditosGerados = historicoGeral.filter(h => {
            const isCred = h.tipo === 'credito' || h.descricao?.toLowerCase().includes('troco') || h.descricao?.toLowerCase().includes('crédito');
            if (!isCred) return false;
            
            const origens = h.detalhes_metodos?.ids_origem;
            if (origens) {
                const strOrigens = Array.isArray(origens) ? origens.map(String) : [String(origens)];
                if (strOrigens.includes(String(pgto.id))) return true;
            }
            
            if (h.descricao && pgto.descricao && h.descricao.toLowerCase().includes(pgto.descricao.toLowerCase())) {
                return true;
            }
            return false;
        });

        for (const c of creditosGerados) {
            idsParaDeletar.push(c.id);
            variacaoSaldoCredito -= clean(c.valor_total);
            mensagem += `- O Troco gerado por este pagamento será CANCELADO e retirado da carteira: -R$ ${clean(c.valor_total).toFixed(2)}\n`;
        }
    }

    const alunoEspecifico = alunos.find(a => a.id === pgto.aluno_id);
    const saldoAtual = alunoEspecifico ? clean(alunoEspecifico.saldo_credito) : 0;
    const saldoFinalEsperado = Math.max(0, saldoAtual + variacaoSaldoCredito);
    
    mensagem += `\nSaldo Atual na Carteira: R$ ${saldoAtual.toFixed(2)}`;
    mensagem += `\nSaldo Final Após Estorno: R$ ${saldoFinalEsperado.toFixed(2)}\n\nConfirmar operação de Estorno Integrado?`;

    if (!confirm(mensagem)) return;

    setProcessando(true);
    try {
        if (variacaoSaldoCredito !== 0) {
            await supabase.from('alunos').update({ saldo_credito: saldoFinalEsperado }).eq('id', pgto.aluno_id);
        }

        if (idsParaDeletar.length > 0) {
            await supabase.from('historico_pagamentos').delete().in('id', idsParaDeletar);
        }

        if (idsParaZerar.length > 0) {
            await supabase.from('historico_pagamentos').update({ 
                status: 'pendente', 
                valor_pago: 0, 
                detalhes_metodos: {} 
            }).in('id', idsParaZerar);
        }

        alert("Estorno processado com sucesso! Relatórios e carteira reajustados.");
        await carregarDadosBase();
    } catch (error: any) {
        alert("Erro ao estornar: " + error.message);
    } finally {
        setProcessando(false);
    }
  };

  const alunosFiltrados = buscaAluno === "" 
    ? alunos.slice(0, 5) 
    : alunos.filter(a => a.nome.toLowerCase().includes(buscaAluno.toLowerCase())).slice(0, 5);

  if (carregando && historicoGeral.length === 0) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <div className="text-slate-500 font-medium tracking-wide animate-pulse">Iniciando Terminal PDV...</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-6 lg:p-8 xl:p-10 font-sans text-slate-800 pb-24 selection:bg-indigo-100 selection:text-indigo-900">
      <div className="max-w-[1700px] w-full mx-auto space-y-6 md:space-y-8">
        
        {/* Cabeçalho */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60 flex justify-between items-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
          <div className="flex items-center gap-4">
            <div className="bg-indigo-50 p-3 rounded-xl">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Terminal de Caixa</h1>
              <p className="text-sm text-slate-500 mt-0.5">Central Unificada de Recebimentos e Vendas</p>
            </div>
          </div>
          <button 
            onClick={() => router.push('/admin/dashboard')} 
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 font-medium text-sm rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Voltar
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 md:gap-8">
          
          <div className="xl:col-span-8 space-y-6">
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60">
              <h2 className="text-sm font-bold text-slate-800 mb-5 flex items-center gap-2.5 uppercase tracking-wide">
                <span className="bg-slate-100 text-slate-600 w-7 h-7 rounded-lg flex items-center justify-center text-xs border border-slate-200">1</span> 
                Identificação do Cliente
              </h2>
              
              {!alunoSelecionado ? (
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </div>
                  <input 
                    type="text" 
                    placeholder="Buscar aluno por nome..." 
                    value={buscaAluno} 
                    onChange={(e) => setBuscaAluno(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all shadow-sm"
                  />
                  {buscaAluno && (
                    <div className="absolute z-10 w-full mt-2 border border-slate-200 rounded-xl overflow-hidden shadow-xl bg-white">
                      {alunosFiltrados.map(a => (
                        <div key={a.id} onClick={() => setAlunoSelecionado(a)} className="p-3.5 border-b border-slate-50 hover:bg-indigo-50 cursor-pointer transition-colors flex justify-between items-center group">
                          <span className="font-medium text-sm text-slate-700 group-hover:text-indigo-700">{a.nome}</span>
                          <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md">{a.turma}</span>
                        </div>
                      ))}
                      {alunosFiltrados.length === 0 && (
                         <div className="p-6 text-center text-sm text-slate-500">Nenhum aluno encontrado para "<span className="font-medium text-slate-700">{buscaAluno}</span>"</div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex justify-between items-center bg-gradient-to-r from-indigo-50 to-blue-50/30 p-5 rounded-xl border border-indigo-100 shadow-inner">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-white text-indigo-600 rounded-xl shadow-sm border border-indigo-100 flex items-center justify-center text-xl font-bold">
                      {alunoSelecionado.nome.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">{alunoSelecionado.nome}</h3>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-md flex items-center gap-1 border border-emerald-200/50">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08-.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          Saldo: R$ {saldoAtualAluno.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setAlunoSelecionado(null)} 
                    className="text-xs bg-white border border-slate-200 text-slate-600 font-semibold px-4 py-2.5 rounded-lg hover:bg-slate-50 hover:text-rose-600 transition-colors shadow-sm"
                  >
                    Trocar Cliente
                  </button>
                </div>
              )}
            </div>

            {/* Painéis Condicionais: Radar Diário x Dívidas do Aluno */}
            {!alunoSelecionado ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in zoom-in-95 duration-300">
                
                {/* Radar de Inadimplência Crítica */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 flex flex-col h-[400px]">
                  <h3 className="text-sm font-bold text-rose-800 mb-4 flex items-center gap-2 uppercase tracking-wide border-b border-rose-100 pb-3">
                      <span className="flex w-3 h-3">
                        <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                      </span>
                      Radar de Inadimplência
                  </h3>
                  <div className="space-y-3 overflow-y-auto custom-scrollbar pr-2 flex-1">
                      {inadimplentesTop5.length > 0 ? inadimplentesTop5.map(item => {
                          return (
                              <div key={item.alunoRaw.id} className="flex justify-between items-center p-3.5 bg-rose-50/50 border border-rose-100 rounded-xl hover:border-rose-300 transition-colors">
                                  <div className="overflow-hidden pr-2">
                                      <span className="block text-xs font-bold text-slate-800 uppercase truncate">{item.nome}</span>
                                      <span className="text-[10px] text-slate-500 font-medium">Turma: {item.alunoRaw.turma || "N/A"}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-black text-rose-600 text-sm whitespace-nowrap">R$ {item.total_devido.toFixed(2)}</span>
                                    <button 
                                        onClick={() => setAlunoSelecionado(item.alunoRaw)}
                                        className="bg-rose-100 hover:bg-rose-600 hover:text-white text-rose-700 p-1.5 rounded-lg transition-all"
                                        title="Cobrar no PDV"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                    </button>
                                  </div>
                              </div>
                          );
                      }) : (
                          <div className="h-full flex flex-col items-center justify-center text-center opacity-60 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            <span className="text-4xl mb-2">🏆</span>
                            <p className="text-xs text-slate-500 font-medium italic">Nenhuma inadimplência<br/>registrada no momento.</p>
                          </div>
                      )}
                  </div>
                </div>

                {/* Recebimentos Hoje */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 flex flex-col h-[400px]">
                  <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-wide border-b border-slate-100 pb-3">
                      <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                      ✅ Caixa do Dia
                  </h3>
                  <div className="space-y-3 overflow-y-auto custom-scrollbar pr-2 flex-1">
                      {recebimentosHoje.length > 0 ? recebimentosHoje.map(item => {
                          const nomeAluno = alunos.find(a => a.id === item.aluno_id)?.nome || "Desconhecido";
                          return (
                              <div key={item.id} className="flex justify-between items-center p-3.5 bg-emerald-50/30 border border-emerald-100 rounded-xl hover:border-emerald-300 transition-colors">
                                  <div className="overflow-hidden pr-2">
                                      <span className="block text-xs font-bold text-emerald-900 uppercase truncate">{nomeAluno}</span>
                                      <span className="text-[10px] text-slate-500 font-medium uppercase block truncate">{item.descricao}</span>
                                  </div>
                                  <div className="flex items-center gap-2 whitespace-nowrap">
                                      <span className="font-bold text-emerald-600 text-sm">R$ {clean(item.valor_pago).toFixed(2)}</span>
                                      <button 
                                          onClick={() => estornarPagamento(item)}
                                          disabled={processando}
                                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors disabled:opacity-50"
                                          title="Estornar / Desfazer Lançamento"
                                      >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                                      </button>
                                  </div>
                              </div>
                          );
                      }) : (
                          <div className="h-full flex flex-col items-center justify-center text-center opacity-60 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            <span className="text-4xl mb-2">💸</span>
                            <p className="text-xs text-slate-500 font-medium italic">Nenhum recebimento<br/>registrado hoje.</p>
                          </div>
                      )}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4">
                   <h2 className="text-sm font-bold text-slate-800 mb-5 flex items-center gap-2.5 uppercase tracking-wide">
                    <span className="bg-rose-100 text-rose-700 w-7 h-7 rounded-lg flex items-center justify-center text-xs border border-rose-200">2</span> 
                    Dívidas em Aberto
                  </h2>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                    {dividasAluno.length > 0 ? dividasAluno.map(div => {
                      const devedor = clean(div.valor_total) - clean(div.valor_pago);
                      const noCarrinho = carrinho.find(c => c.id === div.id);
                      if (devedor <= 0) return null;
                      
                      return (
                        <div key={div.id} className={`p-4 rounded-xl border flex justify-between items-center transition-all duration-200 hover:-translate-y-0.5 ${noCarrinho ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md'}`}>
                          <div>
                            <span className="block text-sm font-bold text-slate-800">{div.descricao}</span>
                            <span className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                              Venceu em: {new Date(div.data_pagamento).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-bold text-rose-600">R$ {devedor.toFixed(2)}</span>
                            <button 
                              onClick={() => noCarrinho ? removerDoCarrinho(div.id) : adicionarAoCarrinho(div)}
                              className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-medium transition-all ${noCarrinho ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 hover:bg-indigo-700' : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                            >
                              {noCarrinho ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                              ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    }) : (
                      <div className="flex flex-col items-center justify-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <p className="text-sm text-slate-500 font-medium">O aluno não possui pendências.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60 transition-all duration-300 animate-in fade-in slide-in-from-bottom-6">
                   <h2 className="text-sm font-bold text-slate-800 mb-5 flex items-center gap-2.5 uppercase tracking-wide">
                    <span className="bg-sky-100 text-sky-700 w-7 h-7 rounded-lg flex items-center justify-center text-xs border border-sky-200">3</span> 
                    Venda Avulsa
                  </h2>
                  
                  <div className="mb-4">
                    <select 
                      value={novoItem.tipo} 
                      onChange={(e) => setNovoItem({...novoItem, tipo: e.target.value})} 
                      className="w-full sm:w-1/3 p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all shadow-sm"
                    >
                      <option value="uniforme">Uniforme (Catálogo)</option>
                      <option value="material">Material</option>
                      <option value="evento">Evento</option>
                      <option value="acordo">Outros</option>
                    </select>
                  </div>

                  {novoItem.tipo === 'uniforme' ? (
                    <div className="space-y-4 animate-in fade-in zoom-in-95">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {[
                          { key: 'camisaPadrao', label: 'Camisa Padrão (R$60)' },
                          { key: 'camisaEdFisica', label: 'Camisa Ed. Física (R$60)' },
                          { key: 'calca', label: 'Calça (R$80)' },
                          { key: 'shortSaia', label: 'Short-Saia (R$60)' },
                          { key: 'short', label: 'Short (R$60)' },
                          { key: 'casaco', label: 'Casaco (R$130)' },
                        ].map((item) => (
                          <div key={item.key} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between shadow-sm">
                            <span className="text-xs font-bold text-slate-600 block mb-2">{item.label}</span>
                            <div className="flex gap-2 items-center">
                              <div className="flex-[1.3]">
                                <select
                                  value={(uniformesTamanhos as any)[item.key]}
                                  onChange={(e) => setUniformesTamanhos(prev => ({ ...prev, [item.key]: e.target.value }))}
                                  className="w-full p-2 rounded-lg border border-slate-300 text-xs font-bold bg-white text-slate-700 outline-none focus:border-indigo-400"
                                >
                                  <option value="4 anos">4 anos</option>
                                  <option value="6 anos">6 anos</option>
                                  <option value="8 anos">8 anos</option>
                                  <option value="10 anos">10 anos</option>
                                  <option value="12 anos">12 anos</option>
                                </select>
                              </div>
                              <div className="flex-1">
                                <input 
                                  type="number" min="0" 
                                  value={(uniformesVenda as any)[item.key] || ""} 
                                  onChange={(e) => setUniformesVenda(prev => ({ ...prev, [item.key]: Math.max(0, parseInt(e.target.value) || 0) }))} 
                                  className="w-full p-2 rounded-lg border border-slate-300 font-bold text-xs text-center outline-none focus:border-indigo-400" 
                                  placeholder="0"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                        <div>
                          <span className="text-xs font-bold text-indigo-800 block">TOTAL DO UNIFORME</span>
                          <h3 className="text-2xl font-black text-indigo-700">R$ {totalVendaUniforme.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                        </div>
                        <button 
                          onClick={lancarItemAvulsoNoCarrinho} 
                          className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                          Adicionar à Venda
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 animate-in fade-in">
                      <input 
                        type="text" 
                        placeholder="Descrição detalhada..." 
                        value={novoItem.descricao} 
                        onChange={(e) => setNovoItem({...novoItem, descricao: e.target.value})} 
                        className="sm:col-span-6 p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all shadow-sm" 
                      />
                      <div className="sm:col-span-3 relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">R$</span>
                        <input 
                          type="number" step="0.01" min="0" 
                          placeholder="0.00" 
                          value={novoItem.valor} 
                          onChange={(e) => setNovoItem({...novoItem, valor: e.target.value})} 
                          className="w-full pl-10 p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all shadow-sm" 
                        />
                      </div>
                      <button 
                        onClick={lancarItemAvulsoNoCarrinho} 
                        className="sm:col-span-3 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-sm rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Incluir
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* COLUNA DIREITA: Carrinho e Fechamento */}
          <div className="xl:col-span-4 relative">
            <div className="bg-white p-6 md:p-7 rounded-2xl shadow-xl border border-slate-200/80 sticky top-6 flex flex-col min-h-[600px] border-t-4 border-t-indigo-500">
              
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                  Resumo do Caixa
                </h2>
                <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-md text-xs font-bold border border-slate-200">
                  {carrinho.length} {carrinho.length === 1 ? 'ITEM' : 'ITENS'}
                </span>
              </div>

              {/* Lista do Carrinho */}
              <div className="flex-1 space-y-3 mb-6 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
                {carrinho.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center space-y-3 opacity-60">
                    <div className="bg-slate-100 p-4 rounded-full">
                      <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                    </div>
                    <p className="text-slate-500 font-medium text-sm">Nenhum item selecionado</p>
                  </div>
                ) : carrinho.map((item, idx) => {
                  const valorExibir = clean(item.valor_total) - clean(item.valor_pago);
                  return (
                    <div key={idx} className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100 group hover:border-slate-300 transition-colors">
                      <div className="truncate pr-3">
                        <span className="text-sm font-bold text-slate-800 block truncate" title={item.descricao}>{item.descricao}</span>
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-wider mt-1 inline-block">
                          {item.isNovo ? 'Nova Venda' : 'Quitação'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-sm font-bold text-slate-800">R$ {valorExibir.toFixed(2)}</span>
                        <button 
                          onClick={() => removerDoCarrinho(item.id)} 
                          className="text-slate-400 hover:text-rose-600 font-medium w-7 h-7 flex items-center justify-center rounded-lg hover:bg-rose-50 transition-colors"
                          title="Remover item"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Ajustes Financeiros */}
              <div className="bg-[#f8fafc] p-5 rounded-2xl border border-slate-200/80 space-y-4 mb-6">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-semibold text-slate-500">Subtotal</span>
                  <span className="font-bold text-slate-800">R$ {subtotalCarrinho.toFixed(2)}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Desconto (R$)</label>
                    <input 
                      type="number" step="0.01" min="0" 
                      value={acrescimos.desconto} 
                      onChange={(e) => setAcrescimos({...acrescimos, desconto: e.target.value})} 
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-800 font-medium text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm" 
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Multa (R$)</label>
                    <input 
                      type="number" step="0.01" min="0" 
                      value={acrescimos.multa} 
                      onChange={(e) => setAcrescimos({...acrescimos, multa: e.target.value})} 
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-800 font-medium text-sm focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all shadow-sm" 
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                  <span className="text-sm font-bold text-slate-800 uppercase">Total a Pagar</span>
                  <span className="text-2xl font-black text-indigo-700 tracking-tight">R$ {totalComAcrescimos.toFixed(2)}</span>
                </div>
              </div>

              {/* Formas e Data de Pagamento */}
              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-end border-b border-slate-100 pb-3 mb-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Formas de Pagamento</h4>
                  <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Data Pgto:</label>
                    <input 
                      type="date" 
                      value={dataPagamentoPDV} 
                      onChange={(e) => setDataPagamentoPDV(e.target.value)} 
                      className="bg-transparent border-none text-slate-800 text-xs outline-none font-bold cursor-pointer" 
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Pix</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">R$</span>
                      <input type="number" step="0.01" min="0" value={pagamentos.pix} onChange={e => setPagamentos({...pagamentos, pix: e.target.value})} className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 text-slate-800 font-medium text-sm rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm" placeholder="0.00" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Espécie</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">R$</span>
                      <input type="number" step="0.01" min="0" value={pagamentos.dinheiro} onChange={e => setPagamentos({...pagamentos, dinheiro: e.target.value})} className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 text-slate-800 font-medium text-sm rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm" placeholder="0.00" />
                    </div>
                  </div>
                  
                  {/* ATUALIZADO: CARTÃO DE CRÉDITO COM JUROS E PARCELAS */}
                  <div className="col-span-2 bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-sm">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Cartão de Crédito</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">R$</span>
                        <input type="number" step="0.01" min="0" value={pagamentos.credito} onChange={e => setPagamentos({...pagamentos, credito: e.target.value})} className="w-full pl-9 pr-2 py-2.5 bg-white border border-slate-200 text-slate-800 font-medium text-sm rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20" placeholder="Valor T." />
                      </div>
                      <div>
                        <select value={pagamentos.parcelas} onChange={e => setPagamentos({...pagamentos, parcelas: e.target.value})} className="w-full px-2 py-2.5 bg-white border border-slate-200 text-slate-800 font-medium text-sm rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20">
                          <option value="1">À vista</option>
                          {[...Array(11)].map((_, i) => (
                            <option key={i+2} value={i+2}>{i+2}x</option>
                          ))}
                        </select>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">R$</span>
                        <input type="number" step="0.01" min="0" value={acrescimos.juros_cartao} onChange={e => setAcrescimos({...acrescimos, juros_cartao: e.target.value})} className="w-full pl-9 pr-2 py-2.5 bg-white border border-slate-200 text-slate-800 font-medium text-sm rounded-lg outline-none focus:ring-2 focus:ring-rose-500/20" placeholder="Juros (+)" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Cartão de Débito</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">R$</span>
                      <input type="number" step="0.01" min="0" value={pagamentos.debito} onChange={e => setPagamentos({...pagamentos, debito: e.target.value})} className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 text-slate-800 font-medium text-sm rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm" placeholder="0.00" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Boleto Bancário</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">R$</span>
                      <input type="number" step="0.01" min="0" value={pagamentos.boleto} onChange={e => setPagamentos({...pagamentos, boleto: e.target.value})} className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 text-slate-800 font-medium text-sm rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm" placeholder="0.00" />
                    </div>
                  </div>
                </div>

                {/* PAINEL DINÂMICO DE EDITORA */}
                {temLivroNoCarrinho && (
                  <div className="mt-4 pt-4 border-t border-indigo-100 animate-in fade-in zoom-in-95">
                    <h5 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                      Pagamento Direto - Editora FTD
                    </h5>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-indigo-500 uppercase block mb-1">Pix (Editora)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-300 font-medium text-sm">R$</span>
                          <input type="number" step="0.01" min="0" value={pagamentos.pix_editora} onChange={e => setPagamentos({...pagamentos, pix_editora: e.target.value})} className="w-full pl-9 pr-3 py-2.5 bg-indigo-50 border border-indigo-100 text-indigo-900 font-medium text-sm rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm" placeholder="0.00" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-indigo-500 uppercase block mb-1">Crédito (Editora)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-300 font-medium text-sm">R$</span>
                          <input type="number" step="0.01" min="0" value={pagamentos.credito_editora} onChange={e => setPagamentos({...pagamentos, credito_editora: e.target.value})} className="w-full pl-9 pr-3 py-2.5 bg-indigo-50 border border-indigo-100 text-indigo-900 font-medium text-sm rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm" placeholder="0.00" />
                        </div>
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-indigo-500 uppercase block mb-1">Débito (Editora)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-300 font-medium text-sm">R$</span>
                          <input type="number" step="0.01" min="0" value={pagamentos.debito_editora} onChange={e => setPagamentos({...pagamentos, debito_editora: e.target.value})} className="w-full pl-9 pr-3 py-2.5 bg-indigo-50 border border-indigo-100 text-indigo-900 font-medium text-sm rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm" placeholder="0.00" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {saldoAtualAluno > 0 && (
                  <div className="mt-4 p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-xl flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                      <span className="text-sm font-bold text-emerald-800">Usar Saldo Virtual</span>
                    </div>
                    <div className="relative w-28 group">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-emerald-600/50 font-bold text-sm">R$</span>
                      <input type="number" step="0.01" min="0" placeholder="0.00" value={pagamentos.credito_aluno} onChange={e => setPagamentos({...pagamentos, credito_aluno: e.target.value})} className="w-full pl-8 py-2 bg-white border border-emerald-200 text-emerald-800 text-sm rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 font-bold transition-all shadow-sm" />
                    </div>
                  </div>
                )}
              </div>

              {/* OPÇÕES DE DESTINO DO TROCO */}
              {trocoGerado > 0 && (
                <div className="mb-4 p-4 bg-emerald-50 rounded-xl border border-emerald-200 shadow-sm transition-all animate-in fade-in zoom-in-95">
                  <h4 className="text-xs font-bold text-emerald-800 uppercase mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                    Destino do Troco (R$ {trocoGerado.toFixed(2)})
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setAcaoTroco('credito')}
                      className={`py-2 px-3 rounded-lg text-sm font-bold border transition-all ${acaoTroco === 'credito' ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-100'}`}
                    >
                      Guardar na Carteira
                    </button>
                    <button
                       onClick={() => setAcaoTroco('devolver')}
                       className={`py-2 px-3 rounded-lg text-sm font-bold border transition-all ${acaoTroco === 'devolver' ? 'bg-slate-700 text-white border-slate-700 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                    >
                      Devolver ao Cliente
                    </button>
                  </div>
                </div>
              )}

              {/* Totalizador Dinâmico */}
              <div className="flex justify-between items-center mb-6 p-5 rounded-xl bg-slate-50 border border-slate-200 mt-auto shadow-inner">
                <span className="text-sm font-bold text-slate-600 uppercase tracking-wide">
                  {faltaPagar > 0 ? 'Falta Receber' : (acaoTroco === 'credito' ? 'Crédito Gerado' : 'Troco a Devolver')}
                </span>
                <span className={`text-2xl font-black tracking-tight ${faltaPagar > 0 ? 'text-rose-600' : (acaoTroco === 'credito' ? 'text-emerald-600' : 'text-amber-600')}`}>
                  R$ {faltaPagar > 0 ? faltaPagar.toFixed(2) : trocoGerado.toFixed(2)}
                </span>
              </div>

              {/* Botão Finalizar */}
              <button 
                onClick={finalizarVenda}
                disabled={processando || !alunoSelecionado || carrinho.length === 0}
                className={`w-full py-4 rounded-xl font-bold text-sm uppercase tracking-wider transition-all duration-200 flex justify-center items-center gap-2 ${
                  processando || !alunoSelecionado || carrinho.length === 0 
                  ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-700 hover:to-blue-700 shadow-md hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98]'
                }`}
              >
                {processando ? (
                   <>
                     <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                     Processando...
                   </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Finalizar Recebimento
                  </>
                )}
              </button>
            </div>
          </div>

        </div>
      </div>
      
      {/* Scrollbar Customizada Global do Componente */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}} />
    </div>
  );
}

export default function PDVPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <div className="text-slate-500 font-medium tracking-wide animate-pulse">Iniciando Terminal PDV...</div>
        </div>
      </div>
    }>
      <PDVContent />
    </Suspense>
  );
}