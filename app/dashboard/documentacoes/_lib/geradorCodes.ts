import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export async function gerarDocumentoCodes(turmas: any[], alunos: any[], boletins: any[]) {
  // Documento oficial em modo Paisagem (Landscape)
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  // Filtra rigorosamente apenas as turmas do Ensino Fundamental I (1º ao 5º Ano)
  const turmasFiltradas = turmas.filter(t => 
    t.nome_turma.includes("1º") || 
    t.nome_turma.includes("2º") || 
    t.nome_turma.includes("3º") || 
    t.nome_turma.includes("4º") || 
    t.nome_turma.includes("5º")
  ).sort((a, b) => a.nome_turma.localeCompare(b.nome_turma));

  if (turmasFiltradas.length === 0) {
    alert("Nenhuma turma de 1º ao 5º ano encontrada para gerar o CODES.");
    return null;
  }

  // URLs Oficiais de Imagem (Substitua o domínio base pelo seu caso necessário)
  const logoSeduc = "https://mnmakhazghgncqummksu.supabase.co/storage/v1/object/public/assets/seduc.png";
  const carimboSuellen = "https://mnmakhazghgncqummksu.supabase.co/storage/v1/object/public/assets/carimbos/Carimbo%20Suellen.png";

  turmasFiltradas.forEach((turma, index) => {
    // Adiciona uma nova página para cada turma
    if (index > 0) doc.addPage();

    // =========================================================
    // CABEÇALHO OFICIAL SEDUC (Fiel ao Modelo Word)
    // =========================================================
    try {
      doc.addImage(logoSeduc, "PNG", 138.5, 10, 20, 22);
    } catch (e) {
      console.warn("Logo SEDUC não carregada, gerando sem imagem.");
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0); // Preto absoluto oficial
    
    doc.text("GOVERNO DO ESTADO DO PARÁ", 148.5, 36, { align: "center" });
    doc.text("SECRETARIA DO ESTADO DE EDUCAÇÃO", 148.5, 41, { align: "center" });
    doc.text("DIRETORIA DE ENSINO", 148.5, 46, { align: "center" });
    
    // Linha grossa superior
    doc.setLineWidth(0.6);
    doc.line(18, 49, 277, 49); 

    doc.setFontSize(12);
    doc.text("COORDENAÇÃO DE DOCUMENTAÇÃO ESCOLAR - CODES", 148.5, 55, { align: "center" });

    // Linha grossa inferior
    doc.setLineWidth(0.6);
    doc.line(18, 58, 277, 58);


    // --- CAIXA DE INFORMAÇÕES DA ESCOLA ABC DO PARK ---
    doc.setDrawColor(0); // Borda preta
    doc.setLineWidth(0.3);
    doc.rect(14, 61, 269, 13); 

    doc.setFontSize(9);
    doc.text("NOME DO ESTABELECIMENTO: ESCOLA ABC DO PARK", 16, 66);
    doc.text(`MUNICÍPIO: BELÉM - PA`, 230, 66);
    doc.text(`ENSINO: FUNDAMENTAL (1º AO 5º ANO)`, 16, 72);
    doc.text(`TURMA: ${turma.nome_turma.toUpperCase()}`, 130, 72);
    doc.text(`ANO LETIVO: ${new Date().getFullYear()}`, 230, 72);


    // --- PREPARAÇÃO DOS ALUNOS E NOTAS (TABELA BOLETINS) ---
    const alunosDaTurma = alunos
      .filter(a => a.turma === turma.nome_turma)
      .sort((a, b) => a.nome.localeCompare(b.nome));

    const tableRows = alunosDaTurma.map((aluno, i) => {
      // Filtra as notas (boletins) exclusivamente deste aluno
      const notasAluno = boletins.filter(n => n.aluno_id === aluno.id);

      // Função inteligente para buscar a nota pela palavra-chave da matéria
      const getMediaFinal = (keyword: string) => {
        const notaObj = notasAluno.find(n => n.materia && n.materia.toLowerCase().includes(keyword.toLowerCase()));
        return notaObj && notaObj.media ? parseFloat(notaObj.media).toFixed(1).replace('.', ',') : "-";
      };

      // Mapeamento idêntico ao modelo Base SEDUC de disciplinas
      const port = getMediaFinal("portug");
      const mat = getMediaFinal("mat");
      const hist = getMediaFinal("hist");
      const geo = getMediaFinal("geo");
      const cien = getMediaFinal("ciên");
      const arte = getMediaFinal("arte");
      const ing = getMediaFinal("ing");

      // LÓGICA DE APROVAÇÃO (Média >= 7.0)
      const notasValidas = [port, mat, hist, geo, cien, arte, ing]
        .filter(n => n !== "-")
        .map(n => parseFloat(n.replace(',', '.')));

      let situacao = "S/ DADOS";
      if (notasValidas.length > 0) {
        // Verifica se a média de todas as disciplinas juntas atinge o mínimo (Modifique o 7.0 se a escola usar 7.0)
        const mediaGeralAluno = notasValidas.reduce((a, b) => a + b, 0) / notasValidas.length;
        situacao = mediaGeralAluno >= 7.0 ? "APROVADO" : "REPROVADO";
      }

      return [
        (i + 1).toString().padStart(2, '0'),
        aluno.nome.toUpperCase(),
        port, mat, hist, geo, cien, arte, ing,
        situacao
      ];
    });


    // --- DESENHO DA TABELA DE NOTAS ---
    autoTable(doc, {
      startY: 77,
      head: [
        [
          { content: 'Nº', styles: { halign: 'center', valign: 'middle' } },
          { content: 'NOME DO ALUNO', styles: { halign: 'left', valign: 'middle' } },
          { content: 'PORT.', styles: { halign: 'center', valign: 'middle' } },
          { content: 'MAT.', styles: { halign: 'center', valign: 'middle' } },
          { content: 'HIST.', styles: { halign: 'center', valign: 'middle' } },
          { content: 'GEO.', styles: { halign: 'center', valign: 'middle' } },
          { content: 'CIÊN.', styles: { halign: 'center', valign: 'middle' } },
          { content: 'ARTE', styles: { halign: 'center', valign: 'middle' } },
          { content: 'ING.', styles: { halign: 'center', valign: 'middle' } },
          { content: 'SITUAÇÃO\nFINAL', styles: { halign: 'center', valign: 'middle' } }
        ]
      ],
      body: tableRows,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 8.5,
        cellPadding: 1.5,
        textColor: [0, 0, 0], // Preto Oficial
        lineColor: [0, 0, 0],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [230, 230, 230], // Cinza Claro (Sem cor)
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 95 }, // Nome do aluno com maior espaço
        // Demais colunas se ajustam automaticamente
        11: { cellWidth: 25, halign: 'center', fontStyle: 'bold' } // Situação Final em destaque
      }
    });


    // --- ASSINATURAS OFICIAIS NO RODAPÉ ---
    const finalY = (doc as any).lastAutoTable.finalY + 25;
    
    // Evita que as assinaturas quebrem página sozinhas
    if (finalY < 185) {
      doc.setDrawColor(0);
      doc.line(40, finalY, 120, finalY);
      doc.setFontSize(8);
      doc.text("SECRETÁRIO(A) ESCOLAR", 80, finalY + 4, { align: "center" });

      doc.line(170, finalY, 250, finalY);

      // --- INSERÇÃO DO CARIMBO SUELLEN ACIMA DA LINHA DE ASSINATURA DA DIREÇÃO ---
      try {
        doc.addImage(carimboSuellen, "PNG", 190, finalY - 22, 40, 20);
      } catch (e) {
        console.warn("Erro ao carregar o carimbo Suellen no PDF:", e);
      }

      doc.text("DIRETOR(A) / COORDENAÇÃO", 210, finalY + 4, { align: "center" });
    }
  });

  return doc;
}