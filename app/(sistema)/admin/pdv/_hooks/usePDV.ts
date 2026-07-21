"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useSearchParams, useRouter } from "next/navigation";
import { clean, gerarReciboPDF } from "../_utils/gerarReciboPDF";
import { mesesAno, precosUniformes } from "./pdvConstants";
import {
  parseDetalhesMetodos,
  extrairMesReferencia,
  extrairAnoReferencia,
  inferirAnoCompetenciaLegado,
  competenciasDoRegistro,
  chaveCompetencia,
  registroEhDaCompetencia,
  calcularStatusPeloPagamento,
  obterDataOrdenacaoRegistro,
  parseDataLocal,
  formatarRegistrosRecentes
} from "./pdvUtils";

export function usePDV() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [carregando, setCarregando] = useState(true);
  
  const [alunos, setAlunos] = useState<any[]>([]);
  const [historicoGeral, setHistoricoGeral] = useState<any[]>([]);
  
  const [caixaAtual, setCaixaAtual] = useState<any>(null);
  const [fundoTrocoAbertura, setFundoTrocoAbertura] = useState("");
  const [modalCaixaAberto, setModalCaixaAberto] = useState(false);
  const [modalFechamentoAberto, setModalFechamentoAberto] = useState(false);
  const [gavetaInformada, setGavetaInformada] = useState("");
  const [modalMeusCaixas, setModalMeusCaixas] = useState(false);
  const [historicoCaixas, setHistoricoCaixas] = useState<any[]>([]);
  const [recebimentosTurno, setRecebimentosTurno] = useState<any[]>([]);
  
  const [modalMovimentacao, setModalMovimentacao] = useState<{aberto: boolean, tipo: 'sangria' | 'suprimento'}>({aberto: false, tipo: 'sangria'});
  const [formMovimentacao, setFormMovimentacao] = useState({ valor: "", descricao: "" });
  const [movimentacoesTurno, setMovimentacoesTurno] = useState<any[]>([]);
  
  const [inadimplentesTop5, setInadimplentesTop5] = useState<any[]>([]);
  
  const [buscaAluno, setBuscaAluno] = useState("");
  const [alunoSelecionado, setAlunoSelecionado] = useState<any>(null);
  const [dividasAluno, setDividasAluno] = useState<any[]>([]);
  const [carrinho, setCarrinho] = useState<any[]>([]);
  
  const dataLocal = new Date();
  dataLocal.setMinutes(dataLocal.getMinutes() - dataLocal.getTimezoneOffset());
  const dataHojeStr = dataLocal.toISOString().split('T')[0];
  
  const [dataPagamentoPDV, setDataPagamentoPDV] = useState(dataHojeStr);

  const [registrosRecentes, setRegistrosRecentes] = useState<any[]>([]);
  const [modalEditarRegistroRecente, setModalEditarRegistroRecente] = useState(false);
  const [registroRecenteSelecionado, setRegistroRecenteSelecionado] = useState<any>(null);
  const [formRegistroRecente, setFormRegistroRecente] = useState({
    descricao: "",
    valor_total: "",
    valor_pago: "",
    data_pagamento: dataHojeStr,
    observacao: ""
  });
  
  const [novoItem, setNovoItem] = useState({ tipo: 'uniforme', descricao: '', valor: '' });
  const [uniformesVenda, setUniformesVenda] = useState({ camisaPadrao: 0, camisaEdFisica: 0, calca: 0, shortSaia: 0, short: 0, casaco: 0 });
  const [uniformesTamanhos, setUniformesTamanhos] = useState({ camisaPadrao: "4 anos", camisaEdFisica: "4 anos", calca: "4 anos", shortSaia: "4 anos", short: "4 anos", casaco: "4 anos" });
  
  const totalVendaUniforme = 
    (uniformesVenda.camisaPadrao * precosUniformes.camisaPadrao) + 
    (uniformesVenda.camisaEdFisica * precosUniformes.camisaEdFisica) + 
    (uniformesVenda.calca * precosUniformes.calca) + 
    (uniformesVenda.shortSaia * precosUniformes.shortSaia) + 
    (uniformesVenda.short * precosUniformes.short) + 
    (uniformesVenda.casaco * precosUniformes.casaco);
  
  const [modalCheckoutAberto, setModalCheckoutAberto] = useState(false);
  const [pagamentos, setPagamentos] = useState({ 
    pix: "", dinheiro: "", credito: "", debito: "", boleto: "", 
    credito_aluno: "", pix_editora: "", credito_editora: "", debito_editora: "", parcelas: "1" 
  });
  const [acrescimos, setAcrescimos] = useState({ multa: "", desconto: "", juros_cartao: "" });
  const [processando, setProcessando] = useState(false);
  const [acaoTroco, setAcaoTroco] = useState<'credito' | 'devolver'>('credito');

  const filtrarPagamentosRecentes48h = (historico: any[] = [], caixaIdAtual?: any) => {
    const agora = new Date();
    const limite48h = new Date(agora.getTime() - 48 * 60 * 60 * 1000);
    const caixaIdReferencia = caixaIdAtual || caixaAtual?.id;

    return (historico || []).filter((h: any) => {
      const status = (h.status || '').toLowerCase().trim();
      const tipo = (h.tipo || '').toLowerCase().trim();

      if (!['pago', 'parcial'].includes(status)) return false;
      if (tipo === 'estorno') return false;
      if (clean(h.valor_pago) <= 0) return false;

      // Se foi lançado no caixa aberto, deve aparecer imediatamente,
      // mesmo que a mensalidade seja de outro mês ou o registro seja antigo.
      if (caixaIdReferencia && h.caixa_id && String(h.caixa_id) === String(caixaIdReferencia)) {
        return true;
      }

      const dataRegistro = obterDataOrdenacaoRegistro(h);
      if (!dataRegistro) return false;

      const data = parseDataLocal(dataRegistro) || new Date(dataRegistro);
      if (Number.isNaN(data.getTime())) return false;

      return data >= limite48h;
    });
  };

  const registroPodeSerAlterado = (registro: any) => {
    const status = (registro?.status || '').toLowerCase().trim();
    if (!registro || ['estornado', 'cancelado'].includes(status)) return false;
    if (!caixaAtual?.id || !registro?.caixa_id) return false;

    return String(registro.caixa_id) === String(caixaAtual.id);
  };

  const atualizarAlunoSelecionadoAposRegistro = (registro: any) => {
    if (alunoSelecionado && String(alunoSelecionado.id) === String(registro?.aluno_id)) {
      setAlunoSelecionado((prev: any) => prev ? { ...prev } : prev);
    }
  };

  const temLivroNoCarrinho = carrinho.some(item => item.tipo === 'livro' || (item.descricao || '').toLowerCase().includes('livro'));

  const carregarDadosBase = async () => {
    setCarregando(true);
    
    const { data: sessoesAtivas } = await supabase
      .from('sessoes_caixa')
      .select('*')
      .eq('status', 'aberto')
      .order('data_abertura', { ascending: false })
      .limit(1);

    const sessaoAberta = sessoesAtivas && sessoesAtivas.length > 0 ? sessoesAtivas[0] : null;
    setCaixaAtual(sessaoAberta);

    if (sessaoAberta) {
      const { data: movs } = await supabase.from('movimentacoes_caixa').select('*').eq('caixa_id', sessaoAberta.id);
      if (movs) setMovimentacoesTurno(movs);
    } else {
      setMovimentacoesTurno([]);
    }

    const { data: listaAlunos } = await supabase.from('alunos').select('*').order('nome');
    const { data: historico } = await supabase.from('historico_pagamentos').select('*');
    
    if (listaAlunos && historico) {
      setAlunos(listaAlunos); 
      setHistoricoGeral(historico);
      setRegistrosRecentes(formatarRegistrosRecentes(filtrarPagamentosRecentes48h(historico, sessaoAberta?.id), listaAlunos));
      
      if (sessaoAberta) {
        setRecebimentosTurno(historico.filter(h => h.caixa_id === sessaoAberta.id && (h.status === 'pago' || h.status === 'parcial') && clean(h.valor_pago) > 0));
      } else {
        setRecebimentosTurno([]);
      }

      const urlAlunoId = searchParams.get('alunoId');
      if (urlAlunoId) {
        const alunoPreSelecionado = listaAlunos.find((a: any) => String(a.id) === String(urlAlunoId));
        if (alunoPreSelecionado) { 
          setAlunoSelecionado(alunoPreSelecionado); 
          window.history.replaceState(null, '', window.location.pathname); 
        }
      }
      
      let radarMensalidades: any[] = [];
      try {
        const { data: ms } = await supabase.from('mensalidades').select('*');
        if (ms) radarMensalidades = ms;
      } catch (e) {}

      const mapaDevedores = new Map();
      const hojeRadar = new Date();
      hojeRadar.setHours(0,0,0,0);

      let idsDuvidasRenegociadas: string[] = [];
      historico.forEach(ac => {
         if (ac.tipo === 'acordo') {
             let detalhes = ac.detalhes_metodos;
             if (typeof detalhes === 'string') {
               try { detalhes = JSON.parse(detalhes); } catch(e) { detalhes = {}; }
             }
             if (detalhes?.ids_origem_acordo) {
                 idsDuvidasRenegociadas = idsDuvidasRenegociadas.concat(detalhes.ids_origem_acordo);
             }
         }
      });
      idsDuvidasRenegociadas = Array.from(new Set(idsDuvidasRenegociadas));

      [...historico, ...radarMensalidades].forEach(pend => {
          const status = pend.status?.toLowerCase();
          if (['pago', 'renegociado', 'cancelado', 'estornado'].includes(status)) return;
          
          if (idsDuvidasRenegociadas.includes(String(pend.id))) return;
          
          const devedorRestante = clean(pend.valor_total || pend.valor) - clean(pend.valor_pago);
          if (devedorRestante <= 0) return;

          const tipo = pend.tipo?.toLowerCase() || '';
          if (tipo === 'mensalidade' || tipo === 'acordo') {
              const dataVencStr = pend.data_pagamento || pend.data_vencimento || pend.vencimento;
              if (dataVencStr) {
                const dataVenc = new Date(`${dataVencStr}T12:00:00`);
                dataVenc.setHours(0,0,0,0);
                if (dataVenc >= hojeRadar) return; 
              }
          }

          if (!mapaDevedores.has(pend.aluno_id)) mapaDevedores.set(pend.aluno_id, 0);
          mapaDevedores.set(pend.aluno_id, mapaDevedores.get(pend.aluno_id) + devedorRestante);
      });

      const devedoresFormatados = Array.from(mapaDevedores.entries())
        .map(([aluno_id, total_devido]) => {
          const alunoReferencia = listaAlunos.find(a => a.id === aluno_id);
          return { alunoRaw: alunoReferencia, nome: alunoReferencia?.nome || 'Desconhecido', total_devido };
        })
        .filter(item => item.alunoRaw && item.total_devido > 0)
        .sort((a, b) => b.total_devido - a.total_devido)
        .slice(0, 5);

      setInadimplentesTop5(devedoresFormatados);
    }
    setCarregando(false);
  };

  useEffect(() => { carregarDadosBase(); }, []);

  useEffect(() => {
    if (alunoSelecionado) {
      const buscarPendenciasDoAluno = async () => {
        const { data: dataHistorico } = await supabase.from('historico_pagamentos').select('*').eq('aluno_id', alunoSelecionado.id);
        let registrosPuros = dataHistorico || [];

        try {
          const { data: mData } = await supabase.from('mensalidades').select('*').eq('aluno_id', alunoSelecionado.id);
          if (mData) {
            const extraMensalidades = mData.map((m: any) => {
              const vencimentoMensalidade = m.data_vencimento || m.vencimento || dataHojeStr;
              const mesReferencia = m.mes_referencia || extrairMesReferencia(m) || 'Recorrente';

              return { 
                id: m.id,
                aluno_id: m.aluno_id,
                tipo: 'mensalidade',
                descricao: m.descricao || `Mensalidade - Ref: ${mesReferencia}`,
                mes_referencia: mesReferencia,
                valor_total: m.valor_total || m.valor || 0,
                valor_pago: m.valor_pago || 0,
                status: m.status || 'pendente',
                data_pagamento: vencimentoMensalidade,
                data_vencimento: vencimentoMensalidade,
                detalhes_metodos: m.detalhes_metodos || {},
                isMensalidadeTable: true 
              };
            });
            registrosPuros = [...registrosPuros, ...extraMensalidades];
          }
        } catch (e) {}

        const dataAtual = new Date(); 
        const hoje = new Date(); hoje.setHours(0,0,0,0);
        const anoAtual = dataAtual.getFullYear().toString(); 
        const diaVencimentoAluno = parseInt(alunoSelecionado.vencimento) || 5; 
        const valorMensalidadeBase = parseFloat(alunoSelecionado.valor) || 0;

        if (valorMensalidadeBase > 0) {
          for (let i = 0; i < 12; i++) {
              const nomeMes = mesesAno[i];
              
              const jaExiste = registrosPuros.some((h: any) => {
                const tipo = h.tipo?.toLowerCase();
                const status = (h.status || "").toLowerCase().trim();

                if (!['mensalidade', 'acordo'].includes(tipo)) return false;
                if (['cancelado', 'estornado'].includes(status)) return false;

                return registroEhDaCompetencia(h, nomeMes, anoAtual);
              });
              
              if (!jaExiste) {
                const dataVencimentoReal = new Date(dataAtual.getFullYear(), i, diaVencimentoAluno);
                const dataVencimentoZero = new Date(dataVencimentoReal);
                dataVencimentoZero.setHours(0,0,0,0);
                
                const isAtrasado = dataVencimentoZero < hoje;
                
                registrosPuros.push({ 
                  id: `temp_mens_${nomeMes}_${Date.now()}_${i}`, tipo: 'mensalidade', 
                  descricao: `Mensalidade - ${nomeMes}/${anoAtual}`, mes_referencia: nomeMes, 
                  valor_total: valorMensalidadeBase, valor_pago: 0, 
                  data_pagamento: dataVencimentoReal.toISOString(),
                  data_vencimento: dataVencimentoReal.toISOString(),
                  detalhes_metodos: { competencia: { mes: nomeMes, ano: anoAtual } },
                  status: isAtrasado ? 'atrasado' : 'pendente', 
                  atraso_automatico: isAtrasado, isTemp: true 
                });
              }
          }
        }

        try {
          const { data: eventosControle } = await supabase.from('eventos_controle').select('*').eq('arquivado', false);
          if (eventosControle) {
            eventosControle.forEach(evento => {
              if (evento.participantes && Array.isArray(evento.participantes) && evento.participantes.includes(alunoSelecionado.id)) {
                if (!registrosPuros.some(h => h.tipo === 'evento' && h.descricao?.includes(evento.nome))) {
                  registrosPuros.push({ 
                    id: `temp_ev_${evento.id}_${Date.now()}`, tipo: 'evento', descricao: `Evento: ${evento.nome}`, 
                    mes_referencia: 'Evento', valor_total: clean(evento.valor_unitario), valor_pago: 0, 
                    data_pagamento: evento.data_evento || dataHojeStr, status: 'pendente', isNovo: false, isTemp: true 
                  });
                }
              }
            });
          }
        } catch(e) {}

        let idsDuvidasRenegociadas: string[] = [];
        registrosPuros.forEach(ac => {
           if (ac.tipo === 'acordo') {
               let detalhes = ac.detalhes_metodos;
               if (typeof detalhes === 'string') {
                 try { detalhes = JSON.parse(detalhes); } catch(e) { detalhes = {}; }
               }
               if (detalhes?.ids_origem_acordo) {
                  idsDuvidasRenegociadas = idsDuvidasRenegociadas.concat(detalhes.ids_origem_acordo);
               }
           }
        });
        idsDuvidasRenegociadas = Array.from(new Set(idsDuvidasRenegociadas));

        const competenciasComAcordo = new Set(
          registrosPuros
            .filter((h: any) => {
              const tipo = h.tipo?.toLowerCase();
              const status = (h.status || "").toLowerCase().trim();

              return tipo === 'acordo' && !['cancelado', 'estornado'].includes(status);
            })
            .flatMap((h: any) =>
              competenciasDoRegistro(h).map(comp => chaveCompetencia(comp.mes, comp.ano))
            )
        );

        const competenciasQuitadas = new Set(
          registrosPuros
            .filter((h: any) => {
              const tipo = h.tipo?.toLowerCase();
              const status = (h.status || "").toLowerCase().trim();
              const saldoDevedor = clean(h.valor_total) - clean(h.valor_pago);

              return tipo === 'mensalidade' &&
                !['cancelado', 'estornado'].includes(status) &&
                (status === 'pago' || saldoDevedor <= 0);
            })
            .flatMap((h: any) =>
              competenciasDoRegistro(h).map(comp => chaveCompetencia(comp.mes, comp.ano))
            )
        );

        if (registrosPuros.length > 0) {
          const pendenciasFiltradas = registrosPuros.filter((h: any) => {
            const saldoDevedor = clean(h.valor_total) - clean(h.valor_pago);
            const status = (h.status || '').toLowerCase().trim();
            const tipo = h.tipo?.toLowerCase();

            if (['pago', 'renegociado', 'cancelado', 'estornado'].includes(status) || saldoDevedor <= 0) {
              return false;
            }

            if (idsDuvidasRenegociadas.includes(String(h.id))) {
              return false;
            }

            if (tipo === 'mensalidade') {
              const competenciasMensalidade = competenciasDoRegistro(h);

              const jaExistePagamentoQuitadoParaEssaMensalidade = competenciasMensalidade.some(comp =>
                competenciasQuitadas.has(chaveCompetencia(comp.mes, comp.ano))
              );

              if (jaExistePagamentoQuitadoParaEssaMensalidade) {
                return false;
              }

              const existeAcordoParaEssaMensalidade = competenciasMensalidade.some(comp =>
                competenciasComAcordo.has(chaveCompetencia(comp.mes, comp.ano))
              );

              if (existeAcordoParaEssaMensalidade) {
                return false;
              }
            }

            return true;
          });
          
          setDividasAluno(pendenciasFiltradas.sort((a, b) => new Date(a.data_pagamento).getTime() - new Date(b.data_pagamento).getTime()));
        } else {
          setDividasAluno([]);
        }
      };

      buscarPendenciasDoAluno(); 
      setCarrinho([]); 
      setPagamentos({ pix: "", dinheiro: "", credito: "", debito: "", boleto: "", credito_aluno: "", pix_editora: "", credito_editora: "", debito_editora: "", parcelas: "1" }); 
      setAcrescimos({ multa: "", desconto: "", juros_cartao: "" }); 
      setAcaoTroco('credito'); 
      setDataPagamentoPDV(dataHojeStr);
    } else { 
      setDividasAluno([]); setCarrinho([]); 
    }
  }, [alunoSelecionado]);

  const abrirCaixa = async () => {
    if (processando) return; setProcessando(true);
    try {
      const { data, error } = await supabase.from('sessoes_caixa').insert([{ operador_nome: 'Administração', fundo_inicial: clean(fundoTrocoAbertura), status: 'aberto' }]).select('*').single();
      if (error) throw error;
      setCaixaAtual(data); setModalCaixaAberto(false); alert("Caixa aberto com sucesso!"); carregarDadosBase();
    } catch (e: any) { alert("Erro ao abrir caixa: " + e.message); } finally { setProcessando(false); }
  };

  const handleRegistrarMovimentacao = async () => {
    if (processando || !caixaAtual) return;
    const valorDigitado = clean(formMovimentacao.valor);
    if (valorDigitado <= 0) return alert("Informe um valor válido.");
    if (!formMovimentacao.descricao.trim()) return alert("Informe o motivo.");

    if (modalMovimentacao.tipo === 'sangria') {
        let totalDinheiro = 0;
        recebimentosTurno.forEach(h => { const d = h.detalhes_metodos; if (d) totalDinheiro += clean(d.dinheiro) - clean(d.troco_devolvido_fisico); });
        const totalSup = movimentacoesTurno.filter(m => m.tipo === 'suprimento').reduce((a, b) => a + clean(b.valor), 0);
        const totalSan = movimentacoesTurno.filter(m => m.tipo === 'sangria').reduce((a, b) => a + clean(b.valor), 0);
        const saldoFisicoDisp = clean(caixaAtual.fundo_inicial) + totalDinheiro + totalSup - totalSan;
        
        if (valorDigitado > saldoFisicoDisp) return alert(`ATENÇÃO: Sangria bloqueada!\nNão há dinheiro físico suficiente na gaveta.\n\nSaldo Físico Atual: R$ ${saldoFisicoDisp.toFixed(2)}\nValor Solicitado: R$ ${valorDigitado.toFixed(2)}`);
    }
    
    setProcessando(true);
    try {
      const { data, error } = await supabase.from('movimentacoes_caixa').insert([{ caixa_id: caixaAtual.id, tipo: modalMovimentacao.tipo, valor: valorDigitado, descricao: formMovimentacao.descricao }]).select('*').single();
      if (error) throw error;
      setMovimentacoesTurno([...movimentacoesTurno, data]); setModalMovimentacao({aberto: false, tipo: 'sangria'}); setFormMovimentacao({valor: '', descricao: ''});
      alert(`${modalMovimentacao.tipo === 'sangria' ? 'Sangria' : 'Suprimento'} registrado com sucesso no caixa!`);
    } catch (error: any) { alert("Erro ao registrar movimentação: " + error.message); } finally { setProcessando(false); }
  };

  const confirmarFechamentoCaixa = async () => {
    if (processando || !caixaAtual) return;
    if (gavetaInformada === "") return alert("Informe o valor físico contado na gaveta.");
    
    setProcessando(true);
    try {
      let totalPix = 0, totalDinheiro = 0, totalCredito = 0, totalDebito = 0, totalBoleto = 0;
      recebimentosTurno.forEach(h => {
        const d = h.detalhes_metodos; if (!d) return;
        totalPix += clean(d.pix) + clean(d.pix_editora); totalDinheiro += clean(d.dinheiro) - clean(d.troco_devolvido_fisico); totalCredito += clean(d.credito) + clean(d.credito_editora); totalDebito += clean(d.debito) + clean(d.debito_editora); totalBoleto += clean(d.boleto);
      });

      const totalSuprimentos = movimentacoesTurno.filter(m => m.tipo === 'suprimento').reduce((acc, curr) => acc + clean(curr.valor), 0);
      const totalSangrias = movimentacoesTurno.filter(m => m.tipo === 'sangria').reduce((acc, curr) => acc + clean(curr.valor), 0);
      const esperadoGaveta = clean(caixaAtual.fundo_inicial) + totalDinheiro + totalSuprimentos - totalSangrias;
      const informado = clean(gavetaInformada); const quebra = informado - esperadoGaveta;

      const totalEntradas = recebimentosTurno.reduce((acc, curr) => acc + clean(curr.valor_pago), 0);
      const valorGeralApurado = totalEntradas + clean(caixaAtual.fundo_inicial);
      
      const { error } = await supabase.from('sessoes_caixa').update({
        status: 'fechado', data_fechamento: new Date().toISOString(), total_apurado: valorGeralApurado, valor_em_dinheiro_informado: informado, quebra_caixa: quebra,
        resumo_metodos: { pix: totalPix, dinheiro: totalDinheiro, credito: totalCredito, debito: totalDebito, boleto: totalBoleto, suprimentos: totalSuprimentos, sangrias: totalSangrias, esperadoGaveta: esperadoGaveta }
      }).eq('id', caixaAtual.id);

      if (error) throw error;
      setCaixaAtual(null); setRecebimentosTurno([]); setMovimentacoesTurno([]); setModalFechamentoAberto(false); setGavetaInformada("");
      alert(`Turno Encerrado!\nTotal Faturado no Sistema: R$ ${totalEntradas.toFixed(2)}\n\n${quebra === 0 ? "Caixa batendo perfeitamente." : (quebra > 0 ? `Sobra de R$ ${quebra.toFixed(2)}.` : `Falta de R$ ${Math.abs(quebra).toFixed(2)}.`)}`);
    } catch (e: any) { alert("Erro ao fechar caixa: " + e.message); } finally { setProcessando(false); }
  };

  const carregarRegistrosRecentes = async () => {
    try {
      const { data: listaAlunos } = await supabase.from('alunos').select('*').order('nome');
      const { data: historico, error } = await supabase
        .from('historico_pagamentos')
        .select('*');

      if (error) throw error;

      if (historico) {
        setRegistrosRecentes(formatarRegistrosRecentes(filtrarPagamentosRecentes48h(historico, caixaAtual?.id), listaAlunos || alunos));
        setHistoricoGeral(historico);
      }
    } catch (error: any) {
      alert("Erro ao carregar registros recentes: " + error.message);
    }
  };

  const abrirModalEditarRegistroRecente = (registro: any) => {
    const detalhes = parseDetalhesMetodos(registro?.detalhes_metodos);

    setRegistroRecenteSelecionado(registro);
    setFormRegistroRecente({
      descricao: registro?.descricao || "",
      valor_total: clean(registro?.valor_total || registro?.valor).toFixed(2),
      valor_pago: clean(registro?.valor_pago).toFixed(2),
      data_pagamento: String(registro?.data_pagamento || dataHojeStr).split('T')[0],
      observacao: detalhes?.observacao_edicao || detalhes?.observacao || ""
    });
    setModalEditarRegistroRecente(true);
  };

  const salvarEdicaoRegistroRecente = async () => {
    if (processando || !registroRecenteSelecionado) return;
    if (!registroPodeSerAlterado(registroRecenteSelecionado)) {
      return alert("Este registro não pode ser editado. Só é permitido editar registros do caixa que está aberto no momento.");
    }

    const valorTotalNovo = clean(formRegistroRecente.valor_total);
    const valorPagoNovo = clean(formRegistroRecente.valor_pago);

    if (valorTotalNovo < 0 || valorPagoNovo < 0) return alert("Informe valores válidos.");
    if (!formRegistroRecente.descricao.trim()) return alert("Informe uma descrição para o registro.");

    const statusNovo = calcularStatusPeloPagamento(valorTotalNovo, valorPagoNovo);
    const detalhesAtuais = parseDetalhesMetodos(registroRecenteSelecionado.detalhes_metodos);
    const detalhesAtualizados = {
      ...detalhesAtuais,
      observacao_edicao: formRegistroRecente.observacao,
      ultima_edicao: {
        data: new Date().toISOString(),
        operador: 'Administração',
        antes: {
          descricao: registroRecenteSelecionado.descricao,
          valor_total: clean(registroRecenteSelecionado.valor_total || registroRecenteSelecionado.valor),
          valor_pago: clean(registroRecenteSelecionado.valor_pago),
          data_pagamento: registroRecenteSelecionado.data_pagamento,
          status: registroRecenteSelecionado.status
        },
        depois: {
          descricao: formRegistroRecente.descricao.trim(),
          valor_total: valorTotalNovo,
          valor_pago: valorPagoNovo,
          data_pagamento: formRegistroRecente.data_pagamento,
          status: statusNovo
        }
      }
    };

    setProcessando(true);
    try {
      const { error } = await supabase
        .from('historico_pagamentos')
        .update({
          descricao: formRegistroRecente.descricao.trim(),
          valor_total: valorTotalNovo,
          valor_pago: valorPagoNovo,
          status: statusNovo,
          data_pagamento: formRegistroRecente.data_pagamento,
          detalhes_metodos: detalhesAtualizados
        })
        .eq('id', registroRecenteSelecionado.id);

      if (error) throw error;

      if (detalhesAtuais?.mensalidade_table_id) {
        await supabase
          .from('mensalidades')
          .update({ valor_total: valorTotalNovo, valor_pago: valorPagoNovo, status: statusNovo })
          .eq('id', detalhesAtuais.mensalidade_table_id);
      }

      setModalEditarRegistroRecente(false);
      setRegistroRecenteSelecionado(null);
      await carregarDadosBase();
      atualizarAlunoSelecionadoAposRegistro(registroRecenteSelecionado);
      alert("Registro atualizado com sucesso.");
    } catch (error: any) {
      alert("Erro ao editar registro: " + error.message);
    } finally {
      setProcessando(false);
    }
  };

  const desfazerRegistroRecente = async (registroParametro?: any) => {
    if (processando) return;

    const registro = registroParametro || registroRecenteSelecionado;
    if (!registro) return;

    if (!registroPodeSerAlterado(registro)) {
      return alert("Este registro não pode ser desfeito. Só é permitido desfazer registros do caixa que está aberto no momento.");
    }

    const motivo = window.prompt("Informe o motivo do estorno/desfazimento:", "Lançamento corrigido no PDV");
    if (motivo === null) return;

    const confirmar = window.confirm(`Deseja realmente desfazer este registro?\n\n${registro.descricao || 'Registro'}\nValor pago atual: R$ ${clean(registro.valor_pago).toFixed(2)}`);
    if (!confirmar) return;

    setProcessando(true);
    try {
      const detalhesAtuais = parseDetalhesMetodos(registro.detalhes_metodos);
      const historicoParciais = Array.isArray(detalhesAtuais?.historico_parciais) ? detalhesAtuais.historico_parciais : [];
      const ultimaParcial = historicoParciais[historicoParciais.length - 1];

      const valorPagoAtual = clean(registro.valor_pago);
      const valorTotalAtual = clean(registro.valor_total || registro.valor);
      const valorEstornado = Math.min(
        valorPagoAtual,
        clean(ultimaParcial?.valor_pago_rodada) > 0 ? clean(ultimaParcial.valor_pago_rodada) : valorPagoAtual
      );

      let novoValorPago = Number(Math.max(0, valorPagoAtual - valorEstornado).toFixed(2));
      let novoStatus = calcularStatusPeloPagamento(valorTotalAtual, novoValorPago);
      const tipoRegistro = (registro.tipo || '').toLowerCase();
      const novosParciais = historicoParciais.length > 0 ? historicoParciais.slice(0, -1) : [];

      if (historicoParciais.length === 0 && ['uniforme', 'material', 'outros', 'credito'].includes(tipoRegistro)) {
        novoValorPago = 0;
        novoStatus = 'estornado';
      }

      const estorno = {
        data: new Date().toISOString(),
        operador: 'Administração',
        motivo: motivo.trim() || 'Sem motivo informado',
        valor_estornado: valorEstornado,
        registro_original_id: registro.id
      };

      const detalhesAtualizados = {
        ...detalhesAtuais,
        historico_parciais: novosParciais,
        estornos: Array.isArray(detalhesAtuais?.estornos) ? [...detalhesAtuais.estornos, estorno] : [estorno],
        ultimo_estorno: estorno
      };

      const { error } = await supabase
        .from('historico_pagamentos')
        .update({
          valor_pago: novoValorPago,
          status: novoStatus,
          detalhes_metodos: detalhesAtualizados
        })
        .eq('id', registro.id);

      if (error) throw error;

      if (detalhesAtuais?.mensalidade_table_id) {
        await supabase
          .from('mensalidades')
          .update({ valor_pago: novoValorPago, status: novoStatus })
          .eq('id', detalhesAtuais.mensalidade_table_id);
      }

      await supabase.from('historico_pagamentos').insert({
        aluno_id: registro.aluno_id,
        tipo: 'estorno',
        descricao: `Estorno: ${registro.descricao || 'Registro do PDV'}`,
        mes_referencia: registro.mes_referencia || 'Avulso',
        valor_total: valorEstornado,
        valor_pago: 0,
        status: 'estornado',
        data_pagamento: dataHojeStr,
        data_vencimento: dataHojeStr,
        caixa_id: caixaAtual.id,
        detalhes_metodos: {
          registro_original_id: registro.id,
          motivo: motivo.trim() || 'Sem motivo informado',
          valor_estornado: valorEstornado,
          caixa_original_id: registro.caixa_id,
          data_estorno: new Date().toISOString()
        }
      });

      setModalEditarRegistroRecente(false);
      setRegistroRecenteSelecionado(null);
      await carregarDadosBase();
      atualizarAlunoSelecionadoAposRegistro(registro);
      alert("Registro desfeito com sucesso. O estorno ficou registrado para auditoria.");
    } catch (error: any) {
      alert("Erro ao desfazer registro: " + error.message);
    } finally {
      setProcessando(false);
    }
  };

  const carregarHistoricoCaixas = async () => {
    setModalMeusCaixas(true);
    const { data } = await supabase.from('sessoes_caixa').select('*').order('data_abertura', { ascending: false }).limit(20);
    if (data) setHistoricoCaixas(data);
  };

  const adicionarAoCarrinho = (item: any) => { if (!carrinho.find(c => c.id === item.id)) setCarrinho([...carrinho, item]); };
  const removerDoCarrinho = (id: string) => { setCarrinho(carrinho.filter(c => c.id !== id)); };

  const lancarItemAvulsoNoCarrinho = () => {
    if (novoItem.tipo === 'uniforme') {
      if (totalVendaUniforme <= 0) return alert("Adicione pelo menos um item de uniforme na grade.");
      const itensComprados: string[] = [];
      if (uniformesVenda.camisaPadrao > 0) itensComprados.push(`${uniformesVenda.camisaPadrao}x Camisa Padrão (${uniformesTamanhos.camisaPadrao})`);
      if (uniformesVenda.camisaEdFisica > 0) itensComprados.push(`${uniformesVenda.camisaEdFisica}x Camisa Ed. Física (${uniformesTamanhos.camisaEdFisica})`);
      if (uniformesVenda.calca > 0) itensComprados.push(`${uniformesVenda.calca}x Calça (${uniformesTamanhos.calca})`);
      if (uniformesVenda.shortSaia > 0) itensComprados.push(`${uniformesVenda.shortSaia}x Short-Saia (${uniformesTamanhos.shortSaia})`);
      if (uniformesVenda.short > 0) itensComprados.push(`${uniformesVenda.short}x Short (${uniformesTamanhos.short})`);
      if (uniformesVenda.casaco > 0) itensComprados.push(`${uniformesVenda.casaco}x Casaco (${uniformesTamanhos.casaco})`);
      
      setCarrinho([...carrinho, { id: `novo_${Date.now()}`, tipo: 'uniforme', descricao: `Venda Avulsa: ${itensComprados.join(", ")}`, valor_total: totalVendaUniforme, valor_pago: 0, status: 'pendente', isNovo: true }]);
      setUniformesVenda({ camisaPadrao: 0, camisaEdFisica: 0, calca: 0, shortSaia: 0, short: 0, casaco: 0 });
    } else {
      if (!novoItem.descricao || !novoItem.valor) return alert("Preencha descrição e valor do item avulso.");
      setCarrinho([...carrinho, { id: `novo_${Date.now()}`, tipo: novoItem.tipo, descricao: novoItem.descricao, valor_total: clean(novoItem.valor), valor_pago: 0, status: 'pendente', isNovo: true }]);
      setNovoItem({ ...novoItem, descricao: '', valor: '' });
    }
  };

  const subtotalCarrinho = carrinho.reduce((acc, item) => acc + (clean(item.valor_total) - clean(item.valor_pago)), 0);
  const totalComAcrescimos = Math.max(0, subtotalCarrinho + clean(acrescimos.multa) + clean(acrescimos.juros_cartao) - clean(acrescimos.desconto));
  const somaDinheiroEntrante = clean(pagamentos.pix) + clean(pagamentos.dinheiro) + clean(pagamentos.credito) + clean(pagamentos.debito) + clean(pagamentos.boleto) + clean(pagamentos.pix_editora) + clean(pagamentos.credito_editora) + clean(pagamentos.debito_editora);
  const creditoUtilizado = clean(pagamentos.credito_aluno);
  const totalPagoRodada = somaDinheiroEntrante + creditoUtilizado;
  const faltaPagar = Math.max(0, totalComAcrescimos - totalPagoRodada);
  const trocoGerado = totalPagoRodada > totalComAcrescimos ? Number((totalPagoRodada - totalComAcrescimos).toFixed(2)) : 0;
  const saldoAtualAluno = alunoSelecionado ? clean(alunoSelecionado.saldo_credito) : 0;

  const finalizarVenda = async () => {
    if (processando) return; 
    if (!caixaAtual) return alert("Atenção: Você precisa Abrir o Caixa antes de registrar pagamentos.");
    if (carrinho.length === 0) return alert("O carrinho está vazio.");
    if (totalPagoRodada <= 0 && clean(acrescimos.desconto) <= 0 && carrinho.every(i => !i.isNovo)) return alert("Insira os valores recebidos para dar baixa.");
    if (creditoUtilizado > saldoAtualAluno) return alert("Crédito do aluno insuficiente.");

    let gerarAcordo = false;
    let numeroParcelas = 0;

    if (faltaPagar > 0) {
        const prosseguir = window.confirm(`ATENÇÃO: PAGAMENTO PARCIAL!\n\nO cliente está a pagar R$ ${totalPagoRodada.toFixed(2)}, mas o valor total é R$ ${totalComAcrescimos.toFixed(2)}.\n\nO restante continuará aberto ou poderá ser convertido num Acordo.\n\nDeseja confirmar a transação?`);
        if (!prosseguir) return;

        gerarAcordo = window.confirm(`Deseja transformar o saldo restante de R$ ${faltaPagar.toFixed(2)} em um Acordo / Renegociação agora?`);
        if (gerarAcordo) {
            numeroParcelas = parseInt(prompt(`Em quantas vezes deseja dividir o restante de R$ ${faltaPagar.toFixed(2)}?`, "2") || "0");
            if (numeroParcelas <= 0) gerarAcordo = false;
        }
    }

    setProcessando(true);
    try {
      const urlReciboOficial = await gerarReciboPDF({ aluno: alunoSelecionado, itensCarrinho: carrinho, pagamentosFeitos: pagamentos, acrescimosFeitos: acrescimos, totalVenda: totalComAcrescimos, troco: trocoGerado, acaoTroco, dataPagamentoPDV, subtotalCarrinho });

      let saldoParaDistribuir = Number((totalPagoRodada + clean(acrescimos.desconto) - clean(acrescimos.multa) - clean(acrescimos.juros_cartao)).toFixed(2));
      let trocoDevolvidoFisico = 0;
      
      if (trocoGerado > 0 && acaoTroco === 'devolver') {
        saldoParaDistribuir = Number((saldoParaDistribuir - trocoGerado).toFixed(2));
        trocoDevolvidoFisico = trocoGerado; 
      }

      let idsProcessados: string[] = [];

      for (const item of carrinho) {
        const idString = String(item.id || "");
        const restanteDestaDivida = clean(item.valor_total) - clean(item.valor_pago);
        const valorAbatido = Math.max(0, Math.min(restanteDestaDivida, saldoParaDistribuir));
        saldoParaDistribuir = Number((saldoParaDistribuir - valorAbatido).toFixed(2));

        const novoValorPago = clean(item.valor_pago) + valorAbatido;
        let novoStatus = 'pendente';
        if (novoValorPago >= clean(item.valor_total) - 0.01) novoStatus = 'pago';
        else if (novoValorPago > 0) novoStatus = 'parcial';

        if (valorAbatido === 0 && !item.isNovo && !item.isTemp && !idString.startsWith('temp_') && clean(acrescimos.desconto) === 0 && clean(acrescimos.multa) === 0 && clean(acrescimos.juros_cartao) === 0 && !gerarAcordo) {
            continue; 
        }

        const formasStrArray = [];
        if (clean(pagamentos.pix) > 0) formasStrArray.push("Pix");
        if (clean(pagamentos.dinheiro) > 0) formasStrArray.push("Dinheiro");
        if (clean(pagamentos.credito) > 0) formasStrArray.push(`Cartão Crédito`);
        if (clean(pagamentos.debito) > 0) formasStrArray.push("Cartão Débito");
        if (clean(pagamentos.boleto) > 0) formasStrArray.push("Boleto");
        if (clean(pagamentos.pix_editora) > 0) formasStrArray.push("Pix (Editora)");
        if (clean(pagamentos.credito_editora) > 0) formasStrArray.push(`Cartão Crédito (Editora)`);
        if (clean(pagamentos.debito_editora) > 0) formasStrArray.push("Cartão Débito (Editora)");
        if (creditoUtilizado > 0) formasStrArray.push("Saldo Virtual");
        
        const registroParcial = { data_recebimento: dataPagamentoPDV, data_operacao: new Date().toISOString(), valor_pago_rodada: valorAbatido, formas: formasStrArray.length > 0 ? formasStrArray.join(" + ") : "Ajuste", desconto: acrescimos.desconto, multa: acrescimos.multa, juros_cartao: acrescimos.juros_cartao };
        const detalhesItem = parseDetalhesMetodos(item.detalhes_metodos);
        const historicoAntigo = Array.isArray(detalhesItem?.historico_parciais) ? detalhesItem.historico_parciais : [];

        const mesCompetenciaItem = extrairMesReferencia(item);
        const anoCompetenciaItem =
          extrairAnoReferencia(item) ||
          inferirAnoCompetenciaLegado(item, mesCompetenciaItem) ||
          (
            item.data_vencimento
              ? String(parseDataLocal(item.data_vencimento)?.getFullYear() || "")
              : ""
          ) ||
          dataPagamentoPDV.slice(0, 4);

        const competenciaItem =
          mesCompetenciaItem && anoCompetenciaItem
            ? { mes: mesCompetenciaItem, ano: anoCompetenciaItem }
            : undefined;

        const payloadMetodos = {
          ...detalhesItem,
          ...pagamentos,
          troco_devolvido_fisico: trocoDevolvidoFisico,
          url_recibo: urlReciboOficial,
          origem_pdv: {
            caixa_id: caixaAtual.id,
            data_operacao: new Date().toISOString(),
            aluno_id: alunoSelecionado.id,
            item_original_id: item.id,
            item_novo: !!item.isNovo || !!item.isTemp || idString.startsWith('temp_'),
            mensalidade_table_id: item.isMensalidadeTable ? item.id : detalhesItem?.mensalidade_table_id
          },
          ...(item.isMensalidadeTable ? { mensalidade_table_id: item.id } : {}),
          ...(competenciaItem ? { competencia: competenciaItem } : {}),
          historico_parciais:
            valorAbatido > 0 || clean(acrescimos.desconto) > 0
              ? [...historicoAntigo, registroParcial]
              : historicoAntigo
        };

        let savedId = item.id;
        
        if (item.isNovo || item.isTemp || idString.startsWith('temp_')) {
          const { data } = await supabase.from('historico_pagamentos').insert({ aluno_id: alunoSelecionado.id, tipo: item.tipo || 'mensalidade', descricao: item.descricao, mes_referencia: mesCompetenciaItem || item.mes_referencia || 'Avulso', valor_total: item.valor_total, valor_pago: novoValorPago, status: novoStatus, data_pagamento: dataPagamentoPDV, data_vencimento: item.data_vencimento || item.data_pagamento || dataPagamentoPDV, detalhes_metodos: payloadMetodos, caixa_id: caixaAtual.id }).select('id').single();
          if (data) savedId = data.id;
        } else if (item.isMensalidadeTable) {
          await supabase.from('mensalidades').update({ status: novoStatus, valor_pago: novoValorPago }).eq('id', item.id);
          const { data } = await supabase.from('historico_pagamentos').insert({ aluno_id: alunoSelecionado.id, tipo: 'mensalidade', descricao: item.descricao, mes_referencia: mesCompetenciaItem || item.mes_referencia || 'Recorrente', valor_total: item.valor_total, valor_pago: novoValorPago, status: novoStatus, data_pagamento: dataPagamentoPDV, data_vencimento: item.data_vencimento || item.data_pagamento || dataPagamentoPDV, detalhes_metodos: payloadMetodos, caixa_id: caixaAtual.id }).select('id').single();
          if (data) savedId = data.id;
        } else {
          await supabase.from('historico_pagamentos').update({ status: novoStatus, valor_pago: novoValorPago, data_pagamento: novoStatus === 'pago' ? dataPagamentoPDV : item.data_pagamento, detalhes_metodos: payloadMetodos, caixa_id: caixaAtual.id }).eq('id', item.id);
        }
        if (savedId) idsProcessados.push(String(savedId));
      }

      if (gerarAcordo && numeroParcelas > 0) {
         const competenciasOrigemAcordo = carrinho
           .map((c: any) => {
             const mes = extrairMesReferencia(c);
             const ano =
               extrairAnoReferencia(c) ||
               inferirAnoCompetenciaLegado(c, mes) ||
               (
                 c.data_vencimento
                   ? String(parseDataLocal(c.data_vencimento)?.getFullYear() || "")
                   : ""
               );

             return mes && ano ? { mes, ano } : null;
           })
           .filter(Boolean);

         const valorParcela = faltaPagar / numeroParcelas;
         const novasParcelas = [];
         
         for (let i = 1; i <= numeroParcelas; i++) {
             let dtVencimento = new Date(dataPagamentoPDV);
             dtVencimento.setMonth(dtVencimento.getMonth() + i);
             const pData = dtVencimento.toISOString().split('T')[0];
             
             novasParcelas.push({
                 aluno_id: alunoSelecionado.id,
                 tipo: 'acordo',
                 descricao: `Acordo ${i}/${numeroParcelas} - Ref: ${carrinho.map(c=>c.descricao).join(', ').substring(0,40)}...`,
                 mes_referencia: 'Avulso',
                 valor_total: valorParcela,
                 valor_pago: 0,
                 status: 'pendente',
                 data_pagamento: pData,
                 data_vencimento: pData,
                 caixa_id: caixaAtual.id,
                 detalhes_metodos: {
                     ids_origem_acordo: idsProcessados,
                     competencias_origem: competenciasOrigemAcordo
                 }
             });
         }
         
         await supabase.from('historico_pagamentos').insert(novasParcelas);
         await supabase.from('historico_pagamentos').update({ status: 'renegociado' }).in('id', idsProcessados);
         
         const idsMensalidades = carrinho.filter((c:any) => c.isMensalidadeTable).map((c:any) => c.id);
         if (idsMensalidades.length > 0) {
             await supabase.from('mensalidades').update({ status: 'renegociado' }).in('id', idsMensalidades);
         }
         
         alert("Acordo gerado com sucesso e dívidas originais substituídas.");
      }

      const trocoParaAdicionar = acaoTroco === 'credito' ? trocoGerado : 0;
      if (creditoUtilizado > 0 || trocoParaAdicionar > 0) {
        const novoSaldo = saldoAtualAluno - creditoUtilizado + trocoParaAdicionar;
        await supabase.from('alunos').update({ saldo_credito: novoSaldo }).eq('id', alunoSelecionado.id);

        if (trocoParaAdicionar > 0) {
            await supabase.from('historico_pagamentos').insert({ aluno_id: alunoSelecionado.id, tipo: 'credito', descricao: `Crédito de Troco gerado na quitação.`, mes_referencia: 'Avulso', valor_total: trocoParaAdicionar, valor_pago: trocoParaAdicionar, status: 'pago', data_pagamento: dataPagamentoPDV, detalhes_metodos: { forma_geradora: "Adição Automática", ids_origem: idsProcessados }, caixa_id: caixaAtual.id });
        }
      }

      alert("Transação registrada no Caixa!");
      const querContinuar = window.confirm("Deseja fazer mais algum registro para este aluno?");
      await carregarDadosBase();
      await carregarRegistrosRecentes();
      
      setCarrinho([]); setPagamentos({ pix: "", dinheiro: "", credito: "", debito: "", boleto: "", credito_aluno: "", pix_editora: "", credito_editora: "", debito_editora: "", parcelas: "1" }); setAcrescimos({ multa: "", desconto: "", juros_cartao: "" }); setModalCheckoutAberto(false);
      if (!querContinuar) setAlunoSelecionado(null);
    } catch (error: any) { alert("Erro ao finalizar: " + error.message); } finally { setProcessando(false); }
  };

  const alunosFiltrados = buscaAluno === "" ? alunos.slice(0, 5) : alunos.filter(a => a.nome.toLowerCase().includes(buscaAluno.toLowerCase())).slice(0, 5);

  return {
    router, carregando, alunos, historicoGeral, caixaAtual, fundoTrocoAbertura, setFundoTrocoAbertura,
    modalCaixaAberto, setModalCaixaAberto, modalFechamentoAberto, setModalFechamentoAberto,
    gavetaInformada, setGavetaInformada, modalMeusCaixas, setModalMeusCaixas,
    historicoCaixas, recebimentosTurno, modalMovimentacao, setModalMovimentacao,
    formMovimentacao, setFormMovimentacao, movimentacoesTurno, inadimplentesTop5,
    buscaAluno, setBuscaAluno, alunoSelecionado, setAlunoSelecionado, dividasAluno, carrinho,
    dataPagamentoPDV, setDataPagamentoPDV, novoItem, setNovoItem, uniformesVenda, setUniformesVenda,
    uniformesTamanhos, setUniformesTamanhos, totalVendaUniforme, modalCheckoutAberto, setModalCheckoutAberto,
    pagamentos, setPagamentos, acrescimos, setAcrescimos, processando, acaoTroco, setAcaoTroco,
    registrosRecentes, carregarRegistrosRecentes, modalEditarRegistroRecente, setModalEditarRegistroRecente,
    registroRecenteSelecionado, formRegistroRecente, setFormRegistroRecente, abrirModalEditarRegistroRecente,
    salvarEdicaoRegistroRecente, desfazerRegistroRecente, registroPodeSerAlterado,
    temLivroNoCarrinho, clean, abrirCaixa, handleRegistrarMovimentacao, confirmarFechamentoCaixa,
    carregarHistoricoCaixas, adicionarAoCarrinho, removerDoCarrinho, lancarItemAvulsoNoCarrinho,
    subtotalCarrinho, totalComAcrescimos, totalPagoRodada, faltaPagar, trocoGerado, saldoAtualAluno, finalizarVenda
  };
}