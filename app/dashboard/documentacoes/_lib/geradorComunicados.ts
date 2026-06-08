import { jsPDF } from "jspdf";

// 1. Interfaces e Definições de Tipos Meticulosas
export interface IlustracaoConfig {
  imgElement: HTMLImageElement | string;
  x: number;
  y: number;
  largura: number;
  altura: number;
}

export interface Comunicado {
  tipo: 'interno' | 'externo' | 'aviso_curto'; 
  titulo: string;
  saudacao?: string;
  conteudo: string;
  telefoneContato?: string;
  ilustracao?: IlustracaoConfig | null;
}

// Configuração de Paleta de Cores Estrita da Escola ABC do Park
const CORES = {
  interno: {
    primaria: "#0f5132",   // Verde Escuro (Aviso, Traços)
    secundaria: "#198754", // Verde Médio (Caixinhas, Rodapé)
    fundoBarra: "#198754",
    textoAviso: "#0f5132"
  },
  externo: {
    primaria: "#000000",   // Preto para o Título (conforme a imagem)
    secundaria: "#15438c", // Azul Médio/Escuro (Meia-lua, Caixinhas, Rodapé)
    fundoBarra: "#15438c",
    textoAviso: "#15438c"  // Cor do ícone de aviso
  },
  aviso_curto: {
    primaria: "#A7C7E7", // Azul Bebê
    secundaria: "#89CFF0",
    fundoBarra: "transparent",
    textoAviso: "#0f172a"
  },
  neutras: {
    textoPrincipal: "#1e293b", 
    textoMutado: "#475569",
    fundoPapel: "#f8fafc", // Fundo levemente cinza/gelo
    bordaFina: "#e2e8f0"
  }
};

const LOGO_URL = "https://mnmakhazghgncqummksu.supabase.co/storage/v1/object/public/assets/logo.png";
const ESTAMPA_ESCOLAR_URL = "https://mnmakhazghgncqummksu.supabase.co/storage/v1/object/public/assets/estampa_escolar.png";

// 2. Auxiliares Avançados de Layout
const quebrarTextoMeticuloso = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
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

// Auxiliar para desenhar retângulos com bordas arredondadas no Canvas
const desenharFundoArredondado = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) => {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();
};

// Desenha a caixinha arredondada (Pill) para datas e destaques no JPG
const desenharCaixaTexto = (ctx: CanvasRenderingContext2D, texto: string, x: number, y: number, corFundo: string) => {
  ctx.font = "bold 22px Helvetica";
  const textMetricas = ctx.measureText(texto);
  const paddingX = 20;
  const paddingY = 32;
  const larguraCaixa = textMetricas.width + (paddingX * 2);
  const alturaCaixa = paddingY;

  ctx.fillStyle = corFundo;
  ctx.beginPath();
  ctx.roundRect(x, y - 24, larguraCaixa, alturaCaixa, 16);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.fillText(texto, x + paddingX, y);
  
  return larguraCaixa;
};

const carregarImagemAsync = (src: string | HTMLImageElement): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    if (src instanceof HTMLImageElement) {
      if (src.complete) return resolve(src);
      src.onload = () => resolve(src);
      src.onerror = (e) => reject(e);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
};

/**
 * GERA ARQUIVO PDF (PADRÃO A4) - GEOMETRIA METICULOSAMENTE AJUSTADA
 */
