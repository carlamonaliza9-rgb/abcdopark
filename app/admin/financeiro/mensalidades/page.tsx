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
  const [pagamentosMetodos, setPagamentosMetodos] = useState({ pix: "", dinheiro: "", credito: "", debito: "", boleto: "", multa: "", desconto: "", acordo_qtd_parcelas: "", acordo_valor_parcela: "", acordo_data_vencimento: "" });
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

      if (!ehAutorizado) {
        return router.push("/dashboard");
      }
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

      const { data: { user } } = await supabase.auth.getUser();
      const { data: listaAlunos } = await supabase.from('alunos').select('*');
      
      const { data: pgtosAno } = await supabase.from('historico_pagamentos').select('*').gte('data_pagamento', dataInicioAno).lte('data_pagamento', dataFimAno);
      
      const pgtosAnoSeguro = pgtosAno || [];
      setListaReceitasDetalhada(pgtosAnoSeguro);

      const nomeMesReferencia = mesesAno[parseInt(mes) - 1];
      const pgtosDesteMes = pgtosAnoSeguro.filter((p: any) => p.tipo === 'mensalidade' && (p.descricao || '').includes(nomeMesReferencia));

      if (listaAlunos) {
        const idsPagosNestaReferencia = pgtosDesteMes.filter((p: any) => p.status === 'pago').map((p: any) => p.aluno_id);

        const ordenados = listaAlunos.map(aluno => {
          const estaPagoNesseMes = idsPagosNestaReferencia.includes(aluno.id);
          if (estaPagoNesseMes) return { ...aluno, status: 'pago' };
          return hoje.getDate() > (parseInt(aluno.vencimento) || 1) ? { ...aluno, status: 'atrasado' } : { ...aluno, status: 'pendente' };
        }).sort((a, b) => (a.status === 'pago' ? 1 : 0) - (b.status === 'pago' ? 1 : 0) || (parseInt(a.vencimento) || 0) - (parseInt(b.vencimento) || 0));
        
        setAlunos(ordenados);
      }
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally { setCarregando(false); }
  }

  useEffect(() => { if (!verificandoAcesso) carregarDados(); }, [mesFiltro, valorPadrao, verificandoAcesso]);

  async function confirmarPagamento() {
    // --- LÓGICA 1: GERAÇÃO DE ACORDO EM LOOP ---
    if (tipoPagamento === "acordo") {
      const qtdParcelas = parseInt((pagamentosMetodos as any).acordo_qtd_parcelas || "0");
      const valorParcela = parseFloat((pagamentosMetodos as any).acordo_valor_parcela || "0");
      const dataPrimeiroVencimento = (pagamentosMetodos as any).acordo_data_vencimento || dataPagamento;

      if (qtdParcelas <= 0 || valorParcela <= 0) {
        return alert("Por favor, preencha o número de parcelas e o valor de cada uma para gerar o acordo.");
      }

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
      return alert(`Acordo gerado com sucesso! ${qtdParcelas} parcelas foram adicionadas à Dívida Ativa do aluno.`);
    }

    // --- LÓGICA 2: PAGAMENTO NORMAL COM MULTA E DESCONTO ---
    const somaPaga = Object.values(pagamentosMetodos).reduce((acc, val) => acc + (parseFloat(val as string) || 0), 0);
    const valorMulta = parseFloat(pagamentosMetodos.multa || "0");
    const valorDesconto = parseFloat(pagamentosMetodos.desconto || "0");
    const valorPagoFinal = somaPaga + valorMulta - valorDesconto;

    if (valorPagoFinal <= 0) return alert("Insira um valor.");

    const creditoUtilizado = parseFloat((pagamentosMetodos as any).credito_aluno || 0);
    const saldoDisponivel = parseFloat(alunoSelecionado?.saldo_credito || 0);

    if (creditoUtilizado > saldoDisponivel) {
      return alert(`O aluno possui apenas R$ ${saldoDisponivel.toFixed(2)} de crédito disponível.`);
    }

    const anoFiltro = mesFiltro.split('-')[0];
    const valorEsperadoBase = parseFloat(alunoSelecionado.valor) || valorPadrao;
    const valorEsperadoComMulta = valorEsperadoBase + valorMulta;
    
    let status = "pago";
    let creditoGerado = 0;

    if (valorPagoFinal > valorEsperadoComMulta) {
      status = "pago";
      creditoGerado = valorPagoFinal - valorEsperadoComMulta;
    } else if (valorPagoFinal < valorEsperadoComMulta) {
      status = valorPagoFinal === 0 ? "pendente" : "parcial";
    }

    const descRef = `Mensalidade - ${mesReferencia}/${anoFiltro}`;
    
    const dados = {
      aluno_id: alunoSelecionado.id,
      tipo: tipoPagamento,
      descricao: descricaoOutro || descRef,
      mes_referencia: tipoPagamento === "mensalidade" ? mesReferencia : null,
      valor_total: valorEsperadoComMulta,
      valor_pago: valorPagoFinal > valorEsperadoComMulta ? valorEsperadoComMulta : valorPagoFinal,
      status: status,
      data_pagamento: dataPagamento,
      detalhes_metodos: pagamentosMetodos
    };

    await supabase.from('historico_pagamentos').insert([dados]);
    await supabase.from('alunos').update({ status: status === 'pago' ? 'pago' : 'pendente' }).eq('id', alunoSelecionado.id);
    
    const novoSaldoCredito = saldoDisponivel - creditoUtilizado + creditoGerado;
    if (novoSaldoCredito !== saldoDisponivel) {
      await supabase.from('alunos').update({ saldo_credito: novoSaldoCredito }).eq('id', alunoSelecionado.id);
    }

    setModalPgtoAberto(false);
    carregarDados();
  }

  if (verificandoAcesso || carregando) return <div className="p-10 text-center font-sans text-slate-400 font-medium">Carregando controle de mensalidades...</div>;

  const listaTurmasUnicas = Array.from(new Set(alunos.map(aluno => aluno.turma).filter(Boolean))).sort();

  const alunosFiltrados = alunos.filter(aluno => {
    const correspondeNome = aluno.nome?.toLowerCase().includes(filtroNome.toLowerCase());
    const correspondeTurma = filtroTurma === "" || aluno.turma === filtroTurma;
    return correspondeNome && correspondeTurma;
  });

  const historicoAlunoSelecionado = alunoSelecionado ? listaReceitasDetalhada.filter(h => h.aluno_id === alunoSelecionado.id) : [];

  return (
    <div className="w-full bg-slate-50/50 min-h-screen p-6 md:p-8 font-sans antialiased text-slate-800">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">🏫 Gestão de Mensalidades Regulares</h1>
            <p className="text-xs text-slate-500 mt-0.5">Dar baixas operacionais, estornos e cobranças diretas da ABC DO PARK</p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={filtroTurma}
              onChange={(e) => setFiltroTurma(e.target.value)}
              className="p-3 bg-slate-100 rounded-xl font-bold border-none text-slate-700 outline-none cursor-pointer text-sm w-full md:w-44"
            >
              <option value="">Todas as Turmas</option>
              {listaTurmasUnicas.map(turma => (
                <option key={turma} value={turma}>{turma.toUpperCase()}</option>
              ))}
            </select>

            <input
              type="month"
              value={mesFiltro}
              onChange={(e) => setMesFiltro(e.target.value)}
              className="p-3 bg-slate-100 rounded-xl font-bold border-none text-slate-700 outline-none cursor-pointer text-sm w-full md:w-auto"
            />
          </div>
        </div>

        <TabelaMensalidades
          alunos={alunosFiltrados} filtroNome={filtroNome} setFiltroNome={setFiltroNome}
          onPagamento={(a) => {
            setAlunoSelecionado(a);
            setTipoPagamento("mensalidade");
            setPagamentosMetodos({ pix: (a.valor || valorPadrao).toString(), dinheiro: "", credito: "", debito: "", boleto: "", multa: "", desconto: "", acordo_qtd_parcelas: "", acordo_valor_parcela: "", acordo_data_vencimento: "" });
            setModalPgtoAberto(true);
          }}
          onCobrar={(a) => {
            const msg = `Olá! Passando para lembrar que a mensalidade escolar de *${a.nome}*, referente a *${mesReferencia}*, venceu no dia *${a.vencimento}*.\n\n• *Valor:* R$ ${a.valor || valorPadrao}\n\nCaso já tenha realizado o pagamento, por favor, desconsidere esta mensagem ou nos envie o comprovante para darmos a baixa no sistema. \n\nTenha um excelente dia! ✨`;
            window.open(`https://wa.me/55${a.whatsapp?.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
          }}
          onDesfazer={async (id) => {
            if (userEmail !== 'carlamonaliza9@gmail.com') return alert("Apenas a Carla Monaliza pode desfazer registros salvos.");
            if (prompt("Digite a Senha Mestra para confirmar:") !== SENHA_MESTRA) return alert("Senha incorreta.");
            if(confirm("Desfazer mensalidade? O registro sumirá da ficha do aluno e retornará para pendente.")) {
              const [ano, mes] = mesFiltro.split('-');
              const nomeMesRef = mesesAno[parseInt(mes) - 1];
              await supabase.from('alunos').update({ status: 'pendente' }).eq('id', id);
              await supabase.from('historico_pagamentos').delete().eq('aluno_id', id).eq('tipo', 'mensalidade').like('descricao', `%${nomeMesRef}%${ano}%`);
              carregarDados();
            }
          }}
        />

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