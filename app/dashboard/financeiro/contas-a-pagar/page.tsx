"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { UploadComprovante } from "./_components/UploadComprovante";
import { FormularioConta } from "./_components/FormularioConta";

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
    if (conta.is_recorrente) {
      setContaParaExcluir(conta); 
    } else {
      const confirmar = window.confirm("Tem certeza que deseja excluir permanentemente esta conta?");
      if (confirmar) processarExclusao(conta.id, false);
    }
  }

  async function processarExclusao(id: string, excluirTodas: boolean, grupoId?: string, baseDescricao?: string) {
    if (excluirTodas) {
      if (grupoId) {
        await supabase.from('contas_a_pagar').delete().eq('grupo_id', grupoId);
      } else if (baseDescricao) {
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
      descricao: editDescricao,
      valor: parseFloat(editValor),
      data_vencimento: editVencimento
    }).eq('id', contaEmEdicao.id);

    if (error) {
      alert("Erro ao atualizar: " + error.message);
      return;
    }

    if (editAplicarATodas) {
      if (contaEmEdicao.grupo_id) {
        await supabase.from('contas_a_pagar').update({ valor: parseFloat(editValor) })
          .eq('grupo_id', contaEmEdicao.grupo_id).neq('id', contaEmEdicao.id);
      } else {
        const base = contaEmEdicao.descricao.replace(/\s\(\d+\/\d+\)$/, '');
        await supabase.from('contas_a_pagar').update({ valor: parseFloat(editValor) })
          .like('descricao', `${base}%`).eq('is_recorrente', true).neq('id', contaEmEdicao.id);
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
        pago: true,
        data_pagamento: new Date().toISOString().split('T')[0],
        comprovante_url: urlData.publicUrl
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

  // NOVO: Função para desfazer o registro de pagamento
  async function desfazerPagamento(id: string) {
    const confirmar = window.confirm("Tem certeza que deseja desfazer este pagamento? O comprovante será desvinculado.");
    if (!confirmar) return;

    const { error } = await supabase.from('contas_a_pagar').update({
      pago: false,
      data_pagamento: null,
      comprovante_url: null
    }).eq('id', id);

    if (error) {
      alert("Erro ao desfazer pagamento: " + error.message);
    } else {
      carregarContas();
    }
  }

  function obterStatus(conta: any) {
    if (conta.pago) return { texto: "Pago", corFundo: "#dcfce7", corTexto: "#166534" };
    const hoje = new Date().toISOString().split('T')[0];
    if (conta.data_vencimento < hoje) return { texto: "Pendente", corFundo: "#fee2e2", corTexto: "#991b1b" }; 
    return { texto: "A Vencer", corFundo: "#fef3c7", corTexto: "#92400e" }; 
  }

  return (
    <div style={{ padding: '40px', backgroundColor: '#f9fafb', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <header style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#111827', margin: 0 }}>💸 Contas a Pagar</h1>
        <p style={{ color: '#6b7280' }}>Gestão de saídas e fornecedores do ABC DO PARK</p>
      </header>

      <FormularioConta onSalvar={adicionarConta} />

      {/* LISTAGEM */}
      <section>
        <h3 style={{ marginBottom: '20px', fontSize: '18px' }}>Histórico de Lançamentos</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {carregando ? <p>Carregando contas...</p> : contas.map(conta => {
            const status = obterStatus(conta);
            return (
              <div key={conta.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', backgroundColor: 'white', borderRadius: '20px', border: `1px solid ${conta.pago ? '#dcfce7' : '#f1f5f9'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ backgroundColor: status.corFundo, color: status.corTexto, padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', width: '80px', textAlign: 'center' }}>
                    {status.texto}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ display: 'block', fontSize: '16px', color: '#111827' }}>{conta.descricao}</strong>
                      {conta.is_recorrente && (
                        <span style={{ fontSize: '10px', backgroundColor: '#f3f4f6', color: '#4b5563', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>🔄 Recorrente</span>
                      )}
                    </div>
                    <span style={{ fontSize: '13px', color: '#6b7280' }}>Vencimento: {new Date(conta.data_vencimento).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '18px', fontWeight: '800', color: '#111827', display: 'block' }}>R$ {conta.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    
                    {/* NOVO: Divisão condicional com o botão de desfazer */}
                    {conta.pago ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px', marginTop: '5px' }}>
                        <a href={conta.comprovante_url} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: '#059669', fontWeight: 'bold', textDecoration: 'none' }}>
                          Visualizar Comprovante 📄
                        </a>
                        <button 
                          onClick={() => desfazerPagamento(conta.id)} 
                          style={{ fontSize: '11px', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          Desfazer pagamento
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setContaParaPagar(conta)} style={{ marginTop: '5px', padding: '6px 12px', borderRadius: '8px', border: '1px solid #ef4444', color: '#ef4444', backgroundColor: 'transparent', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>
                        Registrar Pagamento
                      </button>
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

      {/* MODAL DE EDIÇÃO */}
      {contaEmEdicao && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '24px', width: '90%', maxWidth: '400px' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: '20px' }}>Editar Conta</h3>
            <form onSubmit={salvarEdicao} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>DESCRIÇÃO</label><input value={editDescricao} onChange={e => setEditDescricao(e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none' }} /></div>
              <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>VALOR (R$)</label><input type="number" step="0.01" min="0" value={editValor} onChange={e => setEditValor(e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none' }} /></div>
              <div><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>VENCIMENTO</label><input type="date" value={editVencimento} onChange={e => setEditVencimento(e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none' }} /></div>
              
              {contaEmEdicao.is_recorrente && (
                <div style={{ marginTop: '5px', backgroundColor: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={editAplicarATodas} onChange={(e) => setEditAplicarATodas(e.target.checked)} style={{ marginTop: '3px', width: '16px', height: '16px' }} />
                    <div><span style={{ fontSize: '13px', fontWeight: 'bold', display: 'block' }}>Aplicar o novo VALOR a todas as parcelas</span><span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '2px' }}>As datas de vencimento serão mantidas intactas.</span></div>
                  </label>
                </div>
              )}
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}><button type="button" onClick={() => setContaEmEdicao(null)} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #e5e7eb', backgroundColor: 'transparent', fontWeight: 'bold', cursor: 'pointer' }}>Cancelar</button><button type="submit" style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', backgroundColor: '#2563eb', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Salvar</button></div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE EXCLUSÃO */}
      {contaParaExcluir && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '24px', width: '90%', maxWidth: '400px', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 15px', fontSize: '20px' }}>Excluir Conta</h3>
            <p style={{ marginBottom: '25px', fontSize: '14px' }}>A conta <strong>{contaParaExcluir.descricao}</strong> faz parte de uma recorrência. Como deseja prosseguir?</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button onClick={() => processarExclusao(contaParaExcluir.id, false)} style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Excluir APENAS esta parcela</button>
              <button onClick={() => processarExclusao(contaParaExcluir.id, true, contaParaExcluir.grupo_id, contaParaExcluir.descricao)} style={{ padding: '14px', borderRadius: '12px', border: 'none', backgroundColor: '#ef4444', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Excluir TODAS as parcelas</button>
              <button onClick={() => setContaParaExcluir(null)} style={{ marginTop: '10px', padding: '10px', background: 'none', border: 'none', color: '#6b7280', fontWeight: 'bold', cursor: 'pointer' }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE PAGAMENTO */}
      {contaParaPagar && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '30px', width: '90%', maxWidth: '450px', textAlign: 'center' }}>
            <h2 style={{ margin: '0 0 10px' }}>Confirmar Pagamento</h2>
            <p style={{ color: '#64748b', marginBottom: '20px' }}>Registrando pagamento para: <br/><strong>{contaParaPagar.descricao} (R$ {contaParaPagar.valor.toLocaleString('pt-BR')})</strong></p>
            {salvandoPgto ? <div style={{ padding: '40px', fontWeight: 'bold', color: '#2563eb' }}>Processando arquivo e salvando...</div> : <UploadComprovante onFileSelect={registrarPagamento} />}
            <button onClick={() => setContaParaPagar(null)} disabled={salvandoPgto} style={{ marginTop: '25px', background: 'none', border: 'none', color: '#94a3b8', fontWeight: 'bold', cursor: 'pointer' }}>Cancelar e Voltar</button>
          </div>
        </div>
      )}
    </div>
  );
}