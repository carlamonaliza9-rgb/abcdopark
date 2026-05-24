"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

// Importação dos Componentes e Modais da pasta original
import { TabelaMensalidades } from "@/app/dashboard/financeiro/_components/TabelaMensalidades";
import { ModalPagamento } from "@/app/dashboard/financeiro/_components/ModalPagamento";

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

  // --- ESTADOS DE CONTROLE DE MODAL ---
  const [modalPgtoAberto, setModalPgtoAberto] = useState(false);
  const [alunoSelecionado, setAlunoSelecionado] = useState<any>(null);

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

      // NOVIDADE: Capta mensalidades E acordos que vencem neste mês exato
      const nomeMesReferencia = mesesAno[parseInt(mes) - 1];
      const dataInicioMes = `${ano}-${mes}-01`;
      const dataFimMes = `${ano}-${mes}-31`;

      const pgtosDesteMes = pgtosAnoSeguro.filter((p: any) => {
        const ehMensalidade = p.tipo === 'mensalidade' && (p.descricao || '').includes(nomeMesReferencia);
        const ehAcordoNesteMes = p.tipo === 'acordo' && p.data_pagamento >= dataInicioMes && p.data_pagamento <= dataFimMes;
        return ehMensalidade || ehAcordoNesteMes;
      });

      if (listaAlunos) {
        const idsPagosNestaReferencia = pgtosDesteMes.filter((p: any) => p.status === 'pago').map((p: any) => p.aluno_id);
        const idsComPendenciaRef = pgtosDesteMes.filter((p: any) => p.status !== 'pago').map((p: any) => p.aluno_id);

        const ordenados = listaAlunos.map(aluno => {
          // Se tiver um acordo pendente ou mensalidade parcial, mantém como pendente/atrasado
          if (idsComPendenciaRef.includes(aluno.id)) {
            return { ...aluno, status: hoje.getDate() > (parseInt(aluno.vencimento) || 1) ? 'atrasado' : 'pendente' };
          }
          if (idsPagosNestaReferencia.includes(aluno.id)) return { ...aluno, status: 'pago' };

          return hoje.getDate() > (parseInt(aluno.vencimento) || 1) ? { ...aluno, status: 'atrasado' } : { ...aluno, status: 'pendente' };
        }).sort((a, b) => (a.status === 'pago' ? 1 : 0) - (b.status === 'pago' ? 1 : 0) || (parseInt(a.vencimento) || 0) - (parseInt(b.vencimento) || 0));
        
        setAlunos(ordenados);
      }
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally { setCarregando(false); }
  }

  useEffect(() => { if (!verificandoAcesso) carregarDados(); }, [mesFiltro, valorPadrao, verificandoAcesso]);

  // ================= LÓGICA DE MULTA, PARCELAMENTO E ACORDOS (ERP PADRÃO) =================
  async function confirmarPagamento() {
    
    // --- LÓGICA 1: GERAÇÃO DE ACORDO EM LOOP ---
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

    // --- LÓGICA 2: RECEBIMENTO DE VALOR CORRIGIDO ---
    const valoresRecebidos = [ pagamentosMetodos.pix, pagamentosMetodos.dinheiro, pagamentosMetodos.credito, pagamentosMetodos.debito, pagamentosMetodos.boleto ];
    const somaPaga = valoresRecebidos.reduce((acc, val) => acc + (parseFloat(val as string) || 0), 0);
    
    const valorMulta = parseFloat(pagamentosMetodos.multa || "0");
    const valorDesconto = parseFloat(pagamentosMetodos.desconto || "0");
    const creditoUtilizado = parseFloat(pagamentosMetodos.credito_aluno || "0");
    
    const valorPagoFinal = somaPaga + creditoUtilizado; 

    if (valorPagoFinal <= 0 && valorDesconto === 0) return alert("Insira um valor.");

    const saldoDisponivel = parseFloat(alunoSelecionado?.saldo_credito || 0);
    if (creditoUtilizado > saldoDisponivel) return alert(`Saldo de crédito insuficiente (R$ ${saldoDisponivel.toFixed(2)}).`);

    const valorEsperadoBase = parseFloat(alunoSelecionado.valor) || valorPadrao;
    const dividaReal = Math.max(0, (valorEsperadoBase + valorMulta) - valorDesconto);
    
    let status = "pago";
    let creditoGerado = 0;

    if (valorPagoFinal > dividaReal) {
      status = "pago";
      creditoGerado = valorPagoFinal - dividaReal; 
    } else if (valorPagoFinal < dividaReal) {
      status = valorPagoFinal === 0 ? "pendente" : "parcial";
    }

    const descRef = `Mensalidade - ${mesReferencia}/${mesFiltro.split('-')[0]}`;
    const [anoRef, mesRef] = mesFiltro.split('-');
    
    // NOVIDADE: Verifica se o aluno tem uma parcela de acordo vencendo neste mês filtrado
    const acordoPendenteDesteMes = listaReceitasDetalhada.find(h => 
      h.aluno_id === alunoSelecionado.id && 
      h.tipo === 'acordo' && 
      h.status !== 'pago' &&
      h.data_pagamento >= `${anoRef}-${mesRef}-01` &&
      h.data_pagamento <= `${anoRef}-${mesRef}-31`
    );

    const dadosPadrao = {
      aluno_id: alunoSelecionado.id,
      tipo: tipoPagamento,
      descricao: descricaoOutro || descRef,
      mes_referencia: tipoPagamento === "mensalidade" ? mesReferencia : null,
      valor_total: dividaReal,
      valor_pago: valorPagoFinal > dividaReal ? dividaReal : valorPagoFinal,
      status: status,
      data_pagamento: dataPagamento,
      detalhes_metodos: pagamentosMetodos
    };

    if (acordoPendenteDesteMes) {
      // Se houver acordo para este mês, ATUALIZA a parcela do acordo em vez de gerar mensalidade duplicada
      await supabase.from('historico_pagamentos').update({
        valor_pago: valorPagoFinal > dividaReal ? dividaReal : valorPagoFinal,
        status: status,
        data_pagamento: dataPagamento,
        detalhes_metodos: pagamentosMetodos
      }).eq('id', acordoPendenteDesteMes.id);
    } else {
      // Comportamento normal: insere a mensalidade
      await supabase.from('historico_pagamentos').insert([dadosPadrao]);
    }
    
    await supabase.from('alunos').update({ status: status === 'pago' ? 'pago' : 'pendente' }).eq('id', alunoSelecionado.id);
    
    if (creditoGerado > 0 || creditoUtilizado > 0) {
      const novoSaldoCredito = saldoDisponivel - creditoUtilizado + creditoGerado;
      await supabase.from('alunos').update({ saldo_credito: novoSaldoCredito }).eq('id', alunoSelecionado.id);
    }

    // 3. Geração de Previsões da Maquininha
    const valorCreditoEscola = parseFloat(pagamentosMetodos.credito) || 0;
    const parcelas = parseInt(pagamentosMetodos.parcelas) || 1;

    if (valorCreditoEscola > 0 && parcelas > 1 && status === "pago") {
      const valorPorParcela = parseFloat((valorCreditoEscola / parcelas).toFixed(2));
      const previsoes = [];

      for (let i = 1; i <= parcelas; i++) {
        const dataVencimento = new Date(dataPagamento);
        dataVencimento.setMonth(dataVencimento.getMonth() + i);

        previsoes.push({
          aluno_id: alunoSelecionado.id,
          tipo: 'previsao_cartao',
          descricao: `Previsão Cartão (${i}/${parcelas}) - ${descRef}`,
          valor_total: valorPorParcela,
          valor_pago: 0,
          status: 'pendente',
          data_pagamento: dataVencimento.toISOString().split('T')[0],
          detalhes_metodos: {}
        });
      }
      await supabase.from('historico_pagamentos').insert(previsoes);
    }

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

  return (
    <div className="w-full bg-slate-50 min-h-screen p-4 md:p-8 font-sans antialiased text-slate-800 pb-24 md:pb-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Reestilizado */}
        <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tighter italic">🏫 Mensalidades & Acordos</h1>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Gestão de Recebimentos e Baixas Operacionais</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <select
              value={filtroTurma}
              onChange={(e) => setFiltroTurma(e.target.value)}
              className="w-full sm:w-auto px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-indigo-400 transition-colors text-xs uppercase tracking-wider"
            >
              <option value="">Todas as Turmas</option>
              {listaTurmasUnicas.map(turma => (
                <option key={turma} value={turma as string}>{(turma as string).toUpperCase()}</option>
              ))}
            </select>

            <input
              type="month"
              value={mesFiltro}
              onChange={(e) => setMesFiltro(e.target.value)}
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
              setTipoPagamento("mensalidade");
              setPagamentosMetodos({ 
                pix: (a.valor || valorPadrao).toString(), dinheiro: "", credito: "", debito: "", boleto: "", 
                multa: "", desconto: "", parcelas: "1", credito_aluno: "",
                acordo_qtd_parcelas: "", acordo_valor_parcela: "", acordo_data_vencimento: "" 
              });
              setModalPgtoAberto(true);
            }}
            onCobrar={(a) => {
              const msg = `Olá! Passando para lembrar que a obrigação financeira de *${a.nome}*, referente a *${mesReferencia}*, venceu no dia *${a.vencimento}*.\n\n• *Valor:* R$ ${a.valor || valorPadrao}\n\nCaso já tenha realizado o pagamento, por favor, desconsidere esta mensagem ou nos envie o comprovante para darmos a baixa no sistema. \n\nTenha um excelente dia! ✨`;
              window.open(`https://wa.me/55${a.whatsapp?.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
            }}
            onDesfazer={async (id) => {
              if (userEmail !== 'carlamonaliza9@gmail.com') return alert("Apenas a Carla Monaliza pode desfazer registros salvos.");
              if (prompt("Digite a Senha Mestra para confirmar:") !== SENHA_MESTRA) return alert("Senha incorreta.");
              if(confirm("Desfazer recebimento? O registro sumirá do fechamento do dia.")) {
                const [ano, mes] = mesFiltro.split('-');
                const nomeMesRef = mesesAno[parseInt(mes) - 1];
                await supabase.from('alunos').update({ status: 'pendente' }).eq('id', id);
                await supabase.from('historico_pagamentos').delete().eq('aluno_id', id).eq('tipo', 'mensalidade').like('descricao', `%${nomeMesRef}%${ano}%`);
                carregarDados();
              }
            }}
          />
        </div>

      </div>

      <ModalPagamento
        aberto={modalPgtoAberto} onFechar={() => setModalPgtoAberto(false)}
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