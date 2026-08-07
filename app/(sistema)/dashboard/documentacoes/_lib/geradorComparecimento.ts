import { jsPDF } from "jspdf";

export const gerarPDFComparecimento = async (resp: any, horaInicio: string, horaFim: string, motivo: string) => {
  const doc = new jsPDF();
  const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  
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

  // 1. Cabeçalho Institucional
  try { 
    doc.addImage(logoUrl, "PNG", 20, 10, 35, 35); 
  } catch (e) {}

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("ESCOLA ABC DO PARK", 60, 20);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("CNPJ 05.067.797/0001-68", 60, 26);
  doc.text("CONJ PARKLANDIA - QUADRA A CASA 02", 60, 31);
  doc.text("TELEFONE (91) 3268-3484 / (91) 98622-7715", 60, 36);
  doc.text("INEP - 15159213", 60, 41);
  doc.line(20, 50, 190, 50);

  // 2. Título
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("DECLARAÇÃO DE COMPARECIMENTO", 105, 70, { align: "center" });

  // 3. Texto da Declaração
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  
  const texto = `Declaramos a quem possa interessar que ${resp.nome} portador(a) do CPF: ${resp.cpf} compareceu, nesta data, nesta instituição ESCOLA ABC DO PARK, permanecendo das ${horaInicio} às ${horaFim}, em razão do(a) ${motivo}.

Sem mais no momento.`;

  const textoLinhas = doc.splitTextToSize(texto, 170);
  doc.text(textoLinhas, 20, 90);

  // --- DATA E CARIMBO DA ESCOLA ---
  doc.text(`Belém, ${hoje}`, 20, 160);
  
  try {
    doc.addImage(carimboEscolaUrl, "PNG", 120, 125, 80, 80);
  } catch (e) {}

  // 4. Assinatura e Carimbo Direção
  doc.setFont("helvetica", "bold");
  doc.text("Atenciosamente,", 20, 185);
  
  try {
    doc.addImage(carimboSuellenUrl, "PNG", 75, 185, 60, 30);
  } catch (e) {}

  doc.text("__________________________________________", 105, 215, { align: "center" });
  doc.text("Suellen C. S. Figueiredo", 105, 221, { align: "center" });
  doc.setFontSize(10);
  doc.text("DIRETORA / REG. 6235", 105, 227, { align: "center" });

  doc.save(`Declaracao_Comparecimento_${resp.nome.replace(/\s+/g, '_')}.pdf`);
};