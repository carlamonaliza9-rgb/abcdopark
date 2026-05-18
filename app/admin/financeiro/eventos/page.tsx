"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

// Importação dos Componentes e Modais da pasta original do projeto
import { GestaoEventos } from "@/app/dashboard/financeiro/_components/GestaoEventos";
import { ModalPagamento } from "@/app/dashboard/financeiro/_components/ModalPagamento";
import { ModalEvento } from "@/app/dashboard/financeiro/_components/ModalEvento";

export default function EventosFinanceiroPage() {
  const router = useRouter();
  const [verificandoAcesso, setVerificandoAcesso] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userCargo, setUserCargo] = useState<string | null>(null);

  // --- ESTADOS DE DADOS ---
  const [alunos, setAlunos] = useState<any[]>([]);
  const [eventosAtivos, setEventosAtivos] = useState<any[]>([]);
  const [historicoPagamentosEventos, setHistoricoPagamentosEventos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  // --- ESTADOS DE CONTROLE DE MODAIS ---
  const [modalPgtoAberto, setModalPgtoAberto] = useState(false);
  const [modalEventoAberto, setModalEventoAberto] = useState(false);

  // --- ESTADOS DE FORMULÁRIOS ---
  const [alunoSelecionado, setAlunoSelecionado] = useState<any>(null);
  const [eventoParaGerenciar, setEventoParaGerenciar] = useState<any>(null);
  const [idEventoEdicao, setIdEventoEdicao] = useState<string | null>(null);
  const [idPagamentoEdicao, setIdPagamentoEdicao] = useState<string | null>(null);
  const [nomeEvento, setNomeEvento] = useState("");
  const [valorEvento, setValorEvento] = useState("");
  const [alunosSelecionados, setAlunosSelecionados] = useState<string[]>([]);

  // --- ESTADOS AUXILIARES EXIGIDOS PELO MODAL DE RECEBIMENTO ---
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().split('T')[0]); 
  const [tipoPagamento, setTipoPagamento] = useState("evento");
  const [descricaoOutro, setDescricaoOutro] = useState("");
  const [pagamentosMetodos, setPagamentosMetodos] = useState({ pix: "", dinheiro: "", credito: "", debito: "", multa: "" });
  const [mesReferencia, setMesReferencia] = useState(["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"][new Date().getMonth()]);

  const SENHA_MESTRA = "1234";
  const mesesAno = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  // --- TRAVA DE SEGURANÇA ---
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

  // --- FUNÇÃO DE CARREGAMENTO COM ORDENAÇÃO PEDAGÓGICA SEQUENCIAL ---
  async function carregarDados() {
    setCarregando(true);
    try {
      const { data: listaAlunos } = await supabase.from('alunos').select('*');
      if (listaAlunos) {
        
        // Definição exata da ordem cronológica das etapas escolares da ABC DO PARK
        const ordemHierarquicaTurmas = [
          "maternal",
          "jardim", "jardim i", "jardim ii", "jardim 1", "jardim 2",
          "1º ano", "2º ano", "3º ano", "4º ano", "5º ano"
        ];

        const obterPesoPedagogico = (turmaNome: string) => {
          const nomeMinusculo = (turmaNome || "").toLowerCase().trim();
          // Procura se o nome da turma contém palavras-chave como 'maternal' ou 'jardim'
          const index = ordemHierarquicaTurmas.findIndex(t => nomeMinusculo.includes(t));
          return index === -1 ? 999 : index; // Se for uma turma nova não mapeada, joga para o fim
        };

        const ordenados = [...listaAlunos].sort((a, b) => {
          const pesoA = obterPesoPedagogico(a.turma);
          const pesoB = obterPesoPedagogico(b.turma);

          // 1º Critério: Ordem da hierarquia pedagógica (Maternal vem antes de Jardim)
          if (pesoA !== pesoB) return pesoA - pesoB;

          // 2º Critério: Desempate de turmas paralelas (ex: "Maternal A" vs "Maternal B")
          const compTurmaString = (a.turma || "").localeCompare(b.turma || "", "pt-BR");
          if (compTurmaString !== 0) return compTurmaString;

          // 3º Critério: Ordem Alfabética estrita do nome dos alunos
          return (a.nome || "").localeCompare(b.nome || "", "pt-BR");
        });

        setAlunos(ordenados);
      }

      const { data: todosPgtosEventos } = await supabase.from('historico_pagamentos').select('*').eq('tipo', 'evento');
      if (todosPgtosEventos) setHistoricoPagamentosEventos(todosPgtosEventos);

      const { data: listaEventos } = await supabase.from('eventos_controle').select('*').eq('arquivado', false);
      if (listaEventos) setEventosAtivos(listaEventos);
    } catch (err) {
      console.error("Erro ao carregar dados de eventos:", err);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { 
    if (!verificandoAcesso) carregarDados(); 
  }, [verificandoAcesso]);

  // --- COMPORTAMENTO DA CONTA CORRENTE APLICADO AOS PROJETOS/EVENTOS ---
  async function confirmarPagamento() {
    if (idPagamentoEdicao && userEmail !== 'carlamonaliza9@gmail.com' && userCargo !== 'Admin') {
      return alert("A direção não possui permissão para alterar ou editar lançamentos salvos.");
    }

    const somaPaga = Object.values(pagamentosMetodos).reduce((acc, val) => acc + (parseFloat(val as string) || 0), 0);
    if (somaPaga <= 0) return alert("Insira um valor.");

    const creditoUtilizado = parseFloat((pagamentosMetodos as any).credito || 0);
    const saldoDisponivel = parseFloat(alunoSelecionado?.saldo_credito || 0);

    if (creditoUtilizado > saldoDisponivel) {
      return alert("Crédito selecionado maior do que o saldo disponível do aluno.");
    }

    const valorEsperado = parseFloat(eventoParaGerenciar?.valor_unitario) || 0;

    let status = "pago";
    let valorPagoFinal = somaPaga;
    let creditoGerado = 0;

    if (valorEsperado > 0) {
      if (somaPaga > valorEsperado) {
        status = "pago";
        valorPagoFinal = valorEsperado;
        creditoGerado = somaPaga - valorEsperado; 
      } else if (somaPaga < valorEsperado) {
        status = somaPaga === 0 ? "pendente" : "parcial";
      }
    }

    const dados = { 
      aluno_id: alunoSelecionado.id, 
      tipo: "evento", 
      descricao: descricaoOutro || `Evento: ${eventoParaGerenciar?.nome}`, 
      valor_total: valorEsperado > 0 ? valorEsperado : somaPaga, 
      valor_pago: valorPagoFinal,
      status: status,
      data_pagamento: dataPagamento, 
      detalhes_metodos: pagamentosMetodos 
    };

    if (idPagamentoEdicao) {
      await supabase.from('historico_pagamentos').update(dados).eq('id', idPagamentoEdicao);
    } else {
      await supabase.from('historico_pagamentos').insert([dados]);
    }

    const novoSaldoCredito = saldoDisponivel - creditoUtilizado + creditoGerado;
    if (novoSaldoCredito !== saldoDisponivel) {
      await supabase.from('alunos').update({ saldo_credito: novoSaldoCredito }).eq('id', alunoSelecionado.id);
    }

    setModalPgtoAberto(false); 
    carregarDados();
  }

  // --- ESTRUTURAÇÃO DE REQUISITOS DE PROJETOS ---
  async function salvarEvento() {
    if (userEmail !== 'carlamonaliza9@gmail.com' && userCargo !== 'Admin') {
      return alert("A direção não possui permissão para estruturar ou alterar eventos.");
    }

    if (!nomeEvento || !valorEvento || (!idEventoEdicao && alunosSelecionados.length === 0)) return alert("Preencha todos os campos.");
    const dados = { 
      nome: nomeEvento, 
      valor_unitario: parseFloat(valorEvento), 
      total_alunos: idEventoEdicao ? eventosAtivos.find(e => e.id === idEventoEdicao)?.total_alunos : alunosSelecionados.length, 
      participantes: idEventoEdicao ? eventosAtivos.find(e => e.id === idEventoEdicao)?.participantes : alunosSelecionados, 
      arquivado: false 
    };

    if (idEventoEdicao) await supabase.from('eventos_controle').update(dados).eq('id', idEventoEdicao);
    else await supabase.from('eventos_controle').insert([dados]);
    
    setModalEventoAberto(false); 
    carregarDados();
  }

  async function handleExcluirReceita(id: string) {
    if (userEmail !== 'carlamonaliza9@gmail.com') return alert("Apenas a Carla pode excluir.");
    if (prompt("Senha Mestra para EXCLUIR RECEITA:") === SENHA_MESTRA) {
      if(confirm("Confirmar a exclusão deste pagamento associado ao evento?")) {
        await supabase.from('historico_pagamentos').delete().eq('id', id);
        carregarDados();
      }
    } else { alert("Senha incorreta."); }
  }

  if (verificandoAcesso || carregando) return <div className="p-10 text-center">Carregando painel de eventos pedagógicos...</div>;

  return (
    <div className="w-full bg-gray-50 min-h-screen">
      <div className="mb-6 flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🎟️ Controle Financeiro de Eventos</h1>
          <p className="text-sm text-gray-500 mt-1">Gerencie a arrecadação de gincanas, excursões e festividades da Escola ABC do Park</p>
        </div>
        <div>
          <button
            onClick={() => {
              if (userEmail !== 'carlamonaliza9@gmail.com' && userCargo !== 'Admin') return alert("Ação restrita ao perfil de Administrador.");
              setIdEventoEdicao(null); setNomeEvento(""); setValorEvento(""); setAlunosSelecionados([]); setModalEventoAberto(true);
            }}
            className="p-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition-all"
          >
            + Estruturar Novo Evento
          </button>
        </div>
      </div>

      <GestaoEventos 
        eventosAtivos={eventosAtivos} eventoParaGerenciar={eventoParaGerenciar} setEventoParaGerenciar={setEventoParaGerenciar}
        alunos={alunos} historicoPagamentosEventos={historicoPagamentosEventos}
        onEditarEvento={(ev) => {
          if (userEmail !== 'carlamonaliza9@gmail.com' && userCargo !== 'Admin') return alert("Ação restrita ao perfil de Administrador.");
          setIdEventoEdicao(ev.id); setNomeEvento(ev.nome); setValorEvento(ev.valor_unitario.toString()); setModalEventoAberto(true);
        }}
        onExcluirEvento={async (id) => { 
          if (userEmail !== 'carlamonaliza9@gmail.com') return alert("Apenas a Carla Monaliza pode excluir eventos.");
          if (prompt("Digite a Senha Mestra:") === SENHA_MESTRA) {
            if(confirm("Excluir evento e todos os pagamentos registrados para ele?")) { 
              const evento = eventosAtivos.find((e: any) => e.id === id);
              if (evento) await supabase.from('historico_pagamentos').delete().eq('tipo', 'evento').like('descricao', `%${evento.nome}%`);
              await supabase.from('eventos_controle').delete().eq('id', id); 
              carregarDados(); 
            }
          } else { alert("Senha incorreta."); }
        }}
        onGerarPDF={() => {}} 
        onAtualizarParticipante={async (alunoId, part) => {
          if (userEmail !== 'carlamonaliza9@gmail.com' && userCargo !== 'Admin') return alert("Ação restrita ao perfil de Administrador.");
          const novos = part ? [...(eventoParaGerenciar.participantes || []), alunoId] : (eventoParaGerenciar.participantes || []).filter((id: string) => id !== alunoId);
          await supabase.from('eventos_controle').update({ participantes: novos, total_alunos: novos.length }).eq('id', eventoParaGerenciar.id);
          setEventoParaGerenciar({ ...eventoParaGerenciar, participantes: novos, total_alunos: novos.length });
          carregarDados();
        }}
        onAbrirPagamento={(aluno, ev, pgto) => {
          if (pgto && (userEmail !== 'carlamonaliza9@gmail.com' || prompt("Senha Mestra para Editar:") !== SENHA_MESTRA)) return alert("Acesso negado.");
          setAlunoSelecionado(aluno); setEventoParaGerenciar(ev); setTipoPagamento("evento");
          if (pgto) { 
            setIdPagamentoEdicao(pgto.id); 
            setPagamentosMetodos(pgto.detalhes_metodos); 
            setDescricaoOutro(pgto.descricao); 
          } else { 
            setIdPagamentoEdicao(null); 
            setPagamentosMetodos({ pix: ev.valor_unitario.toString(), dinheiro: "", credito: "", debito: "", multa: "" }); 
            setDescricaoOutro(`Evento: ${ev.nome}`); 
          }
          setModalPgtoAberto(true);
        }}
        onExcluirPagamento={handleExcluirReceita}
      />

      <ModalPagamento 
        aberto={modalPgtoAberto} onFechar={() => setModalPgtoAberto(false)}
        aluno={alunoSelecionado} dataPagamento={dataPagamento} setDataPagamento={setDataPagamento}
        tipoPagamento={tipoPagamento} setTipoPagamento={setTipoPagamento}
        mesReferencia={mesReferencia} setMesReferencia={setMesReferencia} mesesAno={mesesAno}
        descricaoOutro={descricaoOutro} setDescricaoOutro={setDescricaoOutro}
        pagamentosMetodos={pagamentosMetodos} setPagamentosMetodos={setPagamentosMetodos}
        onConfirmar={confirmarPagamento} editando={!!idPagamentoEdicao}
      />

      <ModalEvento 
        aberto={modalEventoAberto} onFechar={() => setModalEventoAberto(false)}
        idEventoEdicao={idEventoEdicao} nomeEvento={nomeEvento} setNomeEvento={setNomeEvento}
        valorEvento={valorEvento} setValorEvento={setValorEvento}
        alunos={alunos} alunosSelecionados={alunosSelecionados}
        toggleAlunoSelecao={(id) => setAlunosSelecionados(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id])}
        toggleSelecionarTodos={() => setAlunosSelecionados(alunosSelecionados.length === alunos.length ? [] : alunos.map(a => a.id))}
        onSalvar={salvarEvento}
      />
    </div>
  );
}