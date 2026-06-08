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

// Helper interno para quebrar linhas de texto no Canvas de forma precisa
const quebrarTextoCanvas = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
  const palavras = text.split(' ');
  const linhas: string[] = [];
  let linhaAtual = '';

  for (let i = 0; i < palavras.length; i++) {
    const testeLinha = linhaAtual + (linhaAtual ? ' ' : '') + palavras[i];
    const metricas = ctx.measureText(testeLinha);
    if (metricas.width > maxWidth && i > 0) {
      linhas.push(linhaAtual);
      linhaAtual = palavras[i];
    } else {
      linhaAtual = testeLinha;
    }
  }
  if (linhaAtual) linhas.push(linhaAtual);
  return linhas;
};

/**
 * RETORNA AS MATÉRIAS PADRÃO BASEADAS NA TURMA
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
 * (Agora inclui o título da avaliação dinamicamente)
 */
export const gerarTextoWhatsAppProvas = (
  turma: string, 
  provas: Prova[],
  tituloAvaliacao: string = "1ª AVALIAÇÃO"
): string => {
  const provasOrdenadas = [...provas].sort((a, b) => parseDataParaOrdem(a.data) - parseDataParaOrdem(b.data));

  let texto = `🏫 *ESCOLA ABC DO PARK*\n`;
  texto += `📅 *CALENDÁRIO DA ${tituloAvaliacao.toUpperCase()}*\n`;
  texto += `📍 *Turma:* ${turma.toUpperCase()}\n\n`;
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
  const provasOrdenadas = [...provas].sort((a, b) => parseDataParaOrdem(a.data) - parseDataParaOrdem(b.data));
  const doc = new jsPDF();
  const logoUrl = "https://mnmakhazghgncqummksu.supabase.co/storage/v1/object/public/assets/logo.png";
  const turmasInfantil = ["Maternal", "Jardim I", "Jardim II"];

  let y = 0;

  // Renderiza cabeçalho e marca d'água perfeitamente centralizada na página A4 (210x297mm)
  const renderizarEstruturaBase = () => {
    try {
      doc.saveGraphicsState();
      const gState = new (doc as any).GState({ opacity: 0.04 });
      doc.setGState(gState);
      
      const tamanhoLogoBg = 150;
      // Posiciona exatamente no centro (210/2 = 105; 297/2 = 148.5)
      doc.addImage(logoUrl, "PNG", 105 - (tamanhoLogoBg / 2), 148.5 - (tamanhoLogoBg / 2), tamanhoLogoBg, tamanhoLogoBg, undefined, 'FAST'); 
      doc.restoreGraphicsState();
    } catch (e) {}

    try { 
      doc.addImage(logoUrl, "PNG", 20, 15, 25, 25); 
    } catch (e) {}

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`CALENDÁRIO DA ${tituloAvaliacao.toUpperCase()}`, 50, 23);
    
    doc.setTextColor(180, 0, 0); 
    doc.setFontSize(12);
    doc.text(`${turma.toUpperCase()}`, 50, 30);
    doc.setTextColor(0, 0, 0); 

    if (nomeProfessora) {
      doc.setFontSize(10);
      doc.text(`PROFESSORA: ${nomeProfessora.toUpperCase()}`, 50, 36);
    }
  };

  renderizarEstruturaBase();
  y = 50;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  
  provasOrdenadas.forEach((prova) => {
    const diaSemana = obterDiaSemana(prova.data);
    const dataStr = prova.data ? prova.data : "___/___/___";
    const diaStr = diaSemana ? diaSemana : "________";
    doc.text(`* ${dataStr} - ${diaStr} - ${prova.materia.toUpperCase()}`, 40, y);
    y += 6;
  });

  y += 8;

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
    
    doc.text(`+ ${dataStr} - ${diaStr} - ${prova.materia.toUpperCase()}`, 25, y);
    doc.setTextColor(0, 0, 0); 
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    
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
        doc.text(`-  ${textoLinha}`, 35, y);
        y += 5;
      });
    });
    y += 5; 
  });

  const nomeArquivo = `Cronograma_${tituloAvaliacao.replace(/\s+/g, '_')}_${turma.replace(/\s+/g, '_')}.pdf`;
  doc.save(nomeArquivo);
};

