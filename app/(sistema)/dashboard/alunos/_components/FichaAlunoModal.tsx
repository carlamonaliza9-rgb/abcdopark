"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ModalPagamento } from "@/app/(sistema)/dashboard/financeiro/_components/ModalPagamento";
import { VisaoPrincipal, VisaoDividas, VisaoCredito, VisaoBoletim, VisaoHistorico } from "./FichaAlunoViews"; 

interface FichaAlunoModalProps {
  aluno: any;
  verBoletim: boolean;
  verHistorico: boolean;
  notas: any[];
  historico: any[];
  ehVisitante: boolean;
  userEmail?: string | null; 
  mCPF: (v: string) => string;
  mWhatsApp: (v: string) => string;
  onFechar: () => void;
  onEditar: () => void;
  onExcluir: () => void;
  onVerBoletim: (id: string, ano?: string) => void;
  onVerHistorico: (id: string, ano?: string) => void;
  onVoltarParaFicha: () => void;
  onSalvarNota: (id: string, campo: string, valor: string) => void;
  onAdicionarDisciplina: () => void;
  onExcluirDisciplina: (id: string) => void;
  onGerarPDFBoletim: () => void;
  onGerarPDFHistorico: () => void;
  onEditarPagamento?: (pagamento: any) => void; 
  onExcluirPagamento?: (id: string) => void; 
  calcularIdade: (data: string) => string;
}

