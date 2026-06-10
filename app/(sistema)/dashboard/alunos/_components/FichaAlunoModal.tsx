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
  const [anoPagamentoSelecionado, setAnoPagamentoSelecionado] = useState("2026");

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

  const handleEstornarFaturamento = async (pgto: any) => {
    if (prompt("Digite a Senha Mestra para DESFAZER/ESTORNAR este faturamento:") !== SENHA_MESTRA) return alert("Senha incorreta.");
    if (confirm("Deseja realmente estornar esta transação? O faturamento voltará ao status pendente e os valores pagos serão zerados.")) {
      const { error } = await supabase.from('historico_pagamentos').update({ status: 'pendente', valor_pago: 0, detalhes_metodos: {} }).eq('id', pgto.id);
      if (!error) {
        alert("Pagamento desfeito e faturamento resetado com sucesso!");
        buscarDadosAdicionais();
      } else {
        alert("Erro operacional ao estornar: " + error.message);
      }
    }
  };

  const handleExcluirFaturamento = async (pgto: any) => {
    if (prompt("Digite a Senha Mestra para EXCLUIR REGISTRO PERMANENTEMENTE:") !== SENHA_MESTRA) return alert("Senha incorreta.");
    if(confirm("Deseja realmente deletar este faturamento para sempre da base do Supabase? Essa ação não pode ser desfeita.")) {
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

  const historicoFiltrado = historicoLocal.filter(h => h.data_pagamento && h.data_pagamento.startsWith(anoPagamentoSelecionado) && h.status !== 'renegociado');

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '10px' }}>
      <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '24px', width: '95%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ position: 'relative', marginBottom: '20px' }}>
            {aluno.foto_url ? (
              <img src={aluno.foto_url} style={{ width: '140px', height: '140px', borderRadius: '50%', objectFit: 'cover', border: '4px solid #f1f5f9' }} />
            ) : (
              <div style={{ height: '140px', width: '140px', borderRadius: '50%', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', fontSize: '60px' }}>👤</div>
            )}
            {aluno.e_autista && <span style={{ position: 'absolute', bottom: '5px', right: '5px', fontSize: '24px', backgroundColor: 'white', borderRadius: '50%', padding: '3px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>🧩</span>}
          </div>
          
          <h2 style={{ fontWeight: '800', color: '#0f172a', margin: '0', fontSize: '20px', textAlign: 'center' }}>{aluno.nome}</h2>
          
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px', marginBottom: '24px' }}>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>{calcularIdade(aluno.data_nascimento)}</span>
            <span style={{ color: '#2563eb', fontWeight: 'bold', fontSize: '12px', backgroundColor: '#eff6ff', padding: '2px 10px', borderRadius: '10px' }}>{aluno.turma} • {aluno.turno || 'Turno não inf.'}</span>
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
              setVerDividasGlobais={setVerDividasGlobais} historicoFiltrado={historicoFiltrado} 
              userEmail={userEmail} clean={clean} onEditarPagamento={editarPagamentoHandler} 
              handleEstornarFaturamento={handleEstornarFaturamento} handleExcluirFaturamento={handleExcluirFaturamento} 
            />
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', width: '100%', marginTop: '24px' }}>
            <button onClick={onFechar} style={{ flex: '1 1 100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', fontWeight: '700', cursor: 'pointer', backgroundColor: 'white', color: '#64748b' }}>FECHAR</button>
            {!ehVisitante && !verBoletim && !verHistorico && !verDividasGlobais && !verCreditoGlobal && (
              <>
                <button onClick={onEditar} style={{ flex: '1 1 70%', padding: '14px', borderRadius: '12px', backgroundColor: '#2563eb', color: 'white', fontWeight: '700', cursor: 'pointer', border: 'none' }}>EDITAR FICHA</button>
                <button onClick={onExcluir} style={{ flex: '1 1 20%', padding: '14px', borderRadius: '12px', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', cursor: 'pointer' }}>🗑️</button>
              </>
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