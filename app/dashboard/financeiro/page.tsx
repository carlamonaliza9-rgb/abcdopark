"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function FinanceiroPage() {
  const [valorPadrao, setValorPadrao] = useState(550);
  const [editandoValor, setEditandoValor] = useState(false);
  const [mesFiltro, setMesFiltro] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
  const [filtroNome, setFiltroNome] = useState(""); 
  
  const [alunos, setAlunos] = useState<any[]>([]);
  const [eventosAtivos, setEventosAtivos] = useState<any[]>([]);
  const [metricas, setMetricas] = useState({ total: 0, pago: 0, pendente: 0, descontos: 0, gastos: 0, lucro: 0 });
  const [resumoMetodos, setResumoMetodos] = useState({ pix: 0, dinheiro: 0, credito: 0, debito: 0 });
  const [carregando, setCarregando] = useState(true);

  const [modalPgtoAberto, setModalPgtoAberto] = useState(false);
  const [modalGastoAberto, setModalGastoAberto] = useState(false);
  const [modalListaGastosAberto, setModalListaGastosAberto] = useState(false); 
  const [modalEventoAberto, setModalEventoAberto] = useState(false);
  const [listaGastosDetalhada, setListaGastosDetalhada] = useState<any[]>([]); 
  const [alunoSelecionado, setAlunoSelecionado] = useState<any>(null);

  const [descGasto, setDescGasto] = useState("");
  const [valorGasto, setValorGasto] = useState("");
  const [dataGasto, setDataGasto] = useState(new Date().toISOString().split('T')[0]); 
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().split('T')[0]); 

  const [tipoPagamento, setTipoPagamento] = useState("mensalidade");
  const [descricaoOutro, setDescricaoOutro] = useState("");
  const [pagamentosMetodos, setPagamentosMetodos] = useState({ pix: "", dinheiro: "", credito: "", debito: "", multa: "" });

  // Lista de meses para associação de mensalidade
  const mesesAno = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const [mesReferencia, setMesReferencia] = useState(mesesAno[new Date().getMonth()]);

  const [idEventoEdicao, setIdEventoEdicao] = useState<string | null>(null);
  const [idPagamentoEdicao, setIdPagamentoEdicao] = useState<string | null>(null);
  const [nomeEvento, setNomeEvento] = useState("");
  const [valorEvento, setValorEvento] = useState("");
  const [alunosSelecionados, setAlunosSelecionados] = useState<string[]>([]);
  const [eventoParaGerenciar, setEventoParaGerenciar] = useState<any>(null);
  const [historicoPagamentosEventos, setHistoricoPagamentosEventos] = useState<any[]>([]);

  const SENHA_MESTRA = "1234";

  async function carregarDados() {
    setCarregando(true);
    try {
      const hoje = new Date();
      const diaHoje = hoje.getDate();
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

      let vPago = 0;
      let vGastos = 0;
      let metodosResumo = { pix: 0, dinheiro: 0, credito: 0, debito: 0 };

      if (pgtosMes && pgtosMes.length > 0) {
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

      if (gastosMes && gastosMes.length > 0) {
        vGastos = gastosMes.reduce((acc, curr) => acc + parseFloat(curr.valor || 0), 0);
      }

      if (listaAlunos) {
        const listaProcessada = listaAlunos.map(aluno => {
          if (aluno.status === 'pago') return aluno;
          const diaVencimento = parseInt(aluno.vencimento) || 1;
          if (diaHoje > diaVencimento) return { ...aluno, status: 'atrasado' };
          return { ...aluno, status: 'pendente' };
        });

        const ordenados = [...listaProcessada].sort((a, b) => {
          const statusA = a.status === 'pago' ? 1 : 0;
          const statusB = b.status === 'pago' ? 1 : 0;
          if (statusA !== statusB) return statusA - statusB;
          return (parseInt(a.vencimento) || 0) - (parseInt(b.vencimento) || 0);
        });

        setAlunos(ordenados);
        const totalPrevisto = listaAlunos.reduce((acc, curr) => acc + (curr.valor || 0), 0);
        const totalDescontos = listaAlunos.reduce((acc, curr) => acc + Math.max(0, valorPadrao - (curr.valor || 0)), 0);
        setMetricas({ total: totalPrevisto, pago: vPago, pendente: Math.max(0, totalPrevisto - vPago), descontos: totalDescontos, gastos: vGastos, lucro: vPago - vGastos });
      }
    } finally { setCarregando(false); }
  }

  useEffect(() => { carregarDados(); }, [mesFiltro, valorPadrao]);

  const alunosFiltrados = alunos.filter(aluno => aluno.nome.toLowerCase().includes(filtroNome.toLowerCase()));

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
        const valor = pgto ? `R$ ${pgto.valor_total.toLocaleString('pt-BR')}` : '-';
        return `<tr><td style="padding: 10px; border-bottom: 1px solid #eee;">${aluno.nome}</td><td style="text-align:center;">${data}</td><td style="text-align:center; text-transform:uppercase;">${metodo}</td><td style="text-align:right;">${valor}</td></tr>`;
      }).join('');
    printWindow.document.write(`<html><body style="font-family:sans-serif; padding:40px;"><h1>Lista: ${eventoParaGerenciar.nome}</h1><table style="width:100%; border-collapse:collapse;"><thead><tr style="background:#f8fafc;"><th>Aluno</th><th>Data</th><th>Forma</th><th>Valor</th></tr></thead><tbody>${conteudoTabela}</tbody></table></body></html>`);
    printWindow.document.close();
    printWindow.print();
  }

  function abrirPagamentoEvento(aluno: any, evento: any, pgtoExistente: any = null) {
    setAlunoSelecionado(aluno); setTipoPagamento("evento"); setEventoParaGerenciar(evento);
    if (pgtoExistente) {
      setIdPagamentoEdicao(pgtoExistente.id); setDataPagamento(pgtoExistente.data_pagamento); setDescricaoOutro(pgtoExistente.descricao);
      setPagamentosMetodos(pgtoExistente.detalhes_metodos || { pix: "", dinheiro: "", credito: "", debito: "", multa: "" });
    } else {
      setIdPagamentoEdicao(null); setDataPagamento(new Date().toISOString().split('T')[0]); setDescricaoOutro(`Evento: ${evento.nome}`);
      setPagamentosMetodos({ pix: "", dinheiro: "", credito: "", debito: "", multa: "" });
    }
    setModalPgtoAberto(true);
  }

  async function excluirPagamentoEvento(id: string) {
    if (confirm("Excluir pagamento?")) { await supabase.from('historico_pagamentos').delete().eq('id', id); carregarDados(); }
  }

  async function confirmarPagamento() {
    const somaPaga = Object.values(pagamentosMetodos).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
    if (somaPaga <= 0) return alert("Insira um valor.");
    
    // Associa o mês à descrição se for mensalidade
    const descFinal = descricaoOutro || (tipoPagamento === 'mensalidade' ? `Mensalidade - ${mesReferencia}` : `Evento: ${eventoParaGerenciar?.nome}`);
    
    const dados = { 
      aluno_id: alunoSelecionado.id, 
      tipo: tipoPagamento, 
      descricao: descFinal, 
      valor_total: somaPaga, 
      data_pagamento: dataPagamento, 
      detalhes_metodos: pagamentosMetodos 
    };

    if (idPagamentoEdicao) await supabase.from('historico_pagamentos').update(dados).eq('id', idPagamentoEdicao);
    else await supabase.from('historico_pagamentos').insert([dados]);
    
    if (tipoPagamento === "mensalidade") await supabase.from('alunos').update({ status: 'pago' }).eq('id', alunoSelecionado.id);
    
    setModalPgtoAberto(false); 
    carregarDados();
  }

  async function salvarEvento() {
    if (!nomeEvento || !valorEvento || (!idEventoEdicao && alunosSelecionados.length === 0)) return alert("Preencha tudo.");
    const dados = { 
      nome: nomeEvento, 
      valor_unitario: parseFloat(valorEvento), 
      total_alunos: idEventoEdicao ? eventosAtivos.find(e => e.id === idEventoEdicao)?.total_alunos : alunosSelecionados.length, 
      participantes: idEventoEdicao ? eventosAtivos.find(e => e.id === idEventoEdicao)?.participantes : alunosSelecionados, 
      arquivado: false 
    };
    if (idEventoEdicao) await supabase.from('eventos_controle').update(dados).eq('id', idEventoEdicao);
    else await supabase.from('eventos_controle').insert([dados]);
    setModalEventoAberto(false); limparFormEvento(); carregarDados();
  }

  function limparFormEvento() { setIdEventoEdicao(null); setNomeEvento(""); setValorEvento(""); setAlunosSelecionados([]); }
  function abrirEdicaoEvento(ev: any) { setIdEventoEdicao(ev.id); setNomeEvento(ev.nome); setValorEvento(ev.valor_unitario.toString()); setModalEventoAberto(true); }
  async function excluirEvento(id: any) { if (confirm("Excluir evento?")) { await supabase.from('eventos_controle').delete().eq('id', id); carregarDados(); } }
  const toggleAlunoSelecao = (id: string) => { setAlunosSelecionados(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]); };
  
  async function atualizarParticipanteEvento(alunoId: string, estaParticipando: boolean) {
    if (!eventoParaGerenciar) return;
    let novos = estaParticipando ? [...(eventoParaGerenciar.participantes || []), alunoId] : (eventoParaGerenciar.participantes || []).filter((id: string) => id !== alunoId);
    await supabase.from('eventos_controle').update({ participantes: novos, total_alunos: novos.length }).eq('id', eventoParaGerenciar.id);
    setEventoParaGerenciar({ ...eventoParaGerenciar, participantes: novos, total_alunos: novos.length });
    carregarDados();
  }

  function cobrarWhatsApp(aluno: any) {
    const telefone = aluno.whatsapp || "";
    if (!telefone) return alert("Este aluno não possui WhatsApp cadastrado.");
    const nomes = aluno.nome.trim().split(' ');
    const primeiroNome = nomes[0];
    const ultimoNome = nomes.length > 1 ? nomes[nomes.length - 1] : "";
    const nomeFormatado = ultimoNome ? `${primeiroNome} ${ultimoNome}` : primeiroNome;
    const valorMsg = aluno.valor?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const dataVencimento = `${aluno.vencimento}/${mesFiltro.split('-')[1]}`;
    const mensagem = `Olá! Tudo bem? Passando para lembrar da mensalidade da *ABC DO PARK* do(a) aluno(a) *${nomeFormatado}*, com vencimento em ${dataVencimento} no valor de ${valorMsg}. Caso o pagamento já tenha sido realizado, por favor desconsidere esta mensagem. Atenciosamente, Administração ABC DO PARK.`;
    window.open(`https://wa.me/55${telefone.replace(/\D/g, '')}?text=${encodeURIComponent(mensagem)}`, '_blank');
  }

  async function zerarMes() {
    const senha = prompt("Senha:");
    if (senha !== SENHA_MESTRA) return alert("Incorreta!");
    if (confirm("Resetar status e apagar dados do mês?")) {
      const [ano, mes] = mesFiltro.split('-');
      await supabase.from('alunos').update({ status: 'pendente' }).not('id', 'is', null);
      await supabase.from('historico_pagamentos').delete().gte('data_pagamento', `${ano}-${mes}-01`).lte('data_pagamento', `${ano}-${mes}-31`);
      await supabase.from('gastos').delete().gte('data_gasto', `${ano}-${mes}-01`).lte('data_gasto', `${ano}-${mes}-31`);
      carregarDados();
    }
  }

  async function adicionarGasto() {
    await supabase.from('gastos').insert([{ descricao: descGasto, valor: parseFloat(valorGasto), data_gasto: dataGasto }]);
    setModalGastoAberto(false); setDescGasto(""); setValorGasto(""); carregarDados();
  }

  async function desfazerStatus(id: any) { await supabase.from('alunos').update({ status: 'pendente' }).eq('id', id); carregarDados(); }

  const estiloBtnReduzido = { padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold' as 'bold', border: 'none', cursor: 'pointer', display: 'inline-block' };

  if (carregando) return <div style={{ padding: '40px', textAlign: 'center' }}>Carregando dados financeiros...</div>;

  return (
    <div style={{ width: '100%', padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
        <header>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#1f2937' }}>Financeiro ABC DO PARK</h1>
          <div style={{ marginTop: '10px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#6b7280', marginRight: '10px' }}>VISUALIZAR MÊS:</label>
            <input type="month" value={mesFiltro} onChange={(e) => setMesFiltro(e.target.value)} style={{ border: '1px solid #ddd', padding: '5px 10px', borderRadius: '8px', fontWeight: 'bold' }} />
          </div>
        </header>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button onClick={() => { limparFormEvento(); setModalEventoAberto(true); }} style={{ ...estiloBtnReduzido, padding: '12px 15px', backgroundColor: '#8b5cf6', color: 'white' }}>🎟️ NOVO EVENTO</button>
          <button onClick={() => window.print()} style={{ ...estiloBtnReduzido, padding: '12px 15px', backgroundColor: '#2563eb', color: 'white' }}>📄 PDF</button>
          <button onClick={() => setModalGastoAberto(true)} style={{ ...estiloBtnReduzido, padding: '12px 15px', backgroundColor: '#ef4444', color: 'white' }}>- GASTO</button>
          <button onClick={zerarMes} style={{ ...estiloBtnReduzido, padding: '12px 15px', backgroundColor: '#374151', color: 'white' }}>🔄 ZERAR MÊS</button>
          <div style={{ backgroundColor: 'white', padding: '10px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
            <button onClick={() => { if(prompt("Senha:") === SENHA_MESTRA) setEditandoValor(!editandoValor); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>{editandoValor ? "🔓" : "🔒"}</button>
            <input type="number" value={valorPadrao} disabled={!editandoValor} onChange={(e) => setValorPadrao(Number(e.target.value))} style={{ width: '60px', border: 'none', textAlign: 'center', fontWeight: 'bold' }} />
          </div>
        </div>
      </div>

      {/* MÉTRICAS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '30px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '15px', borderLeft: '6px solid #10b981' }}><span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 'bold' }}>RECEITA NO MÊS</span><h2 style={{ fontSize: '20px', fontWeight: '800', color: '#064e3b' }}>R$ {metricas.pago.toLocaleString('pt-BR')}</h2></div>
        <div onClick={() => setModalListaGastosAberto(true)} style={{ backgroundColor: 'white', padding: '20px', borderRadius: '15px', borderLeft: '6px solid #ef4444', cursor: 'pointer' }}><span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 'bold' }}>GASTOS NO MÊS 👁️</span><h2 style={{ fontSize: '20px', fontWeight: '800', color: '#991b1b' }}>R$ {metricas.gastos.toLocaleString('pt-BR')}</h2></div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '15px', borderLeft: '6px solid #2563eb' }}><span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 'bold' }}>LUCRO REAL</span><h2 style={{ fontSize: '20px', fontWeight: '800', color: '#1e3a8a' }}>R$ {metricas.lucro.toLocaleString('pt-BR')}</h2></div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '15px', borderLeft: '6px solid #f59e0b' }}><span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 'bold' }}>DESCONTOS</span><h2 style={{ fontSize: '20px', fontWeight: '800', color: '#92400e' }}>R$ {metricas.descontos.toLocaleString('pt-BR')}</h2></div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '15px', borderLeft: '6px solid #6b7280' }}><span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 'bold' }}>PENDENTE GERAL</span><h2 style={{ fontSize: '20px', fontWeight: '800', color: '#374151' }}>R$ {metricas.pendente.toLocaleString('pt-BR')}</h2></div>
      </div>

      {/* TABELA GERAL */}
      <div style={{ backgroundColor: 'white', borderRadius: '15px', padding: '20px', marginBottom: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>Status de Pagamento (Mensalidades)</h2>
          <input type="text" placeholder="🔍 Pesquisar aluno..." value={filtroNome} onChange={(e) => setFiltroNome(e.target.value)} style={{ padding: '8px 15px', borderRadius: '10px', border: '1px solid #ddd', width: '250px' }} />
        </div>
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ position: 'sticky', top: 0, backgroundColor: 'white' }}>
              <tr style={{ fontSize: '12px', color: '#6b7280', borderBottom: '2px solid #f3f4f6' }}>
                <th style={{ padding: '12px' }}>ALUNO</th><th>VALOR</th><th style={{textAlign:'center'}}>VENC.</th><th style={{textAlign:'center'}}>STATUS</th><th style={{textAlign:'center'}}>AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {alunosFiltrados.map((aluno) => (
                <tr key={aluno.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px', fontWeight: 'bold', color: '#1f2937' }}>{aluno.nome}</td>
                  <td style={{ padding: '12px' }}>R$ {aluno.valor?.toLocaleString('pt-BR')}</td>
                  <td style={{ textAlign: 'center' }}>{aluno.vencimento}</td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                      <span style={{ ...estiloBtnReduzido, backgroundColor: aluno.status === 'pago' ? '#dcfce7' : (aluno.status === 'atrasado' ? '#ef4444' : '#fee2e2'), color: aluno.status === 'pago' ? '#166534' : (aluno.status === 'atrasado' ? 'white' : '#991b1b') }}>
                        {aluno.status?.toUpperCase() || 'PENDENTE'}
                      </span>
                      {aluno.status === 'pago' && <button onClick={() => desfazerStatus(aluno.id)} title="Desfazer Baixa" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>↩️</button>}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                      <button onClick={() => { setAlunoSelecionado(aluno); setIdPagamentoEdicao(null); setTipoPagamento("mensalidade"); setModalPgtoAberto(true); }} style={{ ...estiloBtnReduzido, backgroundColor: '#2563eb', color: 'white' }}>+ PGTO</button>
                      {aluno.status !== 'pago' && (
                        <button onClick={() => cobrarWhatsApp(aluno)} style={{ ...estiloBtnReduzido, backgroundColor: '#10b981', color: 'white' }} title="Cobrar no WhatsApp">COBRAR</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* BALANÇO E CATEGORIAS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '15px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '15px' }}>Recebido por Método ({mesFiltro})</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {Object.entries(resumoMetodos).map(([key, val]) => (
              <div key={key} style={{ padding: '10px', backgroundColor: '#f9fafb', borderRadius: '10px' }}>
                <p style={{ fontSize: '10px', color: '#6b7280', margin: 0, textTransform: 'uppercase' }}>{key}</p>
                <p style={{ fontWeight: 'bold', color: '#10b981' }}>R$ {val.toLocaleString('pt-BR')}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '15px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '20px' }}>📊 Balanço Geral ({mesFiltro})</h2>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '20px', height: '120px', justifyContent: 'center' }}>
            <div style={{ width: '40px', height: `${(metricas.pago / (Math.max(metricas.pago, metricas.gastos, 1))) * 100}px`, backgroundColor: '#10b981', borderRadius: '5px' }} />
            <div style={{ width: '40px', height: `${(metricas.gastos / (Math.max(metricas.pago, metricas.gastos, 1))) * 100}px`, backgroundColor: '#ef4444', borderRadius: '5px' }} />
            <div style={{ width: '40px', height: `${(Math.max(0, metricas.lucro) / (Math.max(metricas.pago, metricas.gastos, 1))) * 100}px`, backgroundColor: '#2563eb', borderRadius: '5px' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '10px', fontSize: '10px', fontWeight: 'bold' }}><span>RECEITA</span><span>GASTOS</span><span>LUCRO</span></div>
        </div>
      </div>

      {/* --- SEÇÃO DE EVENTOS AO FIM DA PÁGINA --- */}
      <div style={{ borderTop: '2px solid #e5e7eb', paddingTop: '30px', paddingBottom: '50px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '20px', color: '#1f2937' }}>Gestão de Eventos</h2>
        
        {eventosAtivos.length > 0 && (
          <div style={{ display: 'flex', gap: '15px', overflowX: 'auto', marginBottom: '20px', paddingBottom: '10px' }}>
              {eventosAtivos.map(ev => (
                  <div key={ev.id} onClick={() => setEventoParaGerenciar(ev)} style={{ minWidth: '220px', backgroundColor: 'white', padding: '15px', borderRadius: '15px', border: eventoParaGerenciar?.id === ev.id ? '2px solid #7c3aed' : '2px solid #ddd6fe', position: 'relative', cursor: 'pointer' }}>
                      <div style={{ position: 'absolute', top: 8, right: 8 }}>
                        <button onClick={(e) => { e.stopPropagation(); abrirEdicaoEvento(ev); }} style={{background:'none', border:'none', cursor:'pointer'}}>✏️</button>
                        <button onClick={(e) => { e.stopPropagation(); excluirEvento(ev.id); }} style={{background:'none', border:'none', cursor:'pointer'}}>🗑️</button>
                      </div>
                      <h3 style={{ margin: '0', fontSize: '15px', color: '#7c3aed', fontWeight: '800' }}>{ev.nome}</h3>
                      <p style={{ margin: '5px 0 0', fontSize: '12px' }}>R$ {ev.valor_unitario} /aluno</p>
                  </div>
              ))}
          </div>
        )}

        {eventoParaGerenciar && (
          <div style={{ backgroundColor: 'white', borderRadius: '15px', padding: '20px', border: '2px solid #7c3aed' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#7c3aed' }}>Participantes: {eventoParaGerenciar.nome}</h2>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={gerarPDFEvento} style={{ ...estiloBtnReduzido, backgroundColor: '#2563eb', color: 'white' }}>📄 PDF LISTA</button>
                <button onClick={() => setEventoParaGerenciar(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>Fechar ✕</button>
              </div>
            </div>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                <thead><tr style={{ color: '#6b7280', borderBottom: '2px solid #f3f4f6' }}><th style={{textAlign:'left', padding:'10px'}}>ALUNO</th><th style={{textAlign:'center'}}>PARTICIPAÇÃO</th><th style={{textAlign:'center'}}>STATUS</th><th style={{textAlign:'center'}}>AÇÕES</th></tr></thead>
                <tbody>
                  {alunos.map(aluno => {
                    const participando = eventoParaGerenciar.participantes?.includes(aluno.id);
                    const pgto = historicoPagamentosEventos.find(p => p.aluno_id === aluno.id && p.descricao.includes(eventoParaGerenciar.nome));
                    return (
                      <tr key={aluno.id} style={{ borderBottom: '1px solid #f3f4f6', opacity: participando ? 1 : 0.5 }}>
                        <td style={{ padding: '10px', fontWeight: 'bold' }}>{aluno.nome}</td>
                        <td style={{ textAlign: 'center' }}><button onClick={() => atualizarParticipanteEvento(aluno.id, !participando)} style={{...estiloBtnReduzido, backgroundColor: participando ? '#ddd6fe' : '#f3f4f6'}}>{participando ? "SIM ✅" : "NÃO"}</button></td>
                        <td style={{ textAlign: 'center' }}>{participando ? (pgto ? "PAGO" : "PENDENTE") : "-"}</td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                            {participando && !pgto && <button onClick={() => abrirPagamentoEvento(aluno, eventoParaGerenciar)} style={{...estiloBtnReduzido, backgroundColor:'#2563eb', color:'white'}}>+ PGTO</button>}
                            {pgto && <><button onClick={() => abrirPagamentoEvento(aluno, eventoParaGerenciar, pgto)}>✏️</button><button onClick={() => excluirPagamentoEvento(pgto.id)}>🗑️</button></>}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* MODAL LISTA DE GASTOS */}
      {modalListaGastosAberto && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '20px', width: '95%', maxWidth: '700px', maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>Gastos de {mesFiltro}</h2>
              <button onClick={() => setModalListaGastosAberto(false)} style={{ fontSize: '24px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>&times;</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead style={{ backgroundColor: '#f9fafb', position: 'sticky', top: 0 }}>
                  <tr style={{ color: '#6b7280', borderBottom: '2px solid #f3f4f6' }}>
                    <th>DESCRIÇÃO</th><th>DATA</th><th>VALOR</th>
                  </tr>
                </thead>
                <tbody>
                  {listaGastosDetalhada.map(g => (
                    <tr key={g.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '12px' }}>{g.descricao}</td>
                      <td>{new Date(g.data_gasto).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</td>
                      <td style={{ color: '#b91c1c', fontWeight: 'bold' }}>R$ {parseFloat(g.valor).toLocaleString('pt-BR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '2px solid #f3f4f6', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 'bold' }}>TOTAL:</span>
              <span style={{ fontSize: '18px', fontWeight: '800', color: '#b91c1c' }}>R$ {metricas.gastos.toLocaleString('pt-BR')}</span>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REGISTRAR GASTO */}
      {modalGastoAberto && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '20px', width: '400px' }}>
            <h2 style={{ marginBottom: '20px' }}>Registrar Gasto</h2>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontSize: '10px', fontWeight: 'bold' }}>DATA DO GASTO:</label>
              <input type="date" value={dataGasto} onChange={(e) => setDataGasto(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
            </div>
            <input type="text" placeholder="Descrição" value={descGasto} onChange={(e)=>setDescGasto(e.target.value)} style={{width:'100%', padding:'10px', marginBottom:'10px', borderRadius: '8px', border: '1px solid #ddd'}} />
            <input type="number" placeholder="Valor" value={valorGasto} onChange={(e)=>setValorGasto(e.target.value)} style={{width:'100%', padding:'10px', marginBottom:'20px', borderRadius: '8px', border: '1px solid #ddd'}} />
            <button onClick={adicionarGasto} style={{width:'100%', padding:'10px', backgroundColor:'#ef4444', color:'white', borderRadius:'8px', border:'none', fontWeight: 'bold'}}>SALVAR GASTO</button>
            <button onClick={()=>setModalGastoAberto(false)} style={{width:'100%', marginTop:'10px', background:'none', border:'none', cursor: 'pointer'}}>VOLTAR</button>
          </div>
        </div>
      )}

      {/* MODAL PGTO (COM ASSOCIAÇÃO DE MÊS) */}
      {modalPgtoAberto && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '20px', width: '95%', maxWidth: '500px' }}>
            <h2 style={{textAlign:'center', marginBottom:15}}>{alunoSelecionado?.nome}</h2>
            <div style={{marginBottom:15}}>
              <label style={{fontSize:10, fontWeight:'bold'}}>DATA DO PAGAMENTO:</label>
              <input type="date" value={dataPagamento} onChange={(e) => setDataPagamento(e.target.value)} style={{width:'100%', padding:10, borderRadius:8, border:'1px solid #ddd'}} />
            </div>
            <select value={tipoPagamento} onChange={(e) => setTipoPagamento(e.target.value)} style={{width:'100%', padding:10, marginBottom:10, borderRadius:8, border:'1px solid #ddd'}}>
              <option value="mensalidade">Mensalidade</option>
              <option value="evento">Evento</option>
              <option value="outro">Outro</option>
            </select>

            {/* SELEÇÃO DE MÊS APENAS PARA MENSALIDADE */}
            {tipoPagamento === "mensalidade" && (
              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '10px', fontWeight: 'bold' }}>MÊS DE REFERÊNCIA:</label>
                <select 
                  value={mesReferencia} 
                  onChange={(e) => setMesReferencia(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                >
                  {mesesAno.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            )}

            <input type="text" placeholder="Descrição opcional..." value={descricaoOutro} onChange={(e) => setDescricaoOutro(e.target.value)} style={{width:'100%', padding:10, marginBottom:15, borderRadius:8, border:'1px solid #ddd'}} />
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
              <div><label style={{fontSize:10}}>Pix:</label><input type="number" value={pagamentosMetodos.pix} onChange={(e)=>setPagamentosMetodos({...pagamentosMetodos, pix: e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd', borderRadius:8}} /></div>
              <div><label style={{fontSize:10}}>Dinheiro:</label><input type="number" value={pagamentosMetodos.dinheiro} onChange={(e)=>setPagamentosMetodos({...pagamentosMetodos, dinheiro: e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd', borderRadius:8}} /></div>
              <div><label style={{fontSize:10}}>Cartão Crédito:</label><input type="number" value={pagamentosMetodos.credito} onChange={(e)=>setPagamentosMetodos({...pagamentosMetodos, credito: e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd', borderRadius:8}} /></div>
              <div><label style={{fontSize:10}}>Cartão Débito:</label><input type="number" value={pagamentosMetodos.debito} onChange={(e)=>setPagamentosMetodos({...pagamentosMetodos, debito: e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd', borderRadius:8}} /></div>
              <div style={{gridColumn:'span 2'}}><label style={{fontSize:10, color:'red', fontWeight:'bold'}}>Multa / Taxa extra:</label><input type="number" value={pagamentosMetodos.multa} onChange={(e)=>setPagamentosMetodos({...pagamentosMetodos, multa: e.target.value})} style={{width:'100%', padding:8, border:'1px solid red', borderRadius:8}} /></div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={()=>setModalPgtoAberto(false)} style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid #ddd' }}>CANCELAR</button>
              <button onClick={confirmarPagamento} style={{ flex: 1, padding: 12, borderRadius: 10, backgroundColor: '#10b981', color: 'white', fontWeight: 'bold' }}>{idPagamentoEdicao ? "ATUALIZAR" : "CONFIRMAR"}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NOVO/EDITAR EVENTO */}
      {modalEventoAberto && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '24px', width: '95%', maxWidth: '500px' }}>
            <h2 style={{textAlign:'center', marginBottom:'20px'}}>{idEventoEdicao ? "✏️ Editar Evento" : "🎟️ Novo Evento"}</h2>
            <input type="text" placeholder="Nome" value={nomeEvento} onChange={(e)=>setNomeEvento(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '10px', border: '1px solid #ddd' }} />
            <input type="number" placeholder="Valor por aluno" value={valorEvento} onChange={(e)=>setValorEvento(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '10px', border: '1px solid #ddd' }} />
            {!idEventoEdicao && (
              <div style={{ maxHeight: '180px', overflowY: 'auto', marginBottom: '20px', border: '1px solid #eee', padding: '10px', borderRadius: '12px' }}>
                <p style={{fontSize: 10, fontWeight: 'bold', color: '#666', marginBottom: 5}}>SELECIONE PARTICIPANTES:</p>
                {alunos.map(aluno => (
                  <label key={aluno.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '5px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={alunosSelecionados.includes(aluno.id)} onChange={() => toggleAlunoSelecao(aluno.id)} />
                    <span style={{fontSize: 13}}>{aluno.nome}</span>
                  </label>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={()=>setModalEventoAberto(false)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #ddd' }}>CANCELAR</button>
              <button onClick={salvarEvento} style={{ flex: 1, padding: '12px', borderRadius: '10px', backgroundColor: '#8b5cf6', color: 'white', fontWeight: 'bold' }}>SALVAR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}