export function FichaAlunoModal(props: FichaAlunoModalProps) {
  const { 
    aluno, verBoletim, verHistorico, notas, historico, ehVisitante, userEmail,
    mCPF, mWhatsApp, onFechar, onEditar, onExcluir, onVerBoletim, 
    onVerHistorico, onVoltarParaFicha, onSalvarNota, onAdicionarDisciplina, 
    onExcluirDisciplina, onGerarPDFBoletim, onGerarPDFHistorico,
    onEditarPagamento, onExcluirPagamento,
    calcularIdade 
  } = props;

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

  const [anoSelecionado, setAnoSelecionado] = useState("2026");
  
  // 🛡️ O filtro agora inicia como "todos" para nunca ocultar dados ao abrir
  const [anoPagamentoSelecionado, setAnoPagamentoSelecionado] = useState("todos");

  const [historicoLocal, setHistoricoLocal] = useState<any[]>([]);

  const [modalPDVAberto, setModalPDVAberto] = useState(false);
  const [dataPagamentoPDV, setDataPagamentoPDV] = useState(new Date().toISOString().split('T')[0]);
  const [tipoPagamentoPDV, setTipoPagamentoPDV] = useState("pdv");
  const [pagamentosMetodosPDV, setPagamentosMetodosPDV] = useState({ pix: "", dinheiro: "", credito: "", debito: "", boleto: "", multa: "", desconto: "", credito_aluno: "" });
  
  const SENHA_MESTRA = "1234";
  const mesesAno = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  const clean = (val: any) => {
    if (val === null || val === undefined || val === "") return 0;
    if (typeof val === 'number') return val;
    const str = String(val).trim();
    if (str.includes(',')) return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
    return parseFloat(str) || 0;
  };

  useEffect(() => {
    if (aluno?.id) {
      setSaldoCreditoVisivel(clean(aluno.saldo_credito));
      buscarDadosAdicionais();
    }
  }, [aluno?.id, aluno?.saldo_credito]);

  // Recarrega os dados ao mudar o filtro do ano
  useEffect(() => {
    if (aluno?.id) {
      buscarDadosAdicionais();
    }
  }, [anoPagamentoSelecionado]);

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

  async function handleConfirmarPDV(dividasSelecionadas: any[]) {
    const somaPaga = clean(pagamentosMetodosPDV.pix) + clean(pagamentosMetodosPDV.dinheiro) + clean(pagamentosMetodosPDV.credito) + clean(pagamentosMetodosPDV.debito) + clean(pagamentosMetodosPDV.boleto);
    const valorMulta = clean(pagamentosMetodosPDV.multa);
    const valorDesconto = clean(pagamentosMetodosPDV.desconto);
    const creditoUtilizado = clean(pagamentosMetodosPDV.credito_aluno);
    
    const valorPagoFinal = somaPaga + creditoUtilizado;
    const totalDividas = dividasSelecionadas.reduce((acc, d) => acc + (clean(d.valor_total) - clean(d.valor_pago)), 0);
    const totalDividasAjustado = totalDividas + valorMulta - valorDesconto;

    if (valorPagoFinal + 0.01 < totalDividasAjustado) {
      return alert("O valor inserido é insuficiente para quitar as dívidas selecionadas. Desmarque algo no carrinho ou faça baixas individuais.");
    }

    if (creditoUtilizado > saldoCreditoVisivel) {
      return alert("O aluno não possui essa quantidade de crédito disponível para abater.");
    }

    let saldoParaDistribuir = valorPagoFinal + valorDesconto - valorMulta;
    let trocoGlobal = 0;

    for (const div of dividasSelecionadas) {
      const idString = String(div.id || "");
      const valorOriginalTotal = clean(div.valor_total);
      const valorJaPago = clean(div.valor_pago);
      const restanteDestaDivida = valorOriginalTotal - valorJaPago;

      if (restanteDestaDivida <= 0) continue;

      const valorAbatido = Math.min(restanteDestaDivida, saldoParaDistribuir);
      saldoParaDistribuir -= valorAbatido;

      const novoValorPago = valorJaPago + valorAbatido;
      const novoStatus = novoValorPago >= valorOriginalTotal ? 'pago' : 'parcial';

      const formasStrArray = [];
      if (clean(pagamentosMetodosPDV.pix) > 0) formasStrArray.push("Pix");
      if (clean(pagamentosMetodosPDV.dinheiro) > 0) formasStrArray.push("Dinheiro");
      if (clean(pagamentosMetodosPDV.credito) > 0) formasStrArray.push("Cartão");
      if (clean(pagamentosMetodosPDV.boleto) > 0) formasStrArray.push("Boleto");
      if (creditoUtilizado > 0) formasStrArray.push("Crédito Retido");
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
        historico_parciais: novoHistoricoParcial
      };

      if (idString.startsWith('temp_')) {
        await supabase.from('historico_pagamentos').insert({
          aluno_id: aluno.id,
          tipo: 'mensalidade',
          descricao: div.descricao,
          mes_referencia: div.mes_referencia,
          valor_total: valorOriginalTotal,
          valor_pago: novoValorPago,
          status: novoStatus,
          data_pagamento: dataPagamentoPDV,
          detalhes_metodos: jsonMetodos
        });
      } else {
        await supabase.from('historico_pagamentos').update({ 
          status: novoStatus, 
          valor_pago: novoValorPago,
          data_pagamento: novoStatus === 'pago' ? dataPagamentoPDV : div.data_pagamento, 
          detalhes_metodos: jsonMetodos 
        }).eq('id', div.id);
      }
    }

    if (saldoParaDistribuir > 0) {
      trocoGlobal = saldoParaDistribuir;
    }

    const novoSaldoCredito = saldoCreditoVisivel - creditoUtilizado + trocoGlobal;

    if (novoSaldoCredito !== saldoCreditoVisivel) {
      await supabase.from('alunos').update({ saldo_credito: novoSaldoCredito }).eq('id', aluno.id);
      setSaldoCreditoVisivel(novoSaldoCredito);
    }

    setModalPDVAberto(false);
    buscarDadosAdicionais();
    alert("Pagamento recebido e baixas aplicadas com sucesso!");
  }

  async function confirmarRenegociacao(pendenciaOriginal: any) {
    const qtdParcelas = parseInt(formRenegociacao.parcelas);
    if (qtdParcelas < 1) return alert("Número de parcelas inválido.");

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
  }

  async function handleSalvarCredito() {
    const valorConvertido = clean(novoValorCredito);
    const { error } = await supabase.from('alunos').update({ saldo_credito: valorConvertido }).eq('id', aluno.id);
    if (!error) { setSaldoCreditoVisivel(valorConvertido); setEditandoCredito(false); }
  }

  async function handleZerarCredito() {
    if (prompt("Digite a Senha Mestra para ZERAR o crédito:") === SENHA_MESTRA) {
      const { error } = await supabase.from('alunos').update({ saldo_credito: 0 }).eq('id', aluno.id);
      if (!error) { setSaldoCreditoVisivel(0); setVerCreditoGlobal(false); }
    } else alert("Senha incorreta.");
  }

  // 🛡️ O EXCLUIR PERMANENTE com proteção de registros sagrados
  const handleExcluirFaturamento = async (pgto: any) => {
    // 1. TRAVA DE SEGURANÇA: Impede a exclusão da mensalidade matriz ou de acordos
    const isSagrado = pgto.tipo?.toLowerCase() === 'mensalidade' || pgto.tipo?.toLowerCase() === 'acordo';
    
    if (isSagrado) {
      return alert("⛔ OPERAÇÃO BLOQUEADA\n\nMensalidades e Acordos são registros SAGRADOS e não podem ser apagados do sistema.\n\nSe houve um erro no recebimento, utilize o botão de ESTORNO (🔄). O estorno desfará o pagamento e a mensalidade voltará a ficar pendente, mantendo o histórico seguro.");
    }

    // 2. Fluxo normal para taxas avulsas
    if (prompt("Digite a Senha Mestra para EXCLUIR REGISTRO AVULSO PERMANENTEMENTE:") !== SENHA_MESTRA) return alert("Senha incorreta.");
    
    if(confirm("Deseja realmente deletar esta taxa avulsa para sempre da base do Supabase? Essa ação não pode ser desfeita.")) {
      const { error } = await supabase.from('historico_pagamentos').delete().eq('id', pgto.id);
      if (!error) {
        alert("Registro deletado permanentemente!");
        buscarDadosAdicionais();
      } else {
        alert("Erro ao excluir: " + error.message);
      }
    }
  };

  const editarPagamentoHandler = (pgto: any) => {
    if (prompt("Digite a Senha Mestra para EDITAR:") === SENHA_MESTRA) { 
      if (onEditarPagamento) onEditarPagamento(pgto); 
    } else {
      alert("Senha incorreta.");
    }
  };

  if (!aluno) return null;

  return (
    <div 
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center md:p-4"
      onClick={onFechar}
    >
      <div 
        className="bg-white w-full max-w-2xl h-[95vh] md:h-auto md:max-h-[90vh] rounded-t-[2.5rem] md:rounded-3xl p-5 md:p-8 overflow-y-auto flex flex-col shadow-2xl animate-in slide-in-from-bottom-full md:zoom-in-95 custom-scrollbar relative"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* DRAG HANDLE MOBILE */}
        <div className="w-full flex justify-center md:hidden mb-2 sticky top-0 bg-white z-10 pt-2 pb-4">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
        </div>

        <div className="flex flex-col items-center">
          <div className="relative mb-4 md:mb-5 mt-2 md:mt-0">
            {aluno.foto_url ? (
              <img src={aluno.foto_url} className="w-28 h-28 md:w-36 md:h-36 rounded-full object-cover border-4 border-slate-100 shadow-sm" />
            ) : (
              <div className="h-28 w-28 md:h-36 md:w-36 rounded-full bg-slate-50 border border-slate-100 shadow-sm flex items-center justify-center text-slate-300 text-5xl md:text-6xl">👤</div>
            )}
            {aluno.e_autista && <span className="absolute bottom-1 right-1 text-xl md:text-2xl bg-white rounded-full p-1 shadow-sm">🧩</span>}
          </div>
          
          <h2 className="font-extrabold text-slate-900 m-0 text-xl md:text-2xl text-center leading-tight">{aluno.nome}</h2>
          
          <div className="flex flex-wrap justify-center gap-2 items-center mt-2 mb-6">
            <span className="text-xs md:text-sm text-slate-500 font-semibold">{calcularIdade(aluno.data_nascimento)}</span>
            <span className="text-blue-600 font-bold text-[10px] md:text-xs bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest">{aluno.turma} • {aluno.turno || 'Turno não inf.'}</span>
          </div>

          {verDividasGlobais ? (
            <VisaoDividas 
              totalPendenteGeral={totalPendenteGeral} setVerDividasGlobais={setVerDividasGlobais} 
              setIdRenegociacao={setIdRenegociacao} ehVisitante={ehVisitante} setModalPDVAberto={setModalPDVAberto} 
              listaPendenciasGerais={listaPendenciasGerais} clean={clean} idRenegociacao={idRenegociacao} 
              formRenegociacao={formRenegociacao} setFormRenegociacao={setFormRenegociacao} 
              confirmarRenegociacao={confirmarRenegociacao} 
            />
          ) : verCreditoGlobal ? (
            <VisaoCredito 
              setVerCreditoGlobal={setVerCreditoGlobal} editandoCredito={editandoCredito} 
              novoValorCredito={novoValorCredito} setNovoValorCredito={setNovoValorCredito} 
              setEditandoCredito={setEditandoCredito} handleSalvarCredito={handleSalvarCredito} 
              saldoCreditoVisivel={saldoCreditoVisivel} ehVisitante={ehVisitante} handleZerarCredito={handleZerarCredito} 
            />
          ) : !verHistorico && !verBoletim ? (
            <VisaoPrincipal 
              aluno={aluno} calcularIdade={calcularIdade} saldoCreditoVisivel={saldoCreditoVisivel} 
              setVerCreditoGlobal={setVerCreditoGlobal} totalPendenteGeral={totalPendenteGeral} 
              setVerDividasGlobais={setVerDividasGlobais} mediaEstrelas={mediaEstrelas} 
              percentualPresenca={percentualPresenca} mCPF={mCPF} mWhatsApp={mWhatsApp} 
              anoSelecionado={anoSelecionado} onVerBoletim={onVerBoletim} 
              anoPagamentoSelecionado={anoPagamentoSelecionado} onVerHistorico={onVerHistorico} ehVisitante={ehVisitante}
            />
          ) : verBoletim ? (
            <VisaoBoletim 
              anoSelecionado={anoSelecionado} setAnoSelecionado={setAnoSelecionado} 
              onVerBoletim={onVerBoletim} aluno={aluno} onGerarPDFBoletim={onGerarPDFBoletim} 
              ehVisitante={ehVisitante} onAdicionarDisciplina={onAdicionarDisciplina} 
              onVoltarParaFicha={onVoltarParaFicha} notas={notas} onSalvarNota={onSalvarNota} 
              onExcluirDisciplina={onExcluirDisciplina} 
            />
          ) : (
            <VisaoHistorico 
              anoPagamentoSelecionado={anoPagamentoSelecionado} setAnoPagamentoSelecionado={setAnoPagamentoSelecionado} 
              onVerHistorico={onVerHistorico} aluno={aluno} onGerarPDFHistorico={onGerarPDFHistorico} 
              onVoltarParaFicha={onVoltarParaFicha} saldoCreditoVisivel={saldoCreditoVisivel} 
              setVerCreditoGlobal={setVerCreditoGlobal} totalPendenteGeral={totalPendenteGeral} 
              setVerDividasGlobais={setVerDividasGlobais} 
              
              // 🛡️ MURALHA DE FERRO: PASSA A LISTA PURA DO BANCO
              historicoLocal={historicoLocal} 
              
              userEmail={userEmail} clean={clean} onEditarPagamento={editarPagamentoHandler} 
              handleExcluirFaturamento={handleExcluirFaturamento} 
              
              // 🛡️ PONTE DE RECARREGAMENTO PARA O ESTORNO CIRÚRGICO ATUALIZAR A TELA
              onRecarregar={buscarDadosAdicionais}
              senhaMestra={SENHA_MESTRA}
            />
          )}

          {/* RODAPÉ E BOTÕES DE AÇÃO */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full mt-auto pt-6">
            <button onClick={onFechar} className="w-full sm:flex-1 p-4 rounded-2xl border border-slate-200 font-bold tracking-widest text-[11px] cursor-pointer bg-white text-slate-500 hover:bg-slate-50 transition-colors order-last sm:order-none">FECHAR</button>
            {!ehVisitante && !verBoletim && !verHistorico && !verDividasGlobais && !verCreditoGlobal && (
              <div className="flex gap-3 w-full sm:w-auto sm:flex-[2]">
                <button onClick={onEditar} className="flex-1 p-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold tracking-widest text-[11px] cursor-pointer border-none transition-colors shadow-lg shadow-blue-600/20 active:scale-95">EDITAR FICHA</button>
                <button onClick={onExcluir} className="p-4 rounded-2xl bg-rose-100 hover:bg-rose-200 text-rose-500 border-none cursor-pointer transition-colors flex items-center justify-center active:scale-95">🗑️</button>
              </div>
            )}
          </div>
        </div>
      </div>

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
    </div>
  );
}