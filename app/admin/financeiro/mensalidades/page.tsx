"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

// Importação dos Componentes e Modais da pasta original
import { TabelaMensalidades } from "@/app/dashboard/financeiro/_components/TabelaMensalidades";
import { ModalPagamento } from "@/app/dashboard/financeiro/_components/ModalPagamento";

// Auxiliar de conversão financeira blindada (Padrão do Sistema)
const clean = (val: any) => parseFloat(String(val).replace(',', '.')) || 0;

export default function MensalidadesPage() {
  const router = useRouter();
  const [verificandoAcesso, setVerificandoAcesso] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userCargo, setUserCargo] = useState<string | null>(null);

  // --- ESTADOS DE CONFIGURAÇÃO E DADOS ---
  const [valorPadrao, setValorPadrao] = useState(550);
  const [mesFiltro, setMesFiltro] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
  const [filtroNome, setFiltroNome] = useState("");
  const [filtroTurma, setFiltroTurma] = useState(""); 
  const [alunos, setAlunos] = useState<any[]>([]);
  const [listaReceitasDetalhada, setListaReceitasDetalhada] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  // --- ESTADOS DE CONTROLE DE MODAL E EDIÇÃO ---
  const [modalPgtoAberto, setModalPgtoAberto] = useState(false);
  const [alunoSelecionado, setAlunoSelecionado] = useState<any>(null);
  const [idLancamentoAtual, setIdLancamentoAtual] = useState<string | null>(null);

  // --- ESTADOS DE FORMULÁRIO FINANCEIRO ---
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().split('T')[0]);
  const [tipoPagamento, setTipoPagamento] = useState("mensalidade");
  const [descricaoOutro, setDescricaoOutro] = useState("");
  
  const [pagamentosMetodos, setPagamentosMetodos] = useState({ 
    pix: "", dinheiro: "", credito: "", debito: "", boleto: "", 
    multa: "", desconto: "", parcelas: "1", credito_aluno: "",
    acordo_qtd_parcelas: "", acordo_valor_parcela: "", acordo_data_vencimento: "" 
  });
  const [mesReferencia, setMesReferencia] = useState(["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"][new Date().getMonth()]);

  const SENHA_MESTRA = "1234";
  const mesesAno = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  useEffect(() => {
    async function verificarAcesso() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");

      const emailAtual = user.email || "";
      setUserEmail(emailAtual);
      const { data: perfil } = await supabase.from('perfis').select('cargo').eq('id', user.id).single();
      setUserCargo(perfil?.cargo || null);

      const ehAutorizado =
        emailAtual === 'carlamonaliza9@gmail.com' ||
        emailAtual === 'diretoria@abcdopark.com' ||
        perfil?.cargo === 'Admin' ||
        perfil?.cargo === 'Direção';

      if (!ehAutorizado) return router.push("/dashboard");
      setVerificandoAcesso(false);
    }
    verificarAcesso();
  }, [router]);

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

        const ordenados = listaAlunos.map(aluno => {
          const acordoAluno = acordosDesteMes.find(a => a.aluno_id === aluno.id);
          const estaPagoNesseMes = idsPagosNestaReferencia.includes(aluno.id);

          // VARIAVEIS MENSALIDADE
          let valorBaseMensalidade = parseFloat(aluno.valor) || valorPadrao;
          let isMensalidadePendente = !estaPagoNesseMes;
          let statusMensalidade = estaPagoNesseMes ? 'pago' : (hoje.getDate() > (parseInt(aluno.vencimento) || 1) ? 'atrasado' : 'pendente');

          // VARIAVEIS ACORDO
          let temAcordoNoMes = !!acordoAluno;
          let isAcordoPendente = temAcordoNoMes && acordoAluno.status !== 'pago';
          let valorParcelaAcordo = temAcordoNoMes ? parseFloat(acordoAluno.valor_total) : 0;
          let idPagamentoAcordo = temAcordoNoMes ? acordoAluno.id : null;

          // COMBINAÇÃO E SOMA
          let valorTotalDevido = 0;
          let nomeTags = [];

          if (isMensalidadePendente) valorTotalDevido += valorBaseMensalidade;
          
          if (isAcordoPendente) {
              valorTotalDevido += valorParcelaAcordo;
              nomeTags.push(`📌 Acordo R$ ${valorParcelaAcordo.toFixed(2)}`);
          } else if (temAcordoNoMes) {
              nomeTags.push(`✅ Acordo Pago`); // Tag puramente visual
          }

          let nomeExibicao = nomeTags.length > 0 ? `${aluno.nome} (${nomeTags.join(' | ')})` : aluno.nome;

          // CONSOLIDAÇÃO DO STATUS GERAL
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
            isMensalidadePendente: isMensalidadePendente,
            valorBaseMensalidade,
            valorParcelaAcordo,
            temAcordoNoMes
          };
        }).sort((a, b) => (a.status === 'pago' ? 1 : 0) - (b.status === 'pago' ? 1 : 0) || (parseInt(a.vencimento) || 0) - (parseInt(b.vencimento) || 0));
        
        setAlunos(ordenados);
      }
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally { setCarregando(false); }
  }

  useEffect(() => { if (!verificandoAcesso) carregarDados(); }, [mesFiltro, valorPadrao, verificandoAcesso]);

  // ================= LÓGICA FINANCEIRA INTEGRADA E INTELIGENTE =================
  async function confirmarPagamento() {
    // --- LÓGICA 1: GERAÇÃO INICIAL DO ACORDO (Mantida Intacta) ---
    if (tipoPagamento === "acordo") {
      const qtdParcelas = parseInt(pagamentosMetodos.acordo_qtd_parcelas || "0");
      const valorParcela = parseFloat(pagamentosMetodos.acordo_valor_parcela || "0");
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
          detalhes_metodos: {}
        });
      }

      await supabase.from('historico_pagamentos').insert(parcelasParaInserir);
      await supabase.from('alunos').update({ status: 'pendente' }).eq('id', alunoSelecionado.id);
      
      setModalPgtoAberto(false);
      carregarDados();
      return alert(`Acordo gerado: ${qtdParcelas} parcelas na Dívida Ativa.`);
    }

    // --- LÓGICA 2: RECEBIMENTO FINANCEIRO (Integração Total com PDV/Ficha) ---
    const metodosLimpos: any = {};
    for (const [key, value] of Object.entries(pagamentosMetodos)) {
      if (value !== "" && value !== "0" && value !== null) {
        metodosLimpos[key] = value;
      }
    }
    
    if (!metodosLimpos.credito || parseFloat(metodosLimpos.credito) <= 0) {
      delete metodosLimpos.parcelas;
    } else if (!metodosLimpos.parcelas) {
      metodosLimpos.parcelas = "1";
    }

    const dinheiroPix = clean(pagamentosMetodos.pix) + clean((pagamentosMetodos as any).pix_editora);
    const dinheiroEspecie = clean(pagamentosMetodos.dinheiro);
    const dinheiroCartao = clean(pagamentosMetodos.credito) + clean(pagamentosMetodos.debito) + clean((pagamentosMetodos as any).credito_editora) + clean((pagamentosMetodos as any).debito_editora);
    const dinheiroBoleto = clean(pagamentosMetodos.boleto);

    const somaPaga = dinheiroPix + dinheiroEspecie + dinheiroCartao + dinheiroBoleto;
    const valorMulta = clean(pagamentosMetodos.multa);
    const valorDesconto = clean(pagamentosMetodos.desconto);
    const creditoUtilizado = clean(pagamentosMetodos.credito_aluno);
    
    const valorPagoFinal = somaPaga + creditoUtilizado;

    if (valorPagoFinal <= 0 && valorDesconto === 0) return alert("Insira um valor financeiro válido.");

    const saldoDisponivel = parseFloat(alunoSelecionado?.saldo_credito || 0);
    if (creditoUtilizado > saldoDisponivel) return alert(`Saldo insuficiente (R$ ${saldoDisponivel.toFixed(2)}).`);

    // Geração do Sub-ledger (Para aparecer na Ficha do Aluno perfeitamente)
    const formasStrArray = [];
    if (dinheiroPix > 0) formasStrArray.push("Pix");
    if (dinheiroEspecie > 0) formasStrArray.push("Dinheiro");
    if (dinheiroCartao > 0) formasStrArray.push("Cartão");
    if (dinheiroBoleto > 0) formasStrArray.push("Boleto");
    if (creditoUtilizado > 0) formasStrArray.push("Crédito Retido");
    const formaPagamentoTexto = formasStrArray.length > 0 ? formasStrArray.join(" + ") : "Ajuste/Desconto";

    // VALIDAÇÃO DE DIVIDA EM COMBO (Mensalidade + Acordo)
    const isMensal = alunoSelecionado.isMensalidadePendente;
    const isAcordo = alunoSelecionado.isAcordo;

    let dividaMensalDB = isMensal ? alunoSelecionado.valorBaseMensalidade : 0;
    let dividaAcordoDB = isAcordo ? alunoSelecionado.valorParcelaAcordo : 0;

    if (isMensal) {
         dividaMensalDB = Math.max(0, (dividaMensalDB + valorMulta) - valorDesconto);
    } else if (isAcordo) {
         dividaAcordoDB = Math.max(0, (dividaAcordoDB + valorMulta) - valorDesconto);
    } else {
         dividaMensalDB = Math.max(0, ((parseFloat(alunoSelecionado.valorBaseMensalidade) || valorPadrao) + valorMulta) - valorDesconto);
    }

    const dividaReal = dividaAcordoDB + dividaMensalDB;
    let saldoParaDistribuir = valorPagoFinal + valorDesconto - valorMulta;
    let trocoGlobal = 0;

    // 1. DÁ BAIXA NA PARCELA DO ACORDO
    if (isAcordo && alunoSelecionado.idPagamentoAcordo) {
         let valorAplicadoAcordo = Math.min(saldoParaDistribuir, dividaAcordoDB);
         saldoParaDistribuir -= valorAplicadoAcordo;

         const registroParcial = {
            data_recebimento: dataPagamento,
            valor_pago_rodada: valorAplicadoAcordo,
            formas: formaPagamentoTexto,
            desconto: valorDesconto,
            multa: valorMulta
         };

         // Como estamos recebendo direto pela Mensalidades, o histórico parcial se baseia na transação corrente
         const metodosComSubLedger = { ...metodosLimpos, historico_parciais: [registroParcial] };

         await supabase.from('historico_pagamentos').update({
              valor_pago: valorAplicadoAcordo,
              status: valorAplicadoAcordo >= dividaAcordoDB ? 'pago' : (valorAplicadoAcordo > 0 ? 'parcial' : 'pendente'),
              data_pagamento: dataPagamento,
              detalhes_metodos: metodosComSubLedger
         }).eq('id', alunoSelecionado.idPagamentoAcordo);
    }

    // 2. DÁ BAIXA/INSERE A MENSALIDADE DO MÊS
    if (isMensal || (!isMensal && !isAcordo)) {
         let valorAplicadoMensal = Math.min(saldoParaDistribuir, dividaMensalDB);
         saldoParaDistribuir -= valorAplicadoMensal;
         
         const registroParcial = {
            data_recebimento: dataPagamento,
            valor_pago_rodada: valorAplicadoMensal,
            formas: formaPagamentoTexto,
            desconto: valorDesconto,
            multa: valorMulta
         };

         const statusMensalObj = valorAplicadoMensal >= dividaMensalDB ? 'pago' : (valorAplicadoMensal > 0 ? 'parcial' : 'pendente');
         const descRef = `Mensalidade - ${mesReferencia}/${mesFiltro.split('-')[0]}`;
         const metodosComSubLedger = { ...metodosLimpos, historico_parciais: [registroParcial] };
         
         const dados = {
              aluno_id: alunoSelecionado.id,
              tipo: tipoPagamento,
              descricao: descricaoOutro || descRef,
              mes_referencia: tipoPagamento === "mensalidade" ? mesReferencia : null,
              valor_total: dividaMensalDB,
              valor_pago: valorAplicadoMensal,
              status: statusMensalObj,
              data_pagamento: dataPagamento,
              detalhes_metodos: metodosComSubLedger
         };

         await supabase.from('historico_pagamentos').insert([dados]);
         await supabase.from('alunos').update({ status: statusMensalObj === 'pago' ? 'pago' : 'pendente' }).eq('id', alunoSelecionado.id);
    } else if (isAcordo && !isMensal) {
         await supabase.from('alunos').update({ status: valorPagoFinal >= dividaReal ? 'pago' : 'pendente' }).eq('id', alunoSelecionado.id);
    }

    if (saldoParaDistribuir > 0) {
        trocoGlobal = saldoParaDistribuir;
    }

    // Saldo do Cliente (Adiciona troco e subtrai o que foi usado)
    if (trocoGlobal > 0 || creditoUtilizado > 0) {
      const novoSaldoCredito = saldoDisponivel - creditoUtilizado + trocoGlobal;
      await supabase.from('alunos').update({ saldo_credito: novoSaldoCredito }).eq('id', alunoSelecionado.id);
    }

    // Geração de Previsões da Maquininha (Contas a Receber)
    const valorCreditoEscola = parseFloat(metodosLimpos.credito) || 0;
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

  if (verificandoAcesso || carregando) return <div className="p-10 text-center font-black uppercase text-slate-300 tracking-widest animate-pulse">Sincronizando mensalidades...</div>;

  const listaTurmasUnicas = Array.from(new Set(alunos.map(aluno => aluno.turma).filter(Boolean))).sort();
  const alunosFiltrados = alunos.filter(aluno => {
    const correspondeNome = aluno.nome?.toLowerCase().includes(filtroNome.toLowerCase());
    const correspondeTurma = filtroTurma === "" || aluno.turma === filtroTurma;
    return correspondeNome && correspondeTurma;
  });
  const historicoAlunoSelecionado = alunoSelecionado ? listaReceitasDetalhada.filter(h => h.aluno_id === alunoSelecionado.id) : [];

  // === CÁLCULO REATIVO DO VALOR TOTAL PARA O BANNER FLUTUANTE ===
  let valorTotalCalculado = 0;
  if (modalPgtoAberto && alunoSelecionado) {
       const valMensal = alunoSelecionado.isMensalidadePendente ? (clean(alunoSelecionado.valorBaseMensalidade) || valorPadrao) : 0;
       const valAcordo = alunoSelecionado.isAcordo ? clean(alunoSelecionado.valorParcelaAcordo) : 0;
       const valMulta = clean(pagamentosMetodos.multa);
       const valDesconto = clean(pagamentosMetodos.desconto);
       valorTotalCalculado = Math.max(0, (valMensal + valAcordo + valMulta) - valDesconto);
  }

  return (
    <div className="w-full bg-slate-50 min-h-screen p-4 md:p-8 font-sans antialiased text-slate-800 pb-24 md:pb-8 relative">
      
      {/* ================= BANNER DE TOTAL A RECEBER ================= */}
      {modalPgtoAberto && (
          <div className="fixed top-6 right-6 z-[9999] bg-green-500 text-white px-6 py-4 rounded-2xl shadow-2xl border-2 border-white animate-pulse flex flex-col items-end pointer-events-none transition-all">
              <span className="text-xs uppercase tracking-wider font-bold opacity-80">Valor Total a Receber</span>
              <span className="text-3xl font-black tracking-tight">R$ {valorTotalCalculado.toFixed(2)}</span>
          </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Reestilizado */}
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
              {listaTurmasUnicas.map(turma => (
                <option key={turma as string} value={turma as string}>{(turma as string).toUpperCase()}</option>
              ))}
            </select>

            <input
              type="month" value={mesFiltro} onChange={(e) => setMesFiltro(e.target.value)}
              className="w-full sm:w-auto px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-indigo-400 transition-colors text-sm"
            />
          </div>
        </div>

        {/* Tabela de Mensalidades */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
          <TabelaMensalidades
            alunos={alunosFiltrados} filtroNome={filtroNome} setFiltroNome={setFiltroNome}
            onPagamento={(a) => {
              setAlunoSelecionado(a);
              
              setPagamentosMetodos({ 
                pix: a.valor.toString(), dinheiro: "", credito: "", debito: "", boleto: "", 
                multa: "", desconto: "", parcelas: "1", credito_aluno: "",
                acordo_qtd_parcelas: "", acordo_valor_parcela: "", acordo_data_vencimento: "" 
              });
              
              setTipoPagamento("mensalidade"); 
              setModalPgtoAberto(true);
            }}
            onCobrar={(a) => {
              const msg = `Olá! Passando para lembrar que a mensalidade escolar de *${a.nome}*, referente a *${mesReferencia}*, venceu no dia *${a.vencimento}*.\n\n• *Valor:* R$ ${a.valor || valorPadrao}\n\nCaso já tenha realizado o pagamento, por favor, desconsidere esta mensagem ou nos envie o comprovante para darmos a baixa no sistema. \n\nTenha um excelente dia! ✨`;
              window.open(`https://wa.me/55${a.whatsapp?.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
            }}
            onDesfazer={async (idAlunoSelecionado) => {
              if (userEmail !== 'carlamonaliza9@gmail.com') return alert("Apenas a Carla Monaliza pode desfazer registros salvos.");
              if (prompt("Digite a Senha Mestra para confirmar:") !== SENHA_MESTRA) return alert("Senha incorreta.");
              
              const alunoObj = alunosFiltrados.find(a => a.id === idAlunoSelecionado);
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
        historicoGeral={historicoAlunoSelecionado}
      />
    </div>
  );
}