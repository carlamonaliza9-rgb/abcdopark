import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useSearchParams, useRouter } from "next/navigation";
import { clean, gerarReciboPDF } from "../_utils/gerarReciboPDF";

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
  
  const [novoItem, setNovoItem] = useState({ tipo: 'uniforme', descricao: '', valor: '' });
  const [uniformesVenda, setUniformesVenda] = useState({ camisaPadrao: 0, camisaEdFisica: 0, calca: 0, shortSaia: 0, short: 0, casaco: 0 });
  const [uniformesTamanhos, setUniformesTamanhos] = useState({ camisaPadrao: "4 anos", camisaEdFisica: "4 anos", calca: "4 anos", shortSaia: "4 anos", short: "4 anos", casaco: "4 anos" });
  
  const precosUniformes = { camisaPadrao: 60, camisaEdFisica: 60, calca: 80, shortSaia: 60, short: 60, casaco: 130 };
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

  const mesesAno = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

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

      [...historico, ...radarMensalidades].forEach(pend => {
          const status = pend.status?.toLowerCase();
          if (['pago', 'renegociado', 'cancelado', 'estornado'].includes(status)) return;
          
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
            const extraMensalidades = mData.map((m: any) => ({ 
              id: m.id, aluno_id: m.aluno_id, tipo: 'mensalidade', 
              descricao: m.descricao || `Mensalidade - Ref: ${m.mes_referencia || 'Recorrente'}`, 
              valor_total: m.valor_total || m.valor || 0, valor_pago: m.valor_pago || 0, 
              status: m.status || 'pendente', data_pagamento: m.data_vencimento || m.vencimento || dataHojeStr, 
              isMensalidadeTable: true 
            }));
            registrosPuros = [...registrosPuros, ...extraMensalidades];
          }
        } catch (e) {}

        const dataAtual = new Date(); 
        const mesAtualNum = dataAtual.getMonth(); 
        const diaAtual = dataAtual.getDate(); 
        const anoAtual = dataAtual.getFullYear().toString(); 
        const diaVencimentoAluno = parseInt(alunoSelecionado.vencimento) || 5; 
        const valorMensalidadeBase = parseFloat(alunoSelecionado.valor) || 0;

        if (valorMensalidadeBase > 0) {
          for (let i = 0; i <= mesAtualNum; i++) {
            if ((i < mesAtualNum) || (i === mesAtualNum && diaAtual > diaVencimentoAluno)) {
              const nomeMes = mesesAno[i];
              const jaExiste = registrosPuros.some((h: any) => 
                (h.tipo?.toLowerCase() === 'mensalidade' || h.tipo?.toLowerCase() === 'acordo') && 
                h.mes_referencia?.toLowerCase().trim() === nomeMes.toLowerCase() && 
                (h.data_pagamento?.startsWith(anoAtual) || (h.descricao || "").includes(anoAtual)) && 
                !['cancelado', 'estornado', 'renegociado'].includes(h.status)
              );
              
              if (!jaExiste) {
                registrosPuros.push({ 
                  id: `temp_mens_${nomeMes}_${Date.now()}_${i}`, tipo: 'mensalidade', 
                  descricao: `Mensalidade - ${nomeMes}/${anoAtual}`, mes_referencia: nomeMes, 
                  valor_total: valorMensalidadeBase, valor_pago: 0, 
                  data_pagamento: new Date(dataAtual.getFullYear(), i, diaVencimentoAluno).toISOString(), 
                  status: 'atrasado', atraso_automatico: true, isTemp: true 
                });
              }
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

        if (registrosPuros.length > 0) {
          const pendenciasFiltradas = registrosPuros.filter((h: any) => {
            const saldoDevedor = clean(h.valor_total) - clean(h.valor_pago);
            if (['pago', 'renegociado', 'cancelado', 'estornado'].includes((h.status || '').toLowerCase().trim()) || saldoDevedor <= 0) return false;
            if (h.tipo?.toLowerCase() === 'mensalidade' && !h.isTemp) {
                const dataVenc = new Date(h.data_pagamento || h.vencimento);
                const hoje = new Date(); hoje.setHours(0,0,0,0); dataVenc.setHours(0,0,0,0);
                if (dataVenc >= hoje) return false; 
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
    if (faltaPagar > 0 && !window.confirm(`ATENÇÃO: PAGAMENTO PARCIAL!\n\nO cliente está a pagar R$ ${totalPagoRodada.toFixed(2)}, mas o valor total é R$ ${totalComAcrescimos.toFixed(2)}.\n\nDeseja confirmar?`)) return;
    if (totalPagoRodada <= 0 && clean(acrescimos.desconto) <= 0 && carrinho.every(i => !i.isNovo)) return alert("Insira os valores recebidos para dar baixa.");
    if (creditoUtilizado > saldoAtualAluno) return alert("Crédito do aluno insuficiente.");

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

        if (valorAbatido === 0 && !item.isNovo && clean(acrescimos.desconto) === 0 && clean(acrescimos.multa) === 0 && clean(acrescimos.juros_cartao) === 0) continue;

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
        
        const registroParcial = { data_recebimento: dataPagamentoPDV, valor_pago_rodada: valorAbatido, formas: formasStrArray.length > 0 ? formasStrArray.join(" + ") : "Ajuste", desconto: acrescimos.desconto, multa: acrescimos.multa, juros_cartao: acrescimos.juros_cartao };
        const historicoAntigo = Array.isArray(item.detalhes_metodos?.historico_parciais) ? item.detalhes_metodos.historico_parciais : [];
        const payloadMetodos = { ...pagamentos, troco_devolvido_fisico: trocoDevolvidoFisico, url_recibo: urlReciboOficial, historico_parciais: valorAbatido > 0 || clean(acrescimos.desconto) > 0 ? [...historicoAntigo, registroParcial] : historicoAntigo };

        let savedId = item.id;
        
        if (item.isNovo || item.isTemp || idString.startsWith('temp_')) {
          const { data } = await supabase.from('historico_pagamentos').insert({ aluno_id: alunoSelecionado.id, tipo: item.tipo || 'mensalidade', descricao: item.descricao, mes_referencia: item.mes_referencia || 'Avulso', valor_total: item.valor_total, valor_pago: novoValorPago, status: novoStatus, data_pagamento: dataPagamentoPDV, detalhes_metodos: payloadMetodos, caixa_id: caixaAtual.id }).select('id').single();
          if (data) savedId = data.id;
        } else if (item.isMensalidadeTable) {
          await supabase.from('mensalidades').update({ status: novoStatus, valor_pago: novoValorPago }).eq('id', item.id);
          const { data } = await supabase.from('historico_pagamentos').insert({ aluno_id: alunoSelecionado.id, tipo: 'mensalidade', descricao: item.descricao, mes_referencia: 'Recorrente', valor_total: item.valor_total, valor_pago: novoValorPago, status: novoStatus, data_pagamento: dataPagamentoPDV, detalhes_metodos: payloadMetodos, caixa_id: caixaAtual.id }).select('id').single();
          if (data) savedId = data.id;
        } else {
          await supabase.from('historico_pagamentos').update({ status: novoStatus, valor_pago: novoValorPago, data_pagamento: novoStatus === 'pago' ? dataPagamentoPDV : item.data_pagamento, detalhes_metodos: payloadMetodos, caixa_id: caixaAtual.id }).eq('id', item.id);
        }
        if (savedId) idsProcessados.push(String(savedId));
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
    temLivroNoCarrinho, clean, abrirCaixa, handleRegistrarMovimentacao, confirmarFechamentoCaixa,
    carregarHistoricoCaixas, adicionarAoCarrinho, removerDoCarrinho, lancarItemAvulsoNoCarrinho,
    subtotalCarrinho, totalComAcrescimos, totalPagoRodada, faltaPagar, trocoGerado, saldoAtualAluno, finalizarVenda
  };
}