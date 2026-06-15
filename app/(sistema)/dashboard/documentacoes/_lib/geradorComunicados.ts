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

// ============================================================================
// MOTOR DE RENDERIZAÇÃO ESTILO WYSIWYG
// ============================================================================
const renderizarLinhaRica = (
  ctx: CanvasRenderingContext2D, 
  paragrafo: string, 
  x: number, 
  y: number, 
  maxWidth: number, 
  tamanhoBase: number, 
  cor: string,
  forcarAlinhamento?: 'left' | 'center' | 'right'
) => {
  let align = forcarAlinhamento || 'left';
  let size = tamanhoBase;
  let text = paragrafo;

  // Analisa as tags secretas injetadas pelo editor
  if (text.includes('<C>')) { align = 'center'; text = text.replace(/<C>/g, '').trim(); }
  if (text.includes('<R>')) { align = 'right'; text = text.replace(/<R>/g, '').trim(); }
  if (text.includes('<T>')) { size += 10; text = text.replace(/<T>/g, '').trim(); }
  if (text.includes('<P>')) { size = Math.max(tamanhoBase - 8, 12); text = text.replace(/<P>/g, '').trim(); }

  if (!text.trim()) return y;

  ctx.fillStyle = cor;
  const alturaLinha = 40; // Mantido restrito para preservar o design original
  let cursorY = y;

  const partes = text.split(/(\*\*.*?\*\*)/g).filter(Boolean);
  const wordsList: { txt: string, bold: boolean }[] = [];
  
  partes.forEach(part => {
    const isBold = part.startsWith('**') && part.endsWith('**');
    const cleanText = isBold ? part.slice(2, -2) : part;
    
    const subWords = cleanText.split(/(\s+)/); 
    subWords.forEach((w) => {
      if (w !== '') wordsList.push({ txt: w, bold: isBold });
    });
  });

  const medirLarguraLinha = (arr: { txt: string, bold: boolean }[]) => {
    let w = 0;
    for (let i = 0; i < arr.length; i++) {
      ctx.font = `${arr[i].bold ? 'bold' : 'normal'} ${size}px Helvetica`;
      w += ctx.measureText(arr[i].txt).width;
    }
    return w;
  };

  let linhaCorrente: { txt: string, bold: boolean }[] = [];
  const todasAsLinhas: Array<Array<{ txt: string, bold: boolean }>> = [];

  for (let i = 0; i < wordsList.length; i++) {
    linhaCorrente.push(wordsList[i]);
    if (medirLarguraLinha(linhaCorrente) > maxWidth && linhaCorrente.length > 1) {
      const removida = linhaCorrente.pop()!;
      if (linhaCorrente.length > 0 && linhaCorrente[linhaCorrente.length - 1].txt.trim() === '') {
        linhaCorrente.pop();
      }
      todasAsLinhas.push([...linhaCorrente]);
      linhaCorrente = [{ txt: removida.txt.trimStart(), bold: removida.bold }];
      if (linhaCorrente[0].txt === '') linhaCorrente = [];
    }
  }
  if (linhaCorrente.length > 0) todasAsLinhas.push(linhaCorrente);

  todasAsLinhas.forEach(linha => {
    const larguraDestalinha = medirLarguraLinha(linha);
    let cursorX = x;
    
    if (align === 'center') {
      cursorX = x + (maxWidth / 2) - (larguraDestalinha / 2);
    } else if (align === 'right') {
      cursorX = x + maxWidth - larguraDestalinha;
    }

    linha.forEach(pedaco => {
      ctx.font = `${pedaco.bold ? 'bold' : 'normal'} ${size}px Helvetica`;
      ctx.fillText(pedaco.txt, cursorX, cursorY);
      cursorX += ctx.measureText(pedaco.txt).width;
    });
    cursorY += alturaLinha;
  });

  return cursorY - alturaLinha; 
};

// ============================================================================
// FUNCÕES ORIGINAIS MANTIDAS
// ============================================================================
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

