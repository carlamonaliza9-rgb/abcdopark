"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function Alunos() {
  const [modalAberto, setModalAberto] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [alunos, setAlunos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  
  const [idEdicao, setIdEdicao] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [turma, setTurma] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [responsavel2, setResponsavel2] = useState("");
  const [whatsapp2, setWhatsapp2] = useState("");
  const [valor, setValor] = useState("");
  const [vencimento, setVencimento] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [temAlergia, setTemAlergia] = useState(false);
  const [alergiaDescricao, setAlergiaDescricao] = useState("");
  const [eAutista, setEAutista] = useState(false);
  const [arquivoFoto, setArquivoFoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [historico, setHistorico] = useState<any[]>([]);
  const [verHistorico, setVerHistorico] = useState(false);

  const EMAIL_VISITANTE = "escolaabcdopark@gmail.com";
  const ehVisitante = userEmail === EMAIL_VISITANTE;

  // FUNÇÃO PARA DEFINIR A COR DO CARD BASEADO NA TURMA
  const obterCorTurma = (turmaNome: string) => {
    switch (turmaNome) {
      case "Maternal": return "#e0f2fe"; // Azul claro
      case "Jardim I": return "#f0fdf4"; // Verde água
      case "Jardim II": return "#fdf2f8"; // Rosa suave
      case "1º Ano": return "#faf5ff"; // Lilás
      case "2º Ano": return "#fff7ed"; // Pêssego
      case "3º Ano": return "#f5f3ff"; // Violeta claro
      case "4º Ano": return "#ecfeff"; // Ciano suave
      case "5º Ano": return "#fefce8"; // Amarelo pastel
      default: return "#ffffff"; // Branco se não houver turma
    }
  };

  async function buscarAlunos() {
    const { data } = await supabase.from('alunos').select('*').order('nome', { ascending: true });
    if (data) setAlunos(data);
  }

  useEffect(() => { 
    async function checarUsuario() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserEmail(user.email ?? null);
    }
    checarUsuario();
    buscarAlunos(); 
  }, []);

  async function buscarHistoricoPagamento(alunoId: string) {
    const { data } = await supabase
      .from('historico_pagamentos')
      .select('*')
      .eq('aluno_id', alunoId)
      .order('data_pagamento', { ascending: false });
    
    if (data) setHistorico(data);
    setVerHistorico(true);
  }

  async function editarPagamento(pagamento: any) {
    if (ehVisitante) return;
    const novoValor = prompt("Novo valor (R$):", pagamento.valor_total);
    const novaDesc = prompt("Nova descrição:", pagamento.descricao);
    
    if (novoValor !== null && novaDesc !== null) {
      const { error } = await supabase
        .from('historico_pagamentos')
        .update({ valor_total: parseFloat(novoValor), descricao: novaDesc })
        .eq('id', pagamento.id);
      
      if (!error) buscarHistoricoPagamento(pagamento.aluno_id);
      else alert("Erro ao atualizar pagamento.");
    }
  }

  async function excluirPagamento(pagamento: any) {
    if (ehVisitante) return;
    if (confirm("Excluir este registro de pagamento permanentemente?")) {
      const { error } = await supabase
        .from('historico_pagamentos')
        .delete()
        .eq('id', pagamento.id);
      
      if (!error) buscarHistoricoPagamento(pagamento.aluno_id);
      else alert("Erro ao excluir pagamento.");
    }
  }

  const handleTrocarFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (ehVisitante) return;
    const file = e.target.files?.[0];
    if (file) {
      setArquivoFoto(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  async function salvarAluno(e: React.FormEvent) {
    e.preventDefault();
    if (ehVisitante) { alert("Acesso de visitante negado."); return; }
    if (!nome || !turma) { alert("Preencha Nome e Turma."); return; }

    setCarregando(true);
    try {
      let urlFinal = previewUrl;
      if (arquivoFoto) {
        const nomeArquivo = `${Date.now()}_${arquivoFoto.name}`;
        const { data } = await supabase.storage.from('fotos-alunos').upload(nomeArquivo, arquivoFoto);
        if (data) urlFinal = supabase.storage.from('fotos-alunos').getPublicUrl(nomeArquivo).data.publicUrl;
      }

      const dadosAluno = { 
        nome, turma, responsavel, whatsapp, responsavel_2_nome: responsavel2, responsavel_2_contato: whatsapp2,
        valor: valor ? parseFloat(valor) : null, vencimento, data_nascimento: dataNascimento,
        tem_alergia: temAlergia, alergia_descricao: temAlergia ? alergiaDescricao : "", e_autista: eAutista, foto_url: urlFinal
      };

      if (idEdicao) await supabase.from('alunos').update(dadosAluno).eq('id', idEdicao);
      else await supabase.from('alunos').insert([{ ...dadosAluno, status: 'pendente' }]);

      setModalAberto(false); setModoEdicao(false); buscarAlunos(); limparFormulario();
      alert("Salvo com sucesso!");
    } catch (error: any) { alert("Erro ao salvar."); } finally { setCarregando(false); }
  }

  async function excluirAluno() {
    if (ehVisitante) return;
    if (idEdicao && confirm("Deseja excluir este aluno permanentemente?")) {
      await supabase.from('alunos').delete().eq('id', idEdicao);
      setModalAberto(false); buscarAlunos();
    }
  }

  function limparFormulario() {
    setIdEdicao(null); setNome(""); setTurma(""); setResponsavel(""); setWhatsapp("");
    setResponsavel2(""); setWhatsapp2(""); setValor(""); setVencimento(""); 
    setDataNascimento(""); setArquivoFoto(null); setPreviewUrl(null);
    setTemAlergia(false); setAlergiaDescricao(""); setEAutista(false);
    setHistorico([]); setVerHistorico(false);
  }

  function abrirFicha(aluno: any) {
    setIdEdicao(aluno.id); setNome(aluno.nome); setTurma(aluno.turma); setResponsavel(aluno.responsavel);
    setWhatsapp(aluno.whatsapp); setResponsavel2(aluno.responsavel_2_nome || ""); setWhatsapp2(aluno.responsavel_2_contato || "");
    setValor(aluno.valor ? aluno.valor.toString() : ""); setVencimento(aluno.vencimento || "");
    setDataNascimento(aluno.data_nascimento || ""); setTemAlergia(aluno.tem_alergia || false);
    setAlergiaDescricao(aluno.alergia_descricao || ""); setEAutista(aluno.e_autista || false);
    setPreviewUrl(aluno.foto_url); setModoEdicao(false); setVerHistorico(false); setModalAberto(true);
  }

  return (
    <div style={{ width: '100%', padding: 'clamp(10px, 3vw, 25px)', fontFamily: 'sans-serif', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(20px, 5vw, 26px)', fontWeight: 'bold', color: '#111827', margin: 0 }}>Alunos</h1>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>Gestão ABC DO PARK</p>
        </div>
        {!ehVisitante && (
          <button onClick={() => { limparFormulario(); setModoEdicao(true); setModalAberto(true); }} 
            style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
            + NOVO ALUNO
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '20px' }}>
        {alunos.map((aluno) => (
          <div key={aluno.id} onClick={() => abrirFicha(aluno)}
            style={{ 
              backgroundColor: obterCorTurma(aluno.turma), // APLICAÇÃO DA COR SUAVE
              borderRadius: '20px', 
              padding: '24px', 
              border: '1px solid rgba(0,0,0,0.05)', 
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)', 
              position: 'relative', 
              cursor: 'pointer', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              transition: 'transform 0.2s ease'
            }}>
            <div style={{ position: 'absolute', top: '18px', left: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px' }}>🟢</span>
              {aluno.tem_alergia && <div style={{ width: '12px', height: '12px', backgroundColor: '#ef4444', borderRadius: '50%', border: '2px solid white' }} />}
              {aluno.e_autista && <span style={{ fontSize: '16px' }}>🧩</span>}
            </div>
            <div style={{ position: 'absolute', top: '15px', right: '15px', backgroundColor: 'rgba(255,255,255,0.6)', padding: '4px 10px', borderRadius: '10px', fontSize: '10px', fontWeight: 'bold', color: '#64748b' }}>
              VENC: {aluno.vencimento || '--'}
            </div>
            <div style={{ marginBottom: '16px', textAlign: 'center' }}>
              {aluno.foto_url ? <img src={aluno.foto_url} style={{ height: '90px', width: '90px', borderRadius: '50%', objectFit: 'cover', border: '3px solid white' }} /> : <div style={{ height: '90px', width: '90px', borderRadius: '50%', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#94a3b8', border: '1px solid #eee' }}>{aluno.nome.charAt(0)}</div>}
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', margin: '0 0 4px', textAlign: 'center' }}>{aluno.nome}</h3>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#2563eb', backgroundColor: 'rgba(255,255,255,0.7)', padding: '4px 12px', borderRadius: '20px', marginBottom: '15px' }}>{aluno.turma || "SEM TURMA"}</span>
            <div style={{ width: '100%', paddingTop: '15px', borderTop: '1px solid rgba(0,0,0,0.05)', textAlign: 'center' }}>
              <p style={{ margin: '0', fontSize: '13px', fontWeight: '700', color: '#475569' }}>{aluno.responsavel}</p>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>{aluno.whatsapp}</p>
            </div>
          </div>
        ))}
      </div>

      {modalAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '10px' }}>
          <div style={{ backgroundColor: 'white', padding: 'clamp(15px, 5vw, 32px)', borderRadius: '24px', width: '95%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
            
            {!modoEdicao ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ position: 'relative', marginBottom: '20px' }}>
                  {previewUrl ? <img src={previewUrl} style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', border: '4px solid #f8fafc' }} /> : <div style={{ height: '120px', width: '120px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '40px' }}>{nome.charAt(0)}</div>}
                  {eAutista && <span style={{ position: 'absolute', bottom: 5, right: 5, fontSize: '24px', backgroundColor: 'white', borderRadius: '50%', padding: '2px' }}>🧩</span>}
                </div>
                <h2 style={{ fontWeight: '800', color: '#1e293b', margin: '0', textAlign: 'center' }}>{nome}</h2>
                <p style={{ color: '#2563eb', fontWeight: 'bold', fontSize: '14px', marginTop: '5px', backgroundColor: '#eff6ff', padding: '4px 15px', borderRadius: '20px' }}>{turma}</p>

                {!verHistorico ? (
                  <div style={{ width: '100%', marginTop: '25px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '15px' }}>
                        <p style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'bold', margin: '0 0 4px' }}>NASCIMENTO</p>
                        <p style={{ margin: '0', fontWeight: '600', color: '#475569', fontSize: '14px' }}>{dataNascimento ? new Date(dataNascimento).toLocaleDateString('pt-BR') : '--'}</p>
                      </div>
                      <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '15px' }}>
                        <p style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'bold', margin: '0 0 4px' }}>VENCIMENTO</p>
                        <p style={{ margin: '0', fontWeight: '600', color: '#475569', fontSize: '14px' }}>Dia {vencimento || '--'}</p>
                      </div>
                    </div>
                    <div style={{ backgroundColor: '#f0fdf4', padding: '12px', borderRadius: '15px', border: '1px solid #dcfce7' }}>
                      <p style={{ fontSize: '10px', color: '#166534', fontWeight: 'bold', margin: '0 0 4px' }}>VALOR DA MENSALIDADE</p>
                      <p style={{ margin: '0', fontWeight: '800', color: '#15803d', fontSize: '16px' }}>{valor ? parseFloat(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}</p>
                    </div>
                    <div style={{ backgroundColor: '#f8fafc', padding: '15px', borderRadius: '15px' }}>
                      <p style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'bold', margin: '0 0 5px' }}>RESPONSÁVEIS</p>
                      <p style={{ margin: '0', fontWeight: '600', color: '#475569', fontSize: '13px' }}>1. {responsavel} ({whatsapp})</p>
                      {responsavel2 && <p style={{ margin: '5px 0 0', fontWeight: '600', color: '#475569', fontSize: '13px' }}>2. {responsavel2} ({whatsapp2})</p>}
                    </div>
                    {temAlergia && (
                      <div style={{ backgroundColor: '#fff5f5', padding: '15px', borderRadius: '15px', border: '1px solid #fed7d7' }}>
                        <p style={{ fontSize: '10px', color: '#c53030', fontWeight: 'bold', margin: '0 0 5px' }}>⚠️ ALERGIA</p>
                        <p style={{ margin: '0', fontWeight: '600', color: '#c53030' }}>{alergiaDescricao}</p>
                      </div>
                    )}
                    <button onClick={() => idEdicao && buscarHistoricoPagamento(idEdicao)} style={{ padding: '12px', borderRadius: '12px', backgroundColor: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px', fontSize: '12px' }}>📊 VER HISTÓRICO DE PAGAMENTOS</button>
                  </div>
                ) : (
                  <div style={{ width: '100%', marginTop: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                      <h3 style={{ fontSize: '14px', fontWeight: 'bold' }}>Histórico de Pagamentos</h3>
                      <button onClick={() => setVerHistorico(false)} style={{ border: 'none', background: 'none', color: '#2563eb', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>VOLTAR</button>
                    </div>
                    <div style={{ maxHeight: '200px', overflowY: 'auto', backgroundColor: '#f8fafc', borderRadius: '15px', padding: '10px' }}>
                      {historico.length > 0 ? historico.map((h, i) => (
                        <div key={i} style={{ padding: '10px', borderBottom: '1px solid #e2e8f0', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginRight: '10px' }}>
                              <span style={{ fontWeight: 'bold' }}>{new Date(h.data_pagamento).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</span>
                              <span style={{ color: '#10b981', fontWeight: 'bold' }}>R$ {h.valor_total?.toLocaleString('pt-BR')}</span>
                            </div>
                            <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: '11px' }}>{h.descricao}</p>
                          </div>
                          {!ehVisitante && (
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button onClick={() => editarPagamento(h)} title="Editar" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✏️</button>
                              <button onClick={() => excluirPagamento(h)} title="Excluir" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>🗑️</button>
                            </div>
                          )}
                        </div>
                      )) : <p style={{ textAlign: 'center', color: '#64748b', fontSize: '12px', padding: '20px' }}>Nenhum pagamento registrado.</p>}
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', width: '100%', marginTop: '30px' }}>
                  <button onClick={() => setModalAberto(false)} style={{ flex: '1 1 100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', fontWeight: 'bold', cursor: 'pointer', backgroundColor: 'white' }}>FECHAR</button>
                  {!ehVisitante && (
                    <>
                      <button onClick={() => setModoEdicao(true)} style={{ flex: '1 1 70%', padding: '14px', borderRadius: '12px', backgroundColor: '#2563eb', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>EDITAR FICHA</button>
                      <button onClick={excluirAluno} style={{ flex: '1 1 20%', padding: '14px', borderRadius: '12px', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', cursor: 'pointer' }}>🗑️</button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={salvarAluno} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <h2 style={{ textAlign: 'center', fontWeight: '800', color: '#1e293b' }}>{idEdicao ? "Editando Ficha" : "Novo Aluno"}</h2>
                <label htmlFor="upload-foto" style={{ cursor: 'pointer', margin: '0 auto 10px' }}>
                  <div style={{ height: '100px', width: '100px', borderRadius: '50%', border: '2px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#f8fafc' }}>
                    {previewUrl ? <img src={previewUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold' }}>FOTO</span>}
                  </div>
                </label>
                <input id="upload-foto" type="file" accept="image/*" onChange={handleTrocarFoto} style={{ display: 'none' }} />
                <input type="text" placeholder="Nome Completo" value={nome} onChange={(e)=>setNome(e.target.value)} required style={{ padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none' }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <input type="date" value={dataNascimento} onChange={(e)=>setDataNascimento(e.target.value)} required style={{ padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none' }} />
                  <select value={turma} onChange={(e) => setTurma(e.target.value)} required style={{ padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none' }}>
                    <option value="">Turma...</option>
                    <option value="Maternal">Maternal</option><option value="Jardim I">Jardim I</option><option value="Jardim II">Jardim II</option>
                    <option value="1º Ano">1º Ano</option><option value="2º Ano">2º Ano</option><option value="3º Ano">3º Ano</option>
                    <option value="4º Ano">4º Ano</option><option value="5º Ano">5º Ano</option>
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <input type="number" placeholder="Mensalidade (R$)" value={valor} onChange={(e)=>setValor(e.target.value)} style={{ padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none' }} />
                  <input type="number" placeholder="Dia Vencimento" value={vencimento} onChange={(e)=>setVencimento(e.target.value)} style={{ padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none' }} />
                </div>
                <div style={{ backgroundColor: '#f0f9ff', padding: '12px', borderRadius: '15px', border: '1px solid #bae6fd' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', color: '#0369a1' }}>
                    <input type="checkbox" checked={eAutista} onChange={(e) => setEAutista(e.target.checked)} style={{ width: '18px', height: '18px' }} />
                    ALUNO POSSUI TEA (AUTISMO)? 🧩
                  </label>
                </div>
                <div style={{ backgroundColor: '#f8fafc', padding: '15px', borderRadius: '15px', border: '1px solid #e2e8f0' }}>
                  <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#2563eb', marginBottom: '10px', marginTop: '0' }}>RESPONSÁVEIS</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    <input type="text" placeholder="Responsável 1" value={responsavel} onChange={(e)=>setResponsavel(e.target.value)} required style={{ padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                    <input type="text" placeholder="WhatsApp 1" value={whatsapp} onChange={(e)=>setWhatsapp(e.target.value)} required style={{ padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <input type="text" placeholder="Responsável 2" value={responsavel2} onChange={(e)=>setResponsavel2(e.target.value)} style={{ padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                    <input type="text" placeholder="WhatsApp 2" value={whatsapp2} onChange={(e)=>setWhatsapp2(e.target.value)} style={{ padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                  </div>
                </div>
                <div style={{ backgroundColor: '#fff5f5', padding: '12px', borderRadius: '15px', border: '1px solid #fed7d7' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', color: '#c53030' }}>
                    <input type="checkbox" checked={temAlergia} onChange={(e) => setTemAlergia(e.target.checked)} style={{ width: '18px', height: '18px' }} />
                    ALUNO POSSUI ALERGIA?
                  </label>
                  {temAlergia && ( <input type="text" placeholder="Qual alergia?" value={alergiaDescricao} onChange={(e) => setAlergiaDescricao(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #fed7d7', marginTop: '10px', outline: 'none' }} /> )}
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '5px' }}>
                  <button type="button" onClick={() => idEdicao ? setModoEdicao(false) : setModalAberto(false)} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', fontWeight: 'bold', backgroundColor: 'white' }}>CANCELAR</button>
                  <button type="submit" disabled={carregando} style={{ flex: 1, padding: '14px', borderRadius: '12px', backgroundColor: '#2563eb', color: 'white', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>{carregando ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}