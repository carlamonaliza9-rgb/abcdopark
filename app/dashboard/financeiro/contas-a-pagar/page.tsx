"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

// Componentes importados
import { FormularioConta } from "./_components/FormularioConta";
import { ModalEdicaoConta } from "./_components/ModalEdicaoConta";
import { ModalExclusaoConta } from "./_components/ModalExclusaoConta";
import { ModalConfirmarPagamento } from "./_components/ModalConfirmarPagamento";

export default function ContasAPagar() {
  const [contas, setContas] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  
  const [contaParaPagar, setContaParaPagar] = useState<any>(null);
  const [salvandoPgto, setSalvandoPgto] = useState(false);
  
  const [contaEmEdicao, setContaEmEdicao] = useState<any>(null);
  const [editDescricao, setEditDescricao] = useState("");
  const [editValor, setEditValor] = useState("");
  const [editVencimento, setEditVencimento] = useState("");
  const [editAplicarATodas, setEditAplicarATodas] = useState(false);
  
  const [contaParaExcluir, setContaParaExcluir] = useState<any>(null);

  async function carregarContas() {
    setCarregando(true);
    const { data } = await supabase
      .from('contas_a_pagar')
      .select('*')
      .order('pago', { ascending: true })
      .order('data_vencimento', { ascending: true });
    
    if (data) setContas(data);
    setCarregando(false);
  }

  useEffect(() => { carregarContas(); }, []);

  async function adicionarConta(dados: { descricao: string, valor: number, vencimento: string, repetirMeses: number }) {
    const parcelas = [];
    const dataBase = new Date(dados.vencimento + "T12:00:00"); 
    const grupoId = dados.repetirMeses > 1 ? Date.now().toString() : null; 

    for (let i = 0; i < dados.repetirMeses; i++) {
      const dataVencimento = new Date(dataBase);
      dataVencimento.setMonth(dataBase.getMonth() + i);
      parcelas.push({
        descricao: dados.repetirMeses > 1 ? `${dados.descricao} (${i + 1}/${dados.repetirMeses})` : dados.descricao,
        valor: dados.valor,
        data_venc_original: dataVencimento.toISOString().split('T')[0], // mantendo compatibilidade se necessário
        data_vencimento: dataVencimento.toISOString().split('T')[0],
        is_recorrente: dados.repetirMeses > 1,
        grupo_id: grupoId 
      });
    }

    const { error } = await supabase.from('contas_a_pagar').insert(parcelas);
    if (error) {
      alert("Erro ao salvar conta: " + error.message);
      throw error; 
    } else {
      carregarContas();
    }
  }

  function confirmarExclusao(conta: any) {
    if (conta.is_recorrente) setContaParaExcluir(conta); 
    else {
      if (window.confirm("Tem certeza que deseja excluir permanentemente esta conta?")) processarExclusao(conta.id, false);
    }
  }

  async function processarExclusao(id: string, excluirTodas: boolean, grupoId?: string, baseDescricao?: string) {
    if (excluirTodas) {
      if (grupoId) await supabase.from('contas_a_pagar').delete().eq('grupo_id', grupoId);
      else if (baseDescricao) {
        const base = baseDescricao.replace(/\s\(\d+\/\d+\)$/, '');
        await supabase.from('contas_a_pagar').delete().like('descricao', `${base}%`).eq('is_recorrente', true);
      }
    } else {
      await supabase.from('contas_a_pagar').delete().eq('id', id);
    }
    setContaParaExcluir(null);
    carregarContas();
  }

  function abrirEdicao(conta: any) {
    setContaEmEdicao(conta);
    setEditDescricao(conta.descricao);
    setEditValor(conta.valor.toString());
    setEditVencimento(conta.data_vencimento);
    setEditAplicarATodas(false);
  }

  async function salvarEdicao(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from('contas_a_pagar').update({
      descricao: editDescricao, valor: parseFloat(editValor), data_vencimento: editVencimento
    }).eq('id', contaEmEdicao.id);

    if (error) return alert("Erro ao atualizar: " + error.message);

    if (editAplicarATodas) {
      if (contaEmEdicao.grupo_id) {
        await supabase.from('contas_a_pagar').update({ valor: parseFloat(editValor) }).eq('grupo_id', contaEmEdicao.grupo_id).neq('id', contaEmEdicao.id);
      } else {
        const base = contaEmEdicao.descricao.replace(/\s\(\d+\/\d+\)$/, '');
        await supabase.from('contas_a_pagar').update({ valor: parseFloat(editValor) }).like('descricao', `${base}%`).eq('is_recorrente', true).neq('id', contaEmEdicao.id);
      }
    }
    setContaEmEdicao(null);
    carregarContas();
  }

  async function registrarPagamento(file: File) {
    setSalvandoPgto(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `comprovante_${contaParaPagar.id}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('comprovantes').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('comprovantes').getPublicUrl(fileName);
      const { error: dbError } = await supabase.from('contas_a_pagar').update({
        pago: true, data_pagamento: new Date().toISOString().split('T')[0], comprovante_url: urlData.publicUrl
      }).eq('id', contaParaPagar.id);

      if (dbError) throw dbError;
      alert("Pagamento registrado com sucesso!");
      setContaParaPagar(null);
      carregarContas();
    } catch (err: any) {
      alert("Erro no processo: " + err.message);
    } finally {
      setSalvandoPgto(false);
    }
  }

  async function desfazerPagamento(id: string) {
    if (!window.confirm("Tem certeza que deseja desfazer este pagamento? O comprovante será desvinculado.")) return;
    const { error } = await supabase.from('contas_a_pagar').update({ pago: false, data_pagamento: null, comprovante_url: null }).eq('id', id);
    if (error) alert("Erro ao desfazer pagamento: " + error.message);
    else carregarContas();
  }

  // LÓGICA DE STATUS ATUALIZADA
  function obterStatus(conta: any) {
    if (conta.pago) return { texto: "Pago", corFundo: "#dcfce7", corTexto: "#166534" };
    
    const hoje = new Date().toISOString().split('T')[0];
    const vencimento = conta.data_vencimento;

    if (vencimento < hoje) {
      return { texto: "Atrasado", corFundo: "#fee2e2", corTexto: "#991b1b" };
    }
    if (vencimento === hoje) {
      return { texto: "Pendente", corFundo: "#ffedd5", corTexto: "#9a3412" };
    }
    return { texto: "A Vencer", corFundo: "#f1f5f9", corTexto: "#475569" };
  }

  return (
    <div style={{ padding: '40px', backgroundColor: '#f9fafb', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <header style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#111827', margin: 0 }}>💸 Contas a Pagar</h1>
        <p style={{ color: '#6b7280' }}>Gestão de saídas e fornecedores do ABC DO PARK</p>
      </header>

      <FormularioConta onSalvar={adicionarConta} />

      {/* LISTAGEM PRINCIPAL */}
      <section>
        <h3 style={{ marginBottom: '20px', fontSize: '18px' }}>Histórico de Lançamentos</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {carregando ? <p>Carregando contas...</p> : contas.map(conta => {
            const status = obterStatus(conta);
            return (
              <div key={conta.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', backgroundColor: 'white', borderRadius: '20px', border: `1px solid ${conta.pago ? '#dcfce7' : '#f1f5f9'}` }}>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  {/* Etiqueta de Status Estilizada como Balão/Pílula */}
                  <div style={{ 
                    backgroundColor: status.corFundo, 
                    color: status.corTexto, 
                    padding: '6px 16px', 
                    borderRadius: '100px', 
                    fontSize: '11px', 
                    fontWeight: '900', 
                    minWidth: '100px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap'
                  }}>
                    {status.texto}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ display: 'block', fontSize: '16px', color: '#111827' }}>{conta.descricao}</strong>
                      {conta.is_recorrente && <span style={{ fontSize: '10px', backgroundColor: '#f3f4f6', color: '#4b5563', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>🔄 Recorrente</span>}
                    </div>
                    <span style={{ fontSize: '13px', color: '#6b7280' }}>Vencimento: {new Date(conta.data_vencimento).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '18px', fontWeight: '800', color: '#111827', display: 'block' }}>R$ {conta.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    
                    {conta.pago ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px', marginTop: '5px' }}>
                        <a href={conta.comprovante_url} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: '#059669', fontWeight: 'bold', textDecoration: 'none' }}>Visualizar Comprovante 📄</a>
                        <button onClick={() => desfazerPagamento(conta.id)} style={{ fontSize: '11px', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Desfazer pagamento</button>
                      </div>
                    ) : (
                      <button onClick={() => setContaParaPagar(conta)} style={{ marginTop: '5px', padding: '6px 12px', borderRadius: '8px', border: '1px solid #ef4444', color: '#ef4444', backgroundColor: 'transparent', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>Registrar Pagamento</button>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '1px solid #e5e7eb', paddingLeft: '15px' }}>
                    <button onClick={() => abrirEdicao(conta)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} title="Editar Conta">✏️</button>
                    <button onClick={() => confirmarExclusao(conta)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} title="Excluir Conta">🗑️</button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </section>

      {/* COMPONENTES DE MODAIS */}
      <ModalEdicaoConta 
        aberto={!!contaEmEdicao} contaEmEdicao={contaEmEdicao}
        editDescricao={editDescricao} setEditDescricao={setEditDescricao}
        editValor={editValor} setEditValor={setEditValor}
        editVencimento={editVencimento} setEditVencimento={setEditVencimento}
        editAplicarATodas={editAplicarATodas} setEditAplicarATodas={setEditAplicarATodas}
        onSalvar={salvarEdicao} onFechar={() => setContaEmEdicao(null)}
      />

      <ModalExclusaoConta 
        aberto={!!contaParaExcluir} contaParaExcluir={contaParaExcluir}
        onProcessarExclusao={processarExclusao} onFechar={() => setContaParaExcluir(null)}
      />

      <ModalConfirmarPagamento 
        aberto={!!contaParaPagar} contaParaPagar={contaParaPagar}
        salvandoPgto={salvandoPgto} onRegistrarPagamento={registrarPagamento} onFechar={() => setContaParaPagar(null)}
      />

    </div>
  );
}