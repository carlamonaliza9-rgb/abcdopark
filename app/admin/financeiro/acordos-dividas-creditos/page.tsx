"use client";

import { useState, useEffect, Fragment } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Importação dos Componentes e Modais
import { TabelaMensalidades } from "@/app/dashboard/financeiro/_components/TabelaMensalidades";
import { ModalPagamento } from "@/app/dashboard/financeiro/_components/ModalPagamento";

// --- VARIÁVEIS GLOBAIS ---
const clean = (val: any) => {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === 'number') return val;
  const str = String(val).trim();
  if (str.includes(',')) return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
  return parseFloat(str) || 0;
};
const mesesAno = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const SENHA_MESTRA = "1234";

// ============================================================================
// 1. COMPONENTE DA VISÃO DE MENSALIDADES (Gerenciamento Mensal)
// ============================================================================
function VisaoMensalidades({ userEmail }: { userEmail: string | null }) {
  const [valorPadrao, setValorPadrao] = useState(550);
  const [mesFiltro, setMesFiltro] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
  const [filtroNome, setFiltroNome] = useState("");
  const [filtroTurma, setFiltroTurma] = useState(""); 
  const [alunos, setAlunos] = useState<any[]>([]);
  const [listaReceitasDetalhada, setListaReceitasDetalhada] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [modalPgtoAberto, setModalPgtoAberto] = useState(false);
  const [alunoSelecionado, setAlunoSelecionado] = useState<any>(null);
  const [idLancamentoAtual, setIdLancamentoAtual] = useState<string | null>(null);

  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().split('T')[0]);
  const [tipoPagamento, setTipoPagamento] = useState("mensalidade");
  const [descricaoOutro, setDescricaoOutro] = useState("");
  
  const [pagamentosMetodos, setPagamentosMetodos] = useState({ 
    pix: "", dinheiro: "", credito: "", debito: "", boleto: "", 
    multa: "", desconto: "", parcelas: "1", credito_aluno: "",
    acordo_qtd_parcelas: "", acordo_valor_parcela: "", acordo_data_vencimento: "" 
  });
  const [mesReferencia, setMesReferencia] = useState(mesesAno[new Date().getMonth()]);

  async function carregarDados() {
    setCarregando(true);
    try {
      const hoje = new Date();
      const [ano, mes] = mesFiltro.split('-');
      const dataInicioAno = `${ano}-01-01`;
      const dataFimAno = `${ano}-12-31`;

      const { data: listaAlunos } = await supabase.from('alunos').select('*');
      const { data: pgtosAno } = await supabase.from('historico_pagamentos').select('*').gte('data_pagamento', dataInicioAno).lte('data_pagamento', dataFimAno);
      
      const pgtosAnoSeguro = pgtosAno || [];
      setListaReceitasDetalhada(pgtosAnoSeguro);

      const nomeMesReferencia = mesesAno[parseInt(mes) - 1];
      const pgtosDesteMes = pgtosAnoSeguro.filter((p: any) => p.tipo === 'mensalidade' && (p.descricao || '').includes(nomeMesReferencia));
      const acordosDesteMes = pgtosAnoSeguro.filter((p: any) => p.tipo === 'acordo' && p.data_pagamento && p.data_pagamento.startsWith(mesFiltro));

      if (listaAlunos) {
        const idsPagosNestaReferencia = pgtosDesteMes.filter((p: any) => p.status === 'pago').map((p: any) => p.aluno_id);

        const ordenados = listaAlunos.map((aluno: any) => {
          const acordoAluno = acordosDesteMes.find((a: any) => a.aluno_id === aluno.id && a.status !== 'pago');
          const estaPagoNesseMes = idsPagosNestaReferencia.includes(aluno.id);

          let valorBaseMensalidade = clean(aluno.valor) || valorPadrao;
          let isMensalidadePendente = !estaPagoNesseMes;
          let statusMensalidade = estaPagoNesseMes ? 'pago' : (hoje.getDate() > (parseInt(aluno.vencimento) || 1) ? 'atrasado' : 'pendente');

          let temAcordoNoMes = !!acordoAluno;
          let isAcordoPendente = temAcordoNoMes && acordoAluno.status !== 'pago';
          let valorDevedorAcordo = temAcordoNoMes ? (clean(acordoAluno.valor_total) - clean(acordoAluno.valor_pago)) : 0;
          let idPagamentoAcordo = temAcordoNoMes ? acordoAluno.id : null;

          let valorTotalDevido = 0;
          let nomeTags = [];

          if (isMensalidadePendente) valorTotalDevido += valorBaseMensalidade;
          
          if (isAcordoPendente && valorDevedorAcordo > 0) {
              valorTotalDevido += valorDevedorAcordo;
              nomeTags.push(`📌 Acordo R$ ${valorDevedorAcordo.toFixed(2)}`);
          } else if (acordosDesteMes.some((a: any) => a.aluno_id === aluno.id && a.status === 'pago')) {
              nomeTags.push(`✅ Acordo Pago`); 
          }

          let nomeExibicao = nomeTags.length > 0 ? `${aluno.nome} (${nomeTags.join(' | ')})` : aluno.nome;

          let statusFinal = 'pendente';
          if (!isMensalidadePendente && !isAcordoPendente) {
               statusFinal = 'pago';
          } else if (statusMensalidade === 'atrasado' || (isAcordoPendente && hoje > new Date(acordoAluno.data_pagamento + "T12:00:00"))) {
               statusFinal = 'atrasado';
          }

          return {
            ...aluno,
            status: statusFinal,
            valor: valorTotalDevido > 0 ? valorTotalDevido : valorBaseMensalidade,
            nome: nomeExibicao,
            isAcordo: isAcordoPendente, 
            idPagamentoAcordo: idPagamentoAcordo,
            valorDevedorAcordo: valorDevedorAcordo,
            isMensalidadePendente: isMensalidadePendente,
            valorBaseMensalidade,
            temAcordoNoMes 
          };
        }).sort((a: any, b: any) => (a.status === 'pago' ? 1 : 0) - (b.status === 'pago' ? 1 : 0) || (parseInt(a.vencimento) || 0) - (parseInt(b.vencimento) || 0));
        
        setAlunos(ordenados);
      }
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally { setCarregando(false); }
  }

  useEffect(() => { carregarDados(); }, [mesFiltro, valorPadrao]);

  async function confirmarPagamento() {
    if (tipoPagamento === "acordo") {
      const qtdParcelas = parseInt(pagamentosMetodos.acordo_qtd_parcelas || "0");
      const valorParcela = clean(pagamentosMetodos.acordo_valor_parcela);
      const dataPrimeiroVencimento = pagamentosMetodos.acordo_data_vencimento || dataPagamento;

      if (qtdParcelas <= 0 || valorParcela <= 0) return alert("Preencha parcelas e valor do acordo.");

      const parcelasParaInserir = [];
      for (let i = 0; i < qtdParcelas; i++) {
        const dataVenc = new Date(dataPrimeiroVencimento);
        dataVenc.setMonth(dataVenc.getMonth() + i);

        parcelasParaInserir.push({
          aluno_id: alunoSelecionado.id,
          tipo: 'acordo',
          descricao: `Acordo Financeiro - Parcela ${i + 1}/${qtdParcelas}`,
          valor_total: valorParcela,
          valor_pago: 0,
          status: 'pendente',
          data_pagamento: dataVenc.toISOString().split('T')[0],
          detalhes_metodos: { criado_por: userEmail || "Admin" }
        });
      }

      await supabase.from('historico_pagamentos').insert(parcelasParaInserir);
      await supabase.from('alunos').update({ status: 'pendente' }).eq('id', alunoSelecionado.id);
      
      setModalPgtoAberto(false);
      carregarDados();
      return alert(`Acordo gerado: ${qtdParcelas} parcelas na Dívida Ativa.`);
    }

    const metodosLimpos: any = {};
    for (const [key, value] of Object.entries(pagamentosMetodos)) {
      if (value !== "" && value !== "0" && value !== null) {
        metodosLimpos[key] = value;
      }
    }
    
    if (!metodosLimpos.credito || clean(metodosLimpos.credito) <= 0) {
      delete metodosLimpos.parcelas;
    } else if (!metodosLimpos.parcelas) {
      metodosLimpos.parcelas = "1";
    }

    const somaPaga = clean(pagamentosMetodos.pix) + clean(pagamentosMetodos.dinheiro) + clean(pagamentosMetodos.credito) + clean(pagamentosMetodos.debito) + clean(pagamentosMetodos.boleto);
    
    const valorMulta = clean(pagamentosMetodos.multa);
    const valorDesconto = clean(pagamentosMetodos.desconto);
    const creditoUtilizado = clean(pagamentosMetodos.credito_aluno);
    
    const valorPagoFinal = somaPaga + creditoUtilizado;

    if (valorPagoFinal <= 0 && valorDesconto === 0) return alert("Insira um valor.");

    const saldoDisponivel = clean(alunoSelecionado?.saldo_credito);
    if (creditoUtilizado > saldoDisponivel) return alert(`Saldo insuficiente (R$ ${saldoDisponivel.toFixed(2)}).`);

    const isMensal = alunoSelecionado.isMensalidadePendente;
    const isAcordo = alunoSelecionado.isAcordo;

    let dividaMensalDB = isMensal ? alunoSelecionado.valorBaseMensalidade : 0;
    let dividaAcordoDB = isAcordo ? alunoSelecionado.valorDevedorAcordo : 0;

    if (isMensal) {
         dividaMensalDB = Math.max(0, (dividaMensalDB + valorMulta) - valorDesconto);
    } else if (isAcordo) {
         dividaAcordoDB = Math.max(0, (dividaAcordoDB + valorMulta) - valorDesconto);
    } else {
         dividaMensalDB = Math.max(0, (clean(alunoSelecionado.valorBaseMensalidade || valorPadrao) + valorMulta) - valorDesconto);
    }

    const dividaReal = dividaAcordoDB + dividaMensalDB;
    let creditoGerado = valorPagoFinal > dividaReal ? valorPagoFinal - dividaReal : 0;
    let saldoParaDistribuir = valorPagoFinal + valorDesconto - valorMulta;

    const formasStrArray = [];
    if (clean(pagamentosMetodos.pix) > 0) formasStrArray.push("Pix");
    if (clean(pagamentosMetodos.dinheiro) > 0) formasStrArray.push("Dinheiro");
    if (clean(pagamentosMetodos.credito) > 0) formasStrArray.push("Cartão");
    if (clean(pagamentosMetodos.debito) > 0) formasStrArray.push("Débito");
    if (clean(pagamentosMetodos.boleto) > 0) formasStrArray.push("Boleto");
    if (creditoUtilizado > 0) formasStrArray.push("Crédito Retido");
    const formaPagamentoTexto = formasStrArray.length > 0 ? formasStrArray.join(" + ") : "Ajuste/Desconto";

    if (isAcordo && alunoSelecionado.idPagamentoAcordo && saldoParaDistribuir > 0) {
         const { data: acordoOriginal } = await supabase.from('historico_pagamentos').select('valor_pago, valor_total, detalhes_metodos').eq('id', alunoSelecionado.idPagamentoAcordo).single();
         if (acordoOriginal) {
             const valorPagoAnteriormenteAcordo = clean(acordoOriginal.valor_pago);
             const valorTotalDoAcordoNaBase = clean(acordoOriginal.valor_total);
             const valorAbaterNoAcordoDaVez = Math.min(saldoParaDistribuir, dividaAcordoDB);
             saldoParaDistribuir -= valorAbaterNoAcordoDaVez;
             const novoValorPagoAbsolutoAcordo = valorPagoAnteriormenteAcordo + valorAbaterNoAcordoDaVez;

             const registroParcialAcordo = { data_recebimento: dataPagamento, valor_pago_rodada: valorAbaterNoAcordoDaVez, formas: formaPagamentoTexto, desconto: valorDesconto, multa: valorMulta };
             const historicoAntigoAcordo = Array.isArray(acordoOriginal.detalhes_metodos?.historico_parciais) ? acordoOriginal.detalhes_metodos.historico_parciais : [];
             const metodosComSubLedgerAcordo = { ...metodosLimpos, historico_parciais: [...historicoAntigoAcordo, registroParcialAcordo] };

             await supabase.from('historico_pagamentos').update({
                  valor_pago: novoValorPagoAbsolutoAcordo,
                  status: novoValorPagoAbsolutoAcordo >= valorTotalDoAcordoNaBase ? 'pago' : (novoValorPagoAbsolutoAcordo > 0 ? 'parcial' : 'pendente'),
                  data_pagamento: dataPagamento, detalhes_metodos: metodosComSubLedgerAcordo
             }).eq('id', alunoSelecionado.idPagamentoAcordo);
         }
    }

    if ((isMensal || (!isMensal && !isAcordo)) && saldoParaDistribuir > 0) {
         let valorAplicadoMensal = Math.min(saldoParaDistribuir, dividaMensalDB);
         saldoParaDistribuir -= valorAplicadoMensal;

         const statusMensalObj = valorAplicadoMensal >= dividaMensalDB ? 'pago' : (valorAplicadoMensal > 0 ? 'parcial' : 'pendente');
         const descRef = `Mensalidade - ${mesReferencia}/${mesFiltro.split('-')[0]}`;
         const registroParcialMensalidade = { data_recebimento: dataPagamento, valor_pago_rodada: valorAplicadoMensal, formas: formaPagamentoTexto, desconto: valorDesconto, multa: valorMulta };
         const metodosComSubLedgerMensalidade = { ...metodosLimpos, historico_parciais: [registroParcialMensalidade] };
         
         const dados = {
              aluno_id: alunoSelecionado.id, tipo: tipoPagamento, descricao: descricaoOutro || descRef,
              mes_referencia: tipoPagamento === "mensalidade" ? mesReferencia : null,
              valor_total: dividaMensalDB, valor_pago: valorAplicadoMensal, status: statusMensalObj,
              data_pagamento: dataPagamento, detalhes_metodos: metodosComSubLedgerMensalidade
         };

         await supabase.from('historico_pagamentos').insert([dados]);
         await supabase.from('alunos').update({ status: statusMensalObj === 'pago' ? 'pago' : 'pendente' }).eq('id', alunoSelecionado.id);
    } else if (isAcordo && !isMensal) {
         await supabase.from('alunos').update({ status: valorPagoFinal >= dividaReal ? 'pago' : 'pendente' }).eq('id', alunoSelecionado.id);
    }

    if (creditoGerado > 0 || creditoUtilizado > 0) {
      const novoSaldoCredito = saldoDisponivel - creditoUtilizado + creditoGerado;
      await supabase.from('alunos').update({ saldo_credito: novoSaldoCredito }).eq('id', alunoSelecionado.id);
    }

    const valorCreditoEscola = clean(metodosLimpos.credito);
    const parcelas = parseInt(metodosLimpos.parcelas) || 1;
    
    if (valorCreditoEscola > 0 && parcelas > 1 && valorPagoFinal >= dividaReal) {
      const valorPorParcela = parseFloat((valorCreditoEscola / parcelas).toFixed(2));
      const previsoes = [];
      for (let i = 1; i <= parcelas; i++) {
        const dataVencimento = new Date(dataPagamento);
        dataVencimento.setMonth(dataVencimento.getMonth() + i);
        previsoes.push({
          aluno_id: alunoSelecionado.id, tipo: 'previsao_cartao', descricao: `Previsão Cartão (${i}/${parcelas}) - Pagamento Mensalidade/Acordo`,
          valor_total: valorPorParcela, valor_pago: 0, status: 'pendente', data_pagamento: dataVencimento.toISOString().split('T')[0],
          detalhes_metodos: {}
        });
      }
      await supabase.from('historico_pagamentos').insert(previsoes);
    }

    setIdLancamentoAtual(null);
    setModalPgtoAberto(false);
    carregarDados();
  }

  if (carregando) return <div className="p-10 text-center font-black uppercase text-slate-300 tracking-widest animate-pulse">Sincronizando mensalidades...</div>;

  const listaTurmasUnicas = Array.from(new Set(alunos.map((aluno: any) => aluno.turma).filter(Boolean))).sort();
  const alunosFiltrados = alunos.filter((aluno: any) => {
    const correspondeNome = aluno.nome?.toLowerCase().includes(filtroNome.toLowerCase());
    const correspondeTurma = filtroTurma === "" || aluno.turma === filtroTurma;
    return correspondeNome && correspondeTurma;
  });

  let valorTotalCalculado = 0;
  if (modalPgtoAberto && alunoSelecionado) {
       const valMensal = alunoSelecionado.isMensalidadePendente ? (clean(alunoSelecionado.valorBaseMensalidade) || valorPadrao) : 0;
       const valAcordo = alunoSelecionado.isAcordo ? clean(alunoSelecionado.valorDevedorAcordo) : 0;
       const valMulta = clean(pagamentosMetodos.multa);
       const valDesconto = clean(pagamentosMetodos.desconto);
       valorTotalCalculado = Math.max(0, (valMensal + valAcordo + valMulta) - valDesconto);
  }

  return (
    <div className="w-full relative">
      {modalPgtoAberto && (
          <div className="fixed top-6 right-6 z-[9999] bg-green-500 text-white px-6 py-4 rounded-2xl shadow-2xl border-2 border-white animate-pulse flex flex-col items-end pointer-events-none transition-all">
              <span className="text-xs uppercase tracking-wider font-bold opacity-80">Valor Total a Receber</span>
              <span className="text-3xl font-black tracking-tight">R$ {valorTotalCalculado.toFixed(2)}</span>
          </div>
      )}

      <div className="space-y-6">
        <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tighter italic">🏫 Mensalidades</h1>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Gestão de Recebimentos e Baixas Operacionais</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <select
              value={filtroTurma} onChange={(e) => setFiltroTurma(e.target.value)}
              className="w-full sm:w-auto px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-indigo-400 transition-colors text-xs uppercase tracking-wider"
            >
              <option value="">Todas as Turmas</option>
              {listaTurmasUnicas.map((turma: any) => (
                <option key={turma as string} value={turma as string}>{(turma as string).toUpperCase()}</option>
              ))}
            </select>
            <input
              type="month" value={mesFiltro} onChange={(e) => setMesFiltro(e.target.value)}
              className="w-full sm:w-auto px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-indigo-400 transition-colors text-sm"
            />
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
          <TabelaMensalidades
            alunos={alunosFiltrados} filtroNome={filtroNome} setFiltroNome={setFiltroNome}
            onPagamento={(a: any) => {
              setAlunoSelecionado(a);
              setPagamentosMetodos({ 
                pix: a.valor.toString(), dinheiro: "", credito: "", debito: "", boleto: "", 
                multa: "", desconto: "", parcelas: "1", credito_aluno: "",
                acordo_qtd_parcelas: "", acordo_valor_parcela: "", acordo_data_vencimento: "" 
              });
              setTipoPagamento("mensalidade"); 
              setModalPgtoAberto(true);
            }}
            onCobrar={(a: any) => {
              const msg = `Olá! Passando para lembrar que a mensalidade escolar de *${a.nome}*, referente a *${mesReferencia}*, venceu no dia *${a.vencimento}*.\n\n• *Valor:* R$ ${a.valor || valorPadrao}\n\nCaso já tenha realizado o pagamento, por favor, desconsidere esta mensagem ou nos envie o comprovante para darmos a baixa no system. \n\nTenha um excelente dia! ✨`;
              window.open(`https://wa.me/55${a.whatsapp?.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
            }}
            onDesfazer={async (idAlunoSelecionado: string) => {
              if (userEmail !== 'carlamonaliza9@gmail.com') return alert("Apenas a Carla Monaliza pode desfazer registros salvos.");
              if (prompt("Digite a Senha Mestra para confirmar:") !== SENHA_MESTRA) return alert("Senha incorreta.");
              
              const alunoObj = alunosFiltrados.find((a: any) => a.id === idAlunoSelecionado);
              const [ano, mes] = mesFiltro.split('-');
              const nomeMesRef = mesesAno[parseInt(mes) - 1];

              if (alunoObj?.temAcordoNoMes && !alunoObj?.isMensalidadePendente) {
                   const opcao = prompt("ATENÇÃO: Esse aluno possui Mensalidade E Acordo pagos.\nDigite [ 1 ] para desfazer a MENSALIDADE.\nDigite [ 2 ] para desfazer o ACORDO.");
                   if (opcao === '1') {
                        await supabase.from('alunos').update({ status: 'pendente' }).eq('id', idAlunoSelecionado);
                        await supabase.from('historico_pagamentos').delete().eq('aluno_id', idAlunoSelecionado).eq('tipo', 'mensalidade').like('descricao', `%${nomeMesRef}%${ano}%`);
                   } else if (opcao === '2') {
                        await supabase.from('historico_pagamentos').update({ status: 'pendente', valor_pago: 0, detalhes_metodos: {} }).eq('id', alunoObj.idPagamentoAcordo);
                   }
              } else if (alunoObj?.temAcordoNoMes && alunoObj?.isMensalidadePendente) {
                   if(confirm("Desfazer recebimento do ACORDO? (A mensalidade já consta como pendente).")) {
                        await supabase.from('historico_pagamentos').update({ status: 'pendente', valor_pago: 0, detalhes_metodos: {} }).eq('id', alunoObj.idPagamentoAcordo);
                   }
              } else {
                   if(confirm("Desfazer mensalidade? O registro retornará para pendente.")) {
                        await supabase.from('alunos').update({ status: 'pendente' }).eq('id', idAlunoSelecionado);
                        await supabase.from('historico_pagamentos').delete().eq('aluno_id', idAlunoSelecionado).eq('tipo', 'mensalidade').like('descricao', `%${nomeMesRef}%${ano}%`);
                   }
              }
              carregarDados();
            }}
          />
        </div>
      </div>

      <ModalPagamento
        aberto={modalPgtoAberto} onFechar={() => { setModalPgtoAberto(false); setIdLancamentoAtual(null); }}
        aluno={alunoSelecionado} dataPagamento={dataPagamento} setDataPagamento={setDataPagamento}
        tipoPagamento={tipoPagamento} setTipoPagamento={setTipoPagamento}
        mesReferencia={mesReferencia} setMesReferencia={setMesReferencia} mesesAno={mesesAno}
        descricaoOutro={descricaoOutro} setDescricaoOutro={setDescricaoOutro}
        pagamentosMetodos={pagamentosMetodos} setPagamentosMetodos={setPagamentosMetodos}
        onConfirmar={confirmarPagamento} editando={false} 
      />
    </div>
  );
}

// ============================================================================
// 2. COMPONENTE DA VISÃO DE SALDOS E CRÉDITOS (Auditoria Global)
// ============================================================================
function VisaoSaldosCreditos() {
  const [alunos, setAlunos] = useState<any[]>([]);
  const [listaSaldosDevedores, setListaSaldosDevedores] = useState<any[]>([]);
  const [filtroNome, setFiltroNome] = useState("");
  const [abaAtiva, setAbaAtiva] = useState<"todos" | "dividas" | "creditos">("todos");
  const [carregando, setCarregando] = useState(true);
  const [alunosExpandidos, setAlunosExpandidos] = useState<Record<string, boolean>>({});

  const [modalPgtoAberto, setModalPgtoAberto] = useState(false);
  const [alunoSelecionado, setAlunoSelecionado] = useState<any>(null);
  const [idPagamentoEdicao, setIdPagamentoEdicao] = useState<string | null>(null);
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().split('T')[0]); 
  const [tipoPagamento, setTipoPagamento] = useState("mensalidade");
  const [descricaoOutro, setDescricaoOutro] = useState("");
  const [pagamentosMetodos, setPagamentosMetodos] = useState({ pix: "", dinheiro: "", credito: "", debito: "", boleto: "", multa: "", desconto: "", credito_aluno: "", parcelas: "1" });
  const [mesReferencia, setMesReferencia] = useState(mesesAno[new Date().getMonth()]);

  async function carregarDados() {
    setCarregando(true);
    try {
      const { data: listaAlunos } = await supabase.from('alunos').select('*');
      const { data: pgtosPendentes } = await supabase.from('historico_pagamentos').select('*').in('status', ['pendente', 'parcial', 'atrasado']);

      const ordemHierarquicaTurmas = ["maternal", "jardim", "jardim i", "jardim ii", "jardim 1", "jardim 2", "1º ano", "2º ano", "3º ano", "4º ano", "5º ano"];

      const obterPesoPedagogico = (turmaNome: string) => {
        const nomeMinusculo = (turmaNome || "").toLowerCase().trim();
        const index = ordemHierarquicaTurmas.findIndex(t => nomeMinusculo.includes(t));
        return index === -1 ? 999 : index;
      };

      if (listaAlunos) {
        const ordenados = [...listaAlunos].sort((a, b) => {
          const pesoA = obterPesoPedagogico(a.turma);
          const pesoB = obterPesoPedagogico(b.turma);
          if (pesoA !== pesoB) return pesoA - pesoB;
          const compTurmaString = (a.turma || "").localeCompare(b.turma || "", "pt-BR");
          if (compTurmaString !== 0) return compTurmaString;
          return (a.nome || "").localeCompare(b.nome || "", "pt-BR");
        });
        setAlunos(ordenados);
      }

      if (pgtosPendentes) setListaSaldosDevedores(pgtosPendentes);
    } catch (err) {
      console.error("Erro ao processar balanço de saldos:", err);
    } finally { setCarregando(false); }
  }

  useEffect(() => { carregarDados(); }, []);

  const toggleAluno = (id: string) => setAlunosExpandidos(prev => ({ ...prev, [id]: !prev[id] }));

  function gerarPDFExtratoAluno(alunoAgrupado: any) {
    const doc = new jsPDF();
    const logoUrl = "https://mnmakhazghgncqummksu.supabase.co/storage/v1/object/public/assets/logo.png";
    
    try { doc.addImage(logoUrl, "PNG", 15, 12, 22, 22); } catch (e) {}
    
    doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(30, 41, 59); doc.text("ESCOLA ABC DO PARK", 42, 18);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(100, 116, 139); 
    doc.text("Educação Infantil e Ensino Fundamental", 42, 23); doc.text("Belém - Pará | Núcleo de Gestão Financeira", 42, 28);
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(30, 41, 59); doc.text("EXTRATO DE CONTA CORRENTE", 195, 18, { align: "right" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(148, 163, 184); doc.text(`Emissão: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 195, 23, { align: "right" });
    doc.setDrawColor(226, 232, 240); doc.line(15, 38, 195, 38);

    const cpfAluno = alunoAgrupado.alunoRaw?.cpf || alunoAgrupado.alunoRaw?.cpf_aluno || "NÃO CADASTRADO";
    const cpfResponsavel = alunoAgrupado.alunoRaw?.cpf_responsavel || alunoAgrupado.alunoRaw?.cpf_resp || "NÃO CADASTRADO";
    const nomeResponsavel = alunoAgrupado.alunoRaw?.responsavel || alunoAgrupado.alunoRaw?.nome_responsavel || "NÃO INFORMADO";

    autoTable(doc, {
      startY: 42,
      body: [
        [ { content: `ALUNO(A):\n${alunoAgrupado.nome.toUpperCase()}`, styles: { fontStyle: 'bold' } }, { content: `CPF DO ALUNO:\n${cpfAluno}`, styles: { fontStyle: 'bold' } }, { content: `TURMA / ETAPA LETIVA:\n${alunoAgrupado.turma.toUpperCase()}`, styles: { fontStyle: 'bold' } } ],
        [ { content: `RESPONSÁVEL FINANCEIRO:\n${nomeResponsavel.toUpperCase()}`, styles: { fontStyle: 'bold' } }, { content: `CPF DO RESPONSÁVEL:\n${cpfResponsavel}`, styles: { fontStyle: 'bold' } }, { content: `SITUAÇÃO DA MATRÍCULA:\nREGULAR`, styles: { fontStyle: 'bold' } } ]
      ],
      theme: 'plain', styles: { fontSize: 8.5, cellPadding: 3.5, textColor: [71, 85, 105], fillColor: [248, 250, 252] }, columnStyles: { 0: { cellWidth: 70 }, 1: { cellWidth: 50 }, 2: { cellWidth: 60 } }
    });

    const tableRows: any[] = [];
    if (alunoAgrupado.grid || alunoAgrupado.credito > 0) tableRows.push(["--", "--", "SALDO CREDOR RETIDO (ADIANTAMENTOS EM CONTA)", "-", "-", `+ R$ ${alunoAgrupado.credito.toFixed(2)}`]);

    alunoAgrupado.dividas.forEach((it: any) => { tableRows.push([ it.dataCriacao, it.dataPagamento, it.descricao.toUpperCase(), `R$ ${it.valorTotal.toFixed(2)}`, `R$ ${it.valorPago.toFixed(2)}`, `R$ ${it.valorRestante.toFixed(2)}` ]); });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 6, head: [['DATA VENDA', 'ÚLT. MOV.', 'HISTÓRICO DO LANÇAMENTO', 'VALOR ORIGINAL', 'VALOR ABATIDO', 'DÉBITO ATUAL']], body: tableRows,
      theme: 'striped', headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], halign: 'center', fontStyle: 'bold', fontSize: 8.5 }, styles: { fontSize: 8, cellPadding: 3.5, textColor: [30, 41, 59], valign: 'middle' },
      columnStyles: { 0: { halign: 'center', cellWidth: 22 }, 1: { halign: 'center', cellWidth: 22 }, 2: { halign: 'left' }, 3: { halign: 'right', cellWidth: 28 }, 4: { halign: 'right', cellWidth: 28 }, 5: { halign: 'right', cellWidth: 30, fontStyle: 'bold' } }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 6;
    const ehCredito = alunoAgrupado.saldoFinal >= 0;
    const corFundoFaturamento = ehCredito ? ([209, 250, 229] as [number, number, number]) : ([254, 226, 226] as [number, number, number]); 
    const corTextoFaturamento = ehCredito ? ([6, 95, 70] as [number, number, number]) : ([153, 27, 27] as [number, number, number]);

    autoTable(doc, {
      startY: finalY, margin: { left: 110 }, 
      body: [
        ['TOTAL ADIANTADO (CRÉDITOS):', `R$ ${alunoAgrupado.credito.toFixed(2)}`], ['TOTAL DE DÉBITOS EM ABERTO:', `R$ ${alunoAgrupado.totalDevido.toFixed(2)}`],
        [ { content: 'BALANÇO ATUALIZADO DA CONTA:', styles: { fontStyle: 'bold', fillColor: corFundoFaturamento, textColor: corTextoFaturamento } }, { content: `${ehCredito ? '+' : '-'} R$ ${Math.abs(alunoAgrupado.saldoFinal).toFixed(2)}`, styles: { fontStyle: 'bold', fillColor: corFundoFaturamento, textColor: corTextoFaturamento } } ]
      ],
      theme: 'plain', styles: { fontSize: 8.5, cellPadding: 4, halign: 'right', textColor: [51, 65, 85] }, columnStyles: { 0: { cellWidth: 53 }, 1: { cellWidth: 32, fontStyle: 'bold', halign: 'right' } }
    });
    
    const pageHeight = doc.internal.pageSize.height;
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(148, 163, 184);
    doc.text("Este documento consiste em um demonstrativo financeiro interno de conta corrente escolar e não substitui os recibos oficiais de quitação.", 15, pageHeight - 12);
    doc.save(`Extrato_${alunoAgrupado.nome.replace(/\s+/g, '_')}.pdf`);
  }

  async function confirmarPagamento() {
    const dinheiroPix = clean(pagamentosMetodos.pix);
    const dineroEspecie = clean(pagamentosMetodos.dinheiro);
    const dinheiroCreditoMaquininha = clean(pagamentosMetodos.credito);
    const dinheiroDebito = clean(pagamentosMetodos.debito);
    const dinheiroBoleto = clean((pagamentosMetodos as any).boleto);

    const somaPaga = dinheiroPix + dineroEspecie + dinheiroCreditoMaquininha + dinheiroDebito + dinheiroBoleto;
    const valorMulta = clean(pagamentosMetodos.multa);
    const valorDesconto = clean(pagamentosMetodos.desconto);
    const creditoUtilizado = clean(pagamentosMetodos.credito_aluno); 
    const valorPagoFinal = somaPaga + creditoUtilizado;

    if (valorPagoFinal <= 0 && valorDesconto === 0) return alert("Insira um valor.");

    const saldoDisponivel = clean(alunoSelecionado?.saldo_credito);
    if (creditoUtilizado > saldoDisponivel) return alert(`Saldo insuficiente (R$ ${saldoDisponivel.toFixed(2)}).`);

    const existente = listaSaldosDevedores.find(r => r.id === idPagamentoEdicao);
    const valorOriginalDivida = clean(existente?.valor_total);
    const jaPagoAnteriormente = clean(existente?.valor_pago);
    const devedorRestanteLíquido = valorOriginalDivida - jaPagoAnteriormente;

    const valorAbaterDestaVez = Math.min(valorPagoFinal + valorDesconto - valorMulta, devedorRestanteLíquido);
    const novoTotalPagoAcumulado = jaPagoAnteriormente + valorAbaterDestaVez;
    
    let status = novoTotalPagoAcumulado >= valorOriginalDivida - 0.01 ? "pago" : "parcial";
    let creditoGerado = (valorPagoFinal + valorDesconto - valorMulta) > devedorRestanteLíquido ? (valorPagoFinal + valorDesconto - valorMulta) - devedorRestanteLíquido : 0;

    const formasStrArray = [];
    if (dinheiroPix > 0) formasStrArray.push("Pix");
    if (dineroEspecie > 0) formasStrArray.push("Dinheiro");
    if (dinheiroCreditoMaquininha > 0) formasStrArray.push("Cartão Créd.");
    if (dinheiroDebito > 0) formasStrArray.push("Cartão Déb.");
    if (dinheiroBoleto > 0) formasStrArray.push("Boleto");
    if (creditoUtilizado > 0) formasStrArray.push("Crédito Retido");
    const formaTexto = formasStrArray.length > 0 ? formasStrArray.join(" + ") : "Ajuste";

    const historicoAntigo = Array.isArray(existente?.detalhes_metodos?.historico_parciais) ? existente.detalhes_metodos.historico_parciais : [];
    const novoHistoricoParcial = [...historicoAntigo, {
      data_recebimento: dataPagamento, valor_pago_rodada: valorAbaterDestaVez, formas: formaTexto, desconto: valorDesconto, multa: valorMulta
    }];

    const jsonMetodos = { ...pagamentosMetodos, historico_parciais: novoHistoricoParcial };

    await supabase.from('historico_pagamentos').update({ 
      valor_pago: novoTotalPagoAcumulado, status: status, data_pagamento: dataPagamento, detalhes_metodos: jsonMetodos 
    }).eq('id', idPagamentoEdicao);

    const novoSaldoCredito = saldoDisponivel - creditoUtilizado + creditoGerado;
    if (novoSaldoCredito !== saldoDisponivel) {
      await supabase.from('alunos').update({ saldo_credito: novoSaldoCredito }).eq('id', alunoSelecionado.id);
    }

    setModalPgtoAberto(false); 
    carregarDados();
    alert("Amortização registrada com sucesso!");
  }

  // --- FILTRO CONSOLIDADO E CORRIGIDO (Resolvendo os Implicit 'Any' Type) ---
  const alunosConsolidados = alunos.map((aluno: any) => {
    const credito = clean(aluno.saldo_credito);
    const dividasDoAluno = listaSaldosDevedores.filter((p: any) => p.aluno_id === aluno.id);
    
    const listaDividasFormatadas = dividasDoAluno.map((d: any) => ({
      id: d.id, tipo: d.tipo, descricao: d.descricao, valorTotal: clean(d.valor_total), valorPago: clean(d.valor_pago),
      valorRestante: clean(d.valor_total) - clean(d.valor_pago),
      dataPagamento: d.data_pagamento ? new Date(d.data_pagamento + "T12:00:00").toLocaleDateString('pt-BR') : '--',
      dataCriacao: d.created_at ? new Date(d.created_at).toLocaleDateString('pt-BR') : (d.data_pagamento ? new Date(d.data_pagamento + "T12:00:00").toLocaleDateString('pt-BR') : '--'),
      detalhes_metodos: d.detalhes_metodos
    })).filter((d: any) => d.valorRestante > 0);

    const totalDevido = listaDividasFormatadas.reduce((acc: number, curr: any) => acc + curr.valorRestante, 0);
    const saldoFinal = credito - totalDevido;

    if (credito === 0 && listaDividasFormatadas.length === 0) return null;

    return { id: aluno.id, alunoRaw: aluno, nome: aluno.nome, turma: aluno.turma, credito, totalDevido, saldoFinal, dividas: listaDividasFormatadas };
  }).filter((item): item is NonNullable<typeof item> => item !== null);

  const registrosFiltrados = alunosConsolidados.filter((item: any) => {
    const bateNome = item.nome?.toLowerCase().includes(filtroNome.toLowerCase());
    if (!bateNome) return false;
    if (abaAtiva === "creditos") return item.saldoFinal > 0;
    if (abaAtiva === "dividas") return item.saldoFinal < 0;
    return true;
  });

  return (
    <div className="w-full relative">
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">👥 Carteira de Saldos & Créditos</h1>
          <p className="text-sm text-gray-500 mt-1">Auditoria geral de adiantamentos e contas pendentes agrupados por aluno</p>
        </div>
        <div>
          <input type="text" placeholder="🔍 Buscar aluno por nome..." value={filtroNome} onChange={(e) => setFiltroNome(e.target.value)} className="p-3 bg-gray-100 rounded-xl text-sm border-none text-gray-800 outline-none w-64 font-medium" />
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setAbaAtiva("todos")} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${abaAtiva === "todos" ? "bg-slate-700 text-white shadow-sm" : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200/60"}`}>📂 Todos ({alunosConsolidados.length})</button>
        <button onClick={() => setAbaAtiva("dividas")} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${abaAtiva === "dividas" ? "bg-rose-600 text-white shadow-sm" : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200/60"}`}>🔴 Apenas Devedores ({alunosConsolidados.filter((i: any) => i.saldoFinal < 0).length})</button>
        <button onClick={() => setAbaAtiva("creditos")} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${abaAtiva === "creditos" ? "bg-emerald-600 text-white shadow-sm" : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200/60"}`}>🟢 Apenas Saldo Credor ({alunosConsolidados.filter((i: any) => i.saldoFinal > 0).length})</button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[950px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-gray-100">
                <th className="p-4 w-16 text-center">INFO</th><th className="p-4 w-72">Aluno / Cliente</th><th className="p-4 w-40">Turma Letiva</th>
                <th className="p-4">Resumo da Ficha Escolar</th><th className="p-4 w-48 text-right pr-12">Balanço Acumulado</th><th className="p-4 w-36 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {registrosFiltrados.length > 0 ? (
                registrosFiltrados.map((item: any) => {
                  const expandido = !!alunosExpandidos[item.id];
                  return (
                    <Fragment key={item.id}>
                      <tr className="hover:bg-slate-50/40 transition-colors font-medium">
                        <td className="p-4 text-center">
                          <button onClick={() => toggleAluno(item.id)} className="text-slate-400 hover:text-slate-600 focus:outline-none">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-5 h-5 transform transition-transform duration-200 ${expandido ? "rotate-180" : ""}`}><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
                          </button>
                        </td>
                        <td onClick={() => toggleAluno(item.id)} className="p-4 font-bold text-slate-800 uppercase cursor-pointer hover:text-blue-600 truncate">{item.nome}</td>
                        <td className="p-4 text-slate-500 uppercase font-semibold truncate">{item.turma || "Não Alocado"}</td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1.5 items-center">
                            {item.dividas.length > 0 ? ( <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-100">{item.dividas.length} em aberto</span> ) : ( <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">Regular</span> )}
                            {item.credito > 0 && ( <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-700 border border-sky-100">Crédito: R$ {item.credito.toFixed(2)}</span> )}
                          </div>
                        </td>
                        <td className={`p-4 text-right font-bold text-base pr-12 ${item.saldoFinal >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{item.saldoFinal >= 0 ? `+ R$ ${item.saldoFinal.toFixed(2)}` : `- R$ ${Math.abs(item.saldoFinal).toFixed(2)}`}</td>
                        <td className="p-4 text-center"><button onClick={() => gerarPDFExtratoAluno(item)} className="bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold px-3 py-1.5 rounded-lg text-xs border border-slate-200/40">🖨️ Extrato</button></td>
                      </tr>
                      {expandido && (
                        <tr className="bg-slate-50/50">
                          <td colSpan={6} className="p-4 pl-16 pr-8 border-t border-b border-gray-100/60">
                            <div className="bg-white rounded-xl border border-gray-100 shadow-inner p-3 space-y-2">
                              <h5 className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2">Discriminação Detalhada das Contas do Aluno:</h5>
                              {item.credito > 0 && (
                                <div className="flex justify-between items-center py-2.5 px-4 bg-emerald-50/30 border border-emerald-100 rounded-xl text-xs">
                                  <div>
                                    <span className="font-bold text-emerald-800 uppercase">[🟢 ADIANTAMENTO] Saldo Credor</span>
                                    <p className="text-[10px] text-emerald-600">Retido em conta para uso em futuras amortizações automáticas</p>
                                  </div>
                                  <span className="font-bold text-emerald-600 text-sm">+ R$ {item.credito.toFixed(2)}</span>
                                </div>
                              )}
                              {item.dividas.map((div: any) => (
                                <div key={div.id} className="flex justify-between items-center py-2.5 px-4 bg-white border border-gray-100 rounded-xl text-xs shadow-sm hover:border-gray-200 transition-all">
                                  <div>
                                    <span className="font-bold text-slate-700 uppercase">[{div.tipo}] {div.descricao}</span>
                                    <p className="text-[10px] text-slate-400 mt-0.5">Lançamento: {div.dataCriacao} | Restante: R$ {div.valorRestante.toFixed(2)}</p>
                                  </div>
                                  <button onClick={() => { setAlunoSelecionado(item.alunoRaw); setIdPagamentoEdicao(div.id); setTipoPagamento(div.tipo || "mensalidade"); setDescricaoOutro(div.descricao); setPagamentosMetodos({ pix: div.valorRestante.toFixed(2), dinheiro: "", credito: "", debito: "", boleto: "", multa: "", desconto: "", credito_aluno: "", parcelas: "1" }); setModalPgtoAberto(true); }} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-[11px]">🟢 + PGTO</button>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              ) : (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400 italic">Nenhum saldo ou crédito encontrado com os filtros aplicados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <ModalPagamento aberto={modalPgtoAberto} onFechar={() => { setModalPgtoAberto(false); setIdPagamentoEdicao(null); }} aluno={alunoSelecionado} dataPagamento={dataPagamento} setDataPagamento={setDataPagamento} tipoPagamento={tipoPagamento} setTipoPagamento={setTipoPagamento} mesReferencia={mesReferencia} setMesReferencia={setMesReferencia} mesesAno={mesesAno} descricaoOutro={descricaoOutro} setDescricaoOutro={setDescricaoOutro} pagamentosMetodos={pagamentosMetodos} setPagamentosMetodos={setPagamentosMetodos} onConfirmar={confirmarPagamento} editando={true} />
    </div>
  );
}

// ============================================================================
// 3. COMPONENTE DA VISÃO DE ACORDOS E PARCELAMENTOS (Dívida Ativa Histórica)
// ============================================================================
function VisaoAcordos({ userEmail }: { userEmail: string | null }) {
  const [carregando, setCarregando] = useState(true);
  const [acordosAgrupados, setAcordosAgrupados] = useState<any[]>([]);
  const [filtroNome, setFiltroNome] = useState("");
  const [alunoExpandido, setAlunoExpandido] = useState<string | null>(null);
  const [editandoObs, setEditandoObs] = useState<string | null>(null);
  const [textoObs, setTextoObs] = useState("");

  useEffect(() => { carregarDados(); }, []);

  async function carregarDados() {
    setCarregando(true);
    try {
      const hoje = new Date().toISOString().split('T')[0];
      const { data: listaAlunos } = await supabase.from('alunos').select('*');
      const { data: todosAcordos } = await supabase.from('historico_pagamentos').select('*').eq('tipo', 'acordo').order('data_pagamento', { ascending: true });

      if (listaAlunos && todosAcordos) {
        const agrupados = listaAlunos.map((aluno: any) => {
          const parcelasDoAluno = todosAcordos.filter((a: any) => a.aluno_id === aluno.id);
          if (parcelasDoAluno.length === 0) return null;

          const parcelasAtualizadas = parcelasDoAluno.map((p: any) => {
            let statusReal = p.status;
            if (p.status !== 'pago' && p.data_pagamento < hoje) statusReal = 'atrasado';
            return { ...p, status: statusReal };
          });

          const valorTotal = parcelasAtualizadas.reduce((acc: number, p: any) => acc + clean(p.valor_total), 0);
          const valorPago = parcelasAtualizadas.filter((p: any) => p.status === 'pago').reduce((acc: number, p: any) => acc + clean(p.valor_pago || p.valor_total), 0);
          const dataInicio = parcelasAtualizadas[0]?.created_at?.split('T')[0] || parcelasAtualizadas[0]?.data_pagamento;
          const responsavel = parcelasAtualizadas[0]?.detalhes_metodos?.criado_por || "Sistema/Admin";

          return { ...aluno, parcelas: parcelasAtualizadas, valorTotal, valorPago, dataInicio, responsavel, progresso: Math.round((valorPago / valorTotal) * 100) || 0 };
        }).filter(Boolean);

        setAcordosAgrupados(agrupados as any[]);
      }
    } catch (e) { console.error(e); }
    setCarregando(false);
  }

  async function salvarObservacao(alunoId: string) {
    await supabase.from('alunos').update({ observacoes_financeiras: textoObs }).eq('id', alunoId);
    setAcordosAgrupados(acordosAgrupados.map((a: any) => a.id === alunoId ? { ...a, observacoes_financeiras: textoObs } : a));
    setEditandoObs(null);
  }

  const dadosFiltrados = acordosAgrupados.filter((a: any) => a.nome.toLowerCase().includes(filtroNome.toLowerCase()));

  if (carregando) return <div className="p-10 text-center font-black uppercase text-slate-300 tracking-widest animate-pulse">Carregando Dívida Ativa...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tighter italic">🤝 Cronograma de Acordos</h1>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Parcelamentos Especiais e Histórico Detalhado de Renegociações</p>
        </div>
        <input type="text" placeholder="Buscar aluno..." value={filtroNome} onChange={(e) => setFiltroNome(e.target.value)} className="w-full sm:w-64 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-indigo-400 transition-colors text-sm" />
      </div>

      <div className="space-y-4">
        {dadosFiltrados.length === 0 ? (
          <div className="text-center p-10 text-slate-400 font-bold bg-white rounded-2xl border">Nenhum acordo registrado.</div>
        ) : (
          dadosFiltrados.map((aluno: any) => {
            return (
              <div key={aluno.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 flex flex-col md:flex-row justify-between items-center gap-4 cursor-pointer hover:bg-slate-50" onClick={() => setAlunoExpandido(alunoExpandido === aluno.id ? null : aluno.id)}>
                  <div className="flex-1 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-xl">{aluno.nome.charAt(0)}</div>
                    <div>
                      <h2 className="font-bold text-lg text-slate-800 uppercase">{aluno.nome}</h2>
                      <p className="text-xs text-slate-500 font-semibold mt-1">
                        📦 Acordo parcelado em <b className="text-indigo-600">{aluno.parcelas.length}x</b> | Aberto em: {aluno.dataInicio?.split('-').reverse().join('/')} | 👤 Gestor: {aluno.responsavel}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end min-w-[220px]">
                    <span className="text-xs font-bold text-slate-500 mb-1">Quitado: <b className="text-emerald-500">R$ {aluno.valorPago.toFixed(2)}</b> de R$ {aluno.valorTotal.toFixed(2)}</span>
                    <div className="w-full bg-slate-100 rounded-full h-2 shadow-inner"><div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${aluno.progresso}%` }} /></div>
                  </div>
                </div>

                {alunoExpandido === aluno.id && (
                  <div className="p-6 border-t border-slate-100 bg-slate-50 flex flex-col lg:grid lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
                    <div className="lg:col-span-8 space-y-2.5">
                      <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Detalhamento das Parcelas Cadastradas</h4>
                      {aluno.parcelas.map((parcela: any, idx: number) => {
                        return (
                          <div key={parcela.id} className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-xs">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-bold text-slate-800 uppercase">{parcela.descricao} (Parcela {idx + 1}/{aluno.parcelas.length})</span>
                              <span className="text-[10px] text-slate-400">Vencimento original programado para: {parcela.data_pagamento?.split('-').reverse().join('/')}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="font-bold text-slate-800">R$ {clean(parcela.valor_total).toFixed(2)}</span>
                              <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider ${parcela.status === 'pago' ? 'bg-emerald-100 text-emerald-700' : parcela.status === 'atrasado' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>{parcela.status}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="lg:col-span-4 flex flex-col h-full">
                      <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Observações Internas da Secretaria</h4>
                      {editandoObs === aluno.id ? (
                        <div className="flex flex-col gap-2 flex-1">
                          <textarea value={textoObs} onChange={(e) => setTextoObs(e.target.value)} className="w-full flex-1 p-3 rounded-xl border border-slate-200 outline-none text-xs resize-none bg-white min-h-[120px]" placeholder="Insira os termos firmados de pagamento..." />
                          <div className="flex gap-2 justify-end"><button onClick={() => setEditandoObs(null)} className="px-3 py-1.5 text-xs font-bold text-slate-500 rounded-lg">Cancelar</button><button onClick={() => salvarObservacao(aluno.id)} className="px-3 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg shadow-sm">Gravar Notas</button></div>
                        </div>
                      ) : (
                        <div onClick={() => { setTextoObs(aluno.observacoes_financeiras || ""); setEditandoObs(aluno.id); }} className="flex-1 p-4 bg-white border border-slate-100 rounded-xl text-xs text-slate-600 cursor-pointer hover:border-indigo-300 transition-colors whitespace-pre-wrap min-h-[120px] relative group">
                          {aluno.observacoes_financeiras || <span className="text-slate-400 italic">Nenhum termo registrado. Clique para adicionar detalhes operacionais...</span>}
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-slate-400 text-[10px] transition-opacity">✏️ EDITAR</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL MESTRE (Página Base Expandida com Proporção Ampla)
// ============================================================================
export default function ControleFinanceiroUnificadoPage() {
  const router = useRouter();
  const [visaoAtiva, setVisaoAtiva] = useState<"mensalidades" | "saldos" | "acordos">("mensalidades");
  const [verificandoAcesso, setVerificandoAcesso] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    async function verificarAcesso() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");

      const emailAtual = user.email || "";
      setUserEmail(emailAtual);
      const { data: perfil } = await supabase.from('perfis').select('cargo').eq('id', user.id).single();

      const ehAutorizado = emailAtual === 'carlamonaliza9@gmail.com' || emailAtual === 'diretoria@abcdopark.com' || perfil?.cargo === 'Admin' || perfil?.cargo === 'Direção';
      if (!ehAutorizado) return router.push("/dashboard");

      setVerificandoAcesso(false);
    }
    verificarAcesso();
  }, [router]);

  if (verificandoAcesso) return <div className="p-10 text-center font-black uppercase text-slate-300 tracking-widest animate-pulse">Verificando Credenciais...</div>;

  return (
    <div className="w-full bg-slate-50 min-h-screen font-sans antialiased text-slate-800 pb-24 md:p-6 lg:p-8 flex flex-col">
      {/* HEADER DE TABS MASTER EXPANDIDO */}
      <div className="max-w-[1700px] w-full mx-auto mb-6 px-4">
        <div className="flex bg-slate-200/60 p-1.5 rounded-2xl w-fit border border-slate-300/40">
          <button
            onClick={() => setVisaoAtiva("mensalidades")}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${visaoAtiva === "mensalidades" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            📅 Mensalidades
          </button>
          <button
            onClick={() => setVisaoAtiva("saldos")}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${visaoAtiva === "saldos" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            👥 Saldos e Créditos
          </button>
          <button
            onClick={() => setVisaoAtiva("acordos")}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${visaoAtiva === "acordos" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            🤝 Acordos
          </button>
        </div>
      </div>

      {/* RENDERIZAÇÃO CENTRALIZADA DENTRO DO NOVO CONTAINER WIDE */}
      <div className="max-w-[1700px] w-full mx-auto px-4 flex-1">
        {visaoAtiva === "mensalidades" ? (
          <VisaoMensalidades userEmail={userEmail} />
        ) : visaoAtiva === "saldos" ? (
          <VisaoSaldosCreditos />
        ) : (
          <VisaoAcordos userEmail={userEmail} />
        )}
      </div>
    </div>
  );
}