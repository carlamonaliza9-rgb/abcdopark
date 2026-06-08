import { jsPDF } from "jspdf";

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
  ilustracoes?: IlustracaoConfig[]; 
}

const CORES = {
  interno: {
    primaria: "#0f5132",   
    secundaria: "#054728", 
    fundoBarra: "#198754",
    textoAviso: "#0f5132"
  },
  externo: {
    primaria: "#000000",   
    secundaria: "#15438c", 
    fundoBarra: "#15438c",
    textoAviso: "#15438c"  
  },
  aviso_curto: {
    primaria: "#A7C7E7", 
    secundaria: "#89CFF0",
    fundoBarra: "transparent",
    textoAviso: "#0f172a"
  },
  neutras: {
    textoPrincipal: "#1e293b", 
    textoMutado: "#475569",
    fundoPapel: "#f8fafc", 
    bordaFina: "#e2e8f0"
  }
};

const LOGO_URL = "https://mnmakhazghgncqummksu.supabase.co/storage/v1/object/public/assets/logo.png";
const ESTAMPA_ESCOLAR_URL = "https://mnmakhazghgncqummksu.supabase.co/storage/v1/object/public/assets/estampa_escolar.png";

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
 * MOTOR DE RENDERIZAÇÃO COMPARTILHADO (Usado pelo Preview do Front-end e pela Geração do JPG)
 */
export const desenharDocumentoBase = async (ctx: CanvasRenderingContext2D, comunicado: Omit<Comunicado, 'ilustracoes'>) => {
  const LARGURA_A4 = 1240;
  const ALTURA_A4 = 1754;
  const corAtiva = CORES[comunicado.tipo];

  // Limpa o canvas para o Preview não sobrepor quadros
  ctx.clearRect(0, 0, LARGURA_A4, ALTURA_A4);

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
    // LAYOUTS INTERNO E EXTERNO
    ctx.fillStyle = CORES.neutras.fundoPapel;
    ctx.fillRect(0, 0, LARGURA_A4, ALTURA_A4);

    if (comunicado.tipo === 'interno') {
      // Borda verde contornando
      ctx.strokeStyle = corAtiva.primaria;
      ctx.lineWidth = 10;
      ctx.strokeRect(30, 30, LARGURA_A4 - 60, ALTURA_A4 - 60);

      // Badge (Selo) Verde caindo do topo direito
      ctx.fillStyle = corAtiva.secundaria;
      ctx.beginPath();
      ctx.roundRect(LARGURA_A4 - 350, 0, 260, 320, [0, 0, 130, 130]);
      ctx.fill();

      try {
        const logoImg = await carregarImagemAsync(LOGO_URL);
        ctx.drawImage(logoImg, LARGURA_A4 - 325, 40, 210, 210);
      } catch (e) {}
    } else {
      // Meia Lua Azul no canto superior direito
      ctx.fillStyle = corAtiva.secundaria;
      ctx.beginPath();
      ctx.arc(LARGURA_A4, 0, 400, 0, Math.PI * 2); 
      ctx.fill();

      try {
        const logoImg = await carregarImagemAsync(LOGO_URL);
        ctx.drawImage(logoImg, LARGURA_A4 - 340, 40, 240, 240);
      } catch (e) {}
    }

    const margemEsquerda = 100;
    
    // Ícone de Alerta (!) reposicionado para não encavalar
    const drawWarningIcon = (x: number, y: number, color: string) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 5;
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(x + 40, y);
      ctx.lineTo(x + 80, y + 70);
      ctx.lineTo(x, y + 70);
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.fillRect(x + 36, y + 25, 8, 25);
      ctx.beginPath();
      ctx.arc(x + 40, y + 60, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - 10, y + 15); ctx.lineTo(x - 30, y - 5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + 90, y + 15); ctx.lineTo(x + 110, y - 5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 20, y + 45); ctx.lineTo(x - 45, y + 45); ctx.stroke();
    };

    drawWarningIcon(margemEsquerda, 80, corAtiva.textoAviso);

    // Título reposicionado para baixo (Y = 240)
    ctx.fillStyle = corAtiva.primaria;
    ctx.font = "500 75px Impact, sans-serif";
    ctx.textAlign = "left";
    ctx.letterSpacing = "2px"; 
    ctx.fillText(comunicado.titulo.toUpperCase(), margemEsquerda, 240);
    ctx.letterSpacing = "0px";

    const larguraTitulo = ctx.measureText(comunicado.titulo.toUpperCase()).width;
    ctx.strokeStyle = corAtiva.secundaria;
    
    // Traços ajustados proporcionalmente abaixo do título
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(margemEsquerda + 10, 270);
    ctx.quadraticCurveTo(margemEsquerda + (larguraTitulo / 2), 250, margemEsquerda + larguraTitulo + 20, 270);
    ctx.stroke();
    
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(margemEsquerda + 30, 285);
    ctx.quadraticCurveTo(margemEsquerda + (larguraTitulo / 2), 300, margemEsquerda + larguraTitulo - 10, 265);
    ctx.stroke();

    let atualY = 380; // Texto desce bem mais para não encostar

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
    const margemRodape = comunicado.tipo === 'interno' ? 40 : 50;
    const yRodape = ALTURA_A4 - alturaRodape - margemRodape;
    
    ctx.fillStyle = corAtiva.secundaria;
    ctx.beginPath();
    ctx.roundRect(margemRodape, yRodape, LARGURA_A4 - (margemRodape * 2), alturaRodape, 20);
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
        ctx.fillText(`📞 ${comunicado.telefoneContato}`, LARGURA_A4 / 2, yRodape + 90);
      }
    }
  }
};

