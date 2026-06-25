"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase"; 
import { useRouter } from "next/navigation";
import { Save, BookOpenCheck, Loader2, Lock, FileDown, X, Layers, Layout } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function AvaliacoesProfessorPage() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [gerandoPDF, setGerandoPDF] = useState(false);
  const [mostrarModalPDF, setMostrarModalPDF] = useState(false); // Controla o modal de escolha do PDF
  const [userEmail, setUserEmail] = useState("");
  const [nomeLogado, setNomeLogado] = useState(""); 
  const [ehAdmin, setEhAdmin] = useState(false);
  
  const [listaTurmas, setListaTurmas] = useState<string[]>([]);
  const [turmaSelecionada, setTurmaSelecionada] = useState("");
  const [bimestreSelecionado, setBimestreSelecionado] = useState("bimestre1");
  
  const [alunos, setAlunos] = useState<any[]>([]);
  const [todasDisciplinas, setTodasDisciplinas] = useState<any[]>([]); 
  const [minhasDisciplinasPermitidas, setMinhasDisciplinasPermitidas] = useState<string[]>([]); 
  
  const [notasLocais, setNotasLocais] = useState<{ [alunoId: string]: { [disciplina: string]: string } }>({});
  const [notasOriginais, setNotasOriginais] = useState<{ [alunoId: string]: { [disciplina: string]: string } }>({});

  const colunasAvaliacao = [
    { id: "bimestre1", label: "1º Bimestre" },
    { id: "bimestre2", label: "2º Bimestre" },
    { id: "recuperacao1", label: "Recuperação 1" },
    { id: "bimestre3", label: "3º Bimestre" },
    { id: "bimestre4", label: "4º Bimestre" },
    { id: "recuperacao2", label: "Recuperação 2" },
  ];

  const ordemManualDisciplinas = ['Português', 'Matemática', 'Ciências', 'História', 'Geografia', 'Artes', 'Inglês', 'Música', 'Xadrez', 'Ed.Física'];

  useEffect(() => {
    async function inicializar() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");

      const email = user.email || "";
      setUserEmail(email);

      const { data: funcData } = await supabase.from('funcionarios').select('nome').eq('email', email).single();
      const nomeDoProf = funcData?.nome || "";
      setNomeLogado(nomeDoProf);

      const { data: perfil } = await supabase.from('perfis').select('cargo').eq('id', user.id).single();
      const adminVerificado = email === 'carlamonaliza9@gmail.com' || email === 'diretoria@abcdopark.com' || perfil?.cargo === 'Admin';
      setEhAdmin(adminVerificado);

      if (adminVerificado) {
        const nomesTurmas = ["Maternal", "Jardim I", "Jardim II", "1º Ano", "2º Ano", "3º Ano", "4º Ano", "5º Ano"];
        setListaTurmas(nomesTurmas);
      } else {
        if (nomeDoProf) {
            const { data: turmasDoProf } = await supabase
              .from('turma_disciplinas')
              .select('nome_turma')
              .eq('professor_vinculado', nomeDoProf)
              .eq('ano', '2026');

            if (turmasDoProf && turmasDoProf.length > 0) {
              const nomesUnicos = Array.from(new Set(turmasDoProf.map(t => t.nome_turma)));
              setListaTurmas(nomesUnicos);
              if (nomesUnicos.length === 1) setTurmaSelecionada(nomesUnicos[0]);
            }
        }
      }
      setCarregando(false);
    }
    inicializar();
  }, [router]);

  useEffect(() => {
    async function buscarMateriasDaTurma() {
      if (!turmaSelecionada) {
        setTodasDisciplinas([]);
        setMinhasDisciplinasPermitidas([]);
        return;
      }
      
      const { data: discData } = await supabase
        .from('turma_disciplinas')
        .select('disciplina, professor_vinculado')
        .eq('nome_turma', turmaSelecionada)
        .eq('ano', '2026');
      
      if (discData && discData.length > 0) {
        const discOrdenadas = discData.sort((a, b) => {
          const idxA = ordemManualDisciplinas.indexOf(a.disciplina);
          const idxB = ordemManualDisciplinas.indexOf(b.disciplina);
          return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
        });

        setTodasDisciplinas(discOrdenadas);

        if (ehAdmin) {
          setMinhasDisciplinasPermitidas(discOrdenadas.map(d => d.disciplina));
        } else {
          const permitidas = discOrdenadas
            .filter(d => d.professor_vinculado === nomeLogado)
            .map(d => d.disciplina);
          setMinhasDisciplinasPermitidas(permitidas);
        }
      } else {
        setTodasDisciplinas([]);
        setMinhasDisciplinasPermitidas([]);
      }
    }
    buscarMateriasDaTurma();
  }, [turmaSelecionada, ehAdmin, nomeLogado]);

  useEffect(() => {
    async function carregarDadosLancamento() {
      if (!turmaSelecionada || todasDisciplinas.length === 0) return;

      setCarregando(true);
      const { data: listaAlunos } = await supabase
        .from('alunos')
        .select('id, nome, foto_url')
        .eq('turma', turmaSelecionada)
        .order('nome', { ascending: true });

      if (listaAlunos) {
        setAlunos(listaAlunos);

        const listaIds = listaAlunos.map(a => a.id);
        const { data: notasData } = await supabase
          .from('boletins')
          .select('*')
          .in('aluno_id', listaIds)
          .eq('ano', '2026');

        const mapaNotas: { [alunoId: string]: { [disciplina: string]: string } } = {};
        
        listaAlunos.forEach(aluno => {
          mapaNotas[String(aluno.id)] = {};
          todasDisciplinas.forEach(d => {
            mapaNotas[String(aluno.id)][d.disciplina] = "";
          });
        });

        if (notasData) {
          notasData.forEach((notaBD: any) => {
             const valor = notaBD[bimestreSelecionado as keyof typeof notaBD];
             if (mapaNotas[String(notaBD.aluno_id)]) {
                 mapaNotas[String(notaBD.aluno_id)][notaBD.disciplina] = valor !== null ? String(valor) : "";
             }
          });
        }

        setNotasLocais(mapaNotas);
        setNotasOriginais(JSON.parse(JSON.stringify(mapaNotas)));
      }
      setCarregando(false);
    }

    if (turmaSelecionada && todasDisciplinas.length > 0) {
      carregarDadosLancamento();
    } else {
      setAlunos([]);
      setNotasLocais({});
      setNotasOriginais({});
    }
  }, [turmaSelecionada, todasDisciplinas, bimestreSelecionado]);

  const handleNotaChange = (alunoId: string, disciplina: string, valor: string) => {
    setNotasLocais(prev => ({
      ...prev,
      [alunoId]: {
        ...prev[alunoId],
        [disciplina]: valor.replace(',', '.')
      }
    }));
  };

  async function registrarLog(acao: string, detalhes: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('logs_sistema').insert([{ usuario_email: user.email, acao: acao, tabela: 'boletins', detalhes: detalhes }]);
      }
    } catch (e) { console.error("Erro ao gerar log:", e); }
  }

  async function salvarNotas() {
    setSalvando(true);
    try {
      const operacoesUpsert: any[] = [];
      const mudancasOcorridas: string[] = [];
      let temAlteracaoReal = false;

      for (const alunoId of Object.keys(notasLocais)) {
        for (const disciplina of Object.keys(notasLocais[alunoId])) {
          
          if (!minhasDisciplinasPermitidas.includes(disciplina)) continue;

          const valorNotaStr = notasLocais[alunoId][disciplina];
          const valorNotaNum = valorNotaStr === "" ? null : parseFloat(valorNotaStr);
          const valorAntigo = notasOriginais[alunoId]?.[disciplina] || "";

          if (valorAntigo !== valorNotaStr) {
            temAlteracaoReal = true;
            const nomeAluno = alunos.find(a => String(a.id) === alunoId)?.nome || `ID ${alunoId}`;
            const exibAntes = valorAntigo === "" ? "(S/N)" : valorAntigo;
            const exibDepois = valorNotaStr === "" ? "(Excluída)" : valorNotaStr;
            
            mudancasOcorridas.push(`• ${nomeAluno} (${disciplina}): ${exibAntes} ➔ ${exibDepois}`);

            operacoesUpsert.push({
              aluno_id: parseInt(alunoId),
              disciplina: disciplina,
              ano: "2026",
              [bimestreSelecionado]: valorNotaNum
            });
          }
        }
      }
      
      if (operacoesUpsert.length > 0) {
        const { error } = await supabase.from('boletins').upsert(operacoesUpsert, { onConflict: 'aluno_id, disciplina, year' });
        if (error) throw error;
      }
      
      if (temAlteracaoReal) {
        const bLabel = colunasAvaliacao.find(col => col.id === bimestreSelecionado)?.label || bimestreSelecionado;
        await registrarLog("EDIÇÃO", `📊 Alterou Pauta Matriz - Turma ${turmaSelecionada} (${bLabel}):\n` + mudancasOcorridas.join('\n'));
      }

      setNotasOriginais(JSON.parse(JSON.stringify(notasLocais)));
      alert("Pauta salva com sucesso!");
    } catch (err: any) {
      alert("Erro ao salvar: " + err.message);
    } finally {
      setSalvando(false);
    }
  }

  // FUNÇÃO 1: GERA O PDF APENAS DA TURMA QUE ESTÁ ATUALMENTE SELECIONADA NA TELA
  const gerarPDFTurmaAtual = (docExistente?: jsPDF) => {
    if (alunos.length === 0 || todasDisciplinas.length === 0) {
      alert("Não há dados carregados na tela para gerar este PDF.");
      return;
    }

    const doc = docExistente || new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const bimestreLabel = colunasAvaliacao.find(col => col.id === bimestreSelecionado)?.label || bimestreSelecionado;

    // Cabeçalho da página
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59); 
    doc.text("Pauta de Avaliações", 14, 15);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); 
    doc.text(`Turma: ${turmaSelecionada}   |   Período: ${bimestreLabel}   |   Ano Letivo: 2026`, 14, 22);
    doc.text(`Emitido em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR", {hour: '2-digit', minute:'2-digit'})}`, 14, 27);

    const colunasTabela = ["Aluno", ...todasDisciplinas.map(d => d.disciplina)];
    const linhasTabela = alunos.map(aluno => {
      const linha = [aluno.nome];
      todasDisciplinas.forEach(disc => {
        const nota = notasLocais[String(aluno.id)]?.[disc.disciplina] || "--";
        linha.push(nota);
      });
      return linha;
    });

    autoTable(doc, {
      startY: 32,
      head: [colunasTabela],
      body: linhasTabela,
      theme: "striped",
      headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontSize: 9, fontStyle: "bold", halign: "center" },
      styles: { fontSize: 9, cellPadding: 2.5, valign: "middle" },
      columnStyles: { 0: { halign: "left", fontStyle: "bold", cellWidth: 55 } },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index > 0) {
          data.cell.styles.halign = "center";
          const notaNum = parseFloat(data.cell.text[0]);
          if (!isNaN(notaNum) && notaNum < 7) {
            data.cell.styles.textColor = [225, 29, 72]; 
            data.cell.styles.fontStyle = "bold";
          }
        }
      },
    });

    if (!docExistente) {
      const nomeArquivo = `Pauta_${turmaSelecionada.replace(/\s+/g, "_")}_${bimestreSelecionado}.pdf`;
      doc.save(nomeArquivo);
    }
  };

  // FUNÇÃO 2: MAPEIA TODAS AS TURMAS DISPONÍVEIS E GERA UM ÚNICO DOCUMENTO COMPLETO
  const gerarPDFGeral = async () => {
    if (listaTurmas.length === 0) return;
    
    setGerandoPDF(true);
    setMostrarModalPDF(false);

    try {
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const bimestreLabel = colunasAvaliacao.find(col => col.id === bimestreSelecionado)?.label || bimestreSelecionado;

      // Percorre assincronamente cada uma das turmas permitidas
      for (let i = 0; i < listaTurmas.length; i++) {
        const turma = listaTurmas[i];

        // Se não for a primeira iteração, quebra a página no mesmo arquivo
        if (i > 0) doc.addPage("a4", "landscape");

        // 1. Busca matérias da turma da vez
        const { data: discData } = await supabase
          .from('turma_disciplinas')
          .select('disciplina')
          .eq('nome_turma', turma)
          .eq('ano', '2026');

        if (!discData || discData.length === 0) {
          // Se a turma não tiver matérias, desenha aviso básico e pula
          doc.setFont("Helvetica", "bold");
          doc.setFontSize(14);
          doc.text(`Turma: ${turma} (Nenhuma disciplina cadastrada)`, 14, 20);
          continue;
        }

        const discOrdenadas = discData.sort((a, b) => {
          const idxA = ordemManualDisciplinas.indexOf(a.disciplina);
          const idxB = ordemManualDisciplinas.indexOf(b.disciplina);
          return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
        });

        // 2. Busca alunos da turma da vez
        const { data: listaAlunos } = await supabase
          .from('alunos')
          .select('id, nome')
          .eq('turma', turma)
          .order('nome', { ascending: true });

        if (!listaAlunos || listaAlunos.length === 0) {
          doc.setFont("Helvetica", "bold");
          doc.setFontSize(14);
          doc.text(`Turma: ${turma} (Nenhum aluno matriculado)`, 14, 20);
          continue;
        }

        // 3. Busca notas dos alunos encontrados
        const listaIds = listaAlunos.map(a => a.id);
        const { data: notasData } = await supabase
          .from('boletins')
          .select('*')
          .in('aluno_id', listaIds)
          .eq('ano', '2026');

        // 4. Monta matriz temporária para a impressão
        const mapaNotasTemp: { [alunoId: string]: { [disciplina: string]: string } } = {};
        listaAlunos.forEach(aluno => {
          mapaNotasTemp[String(aluno.id)] = {};
          discOrdenadas.forEach(d => { mapaNotasTemp[String(aluno.id)][d.disciplina] = ""; });
        });

        if (notasData) {
          notasData.forEach((notaBD: any) => {
             const valor = notaBD[bimestreSelecionado as keyof typeof notaBD];
             if (mapaNotasTemp[String(notaBD.aluno_id)]) {
                 mapaNotasTemp[String(notaBD.aluno_id)][notaBD.disciplina] = valor !== null ? String(valor) : "";
             }
          });
        }

        // 5. Renderiza o cabeçalho desta página específica da turma
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(18);
        doc.setTextColor(30, 41, 59); 
        doc.text("Pauta de Avaliações - Relatório Geral", 14, 15);

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139); 
        doc.text(`Turma: ${turma}   |   Período: ${bimestreLabel}   |   Ano Letivo: 2026`, 14, 22);
        doc.text(`Emitido em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR", {hour: '2-digit', minute:'2-digit'})}`, 14, 27);

        const colunasTabela = ["Aluno", ...discOrdenadas.map(d => d.disciplina)];
        const linhasTabela = listaAlunos.map(aluno => {
          const linha = [aluno.nome];
          discOrdenadas.forEach(d => {
            linha.push(mapaNotasTemp[String(aluno.id)]?.[d.disciplina] || "--");
          });
          return linha;
        });

        autoTable(doc, {
          startY: 32,
          head: [colunasTabela],
          body: linhasTabela,
          theme: "striped",
          headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontSize: 9, fontStyle: "bold", halign: "center" }, // Cor slate-600 para diferenciar do individual
          styles: { fontSize: 9, cellPadding: 2.5, valign: "middle" },
          columnStyles: { 0: { halign: "left", fontStyle: "bold", cellWidth: 55 } },
          didParseCell: (data) => {
            if (data.section === "body" && data.column.index > 0) {
              data.cell.styles.halign = "center";
              const notaNum = parseFloat(data.cell.text[0]);
              if (!isNaN(notaNum) && notaNum < 7) {
                data.cell.styles.textColor = [225, 29, 72]; 
                data.cell.styles.fontStyle = "bold";
              }
            }
          },
        });
      }

      doc.save(`Pauta_Geral_Completa_${bimestreSelecionado}.pdf`);
    } catch (e) {
      console.error(e);
      alert("Erro ao processar pauta global.");
    } finally {
      setGerandoPDF(false);
    }
  };

  // Acionador principal do botão de PDF
  const handleBotaoPDFAcionado = () => {
    if (listaTurmas.length > 1) {
      setMostrarModalPDF(true); // Se tiver mais de uma turma abre o Modal de Opções
    } else {
      gerarPDFTurmaAtual(); // Se tiver só uma, baixa direto
    }
  };

  if (carregando && alunos.length === 0 && listaTurmas.length === 0) return (
    <div className="min-h-screen bg-white md:bg-[#f4f7f9] flex flex-col items-center justify-center text-blue-600 gap-3">
      <Loader2 size={32} className="animate-spin" strokeWidth={3} />
      <span className="font-bold uppercase tracking-widest text-xs">Sincronizando Matriz...</span>
    </div>
  );

  return (
    <div className="animate-in fade-in duration-500 w-full relative min-h-screen md:bg-[#e0ffff] overflow-x-hidden">

      <div className="w-full max-w-[1600px] mx-auto flex flex-col md:gap-6 pb-24 md:pb-10">
        
        {/* ============================================== */}
        {/* HEADER & FILTROS */}
        {/* ============================================== */}
        <header className="bg-white md:rounded-[2rem] px-4 pt-4 pb-4 md:p-8 md:shadow-sm border-b md:border md:border-slate-100 flex flex-col xl:flex-row xl:items-center justify-between gap-4 md:gap-6">
          <div className="flex flex-col">
            <h1 className="text-2xl md:text-4xl font-black text-slate-800 tracking-tighter m-0 flex items-center gap-2 md:gap-3">
              <span className="bg-blue-100 text-blue-600 p-2 md:p-2.5 rounded-xl md:rounded-2xl shrink-0">
                <BookOpenCheck className="w-6 h-6 md:w-7 md:h-7" strokeWidth={2.5}/>
              </span> 
              Avaliações
            </h1>
            <p className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mt-2 md:mt-3">
              {ehAdmin ? "Administração Global (Acesso Total)" : `Portal do Professor • ${nomeLogado}`}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 md:bg-slate-50 md:p-4 md:rounded-2xl md:border md:border-slate-100 w-full xl:w-auto">
            
            {/* Seletor de Turma */}
            <div className="flex flex-col gap-1.5 flex-1 xl:w-60">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Minhas Turmas</label>
              {(ehAdmin || listaTurmas.length > 1) ? (
                <select 
                  value={turmaSelecionada} 
                  onChange={(e) => setTurmaSelecionada(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 md:bg-white bg-slate-50 text-slate-700 font-bold outline-none focus:ring-2 focus:ring-blue-100 md:focus:border-blue-400 transition-colors shadow-sm md:shadow-sm"
                >
                  <option value="">Escolha uma turma...</option>
                  {listaTurmas.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              ) : (
                <div className="w-full px-4 py-3 rounded-xl bg-slate-50 md:bg-white border border-slate-200 font-bold text-slate-700 shadow-sm md:shadow-sm truncate">
                  {turmaSelecionada || "Nenhuma turma vinculada"}
                </div>
              )}
            </div>

            {/* Seletor de Bimestre */}
            <div className="flex flex-col gap-1.5 flex-1 xl:w-48">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Período Letivo</label>
              <select 
                value={bimestreSelecionado} 
                onChange={(e) => setBimestreSelecionado(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 md:bg-white bg-slate-50 text-slate-700 font-bold outline-none focus:ring-2 focus:ring-blue-100 md:focus:border-blue-400 transition-colors shadow-sm md:shadow-sm"
              >
                {colunasAvaliacao.map(col => <option key={col.id} value={col.id}>{col.label}</option>)}
              </select>
            </div>

          </div>
        </header>

        {/* ============================================== */}
        {/* MATRIZ DE NOTAS (TABELA DE DADOS) */}
        {/* ============================================== */}
        {turmaSelecionada && todasDisciplinas.length > 0 ? (
          <div className="bg-white md:rounded-[2rem] md:shadow-sm border-t border-b md:border md:border-slate-100 overflow-hidden relative flex flex-col flex-1">
            
            {/* Overlay de Carregamento Transparente */}
            {(carregando || gerandoPDF) && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-2">
                <Loader2 size={40} className="animate-spin text-blue-600" />
                {gerandoPDF && <span className="font-bold text-xs text-blue-700 uppercase tracking-wider animate-pulse">Compilando relatório de pautas globais...</span>}
              </div>
            )}

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-30">
                  <tr>
                    <th className="p-3 md:p-5 font-black text-[10px] md:text-xs text-slate-400 uppercase tracking-widest min-w-[150px] md:min-w-[250px] sticky left-0 bg-slate-50 z-40 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                      Aluno
                    </th>
                    {todasDisciplinas.map(disc => {
                      const permiteEdicao = minhasDisciplinasPermitidas.includes(disc.disciplina);
                      return (
                        <th key={disc.disciplina} className="p-3 md:p-4 text-center min-w-[90px] md:min-w-[110px]">
                          <div className="flex flex-col items-center gap-1.5">
                            <span className={`text-[9px] md:text-[10px] font-black uppercase tracking-wider ${permiteEdicao ? 'text-blue-600' : 'text-slate-400'}`}>
                              {disc.disciplina}
                            </span>
                            {!permiteEdicao && (
                              <span title="Sem permissão de edição">
                                <Lock size={12} className="text-slate-300" />
                              </span>
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {alunos.map(aluno => (
                    <tr key={aluno.id} className="hover:bg-slate-50/50 transition-colors group">
                      
                      <td className="p-3 md:p-4 sticky left-0 bg-white group-hover:bg-slate-50/50 transition-colors z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                        <div className="flex items-center gap-2 md:gap-3">
                          <div className="w-7 h-7 md:w-9 md:h-9 rounded-full bg-slate-100 border border-slate-200 overflow-hidden shrink-0 hidden sm:flex items-center justify-center">
                            {aluno.foto_url ? <img src={aluno.foto_url} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center font-black text-slate-400 text-[10px] md:text-xs">{aluno.nome.charAt(0)}</div>}
                          </div>
                          <span className="text-xs md:text-sm font-bold text-slate-700 line-clamp-1">{aluno.nome}</span>
                        </div>
                      </td>

                      {todasDisciplinas.map(disc => {
                        const permiteEdicao = minhasDisciplinasPermitidas.includes(disc.disciplina);
                        const notaAtualStr = notasLocais[String(aluno.id)]?.[disc.disciplina] || "";
                        const notaOriginalStr = notasOriginais[String(aluno.id)]?.[disc.disciplina] || "";
                        const foiAlterada = notaAtualStr !== notaOriginalStr;
                        const isVermelha = notaAtualStr !== "" && parseFloat(notaAtualStr) < 7;

                        return (
                          <td key={disc.disciplina} className="p-2 md:p-3 text-center relative">
                            {foiAlterada && <div className="absolute top-1 md:top-2 right-2 md:right-4 w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" title="Nota não salva"></div>}
                            
                            <input 
                              type="text"
                              inputMode="decimal"
                              disabled={!permiteEdicao}
                              value={notaAtualStr}
                              onChange={(e) => handleNotaChange(String(aluno.id), disc.disciplina, e.target.value)}
                              placeholder="--"
                              className={`w-14 h-9 md:w-16 md:h-10 text-center rounded-xl font-black text-xs md:text-sm outline-none transition-all ${
                                !permiteEdicao 
                                  ? 'bg-slate-100/50 border border-transparent text-slate-400 cursor-not-allowed' 
                                  : isVermelha 
                                    ? 'border-2 border-rose-200 bg-rose-50 text-rose-600 focus:border-rose-400 md:shadow-inner' 
                                    : 'border-2 border-slate-200 bg-white text-blue-700 focus:border-blue-400 md:shadow-inner' 
                              }`}
                              title={!permiteEdicao ? `Apenas o professor de ${disc.disciplina} pode editar` : "Digite a nota"}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>

              </table>
            </div>

            {/* BARRA INFERIOR DE AÇÕES */}
            <div className="bg-white md:bg-slate-50 border-t border-slate-100 md:border-slate-200 p-4 md:p-5 flex flex-col sm:flex-row justify-center md:justify-end gap-3 sticky bottom-0 z-50 shadow-[0_-4px_10px_-1px_rgba(0,0,0,0.05)] md:shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              
              {/* BOTÃO: Gerar PDF */}
              <button 
                type="button"
                onClick={handleBotaoPDFAcionado}
                disabled={gerandoPDF || alunos.length === 0}
                className={`w-full md:w-auto px-6 py-3.5 rounded-xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 border-2 ${
                  (gerandoPDF || alunos.length === 0)
                    ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' 
                    : 'bg-white border-blue-600 text-blue-600 hover:bg-blue-50 active:scale-95 shadow-sm'
                }`}
              >
                <FileDown size={20} strokeWidth={2.5} />
                Gerar PDF
              </button>

              {/* BOTÃO: Salvar Pauta */}
              <button 
                onClick={salvarNotas}
                disabled={salvando || minhasDisciplinasPermitidas.length === 0}
                className={`w-full md:w-auto px-8 py-3.5 rounded-xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${
                  (salvando || minhasDisciplinasPermitidas.length === 0)
                    ? 'bg-slate-200 md:bg-slate-300 text-slate-400 md:text-slate-50 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 active:scale-95'
                }`}
              >
                {salvando ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} strokeWidth={2.5} />}
                {salvando ? "A salvar..." : "Salvar Pauta"}
              </button>

            </div>
            
          </div>
        ) : (
          <div className="bg-white md:rounded-[2.5rem] p-8 md:p-10 text-center border-y md:border md:border-slate-50 md:shadow-sm mt-4 md:mt-8">
            <p className="text-[10px] md:text-xs font-black uppercase text-slate-400 tracking-widest">
              {!turmaSelecionada 
                ? "Selecione uma turma para visualizar a matriz de pautas." 
                : "Nenhuma disciplina cadastrada para esta turma."}
            </p>
          </div>
        )}

      </div>

      {/* ============================================== */}
      {/* MODAL INTERATIVO DE SELEÇÃO DO ESCOPO DO PDF   */}
      {/* ============================================== */}
      {mostrarModalPDF && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-md p-6 md:p-8 shadow-2xl border border-slate-100 flex flex-col relative scale-in duration-200">
            
            <button 
              onClick={() => setMostrarModalPDF(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 rounded-xl p-1 transition-colors hover:bg-slate-50"
            >
              <X size={20} strokeWidth={2.5} />
            </button>

            <div className="flex flex-col items-center text-center mt-2">
              <div className="bg-blue-50 text-blue-600 p-3.5 rounded-2xl mb-4">
                <FileDown size={28} strokeWidth={2.5} />
              </div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Exportar Pauta de Notas</h3>
              <p className="text-xs font-medium text-slate-500 mt-1 max-w-[280px]">
                Escolha o formato e a abrangência do relatório para impressão.
              </p>
            </div>

            <div className="flex flex-col gap-3 mt-6">
              
              {/* Opção 1: Individual */}
              <button
                type="button"
                onClick={() => { setMostrarModalPDF(false); gerarPDFTurmaAtual(); }}
                className="flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-100 hover:border-blue-100 hover:bg-blue-50/30 transition-all text-left active:scale-[0.98] group"
              >
                <div className="p-2 rounded-xl bg-slate-100 text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                  <Layout size={20} strokeWidth={2.5} />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-black text-slate-700 group-hover:text-blue-900 transition-colors">Apenas Turma Atual</span>
                  <span className="text-[11px] font-bold text-slate-400 uppercase mt-0.5 tracking-wider">{turmaSelecionada}</span>
                </div>
              </button>

              {/* Opção 2: Geral */}
              <button
                type="button"
                onClick={gerarPDFGeral}
                className="flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-100 hover:border-slate-300 hover:bg-slate-50 transition-all text-left active:scale-[0.98] group"
              >
                <div className="p-2 rounded-xl bg-slate-100 text-slate-600 group-hover:bg-slate-200 group-hover:text-slate-800 transition-colors">
                  <Layers size={20} strokeWidth={2.5} />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-black text-slate-700">Relatório Geral Completo</span>
                  <span className="text-[11px] font-bold text-slate-400 uppercase mt-0.5 tracking-wider">Todas as ({listaTurmas.length}) turmas em 1 único arquivo</span>
                </div>
              </button>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}