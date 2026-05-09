import { jsPDF } from "jspdf";

export const gerarPDFRessalva = async (aluno: any, sexoAluno: "M" | "F") => {
  const doc = new jsPDF();
  const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  
  // URLs dos Assets no Storage
  const logoUrl = "https://mnmakhazghgncqummksu.supabase.co/storage/v1/object/public/assets/logo.png";
  const carimboEscolaUrl = "https://mnmakhazghgncqummksu.supabase.co/storage/v1/object/public/assets/Carimbo%20Escola.png";
  const carimboSuellenUrl = "https://mnmakhazghgncqummksu.supabase.co/storage/v1/object/public/assets/Carimbo%20Suellen.png";

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

  if (p1Tag === "pai") nomePai = aluno.responsavel;
  if (p1Tag === "mãe") nomeMae = aluno.responsavel;
  if (p2Tag === "pai") nomePai = r2Nome;
  if (p2Tag === "mãe") nomeMae = r2Nome;

  // --- LÓGICA DE PROGRESSÃO DE TURMA ---
  const turmasSequencia = [
    "Maternal", "Jardim I", "Jardim II", 
    "1º Ano", "2º Ano", "3º Ano", "4º Ano", "5º Ano", "6º Ano"
  ];
  
  const indexAtual = turmasSequencia.findIndex(t => t.toLowerCase() === aluno.turma?.toLowerCase());
  const proximaTurma = indexAtual !== -1 && indexAtual < turmasSequencia.length - 1 
    ? turmasSequencia[indexAtual + 1] 
    : "Série Seguinte";

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

  // --- DATA E CARIMBO DA ESCOLA ---
  doc.text(`Belém, ${hoje}.`, 20, 160);
  
  try {
    // Carimbo da Escola (80x80) posicionado acima da data para destaque
    doc.addImage(carimboEscolaUrl, "PNG", 120, 125, 80, 80);
  } catch (e) {
    console.error("Erro ao carregar carimbo da escola");
  }

  // 4. Assinatura e Carimbo Direção
  doc.setFont("helvetica", "bold");
  try { 
    doc.addImage(carimboSuellenUrl, "PNG", 75, 185, 60, 30); 
  } catch (e) {
    console.error("Erro ao carregar o carimbo da direção");
  }

  doc.text("__________________________________________", 105, 215, { align: "center" });
  doc.text("Suellen C. S. Figueiredo", 105, 221, { align: "center" });
  doc.setFontSize(10);
  doc.text("DIRETORA / REG. 6235", 105, 227, { align: "center" });

  doc.save(`Ressalva_${aluno.nome.replace(/\s+/g, '_')}.pdf`);
};