export const gerarPDFComunicado = async (comunicado: Comunicado) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const corAtiva = CORES[comunicado.tipo];
  
  // --- LAYOUT AVISO CURTO ---
  if (comunicado.tipo === 'aviso_curto') {
    doc.setFillColor(corAtiva.primaria);
    doc.rect(0, 0, 210, 297, "F");

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(12, 12, 186, 273, 5, 5, "F");

    try {
      const imgEstampa = await carregarImagemAsync(ESTAMPA_ESCOLAR_URL);
      doc.addImage(imgEstampa, "PNG", 55, 20, 100, 40); 
    } catch (e) { console.warn("Estampa escolar não encontrada."); }

    let atualY = 80;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(CORES.neutras.textoPrincipal);
    doc.text(comunicado.titulo.toUpperCase(), 105, atualY, { align: "center" });
    atualY += 15;

    if (comunicado.saudacao) {
      doc.setFontSize(16);
      doc.text(comunicado.saudacao, 105, atualY, { align: "center" });
      atualY += 15;
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(14);
    const paragrafos = comunicado.conteudo.split('\n');
    
    paragrafos.forEach((paragrafo) => {
      const textoLimpo = paragrafo.replace(/\[(.*?)\]/g, '$1 -'); // Limpa colchetes
      const linhasAjustadas = doc.splitTextToSize(textoLimpo, 150);
      linhasAjustadas.forEach((linha: string) => {
        if (atualY > 240) { doc.addPage(); atualY = 30; }
        doc.text(linha, 105, atualY, { align: "center" });
        atualY += 8;
      });
      atualY += 6;
    });

    try { doc.addImage(LOGO_URL, "PNG", 20, 245, 35, 35); } catch (e) {}
    
    doc.setFont("helvetica", "italic");
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Atenciosamente, a direção.", 185, 265, { align: "right" });

  } else {
    // --- LAYOUTS ORIGINAIS (INTERNO / EXTERNO) TOTALMENTE REESCRITOS ---
    try {
      doc.saveGraphicsState();
      const gState = new (doc as any).GState({ opacity: 0.03 });
      doc.setGState(gState);
      doc.addImage(LOGO_URL, "PNG", 35, 85, 140, 140, undefined, 'FAST');
      doc.restoreGraphicsState();
    } catch (e) {}

    if (comunicado.tipo === 'externo') {
      // Correção: Círculo grande no canto para fazer uma meia-lua idêntica ao JPG
      doc.setFillColor(corAtiva.secundaria);
      doc.circle(210, 0, 65, "F"); 
      try { doc.addImage(LOGO_URL, "PNG", 162, 8, 40, 40); } catch (e) {}
    } else {
      // Correção: Borda verde contornando a folha e detalhe superior (Badge)
      doc.setDrawColor(corAtiva.secundaria);
      doc.setLineWidth(1.5);
      doc.rect(8, 8, 194, 281);
      
      doc.setFillColor(corAtiva.secundaria);
      doc.circle(175, 0, 40, "F");
      try { doc.addImage(LOGO_URL, "PNG", 157, 4, 36, 36); } catch (e) {}
    }

    // Vetorização manual do Ícone de Alerta (!) idêntico ao JPG
    doc.setDrawColor(corAtiva.textoAviso);
    doc.setFillColor(corAtiva.textoAviso);
    doc.setLineWidth(0.8);
    doc.triangle(28, 12, 38, 28, 18, 28, "S"); // Triângulo
    doc.rect(27.2, 16, 1.6, 5, "F"); // Corpo da exclamação
    doc.circle(28, 24, 1, "F"); // Ponto da exclamação
    doc.line(16, 14, 12, 11); // Raios
    doc.line(40, 14, 44, 11);
    doc.line(14, 22, 10, 22);

    // Título Grande e Impactante
    doc.setFont("helvetica", "bold");
    doc.setFontSize(32);
    doc.setTextColor(0, 0, 0);
    doc.text(comunicado.titulo.toUpperCase(), 20, 38);

    // Traços estéticos sob o título (Swish)
    const larguraTit = doc.getTextWidth(comunicado.titulo.toUpperCase());
    doc.setDrawColor(corAtiva.secundaria);
    doc.setLineWidth(1.2);
    doc.line(20, 42, 20 + larguraTit + 10, 42);
    doc.setLineWidth(0.4);
    doc.line(24, 44, 20 + larguraTit + 5, 44);

    let atualY = 62;

    if (comunicado.saudacao) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(CORES.neutras.textoPrincipal);
      doc.text(comunicado.saudacao, 20, atualY);
      atualY += 15;
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setLineHeightFactor(1.4);
    
    const paragrafos = comunicado.conteudo.split('\n');
    paragrafos.forEach((paragrafo) => {
      if (!paragrafo.trim()) { atualY += 8; return; }

      // Suporte no PDF para as "Caixinhas Coloridas" [DD/MM]
      const match = paragrafo.match(/^\[(.*?)\]\s*(.*)$/);

      if (match) {
        const textoPill = match[1];
        const textoRestante = match[2];

        doc.setFont("helvetica", "bold");
        const pillWidth = doc.getTextWidth(textoPill) + 6;
        
        // Desenha a caixa colorida com borda arredondada
        doc.setFillColor(corAtiva.secundaria);
        doc.roundedRect(20, atualY - 5, pillWidth, 7, 2.5, 2.5, "F");
        
        doc.setTextColor(255, 255, 255);
        doc.text(textoPill, 23, atualY);
        
        // Desenha o restante do texto ao lado da caixinha
        doc.setTextColor(CORES.neutras.textoPrincipal);
        doc.setFont("helvetica", "normal");
        
        const linhasRestantes = doc.splitTextToSize(textoRestante, 170 - pillWidth - 5);
        linhasRestantes.forEach((linha: string, idx: number) => {
          if (atualY > 260) { doc.addPage(); atualY = 30; }
          doc.text(linha, 20 + pillWidth + 5, atualY);
          atualY += 6;
        });
        atualY += 4; // Margem extra após um item com caixinha

      } else {
        const linhasAjustadas = doc.splitTextToSize(paragrafo, 170);
        linhasAjustadas.forEach((linha: string) => {
          if (atualY > 260) { doc.addPage(); atualY = 30; }
          doc.text(linha, 20, atualY);
          atualY += 7;
        });
        atualY += 5;
      }
    });

    const fimY = 275;
    
    // Rodapé estilizado com bordas levemente arredondadas no PDF
    doc.setFillColor(corAtiva.fundoBarra);
    doc.roundedRect(10, fimY, 190, 14, 3, 3, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor("#ffffff");
    
    if (comunicado.tipo === 'interno') {
      doc.text("Atenciosamente, a direção.", 105, fimY + 8.5, { align: "center" });
    } else {
      doc.setFontSize(9);
      doc.text("Qualquer dúvida favor entrar em contato com a direção.", 15, fimY + 8.5);
      if (comunicado.telefoneContato) {
        doc.text(`Tel: ${comunicado.telefoneContato}`, 195, fimY + 8.5, { align: "right" });
      }
    }
  }

  // --- INJEÇÃO DA ILUSTRAÇÃO CUSTOMIZADA COMUM A TODOS ---
  if (comunicado.ilustracao) {
    try {
      const imgCarg = await carregarImagemAsync(comunicado.ilustracao.imgElement);
      const xMM = (comunicado.ilustracao.x / 1240) * 210;
      const yMM = (comunicado.ilustracao.y / 1754) * 297;
      const largMM = (comunicado.ilustracao.largura / 1240) * 210;
      const altMM = (comunicado.ilustracao.altura / 1754) * 297;
      doc.addImage(imgCarg, "PNG", xMM, yMM, largMM, altMM);
    } catch (e) { console.warn("Falha ao renderizar a ilustração no PDF.", e); }
  }

  doc.save(`Comunicado_${comunicado.tipo}_${new Date().toISOString().slice(0,10)}.pdf`);
};

/**
 * GERA ARQUIVO IMAGEM JPG COM DESIGN IDÊNTICO AOS MODELOS
 */
export const gerarJPGComunicado = async (comunicado: Comunicado) => {
  const LARGURA_A4 = 1240;
  const ALTURA_A4 = 1754;

  const canvas = document.createElement("canvas");
  canvas.width = LARGURA_A4;
  canvas.height = ALTURA_A4;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const corAtiva = CORES[comunicado.tipo];

  if (comunicado.tipo === 'aviso_curto') {
    ctx.fillStyle = corAtiva.primaria;
    ctx.fillRect(0, 0, LARGURA_A4, ALTURA_A4);

    ctx.fillStyle = "#ffffff";
    const margemQuadro = 70;
    desenharFundoArredondado(ctx, margemQuadro, margemQuadro, LARGURA_A4 - (margemQuadro * 2), ALTURA_A4 - (margemQuadro * 2), 40);

    try {
      const imgEstampa = await carregarImagemAsync(ESTAMPA_ESCOLAR_URL);
      const largEstampa = 600;
      const altEstampa = 250;
      ctx.drawImage(imgEstampa, (LARGURA_A4 - largEstampa) / 2, margemQuadro + 40, largEstampa, altEstampa);
    } catch (e) {}

    let atualY = 480;

    ctx.fillStyle = CORES.neutras.textoPrincipal;
    ctx.textAlign = "center";
    ctx.font = "bold 60px Helvetica";
    ctx.fillText(comunicado.titulo.toUpperCase(), LARGURA_A4 / 2, atualY);
    atualY += 80;

    if (comunicado.saudacao) {
      ctx.font = "bold 38px Helvetica";
      ctx.fillText(comunicado.saudacao, LARGURA_A4 / 2, atualY);
      atualY += 80;
    }

    ctx.font = "32px Helvetica";
    const alturaLinha = 45;
    const larguraTextoUtil = LARGURA_A4 - 300;

    const paragrafos = comunicado.conteudo.split('\n');
    paragrafos.forEach(paragrafo => {
      if (!paragrafo.trim()) { atualY += 30; return; }
      
      const textoLimpo = paragrafo.replace(/\[(.*?)\]/g, '$1 -');

      const linhasQuebradas = quebrarTextoMeticuloso(ctx, textoLimpo, larguraTextoUtil);
      linhasQuebradas.forEach(linha => {
        ctx.fillText(linha, LARGURA_A4 / 2, atualY);
        atualY += alturaLinha;
      });
      atualY += 30;
    });

    try {
      const logoImg = await carregarImagemAsync(LOGO_URL);
      ctx.drawImage(logoImg, margemQuadro + 40, ALTURA_A4 - margemQuadro - 220, 180, 180);
    } catch (e) {}

    ctx.textAlign = "right";
    ctx.font = "italic bold 34px Helvetica";
    ctx.fillText("Atenciosamente, a direção.", LARGURA_A4 - margemQuadro - 60, ALTURA_A4 - margemQuadro - 100);

  } else {
    ctx.fillStyle = CORES.neutras.fundoPapel;
    ctx.fillRect(0, 0, LARGURA_A4, ALTURA_A4);

    ctx.fillStyle = corAtiva.secundaria;
    ctx.beginPath();
    ctx.arc(LARGURA_A4 - 50, 0, 350, 0, Math.PI * 2); 
    ctx.fill();

    try {
      const logoImg = await carregarImagemAsync(LOGO_URL);
      ctx.drawImage(logoImg, LARGURA_A4 - 310, 50, 200, 200);
    } catch (e) {}

    const margemEsquerda = 120;
    let atualY = 180;

    const drawWarningIcon = (x: number, y: number, color: string) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(x + 35, y);
      ctx.lineTo(x + 70, y + 60);
      ctx.lineTo(x, y + 60);
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.fillRect(x + 32, y + 20, 6, 20);
      ctx.beginPath();
      ctx.arc(x + 35, y + 50, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - 10, y + 10); ctx.lineTo(x - 25, y - 5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + 80, y + 10); ctx.lineTo(x + 95, y - 5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 20, y + 40); ctx.lineTo(x - 40, y + 40); ctx.stroke();
    };

    drawWarningIcon(margemEsquerda, atualY - 110, corAtiva.textoAviso);

    ctx.fillStyle = corAtiva.primaria;
    ctx.font = "900 85px 'Arial Black', Impact, sans-serif";
    ctx.textAlign = "left";
    ctx.letterSpacing = "2px"; 
    ctx.fillText(comunicado.titulo.toUpperCase(), margemEsquerda, atualY);
    ctx.letterSpacing = "0px";

    const larguraTitulo = ctx.measureText(comunicado.titulo.toUpperCase()).width;
    ctx.strokeStyle = corAtiva.secundaria;
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    
    ctx.beginPath();
    ctx.moveTo(margemEsquerda + 10, atualY + 25);
    ctx.quadraticCurveTo(margemEsquerda + (larguraTitulo / 2), atualY + 10, margemEsquerda + larguraTitulo + 20, atualY + 25);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(margemEsquerda + 30, atualY + 35);
    ctx.quadraticCurveTo(margemEsquerda + (larguraTitulo / 2), atualY + 50, margemEsquerda + larguraTitulo - 10, atualY + 20);
    ctx.stroke();

    atualY += 120;

    if (comunicado.saudacao) {
      ctx.fillStyle = CORES.neutras.textoPrincipal;
      ctx.font = "28px Helvetica";
      ctx.fillText(comunicado.saudacao, margemEsquerda, atualY);
      atualY += 45;
    }

    ctx.fillStyle = CORES.neutras.textoPrincipal;
    ctx.font = "26px Helvetica";
    const alturaLinha = 40;
    const larguraTextoUtil = LARGURA_A4 - (margemEsquerda * 2) - 50;

    const paragrafos = comunicado.conteudo.split('\n');
    
    paragrafos.forEach(paragrafo => {
      if (!paragrafo.trim()) { atualY += 25; return; }

      const match = paragrafo.match(/^\[(.*?)\]\s*(.*)$/);

      if (match) {
        const textoPill = match[1];
        const textoRestante = match[2];

        const larguraCaixaOcupada = desenharCaixaTexto(ctx, textoPill, margemEsquerda, atualY, corAtiva.secundaria);
        
        ctx.fillStyle = CORES.neutras.textoPrincipal;
        ctx.font = "26px Helvetica";
        ctx.fillText(textoRestante, margemEsquerda + larguraCaixaOcupada + 20, atualY);
        
        atualY += alturaLinha + 15; 
      } else {
        ctx.fillStyle = CORES.neutras.textoPrincipal;
        ctx.font = "26px Helvetica";
        const linhasQuebradas = quebrarTextoMeticuloso(ctx, paragrafo, larguraTextoUtil);
        linhasQuebradas.forEach(linha => {
          ctx.fillText(linha, margemEsquerda, atualY);
          atualY += alturaLinha;
        });
        atualY += 15;
      }
    });

    const alturaRodape = 120;
    const margemRodape = 50;
    const yRodape = ALTURA_A4 - alturaRodape - margemRodape;
    
    ctx.fillStyle = corAtiva.secundaria;
    ctx.beginPath();
    ctx.roundRect(margemRodape, yRodape, LARGURA_A4 - (margemRodape * 2), alturaRodape, 25);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    if (comunicado.tipo === 'interno') {
      ctx.font = "bold 28px Helvetica";
      ctx.textAlign = "center";
      ctx.fillText("Atenciosamente, a direção.", LARGURA_A4 / 2, yRodape + 70);
    } else {
      ctx.font = "bold 24px Helvetica";
      ctx.textAlign = "center";
      ctx.fillText("Qualquer dúvida favor entrar em contato com a direção.", LARGURA_A4 / 2, yRodape + 50);
      if (comunicado.telefoneContato) {
        ctx.font = "bold 26px Helvetica";
        ctx.fillText(`📞 ${comunicado.telefoneContato}`, LARGURA_A4 / 2, yRodape + 95);
      }
    }
  }

  if (comunicado.ilustracao) {
    try {
      const imgIlustracao = await carregarImagemAsync(comunicado.ilustracao.imgElement);
      ctx.drawImage(
        imgIlustracao, 
        comunicado.ilustracao.x, 
        comunicado.ilustracao.y, 
        comunicado.ilustracao.largura, 
        comunicado.ilustracao.altura
      );
    } catch (e) {}
  }

  const urlFinalJpg = canvas.toDataURL("image/jpeg", 0.95);
  const link = document.createElement("a");
  link.href = urlFinalJpg;
  link.download = `Comunicado_${comunicado.tipo}_${new Date().toISOString().slice(0,10)}.jpg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};