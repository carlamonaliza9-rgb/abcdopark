import { jsPDF } from "jspdf";

export interface Prova {
  materia: string;
  data: string;
  conteudo: string;
}

// Helper para converter data DD/MM/AAAA para timestamp (usado na ordenação)
const parseDataParaOrdem = (dataStr: string) => {
  const [dia, mes, ano] = dataStr.split('/');
  if (!dia || !mes || !ano) return 0;
  return new Date(Number(ano), Number(mes) - 1, Number(dia)).getTime();
};

// Helper para obter o dia da semana
const obterDiaSemana = (dataStr: string) => {
  const [dia, mes, ano] = dataStr.split('/');
  if (!dia || !mes || !ano) return "";
  const data = new Date(Number(ano), Number(mes) - 1, Number(dia));
  const dias = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
  return dias[data.getDay()];
};

/**
 * FUNÇÃO NOVA: Retorna as matérias padrão baseadas na turma
 */
export const obterMateriasPadrao = (turma: string): Prova[] => {
  const turmasInfantil = ["Maternal", "Jardim I", "Jardim II"];
  const materiasInfantil = ["Linguagem", "Matemática", "Natureza e Sociedade", "Artes"];
  const materiasFundamental = ["Língua Portuguesa", "Matemática", "Ciências", "História", "Geografia", "Artes", "Inglês"];
  
  const lista = turmasInfantil.includes(turma) ? materiasInfantil : materiasFundamental;
  
  return lista.map(materia => ({
    materia,
    data: "",
    conteudo: ""
  }));
};

/**
 * 1. GERADOR PARA WHATSAPP
 */
export const gerarTextoWhatsAppProvas = (turma: string, provas: Prova[]): string => {
  // Ordenar cronologicamente
  const provasOrdenadas = [...provas].sort((a, b) => parseDataParaOrdem(a.data) - parseDataParaOrdem(b.data));

  let texto = `🏫 *ESCOLA ABC DO PARK*\n`;
  texto += `📅 *CRONOGRAMA DE PROVAS - ${turma.toUpperCase()}*\n\n`;
  texto += `Olá, senhores pais, responsáveis e alunos!\n`;
  texto += `Fiquem atentos às datas e conteúdos das próximas avaliações:\n\n`;

  provasOrdenadas.forEach((prova) => {
    const diaSemana = obterDiaSemana(prova.data);
    texto += `📚 *${prova.materia.toUpperCase()}*\n`;
    texto += `🗓️ *Data:* ${prova.data} ${diaSemana ? `(${diaSemana})` : ''}\n`;
    texto += `📝 *Conteúdo:* \n${prova.conteudo}\n`;
    texto += `────────────────────\n\n`;
  });

  texto += `💪 *Bons estudos! Estamos torcendo pelo sucesso de cada um!*`;
  return texto;
};

/**
 * 2. GERADOR PARA PDF
 */
export const gerarPDFCronogramaProvas = async (
  turma: string, 
  provas: Prova[], 
  tituloAvaliacao: string = "1ª AVALIAÇÃO", 
  nomeProfessora: string = ""
) => {
  // Ordenar cronologicamente
  const provasOrdenadas = [...provas].sort((a, b) => parseDataParaOrdem(a.data) - parseDataParaOrdem(b.data));

  const doc = new jsPDF();
  
  const logoUrl = "https://mnmakhazghgncqummksu.supabase.co/storage/v1/object/public/assets/logo.png";

  const turmasInfantil = ["Maternal", "Jardim I", "Jardim II"];
  const segmentoEnsino = turmasInfantil.includes(turma) ? "EDUCAÇÃO INFANTIL" : "ENSINO FUNDAMENTAL";

  let y = 0;

  const renderizarEstruturaBase = () => {
    // Marca d'água
    try {
      doc.saveGraphicsState();
      const gState = new (doc as any).GState({ opacity: 0.05 });
      doc.setGState(gState);
      doc.addImage(logoUrl, "PNG", 30, 80, 150, 150, undefined, 'FAST'); 
      doc.restoreGraphicsState();
    } catch (e) {}

    // Cabeçalho da Escola
    try { 
      doc.addImage(logoUrl, "PNG", 20, 15, 25, 25); 
    } catch (e) {}

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`CALENDÁRIO DA ${tituloAvaliacao.toUpperCase()} DA ${segmentoEnsino}`, 50, 23);
    
    doc.setTextColor(180, 0, 0); // Cor vermelha para a turma
    doc.setFontSize(12);
    doc.text(`${turma.toUpperCase()}`, 50, 30);
    doc.setTextColor(0, 0, 0); // Resetar cor

    if (nomeProfessora) {
      doc.setFontSize(10);
      doc.text(`PROFESSORA: ${nomeProfessora.toUpperCase()}`, 50, 36);
    }
  };

  renderizarEstruturaBase();
  y = 50;

  // --- PARTE 1: RESUMO DO CRONOGRAMA ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  
  provasOrdenadas.forEach((prova) => {
    const diaSemana = obterDiaSemana(prova.data);
    const dataStr = prova.data ? prova.data : "___/___/___";
    const diaStr = diaSemana ? diaSemana : "________";
    
    // Substituído o símbolo especial por um asterisco normal para evitar erro de encoding
    doc.text(`* ${dataStr} - ${diaStr} - ${prova.materia.toUpperCase()}`, 40, y);
    y += 6;
  });

  y += 8;

  // --- PARTE 2: CONTEÚDOS DETALHADOS ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("CONTEÚDOS", 20, y);
  y += 10;

  provasOrdenadas.forEach((prova) => {
    if (y > 250) {
      doc.addPage();
      renderizarEstruturaBase();
      y = 50; 
    }

    doc.setTextColor(180, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    
    const diaSemana = obterDiaSemana(prova.data);
    const dataStr = prova.data ? prova.data : "___/___/___";
    const diaStr = diaSemana ? diaSemana : "________";
    
    // Substituído o símbolo especial por um sinal de +
    doc.text(`+ ${dataStr} - ${diaStr} - ${prova.materia.toUpperCase()}`, 25, y);
    doc.setTextColor(0, 0, 0); 
    
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    
    // Evita bug caso o conteúdo esteja vazio
    const conteudoSeguro = prova.conteudo || "Conteúdo não informado.";
    const linhasDoTextarea = conteudoSeguro.split('\n');
    
    linhasDoTextarea.forEach(linha => {
      const linhasAjustadas = doc.splitTextToSize(linha, 150);
      
      linhasAjustadas.forEach((textoLinha: string) => {
        if (y > 270) {
          doc.addPage();
          renderizarEstruturaBase();
          y = 50;
        }
        // Substituído o símbolo de seta por um travessão padrao
        doc.text(`-  ${textoLinha}`, 35, y);
        y += 5;
      });
    });

    y += 5; 
  });

  // ASSINATURAS REMOVIDAS DAQUI!

  const nomeArquivo = `Cronograma_${tituloAvaliacao.replace(/\s+/g, '_')}_${turma.replace(/\s+/g, '_')}.pdf`;
  doc.save(nomeArquivo);
};