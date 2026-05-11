"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

// Componentes importados da pasta original
import { FormularioConta } from "@/app/dashboard/financeiro/contas-a-pagar/_components/FormularioConta";
import { ModalEdicaoConta } from "@/app/dashboard/financeiro/contas-a-pagar/_components/ModalEdicaoConta";
import { ModalExclusaoConta } from "@/app/dashboard/financeiro/contas-a-pagar/_components/ModalExclusaoConta";
import { ModalConfirmarPagamento } from "@/app/dashboard/financeiro/contas-a-pagar/_components/ModalConfirmarPagamento";

export default function ContasAPagarAdminPage() {
  const router = useRouter();
  const [contas, setContas] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [verificandoAcesso, setVerificandoAcesso] = useState(true);
  
  const [contaParaPagar, setContaParaPagar] = useState<any>(null);
  const [salvandoPgto, setSalvandoPgto] = useState(false);
  
  const [contaEmEdicao, setContaEmEdicao] = useState<any>(null);
  const [editDescricao, setEditDescricao] = useState("");
  const [editValor, setEditValor] = useState("");
  const [editVencimento, setEditVencimento] = useState("");
  const [editAplicarATodas, setEditAplicarATodas] = useState(false);
  
  const [contaParaExcluir, setContaParaExcluir] = useState<any>(null);

  // --- TRAVA DE SEGURANÇA ---
  useEffect(() => {
    async function verificarAcesso() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");

      const emailAtual = user.email || "";
      const { data: perfil } = await supabase.from('perfis').select('cargo').eq('id', user.id).single();

      const ehAdmin = 
        emailAtual === 'carlamonaliza9@gmail.com' || 
        emailAtual === 'diretoria@abcdopark.com' || 
        perfil?.cargo === 'Admin';

      if (!ehAdmin) {
        return router.push("/dashboard");
      }
      setVerificandoAcesso(false);
      carregarContas();
    }
    verificarAcesso();
  }, [router]);

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

  function obterStatus(conta: any) {
    if (conta.pago) return { texto: "Pago", corFundo: "#dcfce7", corTexto: "#166534" };
    const hoje = new Date().toISOString().split('T')[0];
    if (conta.data_vencimento < hoje) return { texto: "Pendente", corFundo: "#fee2e2", corTexto: "#991b1b" }; 
    return { texto: "A Vencer", corFundo: "#fef3c7", corTexto: "#92400e" }; 
  }

  if (verificandoAcesso) return <div style={{ padding: '50px', textAlign: 'center' }}>Validando acesso financeiro...</div>;

  return (
    <div style={{ padding: '40px', backgroundColor: '#f9fafb', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <header style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#111827', margin: 0 }}>💸 Contas a Pagar</h1>
        <p style={{ color: '#6b7280' }}>Gestão de saídas e fornecedores do ABC DO PARK</p>
      </header>

      <FormularioConta onSalvar={adicionarConta} />

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