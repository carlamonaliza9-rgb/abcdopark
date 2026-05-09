import { jsPDF } from "jspdf";

export const gerarPDFMatricula = async (aluno: any, resp: any, sexoAluno: "M" | "F") => {
  const doc = new jsPDF();
  const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  const logoUrl = "https://mnmakhazghgncqummksu.supabase.co/storage/v1/object/public/assets/logo.png";
  const carimboUrl = "https://mnmakhazghgncqummksu.supabase.co/storage/v1/object/public/assets/Carimbo%20Suellen.png";

  // --- LÓGICA DE SEGMENTO DE ENSINO ---
  const turmasInfantil = ["Maternal", "Jardim I", "Jardim II"];
  const segmentoEnsino = turmasInfantil.includes(aluno.turma) ? "Ensino Infantil" : "Ensino Fundamental";

  // --- MARCA D'ÁGUA ---
  try {
    doc.saveGraphicsState();
    const gState = new (doc as any).GState({ opacity: 0.05 });
    doc.setGState(gState);
    doc.addImage(logoUrl, "PNG", 30, 80, 150, 150, undefined, 'FAST'); 
    doc.restoreGraphicsState();
  } catch (e) {}

  // 1. Cabeçalho Institucional
  try { doc.addImage(logoUrl, "PNG", 20, 10, 35, 35); } catch (e) {}
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("ESCOLA ABC DO PARK", 60, 20);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("CNPJ 05.067.797-68", 60, 26);
  doc.text("CONJ PARKLANDIA - QUADRA A CASA 02", 60, 31);
  doc.text("TELEFONE (91) 3268-3484 / (91) 98622-7715", 60, 36);
  doc.text("INEP - 15159213", 60, 41);
  doc.line(20, 50, 190, 50);

  // 2. Título
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("DECLARAÇÃO DE MATRÍCULA", 105, 70, { align: "center" });

  // 3. Texto da Declaração
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  
  const artigo = sexoAluno === "F" ? "A" : "O";
  const substantivo = sexoAluno === "F" ? "aluna" : "aluno";
  const adjetivo = sexoAluno === "F" ? "matriculada" : "matriculado";
  const concordancia = sexoAluno === "F" ? "uma" : "um";
  const adjetivo2 = sexoAluno === "F" ? "assídua" : "assíduo";
  const adjetivo3 = sexoAluno === "F" ? "participativa" : "participativo";

  const texto = `Declaramos para os devidos fins de direito que ${resp.nome}, portador(a) do CPF de número ${resp.cpf} é o(a) responsável legal de ${aluno.nome}.

${artigo} ${substantivo} encontra-se regularmente ${adjetivo} neste Estabelecimento de Ensino no ano de 2026 na turma do ${aluno.turma} do ${segmentoEnsino} no turno da manhã.

É ${concordancia} ${substantivo} ${adjetivo2} e ${adjetivo3}.

Colocamo-nos à disposição para quaisquer esclarecimentos.`;

  const textoLinhas = doc.splitTextToSize(texto, 170);
  doc.text(textoLinhas, 20, 90);

  doc.text(`Belém, ${hoje}.`, 20, 160);

  // 4. Assinatura e Carimbo (Atualizado)
  doc.setFont("helvetica", "bold");
  doc.text("Atenciosamente,", 20, 185);
  
  try {
    // Carimbo PNG posicionado sobre a linha
    doc.addImage(carimboUrl, "PNG", 75, 185, 60, 30);
  } catch (e) {
    console.error("Erro ao carregar carimbo");
  }

  doc.text("__________________________________________", 105, 215, { align: "center" });
  doc.text("Suellen C. S. Figueiredo", 105, 221, { align: "center" });
  doc.setFontSize(10);
  doc.text("DIRETORA / REG. 6235", 105, 227, { align: "center" });

  doc.save(`Declaracao_${aluno.nome.replace(/\s+/g, '_')}.pdf`);
};