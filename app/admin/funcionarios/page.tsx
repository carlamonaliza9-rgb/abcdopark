"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

// --- FUNÇÕES AUXILIARES DE CORTE ---
function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number) {
  return centerCrop(
    makeAspectCrop({ unit: "%", width: 90 }, aspect, mediaWidth, mediaHeight),
    mediaWidth, mediaHeight
  );
}

async function getCroppedImg(image: HTMLImageElement, crop: PixelCrop, fileName: string): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  
  // O canvas deve ter o tamanho real do recorte projetado nos pixels originais da imagem
  canvas.width = Math.floor(crop.width * scaleX);
  canvas.height = Math.floor(crop.height * scaleY);
  
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0, 0, canvas.width, canvas.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Canvas is empty"));
        return;
      }
      (blob as any).name = fileName;
      resolve(blob);
    }, "image/jpeg", 1); // Qualidade ajustada para 1 (máxima)
  });
}

export default function FuncionariosAdminPage() {
  const router = useRouter();
  const [modalAberto, setModalAberto] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [funcionarios, setFuncionarios] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [verificandoAcesso, setVerificandoAcesso] = useState(true);
  
  const [idEdicao, setIdEdicao] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [cargo, setCargo] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [arquivoFoto, setArquivoFoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // --- ESTADOS DE CORTE DE IMAGEM ---
  const [fotoOriginal, setFotoOriginal] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);
  const aspect = 16 / 9; // Proporção retangular (estilo banner)

  // --- ESTADOS DE DOCUMENTOS ---
  const [modalDocsAberto, setModalDocsAberto] = useState(false);
  const [docRG, setDocRG] = useState<File | null>(null);
  const [docComprovante, setDocComprovante] = useState<File | null>(null);
  const [docCertidao, setDocCertidao] = useState<File | null>(null);
  const [urlsDocs, setUrlsDocs] = useState({ rg: "", comprovante: "", certidao: "" });

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

      await buscarFuncionarios();
      setVerificandoAcesso(false);
    }
    verificarAcesso();
  }, [router]);

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

  const funcionariosFiltrados = funcionarios.filter(f => 
    f.nome.toLowerCase().includes(busca.toLowerCase())
  );

  // --- LÓGICA DE CORTE ---
  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, aspect));
  }, [aspect]);

  const handleTrocarFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setFotoOriginal(URL.createObjectURL(file));
      setPreviewUrl(null);
      setCompletedCrop(undefined);
    }
  };

  const aplicarCorte = useCallback(async () => {
    if (completedCrop && completedCrop.width > 0 && completedCrop.height > 0 && imgRef.current) {
      const croppedBlob = await getCroppedImg(imgRef.current, completedCrop, "foto_cortada.jpg");
      const croppedUrl = URL.createObjectURL(croppedBlob);
      setPreviewUrl(croppedUrl);
      const croppedFile = new File([croppedBlob], "foto_cortada.jpg", { type: "image/jpeg" });
      setArquivoFoto(croppedFile);
      setFotoOriginal(null);
    }
  }, [completedCrop]);

  const cancelarCorte = () => {
    setFotoOriginal(null);
    setCrop(undefined);
    setCompletedCrop(undefined);
  };

  // --- FUNÇÃO AUXILIAR DE AUDITORIA (LOGS) ---
  async function registrarLog(acao: string, detalhes: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('logs_sistema').insert([{
          usuario_email: user.email,
          acao: acao,
          tabela: 'funcionarios',
          detalhes: detalhes
        }]);
      }
    } catch (e) {
      console.error("Erro ao gerar log de auditoria:", e);
    }
  }

  async function salvarFuncionario(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    try {
      let urlFinal = previewUrl;
      if (arquivoFoto) {
        const nomeArquivo = `func_${Date.now()}_${arquivoFoto.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage.from('fotos-alunos').upload(nomeArquivo, arquivoFoto);
        
        if (uploadError) throw uploadError;
        if (uploadData) urlFinal = supabase.storage.from('fotos-alunos').getPublicUrl(nomeArquivo).data.publicUrl;
      }

      const dados = { 
        nome, 
        cpf: cpf || null, 
        data_nascimento: dataNascimento || null, 
        cargo, 
        whatsapp: whatsapp || null, 
        email: email || null, 
        foto_url: urlFinal 
      };

      const { error: dbError } = idEdicao 
        ? await supabase.from('funcionarios').update(dados).eq('id', idEdicao)
        : await supabase.from('funcionarios').insert([dados]);

      if (dbError) throw dbError;

      if (idEdicao) {
        await registrarLog("EDIÇÃO", `Editou os dados do colaborador: ${nome} (Cargo: ${cargo || 'Não definido'})`);
      } else {
        await registrarLog("INSERÇÃO", `Cadastrou um novo colaborador: ${nome} (Cargo: ${cargo || 'Não definido'})`);
      }

      setModalAberto(false); 
      buscarFuncionarios(); 
      limparFormulario();
    } catch (error: any) { 
      alert("Erro ao salvar: " + (error.message || "Erro desconhecido")); 
    } finally { 
      setCarregando(false); 
    }
  }

  async function excluirFuncionario() {
    if (idEdicao && confirm("Deseja excluir este funcionário?")) {
      const { error } = await supabase.from('funcionarios').delete().eq('id', idEdicao);
      if (error) {
        alert("Erro ao excluir.");
      } else {
        await registrarLog("EXCLUSÃO", `Excluiu permanentemente o colaborador: ${nome}`);
        setModalAberto(false); 
        buscarFuncionarios();
      }
    }
  }

  async function salvarDocumentos(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    try {
      let updates: any = {};

      const uploadDoc = async (file: File, path: string) => {
        const nomeArquivo = `doc_${idEdicao}_${path}_${Date.now()}`;
        const { data, error } = await supabase.storage.from('fotos-alunos').upload(nomeArquivo, file);
        if (error) throw error;
        return supabase.storage.from('fotos-alunos').getPublicUrl(nomeArquivo).data.publicUrl;
      };

      if (docRG) updates.rg_url = await uploadDoc(docRG, 'rg');
      if (docComprovante) updates.comprovante_residencia_url = await uploadDoc(docComprovante, 'comprovante');
      if (docCertidao) updates.certidao_nascimento_url = await uploadDoc(docCertidao, 'certidao');

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase.from('funcionarios').update(updates).eq('id', idEdicao);
        if (error) throw error;
        
        await registrarLog("ATUALIZAÇÃO DE DOCUMENTOS", `Atualizou documentos do colaborador: ${nome}`);
        await buscarFuncionarios();
        
        setUrlsDocs(prev => ({
          ...prev,
          ...(updates.rg_url && { rg: updates.rg_url }),
          ...(updates.comprovante_residencia_url && { comprovante: updates.comprovante_residencia_url }),
          ...(updates.certidao_nascimento_url && { certidao: updates.certidao_nascimento_url })
        }));
      }

      setModalDocsAberto(false);
    } catch (error: any) {
      alert("Erro ao salvar documentos: " + (error.message || "Erro desconhecido"));
    } finally {
      setCarregando(false);
    }
  }

  function limparFormulario() {
    setIdEdicao(null); setNome(""); setCpf(""); setDataNascimento(""); setCargo(""); setWhatsapp(""); setEmail("");
    setArquivoFoto(null); setPreviewUrl(null); setModoEdicao(false);
    setDocRG(null); setDocComprovante(null); setDocCertidao(null);
    setFotoOriginal(null); setCompletedCrop(undefined);
  }

  function abrirFicha(f: any) {
    setIdEdicao(f.id); setNome(f.nome); setCpf(f.cpf || ""); setDataNascimento(f.data_nascimento || "");
    setCargo(f.cargo || ""); setWhatsapp(f.whatsapp || ""); setEmail(f.email || "");
    setPreviewUrl(f.foto_url); setModoEdicao(false); setModalAberto(true);
    setUrlsDocs({
      rg: f.rg_url || "",
      comprovante: f.comprovante_residencia_url || "",
      certidao: f.certidao_nascimento_url || ""
    });
  }

  function abrirModalDocs() {
    setDocRG(null); setDocComprovante(null); setDocCertidao(null);
    setModalDocsAberto(true);
  }

  if (verificandoAcesso) return <div style={{ padding: '50px', textAlign: 'center' }}>Validando acesso à equipe...</div>;

  return (
    <div style={{ width: '100%', padding: '25px', fontFamily: 'sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>Gestão de Equipe</h1>
          <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>Controle de colaboradores ABC DO PARK</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input 
            type="text" 
            placeholder="🔍 Pesquisar colaborador..." 
            value={busca} 
            onChange={(e)=>setBusca(e.target.value)} 
            style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', width: '250px', backgroundColor: 'white' }} 
          />
          <button onClick={() => { limparFormulario(); setModoEdicao(true); setModalAberto(true); }} 
            style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s' }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
          >
            + NOVO FUNCIONÁRIO
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
        {funcionariosFiltrados.map((f) => (
          <div key={f.id} onClick={() => abrirFicha(f)} 
            style={{ 
              backgroundColor: 'white', 
              borderRadius: '24px', 
              overflow: 'hidden', 
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)', 
              cursor: 'pointer', 
              border: '1px solid #e2e8f0', 
              display: 'flex', 
              flexDirection: 'column',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
            }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'; }}
          >
            {/* Header com altura fixa de 140px para não distorcer os cards */}
            <div style={{ width: '100%', height: '140px', backgroundColor: '#f1f5f9', position: 'relative' }}>
              {f.foto_url ? (
                <img src={f.foto_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #e0e7ff 0%, #dbeafe 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>👤</div>
              )}
              <div style={{ position: 'absolute', bottom: '12px', left: '16px' }}>
                <span style={{ fontSize: '11px', color: '#1e40af', fontWeight: '800', backgroundColor: 'rgba(239, 246, 255, 0.9)', padding: '6px 14px', borderRadius: '20px', backdropFilter: 'blur(4px)', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  {f.cargo || "NÃO DEFINIDO"}
                </span>
              </div>
            </div>
            
            {/* Corpo do Card */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>{f.nome}</h3>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '16px' }}>
                    <span style={{ fontSize: '16px' }}>📱</span> {mWhatsApp(f.whatsapp || "--")}
                </div>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL PRINCIPAL (FICHA/EDIÇÃO) */}
      {modalAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '15px' }}>
          
          {/* MODAL DE CORTE DE IMAGEM SOBREPOSTO */}
          {fotoOriginal && modoEdicao && (
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                  <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '24px', textAlign: 'center', maxWidth: '95%', maxHeight: '95%', display: 'flex', flexDirection: 'column' }}>
                      <h3 style={{ marginTop: 0, color: '#0f172a', fontWeight: '800' }}>Ajustar Enquadramento (Capa do Card)</h3>
                      <div style={{ overflow: 'auto', flex: 1, backgroundColor: '#f1f5f9', borderRadius: '16px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ReactCrop crop={crop} onChange={(pixelCrop, percentCrop) => setCrop(percentCrop)} onComplete={(c) => setCompletedCrop(c)} aspect={aspect}>
                            <img ref={imgRef} src={fotoOriginal} alt="Crop" style={{ maxWidth: '100%', maxHeight: '50vh' }} onLoad={onImageLoad} />
                        </ReactCrop>
                      </div>
                      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                          <button type="button" onClick={cancelarCorte} style={{ padding: '12px 24px', borderRadius: '12px', border: '1px solid #e2e8f0', cursor: 'pointer', fontWeight: 'bold', backgroundColor: '#fff', color: '#475569' }}>Cancelar</button>
                          <button type="button" onClick={aplicarCorte} style={{ padding: '12px 24px', borderRadius: '12px', backgroundColor: '#2563eb', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Aplicar Corte</button>
                      </div>
                  </div>
              </div>
          )}

          <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '28px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            {!modoEdicao ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: '100%', height: '160px', borderRadius: '16px', backgroundColor: '#f1f5f9', marginBottom: '20px', overflow: 'hidden', border: '1px solid #e2e8f0', position: 'relative' }}>
                  {previewUrl ? (
                      <img src={previewUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', background: 'linear-gradient(135deg, #e0e7ff 0%, #dbeafe 100%)' }}>👤</div>
                  )}
                </div>

                <h2 style={{ margin: '0 0 4px', fontWeight: '900', fontSize: '24px', color: '#0f172a' }}>{nome}</h2>
                <span style={{ display: 'inline-block', color: '#1e40af', fontWeight: '800', fontSize: '12px', backgroundColor: '#eff6ff', padding: '6px 16px', borderRadius: '20px' }}>{cargo}</span>
                
                <div style={{ textAlign: 'left', backgroundColor: '#f8fafc', padding: '20px', borderRadius: '20px', marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 'bold' }}>CPF</span>
                    <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '600' }}>{mCPF(cpf) || '--'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 'bold' }}>Nascimento</span>
                    <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '600' }}>{dataNascimento ? new Date(dataNascimento).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : '--'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 'bold' }}>WhatsApp</span>
                    <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '600' }}>{mWhatsApp(whatsapp) || '--'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 'bold' }}>E-mail</span>
                    <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '600' }}>{email || '--'}</span>
                  </div>
                </div>

                <button 
                  onClick={abrirModalDocs}
                  style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontWeight: 'bold', cursor: 'pointer', marginTop: '24px', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'background 0.2s' }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                >
                  📂 DOCUMENTOS DO COLABORADOR
                </button>

                <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                  <button onClick={() => setModalAberto(false)} style={{ flex: 1, padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', cursor: 'pointer', fontWeight: 'bold', backgroundColor: 'white', color: '#475569' }}>FECHAR</button>
                  <button onClick={() => setModoEdicao(true)} style={{ flex: 1, padding: '14px', borderRadius: '14px', backgroundColor: '#2563eb', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>EDITAR</button>
                  <button onClick={excluirFuncionario} style={{ padding: '14px', borderRadius: '14px', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', cursor: 'pointer' }} title="Excluir Colaborador">🗑️</button>
                </div>
              </div>
            ) : (
              <form onSubmit={salvarFuncionario} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h2 style={{ textAlign: 'center', fontWeight: '900', color: '#0f172a', margin: '0 0 10px' }}>{idEdicao ? "Editar Colaborador" : "Novo Colaborador"}</h2>
                
                <label style={{ cursor: 'pointer', margin: '0 0 10px' }}>
                  <div style={{ width: '100%', aspectRatio: '16/9', borderRadius: '16px', border: '2px dashed #cbd5e1', overflow: 'hidden', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', transition: 'border 0.2s' }} onMouseOver={(e)=> e.currentTarget.style.borderColor = '#2563eb'} onMouseOut={(e)=> e.currentTarget.style.borderColor = '#cbd5e1'}>
                    {previewUrl ? <img src={previewUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}><span style={{ fontSize: '24px', marginBottom: '8px' }}>📸</span><span style={{ fontSize: '13px', color: '#64748b', fontWeight: 'bold' }}>Clique para Capa (16:9)</span></div>}
                  </div>
                  <input type="file" accept="image/*" hidden onChange={handleTrocarFoto} />
                </label>

                <input type="text" placeholder="Nome Completo" value={nome} onChange={(e)=>setNome(e.target.value)} required style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '15px' }} />
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <input type="text" placeholder="CPF" value={cpf} onChange={(e)=>setCpf(mCPF(e.target.value))} style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '15px' }} />
                    <input type="date" value={dataNascimento} onChange={(e)=>setDataNascimento(e.target.value)} style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '15px' }} />
                </div>

                <select value={cargo} onChange={(e)=>setCargo(e.target.value)} required style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', backgroundColor: 'white', fontSize: '15px', color: cargo ? '#0f172a' : '#94a3b8' }}>
                  <option value="" disabled>Selecione o Cargo...</option>
                  <option value="Professor">Professor(a)</option>
                  <option value="Auxiliar">Auxiliar</option>
                  <option value="Coordenação">Coordenação</option>
                  <option value="Serviços Gerais">Serviços Gerais</option>
                  <option value="Outro">Outro</option>
                </select>

                <input type="text" placeholder="WhatsApp" value={whatsapp} onChange={(e)=>setWhatsapp(mWhatsApp(e.target.value))} style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '15px' }} />
                <input type="email" placeholder="E-mail" value={email} onChange={(e)=>setEmail(e.target.value)} style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '15px' }} />

                <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                  <button type="button" onClick={() => idEdicao ? setModoEdicao(false) : setModalAberto(false)} style={{ flex: 1, padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', backgroundColor: 'white', fontWeight: 'bold', color: '#475569', cursor: 'pointer' }}>CANCELAR</button>
                  <button type="submit" disabled={carregando} style={{ flex: 1, padding: '14px', borderRadius: '14px', backgroundColor: '#2563eb', color: 'white', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
                    {carregando ? "SALVANDO..." : "SALVAR COLABORADOR"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE DOCUMENTOS */}
      {modalDocsAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1010, backdropFilter: 'blur(4px)', padding: '15px' }}>
          <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '28px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <h2 style={{ textAlign: 'center', fontWeight: '900', marginTop: 0, color: '#0f172a', fontSize: '22px', marginBottom: '4px' }}>Documentos Obrigatórios</h2>
            <p style={{ textAlign: 'center', color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>{nome}</p>

            <form onSubmit={salvarDocumentos} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* RG */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '14px', fontWeight: '800', color: '#334155' }}>Registro Geral (RG)</label>
                  {urlsDocs.rg && <a href={urlsDocs.rg} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: '#2563eb', fontWeight: 'bold', textDecoration: 'none', backgroundColor: '#eff6ff', padding: '6px 10px', borderRadius: '8px' }}>👁️ Visualizar Arquivo</a>}
                </div>
                <input type="file" accept=".pdf,image/*" onChange={(e) => setDocRG(e.target.files?.[0] || null)} style={{ fontSize: '13px', padding: '10px', border: '1px dashed #cbd5e1', borderRadius: '10px', backgroundColor: 'white', cursor: 'pointer', color: '#475569' }} />
              </div>

              {/* Comprovante de Residência */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '14px', fontWeight: '800', color: '#334155' }}>Comprovante de Residência</label>
                  {urlsDocs.comprovante && <a href={urlsDocs.comprovante} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: '#2563eb', fontWeight: 'bold', textDecoration: 'none', backgroundColor: '#eff6ff', padding: '6px 10px', borderRadius: '8px' }}>👁️ Visualizar Arquivo</a>}
                </div>
                <input type="file" accept=".pdf,image/*" onChange={(e) => setDocComprovante(e.target.files?.[0] || null)} style={{ fontSize: '13px', padding: '10px', border: '1px dashed #cbd5e1', borderRadius: '10px', backgroundColor: 'white', cursor: 'pointer', color: '#475569' }} />
              </div>

              {/* Certidão de Nascimento */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '14px', fontWeight: '800', color: '#334155' }}>Certidão de Nascimento</label>
                  {urlsDocs.certidao && <a href={urlsDocs.certidao} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: '#2563eb', fontWeight: 'bold', textDecoration: 'none', backgroundColor: '#eff6ff', padding: '6px 10px', borderRadius: '8px' }}>👁️ Visualizar Arquivo</a>}
                </div>
                <input type="file" accept=".pdf,image/*" onChange={(e) => setDocCertidao(e.target.files?.[0] || null)} style={{ fontSize: '13px', padding: '10px', border: '1px dashed #cbd5e1', borderRadius: '10px', backgroundColor: 'white', cursor: 'pointer', color: '#475569' }} />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button type="button" onClick={() => setModalDocsAberto(false)} style={{ flex: 1, padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', backgroundColor: 'white', fontWeight: 'bold', cursor: 'pointer', color: '#475569' }}>FECHAR</button>
                <button type="submit" disabled={carregando} style={{ flex: 1, padding: '14px', borderRadius: '14px', backgroundColor: '#10b981', color: 'white', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
                  {carregando ? "SALVANDO..." : "SALVAR DOCS"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}