/**
 * GERA ARQUIVO PDF (PADRÃO A4) COM A MESMA GEOMETRIA
 */
export const gerarPDFComunicado = async (comunicado: Comunicado) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const corAtiva = CORES[comunicado.tipo];
  
  if (comunicado.tipo === 'aviso_curto') {
    doc.setFillColor(corAtiva.primaria);
    doc.rect(0, 0, 210, 297, "F");
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(12, 12, 186, 273, 5, 5, "F");

    try {
      const imgEstampa = await carregarImagemAsync(ESTAMPA_ESCOLAR_URL);
      doc.addImage(imgEstampa, "PNG", 55, 20, 100, 40); 
    } catch (e) {}

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
      const textoLimpo = paragrafo.replace(/\[(.*?)\]/g, '$1 -'); 
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
    // LAYOUTS INTERNO E EXTERNO - PDF
    try {
      doc.saveGraphicsState();
      const gState = new (doc as any).GState({ opacity: 0.03 });
      doc.setGState(gState);
      doc.addImage(LOGO_URL, "PNG", 35, 85, 140, 140, undefined, 'FAST');
      doc.restoreGraphicsState();
    } catch (e) {}

    if (comunicado.tipo === 'externo') {
      doc.setFillColor(corAtiva.secundaria);
      doc.circle(210, 0, 65, "F"); 
      try { doc.addImage(LOGO_URL, "PNG", 162, 8, 40, 40); } catch (e) {}
    } else {
      doc.setDrawColor(corAtiva.primaria);
      doc.setLineWidth(1.5);
      doc.rect(5, 5, 200, 287);
      
      doc.setFillColor(corAtiva.secundaria);
      doc.roundedRect(150, 0, 45, 55, 22, 22, "F");
      try { doc.addImage(LOGO_URL, "PNG", 154, 8, 36, 36); } catch (e) {}
    }

    doc.setDrawColor(corAtiva.textoAviso);
    doc.setFillColor(corAtiva.textoAviso);
    doc.setLineWidth(0.8);
    doc.triangle(24, 14, 31, 26, 17, 26, "S"); 
    doc.rect(23.2, 17, 1.6, 4, "F"); 
    doc.circle(24, 23.5, 1, "F"); 
    doc.line(16, 16, 13, 14); 
    doc.line(32, 16, 35, 14);
    doc.line(14, 21, 11, 21);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.setTextColor(0, 0, 0);
    doc.text(comunicado.titulo.toUpperCase(), 17, 40);

    const larguraTit = doc.getTextWidth(comunicado.titulo.toUpperCase());
    doc.setDrawColor(corAtiva.secundaria);
    
    doc.setLineWidth(1.2);
    doc.line(17, 45, 17 + larguraTit + 10, 45);
    doc.setLineWidth(0.5);
    doc.line(20, 48, 17 + larguraTit + 5, 48);

    let atualY = 65;

    if (comunicado.saudacao) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(CORES.neutras.textoPrincipal);
      doc.text(comunicado.saudacao, 17, atualY);
      atualY += 15;
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setLineHeightFactor(1.4);
    
    const paragrafos = comunicado.conteudo.split('\n');
    paragrafos.forEach((paragrafo) => {
      if (!paragrafo.trim()) { atualY += 8; return; }

      const match = paragrafo.match(/^\[(.*?)\]\s*(.*)$/);

      if (match) {
        const textoPill = match[1];
        const textoRestante = match[2];

        doc.setFont("helvetica", "bold");
        const pillWidth = doc.getTextWidth(textoPill) + 6;
        
        doc.setFillColor(corAtiva.secundaria);
        doc.roundedRect(17, atualY - 5, pillWidth, 7, 2.5, 2.5, "F");
        
        doc.setTextColor(255, 255, 255);
        doc.text(textoPill, 20, atualY);
        
        doc.setTextColor(CORES.neutras.textoPrincipal);
        doc.setFont("helvetica", "normal");
        
        const linhasRestantes = doc.splitTextToSize(textoRestante, 170 - pillWidth - 5);
        linhasRestantes.forEach((linha: string) => {
          if (atualY > 260) { doc.addPage(); atualY = 30; }
          doc.text(linha, 17 + pillWidth + 5, atualY);
          atualY += 6;
        });
        atualY += 4; 

      } else {
        const linhasAjustadas = doc.splitTextToSize(paragrafo, 175);
        linhasAjustadas.forEach((linha: string) => {
          if (atualY > 260) { doc.addPage(); atualY = 30; }
          doc.text(linha, 17, atualY);
          atualY += 7;
        });
        atualY += 5;
      }
    });

    const fimY = 270;
    
    doc.setFillColor(corAtiva.fundoBarra);
    const margemR = comunicado.tipo === 'interno' ? 7 : 10;
    doc.roundedRect(margemR, fimY, 210 - (margemR * 2), 16, 3, 3, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor("#ffffff");
    
    if (comunicado.tipo === 'interno') {
      doc.text("Atenciosamente, a direção.", 105, fimY + 9.5, { align: "center" });
    } else {
      doc.setFontSize(9);
      doc.text("Qualquer dúvida favor entrar em contato com a direção.", 15, fimY + 9.5);
      if (comunicado.telefoneContato) {
        doc.text(`Tel: ${comunicado.telefoneContato}`, 195, fimY + 9.5, { align: "right" });
      }
    }
  }

  if (comunicado.ilustracoes && comunicado.ilustracoes.length > 0) {
    for (const ilustracao of comunicado.ilustracoes) {
      try {
        const imgCarg = await carregarImagemAsync(ilustracao.imgElement);
        const xMM = (ilustracao.x / 1240) * 210;
        const yMM = (ilustracao.y / 1754) * 297;
        const largMM = (ilustracao.largura / 1240) * 210;
        const altMM = (ilustracao.altura / 1754) * 297;
        doc.addImage(imgCarg, "PNG", xMM, yMM, largMM, altMM);
      } catch (e) { 
        console.warn("Falha ao renderizar uma ilustração no PDF.", e); 
      }
    }
  }

  doc.save(`Comunicado_${comunicado.tipo}_${new Date().toISOString().slice(0,10)}.pdf`);
};

export const gerarJPGComunicado = async (comunicado: Comunicado) => {
  const LARGURA_A4 = 1240;
  const ALTURA_A4 = 1754;

  const canvas = document.createElement("canvas");
  canvas.width = LARGURA_A4;
  canvas.height = ALTURA_A4;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Usa o motor base que criamos acima
  await desenharDocumentoBase(ctx, comunicado);

  if (comunicado.ilustracoes && comunicado.ilustracoes.length > 0) {
    for (const ilustracao of comunicado.ilustracoes) {
      try {
        const imgCarg = await carregarImagemAsync(ilustracao.imgElement);
        ctx.drawImage(
          imgCarg, 
          ilustracao.x, 
          ilustracao.y, 
          ilustracao.largura, 
          ilustracao.altura
        );
      } catch (e) {
        console.error("Erro ao desenhar imagem extra no Canvas JPG", e);
      }
    }
  }

  const urlFinalJpg = canvas.toDataURL("image/jpeg", 0.95);
  const link = document.createElement("a");
  link.href = urlFinalJpg;
  link.download = `Comunicado_${comunicado.tipo}_${new Date().toISOString().slice(0,10)}.jpg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};