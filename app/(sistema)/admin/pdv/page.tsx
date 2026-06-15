"use client";

import { useState, useEffect, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { 
  HeaderPDV, 
  ModalAberturaCaixa, 
  ModalFechamentoCaixa, 
  ModalMeusCaixas, 
  ModalMovimentacaoCaixa, 
  ModalCheckout,
  IdentificacaoCliente, 
  AreaDeVendasComAbas, 
  CarrinhoLateral, 
  StatusCaixaReduzido, 
  RadarInadimplencia
} from "./_components/PDVViews";

const clean = (val: any) => {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === 'number') return val;
  const str = String(val).trim();
  if (str.includes(',')) return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
  return parseFloat(str) || 0;
};

function PDVContent() {
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
  const [dataPagamentoPDV, setDataPagamentoPDV] = useState(new Date().toISOString().split('T')[0]);
  
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
  
  // Checkout Modal
  const [modalCheckoutAberto, setModalCheckoutAberto] = useState(false);
  const [pagamentos, setPagamentos] = useState({ 
    pix: "", dinheiro: "", credito: "", debito: "", boleto: "", 
    credito_aluno: "", pix_editora: "", credito_editora: "", debito_editora: "", parcelas: "1" 
  });
  const [acrescimos, setAcrescimos] = useState({ multa: "", desconto: "", juros_cartao: "" });
  const [processando, setProcessando] = useState(false);
  const [acaoTroco, setAcaoTroco] = useState<'credito' | 'devolver'>('credito');

  const dataHojeStr = new Date().toISOString().split('T')[0];
  const mesesAno = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const SENHA_MESTRA = "1234";

  const temLivroNoCarrinho = carrinho.some(item => item.tipo === 'livro' || (item.descricao || '').toLowerCase().includes('livro'));

  useEffect(() => { 
    carregarDadosBase(); 
  }, []);

  async function carregarDadosBase() {
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
      const { data: movs } = await supabase
        .from('movimentacoes_caixa')
        .select('*')
        .eq('caixa_id', sessaoAberta.id);
      if (movs) setMovimentacoesTurno(movs);
    } else {
      setMovimentacoesTurno([]);
    }

    const { data: listaAlunos } = await supabase.from('alunos').select('*').order('nome');
    const { data: historico } = await supabase
      .from('historico_pagamentos')
      .select('*');
    
    if (listaAlunos && historico) {
      setAlunos(listaAlunos); 
      setHistoricoGeral(historico);
      
      if (sessaoAberta) {
        setRecebimentosTurno(historico.filter(h => 
          h.caixa_id === sessaoAberta.id && 
          (h.status === 'pago' || h.status === 'parcial') && 
          clean(h.valor_pago) > 0
        ));
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

      // LÓGICA RIGOROSA DO RADAR DE INADIMPLÊNCIA
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
                const dataVenc = new Date(dataVencStr);
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
  }

  const abrirCaixa = async () => {
    if (processando) return; 
    setProcessando(true);
    
    try {
      const { data, error } = await supabase.from('sessoes_caixa').insert([{ 
        operador_nome: 'Administração', 
        fundo_inicial: clean(fundoTrocoAbertura), 
        status: 'aberto' 
      }]).select('*').single();
      
      if (error) throw error;
      
      setCaixaAtual(data); 
      setModalCaixaAberto(false);
      alert("Caixa aberto com sucesso!"); 
      carregarDadosBase();
    } catch (e: any) { 
      alert("Erro ao abrir caixa: " + e.message); 
    } finally { 
      setProcessando(false); 
    }
  };

  const handleRegistrarMovimentacao = async () => {
    if (!caixaAtual) return;
    const valorDigitado = clean(formMovimentacao.valor);
    if (valorDigitado <= 0) return alert("Informe um valor válido.");
    if (!formMovimentacao.descricao.trim()) return alert("Informe o motivo.");

    // LÓGICA DE AUDITORIA DE SANGRIA FÍSICA
    if (modalMovimentacao.tipo === 'sangria') {
        let totalDinheiro = 0;
        recebimentosTurno.forEach(h => {
            const d = h.detalhes_metodos; 
            if (!d) return;
            totalDinheiro += clean(d.dinheiro) - clean(d.troco_devolvido_fisico);
        });
        const totalSup = movimentacoesTurno.filter(m => m.tipo === 'suprimento').reduce((a, b) => a + clean(b.valor), 0);
        const totalSan = movimentacoesTurno.filter(m => m.tipo === 'sangria').reduce((a, b) => a + clean(b.valor), 0);
        
        const saldoFisicoDisp = clean(caixaAtual.fundo_inicial) + totalDinheiro + totalSup - totalSan;
        
        if (valorDigitado > saldoFisicoDisp) {
            return alert(`ATENÇÃO: Sangria bloqueada!\nNão há dinheiro físico suficiente na gaveta.\n\nSaldo Físico Atual: R$ ${saldoFisicoDisp.toFixed(2)}\nValor Solicitado: R$ ${valorDigitado.toFixed(2)}`);
        }
    }
    
    setProcessando(true);
    try {
      const { data, error } = await supabase.from('movimentacoes_caixa').insert([{ 
        caixa_id: caixaAtual.id, 
        tipo: modalMovimentacao.tipo, 
        valor: valorDigitado, 
        descricao: formMovimentacao.descricao 
      }]).select('*').single();
      
      if (error) throw error;
      
      setMovimentacoesTurno([...movimentacoesTurno, data]); 
      setModalMovimentacao({aberto: false, tipo: 'sangria'}); 
      setFormMovimentacao({valor: '', descricao: ''});
      alert(`${modalMovimentacao.tipo === 'sangria' ? 'Sangria' : 'Suprimento'} registrado com sucesso no caixa!`);
    } catch (error: any) { 
      alert("Erro ao registrar movimentação: " + error.message); 
    } finally { 
      setProcessando(false); 
    }
  };

  const confirmarFechamentoCaixa = async () => {
    if (!caixaAtual) return;
    if (gavetaInformada === "") return alert("Informe o valor físico contado na gaveta.");
    
    setProcessando(true);
    try {
      let totalPix = 0, totalDinheiro = 0, totalCredito = 0, totalDebito = 0, totalBoleto = 0;
      
      recebimentosTurno.forEach(h => {
        const d = h.detalhes_metodos; 
        if (!d) return;
        totalPix += clean(d.pix) + clean(d.pix_editora); 
        totalDinheiro += clean(d.dinheiro) - clean(d.troco_devolvido_fisico); 
        totalCredito += clean(d.credito) + clean(d.credito_editora); 
        totalDebito += clean(d.debito) + clean(d.debito_editora); 
        totalBoleto += clean(d.boleto);
      });

      const totalSuprimentos = movimentacoesTurno.filter(m => m.tipo === 'suprimento').reduce((acc, curr) => acc + clean(curr.valor), 0);
      const totalSangrias = movimentacoesTurno.filter(m => m.tipo === 'sangria').reduce((acc, curr) => acc + clean(curr.valor), 0);
      const esperadoGaveta = clean(caixaAtual.fundo_inicial) + totalDinheiro + totalSuprimentos - totalSangrias;
      const informado = clean(gavetaInformada); 
      const quebra = informado - esperadoGaveta;

      const totalEntradas = recebimentosTurno.reduce((acc, curr) => acc + clean(curr.valor_pago), 0);
      const valorGeralApurado = totalEntradas + clean(caixaAtual.fundo_inicial);
      
      const { error } = await supabase.from('sessoes_caixa').update({
        status: 'fechado', 
        data_fechamento: new Date().toISOString(), 
        total_apurado: valorGeralApurado, 
        valor_em_dinheiro_informado: informado, 
        quebra_caixa: quebra,
        resumo_metodos: { 
          pix: totalPix, 
          dinheiro: totalDinheiro, 
          credito: totalCredito, 
          debito: totalDebito, 
          boleto: totalBoleto, 
          suprimentos: totalSuprimentos, 
          sangrias: totalSangrias, 
          esperadoGaveta: esperadoGaveta 
        }
      }).eq('id', caixaAtual.id);

      if (error) throw error;
      
      setCaixaAtual(null); 
      setRecebimentosTurno([]); 
      setMovimentacoesTurno([]); 
      setModalFechamentoAberto(false); 
      setGavetaInformada("");
      
      const textoQuebra = quebra === 0 
        ? "Caixa batendo perfeitamente." 
        : (quebra > 0 ? `Sobra de R$ ${quebra.toFixed(2)}.` : `Falta de R$ ${Math.abs(quebra).toFixed(2)}.`);
        
      alert(`Turno Encerrado!\nTotal Faturado no Sistema: R$ ${totalEntradas.toFixed(2)}\n\n${textoQuebra}`);
    } catch (e: any) { 
      alert("Erro ao fechar caixa: " + e.message); 
    } finally { 
      setProcessando(false); 
    }
  };

  const carregarHistoricoCaixas = async () => {
    setModalMeusCaixas(true);
    const { data } = await supabase.from('sessoes_caixa').select('*').order('data_abertura', { ascending: false }).limit(20);
    if (data) setHistoricoCaixas(data);
  };

  const estornarPagamento = async (pgto: any) => {
    if (processando) return;
    const isAdmin = prompt(`Digite a Senha Mestra para ESTORNAR:`);
    if (isAdmin !== SENHA_MESTRA) return alert("Senha incorreta.");

    let variacaoSaldoCredito = 0;
    let idsParaDeletar: string[] = [];
    let idsParaZerar: string[] = [];
    let mensagem = "⚠️ DETALHES DO ESTORNO:\n\n";

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
                const dividasVinculadas = historicoGeral.filter(h => strOrigens.includes(String(h.id)));
                
                for (const div of dividasVinculadas) {
                    idsParaZerar.push(div.id);
                    let creditoUsado = clean(div.detalhes_metodos?.credito_utilizado_nesta_parcela);
                    if (creditoUsado === 0 && clean(div.detalhes_metodos?.credito_aluno) > 0) creditoUsado = clean(div.detalhes_metodos?.credito_aluno);
                    
                    if (creditoUsado > 0) {
                        variacaoSaldoCredito += creditoUsado;
                        mensagem += `- Reembolso (Parcela Vinculada usou crédito): +R$ ${creditoUsado.toFixed(2)}\n`;
                    }
                }
                if (dividasVinculadas.length > 0) {
                    mensagem += `- ${dividasVinculadas.length} parcela(s) originais voltarão a ficar PENDENTES.\n`;
                }
            }
        } else {
            variacaoSaldoCredito += Math.abs(valorCredito);
            idsParaDeletar.push(pgto.id);
            mensagem += `- Reversão de Subtração (O valor voltará para a carteira): +R$ ${Math.abs(valorCredito).toFixed(2)}\n`;
        }
    } else {
        idsParaZerar.push(pgto.id);
        mensagem += `- A transação voltará para PENDENTE (R$ 0,00 pago).\n`;
        
        let creditoUsado = clean(pgto.detalhes_metodos?.credito_utilizado_nesta_parcela);
        if (creditoUsado === 0 && clean(pgto.detalhes_metodos?.credito_aluno) > 0) creditoUsado = clean(pgto.detalhes_metodos?.credito_aluno);
        
        if (creditoUsado > 0) {
            variacaoSaldoCredito += creditoUsado;
            mensagem += `- Devolução do Crédito Virtual usado no pagamento: +R$ ${creditoUsado.toFixed(2)}\n`;
        }

        const creditosGerados = historicoGeral.filter(h => {
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

    const alunoEspecifico = alunos.find(a => a.id === pgto.aluno_id);
    const saldoAtual = alunoEspecifico ? clean(alunoEspecifico.saldo_credito) : 0;
    const saldoFinalEsperado = Math.max(0, saldoAtual + variacaoSaldoCredito);
    
    mensagem += `\nSaldo Atual na Carteira: R$ ${saldoAtual.toFixed(2)}`;
    mensagem += `\nSaldo Final Após Estorno: R$ ${saldoFinalEsperado.toFixed(2)}\n\nConfirmar operação de Estorno Integrado?`;

    if (!window.confirm(mensagem)) return;

    setProcessando(true);
    try {
        if (variacaoSaldoCredito !== 0) {
            await supabase.from('alunos').update({ saldo_credito: saldoFinalEsperado }).eq('id', pgto.aluno_id);
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

        alert("Estorno processado com sucesso! Relatórios e carteira reajustados.");
        await carregarDadosBase();
    } catch (error: any) {
        alert("Erro ao estornar: " + error.message);
    } finally {
        setProcessando(false);
    }
  };

  function gerarPDFRecibo(aluno: any, itensCarrinho: any[], pagamentosFeitos: any, acrescimosFeitos: any, totalVenda: number, troco: number) {
    const doc = new jsPDF();
    const logoUrl = "https://mnmakhazghgncqummksu.supabase.co/storage/v1/object/public/assets/logo.png";
    try { doc.addImage(logoUrl, "PNG", 15, 12, 22, 22); } catch (e) {}

    doc.setFont("helvetica", "bold"); 
    doc.setFontSize(16); 
    doc.setTextColor(30, 41, 59); 
    doc.text("ESCOLA ABC DO PARK", 42, 18);
    
    doc.setFont("helvetica", "normal"); 
    doc.setFontSize(9); 
    doc.setTextColor(100, 116, 139);
    doc.text("Recibo Oficial de Pagamento (PDV)", 42, 24);

    doc.setFont("helvetica", "bold"); 
    doc.setFontSize(12); 
    doc.setTextColor(30, 41, 59); 
    doc.text("RECIBO FINANCEIRO", 195, 18, { align: "right" });
    
    doc.setFont("helvetica", "normal"); 
    doc.setFontSize(8); 
    doc.setTextColor(148, 163, 184); 
    doc.text(`Data do Lançamento: ${dataPagamentoPDV.split('-').reverse().join('/')}`, 195, 24, { align: "right" });
    doc.text(`Emissão do Recibo: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 195, 29, { align: "right" });

    doc.setDrawColor(226, 232, 240); 
    doc.line(15, 34, 195, 34);

    autoTable(doc, {
      startY: 38,
      body: [
        [ 
          { content: `ALUNO(A):\n${aluno.nome.toUpperCase()}`, styles: { fontStyle: 'bold' } }, 
          { content: `TURMA:\n${aluno.turma?.toUpperCase() || 'N/A'}`, styles: { fontStyle: 'bold' } },
          { content: `CPF:\n${aluno.cpf_aluno || aluno.cpf_responsavel || 'N/A'}`, styles: { fontStyle: 'bold' } }
        ]
      ],
      theme: 'plain', 
      styles: { fontSize: 9, cellPadding: 3, textColor: [71, 85, 105], fillColor: [248, 250, 252] }
    });

    const tableRows = itensCarrinho.map((item: any) => {
      const saldoDevedorAnterior = clean(item.valor_total) - clean(item.valor_pago);
      return [
        (item.tipo || 'Lançamento').toUpperCase(),
        item.descricao.toUpperCase(),
        `R$ ${clean(item.valor_total).toFixed(2)}`,
        `R$ ${saldoDevedorAnterior.toFixed(2)}`
      ];
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 6,
      head: [['TIPO DE CONTA', 'DESCRIÇÃO DO ITEM COBRADO', 'VALOR ORIGINAL', 'SALDO DEVEDOR ANTERIOR']],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
      styles: { fontSize: 8, cellPadding: 4, textColor: [30, 41, 59] },
      columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right', fontStyle: 'bold', textColor: [153, 27, 27] } }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 8;

    const metodosUsados = [];
    if (clean(pagamentosFeitos.pix) > 0) metodosUsados.push(['Pix:', `R$ ${clean(pagamentosFeitos.pix).toFixed(2)}`]);
    if (clean(pagamentosFeitos.dinheiro) > 0) metodosUsados.push(['Dinheiro em Espécie:', `R$ ${clean(pagamentosFeitos.dinheiro).toFixed(2)}`]);
    
    if (clean(pagamentosFeitos.credito) > 0) {
      let desc = `Cartão de Crédito ${pagamentosFeitos.parcelas}x:`;
      if (clean(acrescimosFeitos.juros_cartao) > 0) desc = `Cartão de Crédito ${pagamentosFeitos.parcelas}x (c/ Juros):`;
      metodosUsados.push([desc, `R$ ${clean(pagamentosFeitos.credito).toFixed(2)}`]);
    }
    
    if (clean(pagamentosFeitos.debito) > 0) metodosUsados.push(['Cartão de Débito:', `R$ ${clean(pagamentosFeitos.debito).toFixed(2)}`]);
    if (clean(pagamentosFeitos.boleto) > 0) metodosUsados.push(['Boleto Bancário:', `R$ ${clean(pagamentosFeitos.boleto).toFixed(2)}`]);
    
    if (clean(pagamentosFeitos.pix_editora) > 0) metodosUsados.push(['Pix (Editora/FTD):', `R$ ${clean(pagamentosFeitos.pix_editora).toFixed(2)}`]);
    if (clean(pagamentosFeitos.credito_editora) > 0) metodosUsados.push([`Cartão de Crédito (Editora) ${pagamentosFeitos.parcelas}x:`, `R$ ${clean(pagamentosFeitos.credito_editora).toFixed(2)}`]);
    if (clean(pagamentosFeitos.debito_editora) > 0) metodosUsados.push(['Cartão de Débito (Editora):', `R$ ${clean(pagamentosFeitos.debito_editora).toFixed(2)}`]);
    
    if (clean(pagamentosFeitos.credito_aluno) > 0) metodosUsados.push(['Saldo Virtual (Carteira do Aluno):', `R$ ${clean(pagamentosFeitos.credito_aluno).toFixed(2)}`]);

    const subtotalBase = subtotalCarrinho;
    const valorMultaAplicada = clean(acrescimosFeitos.multa);
    const valorDescontoAplicado = clean(acrescimosFeitos.desconto);
    const valorJurosCartao = clean(acrescimosFeitos.juros_cartao);
    const totalRecebidoSomado = metodosUsados.reduce((acc, curr) => acc + clean(curr[1].replace('R$ ', '')), 0);

    const corpoResumo: any[] = [
      ['SUBTOTAL DAS CONTAS:', `R$ ${subtotalBase.toFixed(2)}`],
      ...(valorDescontoAplicado > 0 ? [['DESCONTOS APLICADOS:', `- R$ ${valorDescontoAplicado.toFixed(2)}`]] : []),
      ...(valorMultaAplicada > 0 ? [['MULTA / JUROS:', `+ R$ ${valorMultaAplicada.toFixed(2)}`]] : []),
      ...(valorJurosCartao > 0 ? [['JUROS DA MÁQUINA:', `+ R$ ${valorJurosCartao.toFixed(2)}`]] : []), 
      [{ content: 'VALOR TOTAL APURADO:', styles: { fontStyle: 'bold', textColor: [15, 23, 42] } }, { content: `R$ ${totalVenda.toFixed(2)}`, styles: { fontStyle: 'bold', textColor: [15, 23, 42] } }],
      ['-', '-'],
      [{ content: 'FORMAS DE PAGAMENTO UTILIZADAS', colSpan: 2, styles: { fontStyle: 'bold', halign: 'left', fillColor: [248, 250, 252] } }],
      ...metodosUsados,
      [{ content: 'TOTAL EFETIVAMENTE PAGO:', styles: { fontStyle: 'bold', textColor: [22, 163, 74] } }, { content: `R$ ${totalRecebidoSomado.toFixed(2)}`, styles: { fontStyle: 'bold', textColor: [22, 163, 74] } }]
    ];

    if (troco > 0) {
      corpoResumo.push([{ content: `TROCO GERADO (${acaoTroco === 'credito' ? 'Guardado na Carteira' : 'Devolvido'}):`, styles: { fontStyle: 'bold', textColor: [217, 119, 6] } }, { content: `R$ ${troco.toFixed(2)}`, styles: { fontStyle: 'bold', textColor: [217, 119, 6] } }]);
    }

    autoTable(doc, {
      startY: finalY, margin: { left: 95 }, 
      body: corpoResumo,
      theme: 'plain', styles: { fontSize: 8.5, cellPadding: 3.5, halign: 'right', textColor: [71, 85, 105] }, 
      columnStyles: { 0: { cellWidth: 70 }, 1: { cellWidth: 30, fontStyle: 'bold', halign: 'right' } }
    });

    const pageHeight = doc.internal.pageSize.height;
    doc.setFont("helvetica", "italic"); 
    doc.setFontSize(7); 
    doc.setTextColor(148, 163, 184);
    doc.text("Este documento é um recibo de pagamento emitido eletronicamente e comprova a quitação/amortização dos itens acima descritos.", 105, pageHeight - 15, { align: 'center' });
    doc.save(`Recibo_PDV_${aluno.nome.replace(/\s+/g, '_')}_${dataPagamentoPDV}.pdf`);
  }

  useEffect(() => {
    if (alunoSelecionado) {
      const buscarPendenciasDoAluno = async () => {
        const { data: dataHistorico } = await supabase.from('historico_pagamentos').select('*').eq('aluno_id', alunoSelecionado.id);
        let registrosPuros = dataHistorico || [];

        try {
          const { data: mData } = await supabase.from('mensalidades').select('*').eq('aluno_id', alunoSelecionado.id);
          if (mData) {
            const extraMensalidades = mData.map((m: any) => ({ 
              id: m.id, 
              aluno_id: m.aluno_id, 
              tipo: 'mensalidade', 
              descricao: m.descricao || `Mensalidade - Ref: ${m.mes_referencia || 'Recorrente'}`, 
              valor_total: m.valor_total || m.valor || 0, 
              valor_pago: m.valor_pago || 0, 
              status: m.status || 'pendente', 
              data_pagamento: m.data_vencimento || m.vencimento || dataHojeStr, 
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
                  id: `temp_mens_${nomeMes}_${Date.now()}_${i}`, 
                  tipo: 'mensalidade', 
                  descricao: `Mensalidade - ${nomeMes}/${anoAtual}`, 
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
        }

        try {
          const { data: eventosControle } = await supabase.from('eventos_controle').select('*').eq('arquivado', false);
          if (eventosControle) {
            eventosControle.forEach(evento => {
              if (evento.participantes && Array.isArray(evento.participantes) && evento.participantes.includes(alunoSelecionado.id)) {
                if (!registrosPuros.some(h => h.tipo === 'evento' && h.descricao?.includes(evento.nome))) {
                  registrosPuros.push({ 
                    id: `temp_ev_${evento.id}_${Date.now()}`, 
                    tipo: 'evento', 
                    descricao: `Evento: ${evento.nome}`, 
                    mes_referencia: 'Evento', 
                    valor_total: clean(evento.valor_unitario), 
                    valor_pago: 0, 
                    data_pagamento: evento.data_evento || dataHojeStr, 
                    status: 'pendente', 
                    isNovo: false, 
                    isTemp: true 
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
                const hoje = new Date(); 
                hoje.setHours(0,0,0,0); 
                dataVenc.setHours(0,0,0,0);
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
      setDividasAluno([]); 
      setCarrinho([]); 
    }
  }, [alunoSelecionado]);

  const adicionarAoCarrinho = (item: any) => { 
    if (!carrinho.find(c => c.id === item.id)) {
      setCarrinho([...carrinho, item]); 
    }
  };
  
  const removerDoCarrinho = (id: string) => { 
    setCarrinho(carrinho.filter(c => c.id !== id)); 
  };

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
      
      setCarrinho([...carrinho, { 
        id: `novo_${Date.now()}`, 
        tipo: 'uniforme', 
        descricao: `Venda Avulsa: ${itensComprados.join(", ")}`, 
        valor_total: totalVendaUniforme, 
        valor_pago: 0, 
        status: 'pendente', 
        isNovo: true 
      }]);
      setUniformesVenda({ camisaPadrao: 0, camisaEdFisica: 0, calca: 0, shortSaia: 0, short: 0, casaco: 0 });
    } else {
      if (!novoItem.descricao || !novoItem.valor) return alert("Preencha descrição e valor do item avulso.");
      
      setCarrinho([...carrinho, { 
        id: `novo_${Date.now()}`, 
        tipo: novoItem.tipo, 
        descricao: novoItem.descricao, 
        valor_total: clean(novoItem.valor), 
        valor_pago: 0, 
        status: 'pendente', 
        isNovo: true 
      }]);
      setNovoItem({ ...novoItem, descricao: '', valor: '' });
    }
  };

  const subtotalCarrinho = carrinho.reduce((acc, item) => acc + (clean(item.valor_total) - clean(item.valor_pago)), 0);
  const totalComAcrescimos = Math.max(0, subtotalCarrinho + clean(acrescimos.multa) + clean(acrescimos.juros_cartao) - clean(acrescimos.desconto));
  
  const somaDinheiroEntrante = clean(pagamentos.pix) + clean(pagamentos.dinheiro) + clean(pagamentos.credito) + clean(pagamentos.debito) + clean(pagamentos.boleto) + clean(pagamentos.pix_editora) + clean(pagamentos.credito_editora) + clean(pagamentos.debito_editora);
  const creditoUtilizado = clean(pagamentos.credito_aluno);
  const totalPagoRodada = somaDinheiroEntrante + creditoUtilizado;
  
  const faltaPagar = Math.max(0, totalComAcrescimos - totalPagoRodada);
  const trocoGerado = totalPagoRodada > totalComAcrescimos ? totalPagoRodada - totalComAcrescimos : 0;
  const saldoAtualAluno = alunoSelecionado ? clean(alunoSelecionado.saldo_credito) : 0;

  const finalizarVenda = async () => {
    if (!caixaAtual) return alert("Atenção: Você precisa Abrir o Caixa antes de registrar pagamentos.");
    if (processando) return; 
    if (carrinho.length === 0) return alert("O carrinho está vazio.");
    
    if (faltaPagar > 0) {
        const confirmarParcial = window.confirm(`ATENÇÃO: PAGAMENTO PARCIAL!\n\nO cliente está a pagar R$ ${totalPagoRodada.toFixed(2)}, mas o valor total a ser pago é R$ ${totalComAcrescimos.toFixed(2)}.\n\nDeseja confirmar este recebimento parcial? O saldo restante continuará como dívida em aberto no sistema.`);
        if (!confirmarParcial) return;
    }

    if (totalPagoRodada <= 0 && clean(acrescimos.desconto) <= 0 && carrinho.every(i => !i.isNovo)) return alert("Insira os valores recebidos para dar baixa.");
    if (creditoUtilizado > saldoAtualAluno) return alert("Crédito do aluno insuficiente.");

    setProcessando(true);
    try {
      let saldoParaDistribuir = totalPagoRodada + clean(acrescimos.desconto) - clean(acrescimos.multa) - clean(acrescimos.juros_cartao);
      let trocoDevolvidoFisico = 0;
      
      if (trocoGerado > 0 && acaoTroco === 'devolver') {
        saldoParaDistribuir -= trocoGerado;
        trocoDevolvidoFisico = trocoGerado; 
      }

      let idsProcessados: string[] = [];

      for (const item of carrinho) {
        const idString = String(item.id || "");
        const restanteDestaDivida = clean(item.valor_total) - clean(item.valor_pago);
        const valorAbatido = Math.max(0, Math.min(restanteDestaDivida, saldoParaDistribuir));
        saldoParaDistribuir -= valorAbatido;

        const novoValorPago = clean(item.valor_pago) + valorAbatido;
        let novoStatus = 'pendente';
        if (novoValorPago >= clean(item.valor_total) - 0.01) novoStatus = 'pago';
        else if (novoValorPago > 0) novoStatus = 'parcial';

        if (valorAbatido === 0 && !item.isNovo && clean(acrescimos.desconto) === 0 && clean(acrescimos.multa) === 0 && clean(acrescimos.juros_cartao) === 0) continue;

        const formasStrArray = [];
        if (clean(pagamentos.pix) > 0) formasStrArray.push("Pix");
        if (clean(pagamentos.dinheiro) > 0) formasStrArray.push("Dinheiro");
        if (clean(pagamentos.credito) > 0) formasStrArray.push(`Cartão de Crédito ${pagamentos.parcelas}x`);
        if (clean(pagamentos.debito) > 0) formasStrArray.push("Cartão de Débito");
        if (clean(pagamentos.boleto) > 0) formasStrArray.push("Boleto");
        if (clean(pagamentos.pix_editora) > 0) formasStrArray.push("Pix (Editora)");
        if (clean(pagamentos.credito_editora) > 0) formasStrArray.push(`Cartão de Crédito (Editora) ${pagamentos.parcelas}x`);
        if (clean(pagamentos.debito_editora) > 0) formasStrArray.push("Cartão de Débito (Editora)");
        if (creditoUtilizado > 0) formasStrArray.push("Saldo Virtual");
        
        const registroParcial = { 
          data_recebimento: dataPagamentoPDV, 
          valor_pago_rodada: valorAbatido, 
          formas: formasStrArray.length > 0 ? formasStrArray.join(" + ") : "Ajuste/Avulso", 
          desconto: acrescimos.desconto, 
          multa: acrescimos.multa, 
          juros_cartao: acrescimos.juros_cartao 
        };
        
        const historicoAntigo = Array.isArray(item.detalhes_metodos?.historico_parciais) ? item.detalhes_metodos.historico_parciais : [];
        const payloadMetodos = { 
          ...pagamentos, 
          troco_devolvido_fisico: trocoDevolvidoFisico,
          historico_parciais: valorAbatido > 0 || clean(acrescimos.desconto) > 0 ? [...historicoAntigo, registroParcial] : historicoAntigo 
        };

        let savedId = item.id;
        
        if (item.isNovo || item.isTemp || idString.startsWith('temp_')) {
          const { data } = await supabase.from('historico_pagamentos').insert({ 
            aluno_id: alunoSelecionado.id, 
            tipo: item.tipo || 'mensalidade', 
            descricao: item.descricao, 
            mes_referencia: item.mes_referencia || 'Avulso', 
            valor_total: item.valor_total, 
            valor_pago: novoValorPago, 
            status: novoStatus, 
            data_pagamento: dataPagamentoPDV, 
            detalhes_metodos: payloadMetodos, 
            caixa_id: caixaAtual.id 
          }).select('id').single();
          
          if (data) savedId = data.id;
        } else if (item.isMensalidadeTable) {
          await supabase.from('mensalidades').update({ 
            status: novoStatus, 
            valor_pago: novoValorPago 
          }).eq('id', item.id);
          
          const { data } = await supabase.from('historico_pagamentos').insert({ 
            aluno_id: alunoSelecionado.id, 
            tipo: 'mensalidade', 
            descricao: item.descricao, 
            mes_referencia: 'Recorrente', 
            valor_total: item.valor_total, 
            valor_pago: novoValorPago, 
            status: novoStatus, 
            data_pagamento: dataPagamentoPDV, 
            detalhes_metodos: payloadMetodos, 
            caixa_id: caixaAtual.id 
          }).select('id').single();
          
          if (data) savedId = data.id;
        } else {
          await supabase.from('historico_pagamentos').update({ 
            status: novoStatus, 
            valor_pago: novoValorPago, 
            data_pagamento: novoStatus === 'pago' ? dataPagamentoPDV : item.data_pagamento, 
            detalhes_metodos: payloadMetodos, 
            caixa_id: caixaAtual.id 
          }).eq('id', item.id);
        }
        if (savedId) idsProcessados.push(String(savedId));
      }

      const trocoParaAdicionar = acaoTroco === 'credito' ? trocoGerado : 0;
      if (creditoUtilizado > 0 || trocoParaAdicionar > 0) {
        const novoSaldo = saldoAtualAluno - creditoUtilizado + trocoParaAdicionar;
        await supabase.from('alunos').update({ saldo_credito: novoSaldo }).eq('id', alunoSelecionado.id);

        if (trocoParaAdicionar > 0) {
            await supabase.from('historico_pagamentos').insert({ 
              aluno_id: alunoSelecionado.id, 
              tipo: 'credito', 
              descricao: `Crédito de Troco gerado na quitação. (Total: R$ ${totalComAcrescimos.toFixed(2)} | Pago: R$ ${totalPagoRodada.toFixed(2)})`, 
              mes_referencia: 'Avulso', 
              valor_total: trocoParaAdicionar, 
              valor_pago: trocoParaAdicionar, 
              status: 'pago', 
              data_pagamento: dataPagamentoPDV, 
              detalhes_metodos: { forma_geradora: "Adição Automática", ids_origem: idsProcessados }, 
              caixa_id: caixaAtual.id 
            });
        }
      }

      alert("Transação registrada no Caixa da Sessão!");
      
      const querContinuar = window.confirm("Deseja fazer mais algum registro para este aluno?");
      await carregarDadosBase();
      
      setCarrinho([]); 
      setPagamentos({ pix: "", dinheiro: "", credito: "", debito: "", boleto: "", credito_aluno: "", pix_editora: "", credito_editora: "", debito_editora: "", parcelas: "1" }); 
      setAcrescimos({ multa: "", desconto: "", juros_cartao: "" }); 
      setModalCheckoutAberto(false);

      if (querContinuar) {
        setAlunoSelecionado({ ...alunoSelecionado });
      } else {
        setAlunoSelecionado(null);
      }
    } catch (error: any) { 
      alert("Erro ao finalizar: " + error.message); 
    } finally { 
      setProcessando(false); 
    }
  };

  const alunosFiltrados = buscaAluno === "" ? alunos.slice(0, 5) : alunos.filter(a => a.nome.toLowerCase().includes(buscaAluno.toLowerCase())).slice(0, 5);

  if (carregando && historicoGeral.length === 0) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <div className="text-slate-500 font-medium tracking-wide animate-pulse">Iniciando Terminal PDV...</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-6 font-sans text-slate-800 pb-24 selection:bg-indigo-100 selection:text-indigo-900">
      <div className="max-w-[1500px] w-full mx-auto space-y-4 md:space-y-6">
        
        <HeaderPDV router={router} />
        
        <StatusCaixaReduzido 
          caixaAtual={caixaAtual} 
          setModalFechamentoAberto={setModalFechamentoAberto} 
          carregarHistoricoCaixas={carregarHistoricoCaixas} 
          setModalMovimentacao={setModalMovimentacao} 
        />

        <ModalAberturaCaixa 
          modalCaixaAberto={modalCaixaAberto} 
          setModalCaixaAberto={setModalCaixaAberto} 
          fundoTrocoAbertura={fundoTrocoAbertura} 
          setFundoTrocoAbertura={setFundoTrocoAbertura} 
          abrirCaixa={abrirCaixa} 
          processando={processando} 
        />

        <ModalFechamentoCaixa 
          modalFechamentoAberto={modalFechamentoAberto} 
          setModalFechamentoAberto={setModalFechamentoAberto} 
          gavetaInformada={gavetaInformada} 
          setGavetaInformada={setGavetaInformada} 
          confirmarFechamentoCaixa={confirmarFechamentoCaixa} 
          processando={processando} 
        />

        <ModalMeusCaixas 
          modalMeusCaixas={modalMeusCaixas} 
          setModalMeusCaixas={setModalMeusCaixas} 
          historicoCaixas={historicoCaixas} 
          historicoGeral={historicoGeral}
          clean={clean} 
        />

        <ModalMovimentacaoCaixa 
          modalMovimentacao={modalMovimentacao} 
          setModalMovimentacao={setModalMovimentacao} 
          formMovimentacao={formMovimentacao} 
          setFormMovimentacao={setFormMovimentacao} 
          handleRegistrarMovimentacao={handleRegistrarMovimentacao} 
          processando={processando} 
        />

        <ModalCheckout 
          aberto={modalCheckoutAberto} 
          setAberto={setModalCheckoutAberto} 
          carrinho={carrinho} 
          subtotalCarrinho={subtotalCarrinho} 
          acrescimos={acrescimos} 
          setAcrescimos={setAcrescimos} 
          totalComAcrescimos={totalComAcrescimos} 
          pagamentos={pagamentos} 
          setPagamentos={setPagamentos} 
          temLivroNoCarrinho={temLivroNoCarrinho} 
          saldoAtualAluno={saldoAtualAluno} 
          trocoGerado={trocoGerado} 
          acaoTroco={acaoTroco} 
          setAcaoTroco={setAcaoTroco} 
          faltaPagar={faltaPagar} 
          finalizarVenda={finalizarVenda} 
          processando={processando} 
          clean={clean}
          totalPagoRodada={totalPagoRodada} 
          dataPagamentoPDV={dataPagamentoPDV}
          setDataPagamentoPDV={setDataPagamentoPDV}
        />

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-8 space-y-4">
            
            <IdentificacaoCliente 
              alunoSelecionado={alunoSelecionado} 
              setAlunoSelecionado={setAlunoSelecionado} 
              buscaAluno={buscaAluno} 
              setBuscaAluno={setBuscaAluno} 
              alunosFiltrados={alunosFiltrados} 
              saldoAtualAluno={saldoAtualAluno} 
            />

            {!alunoSelecionado ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in zoom-in-95 duration-300">
                <RadarInadimplencia 
                  inadimplentesTop5={inadimplentesTop5} 
                  setAlunoSelecionado={setAlunoSelecionado} 
                />
                {!caixaAtual && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <h4 className="font-black text-slate-800 mb-1">Caixa Fechado</h4>
                    <p className="text-xs text-slate-500 mb-6">Abra o caixa para iniciar os recebimentos do turno.</p>
                    <button 
                      onClick={() => setModalCaixaAberto(true)} 
                      className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-md w-full"
                    >
                      Abrir Caixa Agora
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <AreaDeVendasComAbas 
                alunoSelecionado={alunoSelecionado} 
                dividasAluno={dividasAluno} 
                carrinho={carrinho} 
                removerDoCarrinho={removerDoCarrinho} 
                adicionarAoCarrinho={adicionarAoCarrinho} 
                clean={clean} 
                novoItem={novoItem} 
                setNovoItem={setNovoItem} 
                uniformesTamanhos={uniformesTamanhos} 
                setUniformesTamanhos={setUniformesTamanhos} 
                uniformesVenda={uniformesVenda} 
                setUniformesVenda={setUniformesVenda} 
                totalVendaUniforme={totalVendaUniforme} 
                lancarItemAvulsoNoCarrinho={lancarItemAvulsoNoCarrinho} 
                inadimplentesTop5={inadimplentesTop5}
              />
            )}
          </div>

          <CarrinhoLateral 
            caixaAtual={caixaAtual} 
            alunoSelecionado={alunoSelecionado} 
            carrinho={carrinho} 
            removerDoCarrinho={removerDoCarrinho} 
            subtotalCarrinho={subtotalCarrinho} 
            setModalCaixaAberto={setModalCaixaAberto} 
            abrirModalCheckout={() => setModalCheckoutAberto(true)} 
          />
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; } 
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } 
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; } 
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}} />
    </div>
  );
}

export default function PDVPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <div className="text-slate-500 font-medium tracking-wide animate-pulse">Iniciando Terminal PDV...</div>
        </div>
      </div>
    }>
      <PDVContent />
    </Suspense>
  );
}