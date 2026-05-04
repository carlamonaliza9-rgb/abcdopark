"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function FinanceiroPage() {
  const [valorPadrao, setValorPadrao] = useState(550);
  const [editandoValor, setEditandoValor] = useState(false);
  const [mesFiltro, setMesFiltro] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
  
  const [alunos, setAlunos] = useState<any[]>([]);
  const [metricas, setMetricas] = useState({ total: 0, pago: 0, pendente: 0, descontos: 0, gastos: 0, lucro: 0 });
  const [resumoMetodos, setResumoMetodos] = useState({ pix: 0, dinheiro: 0, credito: 0, debito: 0 });
  const [carregando, setCarregando] = useState(true);

  const [modalPgtoAberto, setModalPgtoAberto] = useState(false);
  const [modalHistoricoAberto, setModalHistoricoAberto] = useState(false);
  const [modalGastoAberto, setModalGastoAberto] = useState(false);
  const [alunoSelecionado, setAlunoSelecionado] = useState<any>(null);
  const [historico, setHistorico] = useState<any[]>([]);

  const [descGasto, setDescGasto] = useState("");
  const [valorGasto, setValorGasto] = useState("");
  const [tipoPagamento, setTipoPagamento] = useState("mensalidade");
  const [descricaoOutro, setDescricaoOutro] = useState("");
  const [pagamentosMetodos, setPagamentosMetodos] = useState({ pix: "", dinheiro: "", credito: "", debito: "", multa: "" });

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
          if (a.status === 'atrasado') return -1;
          if (b.status === 'atrasado') return 1;
          return a.status !== 'pago' ? -1 : 1;
        });

        setAlunos(ordenados);
        const totalPrevisto = listaAlunos.reduce((acc, curr) => acc + (curr.valor || 0), 0);
        const totalDescontos = listaAlunos.reduce((acc, curr) => acc + Math.max(0, valorPadrao - (curr.valor || 0)), 0);
        
        setMetricas({
          total: totalPrevisto,
          pago: vPago,
          pendente: Math.max(0, totalPrevisto - vPago),
          descontos: totalDescontos,
          gastos: vGastos,
          lucro: vPago - vGastos
        });
      }
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { carregarDados(); }, [mesFiltro, valorPadrao]);

  function cobrarWhatsApp(aluno: any) {
    const telefone = aluno.telefone_responsavel || "";
    const primeiroNome = aluno.nome.split(' ')[0];
    const valor = aluno.valor?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const dataVencimento = `${aluno.vencimento}/${mesFiltro.split('-')[1]}`;
    const mensagem = `Olá! Tudo bem? Passando para lembrar da mensalidade da *ABC DO PARK* do(a) aluno(a) *${primeiroNome}*, com vencimento em ${dataVencimento} no valor de ${valor}. Caso o pagamento já tenha sido realizado, por favor, nos envie o comprovante. Atenciosamente, Administração ABC DO PARK.`;
    window.open(`https://wa.me/${telefone.replace(/\D/g, '')}?text=${encodeURIComponent(mensagem)}`, '_blank');
  }

  const gerarRelatorioPDF = () => { window.print(); };

  async function zerarMes() {
    const senha = prompt("Senha:");
    if (senha !== SENHA_MESTRA) return alert("Senha incorreta!");
    
    if (confirm("Resetar status dos alunos e APAGAR todos os pagamentos e gastos DESTE MÊS?")) {
      setCarregando(true);
      const [ano, mes] = mesFiltro.split('-');
      const dataInicio = `${ano}-${mes}-01`;
      const dataFim = `${ano}-${mes}-31`;

      // 1. Reseta os alunos
      await supabase.from('alunos').update({ status: 'pendente' }).not('id', 'is', null);

      // 2. Apaga histórico financeiro do mês selecionado para limpar os cards e gráficos
      await supabase.from('historico_pagamentos').delete().gte('data_pagamento', dataInicio).lte('data_pagamento', dataFim);
      await supabase.from('gastos').delete().gte('data_gasto', dataInicio).lte('data_gasto', dataFim);

      alert("Mês zerado com sucesso!");
      await carregarDados();
    }
  }

  async function desfazerStatus(id: any) {
    if (confirm("Voltar para PENDENTE?")) {
      await supabase.from('alunos').update({ status: 'pendente' }).eq('id', id);
      carregarDados();
    }
  }

  async function adicionarGasto() {
    if (!descGasto || !valorGasto) return alert("Preencha tudo.");
    await supabase.from('gastos').insert([{
      descricao: descGasto,
      valor: parseFloat(valorGasto),
      data_gasto: `${mesFiltro}-01`
    }]);
    setModalGastoAberto(false); setDescGasto(""); setValorGasto(""); carregarDados();
  }

  async function confirmarPagamento() {
    const somaPaga = Object.values(pagamentosMetodos).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
    if (somaPaga <= 0) return alert("Insira um valor.");
    
    const dataRef = `${mesFiltro}-${String(new Date().getDate()).padStart(2, '0')}`;
    
    await supabase.from('historico_pagamentos').insert([{
        aluno_id: alunoSelecionado.id,
        tipo: tipoPagamento,
        descricao: descricaoOutro || (tipoPagamento === 'mensalidade' ? 'Mensalidade' : 'Outros'),
        valor_total: somaPaga,
        data_pagamento: dataRef,
        detalhes_metodos: pagamentosMetodos
    }]);
    
    if (tipoPagamento === "mensalidade") await supabase.from('alunos').update({ status: 'pago' }).eq('id', alunoSelecionado.id);
    
    setModalPgtoAberto(false); 
    setPagamentosMetodos({ pix: "", dinheiro: "", credito: "", debito: "", multa: "" }); 
    setDescricaoOutro("");
    carregarDados();
  }

  const estiloBtnReduzido = { padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold' as 'bold', border: 'none', cursor: 'pointer', display: 'inline-block' };

  if (carregando) return <div style={{ padding: '40px', textAlign: 'center' }}>Carregando dados financeiros...</div>;

  return (
    <div style={{ width: '100%', padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
        <header>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#1f2937' }}>Financeiro ABC DO PARK</h1>
          <div style={{ marginTop: '10px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#6b7280', marginRight: '10px' }}>VISUALIZAR MÊS:</label>
            <input type="month" value={mesFiltro} onChange={(e) => setMesFiltro(e.target.value)} style={{ border: '1px solid #ddd', padding: '5px 10px', borderRadius: '8px', fontWeight: 'bold' }} />
          </div>
        </header>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button onClick={gerarRelatorioPDF} style={{ ...estiloBtnReduzido, padding: '12px 15px', backgroundColor: '#2563eb', color: 'white' }}>📄 PDF</button>
          <button onClick={() => setModalGastoAberto(true)} style={{ ...estiloBtnReduzido, padding: '12px 15px', backgroundColor: '#ef4444', color: 'white' }}>- GASTO</button>
          <button onClick={zerarMes} style={{ ...estiloBtnReduzido, padding: '12px 15px', backgroundColor: '#374151', color: 'white' }}>🔄 ZERAR MÊS</button>
          
          <div style={{ backgroundColor: 'white', padding: '10px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
            <button onClick={() => { if(prompt("Senha:") === SENHA_MESTRA) setEditandoValor(!editandoValor); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>{editandoValor ? "🔓" : "🔒"}</button>
            <input type="number" value={valorPadrao} disabled={!editandoValor} onChange={(e) => setValorPadrao(Number(e.target.value))} style={{ width: '60px', border: 'none', textAlign: 'center', fontWeight: 'bold' }} />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '30px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '15px', borderLeft: '6px solid #10b981' }}>
          <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 'bold' }}>RECEITA NO MÊS</span>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#064e3b' }}>R$ {metricas.pago.toLocaleString('pt-BR')}</h2>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '15px', borderLeft: '6px solid #ef4444' }}>
          <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 'bold' }}>GASTOS NO MÊS</span>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#991b1b' }}>R$ {metricas.gastos.toLocaleString('pt-BR')}</h2>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '15px', borderLeft: '6px solid #2563eb' }}>
          <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 'bold' }}>LUCRO REAL</span>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#1e3a8a' }}>R$ {metricas.lucro.toLocaleString('pt-BR')}</h2>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '15px', borderLeft: '6px solid #f59e0b' }}>
          <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 'bold' }}>DESCONTOS</span>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#92400e' }}>R$ {metricas.descontos.toLocaleString('pt-BR')}</h2>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '15px', borderLeft: '6px solid #6b7280' }}>
          <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 'bold' }}>PENDENTE GERAL</span>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#374151' }}>R$ {metricas.pendente.toLocaleString('pt-BR')}</h2>
        </div>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '15px', padding: '20px', marginBottom: '30px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px' }}>Status de Pagamento (Mês Selecionado)</h2>
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ position: 'sticky', top: 0, backgroundColor: 'white' }}>
              <tr style={{ fontSize: '12px', color: '#6b7280', borderBottom: '2px solid #f3f4f6' }}>
                <th style={{ padding: '12px' }}>ALUNO</th>
                <th style={{ padding: '12px' }}>VALOR</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>VENC.</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>STATUS</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {alunos.map((aluno) => (
                <tr key={aluno.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td onClick={async () => { setAlunoSelecionado(aluno); const {data} = await supabase.from('historico_pagamentos').select('*').eq('aluno_id', aluno.id).order('data_pagamento', {ascending: false}); setHistorico(data || []); setModalHistoricoAberto(true); }} style={{ padding: '12px', fontWeight: 'bold', color: '#2563eb', cursor: 'pointer' }}>{aluno.nome} 🔍</td>
                  <td style={{ padding: '12px' }}>R$ {aluno.valor?.toLocaleString('pt-BR')}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>{aluno.vencimento}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                      <span style={{
                        ...estiloBtnReduzido,
                        backgroundColor: aluno.status === 'pago' ? '#dcfce7' : (aluno.status === 'atrasado' ? '#ef4444' : '#fee2e2'),
                        color: aluno.status === 'pago' ? '#166534' : (aluno.status === 'atrasado' ? 'white' : '#991b1b')
                      }}>
                        {aluno.status?.toUpperCase() || 'PENDENTE'}
                      </span>
                      {aluno.status === 'pago' && <button onClick={() => desfazerStatus(aluno.id)} title="Desfazer Baixa" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>↩️</button>}
                    </div>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                      <button onClick={() => { setAlunoSelecionado(aluno); setModalPgtoAberto(true); }} style={{ ...estiloBtnReduzido, backgroundColor: '#2563eb', color: 'white' }}>+ PGTO</button>
                      {aluno.status !== 'pago' && (
                        <button onClick={() => cobrarWhatsApp(aluno)} style={{ ...estiloBtnReduzido, backgroundColor: '#10b981', color: 'white' }} title="Cobrar no WhatsApp">📲</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '15px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '15px' }}>Recebido por Categoria ({mesFiltro})</h2>
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
          <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '10px', fontSize: '10px', fontWeight: 'bold' }}>
            <span>RECEITA</span><span>GASTOS</span><span>LUCRO</span>
          </div>
        </div>
      </div>

      {modalPgtoAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '20px', width: '100%', maxWidth: '500px' }}>
            <h2 style={{ marginBottom: '10px', textAlign: 'center' }}>Recebimento: {alunoSelecionado?.nome}</h2>
            <select value={tipoPagamento} onChange={(e) => setTipoPagamento(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd' }}>
              <option value="mensalidade">Mensalidade</option>
              <option value="outro">Outro</option>
            </select>
            <input type="text" placeholder="Descreva o pagamento..." value={descricaoOutro} onChange={(e) => setDescricaoOutro(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '8px', border: '1px solid #ddd' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <div><label style={{ fontSize: '10px' }}>Pix:</label><input type="number" value={pagamentosMetodos.pix} onChange={(e)=>setPagamentosMetodos({...pagamentosMetodos, pix: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '8px' }} /></div>
              <div><label style={{ fontSize: '10px' }}>Dinheiro:</label><input type="number" value={pagamentosMetodos.dinheiro} onChange={(e)=>setPagamentosMetodos({...pagamentosMetodos, dinheiro: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '8px' }} /></div>
              <div><label style={{ fontSize: '10px' }}>Cartão Crédito:</label><input type="number" value={pagamentosMetodos.credito} onChange={(e)=>setPagamentosMetodos({...pagamentosMetodos, credito: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '8px' }} /></div>
              <div><label style={{ fontSize: '10px' }}>Cartão Débito:</label><input type="number" value={pagamentosMetodos.debito} onChange={(e)=>setPagamentosMetodos({...pagamentosMetodos, debito: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '8px' }} /></div>
            </div>
            <div style={{ backgroundColor: '#fff7ed', padding: '10px', borderRadius: '10px', marginBottom: '20px', border: '1px solid #fed7aa' }}>
              <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#9a3412' }}>+ Multa/Juros:</label>
              <input type="number" value={pagamentosMetodos.multa} onChange={(e)=>setPagamentosMetodos({...pagamentosMetodos, multa: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #fdba74', borderRadius: '8px' }} />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={()=>setModalPgtoAberto(false)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #ddd' }}>CANCELAR</button>
              <button onClick={confirmarPagamento} style={{ flex: 1, padding: '12px', borderRadius: '10px', backgroundColor: '#10b981', color: 'white', fontWeight: 'bold' }}>CONFIRMAR</button>
            </div>
          </div>
        </div>
      )}

      {modalGastoAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '20px', width: '90%', maxWidth: '400px' }}>
            <h2 style={{ marginBottom: '20px' }}>Registrar Gasto</h2>
            <input type="text" placeholder="Descrição" value={descGasto} onChange={(e)=>setDescGasto(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '10px', border: '1px solid #ddd' }} />
            <input type="number" placeholder="Valor R$" value={valorGasto} onChange={(e)=>setValorGasto(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '10px', border: '1px solid #ddd' }} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={()=>setModalGastoAberto(false)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #ddd' }}>CANCELAR</button>
              <button onClick={adicionarGasto} style={{ flex: 1, padding: '12px', borderRadius: '10px', backgroundColor: '#ef4444', color: 'white', fontWeight: 'bold' }}>SALVAR</button>
            </div>
          </div>
        </div>
      )}

      {modalHistoricoAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '20px', width: '90%', maxWidth: '500px' }}>
            <h2 style={{ marginBottom: '20px' }}>Histórico: {alunoSelecionado?.nome}</h2>
            <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
              {historico.length > 0 ? historico.map((h, i) => (
                <div key={i} style={{ padding: '10px', borderBottom: '1px solid #eee', fontSize: '13px' }}>
                  <strong>{new Date(h.data_pagamento).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</strong> - {h.descricao} <br/>
                  <span style={{ color: '#10b981', fontWeight: 'bold' }}>R$ {h.valor_total?.toLocaleString('pt-BR')}</span>
                </div>
              )) : <p>Nenhum pagamento registrado.</p>}
            </div>
            <button onClick={() => setModalHistoricoAberto(false)} style={{ marginTop: '20px', width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd' }}>FECHAR</button>
          </div>
        </div>
      )}
    </div>
  );
}