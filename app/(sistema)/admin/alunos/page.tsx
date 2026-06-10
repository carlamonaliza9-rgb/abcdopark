"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { AlunosHeader } from "@/app/(sistema)/dashboard/alunos/_components/AlunosHeader";
import { AlunoCard } from "@/app/(sistema)/dashboard/alunos/_components/AlunoCard";
import { FichaAlunoModal } from "@/app/(sistema)/dashboard/alunos/_components/FichaAlunoModal";
import { FormAlunoModal } from "@/app/(sistema)/dashboard/alunos/_components/FormAlunoModal";
import { ModalPagamento } from "@/app/(sistema)/dashboard/financeiro/_components/ModalPagamento";

export default function AlunosAdminPage() {
  const router = useRouter();
  const [modalAberto, setModalAberto] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [alunos, setAlunos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [verificandoAcesso, setVerificandoAcesso] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [cargo, setCargo] = useState<string | null>(null); 
  const [busca, setBusca] = useState("");
  
  // ESTADO DO CAIXA DO PDV
  const [caixaAtual, setCaixaAtual] = useState<any>(null);

  // --- ESTADOS DOS CAMPOS ---
  const [idEdicao, setIdEdicao] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [cpfAluno, setCpfAluno] = useState("");
  const [turma, setTurma] = useState("");
  const [turno, setTurno] = useState("");

  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState("");
  const [numero, setNumero] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  
  const [responsavel, setResponsavel] = useState("");
  const [parentesco1, setParentesco1] = useState("Mãe");
  const [cpfResponsavel, setCpfResponsavel] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [emailResponsavel, setEmailResponsavel] = useState("");
  const [profissaoResponsavel, setProfissaoResponsavel] = useState(""); 
  
  const [responsavel2, setResponsavel2] = useState("");
  const [parentesco2, setParentesco2] = useState("Pai");
  const [cpfResponsavel2, setCpfResponsavel2] = useState("");
  const [whatsapp2, setWhatsapp2] = useState("");
  const [emailResponsavel2, setEmailResponsavel2] = useState("");
  const [profissaoResponsavel2, setProfissaoResponsavel2] = useState(""); 

  const [responsavel3, setResponsavel3] = useState("");
  const [parentesco3, setParentesco3] = useState("");
  const [whatsapp3, setWhatsapp3] = useState("");
  const [emailResponsavel3, setEmailResponsavel3] = useState("");

  const [valor, setValor] = useState("");
  const [vencimento, setVencimento] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [temAlergia, setTemAlergia] = useState(false);
  const [alergiaDescricao, setAlergiaDescricao] = useState("");
  const [eAutista, setEAutista] = useState(false);
  const [observacoes, setObservacoes] = useState(""); 
  const [arquivoFoto, setArquivoFoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [historico, setHistorico] = useState<any[]>([]);
  const [verHistorico, setVerHistorico] = useState(false);
  const [verBoletim, setVerBoletim] = useState(false);
  const [notes, setNotas] = useState<any[]>([]);
  const [anoBoletimAtivo, setAnoBoletimAtivo] = useState("2026"); 

  const [modalPgtoAberto, setModalPgtoAberto] = useState(false);
  const [idPagamentoEdicao, setIdPagamentoEdicao] = useState<string | null>(null);
  const [dataPagamento, setDataPagamento] = useState("");
  const [tipoPagamento, setTipoPagamento] = useState("mensalidade");
  const [descricaoOutro, setDescricaoOutro] = useState("");
  const [mesReferencia, setMesReferencia] = useState("");
  
  const [pagamentosMetodos, setPagamentosMetodos] = useState<any>({ 
    pix: "", dinheiro: "", credito: "", debito: "", boleto: "", credito_aluno: "", multa: "", desconto: "", juros_cartao: "", parcelas: "1" 
  });

  const SENHA_MESTRA = "1234";
  const mesesAno = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  
  const ehVisitante = cargo === "Visitante"; 

  useEffect(() => { 
    async function verificarAcesso() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");

      setUserEmail(user.email || null);
      
      const { data: perfil } = await supabase.from('perfis').select('cargo').eq('id', user.id).single();
      const cargoAtual = perfil?.cargo || null;
      setCargo(cargoAtual);
      
      const temAcesso = cargoAtual === 'Admin' || cargoAtual === 'Visitante';
      if (!temAcesso) return router.push("/dashboard");

      await buscarAlunos();
      
      // BUSCA O CAIXA ABERTO NO PDV
      const { data: sessoesAtivas } = await supabase.from('sessoes_caixa').select('*').eq('status', 'aberto').order('data_abertura', { ascending: false }).limit(1);
      setCaixaAtual(sessoesAtivas && sessoesAtivas.length > 0 ? sessoesAtivas[0] : null);

      setVerificandoAcesso(false);
    }
    verificarAcesso();
  }, [router]);

  const mWhatsApp = (v: string) => {
    if (!v) return "";
    v = v.replace(/\D/g, "");
    if (v.length <= 11) {
      v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
      v = v.replace(/(\d{5})(\d)/, "$1-$2");
    }
    return v;
  };

  const mCPF = (v: string) => {
    if (!v) return "";
    v = v.replace(/\D/g, "");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    return v;
  };

  const calcularIdade = (dataNasc: string) => {
    if (!dataNasc) return "--";
    const hoje = new Date();
    const nacimiento = new Date(dataNasc);
    let idade = hoje.getFullYear() - nacimiento.getFullYear();
    const m = hoje.getMonth() - nacimiento.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nacimiento.getDate())) idade--;
    return `${idade} ${idade === 1 ? 'ano' : 'anos'}`;
  };

  const obterCorTurma = (turmaNome: string) => {
    const cores: any = { 
      "Maternal": "#B9E2F5", "Jardim I": "#C2F0D5", "Jardim II": "#F7C8E0",
      "1º Ano": "#D7C0F0", "2º Ano": "#F9D9B4", "3º Ano": "#C5C5FC",
      "4º Ano": "#B4EAEA", "5º Ano": "#F9E89D"
    };
    return cores[turmaNome] || "#ffffff";
  };

  async function buscarAlunos() {
    const { data } = await supabase.from('alunos').select('*').order('nome', { ascending: true });
    if (data) setAlunos(data);
  }

  const alunosFiltrados = alunos.filter(aluno => 
    aluno.nome?.toLowerCase().includes(busca.toLowerCase())
  );

  const aplicarOrdenacaoManual = (lista: any[]) => {
    const ordemManual = ['Português', 'Matemática', 'Ciências', 'História', 'Geografia', 'Artes', 'Inglês', 'Música', 'Xadrez', 'Ed.Física'];
    return [...lista].sort((a, b) => {
      const indexA = ordemManual.indexOf(a.disciplina);
      const indexB = ordemManual.indexOf(b.disciplina);
      return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
    });
  };

  async function buscarBoletim(alunoId: string, ano: string = "2026") {
    setAnoBoletimAtivo(ano);

    const { data: disciplinasPadrao } = await supabase
      .from('turma_disciplinas')
      .select('disciplina')
      .eq('nome_turma', turma)
      .eq('ano', ano);

    const { data: notasAtuais } = await supabase
      .from('boletins')
      .select('*')
      .eq('aluno_id', alunoId)
      .eq('ano', ano);

    let listaParaExibir = notasAtuais || [];

    if (disciplinasPadrao && disciplinasPadrao.length > 0) {
      const nomesExistentes = listaParaExibir.map(n => n.disciplina);
      const faltantes = disciplinasPadrao.filter(d => !nomesExistentes.includes(d.disciplina));

      if (faltantes.length > 0) {
        const novasLinhas = faltantes.map(f => ({
          aluno_id: alunoId,
          disciplina: f.disciplina,
          ano: ano
        }));

        await supabase.from('boletins').insert(novasLinhas);

        const { data: notasSincronizadas } = await supabase
          .from('boletins')
          .select('*')
          .eq('aluno_id', alunoId)
          .eq('ano', ano);
        
        if (notasSincronizadas) listaParaExibir = notasSincronizadas;
      }
    }

    setNotas(aplicarOrdenacaoManual(listaParaExibir));
    setVerBoletim(true); 
    setVerHistorico(false);
  }

  async function adicionarDisciplina() {
    const disc = prompt("Nome da Disciplina:");
    if (!disc || !idEdicao) return;
    const { data } = await supabase
      .from('boletins')
      .insert([{ aluno_id: idEdicao, disciplina: disc, ano: anoBoletimAtivo }])
      .select();
    if (data) {
      setNotas(aplicarOrdenacaoManual([...notes, data[0]]));
    }
  }

  async function salvarNota(id: string, campo: string, valorNota: string) {
    const v = valorNota === "" ? 0 : parseFloat(valorNota.replace(',', '.'));
    const notaAtual = notes.find(n => n.id === id);
    if (!notaAtual) return;
    const nCalculo = { ...notaAtual, [campo]: v };
    let n1 = parseFloat(nCalculo.bimestre1 || 0);
    let n2 = parseFloat(nCalculo.bimestre2 || 0);
    let r1 = parseFloat(nCalculo.recuperacao1 || 0);
    let n3 = parseFloat(nCalculo.bimestre3 || 0);
    let n4 = parseFloat(nCalculo.bimestre4 || 0);
    let r2 = parseFloat(nCalculo.recuperacao2 || 0);

    if (r1 > Math.min(n1, n2)) {
      if (n1 <= n2) n1 = r1; else n2 = r1;
    }
    if (r2 > Math.min(n3, n4)) {
      if (n3 <= n4) n3 = r2; else n4 = r2;
    }
    const novaMedia = parseFloat(((n1 + n2 + n3 + n4) / 4).toFixed(1));
    const { error } = await supabase.from('boletins').update({ [campo]: v, media: novaMedia }).eq('id', id);
    if (error) return console.error("Erro ao salvar:", error.message);
    setNotas(notes.map(n => n.id === id ? { ...n, [campo]: v, media: novaMedia } : n));
  }

  async function excluirDisciplina(id: string) {
    if (confirm("Remover esta disciplina?")) {
      await supabase.from('boletins').delete().eq('id', id);
      setNotas(notes.filter(n => n.id !== id));
    }
  }

  async function buscarHistoricoPagamento(alunoId: string, ano: string = "2026") {
    const { data, error } = await supabase
      .from('historico_pagamentos')
      .select('*')
      .eq('aluno_id', alunoId)
      .order('data_pagamento', { ascending: false });

    if (error) {
      console.error("Erro ao buscar histórico:", error.message);
      return;
    }

    if (data) {
      const historicoFiltrado = data.filter((h: any) => {
        const ref = h.mes_referencia ? h.mes_referencia.toLowerCase() : "";
        const desc = h.descricao ? h.descricao.toLowerCase() : "";
        const dataPgto = h.data_pagamento || "";

        if (ref.includes(ano)) return true;
        if (desc.includes(ano)) return true;
        if (!h.mes_referencia && dataPgto.startsWith(ano)) return true;

        return false;
      });
      setHistorico(historicoFiltrado);
    } else {
      setHistorico([]);
    }

    setVerHistorico(true); 
    setVerBoletim(false);
  }

  function gerarPDFHistorico() {
    const extrairForma = (detalhes: any) => {
      if (!detalhes) return "-";
      const metodos = Object.keys(detalhes).filter(key => parseFloat(detalhes[key]) > 0);
      return metodos.length > 0 ? metodos.join(" + ").toUpperCase() : "-";
    };

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("EXTRATO FINANCEIRO - ESCOLA ABC DO PARK", 105, 20, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Aluno: ${nome.toUpperCase()}`, 15, 35);
    autoTable(doc, {
      startY: 45,
      head: [['DATA', 'DESCRIÇÃO', 'FORMA', 'VALOR']],
      body: historico.map(h => [
        new Date(h.data_pagamento).toLocaleDateString('pt-BR', {timeZone: 'UTC'}),
        h.descricao.toUpperCase(),
        extrairForma(h.detalhes_metodos),
        `R$ ${h.valor_total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      ]),
      headStyles: { fillColor: [37, 99, 235] }
    });
    doc.save(`Extrato_${nome.replace(/\s+/g, '_')}.pdf`);
  }

  function gerarPDFBoletim() {
    const doc = new jsPDF();
    const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    
    const logoUrl = "https://mnmakhazghgncqummksu.supabase.co/storage/v1/object/public/assets/logo.png";
    const carimboEscolaUrl = "https://mnmakhazghgncqummksu.supabase.co/storage/v1/object/public/assets/Carimbo%20Escola.png";
    const carimboSuellenUrl = "https://mnmakhazghgncqummksu.supabase.co/storage/v1/object/public/assets/Carimbo%20Suellen.png";

    try {
      doc.saveGraphicsState();
      const gState = new (doc as any).GState({ opacity: 0.05 });
      doc.setGState(gState);
      doc.addImage(logoUrl, "PNG", 30, 80, 150, 150, undefined, 'FAST'); 
      doc.restoreGraphicsState();
    } catch (e) {}

    try { 
      doc.addImage(logoUrl, "PNG", 20, 10, 35, 35); 
    } catch (e) {}

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

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(`BOLETIM ESCOLAR OFICIAL - ${anoBoletimAtivo}`, 105, 65, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("DADOS DO ALUNO(A):", 20, 75);
    doc.setFont("helvetica", "normal");
    doc.text(`Nome: ${nome.toUpperCase()}`, 20, 82);
    doc.text(`Turma: ${turma}`, 20, 87);
    doc.text(`Responsável: ${responsavel.toUpperCase() || "NÃO INFORMADO"}`, 20, 92);
    doc.text(`Nascimento: ${dataNascimento ? new Date(dataNascimento).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : "--"} (${calcularIdade(dataNascimento)})`, 20, 97);

    autoTable(doc, {
      startY: 105,
      head: [['DISCIPLINA', '1ºB', '2ºB', 'R1', '3ºB', '4ºB', 'R2', 'MÉD']],
      body: notes.map(n => [
        n.disciplina.toUpperCase(),
        n.bimestre1 ?? '-', n.bimestre2 ?? '-', n.recuperacao1 ?? '-',
        n.bimestre3 ?? '-', n.bimestre4 ?? '-', n.recuperacao2 ?? '-',
        n.media || '0.0'
      ]),
      theme: 'grid',
      headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold', halign: 'center' },
      styles: { fontSize: 8, halign: 'center' },
      columnStyles: { 0: { halign: 'left', fontStyle: 'bold', cellWidth: 50 } },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index > 0) {
          const valorNota = parseFloat(data.cell.raw as string);
          if (!isNaN(valorNota) && valorNota < 7) {
            data.cell.styles.textColor = [220, 38, 38]; 
          }
        }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Belém, ${hoje}.`, 20, finalY);

    try {
      doc.addImage(carimboEscolaUrl, "PNG", 120, finalY - 15, 75, 75);
    } catch (e) {}

    doc.setFont("helvetica", "bold");
    doc.text("Atenciosamente,", 20, finalY + 25);
    
    try {
      doc.addImage(carimboSuellenUrl, "PNG", 75, finalY + 25, 55, 25);
    } catch (e) {}

    doc.text("__________________________________________", 105, finalY + 55, { align: "center" });
    doc.text("Suellen C. S. Figueiredo", 105, finalY + 61, { align: "center" });
    doc.setFontSize(10);
    doc.text("DIRETORA / REG. 6235", 105, finalY + 67, { align: "center" });

    doc.save(`Boletim_${nome.replace(/\s+/g, '_')}_2026.pdf`);
  }

  const processarRecorteImagem = (arquivo: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = URL.createObjectURL(arquivo);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        
        const TAMANHO_ALVO = 300;
        canvas.width = TAMANHO_ALVO;
        canvas.height = TAMANHO_ALVO;

        if (ctx) {
          const menorDimensao = Math.min(img.width, img.height);
          const sWidth = menorDimensao;
          const sHeight = menorDimensao;
          const sx = (img.width - sWidth) / 2;
          const sy = (img.height - sHeight) / 2;

          ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, TAMANHO_ALVO, TAMANHO_ALVO);
        }
        
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else resolve(arquivo);
        }, "image/jpeg", 0.9);
      };
    });
  };

  async function salvarAluno(e: React.FormEvent) {
    if (ehVisitante) return;
    e.preventDefault();
    setCarregando(true);
    try {
      let urlFinal = previewUrl;
      
      if (arquivoFoto) {
        const imagemRecortadaBlob = await processarRecorteImagem(arquivoFoto);
        const nomeArquivo = `${Date.now()}_aluno_foto.jpg`;
        
        const { data, error: uploadError } = await supabase.storage
          .from('fotos-alunos')
          .upload(nomeArquivo, imagemRecortadaBlob, { contentType: 'image/jpeg' });
          
        if (uploadError) throw uploadError;
        if (data) urlFinal = supabase.storage.from('fotos-alunos').getPublicUrl(nomeArquivo).data.publicUrl;
      }
      
      const dadosParaEnviar = { 
        nome, cpf_aluno: cpfAluno, turma, turno,
        cep, endereco, numero, bairro, cidade, estado,
        responsavel, parentesco_1: parentesco1, whatsapp, cpf_responsavel: cpfResponsavel,
        email_responsavel: emailResponsavel,
        profissao_responsavel: profissaoResponsavel,
        responsavel_2_nome: responsavel2, parentesco_2: parentesco2, responsavel_2_contato: whatsapp2, cpf_responsavel_2: cpfResponsavel2,
        email_responsavel_2: emailResponsavel2,
        profissao_responsavel_2: profissaoResponsavel2,
        responsavel_3_nome: responsavel3, parentesco_3: parentesco3, responsavel_3_contato: whatsapp3,
        email_responsavel_3: emailResponsavel3,
        valor: valor ? parseFloat(valor.toString()) : null, vencimento, data_nascimento: dataNascimento,
        tem_alergia: temAlergia, alergia_descricao: temAlergia ? alergiaDescricao : "", e_autista: eAutista, 
        observacoes, foto_url: urlFinal
      };

      if (idEdicao) {
        const { error: errorUpdate } = await supabase.from('alunos').update(dadosParaEnviar).eq('id', idEdicao);
        if (errorUpdate) throw errorUpdate;
      } else {
        const { error: errorInsert } = await supabase.from('alunos').insert([{ ...dadosParaEnviar, status: 'pendente' }]);
        if (errorInsert) throw errorInsert;
      }

      setModalAberto(false); 
      setModoEdicao(false); 
      await buscarAlunos();
    } catch (error: any) { 
      alert("Erro ao salvar: " + (error.message || "Ocorreu um erro inesperado.")); 
    } finally { 
      setCarregando(false); 
    }
  }

  async function handleExcluirPagamento(idPgto: string) {
    const { data: pgto } = await supabase.from('historico_pagamentos').select('*').eq('id', idPgto).single();
    if (pgto?.tipo === 'mensalidade') {
      await supabase.from('alunos').update({ status: 'pendente' }).eq('id', idEdicao);
    }
    await supabase.from('historico_pagamentos').delete().eq('id', idPgto);
    buscarHistoricoPagamento(idEdicao!, "2026");
  }

  function handleEditarPagamento(pgto: any) {
    setIdPagamentoEdicao(pgto.id);
    setDataPagamento(pgto.data_pagamento);
    setTipoPagamento(pgto.tipo);
    setDescricaoOutro(pgto.descricao);
    
    setPagamentosMetodos(pgto.detalhes_metodos || { pix: "", dinheiro: "", credito: "", debito: "", boleto: "", credito_aluno: "", multa: "", desconto: "", juros_cartao: "", parcelas: "1" });
    setModalPgtoAberto(true);
  }

  async function handleSalvarPgtoEditado() {
    const limpa = (v: any) => parseFloat(String(v).replace(',', '.')) || 0;
    
    const somaRecebida = 
      limpa(pagamentosMetodos.pix) + 
      limpa(pagamentosMetodos.dinheiro) + 
      limpa(pagamentosMetodos.credito) + 
      limpa(pagamentosMetodos.debito) + 
      limpa(pagamentosMetodos.boleto) +
      limpa(pagamentosMetodos.credito_aluno);

    const { data: pgtoOriginal } = await supabase.from('historico_pagamentos').select('valor_total').eq('id', idPagamentoEdicao).single();
    const valorOriginalDaDivida = pgtoOriginal ? limpa(pgtoOriginal.valor_total) : somaRecebida;

    const totalDesconto = limpa(pagamentosMetodos.desconto);
    const devedorRestante = valorOriginalDaDivida - somaRecebida - totalDesconto;

    const novoStatus = devedorRestante <= 0.01 ? 'pago' : 'parcial';

    if (!caixaAtual) {
      return alert("ATENÇÃO: Não há nenhum Caixa Aberto! Vá ao módulo 'Frente de Caixa (PDV)' e abra o turno antes de realizar ou modificar pagamentos.");
    }

    const dados = { 
      tipo: tipoPagamento, 
      descricao: descricaoOutro, 
      valor_pago: somaRecebida, 
      status: novoStatus,
      data_pagamento: dataPagamento, 
      detalhes_metodos: pagamentosMetodos,
      caixa_id: caixaAtual.id 
    };
    
    await supabase.from('historico_pagamentos').update(dados).eq('id', idPagamentoEdicao);
    setModalPgtoAberto(false);
    buscarHistoricoPagamento(idEdicao!, "2026");
  }

  function limparEContinuar() {
    setIdEdicao(null); setNome(""); setCpfAluno(""); setTurma(""); setTurno("");
    setCep(""); setEndereco(""); setNumero(""); setBairro(""); setCidade(""); setEstado("");
    setResponsavel(""); setParentesco1("Mãe"); setCpfResponsavel(""); setWhatsapp(""); 
    setEmailResponsavel(""); setProfissaoResponsavel("");
    setResponsavel2(""); setParentesco2("Pai"); setCpfResponsavel2(""); setWhatsapp2(""); 
    setEmailResponsavel2(""); setProfissaoResponsavel2("");
    setResponsavel3(""); setParentesco3(""); setWhatsapp3("");
    setEmailResponsavel3("");
    setValor(""); setVencimento(""); setDataNascimento(""); setTemAlergia(false); setAlergiaDescricao("");
    setEAutista(false); setObservacoes(""); 
    setArquivoFoto(null); 
    setPreviewUrl(null);   
    setModoEdicao(true); setModalAberto(true);
  }

  function abrirFicha(aluno: any) {
    if (!ehVisitante) {
      router.push(`/admin/alunos/${aluno.id}`);
      return;
    }

    setIdEdicao(aluno.id); setNome(aluno.nome); setCpfAluno(aluno.cpf_aluno || ""); setTurma(aluno.turma); setTurno(aluno.turno || "");
    setCep(aluno.cep || ""); setEndereco(aluno.endereco || ""); setNumero(aluno.numero || ""); 
    setBairro(aluno.bairro || ""); setCidade(aluno.cidade || ""); setEstado(aluno.estado || "");
    setResponsavel(aluno.responsavel); setParentesco1(aluno.parentesco_1 || "Mãe"); 
    setCpfResponsavel(aluno.cpf_responsavel || ""); setWhatsapp(aluno.whatsapp);
    setEmailResponsavel(aluno.email_responsavel || "");
    setProfissaoResponsavel(aluno.profissao_responsavel || "");
    setResponsavel2(aluno.responsavel_2_nome || ""); setParentesco2(aluno.parentesco_2 || "Pai");
    setCpfResponsavel2(aluno.cpf_responsavel_2 || ""); setWhatsapp2(aluno.responsavel_2_contato || ""); 
    setEmailResponsavel2(aluno.email_responsavel_2 || "");
    setProfissaoResponsavel2(aluno.profissao_responsavel2 || "");
    setResponsavel3(aluno.responsavel_3_nome || ""); setParentesco3(aluno.parentesco_3 || ""); 
    setWhatsapp3(aluno.responsavel_3_contato || "");
    setEmailResponsavel3(aluno.email_responsavel_3 || "");
    setValor(aluno.valor?.toString() || ""); setVencimento(aluno.vencimento || ""); setDataNascimento(aluno.data_nascimento || "");
    setTemAlergia(aluno.tem_alergia || false); setAlergiaDescricao(aluno.alergia_descricao || "");
    setEAutista(aluno.e_autista || false); setObservacoes(aluno.observacoes || ""); setPreviewUrl(aluno.foto_url);
    setArquivoFoto(null); 
    setAnoBoletimAtivo("2026"); 
    setModoEdicao(false); setVerHistorico(false); setVerBoletim(false); setModalAberto(true);
  }

  if (verificandoAcesso) return <div className="p-10 text-center">Validando permissões...</div>;

  return (
    <div style={{ width: '100%', padding: 'clamp(10px, 3vw, 25px)', fontFamily: 'sans-serif', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      <AlunosHeader busca={busca} setBusca={setBusca} ehVisitante={ehVisitante} onNovoAluno={limparEContinuar} />

      {!ehVisitante && (
        <div style={{ marginBottom: '25px', display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            onClick={() => router.push('/admin/frequencia')}
            style={{ padding: '12px 24px', borderRadius: '12px', border: 'none', backgroundColor: '#eff6ff', color: '#2563eb', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '4px solid #dbeafe' }}
          >
            📊 Relatório de Frequência Geral
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '20px' }}>
        {alunosFiltrados.map((aluno) => (
          <AlunoCard key={aluno.id} aluno={aluno} obterCorTurma={obterCorTurma} mWhatsApp={mWhatsApp} onAbrirFicha={abrirFicha} />
        ))}
      </div>

      {modalAberto && !modoEdicao && (
        <FichaAlunoModal 
          aluno={{
            id: idEdicao, nome, cpf_aluno: cpfAluno, turma, turno,
            cep, endereco, numero, bairro, cidade, estado,
            responsavel, parentesco1, whatsapp, cpf_responsavel: cpfResponsavel, 
            email_responsavel: emailResponsavel, profissao_responsavel: profissaoResponsavel,
            responsavel2, parentesco2, whatsapp2, cpf_responsavel2: cpfResponsavel2, 
            email_responsavel_2: emailResponsavel2, profissao_responsavel2: profissaoResponsavel2,
            responsavel3, parentesco3, whatsapp3, 
            email_responsavel_3: emailResponsavel3,
            valor, vencimento, data_nascimento: dataNascimento, 
            tem_alergia: temAlergia, alergia_descricao: alergiaDescricao, 
            e_artista: eAutista, foto_url: previewUrl, observacoes,
            saldo_credito: alunos.find(a => a.id === idEdicao)?.saldo_credito || 0
          }}
          verBoletim={verBoletim} verHistorico={verHistorico} notas={notes} historico={historico} ehVisitante={ehVisitante} userEmail={userEmail} mCPF={mCPF} mWhatsApp={mWhatsApp}
          onFechar={() => setModalAberto(false)} onEditar={() => setModoEdicao(true)}
          onVerBoletim={buscarBoletim} onVerHistorico={buscarHistoricoPagamento} onVoltarParaFicha={() => { setVerBoletim(false); setVerHistorico(false); }}
          onSalvarNota={salvarNota} onAdicionarDisciplina={adicionarDisciplina} onExcluirDisciplina={excluirDisciplina}
          onEditarPagamento={handleEditarPagamento} onExcluirPagamento={handleExcluirPagamento}
          onExcluir={async () => { if(confirm("Excluir definitivamente?")) { await supabase.from('alunos').delete().eq('id', idEdicao); setModalAberto(false); buscarAlunos(); } }}
          onGerarPDFBoletim={gerarPDFBoletim} onGerarPDFHistorico={gerarPDFHistorico}
          calcularIdade={calcularIdade}
        />
      )}

      {modalAberto && modoEdicao && (
        <FormAlunoModal 
          idEdicao={idEdicao} previewUrl={previewUrl} carregando={carregando} mCPF={mCPF} mWhatsApp={mWhatsApp}
          form={{nome, cpfAluno, dataNascimento, turma, turno, cep, endereco, numero, bairro, cidade, estado, valor, vencimento, responsavel, parentesco1, whatsapp, cpfResponsavel, emailResponsavel, profissaoResponsavel, responsavel2, parentesco2, whatsapp2, cpfResponsavel2, emailResponsavel2, profissaoResponsavel2, responsavel3, parentesco3, whatsapp3, emailResponsavel3, eAutista, temAlergia, alergiaDescricao, observacoes}}
          setForm={(d: any) => { 
            if (d.nome !== undefined) setNome(d.nome);
            if (d.cpfAluno !== undefined) setCpfAluno(d.cpfAluno);
            if (d.dataNascimento !== undefined) setDataNascimento(d.dataNascimento);
            if (d.turma !== undefined) setTurma(d.turma);
            if (d.turno !== undefined) setTurno(d.turno);
            if (d.cep !== undefined) setCep(d.cep);
            if (d.endereco !== undefined) setEndereco(d.endereco);
            if (d.numero !== undefined) setNumero(d.numero);
            if (d.bairro !== undefined) setBairro(d.bairro);
            if (d.cidade !== undefined) setCidade(d.cidade);
            if (d.estado !== undefined) setEstado(d.estado);
            if (d.valor !== undefined) setValor(d.valor);
            if (d.vencimento !== undefined) setVencimento(d.vencimento);
            if (d.responsavel !== undefined) setResponsavel(d.responsavel);
            if (d.parentesco1 !== undefined) setParentesco1(d.parentesco1);
            if (d.whatsapp !== undefined) setWhatsapp(d.whatsapp);
            if (d.cpfResponsavel !== undefined) setCpfResponsavel(d.cpfResponsavel);
            if (d.emailResponsavel !== undefined) setEmailResponsavel(d.emailResponsavel);
            if (d.profissaoResponsavel !== undefined) setProfissaoResponsavel(d.profissaoResponsavel);
            if (d.responsavel2 !== undefined) setResponsavel2(d.responsavel2);
            if (d.parentesco2 !== undefined) setParentesco2(d.parentesco2);
            if (d.whatsapp2 !== undefined) setWhatsapp2(d.whatsapp2);
            if (d.cpfResponsavel2 !== undefined) setCpfResponsavel2(d.cpfResponsavel2);
            if (d.emailResponsavel2 !== undefined) setEmailResponsavel2(d.emailResponsavel2);
            if (d.profissaoResponsavel2 !== undefined) setProfissaoResponsavel2(d.profissaoResponsavel2);
            if (d.responsavel3 !== undefined) setResponsavel3(d.responsavel3);
            if (d.parentesco3 !== undefined) setParentesco3(d.parentesco3);
            if (d.whatsapp3 !== undefined) setWhatsapp3(d.whatsapp3);
            if (d.emailResponsavel3 !== undefined) setEmailResponsavel3(d.emailResponsavel3);
            if (d.eAutista !== undefined) setEAutista(d.eAutista);
            if (d.temAlergia !== undefined) setTemAlergia(d.temAlergia);
            if (d.alergiaDescricao !== undefined) setAlergiaDescricao(d.alergiaDescricao);
            if (d.observacoes !== undefined) setObservacoes(d.observacoes);
            if (d.foto_url !== undefined) setPreviewUrl(d.foto_url);
          }}
          onTrocarFoto={(e) => { 
            if (!e.target.files) {
              setArquivoFoto(null);
              setPreviewUrl(null);
              return;
            }
            const file = e.target.files?.[0]; 
            if (file) { 
              setArquivoFoto(file); 
              setPreviewUrl(URL.createObjectURL(file)); 
            } 
          }}
          onSalvar={salvarAluno} onCancelar={() => idEdicao ? setModoEdicao(false) : setModalAberto(false)}
        />
      )}

      {/* MODAL PARA EDITAR PAGAMENTO DO HISTÓRICO - AGORA RECEBE historicoGeral */}
      <ModalPagamento 
        aberto={modalPgtoAberto} 
        onFechar={() => setModalPgtoAberto(false)}
        aluno={{ nome }} 
        dataPagamento={dataPagamento} 
        setDataPagamento={setDataPagamento}
        tipoPagamento={tipoPagamento} 
        setTipoPagamento={setTipoPagamento}
        mesReferencia={mesReferencia} 
        setMesReferencia={setMesReferencia} 
        mesesAno={mesesAno}
        descricaoOutro={descricaoOutro} 
        setDescricaoOutro={setDescricaoOutro}
        pagamentosMetodos={pagamentosMetodos} 
        setPagamentosMetodos={setPagamentosMetodos}
        onConfirmar={handleSalvarPgtoEditado} 
        editando={true}
        historicoGeral={historico} 
      />
    </div>
  );
}