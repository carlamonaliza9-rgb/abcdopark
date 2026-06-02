"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { ModalPagamento } from "@/app/dashboard/financeiro/_components/ModalPagamento";
import { FormAlunoModal } from "@/app/dashboard/alunos/_components/FormAlunoModal";
import { clean, SENHA_MESTRA, mesesAno, mCPF, mWhatsApp } from "./_components/alunoUtils";
import { BannerAluno, VisaoGeralAluno, DividasAluno, CreditoAluno, BoletimAluno, ExtratoAluno } from "./_components/ViewsPerfil";

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
      // ==========================================
      // MOTOR DE DESDUPLICAÇÃO (Antecipações e Conflitos)
      // ==========================================
      const mesesPagos = new Set();
      
      // 1. Rastreador de meses pagos
      historicoCompleto.forEach(h => {
        if (h.status === 'pago' && (h.tipo?.toLowerCase() === 'mensalidade' || h.tipo?.toLowerCase() === 'acordo')) {
          const desc = (h.descricao || "").toLowerCase();
          let mes = (h.mes_referencia || "").toLowerCase().trim();
          
          if (!mes) {
            const nomesMeses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
            mes = nomesMeses.find(m => desc.includes(m)) || "";
          }
          
          const anoMatch = desc.match(/(20\d{2})/);
          let anoRef = anoMatch ? anoMatch[0] : null;

          if (!anoRef && h.data_pagamento) {
            const dPgto = new Date(h.data_pagamento);
            if (dPgto.getMonth() >= 9) { // Se pagou no final do ano
              const mesesInicio = ["janeiro", "fevereiro", "março", "abril"];
              anoRef = mesesInicio.includes(mes) ? (dPgto.getFullYear() + 1).toString() : dPgto.getFullYear().toString();
            } else {
              anoRef = dPgto.getFullYear().toString();
            }
          }

          if (mes && anoRef) mesesPagos.add(`${mes}_${anoRef}`);
        }
      });

      // 2. Filtra o histórico físico apagando as duplicidades pendentes de meses já pagos
      const historicoSemDuplicatas = historicoCompleto.filter(h => {
        if ((h.status === 'pendente' || h.status === 'atrasado') && h.tipo?.toLowerCase() === 'mensalidade') {
          const desc = (h.descricao || "").toLowerCase();
          let mes = (h.mes_referencia || "").toLowerCase().trim();
          
          if (!mes) {
            const nomesMeses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
            mes = nomesMeses.find(m => desc.includes(m)) || "";
          }
          
          const anoMatch = desc.match(/(20\d{2})/);
          let anoRef = anoMatch ? anoMatch[0] : (h.data_vencimento || h.data_pagamento)?.substring(0, 4);

          // Se a chave "mes_ano" já foi paga, descarta a versão pendente da tela/extrato
          if (mes && anoRef && mesesPagos.has(`${mes}_${anoRef}`)) return false; 
        }
        return true;
      });

      // Usa o histórico limpo para renderizar o ExtratoAluno
      setHistoricoLocal(historicoSemDuplicatas);

      let dividaCalculada = 0;
      let listaDívida = [];
      const hojeStr = new Date();
      hojeStr.setHours(0,0,0,0);

      // 3. Verifica pendências físicas limpas, exigindo que estejam em atraso real
      const pendenciasRegistradas = historicoSemDuplicatas.filter(h => {
        if (h.status === 'renegociado' || h.status === 'cancelado' || h.status === 'estornado' || h.status === 'pago') return false;
        
        const devedor = clean(h.valor_total) - clean(h.valor_pago);
        if (devedor <= 0) return false;

        // Se for mensalidade (cadastrada fisicamente), exige atraso
        if (h.tipo?.toLowerCase() === 'mensalidade') {
          const dataVenc = new Date(h.data_vencimento || h.vencimento || h.data_pagamento);
          dataVenc.setHours(0,0,0,0);
          if (dataVenc >= hojeStr) return false; // Ignora se o vencimento é hoje ou futuro (Pendente)
        }
        return true;
      });

      pendenciasRegistradas.forEach(pend => {
        dividaCalculada += (clean(pend.valor_total) - clean(pend.valor_pago));
        listaDívida.push({ ...pend, atraso_automatico: pend.tipo?.toLowerCase() === 'mensalidade' }); 
      });

      // 4. Varredura Virtual de Mensalidades (Atrasos Faltantes)
      const dataAtual = new Date();
      const mesAtualNum = dataAtual.getMonth(); 
      const anoAtual = dataAtual.getFullYear().toString();
      const diaVencimentoAluno = parseInt(aluno.vencimento);
      const valorMensalidadeBase = clean(aluno.valor);

      if (valorMensalidadeBase > 0 && !isNaN(diaVencimentoAluno)) {
        for (let i = 0; i <= mesAtualNum; i++) {
          const isVencido = (i < mesAtualNum) || (i === mesAtualNum && dataAtual.getDate() > diaVencimentoAluno);
          if (!isVencido) continue; // Pula os meses futuros ou o mês atual não vencido

          const nomeMes = mesesAno[i];
          const chaveBusca = `${nomeMes.toLowerCase()}_${anoAtual}`;

          // Se já está no caderninho de pagos (antecipado ou normal), ignora
          if (mesesPagos.has(chaveBusca)) continue;

          // Se já tem uma dívida física gerada para esse mês, ignora para não duplicar
          const jaTemDividaFisica = pendenciasRegistradas.some(h => {
            const isMensalidade = h.tipo?.toLowerCase() === 'mensalidade' || h.tipo?.toLowerCase() === 'acordo';
            const isMesCorreto = h.mes_referencia?.toLowerCase().trim() === nomeMes.toLowerCase() || (h.descricao||"").toLowerCase().includes(nomeMes.toLowerCase());
            const isAnoCorreto = (h.descricao||"").includes(anoAtual) || h.data_pagamento?.startsWith(anoAtual);
            return isMensalidade && isMesCorreto && isAnoCorreto;
          });

          if (!jaTemDividaFisica) {
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

  async function handleDeletarFicha() {
    if (isProcessandoAcao) return;
    if (userEmail !== 'carlamonaliza9@gmail.com') return alert("Acesso negado: Apenas a administração master pode excluir uma ficha.");
    if (prompt("Digite a Senha Mestra para DELETAR A FICHA DO ALUNO:") !== SENHA_MESTRA) return alert("Senha incorreta.");
    if (!confirm(`ATENÇÃO! Você está prestes a excluir PERMANENTEMENTE a ficha de ${aluno.nome}. Todos os dados serão perdidos. Deseja realmente continuar?`)) return;

    setIsProcessandoAcao(true);
    setCarregando(true);
    try {
      await supabase.from('historico_pagamentos').delete().eq('aluno_id', alunoId);
      await supabase.from('mensalidades').delete().eq('aluno_id', alunoId);
      await supabase.from('boletins').delete().eq('aluno_id', alunoId);
      await supabase.from('taxas_eventos').delete().eq('aluno_id', alunoId);
      
      const { error } = await supabase.from('alunos').delete().eq('id', alunoId);
      if (error) throw error;
      
      alert("Ficha do aluno excluída com sucesso.");
      router.push('/admin/alunos');
    } catch (error: any) {
      alert("Erro ao excluir ficha: " + error.message);
      setIsProcessandoAcao(false);
      setCarregando(false);
    }
  }

  async function processarAcaoPagamento(pgto: any, acao: 'estornar' | 'excluir') {
    if (isProcessandoAcao) return;
    if (acao === 'excluir' && userEmail !== 'carlamonaliza9@gmail.com') return alert("Acesso negado: Apenas a administração master pode excluir registros permanentemente do banco.");
    if (prompt(`Digite a Senha Mestra para ${acao.toUpperCase()}:`) !== SENHA_MESTRA) return alert("Senha incorreta.");

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
                if (dividasVinculadas.length > 0) mensagem += `- ${dividasVinculadas.length} parcela(s) originais serão ${acao === 'estornar' ? 'reabertas (Status: Pendente)' : 'excluídas do sistema'}.\n`;
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
            if (h.descricao && pgto.descricao && h.descricao.toLowerCase().includes(pgto.descricao.toLowerCase())) return true;
            return false;
        });

        for (const c of creditosGerados) {
            idsParaDeletar.push(c.id);
            variacaoSaldoCredito -= clean(c.valor_total);
            mensagem += `- O Troco gerado por este pagamento será CANCELADO e retirado da carteira: -R$ ${clean(c.valor_total).toFixed(2)}\n`;
        }
    }

    const saldoFinalEsperado = Math.max(0, saldoCreditoVisivel + variacaoSaldoCredito);
    mensagem += `\nSaldo Atual na Carteira: R$ ${saldoCreditoVisivel.toFixed(2)}\nSaldo Final Após Operação: R$ ${saldoFinalEsperado.toFixed(2)}\n\nConfirmar operação de Integridade?`;

    if (!confirm(mensagem)) return;

    setIsProcessandoAcao(true);
    setCarregando(true);
    try {
        if (variacaoSaldoCredito !== 0) {
            await supabase.from('alunos').update({ saldo_credito: saldoFinalEsperado }).eq('id', aluno.id);
            setSaldoCreditoVisivel(saldoFinalEsperado);
        }
        if (idsParaDeletar.length > 0) await supabase.from('historico_pagamentos').delete().in('id', idsParaDeletar);
        if (idsParaZerar.length > 0) await supabase.from('historico_pagamentos').update({ status: 'pendente', valor_pago: 0, detalhes_metodos: {} }).in('id', idsParaZerar);

        alert(`Operação de ${acao} processada com sucesso! Relatórios e carteira reajustados.`);
        await buscarAlunoBase();
        await buscarDadosAdicionais();
    } catch (error: any) { alert("Erro ao processar ação: " + error.message); } 
    finally { setCarregando(false); setIsProcessandoAcao(false); }
  }

  const abrirEdicaoFicha = () => {
    setFormEdicao({
      nome: aluno.nome || "", cpfAluno: aluno.cpf_aluno || "", dataNascimento: aluno.data_nascimento || "",
      turma: aluno.turma || "", turno: aluno.turno || "", cep: aluno.cep || "", endereco: aluno.endereco || "",
      numero: aluno.numero || "", bairro: aluno.bairro || "", cidade: aluno.cidade || "", estado: aluno.estado || "",
      valor: aluno.valor || "", vencimento: aluno.vencimento || "", responsavel: aluno.responsavel || "",
      parentesco1: aluno.parentesco_1 || aluno.parentesco1 || "Mãe", whatsapp: aluno.whatsapp || "",
      cpfResponsavel: aluno.cpf_responsavel || "", emailResponsavel: aluno.email_responsavel || "",
      profissaoResponsavel: aluno.profissao_responsavel || aluno.responsavel_profissao || "",
      responsavel2: aluno.responsavel2 || aluno.responsavel_2_nome || "", parentesco2: aluno.parentesco_2 || aluno.parentesco2 || "Pai",
      whatsapp2: aluno.whatsapp2 || aluno.responsavel_2_contato || "", cpfResponsavel2: aluno.cpf_responsavel2 || aluno.cpf_responsavel_2 || "",
      emailResponsavel2: aluno.email_responsavel_2 || aluno.email_responsavel2 || "",
      profissaoResponsavel2: aluno.profissao_responsavel2 || aluno.responsavel_2_profissao || "",
      responsavel3: aluno.responsavel3 || aluno.responsavel_3_nome || "", parentesco3: aluno.parentesco_3 || aluno.parentesco3 || "",
      whatsapp3: aluno.whatsapp3 || aluno.responsavel_3_contato || "", emailResponsavel3: aluno.email_responsavel_3 || aluno.email_responsavel3 || "",
      eAutista: aluno.e_autista || false, temAlergia: aluno.tem_alergia || false,
      alergiaDescricao: aluno.alergia_descricao || "", observacoes: aluno.observacoes || ""
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
        canvas.width = TAMANHO_ALVO; canvas.height = TAMANHO_ALVO;
        if (ctx) {
          const menorDimensao = Math.min(img.width, img.height);
          ctx.drawImage(img, (img.width - menorDimensao) / 2, (img.height - menorDimensao) / 2, menorDimensao, menorDimensao, 0, 0, TAMANHO_ALVO, TAMANHO_ALVO);
        }
        canvas.toBlob((blob) => { if (blob) resolve(blob); else resolve(arquivo); }, "image/jpeg", 0.9);
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
        const { data, error: uploadError } = await supabase.storage.from('fotos-alunos').upload(nomeArquivo, imagemRecortadaBlob, { contentType: 'image/jpeg' });
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
        responsavel_3_nome: formEdicao.responsavel3, parentesco_3: formEdicao.parentesco3, responsavel_3_contato: formEdicao.whatsapp3, email_responsavel_3: formEdicao.emailResponsavel3,
        valor: formEdicao.valor ? parseFloat(formEdicao.valor.toString()) : null, vencimento: formEdicao.vencimento, data_nascimento: formEdicao.dataNascimento,
        tem_alergia: formEdicao.temAlergia, alergia_descricao: formEdicao.temAlergia ? formEdicao.alergiaDescricao : "", e_autista: formEdicao.eAutista, 
        observacoes: formEdicao.observacoes, foto_url: urlFinal
      };

      const { error: errorUpdate } = await supabase.from('alunos').update(dadosParaEnviar).eq('id', alunoId);
      if (errorUpdate) throw errorUpdate;

      setModoEdicao(false); 
      await buscarAlunoBase();
    } catch (error: any) { alert("Erro ao salvar: " + (error.message || "Ocorreu um erro inesperado.")); } 
    finally { setCarregando(false); setIsProcessandoAcao(false); }
  }

  function handleEditarPagamento(pgto: any) {
    setIdPagamentoEdicao(pgto.id); setDataPagamento(pgto.data_pagamento); setTipoPagamento(pgto.tipo);
    setDescricaoOutro(pgto.descricao); setPagamentosMetodos(pgto.detalhes_metodos || { pix: "", dinheiro: "", credito: "", debito: "", multa: "" });
    setModalPgtoAberto(true);
  }

  async function handleSalvarPgtoEditado() {
    if (isProcessandoAcao) return;
    setIsProcessandoAcao(true);

    const soma = Object.values(pagamentosMetodos).reduce((acc, val) => acc + (parseFloat(val as string) || 0), 0);
    const dados = { tipo: tipoPagamento, descricao: descricaoOutro, valor_total: soma, data_pagamento: dataPagamento, detalhes_metodos: pagamentosMetodos };
    await supabase.from('historico_pagamentos').update(dados).eq('id', idPagamentoEdicao);
    
    const checkTroco = historicoLocal.filter(h => Array.isArray(h.detalhes_metodos?.ids_origem) && h.detalhes_metodos.ids_origem.map(String).includes(String(idPagamentoEdicao)));
    if (checkTroco.length > 0) alert("Atenção: Você editou manualmente uma parcela que havia gerado troco. O valor na carteira de crédito do aluno NÃO foi reajustado automaticamente. Recomendamos o Estorno ao invés da edição caso tenha errado o valor pago.");

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
      const novoHistoricoParcial = [...historicoAntigo, { data_recebimento: dataPagamentoPDV, valor_pago_rodada: valorAbatido, formas: formaPagamentoTexto, desconto: valorDesconto, multa: valorMulta }];
      const jsonMetodos = { ...pagamentosMetodosPDV, credito_utilizado_nesta_parcela: creditoAbatidoAqui, historico_parciais: novoHistoricoParcial };

      let savedId = div.id;

      if (idString.startsWith('temp_')) {
        const { data } = await supabase.from('historico_pagamentos').insert({
          aluno_id: aluno.id, tipo: 'mensalidade', descricao: div.descricao, mes_referencia: div.mes_referencia,
          valor_total: valorOriginalTotal, valor_pago: novoValorPago, status: novoStatus, data_pagamento: dataPagamentoPDV, detalhes_metodos: jsonMetodos
        }).select('id').single();
        if (data) savedId = data.id;
      } else {
        await supabase.from('historico_pagamentos').update({ 
          status: novoStatus, valor_pago: novoValorPago, data_pagamento: novoStatus === 'pago' ? dataPagamentoPDV : div.data_pagamento, detalhes_metodos: jsonMetodos 
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
        aluno_id: aluno.id, tipo: 'credito', descricao: descricaoTroco, mes_referencia: 'Avulso',
        valor_total: trocoGlobal, valor_pago: trocoGlobal, status: 'pago', data_pagamento: dataPagamentoPDV,
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
    if (qtdParcelas < 1) { setIsProcessandoAcao(false); return alert("Número de parcelas inválido."); }

    const valorDevedor = clean(pendenciaOriginal.valor_total) - clean(pendenciaOriginal.valor_pago);
    const valorPorParcela = valorDevedor / qtdParcelas;
    const mesRef = pendenciaOriginal.mes_referencia || "";

    const inserts = [];
    for (let i = 0; i < qtdParcelas; i++) {
      const dataVenc = new Date(formRenegociacao.vencimentoInicial);
      dataVenc.setMonth(dataVenc.getMonth() + i);

      inserts.push({
        aluno_id: aluno.id, tipo: 'acordo', descricao: `Acordo ${i + 1}/${qtdParcelas} (${pendenciaOriginal.descricao})`, mes_referencia: mesRef, 
        valor_total: valorPorParcela, valor_pago: 0, status: 'pendente', data_pagamento: dataVenc.toISOString().split('T')[0], detalhes_metodos: {}
      });
    }

    await supabase.from('historico_pagamentos').insert(inserts);

    if (String(pendenciaOriginal.id).startsWith('temp_') || pendenciaOriginal.isTemp) {
      await supabase.from('historico_pagamentos').insert({
        aluno_id: aluno.id, tipo: pendenciaOriginal.tipo || 'mensalidade', descricao: pendenciaOriginal.descricao, mes_referencia: pendenciaOriginal.mes_referencia || 'Avulso',
        valor_total: pendenciaOriginal.valor_total, valor_pago: 0, status: 'renegociado', data_pagamento: pendenciaOriginal.data_pagamento || new Date().toISOString().split('T')[0], detalhes_metodos: { info: "Convertido em Acordo" }
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

    if (diferenca === 0) { setIsProcessandoAcao(false); setEditandoCredito(false); return; }

    const { error } = await supabase.from('alunos').update({ saldo_credito: valorConvertido }).eq('id', aluno.id);
    if (!error) { 
        await supabase.from('historico_pagamentos').insert({
          aluno_id: aluno.id, tipo: 'credito', descricao: `Ajuste manual de saldo de crédito na Ficha (${diferenca > 0 ? 'Adição' : 'Subtração'} de R$ ${Math.abs(diferenca).toFixed(2)})`,
          mes_referencia: 'Avulso', valor_total: Math.abs(diferenca), valor_pago: Math.abs(diferenca), status: 'pago', data_pagamento: new Date().toISOString().split('T')[0], detalhes_metodos: { forma_geradora: "Ajuste Direto na Ficha", e_subtracao: diferenca < 0 }
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
            aluno_id: aluno.id, tipo: 'credito', descricao: `Zeração manual da carteira de crédito. Motivo: ${motivo}`, mes_referencia: 'Avulso',
            valor_total: valorRemovido, valor_pago: valorRemovido, status: 'pago', data_pagamento: new Date().toISOString().split('T')[0], detalhes_metodos: { forma_geradora: "Exclusão Manual", e_subtracao: true }
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

  if (carregando || !aluno) return <div className="flex justify-center items-center h-screen bg-slate-50 text-slate-500 font-bold">Carregando Perfil...</div>;

  return (
    <div className="w-full bg-[#f8fafc] min-h-screen font-sans antialiased text-slate-800 pb-24 md:p-6 lg:p-8">
      <div className="max-w-[1700px] w-full mx-auto space-y-6 lg:space-y-8 animate-in fade-in duration-300">
        
        <BannerAluno 
          aluno={aluno} 
          router={router} 
          ehVisitante={ehVisitante} 
          abrirEdicaoFicha={abrirEdicaoFicha} 
          userEmail={userEmail} 
          onExcluir={handleDeletarFicha} 
          isProcessandoAcao={isProcessandoAcao} 
        />

        {verDividasGlobais ? (
          <DividasAluno totalPendenteGeral={totalPendenteGeral} listaPendenciasGerais={listaPendenciasGerais} setVerDividasGlobais={setVerDividasGlobais} ehVisitante={ehVisitante} setModalPDVAberto={setModalPDVAberto} idRenegociacao={idRenegociacao} setIdRenegociacao={setIdRenegociacao} formRenegociacao={formRenegociacao} setFormRenegociacao={setFormRenegociacao} confirmarRenegociacao={confirmarRenegociacao} isProcessandoAcao={isProcessandoAcao} />
        ) : verCreditoGlobal ? (
          <CreditoAluno historicoLocal={historicoLocal} saldoCreditoVisivel={saldoCreditoVisivel} setVerCreditoGlobal={setVerCreditoGlobal} editandoCredito={editandoCredito} setEditandoCredito={setEditandoCredito} novoValorCredito={novoValorCredito} setNovoValorCredito={setNovoValorCredito} handleSalvarCredito={handleSalvarCredito} handleZerarCredito={handleZerarCredito} isProcessandoAcao={isProcessandoAcao} ehVisitante={ehVisitante} processarAcaoPagamento={processarAcaoPagamento} userEmail={userEmail} />
        ) : verBoletim ? (
          <BoletimAluno aluno={aluno} anoSelecionado={anoSelecionado} setAnoSelecionado={setAnoSelecionado} notas={notas} setVerBoletim={setVerBoletim} />
        ) : verHistorico ? (
          <ExtratoAluno aluno={aluno} historicoLocal={historicoLocal} anoPagamentoSelecionado={anoPagamentoSelecionado} setAnoPagamentoSelecionado={setAnoPagamentoSelecionado} setVerHistorico={setVerHistorico} ehVisitante={ehVisitante} isProcessandoAcao={isProcessandoAcao} handleEditarPagamento={handleEditarPagamento} processarAcaoPagamento={processarAcaoPagamento} userEmail={userEmail} SENHA_MESTRA={SENHA_MESTRA} />
        ) : (
          <VisaoGeralAluno aluno={aluno} saldoCreditoVisivel={saldoCreditoVisivel} setVerCreditoGlobal={setVerCreditoGlobal} totalPendenteGeral={totalPendenteGeral} setVerDividasGlobais={setVerDividasGlobais} mediaEstrelas={mediaEstrelas} percentualPresenca={percentualPresenca} router={router} alunoId={alunoId} setVerBoletim={setVerBoletim} setVerHistorico={setVerHistorico} />
        )}

      </div>

      {modoEdicao && !ehVisitante && (
        <FormAlunoModal 
          idEdicao={alunoId} previewUrl={previewUrl} carregando={carregando} mCPF={mCPF} mWhatsApp={mWhatsApp} form={formEdicao}
          setForm={(d: any) => setFormEdicao((prev: any) => ({...prev, ...d}))}
          onTrocarFoto={(e: any) => { 
            if (!e.target.files) { setArquivoFoto(null); setPreviewUrl(null); return; }
            const file = e.target.files?.[0]; 
            if (file) { setArquivoFoto(file); setPreviewUrl(URL.createObjectURL(file)); } 
          }}
          onSalvar={salvarEdicaoAluno} 
          onCancelar={() => setModoEdicao(false)}
        />
      )}

      <ModalPagamento 
        aberto={modalPDVAberto} onFechar={() => setModalPDVAberto(false)} aluno={aluno} dataPagamento={dataPagamentoPDV} setDataPagamento={setDataPagamentoPDV}
        tipoPagamento={tipoPagamentoPDV} setTipoPagamento={setTipoPagamentoPDV} mesReferencia={""} setMesReferencia={() => {}} mesesAno={mesesAno} descricaoOutro={""} setDescricaoOutro={() => {}}
        pagamentosMetodos={pagamentosMetodosPDV} setPagamentosMetodos={setPagamentosMetodosPDV} editando={false} onConfirmar={() => {}} dividasAbertas={listaPendenciasGerais} onConfirmarPDV={handleConfirmarPDV}
      />

      <ModalPagamento 
        aberto={modalPgtoAberto} onFechar={() => setModalPgtoAberto(false)} aluno={aluno} dataPagamento={dataPagamento} setDataPagamento={setDataPagamento} tipoPagamento={tipoPagamento} setTipoPagamento={setTipoPagamento}
        mesReferencia={mesReferencia} setMesReferencia={setMesReferencia} mesesAno={mesesAno} descricaoOutro={descricaoOutro} setDescricaoOutro={setDescricaoOutro} pagamentosMetodos={pagamentosMetodos} setPagamentosMetodos={setPagamentosMetodos}
        onConfirmar={handleSalvarPgtoEditado} editando={true} historicoGeral={historicoLocal} 
      />
    </div>
  );
}