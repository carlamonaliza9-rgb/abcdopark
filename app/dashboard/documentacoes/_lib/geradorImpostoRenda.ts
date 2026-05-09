import { jsPDF } from "jspdf";

// Função interna para converter valores para extenso (Limite de escopo escolar)
function escreverValorPorExtenso(valor: number): string {
  const unidades = ["", "Um", "Dois", "Três", "Quatro", "Cinco", "Seis", "Sete", "Oito", "Nove"];
  const especiais = ["Dez", "Onze", "Doze", "Treze", "Quatorze", "Quinze", "Dezesseis", "Dezessete", "Dezoito", "Dezenove"];
  const dezenas = ["", "Dez", "Vinte", "Trinta", "Quarenta", "Cinquenta", "Sessenta", "Setenta", "Oitenta", "Noventa"];
  const centenas = ["", "Cento", "Duzentos", "Trezentos", "Quatrocentos", "Quinhentos", "Seiscentos", "Setecentos", "Oitocentos", "Novecentos"];

  if (valor === 0) return "Zero Reais";
  if (valor === 100) return "Cem Reais";

  let extenso = "";

  const milhares = Math.floor(valor / 1000);
  const restoMilhar = valor % 1000;
  const cem = Math.floor(restoMilhar / 100);
  const restoCento = restoMilhar % 100;
  const dez = Math.floor(restoCento / 10);
  const uni = restoCento % 10;

  if (milhares > 0) {
    extenso += (milhares === 1 ? "Mil" : unidades[milhares] + " Mil");
    if (restoMilhar > 0) extenso += (restoMilhar < 100 || restoMilhar % 100 === 0 ? " e " : " ");
  }

  if (cem > 0) {
    extenso += centenas[cem];
    if (restoCento > 0) extenso += " e ";
  }

  if (dez === 1) {
    extenso += especiais[uni];
  } else {
    if (dez > 1) {
      extenso += dezenas[dez];
      if (uni > 0) extenso += " e ";
    }
    if (uni > 0 || extenso === "") {
      extenso += unidades[uni];
    }
  }

  return extenso + (valor === 1 ? " Real" : " Reais");
}

export const gerarPDFImpostoRenda = async (
  aluno: any, 
  resp: any, 
  valorMensalidade: number, 
  mesesPagos: number,
  anoBase: string
) => {
  const doc = new jsPDF();
  const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  const logoUrl = "https://mnmakhazghgncqummksu.supabase.co/storage/v1/object/public/assets/logo.png";
  const carimboUrl = "https://mnmakhazghgncqummksu.supabase.co/storage/v1/object/public/assets/Carimbo%20Suellen.png";
  
  // Cálculos automáticos
  const valorTotal = valorMensalidade * mesesPagos;
  const valorFormatado = valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  const mensalidadeFormatada = valorMensalidade.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  const valorExtenso = escreverValorPorExtenso(Math.floor(valorTotal));

  // --- MARCA D'ÁGUA (LOGO CENTRALIZADA P&B) ---
  try {
    doc.saveGraphicsState();
    const gState = new (doc as any).GState({ opacity: 0.05 });
    doc.setGState(gState);
    doc.addImage(logoUrl, "PNG", 30, 80, 150, 150, undefined, 'FAST'); 
    doc.restoreGraphicsState();
  } catch (e) {}

  // 1. Cabeçalho Institucional
  try { 
    doc.addImage(logoUrl, "PNG", 20, 10, 35, 35); 
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

  // 2. Título
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("DECLARAÇÃO DE QUITAÇÃO PARA IMPOSTO DE RENDA", 105, 65, { align: "center" });
  doc.text(`ANO BASE ${anoBase}`, 105, 72, { align: "center" });

  // 3. Texto da Declaração com Valor por Extenso
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  
  const texto = `Declaramos para fins de Imposto de Renda que o(a) senhor(a) ${resp.nome}, portador(a) do CPF de número ${resp.cpf} é o(a) responsável financeiro(a) do(a) aluno(a) ${aluno.nome}, ele(a) efetuou o pagamento das mensalidades de R$ ${mensalidadeFormatada} totalizando o valor de R$ ${valorFormatado} (${valorExtenso}).

Valor da Mensalidade: R$ ${mensalidadeFormatada}
Quantidade de mensalidades pagas: ${mesesPagos} Meses`;

  const textoLinhas = doc.splitTextToSize(texto, 170);
  doc.text(textoLinhas, 20, 90);

  doc.text(`Belém, ${hoje}`, 20, 150);

  // 4. Assinatura e Carimbo (Atualizado)
  doc.setFont("helvetica", "bold");
  try { 
    // Carimbo PNG transparente posicionado sobre a linha
    doc.addImage(carimboUrl, "PNG", 75, 170, 60, 30); 
  } catch (e) {
    console.error("Erro ao carregar o carimbo");
  }

  doc.text("__________________________________________", 105, 200, { align: "center" });
  doc.text("Suellen C. S. Figueiredo", 105, 206, { align: "center" });
  doc.setFontSize(10);
  doc.text("DIRETORA / REG. 6235", 105, 212, { align: "center" });

  doc.save(`Quitacao_IR_${anoBase}_${aluno.nome.replace(/\s+/g, '_')}.pdf`);
};