export const desenharDocumentoBase = async (ctx: CanvasRenderingContext2D, comunicado: Omit<Comunicado, 'ilustracoes'>) => {
  const LARGURA_A4 = 1240;
  const ALTURA_A4 = 1754;
  const corAtiva = CORES[comunicado.tipo];

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

    // TÍTULO RESTAURADO
    ctx.fillStyle = CORES.neutras.textoPrincipal;
    ctx.textAlign = "center";
    ctx.font = "bold 60px Helvetica";
    const linhasTituloAviso = quebrarTextoMeticuloso(ctx, comunicado.titulo.toUpperCase(), LARGURA_A4 - 300);
    linhasTituloAviso.forEach(linha => {
        ctx.fillText(linha, LARGURA_A4 / 2, atualY);
        atualY += 70;
    });
    atualY += 20;

    // SAUDAÇÃO RESTAURADA
    if (comunicado.saudacao) {
      ctx.font = "bold 38px Helvetica";
      ctx.fillText(comunicado.saudacao, LARGURA_A4 / 2, atualY);
      atualY += 80;
    }

    const larguraTextoUtil = LARGURA_A4 - 300;
    const paragrafos = comunicado.conteudo.split('\n');
    
    ctx.textAlign = "left"; 
    paragrafos.forEach(paragrafo => {
      if (!paragrafo.trim()) { atualY += 30; return; }
      
      const textoLimpo = paragrafo.replace(/\[(.*?)\]/g, '$1 -'); 
      
      atualY = renderizarLinhaRica(ctx, textoLimpo, 150, atualY, larguraTextoUtil, 32, CORES.neutras.textoPrincipal, 'center');
      atualY += 45;
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
      ctx.strokeStyle = corAtiva.primaria;
      ctx.lineWidth = 10;
      ctx.strokeRect(30, 30, LARGURA_A4 - 60, ALTURA_A4 - 60);

      ctx.fillStyle = corAtiva.secundaria;
      ctx.beginPath();
      ctx.roundRect(LARGURA_A4 - 350, 0, 260, 320, [0, 0, 130, 130]);
      ctx.fill();

      try {
        const logoImg = await carregarImagemAsync(LOGO_URL);
        ctx.drawImage(logoImg, LARGURA_A4 - 325, 50, 210, 210);
      } catch (e) {}
    } else {
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

    // TÍTULO RESTAURADO
    ctx.fillStyle = corAtiva.primaria;
    ctx.font = "normal 75px Impact, sans-serif";
    ctx.textAlign = "left";
    
    const limiteLarguraTitulo = 750;
    const linhasTitulo = quebrarTextoMeticuloso(ctx, comunicado.titulo.toUpperCase(), limiteLarguraTitulo);
    
    let tituloY = 240;
    linhasTitulo.forEach(linha => {
      ctx.fillText(linha, margemEsquerda, tituloY);
      tituloY += 85;
    });

    const ultimaLinhaY = tituloY - 85;
    const larguraUltimaLinha = ctx.measureText(linhasTitulo[linhasTitulo.length - 1]).width;
    
    ctx.strokeStyle = corAtiva.secundaria;
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(margemEsquerda + 10, ultimaLinhaY + 25);
    ctx.quadraticCurveTo(margemEsquerda + (larguraUltimaLinha / 2), ultimaLinhaY + 5, margemEsquerda + larguraUltimaLinha + 20, ultimaLinhaY + 25);
    ctx.stroke();
    
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(margemEsquerda + 30, ultimaLinhaY + 40);
    ctx.quadraticCurveTo(margemEsquerda + (larguraUltimaLinha / 2), ultimaLinhaY + 55, margemEsquerda + larguraUltimaLinha - 10, ultimaLinhaY + 20);
    ctx.stroke();

    let atualY = ultimaLinhaY + 130;
    const larguraTextoUtil = LARGURA_A4 - (margemEsquerda * 2) - 50;

    // SAUDAÇÃO RESTAURADA
    if (comunicado.saudacao) {
      ctx.fillStyle = CORES.neutras.textoPrincipal;
      ctx.font = "40px Helvetica";
      ctx.fillText(comunicado.saudacao, margemEsquerda, atualY);
      atualY += 50;
    }

    ctx.textAlign = "left"; 
    const paragrafos = comunicado.conteudo.split('\n');
    
    paragrafos.forEach(paragrafo => {
      if (!paragrafo.trim()) { atualY += 25; return; }

      const match = paragrafo.match(/^\[(.*?)\]\s*(.*)$/);

      if (match) {
        const textoPill = match[1];
        const textoRestante = match[2];
        const larguraCaixaOcupada = desenharCaixaTexto(ctx, textoPill, margemEsquerda, atualY, corAtiva.secundaria);
        
        atualY = renderizarLinhaRica(ctx, textoRestante, margemEsquerda + larguraCaixaOcupada + 20, atualY + 2, larguraTextoUtil - larguraCaixaOcupada - 20, 26, CORES.neutras.textoPrincipal);
        atualY += 40; 
      } else {
        atualY = renderizarLinhaRica(ctx, paragrafo, margemEsquerda, atualY, larguraTextoUtil, 26, CORES.neutras.textoPrincipal);
        atualY += 40;
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

const gerarCanvasCompleto = async (comunicado: Comunicado): Promise<HTMLCanvasElement> => {
  const LARGURA_A4 = 1240;
  const ALTURA_A4 = 1754;
  const canvas = document.createElement("canvas");
  canvas.width = LARGURA_A4;
  canvas.height = ALTURA_A4;
  const ctx = canvas.getContext("2d");
  
  if (!ctx) return canvas;

  await desenharDocumentoBase(ctx, comunicado);

  if (comunicado.ilustracoes && comunicado.ilustracoes.length > 0) {
    for (const ilustracao of comunicado.ilustracoes) {
      try {
        const imgCarg = await carregarImagemAsync(ilustracao.imgElement);
        ctx.drawImage(imgCarg, ilustracao.x, ilustracao.y, ilustracao.largura, ilustracao.altura);
      } catch (e) {
        console.error("Erro ao desenhar imagem extra", e);
      }
    }
  }

  return canvas;
};

export const gerarPDFComunicado = async (comunicado: Comunicado) => {
  const canvas = await gerarCanvasCompleto(comunicado);
  const imgData = canvas.toDataURL("image/jpeg", 1.0);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  doc.addImage(imgData, 'JPEG', 0, 0, 210, 297);
  doc.save(`Comunicado_${comunicado.tipo}_${new Date().toISOString().slice(0,10)}.pdf`);
};

export const gerarJPGComunicado = async (comunicado: Comunicado) => {
  const canvas = await gerarCanvasCompleto(comunicado);
  const urlFinalJpg = canvas.toDataURL("image/jpeg", 1.0);
  const link = document.createElement("a");
  link.href = urlFinalJpg;
  link.download = `Comunicado_${comunicado.tipo}_${new Date().toISOString().slice(0,10)}.jpg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};