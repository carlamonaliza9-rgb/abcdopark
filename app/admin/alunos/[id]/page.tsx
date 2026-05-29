"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ModalPagamento } from "@/app/dashboard/financeiro/_components/ModalPagamento";
import { FormAlunoModal } from "@/app/dashboard/alunos/_components/FormAlunoModal";

export default function PerfilAlunoPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const alunoId = resolvedParams.id;
  
  const [aluno, setAluno] = useState<any>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [ehVisitante, setEhVisitante] = useState(true);
  const [carregando, setCarregando] = useState(true);
  
  const [isProcessandoAcao, setIsProcessandoAcao] = useState(false);

  // --- ESTADOS DA FICHA ---
  const [verBoletim, setVerBoletim] = useState(false);
  const [verHistorico, setVerHistorico] = useState(false);
  const [notas, setNotas] = useState<any[]>([]);
  const [historicoLocal, setHistoricoLocal] = useState<any[]>([]);

  const [mediaEstrelas, setMediaEstrelas] = useState(0);
  const [percentualPresenca, setPercentualPresenca] = useState(100);
  
  const [totalPendenteGeral, setTotalPendenteGeral] = useState(0);
  const [listaPendenciasGerais, setListaPendenciasGerais] = useState<any[]>([]);
  const [verDividasGlobais, setVerDividasGlobais] = useState(false);
  const [verCreditoGlobal, setVerCreditoGlobal] = useState(false);

  const [idRenegociacao, setIdRenegociacao] = useState<string | null>(null);
  const [formRenegociacao, setFormRenegociacao] = useState({ parcelas: "2", vencimentoInicial: new Date().toISOString().split('T')[0] });

  const [saldoCreditoVisivel, setSaldoCreditoVisivel] = useState(0);
  const [editandoCredito, setEditandoCredito] = useState(false);
  const [novoValorCredito, setNovoValorCredito] = useState("");

  const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear().toString());
  const [anoPagamentoSelecionado, setAnoPagamentoSelecionado] = useState(new Date().getFullYear().toString());

  // --- ESTADOS DO PDV INLINE E EDIÇÃO DE PAGAMENTO ---
  const [modalPDVAberto, setModalPDVAberto] = useState(false);
  const [dataPagamentoPDV, setDataPagamentoPDV] = useState(new Date().toISOString().split('T')[0]);
  const [tipoPagamentoPDV, setTipoPagamentoPDV] = useState("pdv");
  const [pagamentosMetodosPDV, setPagamentosMetodosPDV] = useState({ pix: "", dinheiro: "", credito: "", debito: "", boleto: "", multa: "", desconto: "", credito_aluno: "" });
  
  const [modalPgtoAberto, setModalPgtoAberto] = useState(false);
  const [idPagamentoEdicao, setIdPagamentoEdicao] = useState<string | null>(null);
  const [dataPagamento, setDataPagamento] = useState("");
  const [tipoPagamento, setTipoPagamento] = useState("mensalidade");
  const [descricaoOutro, setDescricaoOutro] = useState("");
  const [mesReferencia, setMesReferencia] = useState("");
  const [pagamentosMetodos, setPagamentosMetodos] = useState({ pix: "", dinheiro: "", credito: "", debito: "", multa: "" });

  const [modoEdicao, setModoEdicao] = useState(false);
  const [formEdicao, setFormEdicao] = useState<any>({});
  const [arquivoFoto, setArquivoFoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const SENHA_MESTRA = "1234";
  const mesesAno = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  // --- FUNÇÕES UTILITÁRIAS INTERNAS ---
  const clean = (val: any) => {
    if (val === null || val === undefined || val === "") return 0;
    if (typeof val === 'number') return val;
    const str = String(val).trim();
    if (str.includes(',')) return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
    return parseFloat(str) || 0;
  };

  const mCPF = (v: string) => {
    if (!v) return "";
    return v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  };

  const mWhatsApp = (v: string) => {
    if (!v) return "";
    let val = v.replace(/\D/g, "");
    if (val.length === 0) return "";
    if (val.length <= 2) return `(${val}`;
    if (val.length <= 7) return `(${val.substring(0, 2)}) ${val.substring(2)}`;
    return `(${val.substring(0, 2)}) ${val.substring(2, 7)}-${val.substring(7, 11)}`;
  };

  const calcularIdade = (data: string) => {
    if (!data) return "--";
    const nasc = new Date(data);
    const hoje = new Date();
    let idade = hoje.getFullYear() - nasc.getFullYear();
    if (hoje.getMonth() < nasc.getMonth() || (hoje.getMonth() === nasc.getMonth() && hoje.getDate() < nasc.getDate())) {
      idade--;
    }
    return `${idade} anos`;
  };

  const abrirWhatsApp = (numero: any) => {
    if (!numero) return;
    const apenasNumeros = String(numero).replace(/\D/g, '');
    window.open(`https://wa.me/55${apenasNumeros}`, '_blank');
  };

  const obterMediaFinal = (n: any) => {
    const bimestres = [n.bimestre1, n.bimestre2, n.bimestre3, n.bimestre4].map(v => parseFloat(v) || 0);
    const soma = bimestres.reduce((acc, curr) => acc + curr, 0);
    return (soma / 4).toFixed(1);
  };

  const extrairFormaPagamento = (detalhes: any) => {
    if (!detalhes) return null;
    const metodos = Object.keys(detalhes).filter(key => parseFloat(detalhes[key]) > 0 && key !== 'historico_parciais' && key !== 'forma_geradora' && key !== 'ids_origem' && key !== 'e_subtracao' && key !== 'credito_utilizado_nesta_parcela');
    return metodos.length > 0 ? metodos.join(" + ").toUpperCase() : null;
  };

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");

      const emailAtual = user.email || "";
      setUserEmail(emailAtual);
      const { data: perfil } = await supabase.from('perfis').select('cargo').eq('id', user.id).single();
      
      const isVisitante = emailAtual !== 'carlamonaliza9@gmail.com' && emailAtual !== 'diretoria@abcdopark.com' && perfil?.cargo !== 'Admin' && perfil?.cargo !== 'Direção';
      setEhVisitante(isVisitante);

      await buscarAlunoBase();
    }
    init();
  }, [alunoId]);

  async function buscarAlunoBase() {
    const { data } = await supabase.from('alunos').select('*').eq('id', alunoId).single();
    if (data) {
      setAluno(data);
      setSaldoCreditoVisivel(clean(data.saldo_credito));
    }
    setCarregando(false);
  }

  useEffect(() => {
    if (aluno?.id) {
      buscarDadosAdicionais();
    }
  }, [aluno?.id, anoPagamentoSelecionado, anoSelecionado]);

  async function buscarDadosAdicionais() {
    const { data: avs } = await supabase.from('avaliacoes').select('participacao, comportamento, atividades, socioemocional').eq('aluno_id', aluno.id);
    if (avs && avs.length > 0) {
      const somaDasMediasDiarias = avs.reduce((acc: number, curr: any) => acc + ((curr.participacao || 0) + (curr.comportamento || 0) + (curr.atividades || 0) + (curr.socioemocional || 0)) / 4, 0);
      setMediaEstrelas(somaDasMediasDiarias / avs.length);
    }

    const { data: freqs } = await supabase.from('frequencias').select('presente').eq('aluno_id', aluno.id);
    if (freqs && freqs.length > 0) {
      const presentes = freqs.filter((f: any) => f.presente).length;
      setPercentualPresenca((presentes / freqs.length) * 100);
    }

    const { data: bData } = await supabase.from('boletins').select('*').eq('aluno_id', aluno.id).eq('ano', anoSelecionado);
    if (bData) setNotas(bData);

    const { data: historicoCompleto } = await supabase.from('historico_pagamentos').select('*').eq('aluno_id', aluno.id).order('data_pagamento', { ascending: false });
    
    if (historicoCompleto) {
      setHistoricoLocal(historicoCompleto);
      let dividaCalculada = 0;
      let listaDívida = [];
      
      const pendenciasRegistradas = historicoCompleto.filter(h => h.status === 'pendente' || h.status === 'parcial');
      pendenciasRegistradas.forEach(pend => {
        dividaCalculada += (clean(pend.valor_total) - clean(pend.valor_pago));
        listaDívida.push({ ...pend, atraso_automatico: false });
      });

      const dataAtual = new Date();
      const mesAtualNum = dataAtual.getMonth(); 
      const anoAtual = dataAtual.getFullYear().toString();
      const diaVencimentoAluno = parseInt(aluno.vencimento) || 5;
      const valorMensalidadeBase = clean(aluno.valor);

      if (valorMensalidadeBase > 0) {
        for (let i = 0; i <= mesAtualNum; i++) {
          const nomeMes = mesesAno[i];
          if (i === mesAtualNum && dataAtual.getDate() <= diaVencimentoAluno) continue;

          const jaExisteNoBanco = historicoCompleto.some(h => 
            (h.tipo?.toLowerCase() === 'mensalidade' || h.tipo?.toLowerCase() === 'acordo') && 
            h.mes_referencia?.toLowerCase().trim() === nomeMes.toLowerCase() && 
            (h.data_pagamento?.startsWith(anoAtual) || (h.descricao || "").includes(anoAtual)) &&
            !['cancelado', 'estornado'].includes(h.status)
          );

          if (!jaExisteNoBanco) {
            dividaCalculada += valorMensalidadeBase;
            listaDívida.push({
              id: `temp_${nomeMes}`,
              descricao: `Mensalidade em Atraso - ${nomeMes}/${anoAtual}`,
              mes_referencia: nomeMes,
              valor_total: valorMensalidadeBase,
              valor_pago: 0,
              data_pagamento: new Date(dataAtual.getFullYear(), i, diaVencimentoAluno).toISOString(),
              status: 'atrasado',
              atraso_automatico: true,
              isTemp: true
            });
          }
        }
      }

      setTotalPendenteGeral(dividaCalculada);
      setListaPendenciasGerais(listaDívida as any[]);
    }
  }

  async function processarAcaoPagamento(pgto: any, acao: 'estornar' | 'excluir') {
    if (isProcessandoAcao) return;
    
    if (acao === 'excluir' && userEmail !== 'carlamonaliza9@gmail.com') {
        return alert("Acesso negado: Apenas a administração master pode excluir registros permanentemente do banco.");
    }

    const isAdmin = prompt(`Digite a Senha Mestra para ${acao.toUpperCase()}:`);
    if (isAdmin !== SENHA_MESTRA) return alert("Senha incorreta.");

    let variacaoSaldoCredito = 0;
    let idsParaDeletar: string[] = [];
    let idsParaZerar: string[] = [];
    let mensagem = `⚠️ DETALHES DA ${acao === 'estornar' ? 'REVERSÃO' : 'EXCLUSÃO'}:\n\n`;

    const isCredito = pgto.tipo === 'credito' || pgto.descricao?.toLowerCase().includes('crédito') || pgto.descricao?.toLowerCase().includes('troco');
    
    if (isCredito) {
        const valorCredito = clean(pgto.valor_total);
        const isSubtracao = pgto.detalhes_metodos?.e_subtracao === true;
        
        if (!isSubtracao) {
            variacaoSaldoCredito -= valorCredito;
            idsParaDeletar.push(pgto.id);
            mensagem += `- Remoção do Crédito/Troco da carteira: -R$ ${valorCredito.toFixed(2)}\n`;

            const origens = pgto.detalhes_metodos?.ids_origem;
            if (origens) {
                const strOrigens = Array.isArray(origens) ? origens.map(String) : [String(origens)];
                const dividasVinculadas = historicoLocal.filter(h => strOrigens.includes(String(h.id)));
                
                for (const div of dividasVinculadas) {
                    if (acao === 'estornar') idsParaZerar.push(div.id);
                    if (acao === 'excluir') idsParaDeletar.push(div.id);

                    let creditoUsado = clean(div.detalhes_metodos?.credito_utilizado_nesta_parcela);
                    if (creditoUsado === 0 && clean(div.detalhes_metodos?.credito_aluno) > 0) creditoUsado = clean(div.detalhes_metodos?.credito_aluno);
                    
                    if (creditoUsado > 0) {
                        variacaoSaldoCredito += creditoUsado;
                        mensagem += `- Reembolso (Parcela Vinculada usou crédito): +R$ ${creditoUsado.toFixed(2)}\n`;
                    }
                }
                if (dividasVinculadas.length > 0) {
                    mensagem += `- ${dividasVinculadas.length} parcela(s) originais serão ${acao === 'estornar' ? 'reabertas (Status: Pendente)' : 'excluídas do sistema'}.\n`;
                }
            }
        } else {
            variacaoSaldoCredito += Math.abs(valorCredito);
            idsParaDeletar.push(pgto.id);
            mensagem += `- Reversão de Subtração (O valor voltará para a carteira): +R$ ${Math.abs(valorCredito).toFixed(2)}\n`;
        }
    } else {
        if (acao === 'estornar') idsParaZerar.push(pgto.id);
        if (acao === 'excluir') idsParaDeletar.push(pgto.id);
        
        mensagem += `- A transação será ${acao === 'estornar' ? 'reaberta para PENDENTE (R$ 0,00 pago)' : 'APAGADA DEFINITIVAMENTE'}.\n`;
        
        let creditoUsado = clean(pgto.detalhes_metodos?.credito_utilizado_nesta_parcela);
        if (creditoUsado === 0 && clean(pgto.detalhes_metodos?.credito_aluno) > 0) creditoUsado = clean(pgto.detalhes_metodos?.credito_aluno);
        
        if (creditoUsado > 0) {
            variacaoSaldoCredito += creditoUsado;
            mensagem += `- Devolução do Crédito Virtual usado no pagamento: +R$ ${creditoUsado.toFixed(2)}\n`;
        }

        const creditosGerados = historicoLocal.filter(h => {
            const isCred = h.tipo === 'credito' || h.descricao?.toLowerCase().includes('troco') || h.descricao?.toLowerCase().includes('crédito');
            if (!isCred) return false;
            
            const origens = h.detalhes_metodos?.ids_origem;
            if (origens) {
                const strOrigens = Array.isArray(origens) ? origens.map(String) : [String(origens)];
                if (strOrigens.includes(String(pgto.id))) return true;
            }
            
            if (h.descricao && pgto.descricao && h.descricao.toLowerCase().includes(pgto.descricao.toLowerCase())) {
                return true;
            }
            return false;
        });

        for (const c of creditosGerados) {
            idsParaDeletar.push(c.id);
            variacaoSaldoCredito -= clean(c.valor_total);
            mensagem += `- O Troco gerado por este pagamento será CANCELADO e retirado da carteira: -R$ ${clean(c.valor_total).toFixed(2)}\n`;
        }
    }

    const saldoFinalEsperado = Math.max(0, saldoCreditoVisivel + variacaoSaldoCredito);
    mensagem += `\nSaldo Atual na Carteira: R$ ${saldoCreditoVisivel.toFixed(2)}`;
    mensagem += `\nSaldo Final Após Operação: R$ ${saldoFinalEsperado.toFixed(2)}\n\nConfirmar operação de Integridade?`;

    if (!confirm(mensagem)) return;

    setIsProcessandoAcao(true);
    setCarregando(true);
    try {
        if (variacaoSaldoCredito !== 0) {
            await supabase.from('alunos').update({ saldo_credito: saldoFinalEsperado }).eq('id', aluno.id);
            setSaldoCreditoVisivel(saldoFinalEsperado);
        }

        if (idsParaDeletar.length > 0) {
            await supabase.from('historico_pagamentos').delete().in('id', idsParaDeletar);
        }

        if (idsParaZerar.length > 0) {
            await supabase.from('historico_pagamentos').update({ 
                status: 'pendente', 
                valor_pago: 0, 
                detalhes_metodos: {} 
            }).in('id', idsParaZerar);
        }

        alert(`Operação de ${acao} processada com sucesso! Relatórios e carteira reajustados.`);
        await buscarAlunoBase();
        await buscarDadosAdicionais();
    } catch (error: any) {
        alert("Erro ao processar ação: " + error.message);
    } finally {
        setCarregando(false);
        setIsProcessandoAcao(false);
    }
  }

  const abrirEdicaoFicha = () => {
    setFormEdicao({
      nome: aluno.nome || "",
      cpfAluno: aluno.cpf_aluno || "",
      dataNascimento: aluno.data_nascimento || "",
      turma: aluno.turma || "",
      turno: aluno.turno || "",
      cep: aluno.cep || "",
      endereco: aluno.endereco || "",
      numero: aluno.numero || "",
      bairro: aluno.bairro || "",
      cidade: aluno.cidade || "",
      estado: aluno.estado || "",
      valor: aluno.valor || "",
      vencimento: aluno.vencimento || "",
      responsavel: aluno.responsavel || "",
      parentesco1: aluno.parentesco_1 || aluno.parentesco1 || "Mãe",
      whatsapp: aluno.whatsapp || "",
      cpfResponsavel: aluno.cpf_responsavel || "",
      emailResponsavel: aluno.email_responsavel || "",
      profissaoResponsavel: aluno.profissao_responsavel || aluno.responsavel_profissao || "",
      responsavel2: aluno.responsavel2 || aluno.responsavel_2_nome || "",
      parentesco2: aluno.parentesco_2 || aluno.parentesco2 || "Pai",
      whatsapp2: aluno.whatsapp2 || aluno.responsavel_2_contato || "",
      cpfResponsavel2: aluno.cpf_responsavel2 || aluno.cpf_responsavel_2 || "",
      emailResponsavel2: aluno.email_responsavel_2 || aluno.email_responsavel2 || "",
      profissaoResponsavel2: aluno.profissao_responsavel2 || aluno.responsavel_2_profissao || "",
      responsavel3: aluno.responsavel3 || aluno.responsavel_3_nome || "",
      parentesco3: aluno.parentesco_3 || aluno.parentesco3 || "",
      whatsapp3: aluno.whatsapp3 || aluno.responsavel_3_contato || "",
      emailResponsavel3: aluno.email_responsavel_3 || aluno.email_responsavel3 || "",
      eAutista: aluno.e_autista || false,
      temAlergia: aluno.tem_alergia || false,
      alergiaDescricao: aluno.alergia_descricao || "",
      observacoes: aluno.observacoes || ""
    });
    setPreviewUrl(aluno.foto_url);
    setArquivoFoto(null);
    setModoEdicao(true);
  };

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

  async function salvarEdicaoAluno(e: React.FormEvent) {
    e.preventDefault();
    if (ehVisitante || isProcessandoAcao) return;
    setIsProcessandoAcao(true);
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
        nome: formEdicao.nome, cpf_aluno: formEdicao.cpfAluno, turma: formEdicao.turma, turno: formEdicao.turno,
        cep: formEdicao.cep, endereco: formEdicao.endereco, numero: formEdicao.numero, bairro: formEdicao.bairro, cidade: formEdicao.cidade, estado: formEdicao.estado,
        responsavel: formEdicao.responsavel, parentesco_1: formEdicao.parentesco1, whatsapp: formEdicao.whatsapp, cpf_responsavel: formEdicao.cpfResponsavel,
        email_responsavel: formEdicao.emailResponsavel, profissao_responsavel: formEdicao.profissaoResponsavel,
        responsavel_2_nome: formEdicao.responsavel2, parentesco_2: formEdicao.parentesco2, responsavel_2_contato: formEdicao.whatsapp2, cpf_responsavel_2: formEdicao.cpfResponsavel2,
        email_responsavel_2: formEdicao.emailResponsavel2, profissao_responsavel_2: formEdicao.profissaoResponsavel2,
        responsavel_3_nome: formEdicao.responsavel3, parentesco_3: formEdicao.parentesco3, responsavel_3_contato: formEdicao.whatsapp3,
        email_responsavel_3: formEdicao.emailResponsavel3,
        valor: formEdicao.valor ? parseFloat(formEdicao.valor.toString()) : null, vencimento: formEdicao.vencimento, data_nascimento: formEdicao.dataNascimento,
        tem_alergia: formEdicao.temAlergia, alergia_descricao: formEdicao.temAlergia ? formEdicao.alergiaDescricao : "", e_autista: formEdicao.eAutista, 
        observacoes: formEdicao.observacoes, foto_url: urlFinal
      };

      const { error: errorUpdate } = await supabase.from('alunos').update(dadosParaEnviar).eq('id', alunoId);
      if (errorUpdate) throw errorUpdate;

      setModoEdicao(false); 
      await buscarAlunoBase();
    } catch (error: any) { 
      alert("Erro ao salvar: " + (error.message || "Ocorreu um erro inesperado.")); 
    } finally { 
      setCarregando(false);
      setIsProcessandoAcao(false);
    }
  }

  function gerarPDFHistorico() {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("EXTRATO FINANCEIRO - ESCOLA ABC DO PARK", 105, 20, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Aluno: ${aluno?.nome?.toUpperCase()}`, 15, 35);
    
    const historicoFiltradoParaPDF = historicoLocal.filter(h => h.data_pagamento && h.data_pagamento.startsWith(anoPagamentoSelecionado) && h.status !== 'renegociado');

    autoTable(doc, {
      startY: 45,
      head: [['DATA', 'DESCRIÇÃO', 'FORMA', 'VALOR']],
      body: historicoFiltradoParaPDF.map((h: any) => [
        new Date(h.data_pagamento).toLocaleDateString('pt-BR', {timeZone: 'UTC'}),
        h.descricao.toUpperCase(),
        h.detalhes_metodos?.forma_geradora || extrairFormaPagamento(h.detalhes_metodos),
        `${h.detalhes_metodos?.e_subtracao ? '- ' : ''}R$ ${Math.abs(clean(h.valor_total)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      ]),
      headStyles: { fillColor: [37, 99, 235] }
    });
    doc.save(`Extrato_${aluno?.nome?.replace(/\s+/g, '_')}_${anoPagamentoSelecionado}.pdf`);
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

    try { doc.addImage(logoUrl, "PNG", 20, 10, 35, 35); } catch (e) {}

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("ESCOLA ABC DO PARK", 60, 20);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("CNPJ 05.067.797/0001-68", 60, 26);
    doc.text("CONJ PARKLANDIA - QUADRA A CASA 02", 60, 31);
    doc.text("TELEFONE (91) 3268-3484 / (91) 98622-7715", 60, 36);
    doc.text("INEP - 15159213", 60, 41);
    doc.line(20, 50, 190, 50);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(`BOLETIM ESCOLAR OFICIAL - ${anoSelecionado}`, 105, 65, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("DADOS DO ALUNO(A):", 20, 75);
    doc.setFont("helvetica", "normal");
    doc.text(`Nome: ${aluno?.nome?.toUpperCase()}`, 20, 82);
    doc.text(`Turma: ${aluno?.turma}`, 20, 87);
    doc.text(`Responsável: ${aluno?.responsavel?.toUpperCase() || "NÃO INFORMADO"}`, 20, 92);
    doc.text(`Nascimento: ${aluno?.data_nascimento ? new Date(aluno.data_nascimento).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : "--"} (${calcularIdade(aluno?.data_nascimento)})`, 20, 97);

    autoTable(doc, {
      startY: 105,
      head: [['DISCIPLINA', '1ºB', '2ºB', 'R1', '3ºB', '4ºB', 'R2', 'MÉD']],
      body: notas.map(n => [
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

    try { doc.addImage(carimboEscolaUrl, "PNG", 120, finalY - 15, 75, 75); } catch (e) {}

    doc.setFont("helvetica", "bold");
    doc.text("Atenciosamente,", 20, finalY + 25);
    
    try { doc.addImage(carimboSuellenUrl, "PNG", 75, finalY + 25, 55, 25); } catch (e) {}

    doc.text("__________________________________________", 105, finalY + 55, { align: "center" });
    doc.text("Suellen C. S. Figueiredo", 105, finalY + 61, { align: "center" });
    doc.setFontSize(10);
    doc.text("DIRETORA / REG. 6235", 105, finalY + 67, { align: "center" });

    doc.save(`Boletim_${aluno?.nome?.replace(/\s+/g, '_')}_${anoSelecionado}.pdf`);
  }

  function handleEditarPagamento(pgto: any) {
    setIdPagamentoEdicao(pgto.id);
    setDataPagamento(pgto.data_pagamento);
    setTipoPagamento(pgto.tipo);
    setDescricaoOutro(pgto.descricao);
    setPagamentosMetodos(pgto.detalhes_metodos || { pix: "", dinheiro: "", credito: "", debito: "", multa: "" });
    setModalPgtoAberto(true);
  }

  async function handleSalvarPgtoEditado() {
    if (isProcessandoAcao) return;
    setIsProcessandoAcao(true);

    const soma = Object.values(pagamentosMetodos).reduce((acc, val) => acc + (parseFloat(val as string) || 0), 0);
    const dados = { tipo: tipoPagamento, descricao: descricaoOutro, valor_total: soma, data_pagamento: dataPagamento, detalhes_metodos: pagamentosMetodos };
    await supabase.from('historico_pagamentos').update(dados).eq('id', idPagamentoEdicao);
    
    const checkTroco = historicoLocal.filter(h => Array.isArray(h.detalhes_metodos?.ids_origem) && h.detalhes_metodos.ids_origem.map(String).includes(String(idPagamentoEdicao)));
    if (checkTroco.length > 0) {
        alert("Atenção: Você editou manualmente uma parcela que havia gerado troco. O valor na carteira de crédito do aluno NÃO foi reajustado automaticamente. Recomendamos o Estorno ao invés da edição caso tenha errado o valor pago.");
    }

    setModalPgtoAberto(false);
    buscarDadosAdicionais();
    setIsProcessandoAcao(false);
  }

  async function handleConfirmarPDV(dividasSelecionadas: any[]) {
    if (isProcessandoAcao) return;
    setIsProcessandoAcao(true);

    const valorPix = clean(pagamentosMetodosPDV.pix);
    const valorDinheiro = clean(pagamentosMetodosPDV.dinheiro);
    const valorCredito = clean(pagamentosMetodosPDV.credito);
    const valorDebito = clean(pagamentosMetodosPDV.debito);
    const valorBoleto = clean(pagamentosMetodosPDV.boleto);
    
    const somaPaga = valorPix + valorDinheiro + valorCredito + valorDebito + valorBoleto;
    const valorMulta = clean(pagamentosMetodosPDV.multa);
    const valorDesconto = clean(pagamentosMetodosPDV.desconto);
    const creditoUtilizado = clean(pagamentosMetodosPDV.credito_aluno);
    
    const valorPagoFinal = somaPaga + creditoUtilizado;
    const totalDividas = dividasSelecionadas.reduce((acc, d) => acc + (clean(d.valor_total) - clean(d.valor_pago)), 0);
    const totalDividasAjustado = totalDividas + valorMulta - valorDesconto;

    if (valorPagoFinal + 0.01 < totalDividasAjustado) {
      setIsProcessandoAcao(false);
      return alert("O valor inserido é insuficiente para quitar as dívidas selecionadas.");
    }

    if (creditoUtilizado > saldoCreditoVisivel) {
      setIsProcessandoAcao(false);
      return alert("O aluno não possui essa quantidade de crédito disponível para abater.");
    }

    let saldoParaDistribuir = valorPagoFinal + valorDesconto - valorMulta;
    let creditoRestanteParaDistribuir = creditoUtilizado;
    let trocoGlobal = 0;
    let idsProcessados: string[] = [];

    for (const div of dividasSelecionadas) {
      const idString = String(div.id || "");
      const valorOriginalTotal = clean(div.valor_total);
      const valorJaPago = clean(div.valor_pago);
      const restanteDestaDivida = valorOriginalTotal - valorJaPago;

      if (restanteDestaDivida <= 0) continue;

      const valorAbatido = Math.min(restanteDestaDivida, saldoParaDistribuir);
      saldoParaDistribuir -= valorAbatido;

      const creditoAbatidoAqui = Math.min(valorAbatido, creditoRestanteParaDistribuir);
      creditoRestanteParaDistribuir -= creditoAbatidoAqui;

      const novoValorPago = valorJaPago + valorAbatido;
      const novoStatus = novoValorPago >= valorOriginalTotal ? 'pago' : 'parcial';

      const formasStrArray = [];
      if (valorPix > 0) formasStrArray.push("Pix");
      if (valorDinheiro > 0) formasStrArray.push("Dinheiro");
      if (valorCredito > 0) formasStrArray.push("Cartão de Crédito");
      if (valorDebito > 0) formasStrArray.push("Cartão de Débito");
      if (valorBoleto > 0) formasStrArray.push("Boleto");
      if (creditoUtilizado > 0) formasStrArray.push("Saldo Virtual");
      const formaPagamentoTexto = formasStrArray.length > 0 ? formasStrArray.join(" + ") : "Ajuste/Avulso";

      const historicoAntigo = Array.isArray(div.detalhes_metodos?.historico_parciais) ? div.detalhes_metodos.historico_parciais : [];
      const novoHistoricoParcial = [...historicoAntigo, {
        data_recebimento: dataPagamentoPDV,
        valor_pago_rodada: valorAbatido,
        formas: formaPagamentoTexto,
        desconto: valorDesconto,
        multa: valorMulta
      }];

      const jsonMetodos = {
        ...pagamentosMetodosPDV,
        credito_utilizado_nesta_parcela: creditoAbatidoAqui,
        historico_parciais: novoHistoricoParcial
      };

      let savedId = div.id;

      if (idString.startsWith('temp_')) {
        const { data } = await supabase.from('historico_pagamentos').insert({
          aluno_id: aluno.id,
          tipo: 'mensalidade',
          descricao: div.descricao,
          mes_referencia: div.mes_referencia,
          valor_total: valorOriginalTotal,
          valor_pago: novoValorPago,
          status: novoStatus,
          data_pagamento: dataPagamentoPDV,
          detalhes_metodos: jsonMetodos
        }).select('id').single();
        if (data) savedId = data.id;
      } else {
        await supabase.from('historico_pagamentos').update({ 
          status: novoStatus, 
          valor_pago: novoValorPago,
          data_pagamento: novoStatus === 'pago' ? dataPagamentoPDV : div.data_pagamento, 
          detalhes_metodos: jsonMetodos 
        }).eq('id', div.id);
      }
      
      if (savedId) idsProcessados.push(String(savedId));
    }

    if (saldoParaDistribuir > 0) {
      trocoGlobal = saldoParaDistribuir;
      
      const formasStrArray = [];
      if (valorPix > 0) formasStrArray.push("Pix");
      if (valorDinheiro > 0) formasStrArray.push("Dinheiro");
      if (valorCredito > 0) formasStrArray.push("Cartão de Crédito");
      if (valorDebito > 0) formasStrArray.push("Cartão de Débito");
      if (valorBoleto > 0) formasStrArray.push("Boleto");
      const formaTexto = formasStrArray.length > 0 ? formasStrArray.join(" + ") : "Adição Automática";

      const nomesItens = dividasSelecionadas.map((d: any) => d.descricao).join(", ");
      const descricaoTroco = `Crédito de Troco gerado na quitação de: ${nomesItens}. (Valor Devido: R$ ${totalDividasAjustado.toFixed(2)} | Valor Pago: R$ ${somaPaga.toFixed(2)})`;

      await supabase.from('historico_pagamentos').insert({
        aluno_id: aluno.id,
        tipo: 'credito',
        descricao: descricaoTroco,
        mes_referencia: 'Avulso',
        valor_total: trocoGlobal,
        valor_pago: trocoGlobal,
        status: 'pago',
        data_pagamento: dataPagamentoPDV,
        detalhes_metodos: { forma_geradora: formaTexto, ids_origem: idsProcessados }
      });
    }

    const novoSaldoCredito = saldoCreditoVisivel - creditoUtilizado + trocoGlobal;

    if (novoSaldoCredito !== saldoCreditoVisivel) {
      await supabase.from('alunos').update({ saldo_credito: novoSaldoCredito }).eq('id', aluno.id);
      setSaldoCreditoVisivel(novoSaldoCredito);
    }

    setModalPDVAberto(false);
    buscarDadosAdicionais();
    setIsProcessandoAcao(false);
    alert("Pagamento recebido e baixas aplicadas com sucesso!");
  }

  async function confirmarRenegociacao(pendenciaOriginal: any) {
    if (isProcessandoAcao) return;
    setIsProcessandoAcao(true);

    const qtdParcelas = parseInt(formRenegociacao.parcelas);
    if (qtdParcelas < 1) {
        setIsProcessandoAcao(false);
        return alert("Número de parcelas inválido.");
    }

    const valorDevedor = clean(pendenciaOriginal.valor_total) - clean(pendenciaOriginal.valor_pago);
    const valorPorParcela = valorDevedor / qtdParcelas;
    const mesRef = pendenciaOriginal.mes_referencia || "";

    const inserts = [];
    for (let i = 0; i < qtdParcelas; i++) {
      const dataVenc = new Date(formRenegociacao.vencimentoInicial);
      dataVenc.setMonth(dataVenc.getMonth() + i);

      inserts.push({
        aluno_id: aluno.id,
        tipo: 'acordo',
        descricao: `Acordo ${i + 1}/${qtdParcelas} (${pendenciaOriginal.descricao})`,
        mes_referencia: mesRef, 
        valor_total: valorPorParcela,
        valor_pago: 0,
        status: 'pendente',
        data_pagamento: dataVenc.toISOString().split('T')[0],
        detalhes_metodos: {}
      });
    }

    await supabase.from('historico_pagamentos').insert(inserts);

    if (String(pendenciaOriginal.id).startsWith('temp_') || pendenciaOriginal.isTemp) {
      await supabase.from('historico_pagamentos').insert({
        aluno_id: aluno.id,
        tipo: pendenciaOriginal.tipo || 'mensalidade',
        descricao: pendenciaOriginal.descricao,
        mes_referencia: pendenciaOriginal.mes_referencia || 'Avulso',
        valor_total: pendenciaOriginal.valor_total,
        valor_pago: 0,
        status: 'renegociado',
        data_pagamento: pendenciaOriginal.data_pagamento || new Date().toISOString().split('T')[0],
        detalhes_metodos: { info: "Convertido em Acordo" }
      });
    } else {
      await supabase.from('historico_pagamentos').update({ status: 'renegociado' }).eq('id', pendenciaOriginal.id);
    }

    setIdRenegociacao(null);
    buscarDadosAdicionais(); 
    setIsProcessandoAcao(false);
  }

  async function handleSalvarCredito() {
    if (isProcessandoAcao) return;
    setIsProcessandoAcao(true);

    const valorConvertido = clean(novoValorCredito);
    const diferenca = valorConvertido - saldoCreditoVisivel;

    if (diferenca === 0) {
        setIsProcessandoAcao(false);
        setEditandoCredito(false);
        return;
    }

    const { error } = await supabase.from('alunos').update({ saldo_credito: valorConvertido }).eq('id', aluno.id);
    if (!error) { 
        await supabase.from('historico_pagamentos').insert({
          aluno_id: aluno.id,
          tipo: 'credito',
          descricao: `Ajuste manual de saldo de crédito na Ficha (${diferenca > 0 ? 'Adição' : 'Subtração'} de R$ ${Math.abs(diferenca).toFixed(2)})`,
          mes_referencia: 'Avulso',
          valor_total: Math.abs(diferenca),
          valor_pago: Math.abs(diferenca),
          status: 'pago',
          data_pagamento: new Date().toISOString().split('T')[0],
          detalhes_metodos: { forma_geradora: "Ajuste Direto na Ficha", e_subtracao: diferenca < 0 }
        });
      
      setSaldoCreditoVisivel(valorConvertido); 
      setEditandoCredito(false); 
      await buscarAlunoBase();
      await buscarDadosAdicionais();
    }
    setIsProcessandoAcao(false);
  }

  async function handleZerarCredito() {
    if (isProcessandoAcao) return;
    
    if (prompt("Digite a Senha Mestra para ZERAR o crédito:") === SENHA_MESTRA) {
      const motivo = prompt("Informe o motivo para zerar este crédito (Obrigatório):");
      if (!motivo) return alert("Operação cancelada. O motivo é obrigatório.");

      setIsProcessandoAcao(true);
      const valorRemovido = saldoCreditoVisivel;
      const { error } = await supabase.from('alunos').update({ saldo_credito: 0 }).eq('id', aluno.id);
      if (!error) { 
        if (valorRemovido > 0) {
            await supabase.from('historico_pagamentos').insert({
            aluno_id: aluno.id,
            tipo: 'credito',
            descricao: `Zeração manual da carteira de crédito. Motivo: ${motivo}`,
            mes_referencia: 'Avulso',
            valor_total: valorRemovido,
            valor_pago: valorRemovido,
            status: 'pago',
            data_pagamento: new Date().toISOString().split('T')[0],
            detalhes_metodos: { forma_geradora: "Exclusão Manual", e_subtracao: true }
            });
        }
        setSaldoCreditoVisivel(0); 
        setVerCreditoGlobal(false); 
        await buscarAlunoBase();
        await buscarDadosAdicionais();
      }
      setIsProcessandoAcao(false);
    } else alert("Senha incorreta.");
  }

  if (carregando || !aluno) {
    return <div className="flex justify-center items-center h-screen bg-slate-50 text-slate-500 font-bold">Carregando Perfil...</div>;
  }

  const contatos = [
    { nome: aluno.responsavel, whats: aluno.whatsapp, email: aluno.email_responsavel, cpf: aluno.responsavel_cpf || aluno.cpf_responsavel, profissao: aluno.profissao_responsavel || aluno.responsavel_profissao, tag: aluno.parentesco1 || aluno.parentesco_1 || "Responsável 1", cor: "text-pink-700", bg: "bg-pink-100 border-pink-200" },
    { nome: aluno.responsavel2 || aluno.responsavel_2_nome, whats: aluno.whatsapp2 || aluno.responsavel_2_contato, email: aluno.email_responsavel_2 || aluno.email_responsavel2, cpf: aluno.cpf_responsavel2 || aluno.cpf_responsavel_2, profissao: aluno.profissao_responsavel2 || aluno.responsavel_2_profissao, tag: aluno.parentesco2 || aluno.parentesco_2 || "Responsável 2", cor: "text-blue-700", bg: "bg-blue-100 border-blue-200" },
    { nome: aluno.responsavel3 || aluno.responsavel_3_nome, whats: aluno.whatsapp3 || aluno.responsavel_3_contato, email: aluno.email_responsavel_3 || aluno.email_responsavel3, cpf: aluno.cpf_responsavel_3, profissao: aluno.profissao_responsavel3, tag: aluno.parentesco3 || aluno.parentesco_3 || "Responsável 3", cor: "text-emerald-700", bg: "bg-emerald-100 border-emerald-200" }
  ];

  const historicoFiltrado = historicoLocal.filter(h => h.data_pagamento && h.data_pagamento.startsWith(anoPagamentoSelecionado) && h.status !== 'renegociado' && h.tipo?.toLowerCase() !== 'credito');

  const historicoCreditos = historicoLocal.filter(h => 
    h.tipo?.toLowerCase() === 'credito' || 
    h.descricao?.toLowerCase().includes('crédito') || 
    h.descricao?.toLowerCase().includes('troco') ||
    h.descricao?.toLowerCase().includes('adiantamento')
  );

  return (
    <div className="w-full bg-[#f8fafc] min-h-screen font-sans antialiased text-slate-800 pb-24 md:p-6 lg:p-8">
      <div className="max-w-[1700px] w-full mx-auto space-y-6 lg:space-y-8 animate-in fade-in duration-300">
        
        {/* BANNER DE CABEÇALHO DO ALUNO (FULL WIDTH) */}
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden relative">
           <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-10"></div>
           
           <div className="p-6 md:p-4 relative z-10 flex flex-col md:flex-row items-center gap-6 md:gap-8">
               <button 
                  onClick={() => router.push('/admin/alunos')} 
                  className="absolute top-6 left-6 md:static bg-white border border-slate-200 text-slate-500 hover:text-slate-800 p-2 md:p-3 rounded-xl shadow-sm transition-all"
                  title="Voltar para listagem"
               >
                  ← Voltar
               </button>
               
               <div className="relative">
                 {aluno.foto_url ? (
                   <img src={aluno.foto_url} className="w-32 h-32 md:w-44 md:h-44 rounded-full object-cover border-4 border-white shadow-md" alt={aluno.nome} />
                 ) : (
                   <div className="w-32 h-32 md:w-44 md:h-44 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 text-5xl md:text-6xl border-4 border-white shadow-md">👤</div>
                 )}
                 {aluno.e_autista && <span className="absolute bottom-0 right-0 text-2xl md:text-3xl bg-white rounded-full p-1 shadow-sm border border-slate-100" title="TEA">🧩</span>}
               </div>

               <div className="flex-1 text-center md:text-left flex flex-col md:flex-row justify-between w-full">
                  <div>
                    <div className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-[10px] font-black tracking-wider rounded-lg mb-2 uppercase border border-blue-100">Matrícula Ativa</div>
                    <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight">{aluno.nome}</h1>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-3">
                      <span className="text-sm font-semibold text-slate-500 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200">{calcularIdade(aluno.data_nascimento)}</span>
                      <span className="text-sm font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">{aluno.turma} • {aluno.turno || 'Turno não inf.'}</span>
                    </div>
                  </div>
                  
                  {!ehVisitante && (
                    <div className="mt-6 md:mt-0 flex justify-center md:justify-end items-center">
                      <button 
                        onClick={abrirEdicaoFicha} 
                        className="bg-gray-100 hover:bg-blue-200 text-gray-700 font-bold px-6 py-3 rounded-xl shadow-md transition-all flex items-center gap-2"
                      >
                        ✏️ Editar Ficha
                      </button>
                    </div>
                  )}
               </div>
           </div>
        </div>

        {/* TELAS CONDICIONAIS DE APROFUNDAMENTO */}
        {verDividasGlobais ? (
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 md:p-8 animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-rose-600 tracking-tight">⚠️ Detalhamento da Dívida</h3>
              <button onClick={() => { setVerDividasGlobais(false); setIdRenegociacao(null); }} className="bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs px-4 py-2 rounded-xl transition-colors">← VOLTAR AO PERFIL</button>
            </div>

            <div className="bg-rose-50 border border-rose-100 p-6 rounded-2xl mb-6 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-center md:text-left">
                <span className="text-xs text-rose-600 font-bold uppercase tracking-widest">Valor Total em Aberto</span>
                <p className="text-3xl font-black text-rose-700 mt-1">R$ {totalPendenteGeral.toFixed(2)}</p>
              </div>
              {!ehVisitante && (
                <button onClick={() => setModalPDVAberto(true)} className="w-full md:w-auto bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                  RECEBER DÍVIDAS
                </button>
              )}
            </div>

            <div className="space-y-4">
              {listaPendenciasGerais.length > 0 ? listaPendenciasGerais.map((pend, i) => {
                const valorTotal = clean(pend.valor_total);
                const valorPago = clean(pend.valor_pago);
                const restante = valorTotal - valorPago;
                const renegociandoEste = idRenegociacao === pend.id;

                return (
                  <div key={i} className={`p-5 rounded-2xl border transition-all ${renegociandoEste ? 'bg-amber-50 border-amber-300' : 'bg-white border-slate-200 hover:border-rose-300'}`}>
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                      <div>
                        <span className="text-base font-bold text-slate-800">{pend.descricao}</span>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-xs font-semibold text-slate-500">Vencimento: {new Date(pend.data_pagamento).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</span>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${pend.atraso_automatico ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                            {pend.atraso_automatico ? 'NÃO PAGO' : pend.status}
                          </span>
                        </div>
                      </div>
                      <div className="text-left md:text-right">
                        <span className="text-lg font-black text-rose-600 block">R$ {restante.toFixed(2)}</span>
                        {!renegociandoEste && <button onClick={() => setIdRenegociacao(pend.id)} className="mt-1 bg-white border border-amber-500 text-amber-600 text-[10px] font-bold px-3 py-1 rounded-lg hover:bg-amber-50 transition-colors">🔄 RENEGOCIAR / DIVIDIR</button>}
                      </div>
                    </div>

                    {renegociandoEste && (
                      <div className="mt-5 pt-5 border-t border-amber-200 border-dashed flex flex-col sm:flex-row gap-4 items-end animate-in fade-in">
                        <div className="flex-1 w-full">
                          <label className="text-[10px] font-black text-amber-800 mb-1 block uppercase">Número de Parcelas</label>
                          <input type="number" value={formRenegociacao.parcelas} onChange={(e) => setFormRenegociacao({...formRenegociacao, parcelas: e.target.value})} className="w-full p-2.5 rounded-xl border border-amber-300 outline-none text-sm font-bold text-slate-700" />
                        </div>
                        <div className="flex-[2] w-full">
                          <label className="text-[10px] font-black text-amber-800 mb-1 block uppercase">Data do 1º Vencimento</label>
                          <input type="date" value={formRenegociacao.vencimentoInicial} onChange={(e) => setFormRenegociacao({...formRenegociacao, vencimentoInicial: e.target.value})} className="w-full p-2.5 rounded-xl border border-amber-300 outline-none text-sm font-bold text-slate-700" />
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                          <button onClick={() => setIdRenegociacao(null)} className="flex-1 sm:flex-none p-3 rounded-xl border border-slate-300 bg-white text-slate-500 font-bold hover:bg-slate-50">CANCELAR</button>
                          <button onClick={() => confirmarRenegociacao(pend)} disabled={isProcessandoAcao} className="flex-1 sm:flex-none p-3 rounded-xl border-none bg-amber-500 text-white font-bold hover:bg-amber-600 shadow-sm">CONFIRMAR</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              }) : <div className="p-10 text-center bg-slate-50 rounded-3xl border border-slate-100 text-slate-500 font-bold">Nenhuma pendência financeira encontrada.</div>}
            </div>
          </div>

        ) : verCreditoGlobal ? (
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 md:p-8 animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-emerald-600 tracking-tight">💰 Carteira de Crédito</h3>
              <button onClick={() => setVerCreditoGlobal(false)} className="bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs px-4 py-2 rounded-xl transition-colors">← VOLTAR AO PERFIL</button>
            </div>

            {/* CARD HORIZONTAL DE CRÉDITO SUAVIZADO */}
            <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl mb-6 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-center md:text-left w-full md:w-auto">
                <span className="text-xs text-emerald-600 font-bold uppercase tracking-widest">Saldo Atual Retido</span>
                {editandoCredito ? (
                  <div className="flex items-center gap-2 mt-2">
                    <input 
                      type="number" 
                      value={novoValorCredito} 
                      onChange={(e) => setNovoValorCredito(e.target.value)} 
                      placeholder="0.00"
                      className="px-3 py-1.5 rounded-xl border border-emerald-300 text-lg font-bold text-center w-32 outline-none" 
                    />
                    <button onClick={handleSalvarCredito} disabled={isProcessandoAcao} className="bg-emerald-600 text-white px-3 py-1.5 rounded-xl font-bold text-xs hover:bg-emerald-700">✓</button>
                    <button onClick={() => setEditandoCredito(false)} className="bg-white border border-slate-200 text-slate-500 px-3 py-1.5 rounded-xl font-bold text-xs hover:bg-slate-50">X</button>
                  </div>
                ) : (
                  <p className="text-3xl font-black text-emerald-700 mt-1">R$ {saldoCreditoVisivel.toFixed(2)}</p>
                )}
              </div>
              {!ehVisitante && !editandoCredito && (
                <div className="flex gap-2 w-full md:w-auto justify-center md:justify-end">
                  <button onClick={() => { setNovoValorCredito(saldoCreditoVisivel.toString()); setEditandoCredito(true); }} className="bg-white border border-emerald-300 text-emerald-600 px-4 py-2 rounded-xl font-bold text-xs hover:bg-emerald-50 transition-colors flex items-center gap-1">
                    ✏️ Ajustar
                  </button>
                  <button onClick={handleZerarCredito} disabled={isProcessandoAcao} className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-2 rounded-xl font-bold text-xs hover:bg-rose-100 transition-colors flex items-center gap-1">
                    🗑️ Zerar
                  </button>
                </div>
              )}
            </div>

            {/* LISTAGEM DE HISTÓRICO DE CRÉDITO COM ESTORNO INTELIGENTE E EXCLUSÃO MASTER */}
            <div className="space-y-3 mt-6">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Histórico de Movimentações de Crédito</h4>
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden bg-white">
                {historicoCreditos.length > 0 ? (
                  historicoCreditos.map((h: any, idx: number) => {
                    const forma = h.detalhes_metodos?.forma_geradora || extrairFormaPagamento(h.detalhes_metodos) || 'Não especificada';
                    const podeGerenciar = !ehVisitante;
                    const isSubtracao = h.detalhes_metodos?.e_subtracao === true;
                    const valorRenderizado = Math.abs(clean(h.valor_total));

                    return (
                      <div key={idx} className="flex flex-col md:flex-row justify-between md:items-center p-4 hover:bg-slate-50/50 transition-colors gap-4">
                        <div>
                          <span className="text-sm font-bold text-slate-800 block">{h.descricao}</span>
                          <span className="text-xs text-slate-500 mt-1 block">
                            🗓️ Data: {new Date(h.data_pagamento).toLocaleDateString('pt-BR', {timeZone: 'UTC'})} 
                            {forma && <span className="ml-2 font-bold text-slate-500">| 💳 Forma: {forma}</span>}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 justify-between w-full md:w-auto">
                          <span className={`text-base font-black ${isSubtracao ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {isSubtracao ? '- ' : '+ '}R$ {valorRenderizado.toFixed(2)}
                          </span>
                          
                          {podeGerenciar && (
                            <div className="flex gap-2 pl-4 border-l border-slate-200">
                              <button onClick={() => processarAcaoPagamento(h, 'estornar')} disabled={isProcessandoAcao} className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-200 flex items-center justify-center transition-colors text-xs" title="Estornar/Desfazer">🔄</button>
                              {userEmail === 'carlamonaliza9@gmail.com' && (
                                <button onClick={() => processarAcaoPagamento(h, 'excluir')} disabled={isProcessandoAcao} className="w-8 h-8 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center justify-center transition-colors text-xs" title="Excluir Definitivamente do Sistema">🗑️</button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-slate-400 italic font-medium">Nenhum registro de movimentação de crédito encontrado.</div>
                )}
              </div>
            </div>
          </div>

        ) : verBoletim ? (
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 md:p-8 animate-in slide-in-from-bottom-4 duration-300">
              <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                  <div className="flex items-center gap-4">
                    <h3 className="text-xl font-black text-slate-800 tracking-tight">Boletim Escolar</h3>
                    <select 
                      value={anoSelecionado} 
                      onChange={(e) => setAnoSelecionado(e.target.value)}
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none text-slate-700 focus:border-indigo-400"
                    >
                      <option value="2026">Letivo 2026</option>
                      <option value="2025">Letivo 2025</option>
                      <option value="2024">Letivo 2024</option>
                    </select>
                  </div>
                  <div className="flex gap-3">
                      <button onClick={gerarPDFBoletim} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors shadow-sm">📄 IMPRIMIR PDF</button>
                      <button onClick={() => setVerBoletim(false)} className="bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs px-4 py-2.5 rounded-xl transition-colors">← VOLTAR</button>
                  </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead>
                          <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest font-black border-b border-slate-200">
                              <th className="p-4">Disciplina Escolar</th>
                              <th className="p-4 text-center">1ºB</th>
                              <th className="p-4 text-center">2ºB</th>
                              <th className="p-4 text-center text-rose-500">R1</th>
                              <th className="p-4 text-center">3ºB</th>
                              <th className="p-4 text-center">4ºB</th>
                              <th className="p-4 text-center text-rose-500">R2</th>
                              <th className="p-4 text-center text-indigo-600">MÉDIA</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {notas.length > 0 ? notas.map((n) => {
                              const media = obterMediaFinal(n);
                              return (
                                <tr key={n.id} className="hover:bg-slate-50/50 transition-colors bg-white">
                                    <td className="p-4 font-bold text-slate-800 text-sm">{n.disciplina}</td>
                                    {['bimestre1', 'bimestre2', 'recuperacao1', 'bimestre3', 'bimestre4', 'recuperacao2'].map((b) => (
                                        <td key={b} className="p-2 text-center">
                                            <input 
                                              type="text" 
                                              defaultValue={n[b] || ""} 
                                              disabled={true} 
                                              className={`w-12 text-center p-2 rounded-lg border border-slate-200 outline-none font-bold text-sm ${b.includes('recuperacao') ? 'bg-rose-50 border-rose-100' : 'bg-slate-50'} ${parseFloat(n[b]) < 7 ? 'text-rose-600' : 'text-slate-700'}`}
                                            />
                                        </td>
                                    ))}
                                    <td className={`p-4 text-center font-black text-base ${parseFloat(media) < 7 ? 'text-rose-600' : 'text-indigo-600'}`}>{media}</td>
                                </tr>
                              );
                          }) : (
                            <tr>
                              <td colSpan={8} className="p-10 text-center text-slate-400 font-bold bg-slate-50">Nenhum registro acadêmico encontrado para {anoSelecionado}.</td>
                            </tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </div>

        ) : verHistorico ? (
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 md:p-8 animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
              <div className="flex items-center gap-4">
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Extrato Financeiro</h3>
                <select 
                  value={anoPagamentoSelecionado} 
                  onChange={(e) => setAnoPagamentoSelecionado(e.target.value)}
                  className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none text-slate-700 focus:border-indigo-400"
                >
                  <option value="2026">Ano Base 2026</option>
                  <option value="2025">Ano Base 2025</option>
                  <option value="2024">Ano Base 2024</option>
                </select>
              </div>
              <div className="flex gap-3">
                  <button onClick={gerarPDFHistorico} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors shadow-sm">📄 EXPORTAR EXTRATO</button>
                  <button onClick={() => setVerHistorico(false)} className="bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs px-4 py-2.5 rounded-xl transition-colors">← VOLTAR</button>
              </div>
            </div>

            <div className="space-y-4">
              {historicoFiltrado.length > 0 ? historicoFiltrado.map((pgto: any, i: number) => {
                const forma = extrairFormaPagamento(pgto.detalhes_metodos);
                const podeGerenciar = !ehVisitante;
                const devedorRestante = clean(pgto.valor_total) - clean(pgto.valor_pago);
                
                return (
                  <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="space-y-1.5">
                        <span className="text-base font-bold text-slate-800">{pgto.descricao}</span>
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-xs font-semibold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">🗓️ {new Date(pgto.data_pagamento).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</span>
                          {forma && <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-100">💳 {forma}</span>}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end border-t md:border-none border-slate-100 pt-4 md:pt-0 mt-2 md:mt-0">
                        <div className="text-left md:text-right space-y-0.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Original: R$ {clean(pgto.valor_total).toFixed(2)}</span>
                          <span className={`text-lg font-black block ${pgto.status === 'pago' ? 'text-emerald-600' : pgto.status === 'parcial' ? 'text-amber-500' : 'text-rose-600'}`}>Pago: R$ {clean(pgto.valor_pago).toFixed(2)}</span>
                          {devedorRestante > 0 && <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md inline-block uppercase tracking-wider">Aberto: R$ {devedorRestante.toFixed(2)}</span>}
                        </div>

                        {podeGerenciar && (
                          <div className="flex gap-2 pl-4 border-l border-slate-200 h-full items-center">
                            <button onClick={() => { if (prompt("Digite a Senha Mestra para EDITAR:") === SENHA_MESTRA) handleEditarPagamento(pgto); else alert("Senha incorreta."); }} disabled={isProcessandoAcao} className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center transition-colors" title="Editar Valores">✏️</button>
                            <button onClick={() => processarAcaoPagamento(pgto, 'estornar')} disabled={isProcessandoAcao} className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-200 flex items-center justify-center transition-colors" title="Desfazer Lançamento (Estornar)">🔄</button>
                            {userEmail === 'carlamonaliza9@gmail.com' && (
                                <button onClick={() => processarAcaoPagamento(pgto, 'excluir')} disabled={isProcessandoAcao} className="w-8 h-8 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center justify-center transition-colors" title="Excluir Permanentemente">🗑️</button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {pgto.detalhes_metodos?.historico_parciais && pgto.detalhes_metodos.historico_parciais.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 bg-slate-50/50 p-4 rounded-xl">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Histórico de Recebimentos Parciais</span>
                        {pgto.detalhes_metodos.historico_parciais.map((parcial: any, idx: number) => (
                          <div key={idx} className="flex flex-col sm:flex-row justify-between sm:items-center text-xs bg-white p-3 rounded-lg border border-slate-200 shadow-sm gap-2">
                            <span className="font-semibold text-slate-600">📅 {new Date(parcial.data_recebimento).toLocaleDateString('pt-BR', {timeZone: 'UTC'})} <span className="text-slate-300 mx-2">|</span> 💳 {parcial.formas}</span>
                            <div className="flex gap-4 items-center sm:justify-end">
                              {(parseFloat(parcial.desconto) > 0 || parseFloat(parcial.multa) > 0) && (
                                <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                                  {parseFloat(parcial.desconto) > 0 ? `DESC: -R$ ${parseFloat(parcial.desconto).toFixed(2)} ` : ''} 
                                  {parseFloat(parcial.multa) > 0 ? `MULTA: +R$ ${parseFloat(parcial.multa).toFixed(2)}` : ''}
                                </span>
                              )}
                              <span className="font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100">+ R$ {clean(parcial.valor_pago_rodada).toFixed(2)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }) : <div className="p-10 text-center bg-slate-50 rounded-3xl border border-slate-100 text-slate-500 font-bold">Nenhum extrato referenciado encontrado.</div>}
            </div>
          </div>

        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8 animate-in slide-in-from-bottom-4 duration-300">
            
            {/* COLUNA ESQUERDA: Métricas Rápidas */}
            <div className="xl:col-span-12 grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6">
              <div 
                onClick={() => { if(saldoCreditoVisivel > 0) setVerCreditoGlobal(true); }}
                className={`p-4 rounded-3xl border transition-all ${saldoCreditoVisivel > 0 ? 'bg-emerald-50 border-emerald-200 cursor-pointer hover:shadow-md hover:-translate-y-1' : 'bg-white border-slate-100 opacity-60'}`}
              >
                <span className={`text-[10px] font-black uppercase tracking-widest block mb-1 ${saldoCreditoVisivel > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>Crédito Conta</span>
                <p className={`text-xl lg:text-2xl font-black ${saldoCreditoVisivel > 0 ? 'text-emerald-700' : 'text-slate-700'}`}>
                  {saldoCreditoVisivel > 0 ? `R$ ${saldoCreditoVisivel.toFixed(2)}` : 'R$ 0,00'}
                </p>
              </div>

              <div 
                onClick={() => { if(totalPendenteGeral > 0) setVerDividasGlobais(true); }}
                className={`p-4 rounded-3xl border transition-all ${totalPendenteGeral > 0 ? 'bg-rose-50 border-rose-200 cursor-pointer hover:shadow-md hover:-translate-y-1' : 'bg-white border-slate-100 opacity-60'}`}
              >
                <span className={`text-[10px] font-black uppercase tracking-widest block mb-1 ${totalPendenteGeral > 0 ? 'text-rose-600' : 'text-slate-400'}`}>Dívida Ativa</span>
                <p className={`text-xl lg:text-2xl font-black ${totalPendenteGeral > 0 ? 'text-rose-700' : 'text-slate-700'}`}>
                  {totalPendenteGeral > 0 ? `R$ ${totalPendenteGeral.toFixed(2)}` : 'R$ 0,00'}
                </p>
              </div>

              <div className="p-4 rounded-3xl border border-amber-100 bg-amber-50">
                <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest block mb-1">Média Pedagógica</span>
                <p className="text-lg lg:text-xl">{mediaEstrelas > 0 ? "⭐".repeat(Math.round(mediaEstrelas)) : <span className="text-amber-800/40 text-sm font-bold">Sem Notas</span>}</p>
              </div>

              <div className="p-4 rounded-3xl border border-sky-100 bg-sky-50">
                <span className="text-[10px] font-black text-sky-600 uppercase tracking-widest block mb-1">Frequência Anual</span>
                <p className="text-xl lg:text-2xl font-black text-sky-700">{percentualPresenca.toFixed(0)}%</p>
              </div>

              <div className="col-span-2 md:col-span-4 xl:col-span-1 p-4 rounded-3xl border border-indigo-100 bg-indigo-50 flex flex-col justify-center">
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block mb-1">Mensalidade Padrão</span>
                <p className="text-xl lg:text-2xl font-black text-indigo-700 leading-none">{aluno.valor ? parseFloat(aluno.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}</p>
                <span className="text-[10px] font-bold text-indigo-400 mt-1 block">Vence dia {aluno.vencimento || '--'}</span>
              </div>
            </div>

            {/* COLUNA CENTRAL: Dados Pessoais */}
            <div className="xl:col-span-8 space-y-6">
              
              <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-lg">📝</span> 
                  Ficha Cadastral
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nascimento</span>
                    <p className="text-lg font-bold text-slate-800 bg-slate-50 p-4 rounded-2xl border border-slate-200">{aluno.data_nascimento ? new Date(aluno.data_nascimento).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : 'Não registrado'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CPF do Aluno</span>
                    <p className="text-lg font-bold text-slate-800 bg-slate-50 p-4 rounded-2xl border border-slate-200">{mCPF(aluno.cpf_aluno) || 'Não registrado'}</p>
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Endereço Residencial</span>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <p className="text-lg font-bold text-slate-800">{aluno.endereco ? `${aluno.endereco}, ${aluno.numero || 'S/N'}` : 'Endereço não cadastrado'}</p>
                      <p className="text-sm font-semibold text-slate-500 mt-1">{aluno.bairro ? `${aluno.bairro} • ${aluno.cidade}-${aluno.estado}` : ''} {aluno.cep ? ` • CEP: ${aluno.cep}` : ''}</p>
                    </div>
                  </div>
                </div>
              </div>

              {(aluno.observacoes || aluno.tem_alergia) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {aluno.observacoes && (
                    <div className="bg-white p-6 rounded-[2rem] border border-blue-200 shadow-sm relative overflow-hidden md:col-span-1">
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
                      <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest block mb-3">Anotações Pedagógicas</span>
                      <p className="text-sm font-semibold text-slate-700 leading-relaxed whitespace-pre-wrap">{aluno.observacoes}</p>
                    </div>
                  )}
                  {aluno.tem_alergia && (
                    <div className="bg-rose-50 p-6 rounded-[2rem] border border-rose-200 shadow-sm relative overflow-hidden md:col-span-1">
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500"></div>
                      <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest block mb-3 flex items-center gap-2">⚠️ Alerta Médico / Alergia</span>
                      <p className="text-sm font-bold text-rose-800 leading-relaxed">{aluno.alergia_descricao}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Action Area */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                  <button onClick={() => router.push('/admin/documentacoes')} className="group relative overflow-hidden bg-white border border-emerald-200 hover:border-emerald-400 p-6 rounded-[2rem] shadow-sm transition-all flex flex-col items-center justify-center gap-3">
                    <span className="text-3xl group-hover:scale-110 transition-transform">📄</span>
                    <span className="text-xs font-black text-emerald-700 uppercase tracking-widest text-center">Documentações</span>
                  </button>
                  <button onClick={() => setVerBoletim(true)} className="group relative overflow-hidden bg-white border border-amber-200 hover:border-amber-400 p-6 rounded-[2rem] shadow-sm transition-all flex flex-col items-center justify-center gap-3">
                    <span className="text-3xl group-hover:scale-110 transition-transform">🎓</span>
                    <span className="text-xs font-black text-amber-700 uppercase tracking-widest text-center">Consultar Boletim</span>
                  </button>
                  <button onClick={() => setVerHistorico(true)} className="group relative overflow-hidden bg-white border border-indigo-200 hover:border-indigo-400 p-6 rounded-[2rem] shadow-sm transition-all flex flex-col items-center justify-center gap-3">
                    <span className="text-3xl group-hover:scale-110 transition-transform">💳</span>
                    <span className="text-xs font-black text-indigo-700 uppercase tracking-widest text-center">Extrato Financeiro</span>
                  </button>
              </div>

            </div>

            {/* COLUNA DIREITA: Contatos */}
            <div className="xl:col-span-4">
              <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm h-full">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-lg">📞</span> 
                  Responsáveis
                </h3>
                
                <div className="space-y-4">
                  {contatos.map((contato, index) => contato.nome && (
                    <div key={index} className={`p-5 rounded-2xl border ${contato.bg} relative overflow-hidden group`}>
                      <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="pr-12">
                          <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-md mb-3 inline-block bg-white ${contato.cor} shadow-sm border border-slate-100/50`}>{contato.tag}</span>
                          <p className="text-lg font-bold text-slate-900 leading-tight mb-1">{contato.nome}</p>
                          {contato.profissao && <span className="text-sm font-semibold text-slate-500 block">💼 {contato.profissao}</span>}
                          {contato.email && <span className="text-sm font-semibold text-slate-500 block break-all">📧 {contato.email}</span>}
                        </div>
                        {contato.whats && (
                          <button onClick={() => abrirWhatsApp(contato.whats)} className="absolute top-0 right-0 w-11 h-11 bg-emerald-500 rounded-xl shadow-sm border border-emerald-600 flex items-center justify-center hover:bg-emerald-600 hover:scale-105 transition-all text-white" title="Chamar no WhatsApp">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor" className="w-6 h-6"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157.1zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7 .9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/></svg>
                          </button>
                        )}
                      </div>
                      <div className="space-y-2 relative z-10 border-t border-slate-200/50 pt-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-500 w-12">WPP:</span>
                          <span className="text-base font-bold text-slate-700">{mWhatsApp(contato.whats) || '---'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-500 w-12">CPF:</span>
                          <span className="text-base font-bold text-slate-700">{mCPF(contato.cpf) || '---'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {contatos.every(c => !c.nome) && (
                     <div className="p-8 text-center text-slate-400 font-bold bg-slate-50 rounded-2xl border border-slate-100 border-dashed">Nenhum responsável cadastrado.</div>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* RENDERIZAÇÃO DO MODAL DE EDIÇÃO DA FICHA */}
      {modoEdicao && !ehVisitante && (
        <FormAlunoModal 
          idEdicao={alunoId} previewUrl={previewUrl} carregando={carregando} mCPF={mCPF} mWhatsApp={mWhatsApp}
          form={formEdicao}
          setForm={(d: any) => setFormEdicao((prev: any) => ({...prev, ...d}))}
          onTrocarFoto={(e: any) => { 
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
          onSalvar={salvarEdicaoAluno} 
          onCancelar={() => setModoEdicao(false)}
        />
      )}

      {/* RENDERIZAÇÃO DO MODAL DE CAIXA E EDIÇÃO DE PAGAMENTO */}
      <ModalPagamento 
        aberto={modalPDVAberto} onFechar={() => setModalPDVAberto(false)}
        aluno={aluno} dataPagamento={dataPagamentoPDV} setDataPagamento={setDataPagamentoPDV}
        tipoPagamento={tipoPagamentoPDV} setTipoPagamento={setTipoPagamentoPDV}
        mesReferencia={""} setMesReferencia={() => {}} mesesAno={mesesAno}
        descricaoOutro={""} setDescricaoOutro={() => {}}
        pagamentosMetodos={pagamentosMetodosPDV} setPagamentosMetodos={setPagamentosMetodosPDV}
        editando={false} onConfirmar={() => {}}
        dividasAbertas={listaPendenciasGerais}
        onConfirmarPDV={handleConfirmarPDV}
      />

      {/* MODAL PARA EDITAR PAGAMENTO DO HISTÓRICO */}
      <ModalPagamento 
        aberto={modalPgtoAberto} 
        onFechar={() => setModalPgtoAberto(false)}
        aluno={aluno} 
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
        historicoGeral={historicoLocal} 
      />
    </div>
  );
}