"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

// Importação dos Componentes de Interface
import { FinanceiroHeader } from "./_components/FinanceiroHeader";
import { MetricasCard } from "./_components/MetricasCard";
import { TabelaMensalidades } from "./_components/TabelaMensalidades";
import { BalancoResumo } from "./_components/BalancoResumo";
import { GestaoEventos } from "./_components/GestaoEventos";

// Importação dos Componentes de Modais
import { ModalPagamento } from "./_components/ModalPagamento";
import { ModalGasto } from "./_components/ModalGasto";
import { ModalEvento } from "./_components/ModalEvento";
import { ModalListaGastos } from "./_components/ModalListaGastos";

export default function FinanceiroPage() {
  // --- ESTADOS DE CONFIGURAÇÃO E DADOS ---
  const [valorPadrao, setValorPadrao] = useState(550);
  const [editandoValor, setEditandoValor] = useState(false);
  const [mesFiltro, setMesFiltro] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
  const [filtroNome, setFiltroNome] = useState(""); 
  const [alunos, setAlunos] = useState<any[]>([]);
  const [eventosAtivos, setEventosAtivos] = useState<any[]>([]);
  const [metricas, setMetricas] = useState({ total: 0, pago: 0, pendente: 0, descontos: 0, gastos: 0, lucro: 0 });
  const [resumoMetodos, setResumoMetodos] = useState({ pix: 0, dinheiro: 0, credito: 0, debito: 0 });
  const [carregando, setCarregando] = useState(true);

  // --- ESTADOS DE CONTROLE DE MODAIS ---
  const [modalPgtoAberto, setModalPgtoAberto] = useState(false);
  const [modalGastoAberto, setModalGastoAberto] = useState(false);
  const [modalListaGastosAberto, setModalListaGastosAberto] = useState(false); 
  const [modalEventoAberto, setModalEventoAberto] = useState(false);
  
  // --- ESTADOS DE FORMULÁRIOS ---
  const [listaGastosDetalhada, setListaGastosDetalhada] = useState<any[]>([]); 
  const [alunoSelecionado, setAlunoSelecionado] = useState<any>(null);
  const [descGasto, setDescGasto] = useState("");
  const [valorGasto, setValorGasto] = useState("");
  const [dataGasto, setDataGasto] = useState(new Date().toISOString().split('T')[0]); 
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().split('T')[0]); 
  const [tipoPagamento, setTipoPagamento] = useState("mensalidade");
  const [descricaoOutro, setDescricaoOutro] = useState("");
  const [pagamentosMetodos, setPagamentosMetodos] = useState({ pix: "", dinheiro: "", credito: "", debito: "", multa: "" });
  const [mesReferencia, setMesReferencia] = useState(["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"][new Date().getMonth()]);
  const [idEventoEdicao, setIdEventoEdicao] = useState<string | null>(null);
  const [idPagamentoEdicao, setIdPagamentoEdicao] = useState<string | null>(null);
  const [nomeEvento, setNomeEvento] = useState("");
  const [valorEvento, setValorEvento] = useState("");
  const [alunosSelecionados, setAlunosSelecionados] = useState<string[]>([]);
  const [eventoParaGerenciar, setEventoParaGerenciar] = useState<any>(null);
  const [historicoPagamentosEventos, setHistoricoPagamentosEventos] = useState<any[]>([]);

  const SENHA_MESTRA = "1234";
  const mesesAno = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  // --- BUSCA DE DADOS ---
  async function carregarDados() {
    setCarregando(true);
    try {
      const hoje = new Date();
      const [ano, mes] = mesFiltro.split('-');
      const dataInicio = `${ano}-${mes}-01`;
      const dataFim = `${ano}-${mes}-31`;

      const { data: listaAlunos } = await supabase.from('alunos').select('*');
      const { data: pgtosMes } = await supabase.from('historico_pagamentos').select('*').gte('data_pagamento', dataInicio).lte('data_pagamento', dataFim);
      const { data: gastosMes } = await supabase.from('gastos').select('*').gte('data_gasto', dataInicio).lte('data_gasto', dataFim);
      
      const { data: todosPgtosEventos } = await supabase.from('historico_pagamentos').select('*').eq('tipo', 'evento');
      if (todosPgtosEventos) setHistoricoPagamentosEventos(todosPgtosEventos);

      const { data: listaEventos } = await supabase.from('eventos_controle').select('*').eq('arquivado', false);
      if (listaEventos) setEventosAtivos(listaEventos);

      setListaGastosDetalhada(gastosMes || []);

      let vPago = 0; let vGastos = 0;
      let metodosResumo = { pix: 0, dinheiro: 0, credito: 0, debito: 0 };

      if (pgtosMes) {
        vPago = pgtosMes.reduce((acc, curr) => acc + (curr.valor_total || 0), 0);
        metodosResumo = pgtosMes.reduce((acc, curr) => {
          const det = curr.detalhes_metodos || {};
          acc.pix += parseFloat(det.pix || 0);
          acc.dinheiro += parseFloat(det.dinheiro || 0);
          acc.credito += parseFloat(det.credito || 0);
          acc.debito += parseFloat(det.debito || 0);
          return acc;
        }, { pix: 0, dinheiro: 0, credito: 0, debito: 0 });
      }
      setResumoMetodos(metodosResumo);
      if (gastosMes) vGastos = gastosMes.reduce((acc, curr) => acc + parseFloat(curr.valor || 0), 0);

      if (listaAlunos) {
        const ordenados = listaAlunos.map(aluno => {
          if (aluno.status === 'pago') return aluno;
          return hoje.getDate() > (parseInt(aluno.vencimento) || 1) ? { ...aluno, status: 'atrasado' } : { ...aluno, status: 'pendente' };
        }).sort((a, b) => (a.status === 'pago' ? 1 : 0) - (b.status === 'pago' ? 1 : 0) || (parseInt(a.vencimento) || 0) - (parseInt(b.vencimento) || 0));
        
        setAlunos(ordenados);
        const totalPrevisto = listaAlunos.reduce((acc, curr) => acc + (curr.valor || 0), 0);
        const totalDescontos = listaAlunos.reduce((acc, curr) => acc + Math.max(0, valorPadrao - (curr.valor || 0)), 0);
        setMetricas({ total: totalPrevisto, pago: vPago, pendente: Math.max(0, totalPrevisto - vPago), descontos: totalDescontos, gastos: vGastos, lucro: vPago - vGastos });
      }
    } finally { setCarregando(false); }
  }

  useEffect(() => { carregarDados(); }, [mesFiltro, valorPadrao]);

  // --- LÓGICA DE NEGÓCIO ---
  const alunosFiltrados = alunos.filter(aluno => aluno.nome.toLowerCase().includes(filtroNome.toLowerCase()));

  async function confirmarPagamento() {
    const somaPaga = Object.values(pagamentosMetodos).reduce((acc, val) => acc + (parseFloat(val as string) || 0), 0);
    if (somaPaga <= 0) return alert("Insira um valor.");
    const dados = { aluno_id: alunoSelecionado.id, tipo: tipoPagamento, descricao: descricaoOutro || (tipoPagamento === 'mensalidade' ? `Mensalidade - ${mesReferencia}` : `Evento: ${eventoParaGerenciar?.nome}`), valor_total: somaPaga, data_pagamento: dataPagamento, detalhes_metodos: pagamentosMetodos };
    if (idPagamentoEdicao) await supabase.from('historico_pagamentos').update(dados).eq('id', idPagamentoEdicao);
    else await supabase.from('historico_pagamentos').insert([dados]);
    if (tipoPagamento === "mensalidade") await supabase.from('alunos').update({ status: 'pago' }).eq('id', alunoSelecionado.id);
    setModalPgtoAberto(false); carregarDados();
  }

  async function salvarEvento() {
    if (!nomeEvento || !valorEvento || (!idEventoEdicao && alunosSelecionados.length === 0)) return alert("Preencha tudo.");
    const dados = { nome: nomeEvento, valor_unitario: parseFloat(valorEvento), total_alunos: idEventoEdicao ? eventosAtivos.find(e => e.id === idEventoEdicao)?.total_alunos : alunosSelecionados.length, participantes: idEventoEdicao ? eventosAtivos.find(e => e.id === idEventoEdicao)?.participantes : alunosSelecionados, arquivado: false };
    if (idEventoEdicao) await supabase.from('eventos_controle').update(dados).eq('id', idEventoEdicao);
    else await supabase.from('eventos_controle').insert([dados]);
    setModalEventoAberto(false); carregarDados();
  }

  async function adicionarGasto() {
    await supabase.from('gastos').insert([{ descricao: descGasto, valor: parseFloat(valorGasto), data_gasto: dataGasto }]);
    setModalGastoAberto(false); setDescGasto(""); setValorGasto(""); carregarDados();
  }

  function cobrarWhatsApp(aluno: any) {
    const formatado = aluno.nome.split(' ')[0];
    const msg = `Olá! Bom dia. Passando para lembrar da mensalidade de *${formatado}*, com vencimento ${aluno.vencimento}/${mesFiltro.split('-')[1]} no valor de ${aluno.valor?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}. Caso já tenha sido pago, por favor envie o comprovante ou desconsidere.`;
    window.open(`https://wa.me/55${aluno.whatsapp?.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
  }

  async function zerarMes() {
    if (prompt("Senha:") === SENHA_MESTRA && confirm("Resetar dados do mês?")) {
      const [ano, mes] = mesFiltro.split('-');
      await supabase.from('alunos').update({ status: 'pendente' }).not('id', 'is', null);
      await supabase.from('historico_pagamentos').delete().gte('data_pagamento', `${ano}-${mes}-01`).lte('data_pagamento', `${ano}-${mes}-31`);
      await supabase.from('gastos').delete().gte('data_gasto', `${ano}-${mes}-01`).lte('data_gasto', `${ano}-${mes}-31`);
      carregarDados();
    }
  }

  function gerarPDFEvento() {
    if (!eventoParaGerenciar) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return alert("Permita pop-ups.");
    const conteudoTabela = alunos
      .filter(aluno => eventoParaGerenciar.participantes?.includes(aluno.id))
      .map(aluno => {
        const pgto = historicoPagamentosEventos.find(p => p.aluno_id === aluno.id && p.descricao.includes(eventoParaGerenciar.nome));
        const data = pgto ? new Date(pgto.data_pagamento).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : 'PENDENTE';
        const metodo = pgto && pgto.detalhes_metodos ? Object.keys(pgto.detalhes_metodos).find(k => parseFloat(pgto.detalhes_metodos[k]) > 0) || 'Não inf.' : '-';
        return `<tr><td style="padding: 10px; border-bottom: 1px solid #eee;">${aluno.nome}</td><td style="text-align:center;">${data}</td><td style="text-align:center; text-transform:uppercase;">${metodo}</td><td style="text-align:right;">R$ ${pgto ? pgto.valor_total.toLocaleString('pt-BR') : '-'}</td></tr>`;
      }).join('');
    printWindow.document.write(`<html><body style="font-family:sans-serif; padding:40px;"><h1>Lista: ${eventoParaGerenciar.nome}</h1><table style="width:100%; border-collapse:collapse;"><thead><tr style="background:#f8fafc;"><th>Aluno</th><th>Data</th><th>Forma</th><th>Valor</th></tr></thead><tbody>${conteudoTabela}</tbody></table></body></html>`);
    printWindow.document.close();
    printWindow.print();
  }

  if (carregando) return <div style={{ padding: '40px', textAlign: 'center' }}>Carregando dados financeiros...</div>;

  return (
    <div style={{ width: '100%', padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
      
      <FinanceiroHeader 
        mesFiltro={mesFiltro} setMesFiltro={setMesFiltro}
        onNovoEvento={() => { setIdEventoEdicao(null); setNomeEvento(""); setValorEvento(""); setAlunosSelecionados([]); setModalEventoAberto(true); }}
        onRegistrarGasto={() => setModalGastoAberto(true)}
        onZerarMes={zerarMes}
        valorPadrao={valorPadrao} setValorPadrao={setValorPadrao}
        editandoValor={editandoValor} setEditandoValor={setEditandoValor}
        senhaMestra={SENHA_MESTRA}
      />

      <MetricasCard 
        metricas={metricas} 
        onAbrirListaGastos={() => setModalListaGastosAberto(true)} 
      />

      <TabelaMensalidades 
        alunos={alunosFiltrados} filtroNome={filtroNome} setFiltroNome={setFiltroNome}
        onPagamento={(a) => { setAlunoSelecionado(a); setTipoPagamento("mensalidade"); setPagamentosMetodos({ pix: (a.valor || valorPadrao).toString(), dinheiro: "", credito: "", debito: "", multa: "" }); setModalPgtoAberto(true); }}
        onCobrar={cobrarWhatsApp}
        onDesfazer={async (id) => { if(confirm("Desfazer?")) { await supabase.from('alunos').update({ status: 'pendente' }).eq('id', id); carregarDados(); } }}
      />

      <BalancoResumo resumoMetodos={resumoMetodos} metricas={metricas} mesFiltro={mesFiltro} />

      <GestaoEventos 
        eventosAtivos={eventosAtivos} eventoParaGerenciar={eventoParaGerenciar} setEventoParaGerenciar={setEventoParaGerenciar}
        alunos={alunos} historicoPagamentosEventos={historicoPagamentosEventos}
        onEditarEvento={(ev) => { setIdEventoEdicao(ev.id); setNomeEvento(ev.nome); setValorEvento(ev.valor_unitario.toString()); setModalEventoAberto(true); }}
        onExcluirEvento={async (id) => { if(confirm("Excluir?")) { await supabase.from('eventos_controle').delete().eq('id', id); carregarDados(); } }}
        onGerarPDF={gerarPDFEvento}
        onAtualizarParticipante={async (alunoId, part) => {
          const novos = part ? [...(eventoParaGerenciar.participantes || []), alunoId] : (eventoParaGerenciar.participantes || []).filter((id: string) => id !== alunoId);
          await supabase.from('eventos_controle').update({ participantes: novos, total_alunos: novos.length }).eq('id', eventoParaGerenciar.id);
          setEventoParaGerenciar({ ...eventoParaGerenciar, participantes: novos, total_alunos: novos.length });
          carregarDados();
        }}
        onAbrirPagamento={(aluno, ev, pgto) => {
          setAlunoSelecionado(aluno); setEventoParaGerenciar(ev); setTipoPagamento("evento");
          if (pgto) { setIdPagamentoEdicao(pgto.id); setPagamentosMetodos(pgto.detalhes_metodos); setDescricaoOutro(pgto.descricao); }
          else { setIdPagamentoEdicao(null); setPagamentosMetodos({ pix: ev.valor_unitario.toString(), dinheiro: "", credito: "", debito: "", multa: "" }); setDescricaoOutro(`Evento: ${ev.nome}`); }
          setModalPgtoAberto(true);
        }}
        onExcluirPagamento={async (id) => { if(confirm("Excluir pagamento?")) { await supabase.from('historico_pagamentos').delete().eq('id', id); carregarDados(); } }}
      />

      {/* --- MODAIS ISOLADOS --- */}
      <ModalPagamento 
        aberto={modalPgtoAberto} onFechar={() => setModalPgtoAberto(false)}
        aluno={alunoSelecionado} dataPagamento={dataPagamento} setDataPagamento={setDataPagamento}
        tipoPagamento={tipoPagamento} setTipoPagamento={setTipoPagamento}
        mesReferencia={mesReferencia} setMesReferencia={setMesReferencia} mesesAno={mesesAno}
        descricaoOutro={descricaoOutro} setDescricaoOutro={setDescricaoOutro}
        pagamentosMetodos={pagamentosMetodos} setPagamentosMetodos={setPagamentosMetodos}
        onConfirmar={confirmarPagamento} editando={!!idPagamentoEdicao}
      />

      <ModalGasto 
        aberto={modalGastoAberto} onFechar={() => setModalGastoAberto(false)}
        dataGasto={dataGasto} setDataGasto={setDataGasto} descGasto={descGasto} setDescGasto={setDescGasto}
        valorGasto={valorGasto} setValorGasto={setValorGasto} onAdicionar={adicionarGasto}
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

      <ModalListaGastos 
        aberto={modalListaGastosAberto} onFechar={() => setModalListaGastosAberto(false)}
        mesFiltro={mesFiltro} listaGastos={listaGastosDetalhada}
      />
    </div>
  );
}