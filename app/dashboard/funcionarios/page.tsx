"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function Funcionarios() {
  const [modalAberto, setModalAberto] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [funcionarios, setFuncionarios] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(false);
  
  const [idEdicao, setIdEdicao] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [cargo, setCargo] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [arquivoFoto, setArquivoFoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // --- MÁSCARAS ---
  const mWhatsApp = (v: string) => {
    v = v.replace(/\D/g, "");
    if (v.length <= 11) {
      v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
      v = v.replace(/(\d{5})(\d)/, "$1-$2");
    }
    return v;
  };

  const mCPF = (v: string) => {
    v = v.replace(/\D/g, "");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    return v;
  };

  async function buscarFuncionarios() {
    const { data } = await supabase.from('funcionarios').select('*').order('nome', { ascending: true });
    if (data) setFuncionarios(data);
  }

  useEffect(() => { buscarFuncionarios(); }, []);

  // FILTRO DE PESQUISA
  const funcionariosFiltrados = funcionarios.filter(f => 
    f.nome.toLowerCase().includes(busca.toLowerCase())
  );

  const handleTrocarFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setArquivoFoto(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  async function salvarFuncionario(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    try {
      let urlFinal = previewUrl;
      if (arquivoFoto) {
        const nomeArquivo = `func_${Date.now()}_${arquivoFoto.name}`;
        const { data } = await supabase.storage.from('fotos-alunos').upload(nomeArquivo, arquivoFoto);
        if (data) urlFinal = supabase.storage.from('fotos-alunos').getPublicUrl(nomeArquivo).data.publicUrl;
      }

      const dados = { nome, cpf, data_nascimento: dataNascimento, cargo, whatsapp, email, foto_url: urlFinal };

      if (idEdicao) await supabase.from('funcionarios').update(dados).eq('id', idEdicao);
      else await supabase.from('funcionarios').insert([dados]);

      setModalAberto(false); buscarFuncionarios(); limparFormulario();
      alert("Funcionário salvo com sucesso!");
    } catch (error) { alert("Erro ao salvar."); } finally { setCarregando(false); }
  }

  async function excluirFuncionario() {
    if (idEdicao && confirm("Deseja excluir este funcionário?")) {
      await supabase.from('funcionarios').delete().eq('id', idEdicao);
      setModalAberto(false); buscarFuncionarios();
    }
  }

  function limparFormulario() {
    setIdEdicao(null); setNome(""); setCpf(""); setDataNascimento(""); setCargo(""); setWhatsapp(""); setEmail("");
    setArquivoFoto(null); setPreviewUrl(null); setModoEdicao(false);
  }

  function abrirFicha(f: any) {
    setIdEdicao(f.id); setNome(f.nome); setCpf(f.cpf || ""); setDataNascimento(f.data_nascimento || "");
    setCargo(f.cargo || ""); setWhatsapp(f.whatsapp || ""); setEmail(f.email || "");
    setPreviewUrl(f.foto_url); setModoEdicao(false); setModalAberto(true);
  }

  return (
    <div style={{ width: '100%', padding: '25px', fontFamily: 'sans-serif', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 'bold', color: '#111827', margin: 0 }}>Funcionários</h1>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>Equipe ABC DO PARK</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input 
            type="text" 
            placeholder="🔍 Pesquisar..." 
            value={busca} 
            onChange={(e)=>setBusca(e.target.value)} 
            style={{ padding: '10px 15px', borderRadius: '10px', border: '1px solid #e5e7eb', outline: 'none' }} 
          />
          <button onClick={() => { limparFormulario(); setModoEdicao(true); setModalAberto(true); }} 
            style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
            + NOVO FUNCIONÁRIO
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
        {funcionariosFiltrados.map((f) => (
          <div key={f.id} onClick={() => abrirFicha(f)} 
            style={{ backgroundColor: 'white', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', cursor: 'pointer', textAlign: 'center', border: '1px solid #f1f5f9' }}>
            <div style={{ marginBottom: '15px' }}>
              {f.foto_url ? (
                <img src={f.foto_url} style={{ height: '80px', width: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #f8fafc' }} />
              ) : (
                <div style={{ height: '80px', width: '80px', borderRadius: '50%', backgroundColor: '#f1f5f9', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px' }}>👤</div>
              )}
            </div>
            <h3 style={{ margin: '0 0 5px', fontSize: '18px', fontWeight: 'bold', color: '#1e293b' }}>{f.nome}</h3>
            <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: 'bold', backgroundColor: '#eff6ff', padding: '4px 12px', borderRadius: '20px' }}>{f.cargo || "NÃO DEFINIDO"}</span>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '12px' }}>{mWhatsApp(f.whatsapp || "")}</p>
          </div>
        ))}
      </div>

      {modalAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '10px' }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '24px', width: '95%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            {!modoEdicao ? (
              <div style={{ textAlign: 'center' }}>
                {previewUrl ? (
                    <img src={previewUrl} style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', marginBottom: '15px', border: '4px solid #f1f5f9' }} />
                ) : (
                    <div style={{ width: '100px', height: '100px', borderRadius: '50%', backgroundColor: '#f1f5f9', margin: '0 auto 15px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>👤</div>
                )}
                <h2 style={{ margin: 0, fontWeight: '800' }}>{nome}</h2>
                <p style={{ color: '#2563eb', fontWeight: 'bold', fontSize: '14px', marginTop: '5px' }}>{cargo}</p>
                
                <div style={{ textAlign: 'left', backgroundColor: '#f8fafc', padding: '20px', borderRadius: '20px', marginTop: '25px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <p style={{ margin: 0, fontSize: '14px' }}><strong>CPF:</strong> {mCPF(cpf) || '--'}</p>
                  <p style={{ margin: 0, fontSize: '14px' }}><strong>Nascimento:</strong> {dataNascimento ? new Date(dataNascimento).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : '--'}</p>
                  <p style={{ margin: 0, fontSize: '14px' }}><strong>WhatsApp:</strong> {mWhatsApp(whatsapp) || '--'}</p>
                  <p style={{ margin: 0, fontSize: '14px' }}><strong>E-mail:</strong> {email || '--'}</p>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '30px' }}>
                  <button onClick={() => setModalAberto(false)} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', cursor: 'pointer', fontWeight: 'bold', backgroundColor: 'white' }}>FECHAR</button>
                  <button onClick={() => setModoEdicao(true)} style={{ flex: 1, padding: '14px', borderRadius: '12px', backgroundColor: '#2563eb', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>EDITAR</button>
                  <button onClick={excluirFuncionario} style={{ padding: '14px', borderRadius: '12px', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', cursor: 'pointer' }}>🗑️</button>
                </div>
              </div>
            ) : (
              <form onSubmit={salvarFuncionario} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <h2 style={{ textAlign: 'center', fontWeight: '800' }}>{idEdicao ? "Editar Funcionário" : "Novo Funcionário"}</h2>
                
                <label style={{ cursor: 'pointer', textAlign: 'center', margin: '10px 0' }}>
                  <div style={{ width: '100px', height: '100px', borderRadius: '50%', border: '2px dashed #cbd5e1', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#f8fafc' }}>
                    {previewUrl ? <img src={previewUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>FOTO</span>}
                  </div>
                  <input type="file" accept="image/*" hidden onChange={handleTrocarFoto} />
                </label>

                <input type="text" placeholder="Nome Completo" value={nome} onChange={(e)=>setNome(e.target.value)} required style={{ padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none' }} />
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <input type="text" placeholder="CPF" value={cpf} onChange={(e)=>setCpf(mCPF(e.target.value))} style={{ padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none' }} />
                    <input type="date" value={dataNascimento} onChange={(e)=>setDataNascimento(e.target.value)} style={{ padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none' }} />
                </div>

                <select value={cargo} onChange={(e)=>setCargo(e.target.value)} required style={{ padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', backgroundColor: 'white' }}>
                  <option value="">Selecione o Cargo...</option>
                  <option value="Professor">Professor(a)</option>
                  <option value="Auxiliar">Auxiliar</option>
                  <option value="Coordenação">Coordenação</option>
                  <option value="Serviços Gerais">Serviços Gerais</option>
                  <option value="Outro">Outro</option>
                </select>

                <input type="text" placeholder="WhatsApp" value={whatsapp} onChange={(e)=>setWhatsapp(mWhatsApp(e.target.value))} style={{ padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none' }} />
                <input type="email" placeholder="E-mail" value={email} onChange={(e)=>setEmail(e.target.value)} style={{ padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none' }} />

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button type="button" onClick={() => idEdicao ? setModoEdicao(false) : setModalAberto(false)} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: 'white', fontWeight: 'bold' }}>CANCELAR</button>
                  <button type="submit" disabled={carregando} style={{ flex: 1, padding: '14px', borderRadius: '12px', backgroundColor: '#2563eb', color: 'white', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
                    {carregando ? "SALVANDO..." : "SALVAR FUNCIONÁRIO"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}