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
  doc.text("ESCOLA ABC DO PARK", 42, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("CNPJ: 00.000.000/0001-00", 42, 23);
  doc.text("Rua Fictícia, 123 - Bairro - Belém/PA", 42, 27);
  doc.text("Telefone: (91) 90000-0000", 42, 31);

  doc.setFillColor(238, 242, 255); 
  doc.roundedRect(135, 12, 60, 24, 2, 2, 'F');

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(67, 56, 202); 
  doc.text("RECIBO DE PAGAMENTO", 165, 18, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Nº: ${reciboNum}`, 165, 23, { align: "center" });
  doc.text(`Referência: ${dataPagamentoPDV.split('-').reverse().join('/')}`, 165, 28, { align: "center" });
  doc.text(`Emissão: ${dataHoraEmissao.toLocaleTimeString('pt-BR')}`, 165, 33, { align: "center" });

  doc.setDrawColor(226, 232, 240);
  doc.line(14, 40, 196, 40);

  // Tipagem forçada com as any para silenciar o TypeScript
  (autoTable as any)(doc, {
    startY: 44,
    body: [
      [
        { content: `ALUNO(A):\n${aluno.nome.toUpperCase()}`, styles: { fontStyle: 'bold' } },
        { content: `TURMA:\n${aluno.turma?.toUpperCase() || 'NÃO DEFINIDA'}`, styles: { fontStyle: 'bold' } },
        { content: `DOC / CPF:\n${aluno.cpf_aluno || aluno.cpf_responsavel || 'NÃO INFORMADO'}`, styles: { fontStyle: 'bold' } }
      ]
    ],
    theme: 'plain',
    styles: { fontSize: 8.5, cellPadding: 4, textColor: [51, 71, 85], fillColor: [248, 250, 252] } 
  });

  const tableRows = itensCarrinho.map((item: any) => {
    const saldoDevedorAnterior = clean(item.valor_total) - clean(item.valor_pago);
    return [
      (item.tipo || 'Lançamento').toUpperCase(),
      item.descricao.toUpperCase(),
      `R$ ${clean(item.valor_total).toFixed(2)}`,
      `R$ ${saldoDevedorAnterior.toFixed(2)}`
    ];
  });

  (autoTable as any)(doc, {
    startY: (doc as any).lastAutoTable.finalY + 4,
    head: [['TIPO', 'DESCRIÇÃO DO ITEM', 'VALOR ORIGINAL', 'PENDENTE ANTERIOR']],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [67, 56, 202], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 }, 
    styles: { fontSize: 8, cellPadding: 4, textColor: [51, 65, 85], lineColor: [226, 232, 240], lineWidth: 0.1 },
    columnStyles: { 0: { cellWidth: 35 }, 2: { halign: 'right', cellWidth: 30 }, 3: { halign: 'right', fontStyle: 'bold', textColor: [153, 27, 27], cellWidth: 35 } }
  });

  const baseDasTabelasY = (doc as any).lastAutoTable.finalY + 8;

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

  const valoresResumo = [
    ['SUBTOTAL:', `R$ ${subtotalCarrinho.toFixed(2)}`],
    ...(clean(acrescimosFeitos.desconto) > 0 ? [['DESCONTOS:', `- R$ ${clean(acrescimosFeitos.desconto).toFixed(2)}`]] : []),
    ...(clean(acrescimosFeitos.multa) > 0 ? [['MULTA / JUROS:', `+ R$ ${clean(acrescimosFeitos.multa).toFixed(2)}`]] : []),
    ...(clean(acrescimosFeitos.juros_cartao) > 0 ? [['JUROS MÁQUINA:', `+ R$ ${clean(acrescimosFeitos.juros_cartao).toFixed(2)}`]] : []),
    [{ content: 'TOTAL A PAGAR:', styles: { fontStyle: 'bold', textColor: [15, 23, 42] } }, { content: `R$ ${totalVenda.toFixed(2)}`, styles: { fontStyle: 'bold', textColor: [15, 23, 42] } }],
  ];

  const formasPagamentoSection = [
    [{ content: 'FORMAS DE PAGAMENTO', colSpan: 2, styles: { fontStyle: 'bold', halign: 'left', fillColor: [248, 250, 252], textColor: [71, 85, 105] } }],
    ...metodosUsados,
    [{ content: 'TOTAL PAGO HOJE:', styles: { fontStyle: 'bold', textColor: [22, 163, 74] } }, { content: `R$ ${totalRecebidoSomado.toFixed(2)}`, styles: { fontStyle: 'bold', textColor: [22, 163, 74] } }]
  ];

  if (troco > 0) {
    formasPagamentoSection.push([{ content: `TROCO (${acaoTroco === 'credito' ? 'SALDO VIRTUAL' : 'FÍSICO'}):`, styles: { fontStyle: 'bold', textColor: [217, 119, 6] } }, { content: `R$ ${troco.toFixed(2)}`, styles: { fontStyle: 'bold', textColor: [217, 119, 6] } }]);
  }

  // Tabela da Esquerda (Pagamentos)
  (autoTable as any)(doc, {
    startY: baseDasTabelasY, margin: { left: 14, right: 105 }, 
    body: formasPagamentoSection, theme: 'plain', styles: { fontSize: 8.5, cellPadding: 3, textColor: [71, 85, 105] },
    columnStyles: { 0: { cellWidth: 55 }, 1: { cellWidth: 30, halign: 'right', fontStyle: 'bold' } }
  });
  const alturaTabelaEsquerda = (doc as any).lastAutoTable.finalY;

  // Tabela da Direita (Resumo)
  (autoTable as any)(doc, {
    startY: baseDasTabelasY, margin: { left: 105, right: 14 }, 
    body: valoresResumo, theme: 'plain', styles: { fontSize: 8.5, cellPadding: 3, halign: 'right', textColor: [71, 85, 105] },
    columnStyles: { 0: { cellWidth: 55 }, 1: { cellWidth: 30, fontStyle: 'bold', halign: 'right' } }
  });
  const alturaTabelaDireita = (doc as any).lastAutoTable.finalY;

  // 🛡️ CORREÇÃO: Descobre qual tabela ficou mais longa para posicionar o carimbo com segurança
  const posicaoMaisBaixa = Math.max(alturaTabelaEsquerda, alturaTabelaDireita);
  
  // Posiciona o Carimbo 15px ABAIXO da tabela mais longa
  const carimboY = posicaoMaisBaixa + 15;

  if (isParcial) {
    doc.setFillColor(254, 242, 242); 
    doc.roundedRect(80, carimboY, 50, 10, 2, 2, 'F');
    doc.setTextColor(220, 38, 38);
    doc.setFont("helvetica", "bold");
    doc.text("PAGAMENTO PARCIAL", 105, carimboY + 6.5, { align: 'center' });
  } else {
    doc.setFillColor(240, 253, 244); 
    doc.roundedRect(80, carimboY, 50, 10, 2, 2, 'F');
    doc.setTextColor(22, 163, 74);
    doc.setFont("helvetica", "bold");
    doc.text("QUITADO", 105, carimboY + 6.5, { align: 'center' });
  }

  // Posiciona as assinaturas 25px ABAIXO do carimbo
  const assinaturasY = carimboY + 25;
  doc.setDrawColor(203, 213, 225);
  doc.line(20, assinaturasY, 80, assinaturasY);
  doc.line(130, assinaturasY, 190, assinaturasY);
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("Tesouraria / Escola ABC do Park", 50, assinaturasY + 5, { align: 'center' });
  doc.text("Assinatura do Responsável", 160, assinaturasY + 5, { align: 'center' });

  // Rodapé da página
  const pageHeight = doc.internal.pageSize.height;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text("Documento gerado eletronicamente. Confirma a quitação parcial ou integral dos valores especificados nesta data.", 105, pageHeight - 12, { align: 'center' });

  // Download Imediato
  const pdfBlob = doc.output('blob');
  const nomeArquivoBaixado = `Recibo_${aluno.nome.replace(/\s+/g, '_')}_${dataPagamentoPDV}.pdf`;
  doc.save(nomeArquivoBaixado);

  // Upload em Background
  const nomeArquivoStorage = `recibo_${aluno.id}_${Date.now()}.pdf`;

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