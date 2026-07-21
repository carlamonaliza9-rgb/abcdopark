import { supabase } from "@/lib/supabase";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const clean = (val: any) => {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === 'number') return val;
  const str = String(val).trim();
  if (str.includes(',')) return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
  return parseFloat(str) || 0;
};

export async function gerarReciboPDF({
  aluno,
  itensCarrinho,
  pagamentosFeitos,
  acrescimosFeitos,
  totalVenda,
  troco,
  acaoTroco,
  dataPagamentoPDV,
  subtotalCarrinho
}: {
  aluno: any;
  itensCarrinho: any[];
  pagamentosFeitos: any;
  acrescimosFeitos: any;
  totalVenda: number;
  troco: number;
  acaoTroco: 'credito' | 'devolver';
  dataPagamentoPDV: string;
  subtotalCarrinho: number;
}) {
  const doc = new jsPDF();
  const logoUrl = "https://mnmakhazghgncqummksu.supabase.co/storage/v1/object/public/assets/logo.png";
  const dataHoraEmissao = new Date();
  const reciboNum = `${dataHoraEmissao.getFullYear()}${String(dataHoraEmissao.getMonth()+1).padStart(2,'0')}${String(dataHoraEmissao.getDate()).padStart(2,'0')}-${Math.floor(1000 + Math.random() * 9000)}`;

  try { doc.addImage(logoUrl, "PNG", 14, 12, 24, 24); } catch (e) {}

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(30, 58, 138); 
  doc.text("ESCOLA ABC DO PARK", 40, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); 
  doc.text("CNPJ: 05.067.797/0001-68", 40, 23);
  doc.text("CONJ PARKLANDIA - QUADRA A CASA 02 - Belém/PA", 40, 27);
  doc.text("Telefone: (91) 3268-3484 / (91) 98622-7715", 40, 31);

  doc.setFillColor(240, 244, 255); 
  doc.roundedRect(132, 12, 64, 24, 2, 2, 'F');

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(67, 56, 202); 
  doc.text("RECIBO DE PAGAMENTO", 164, 18, { align: "center" });
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Nº: ${reciboNum}`, 164, 23, { align: "center" });
  doc.text(`Referência: ${dataPagamentoPDV.split('-').reverse().join('/')}`, 164, 28, { align: "center" });
  doc.text(`Emissão: ${dataHoraEmissao.toLocaleTimeString('pt-BR')}`, 164, 33, { align: "center" });

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(14, 42, 196, 42); 

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184); 
  doc.text("ALUNO:", 14, 50);
  doc.text("TURMA:", 120, 50);
  doc.text("CPF/DOC:", 160, 50);

  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59); 
  doc.text((aluno?.nome || 'NÃO IDENTIFICADO').toUpperCase(), 14, 55);
  doc.text((aluno?.turma || 'NÃO DEFINIDA').toUpperCase(), 120, 55);
  doc.text(aluno?.cpf_aluno || aluno?.cpf_responsavel || 'N/A', 160, 55);

  let currentY = 64;

  const tableRows = itensCarrinho.map((item: any) => {
    const saldoDevedorAnterior = clean(item.valor_total) - clean(item.valor_pago);
    return [
      (item.descricao || 'Item sem descrição').toUpperCase(),
      (item.tipo || 'Lançamento').toUpperCase(),
      `R$ ${clean(item.valor_total).toFixed(2)}`,
      `R$ ${saldoDevedorAnterior.toFixed(2)}`
    ];
  });

  (autoTable as any)(doc, {
    startY: currentY,
    head: [['DESCRIÇÃO DO ITEM', 'CATEGORIA', 'VALOR ORIGINAL', 'PENDENTE ANTERIOR']],
    body: tableRows,
    theme: 'plain', 
    headStyles: { 
      fillColor: [248, 250, 252], 
      textColor: [100, 116, 139], 
      fontStyle: 'bold', 
      fontSize: 7.5,
      cellPadding: { top: 5, bottom: 5, left: 4, right: 4 } 
    }, 
    styles: { 
      fontSize: 8.5, 
      cellPadding: { top: 6, bottom: 6, left: 4, right: 4 }, 
      textColor: [51, 65, 85] 
    },
    columnStyles: { 
      2: { halign: 'center' }, 
      3: { halign: 'right', fontStyle: 'bold', textColor: [220, 38, 38] } 
    }
  });

  currentY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 8 : currentY + 30;

  const historicalRows: any[] = [];
  itensCarrinho.forEach(item => {
    if (item.detalhes_metodos && Array.isArray(item.detalhes_metodos.historico_parciais)) {
      item.detalhes_metodos.historico_parciais.forEach((hist: any) => {
        let dataFormatada = hist.data_recebimento;
        if (dataFormatada && dataFormatada.includes('-')) {
          dataFormatada = dataFormatada.split('-').reverse().join('/');
        }
        historicalRows.push([
          (item.descricao || '').toUpperCase(),
          `${dataFormatada}`,
          (hist.formas || 'N/A').toUpperCase(),
          `R$ ${clean(hist.valor_pago_rodada).toFixed(2)}`
        ]);
      });
    }
  });

  if (historicalRows.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); 
    doc.text("HISTÓRICO DE ABATIMENTOS ANTERIORES", 14, currentY);

    (autoTable as any)(doc, {
      startY: currentY + 3,
      body: historicalRows,
      theme: 'plain',
      styles: { fontSize: 8, cellPadding: { top: 4, bottom: 4, left: 4, right: 4 }, textColor: [100, 116, 139] },
      columnStyles: { 
        0: { cellWidth: 80 }, 
        3: { halign: 'right', fontStyle: 'bold', textColor: [22, 163, 74] } 
      }
    });
    
    currentY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 10 : currentY + 20;
  }

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(14, currentY, 196, currentY);
  currentY += 8;

  const metodosUsados = [];
  if (clean(pagamentosFeitos.pix) > 0) metodosUsados.push(['Pix', `R$ ${clean(pagamentosFeitos.pix).toFixed(2)}`]);
  if (clean(pagamentosFeitos.dinheiro) > 0) metodosUsados.push(['Dinheiro em Espécie', `R$ ${clean(pagamentosFeitos.dinheiro).toFixed(2)}`]);

  if (clean(pagamentosFeitos.credito) > 0) {
    let desc = `Cartão de Crédito ${pagamentosFeitos.parcelas}x`;
    if (clean(acrescimosFeitos.juros_cartao) > 0) desc = `Cartão de Crédito ${pagamentosFeitos.parcelas}x (c/ Juros)`;
    metodosUsados.push([desc, `R$ ${clean(pagamentosFeitos.credito).toFixed(2)}`]);
  }

  if (clean(pagamentosFeitos.debito) > 0) metodosUsados.push(['Cartão de Débito', `R$ ${clean(pagamentosFeitos.debito).toFixed(2)}`]);
  if (clean(pagamentosFeitos.boleto) > 0) metodosUsados.push(['Boleto Bancário', `R$ ${clean(pagamentosFeitos.boleto).toFixed(2)}`]);
  if (clean(pagamentosFeitos.pix_editora) > 0) metodosUsados.push(['Pix (Editora)', `R$ ${clean(pagamentosFeitos.pix_editora).toFixed(2)}`]);
  if (clean(pagamentosFeitos.credito_editora) > 0) metodosUsados.push([`Cartão Crédito (Editora) ${pagamentosFeitos.parcelas}x`, `R$ ${clean(pagamentosFeitos.credito_editora).toFixed(2)}`]);
  if (clean(pagamentosFeitos.debito_editora) > 0) metodosUsados.push(['Cartão Débito (Editora)', `R$ ${clean(pagamentosFeitos.debito_editora).toFixed(2)}`]);
  if (clean(pagamentosFeitos.credito_aluno) > 0) metodosUsados.push(['Saldo Virtual Usado', `R$ ${clean(pagamentosFeitos.credito_aluno).toFixed(2)}`]);

  const totalRecebidoSomado = metodosUsados.reduce((acc, curr) => acc + clean(curr[1].replace('R$ ', '')), 0);
  const isParcial = totalRecebidoSomado < totalVenda && totalRecebidoSomado > 0;
  const valorPendenteFinal = Math.max(0, totalVenda - totalRecebidoSomado);

  const formasPagamentoSection = [
    [{ content: 'COMO FOI PAGO', colSpan: 2, styles: { fontStyle: 'bold', halign: 'left', textColor: [148, 163, 184], fontSize: 8 } }],
    ...metodosUsados,
    [{ content: 'TOTAL RECEBIDO:', styles: { fontStyle: 'bold', textColor: [22, 163, 74] } }, { content: `R$ ${totalRecebidoSomado.toFixed(2)}`, styles: { fontStyle: 'bold', textColor: [22, 163, 74] } }]
  ];

  if (troco > 0) {
    formasPagamentoSection.push([{ content: `TROCO (${acaoTroco === 'credito' ? 'SALDO VIRTUAL' : 'FÍSICO'}):`, styles: { fontStyle: 'bold', textColor: [217, 119, 6] } }, { content: `R$ ${troco.toFixed(2)}`, styles: { fontStyle: 'bold', textColor: [217, 119, 6] } }]);
  }

  const valoresResumo: any[] = [
    ['Subtotal:', `R$ ${subtotalCarrinho.toFixed(2)}`],
    ...(clean(acrescimosFeitos.desconto) > 0 ? [['Descontos:', `- R$ ${clean(acrescimosFeitos.desconto).toFixed(2)}`]] : []),
    ...(clean(acrescimosFeitos.multa) > 0 ? [['Multa / Juros:', `+ R$ ${clean(acrescimosFeitos.multa).toFixed(2)}`]] : []),
    ...(clean(acrescimosFeitos.juros_cartao) > 0 ? [['Juros da Máquina:', `+ R$ ${clean(acrescimosFeitos.juros_cartao).toFixed(2)}`]] : []),
    [{ content: 'Total a Pagar:', styles: { fontStyle: 'bold', textColor: [30, 41, 59], fontSize: 10 } }, { content: `R$ ${totalVenda.toFixed(2)}`, styles: { fontStyle: 'bold', textColor: [30, 41, 59], fontSize: 10 } }],
  ];

  if (isParcial) {
    valoresResumo.push([
      { content: 'Saldo Restante (Pendente):', styles: { fontStyle: 'bold', textColor: [220, 38, 38] } },
      { content: `R$ ${valorPendenteFinal.toFixed(2)}`, styles: { fontStyle: 'bold', textColor: [220, 38, 38] } }
    ]);
  }

  (autoTable as any)(doc, {
    startY: currentY, margin: { left: 14, right: 105 }, 
    body: formasPagamentoSection, theme: 'plain', styles: { fontSize: 9, cellPadding: 4, textColor: [71, 85, 105] },
    columnStyles: { 0: { cellWidth: 55 }, 1: { cellWidth: 30, halign: 'right', fontStyle: 'bold' } }
  });
  const alturaTabelaEsquerda = (doc as any).lastAutoTable.finalY;

  (autoTable as any)(doc, {
    startY: currentY, margin: { left: 105, right: 14 }, 
    body: valoresResumo, theme: 'plain', styles: { fontSize: 9, cellPadding: 4, halign: 'right', textColor: [71, 85, 105] },
    columnStyles: { 0: { cellWidth: 55 }, 1: { cellWidth: 30, fontStyle: 'bold', halign: 'right' } }
  });
  const alturaTabelaDireita = (doc as any).lastAutoTable.finalY;

  const posicaoMaisBaixa = Math.max(alturaTabelaEsquerda, alturaTabelaDireita);
  const carimboY = posicaoMaisBaixa + 18;

  doc.setLineWidth(0.4);
  if (isParcial) {
    doc.setDrawColor(220, 38, 38);
    doc.setTextColor(220, 38, 38);
    doc.roundedRect(14, carimboY, 48, 9, 1.5, 1.5, 'D'); 
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("PAGAMENTO PARCIAL", 38, carimboY + 6, { align: 'center' });
  } else {
    doc.setDrawColor(22, 163, 74);
    doc.setTextColor(22, 163, 74);
    doc.roundedRect(14, carimboY, 36, 9, 1.5, 1.5, 'D');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("QUITADO", 32, carimboY + 6, { align: 'center' });
  }

  const pageHeight = doc.internal.pageSize.height;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184); 
  doc.text("Escola ABC do Park - Documento gerado eletronicamente comprovando os lançamentos na data especificada.", 105, pageHeight - 12, { align: 'center' });

  const pdfBlob = doc.output('blob');
  const nomeArquivoBaixado = `Recibo_${(aluno?.nome || 'Avulso').replace(/\s+/g, '_')}_${dataPagamentoPDV}.pdf`;
  
  // AQUI ENTRA A TRAVA DO DOWNLOAD
  if (typeof window !== "undefined" && window.confirm("Deseja fazer o download do recibo (PDF) neste dispositivo agora?")) {
    doc.save(nomeArquivoBaixado);
  }

  const nomeArquivoStorage = `recibo_${aluno?.id || 'avulso'}_${Date.now()}.pdf`;

  try {
    const { error } = await supabase.storage.from('recibos').upload(nomeArquivoStorage, pdfBlob, {
      contentType: 'application/pdf',
      upsert: false
    });
    if (error) throw error;
    
    const { data: urlData } = supabase.storage.from('recibos').getPublicUrl(nomeArquivoStorage);
    return urlData.publicUrl;
  } catch (uploadError) {
    console.warn("Salvando apenas localmente devido a falha no upload:", uploadError);
    return null;
  }
}