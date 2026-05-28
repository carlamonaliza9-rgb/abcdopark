import { jsPDF } from "jspdf";

// Função interna para formatar valores no padrão brasileiro (R$)
const formatarMoeda = (valor: number) => {
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Tipagem de dados esperados da interface (Interface UI)
export interface DadosNotificacaoExtrajudicial {
  nomeResponsavel: string;
  cpfResponsavel: string;
  enderecoResponsavel: string;
  dataReferencia: string;
  valorPago: number;
  multa: number;
  desconto: number;
  itens: { descricao: string; valor: number }[];
  prazoDias: string;
  cidadeData: string;
}

export const gerarNotificacaoExtrajudicial = async (dados: DadosNotificacaoExtrajudicial) => {
  const doc = new jsPDF();
  
  // URLs dos Assets no Storage
  const logoUrl = "https://mnmakhazghgncqummksu.supabase.co/storage/v1/object/public/assets/logo.png";
  const carimboEscolaUrl = "https://mnmakhazghgncqummksu.supabase.co/storage/v1/object/public/assets/Carimbo%20Escola.png";
  const carimboSuellenUrl = "https://mnmakhazghgncqummksu.supabase.co/storage/v1/object/public/assets/Carimbo%20Suellen.png";
  
  // --- MARCA D'ÁGUA ---
  try {
    doc.saveGraphicsState();
    const gState = new (doc as any).GState({ opacity: 0.05 });
    doc.setGState(gState);
    doc.addImage(logoUrl, "PNG", 30, 80, 150, 150, undefined, 'FAST'); 
    doc.restoreGraphicsState();
  } catch (e) {}

  // 1. Cabeçalho Institucional Padrão ABC do Park
  try { 
    doc.addImage(logoUrl, "PNG", 20, 10, 35, 35); 
  } catch (e) {}

    try {
    doc.addImage(carimboEscolaUrl, "PNG", 120, - 23, 80, 80);
  } catch (e) {}

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("ESCOLA ABC DO PARK", 60, 20);
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("CNPJ 05.067.797-68", 60, 26);
  doc.text("CONJ PARKLANDIA - QUADRA A CASA 02", 60, 31);
  doc.text("TELEFONE (91) 3268-3484 / (91) 98622-7715", 60, 36);
  doc.text("INEP - 15159213", 60, 41);

  doc.setLineWidth(0.5);
  doc.line(20, 50, 190, 50);

  // 2. Título da Notificação (Fiel ao Modelo)
  let y = 60;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("NOTIFICAÇÃO EXTRAJUDICIAL", 20, y);
  
  y += 6;
  doc.setFontSize(10);
  doc.text("Por Itens e Serviços Prestados e Não Pagos – Saldo Devedor", 20, y);

  y += 8;
  doc.setFont("helvetica", "bold");
  doc.text("Notificante:", 20, y);
  doc.setFont("helvetica", "normal");
  doc.text("Escola ABC do Park", 43, y);

  y += 5;
  doc.setFont("helvetica", "bold");
  doc.text("CNPJ:", 20, y);
  doc.setFont("helvetica", "normal");
  doc.text("05.067.797/0001-68", 32, y);

  y += 5;
  doc.setFont("helvetica", "bold");
  doc.text("Endereço:", 20, y);
  doc.setFont("helvetica", "normal");
  doc.text("Conj. Parklandia - Quadra A Casa 02, Belém - PA", 39, y);

  y += 5;
  doc.setFont("helvetica", "bold");
  doc.text("Telefone:", 20, y);
  doc.setFont("helvetica", "normal");
  doc.text("(91) 3268-3484 / (91) 98622-7715", 37, y);

  // 3. Dados do Notificado (Responsável)
  y += 10;
  doc.setFont("helvetica", "bold");
  doc.text("Notificada:", 20, y);
  doc.setFont("helvetica", "normal");
  doc.text(dados.nomeResponsavel || "NÃO INFORMADO", 41, y);

  y += 5;
  doc.setFont("helvetica", "bold");
  doc.text("CPF:", 20, y);
  doc.setFont("helvetica", "normal");
  doc.text(dados.cpfResponsavel || "NÃO INFORMADO", 29, y);

  y += 5;
  doc.setFont("helvetica", "bold");
  doc.text("Endereço:", 20, y);
  doc.setFont("helvetica", "normal");
  doc.text(dados.enderecoResponsavel || "Endereço não cadastrado", 39, y);

  // 4. Assunto
  y += 10;
  doc.setFont("helvetica", "bold");
  doc.text("Assunto:", 20, y);
  doc.setFont("helvetica", "normal");
  doc.text("Notificação de cobrança por inadimplemento contratual", 37, y);

  y += 6;
  doc.setLineWidth(0.2);
  doc.line(20, y, 190, y);

  // 5. Saudação e Corpo do Texto
  y += 12;
  doc.setFont("helvetica", "normal");
  doc.text(`Prezado(a) Sr(a). ${dados.nomeResponsavel || "Responsável"},`, 20, y);

  y += 10;
  
  let textoBaseCorpo = `Na qualidade de prestador dos serviços educacionais contratados por V.Sa., venho, por meio desta NOTIFICAÇÃO EXTRAJUDICIAL, informar que, até a presente data, consta em aberto o saldo devedor referente aos itens fornecidos`;
  if (dados.dataReferencia) {
    textoBaseCorpo += ` na data ou período de ${dados.dataReferencia}`;
  }
  textoBaseCorpo += `, conforme a discriminação abaixo:`;

  const linhasCorpo = doc.splitTextToSize(textoBaseCorpo, 170);
  doc.text(linhasCorpo, 20, y);
  y += (linhasCorpo.length * 5) + 3;

  // 6. Lista de Itens Dinâmica (Com quebra de página automática se a lista for gigante)
  dados.itens.forEach((item) => {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.text(`•   ${item.descricao}: R$ ${formatarMoeda(item.valor)}`, 30, y);
    y += 5;
  });

  // 7. Cálculos de Totais (Com acréscimos e abatimentos)
  const totalItens = dados.itens.reduce((acc, curr) => acc + curr.valor, 0);
  const saldoDevedor = (totalItens + dados.multa) - dados.valorPago - dados.desconto;

  if (y > 240) { doc.addPage(); y = 20; }
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.text(`Total dos itens: R$ ${formatarMoeda(totalItens)}`, 20, y);
  
  y += 5;
  doc.setTextColor(0, 0, 128);
  doc.text(`Valor parcial já pago: - R$ ${formatarMoeda(dados.valorPago)}`, 20, y);

  if (dados.multa > 0) {
    y += 5;
    doc.setTextColor(255, 0, 0);
    doc.text(`Multa/Juros incidentes: + R$ ${formatarMoeda(dados.multa)}`, 20, y);
  }
  
  if (dados.desconto > 0) {
    y += 5;
    doc.setTextColor(0, 128, 0);
    doc.text(`Desconto concedido: - R$ ${formatarMoeda(dados.desconto)}`, 20, y);
  }
  
  y += 6;
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`SALDO DEVEDOR ATUALIZADO: R$ ${formatarMoeda(saldoDevedor)}`, 20, y);

  // 8. Encerramento e Prazos
  y += 12;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const textoEncerramento1 = `Solicitamos que o valor restante de R$ ${formatarMoeda(saldoDevedor)} seja quitado no prazo de ${dados.prazoDias} dias corridos, contados a partir do recebimento desta notificação.`;
  const linhasEncerramento1 = doc.splitTextToSize(textoEncerramento1, 170);
  doc.text(linhasEncerramento1, 20, y);
  y += (linhasEncerramento1.length * 5) + 2;

  const textoEncerramento2 = `O não pagamento poderá resultar na adoção das medidas legais cabíveis, incluindo protesto em cartório, inclusão em órgãos de proteção ao crédito e ação judicial para cobrança do débito com os acréscimos legais.`;
  const linhasEncerramento2 = doc.splitTextToSize(textoEncerramento2, 170);
  doc.text(linhasEncerramento2, 20, y);
  y += (linhasEncerramento2.length * 5) + 5;

  // 9. Informações de Pagamento (Chave Pix da Escola)
  if (y > 270) { doc.addPage(); y = 20; }
  doc.setFont("helvetica", "bold");
  doc.text("Chave Pix para pagamento: 05.067.797/0001-68", 20, y);

  y += 8;
  doc.setLineWidth(0.2);
  doc.line(20, y, 190, y);

  // 10. Data, Assinatura e Carimbos Oficiais (Padrão ABC)
  y += 15;
  if (y > 220) { doc.addPage(); y = 20; }
  
  doc.setFont("helvetica", "bold");
  doc.text(dados.cidadeData, 20, y);

  y += 12;
  try { 
    doc.addImage(carimboSuellenUrl, "PNG", 82, y - 7, 45, 27); 
  } catch (e) {}

  y += 15;
  doc.text("_______________________________________", 105, y, { align: "center" });
  doc.text("Suellen C. S. Figueiredo", 105, y + 5, { align: "center" });
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.text("DIRETORA / REG. 6235", 105, y + 10, { align: "center" });

  const nomeArquivo = dados.nomeResponsavel ? dados.nomeResponsavel.replace(/\s+/g, '_') : 'Responsavel';
  doc.save(`Notificacao_Extrajudicial_${nomeArquivo}.pdf`);
};