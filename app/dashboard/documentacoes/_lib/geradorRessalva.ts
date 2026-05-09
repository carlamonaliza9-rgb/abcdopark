import { jsPDF } from "jspdf";

export const gerarPDFRessalva = async (aluno: any, sexoAluno: "M" | "F") => {
  const doc = new jsPDF();
  const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  const logoUrl = "https://mnmakhazghgncqummksu.supabase.co/storage/v1/object/public/assets/logo.png";

  // --- FORMATAÇÃO DA DATA DE NASCIMENTO ---
  const formatarData = (dataString: string) => {
    if (!dataString) return '___/___/___';
    try {
      const data = new Date(dataString);
      return new Date(data.getTime() + data.getTimezoneOffset() * 60000).toLocaleDateString('pt-BR');
    } catch (e) {
      return dataString;
    }
  };

  const dataNascimentoFormatada = formatarData(aluno.data_nascimento);

  // --- LÓGICA DE FILIAÇÃO POR TAGS ---
  let nomePai = "_________";
  let nomeMae = "_________";

  const p1Tag = aluno.parentesco_1?.toLowerCase() || "";
  const p2Tag = (aluno.parentesco_2 || aluno.parentesco2)?.toLowerCase() || "";
  const r2Nome = aluno.responsavel2 || aluno.responsavel_2_nome;

  // Verifica Responsável 1
  if (p1Tag === "pai") nomePai = aluno.responsavel;
  if (p1Tag === "mãe") nomeMae = aluno.responsavel;

  // Verifica Responsável 2
  if (p2Tag === "pai") nomePai = r2Nome;
  if (p2Tag === "mãe") nomeMae = r2Nome;

  // --- LÓGICA DE PROGRESSÃO DE TURMA (ORDEM AJUSTADA) ---
  const turmasSequencia = [
    "Maternal", 
    "Jardim I", 
    "Jardim II", 
    "1º Ano", 
    "2º Ano", 
    "3º Ano", 
    "4º Ano", 
    "5º Ano", 
    "6º Ano"
  ];
  
  // Encontra a posição da turma atual para definir a próxima
  const indexAtual = turmasSequencia.findIndex(t => t.toLowerCase() === aluno.turma?.toLowerCase());
  
  const proximaTurma = indexAtual !== -1 && indexAtual < turmasSequencia.length - 1 
    ? turmasSequencia[indexAtual + 1] 
    : "Série Seguinte";

  // Define segmento baseado na PRÓXIMA turma
  const turmasInfantil = ["Maternal", "Jardim I", "Jardim II"];
  const segmentoEnsino = turmasInfantil.includes(proximaTurma) ? "Ensino Infantil" : "Ensino Fundamental";

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
  doc.text("RESSALVA", 105, 70, { align: "center" });

  // 3. Texto da Ressalva
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  
  const artigoSubst = sexoAluno === "F" ? "da aluna" : "do aluno";
  const nascido = sexoAluno === "F" ? "Nascida" : "Nascido";
  const filho = sexoAluno === "F" ? "filha" : "filho";

  const texto = `Atestamos para os devidos fins de direito, que deu entrada na secretaria deste Estabelecimento de Ensino, o pedido de TRANSFERÊNCIA ${artigoSubst} ${aluno.nome}, ${nascido} no dia ${dataNascimentoFormatada}, ${filho} de ${nomePai} e ${nomeMae}, a qual tem o direito a matricular-se no ${proximaTurma} do ${segmentoEnsino}.

Seu documento será expedido no prazo de 45 dias a contar desta data.`;

  const textoLinhas = doc.splitTextToSize(texto, 170);
  doc.text(textoLinhas, 20, 90);

  doc.text(`Belém, ${hoje}.`, 20, 150);

  // 4. Assinatura e Carimbo
  doc.setFont("helvetica", "bold");
  try { doc.addImage("/icon.jpg", "JPEG", 75, 175, 60, 30); } catch (e) {}
  doc.text("__________________________________________", 105, 210, { align: "center" });
  doc.text("Suellen C. S. Figueiredo", 105, 216, { align: "center" });
  doc.setFontSize(10);
  doc.text("DIRETORA / REG. 6235", 105, 222, { align: "center" });

  doc.save(`Ressalva_${aluno.nome.replace(/\s+/g, '_')}.pdf`);
};