/**
 * 3. NOVO GERADOR PARA IMAGEM COMPLETA (SINGLE-IMAGE)
 * Calcula dinamicamente o tamanho do canvas para evitar cortes e garantir legibilidade total.
 */
export const gerarImagemCronogramaProvas = async (
  turma: string, 
  provas: Prova[], 
  tituloAvaliacao: string = "1ª AVALIAÇÃO", 
  nomeProfessora: string = ""
) => {
  const provasOrdenadas = [...provas].sort((a, b) => parseDataParaOrdem(a.data) - parseDataParaOrdem(b.data));
  const logoUrl = "https://mnmakhazghgncqummksu.supabase.co/storage/v1/object/public/assets/logo.png";
  
  const turmasInfantil = ["Maternal", "Jardim I", "Jardim II"];

  // Criação de um canvas virtual para medição inicial de texto
  const canvasMedicao = document.createElement("canvas");
  const ctxMedicao = canvasMedicao.getContext("2d");
  if (!ctxMedicao) return;

  const larguraImagem = 800; // Largura ideal para visualização móvel clara
  const margemEsquerda = 50;
  const larguraDisponivelTexto = larguraImagem - (margemEsquerda * 2) - 40;

  // --- PASSO 1: CALCULAR ALTURA DINÂMICA DO CANVAS ---
  let alturaCalculada = 160; // Espaço fixo do cabeçalho inicial

  // Adiciona espaço do resumo cronológico
  alturaCalculada += provasOrdenadas.length * 26;
  alturaCalculada += 60; // Espaçamento e título da seção "CONTEÚDOS"

  // Simulação e cálculo de linhas da seção de conteúdos
  ctxMedicao.font = "16px Helvetica";
  provasOrdenadas.forEach((prova) => {
    alturaCalculada += 30; // Título da disciplina (+ data - dia)
    
    const conteudoSeguro = prova.conteudo || "Conteúdo não informado.";
    const paragrafos = conteudoSeguro.split('\n');
    
    paragrafos.forEach(paragrafo => {
      const linhasQuebradas = quebrarTextoCanvas(ctxMedicao, paragrafo, larguraDisponivelTexto);
      alturaCalculada += linhasQuebradas.length * 22;
    });
    alturaCalculada += 25; // Margem entre disciplinas
  });
  
  alturaCalculada += 50; // Margem de segurança inferior

  // --- PASSO 2: CONSTRUÇÃO REAL DA IMAGEM ---
  const canvas = document.createElement("canvas");
  canvas.width = larguraImagem;
  canvas.height = Math.max(alturaCalculada, 800); // Garante altura mínima para ficar bonito mesmo vazio
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Renderizar Fundo Branco Limpo
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Função interna para carregar a logo de forma assíncrona com tratamento de CORS
  const carregarLogo = (): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      img.src = logoUrl;
    });
  };

  try {
    const logoImg = await carregarLogo();
    
    // ----------------------------------------------------
    // NOVO: Desenhar Marca d'água perfeitamente centralizada
    // ----------------------------------------------------
    ctx.save();
    ctx.globalAlpha = 0.04;
    const tamMarcaAgua = Math.min(canvas.width, canvas.height) * 0.7; // Fica grande mas proporcional
    const centroX = (canvas.width - tamMarcaAgua) / 2;
    const centroY = (canvas.height - tamMarcaAgua) / 2;
    ctx.drawImage(logoImg, centroX, centroY, tamMarcaAgua, tamMarcaAgua);
    ctx.restore();

    // Desenhar Logo do Cabeçalho
    ctx.drawImage(logoImg, margemEsquerda, 30, 80, 80);
  } catch (error) {
    console.warn("Não foi possível renderizar o logotipo na imagem devido a restrições de rede.");
  }

  // --- RENDERIZAÇÃO DO TEXTO DO CABEÇALHO ---
  const xTextoCabecalho = margemEsquerda + 100;
  
  ctx.fillStyle = "#1E293B"; // Slate escuro para melhor legibilidade
  ctx.font = "bold 20px Helvetica";
  ctx.fillText(`CALENDÁRIO DA ${tituloAvaliacao.toUpperCase()}`, xTextoCabecalho, 65);

  ctx.fillStyle = "#B40000"; // Vermelho institucional para a turma
  ctx.font = "bold 18px Helvetica";
  ctx.fillText(turma.toUpperCase(), xTextoCabecalho, 85);

  if (nomeProfessora) {
    ctx.fillStyle = "#475569";
    ctx.font = "14px Helvetica";
    ctx.fillText(`PROFESSORA: ${nomeProfessora.toUpperCase()}`, xTextoCabecalho, 105);
  }

  // --- RENDERIZAÇÃO DA PARTE 1: RESUMO DO CRONOGRAMA ---
  let atualY = 170;
  ctx.fillStyle = "#1E293B";
  ctx.font = "bold 15px Helvetica";

  provasOrdenadas.forEach((prova) => {
    const diaSemana = obterDiaSemana(prova.data);
    const dataStr = prova.data ? prova.data : "___/___/___";
    const diaStr = diaSemana ? diaSemana : "________";
    
    ctx.fillText(`•  ${dataStr}  -  ${diaStr.padEnd(13, ' ')}  -  ${prova.materia.toUpperCase()}`, margemEsquerda + 20, atualY);
    atualY += 26;
  });

  atualY += 25;

  // Linha divisória sutil
  ctx.strokeStyle = "#E2E8F0";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(margemEsquerda, atualY - 10);
  ctx.lineTo(larguraImagem - margemEsquerda, atualY - 10);
  ctx.stroke();

  // --- RENDERIZAÇÃO DA PARTE 2: DETALHAMENTO DE CONTEÚDOS ---
  ctx.fillStyle = "#0F172A";
  ctx.font = "bold 18px Helvetica";
  ctx.fillText("CONTEÚDOS DAS AVALIAÇÕES", margemEsquerda, atualY + 15);
  atualY += 45;

  provasOrdenadas.forEach((prova) => {
    const diaSemana = obterDiaSemana(prova.data);
    const dataStr = prova.data ? prova.data : "___/___/___";
    const diaStr = diaSemana ? diaSemana : "________";

    // Cabeçalho da Disciplina
    ctx.fillStyle = "#B40000";
    ctx.font = "bold 15px Helvetica";
    ctx.fillText(`▶  ${dataStr} - ${diaStr} - ${prova.materia.toUpperCase()}`, margemEsquerda, atualY);
    atualY += 24;

    // Linhas de Conteúdo
    ctx.fillStyle = "#334155";
    ctx.font = "15px Helvetica";

    const conteudoSeguro = prova.conteudo || "Conteúdo não informado.";
    const paragrafos = conteudoSeguro.split('\n');

    paragrafos.forEach(paragrafo => {
      const linhasAjustadas = quebrarTextoCanvas(ctx, paragrafo, larguraDisponivelTexto);
      
      linhasAjustadas.forEach((linhaTexto, index) => {
        // Marcador visual apenas no início do parágrafo, recuo fluido nas linhas seguintes
        const marcador = index === 0 ? "–  " : "    ";
        ctx.fillText(`${marcador}${linhaTexto}`, margemEsquerda + 25, atualY);
        atualY += 22;
      });
    });

    atualY += 15; // Espaçador entre blocos de disciplinas
  });

  // --- DISPARAR DOWNLOAD AUTOMÁTICO DA IMAGEM ---
  const urlImagemFinal = canvas.toDataURL("image/png");
  const linkDownload = document.createElement("a");
  linkDownload.href = urlImagemFinal;
  linkDownload.download = `Cronograma_${tituloAvaliacao.replace(/\s+/g, '_')}_${turma.replace(/\s+/g, '_')}.png`;
  document.body.appendChild(linkDownload);
  linkDownload.click();
  document.body.removeChild(linkDownload);
};