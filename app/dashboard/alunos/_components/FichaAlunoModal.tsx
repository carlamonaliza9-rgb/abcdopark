"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
// Importamos o Modal de Pagamento para ser a Frente de Caixa na ficha do aluno
import { ModalPagamento } from "@/app/dashboard/financeiro/_components/ModalPagamento";

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

  // --- ESTADO DO RELATÓRIO FINANCEIRO LOCAL AUTÔNOMO ---
  const [historicoLocal, setHistoricoLocal] = useState<any[]>([]);

  // --- ESTADOS DO PDV INLINE (FRENTE DE CAIXA) ---
  const [modalPDVAberto, setModalPDVAberto] = useState(false);
  const [dataPagamentoPDV, setDataPagamentoPDV] = useState(new Date().toISOString().split('T')[0]);
  const [tipoPagamentoPDV, setTipoPagamentoPDV] = useState("pdv");
  const [pagamentosMetodosPDV, setPagamentosMetodosPDV] = useState({ pix: "", dinheiro: "", credito: "", debito: "", boleto: "", multa: "", desconto: "", credito_aluno: "" });
  
  const SENHA_MESTRA = "1234";
  const mesesAno = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  useEffect(() => {
    if (aluno?.id) {
      setSaldoCreditoVisivel(parseFloat(aluno.saldo_credito) || 0);
      buscarDadosAdicionais();
    }
  }, [aluno?.id, aluno?.saldo_credito]);

  // Recarrega os dados locais se houver mudança de ano selecionado no painel
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
        const vTotal = parseFloat(pend.valor_total) || 0;
        const vPago = parseFloat(pend.valor_pago) || 0;
        dividaCalculada += (vTotal - vPago);
        listaDívida.push({ ...pend, atraso_automatico: false });
      });

      const dataAtual = new Date();
      const mesAtualNum = dataAtual.getMonth(); 
      const diaAtual = dataAtual.getDate();
      const anoAtual = dataAtual.getFullYear().toString();
      const diaVencimentoAluno = parseInt(aluno.vencimento) || 5;
      const valorMensalidadeBase = parseFloat(aluno.valor) || 0;

      if (valorMensalidadeBase > 0) {
        for (let i = 0; i <= mesAtualNum; i++) {
          const nomeMes = mesesAno[i];
          if (i === mesAtualNum && diaAtual <= diaVencimentoAluno) continue;

          // CORREÇÃO DO FALSO-POSITIVO: Validação case-insensitive blindada
          const jaExisteNoBanco = historicoCompleto.some(h => 
            (h.tipo?.toLowerCase() === 'mensalidade' || h.tipo?.toLowerCase() === 'acordo') && 
            h.mes_referencia?.toLowerCase().trim() === nomeMes.toLowerCase() && 
            (h.data_pagamento?.startsWith(anoAtual) || (h.descricao || "").includes(anoAtual)) &&
            h.status !== 'cancelado' && h.status !== 'estornado'
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
              atraso_automatico: true
            });
          }
        }
      }

      setTotalPendenteGeral(dividaCalculada);
      setListaPendenciasGerais(listaDívida as any[]);
    }
  }

  // --- LÓGICA DE FRENTE DE CAIXA (PDV) ---
  async function handleConfirmarPDV(dividasSelecionadas: any[]) {
    const clean = (val: any) => parseFloat(String(val).replace(/\./g, '').replace(',', '.')) || 0;

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

  // --- LÓGICA DE DIVISÃO/RENEGOCIAÇÃO ---
  async function confirmarRenegociacao(pendenciaOriginal: any) {
    const qtdParcelas = parseInt(formRenegociacao.parcelas);
    if (qtdParcelas < 1) return alert("Número de parcelas inválido.");

    const valorDevedor = (parseFloat(pendenciaOriginal.valor_total) || 0) - (parseFloat(pendenciaOriginal.valor_pago) || 0);
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

    if (!pendenciaOriginal.atraso_automatico) {
      await supabase.from('historico_pagamentos').update({ status: 'renegociado' }).eq('id', pendenciaOriginal.id);
    }

    setIdRenegociacao(null);
    buscarDadosAdicionais(); 
  }

  async function handleSalvarCredito() {
    const valorConvertido = parseFloat(novoValorCredito.replace(',', '.')) || 0;
    const { error } = await supabase.from('alunos').update({ saldo_credito: valorConvertido }).eq('id', aluno.id);
    if (!error) { setSaldoCreditoVisivel(valorConvertido); setEditandoCredito(false); }
  }

  async function handleZerarCredito() {
    if (prompt("Digite a Senha Mestra para ZERAR o crédito:") === SENHA_MESTRA) {
      const { error } = await supabase.from('alunos').update({ saldo_credito: 0 }).eq('id', aluno.id);
      if (!error) { setSaldoCreditoVisivel(0); setVerCreditoGlobal(false); }
    } else alert("Senha incorreta.");
  }

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
    const metodos = Object.keys(detalhes).filter(key => parseFloat(detalhes[key]) > 0 && key !== 'historico_parciais');
    return metodos.length > 0 ? metodos.join(" + ").toUpperCase() : null;
  };

  if (!aluno) return null;

  const contatos = [
    { nome: aluno.responsavel, whats: aluno.whatsapp, cpf: aluno.responsavel_cpf || aluno.cpf_responsavel, profissao: aluno.profissao_responsavel || aluno.responsavel_profissao, tag: aluno.parentesco1 || aluno.parentesco_1 || "Responsável 1", cor: "#db2777", bg: "#fdf2f8" },
    { nome: aluno.responsavel2 || aluno.responsavel_2_nome, whats: aluno.whatsapp2 || aluno.responsavel_2_contato, cpf: aluno.cpf_responsavel2 || aluno.cpf_responsavel_2, profissao: aluno.profissao_responsavel2 || aluno.responsavel_2_profissao, tag: aluno.parentesco2 || aluno.parentesco_2 || "Responsável 2", cor: "#2563eb", bg: "#eff6ff" },
    { nome: aluno.responsavel3 || aluno.responsavel_3_nome, whats: aluno.whatsapp3 || aluno.responsavel_3_contato, cpf: aluno.cpf_responsavel_3, profissao: aluno.profissao_responsavel3, tag: aluno.parentesco3 || aluno.parentesco_3 || "Responsável 3", cor: "#16a34a", bg: "#f0fdf4" }
  ];

  const EstiloLabel: React.CSSProperties = { fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px', display: 'block' };
  const EstiloDado: React.CSSProperties = { fontSize: '14px', color: '#1e293b', fontWeight: '600', margin: 0 };
  const EstiloCard: React.CSSProperties = { backgroundColor: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #f1f5f9' };

  // Filtro dinâmico local do histórico para garantir integridade visual
  const historicoFiltrado = historicoLocal.filter(h => h.data_pagamento && h.data_pagamento.startsWith(anoPagamentoSelecionado));

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

          {/* TELA DE DÍVIDAS DETALHADA COM RENEGOCIAÇÃO E BOTÃO PDV */}
          {verDividasGlobais ? (
            <div style={{ width: '100%', marginTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: '#dc2626' }}>⚠️ Detalhamento da Dívida</h3>
                <button onClick={() => { setVerDividasGlobais(false); setIdRenegociacao(null); }} style={{ border: 'none', background: 'none', color: '#64748b', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>VOLTAR</button>
              </div>

              <div style={{ backgroundColor: '#fdf2f2', border: '1px solid #fecaca', padding: '15px', borderRadius: '12px', textAlign: 'center', marginBottom: '20px' }}>
                <span style={{ fontSize: '11px', color: '#dc2626', fontWeight: 'bold', textTransform: 'uppercase' }}>Valor Total em Aberto</span>
                <p style={{ margin: 0, color: '#991b1b', fontSize: '22px', fontWeight: '900' }}>R$ {totalPendenteGeral.toFixed(2)}</p>
                
                {/* BOTÃO QUE ABRE O CAIXA PDV */}
                {!ehVisitante && (
                  <button 
                    onClick={() => setModalPDVAberto(true)}
                    style={{ marginTop: '10px', backgroundColor: '#10b981', color: 'white', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', margin: '10px auto 0 auto' }}
                  >
                    💰 RECEBER DÍVIDAS
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto', paddingRight: '5px' }}>
                {listaPendenciasGerais.length > 0 ? listaPendenciasGerais.map((pend, i) => {
                  const valorTotal = parseFloat(pend.valor_total) || 0;
                  const valorPago = parseFloat(pend.valor_pago) || 0;
                  const restante = valorTotal - valorPago;
                  const renegociandoEste = idRenegociacao === pend.id;

                  return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', padding: '12px', backgroundColor: renegociandoEste ? '#fffbeb' : '#fff', borderRadius: '12px', border: `1px solid ${renegociandoEste ? '#fcd34d' : '#fecaca'}`, transition: 'all 0.2s' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b' }}>{pend.descricao}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>Venc: {new Date(pend.data_pagamento).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</span>
                            <span style={{ fontSize: '9px', fontWeight: '800', color: pend.atraso_automatico ? '#dc2626' : '#d97706', backgroundColor: pend.atraso_automatico ? '#fee2e2' : '#fef3c7', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>
                              {pend.atraso_automatico ? 'NÃO PAGO' : pend.status}
                            </span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '14px', fontWeight: '900', color: '#dc2626', display: 'block' }}>R$ {restante.toFixed(2)}</span>
                          {!renegociandoEste && <button onClick={() => setIdRenegociacao(pend.id)} style={{ marginTop: '4px', background: 'none', border: '1px solid #d97706', color: '#b45309', fontSize: '9px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}>🔄 DIVIDIR</button>}
                        </div>
                      </div>

                      {renegociandoEste && (
                        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed #fcd34d', display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '9px', fontWeight: 'bold', color: '#92400e' }}>PARCELAS:</label>
                            <input type="number" value={formRenegociacao.parcelas} onChange={(e) => setFormRenegociacao({...formRenegociacao, parcelas: e.target.value})} style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #fcd34d', fontSize: '11px' }} />
                          </div>
                          <div style={{ flex: 2 }}>
                            <label style={{ fontSize: '9px', fontWeight: 'bold', color: '#92400e' }}>1º VENCIMENTO:</label>
                            <input type="date" value={formRenegociacao.vencimentoInicial} onChange={(e) => setFormRenegociacao({...formRenegociacao, vencimentoInicial: e.target.value})} style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #fcd34d', fontSize: '11px' }} />
                          </div>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button onClick={() => setIdRenegociacao(null)} style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: 'white', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>X</button>
                            <button onClick={() => confirmarRenegociacao(pend)} style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', backgroundColor: '#d97706', color: 'white', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>OK</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }) : <p style={{ textAlign: 'center', color: '#64748b', fontSize: '13px' }}>Nenhuma pendência encontrada.</p>}
              </div>
            </div>

          // TELA DE CRÉDITO DETALHADA COM EDIÇÃO
          ) : verCreditoGlobal ? (
            <div style={{ width: '100%', marginTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: '#16a34a' }}>💰 Detalhamento do Crédito</h3>
                <button onClick={() => setVerCreditoGlobal(false)} style={{ border: 'none', background: 'none', color: '#64748b', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>VOLTAR</button>
              </div>

              <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '20px', borderRadius: '12px', textAlign: 'center', marginBottom: '20px' }}>
                <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 'bold', textTransform: 'uppercase' }}>Saldo Atual Retido</span>
                
                {editandoCredito ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                    <input 
                      type="number" 
                      value={novoValorCredito} 
                      onChange={(e) => setNovoValorCredito(e.target.value)} 
                      placeholder="0.00"
                      style={{ padding: '10px', borderRadius: '8px', border: '1px solid #22c55e', fontSize: '16px', fontWeight: 'bold', textAlign: 'center', width: '150px' }} 
                    />
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={() => setEditandoCredito(false)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>CANCELAR</button>
                      <button onClick={handleSalvarCredito} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#16a34a', color: 'white', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>SALVAR</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p style={{ margin: '5px 0 15px 0', color: '#14532d', fontSize: '28px', fontWeight: '900' }}>R$ {saldoCreditoVisivel.toFixed(2)}</p>
                    {!ehVisitante && (
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                        <button 
                          onClick={() => { setNovoValorCredito(saldoCreditoVisivel.toString()); setEditandoCredito(true); }} 
                          style={{ background: 'none', border: '1px solid #22c55e', color: '#15803d', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}
                        >
                          ✏️ Ajustar
                        </button>
                        <button 
                          onClick={handleZerarCredito} 
                          style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#dc2626', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}
                        >
                          🗑️ Zerar
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

          // TELA PRINCIPAL (FICHA)
          ) : !verHistorico && !verBoletim ? (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              {/* BLOCO GLOBAL DE CONTA CORRENTE */}
              {(saldoCreditoVisivel > 0 || totalPendenteGeral > 0) && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '4px', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                  
                  <div 
                    onClick={() => { if(saldoCreditoVisivel > 0) setVerCreditoGlobal(true); }}
                    style={{ ...EstiloCard, backgroundColor: saldoCreditoVisivel > 0 ? '#f0fdf4' : '#fff', borderColor: saldoCreditoVisivel > 0 ? '#bbf7d0' : '#f1f5f9', textAlign: 'center', border: 'none', cursor: saldoCreditoVisivel > 0 ? 'pointer' : 'default', transition: 'transform 0.1s' }}
                    onMouseOver={(e) => { if(saldoCreditoVisivel > 0) e.currentTarget.style.transform = 'scale(1.02)'; }}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <span style={{ ...EstiloLabel, color: saldoCreditoVisivel > 0 ? '#16a34a' : '#64748b' }}>💰 Crédito</span>
                    <p style={{ ...EstiloDado, color: saldoCreditoVisivel > 0 ? '#14532d' : '#1e293b', fontSize: '15px', fontWeight: '800' }}>
                      {saldoCreditoVisivel > 0 ? `R$ ${saldoCreditoVisivel.toFixed(2)}` : 'R$ 0,00'}
                    </p>
                  </div>

                  <div 
                    onClick={() => { if(totalPendenteGeral > 0) setVerDividasGlobais(true); }}
                    style={{ ...EstiloCard, backgroundColor: totalPendenteGeral > 0 ? '#fdf2f2' : '#fff', borderColor: totalPendenteGeral > 0 ? '#fecaca' : '#f1f5f9', textAlign: 'center', border: 'none', cursor: totalPendenteGeral > 0 ? 'pointer' : 'default', transition: 'transform 0.1s' }}
                    onMouseOver={(e) => { if(totalPendenteGeral > 0) e.currentTarget.style.transform = 'scale(1.02)'; }}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <span style={{ ...EstiloLabel, color: totalPendenteGeral > 0 ? '#dc2626' : '#64748b' }}>⚠️ Dívida</span>
                    <p style={{ ...EstiloDado, color: totalPendenteGeral > 0 ? '#991b1b' : '#1e293b', fontSize: '15px', fontWeight: '800' }}>
                      {totalPendenteGeral > 0 ? `R$ ${totalPendenteGeral.toFixed(2)}` : 'R$ 0,00'}
                    </p>
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ ...EstiloCard, backgroundColor: '#fffbeb', borderColor: '#fef3c7', textAlign: 'center' }}>
                  <span style={{ ...EstiloLabel, color: '#b45309' }}>Média Pedagógica</span>
                  <p style={{ ...EstiloDado, color: '#92400e' }}>{mediaEstrelas > 0 ? "⭐".repeat(Math.round(mediaEstrelas)) : "S/ Nota"}</p>
                </div>
                <div style={{ ...EstiloCard, textAlign: 'center' }}>
                  <span style={EstiloLabel}>Frequência</span>
                  <p style={{ ...EstiloDado, color: '#0d9488' }}>{percentualPresenca.toFixed(0)}%</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={EstiloCard}>
                  <span style={EstiloLabel}>Nascimento</span>
                  <p style={EstiloDado}>{aluno.data_nascimento ? new Date(aluno.data_nascimento).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : '--'}</p>
                </div>
                <div style={EstiloCard}>
                  <span style={EstiloLabel}>CPF Aluno</span>
                  <p style={EstiloDado}>{mCPF(aluno.cpf_aluno) || '--'}</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ ...EstiloCard, backgroundColor: '#f8fafc' }}>
                  <span style={{ ...EstiloLabel }}>Mensalidade Base</span>
                  <p style={{ ...EstiloDado, color: '#15803d' }}>{aluno.valor ? parseFloat(aluno.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}</p>
                </div>
                <div style={EstiloCard}>
                  <span style={EstiloLabel}>Vencimento</span>
                  <p style={EstiloDado}>Dia {aluno.vencimento || '--'}</p>
                </div>
              </div>

              <div style={EstiloCard}>
                <span style={{ ...EstiloLabel, marginBottom: '12px' }}>Contatos e Responsáveis</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {contatos.map((contato, index) => contato.nome && (
                    <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <p style={EstiloDado}>{contato.nome}</p>
                            <span style={{ fontSize: '9px', fontWeight: '800', color: contato.cor, backgroundColor: contato.bg, padding: '1px 6px', borderRadius: '4px' }}>{contato.tag}</span>
                        </div>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>{mWhatsApp(contato.whats)} • CPF: {mCPF(contato.cpf)}</span>
                        {contato.profissao && <span style={{ fontSize: '11px', color: '#475569', fontWeight: '600' }}>💼 Profissão: {contato.profissao}</span>}
                      </div>
                      {contato.whats && (
                        <button onClick={() => abrirWhatsApp(contato.whats)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px', opacity: 0.8 }}>
                          <span style={{ fontSize: '20px' }}>📱</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ ...EstiloCard, backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}>
                <span style={{ ...EstiloLabel, color: '#15803d' }}>Endereço Residencial</span>
                <p style={EstiloDado}>
                  {aluno.endereco ? `${aluno.endereco}, ${aluno.numero || 'S/N'}` : 'Endereço não cadastrado'}
                </p>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
                  {aluno.bairro ? `${aluno.bairro} • ${aluno.cidade}-${aluno.estado}` : ''}
                  {aluno.cep ? ` • CEP: ${aluno.cep}` : ''}
                </span>
              </div>

              {aluno.observacoes && (
                <div style={{ ...EstiloCard, backgroundColor: '#f8fafc', borderLeft: '4px solid #2563eb' }}>
                  <span style={{ ...EstiloLabel, color: '#2563eb' }}>Observações Pedagógicas</span>
                  <p style={{ ...EstiloDado, fontSize: '12px', whiteSpace: 'pre-wrap', color: '#475569', fontWeight: '500' }}>{aluno.observacoes}</p>
                </div>
              )}

              {aluno.tem_alergia && (
                <div style={{ ...EstiloCard, backgroundColor: '#fff5f5', borderColor: '#fed7d7' }}>
                  <span style={{ ...EstiloLabel, color: '#c53030' }}>⚠️ Alergia</span>
                  <p style={{ ...EstiloDado, color: '#c53030' }}>{aluno.alergia_descricao}</p>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                  <button onClick={() => onVerBoletim(aluno.id, anoSelecionado)} style={{ padding: '12px', borderRadius: '12px', backgroundColor: '#fefce8', color: '#854d0e', border: '1px solid #fef08a', fontWeight: '700', cursor: 'pointer', fontSize: '11px' }}>📄 BOLETIM</button>
                  <button onClick={() => onVerHistorico(aluno.id, anoPagamentoSelecionado)} style={{ padding: '12px', borderRadius: '12px', backgroundColor: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', fontWeight: '700', cursor: 'pointer', fontSize: '11px' }}>💰 PAGAMENTOS</button>
              </div>
            </div>

          // BOLETIM COMPLETO 
          ) : verBoletim ? (
            <div style={{ width: '100%', marginTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <h3 style={{ fontSize: '14px', fontWeight: 'bold', margin: 0 }}>Boletim</h3>
                      <select 
                        value={anoSelecionado} 
                        onChange={(e) => {
                          setAnoSelecionado(e.target.value);
                          onVerBoletim(aluno.id, e.target.value);
                        }}
                        style={{ padding: '4px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 'bold', outline: 'none' }}
                      >
                        <option value="2026">2026</option>
                        <option value="2025">2025</option>
                        <option value="2024">2024</option>
                      </select>
                      <button onClick={onGerarPDFBoletim} style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>📄 PDF</button>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        {!ehVisitante && <button onClick={onAdicionarDisciplina} style={{ color: '#2563eb', border: '1px solid #2563eb', padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold', background: 'none', cursor: 'pointer' }}>+ MATÉRIA</button>}
                        <button onClick={onVoltarParaFicha} style={{ border: 'none', background: 'none', color: '#64748b', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>VOLTAR</button>
                    </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f1f5f9' }}>
                                <th style={{ padding: '8px', textAlign: 'left' }}>DISCIPLINA</th>
                                <th>1ºB</th><th>2ºB</th><th style={{ color: '#ef4444' }}>R1</th>
                                <th>3ºB</th><th>4ºB</th><th style={{ color: '#ef4444' }}>R2</th>
                                <th style={{ color: '#2563eb' }}>MÉD</th>
                                {!ehVisitante && <th style={{ padding: '8px' }}></th>}
                            </tr>
                        </thead>
                        <tbody>
                            {notas.length > 0 ? notas.map((n) => {
                                const media = obterMediaFinal(n);
                                return (
                                  <tr key={n.id} style={{ borderBottom: '1px solid #eee' }}>
                                      <td style={{ padding: '8px', fontWeight: 'bold' }}>{n.disciplina}</td>
                                      {['bimestre1', 'bimestre2', 'recuperacao1', 'bimestre3', 'bimestre4', 'recuperacao2'].map((b) => (
                                          <td key={b} style={{ padding: '4px', textAlign: 'center' }}>
                                              <input 
                                                type="text" 
                                                defaultValue={n[b] || ""} 
                                                onBlur={(e) => onSalvarNota(n.id, b, e.target.value)} 
                                                disabled={ehVisitante} 
                                                style={{ 
                                                  width: '30px', 
                                                  textAlign: 'center', 
                                                  border: '1px solid #e2e8f0', 
                                                  borderRadius: '4px', 
                                                  padding: '2px', 
                                                  backgroundColor: b.includes('recuperacao') ? '#fff5f5' : 'white',
                                                  color: parseFloat(n[b]) < 7 ? '#ef4444' : '#1e293b',
                                                  fontWeight: 'bold'
                                                }} 
                                              />
                                          </td>
                                      ))}
                                      <td style={{ textAlign: 'center', fontWeight: '900', color: parseFloat(media) < 7 ? '#ef4444' : '#2563eb' }}>{media}</td>
                                      {!ehVisitante && <td style={{ textAlign: 'center' }}><button onClick={() => onExcluirDisciplina(n.id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>🗑️</button></td>}
                                  </tr>
                                );
                            }) : (
                              <tr>
                                <td colSpan={9} style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Nenhum dado encontrado para o ano {anoSelecionado}.</td>
                              </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

          ) : (
            <div style={{ width: '100%', marginTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 'bold', margin: 0 }}>Extrato de Pagamentos</h3>
                  <select 
                    value={anoPagamentoSelecionado} 
                    onChange={(e) => {
                      setAnoPagamentoSelecionado(e.target.value);
                      onVerHistorico(aluno.id, e.target.value);
                    }}
                    style={{ padding: '4px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 'bold', outline: 'none' }}
                  >
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                    <option value="2024">2024</option>
                  </select>
                  <button onClick={onGerarPDFHistorico} style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>📄 IMPRIMIR</button>
                </div>
                <button onClick={onVoltarParaFicha} style={{ border: 'none', background: 'none', color: '#64748b', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>VOLTAR</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                <div onClick={() => { if(saldoCreditoVisivel > 0) setVerCreditoGlobal(true); }} style={{ backgroundColor: saldoCreditoVisivel > 0 ? '#f0fdf4' : '#f8fafc', border: `1px solid ${saldoCreditoVisivel > 0 ? '#bbf7d0' : '#e2e8f0'}`, padding: '10px', borderRadius: '10px', textAlign: 'center', cursor: saldoCreditoVisivel > 0 ? 'pointer' : 'default' }}>
                  <span style={{ fontSize: '10px', color: '#16a34a', fontWeight: 'bold', textTransform: 'uppercase' }}>Crédito Atual</span>
                  <p style={{ margin: 0, color: '#14532d', fontSize: '14px', fontWeight: '900' }}>{saldoCreditoVisivel > 0 ? `R$ ${saldoCreditoVisivel.toFixed(2)}` : 'R$ 0,00'}</p>
                </div>
                <div onClick={() => { if(totalPendenteGeral > 0) setVerDividasGlobais(true); }} style={{ backgroundColor: totalPendenteGeral > 0 ? '#fdf2f2' : '#f8fafc', border: `1px solid ${totalPendenteGeral > 0 ? '#fecaca' : '#e2e8f0'}`, padding: '10px', borderRadius: '10px', textAlign: 'center', cursor: totalPendenteGeral > 0 ? 'pointer' : 'default' }}>
                  <span style={{ fontSize: '10px', color: totalPendenteGeral > 0 ? '#dc2626' : '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Dívida Global</span>
                  <p style={{ margin: 0, color: totalPendenteGeral > 0 ? '#991b1b' : '#334155', fontSize: '14px', fontWeight: '900' }}>{totalPendenteGeral > 0 ? `R$ ${totalPendenteGeral.toFixed(2)}` : 'R$ 0,00'}</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {historicoFiltrado.length > 0 ? historicoFiltrado.map((pgto: any, i: number) => {
                  const forma = extrairFormaPagamento(pgto.detalhes_metodos);
                  const podeGerenciar = userEmail === 'carlamonaliza9@gmail.com';
                  const devedorRestante = (parseFloat(pgto.valor_total) || 0) - (parseFloat(pgto.valor_pago || pgto.valor_total) || 0);
                  
                  return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#334155' }}>{pgto.descricao}</span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>🗓️ Venda/Lançamento: {new Date(pgto.data_pagamento).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</span>
                            {forma && <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#0369a1', marginTop: '2px' }}>💳 Método Principal: {forma}</span>}
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Valor Original: R$ {(parseFloat(pgto.valor_total) || 0).toFixed(2)}</span>
                            <span style={{ fontSize: '14px', fontWeight: '900', color: pgto.status === 'pago' ? '#16a34a' : pgto.status === 'parcial' ? '#d97706' : '#dc2626', display: 'block' }}>Valor Pago: R$ {parseFloat(pgto.valor_pago || 0).toFixed(2)}</span>
                            {devedorRestante > 0 && <span style={{ fontSize: '10px', fontWeight: '700', color: '#dc2626' }}>Saldo Devedor: R$ {devedorRestante.toFixed(2)}</span>}
                          </div>

                          {podeGerenciar && (
                            <div style={{ display: 'flex', gap: '6px', borderLeft: '1px solid #cbd5e1', paddingLeft: '8px', alignItems: 'center' }}>
                              <button onClick={() => { if (prompt("Digite a Senha Mestra para EDITAR:") === SENHA_MESTRA) { if (onEditarPagamento) onEditarPagamento(pgto); } else alert("Senha incorreta."); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px' }} title="Editar">✏️</button>
                              
                              {/* MECANISMO ADMINISTRATIVO DE ESTORNO AUTÔNOMO */}
                              <button onClick={async () => {
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
                              }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px' }} title="Desfazer Lançamento/Estornar">🔄</button>
                              
                              {/* MECANISMO ADMINISTRATIVO DE EXCLUSÃO DIRETA NO BANCO */}
                              <button onClick={async () => {
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
                              }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px' }} title="Excluir Permanentemente">🗑️</button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* SUB-LEDGER / PARCIAIS DETALHADAS */}
                      {pgto.detalhes_metodos?.historico_parciais && pgto.detalhes_metodos.historico_parciais.length > 0 && (
                        <div style={{ marginTop: '4px', paddingTop: '8px', borderTop: '1px dashed #cbd5e1', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Histórico de Recebimentos:</span>
                          {pgto.detalhes_metodos.historico_parciais.map((parcial: any, idx: number) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#475569', backgroundColor: '#fff', padding: '4px 8px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                              <span>📅 Pago em: {new Date(parcial.data_recebimento).toLocaleDateString('pt-BR', {timeZone: 'UTC'})} • 💳 Canal: {parcial.formas}</span>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                {(parseFloat(parcial.desconto) > 0 || parseFloat(parcial.multa) > 0) && (
                                  <span style={{ color: '#94a3b8', fontSize: '9px' }}>
                                    {parseFloat(parcial.desconto) > 0 ? `(- R$ ${parseFloat(parcial.desconto).toFixed(2)})` : ''} 
                                    {parseFloat(parcial.multa) > 0 ? `(+ R$ ${parseFloat(parcial.multa).toFixed(2)})` : ''}
                                  </span>
                                )}
                                <span style={{ fontWeight: 'bold', color: '#16a34a' }}>+ R$ {parseFloat(parcial.valor_pago_rodada).toFixed(2)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }) : <p style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic', margin: 0, textAlign: 'center' }}>Nenhum pagamento referenciado para este ano.</p>}
              </div>
            </div>
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

      {/* RENDERIZAÇÃO DO MODAL DE CAIXA (PDV) POR CIMA DA FICHA */}
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