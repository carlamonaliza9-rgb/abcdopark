"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

const LISTA_OFICIAL_TURMAS = [
  "Maternal",
  "Jardim I",
  "Jardim II",
  "1º Ano",
  "2º Ano",
  "3º Ano",
  "4º Ano",
  "5º Ano"
];

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
    }, "image/jpeg", 1);
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
  
  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState("");

  const [arquivoFoto, setArquivoFoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [fotoOriginal, setFotoOriginal] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);
  const aspect = 16 / 9;

  const [modalDocsAberto, setModalDocsAberto] = useState(false);
  const [docRG, setDocRG] = useState<File | null>(null);
  const [docComprovante, setDocComprovante] = useState<File | null>(null);
  const [docCertidao, setDocCertidao] = useState<File | null>(null);
  const [urlsDocs, setUrlsDocs] = useState({ rg: "", comprovante: "", certidao: "" });

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

      await buscarFuncionariosETurmas();
      setVerificandoAcesso(false);
    }
    verificarAcesso();
  }, [router]);

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

  const mCEP = (v: string) => {
    v = v.replace(/\D/g, "");
    v = v.replace(/^(\d{5})(\d)/, "$1-$2");
    return v;
  };

  const buscarEnderecoPorCep = async (cepBuscado: string) => {
    const cepLimpo = cepBuscado.replace(/\D/g, "");
    if (cepLimpo.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setEndereco(`${data.logradouro}, Bairro: ${data.bairro}, ${data.localidade} - ${data.uf}`);
        }
      } catch (err) {
        console.error("Erro ao buscar CEP:", err);
      }
    }
  };

  async function buscarFuncionariosETurmas() {
    const [resFuncs, resTurmasInfo, resDisc] = await Promise.all([
      supabase.from('funcionarios').select('*').order('nome', { ascending: true }),
      supabase.from('turmas_info').select('*'),
      supabase.from('turma_disciplinas').select('*').eq('ano', '2026')
    ]);

    if (resFuncs.data) {
      const funcionariosComTurmas = resFuncs.data.map(func => {
        const funcNomeLimpo = (func.nome || "").trim().toLowerCase(); 

        const turmasViaInfo = (resTurmasInfo.data || [])
          .filter(t => 
            (t.prof_fixo_1 || "").trim().toLowerCase() === funcNomeLimpo || 
            (t.prof_fixo_2 || "").trim().toLowerCase() === funcNomeLimpo || 
            (t.prof_especifico_1 || "").trim().toLowerCase() === funcNomeLimpo || 
            (t.prof_especifico_2 || "").trim().toLowerCase() === funcNomeLimpo ||
            (t.auxiliar || "").trim().toLowerCase() === funcNomeLimpo ||
            (t.auxiliar_1 || "").trim().toLowerCase() === funcNomeLimpo ||
            (t.auxiliar_2 || "").trim().toLowerCase() === funcNomeLimpo
          )
          .map(t => t.nome_turma);

        const turmasViaDisciplinas = (resDisc.data || [])
          .filter(d => (d.professor_vinculado || "").trim().toLowerCase() === funcNomeLimpo)
          .map(d => d.nome_turma);

        let todasTurmas = Array.from(new Set([...turmasViaInfo, ...turmasViaDisciplinas]));

        // --- ORDENAÇÃO HIERÁRQUICA DAS TURMAS ---
        todasTurmas.sort((a, b) => {
          const nomeA = (a || "").toLowerCase().trim();
          const nomeB = (b || "").toLowerCase().trim();

          const indexA = LISTA_OFICIAL_TURMAS.findIndex(t => nomeA.includes(t.toLowerCase()));
          const indexB = LISTA_OFICIAL_TURMAS.findIndex(t => nomeB.includes(t.toLowerCase()));

          // Se a turma não for encontrada na lista oficial, joga para o final (peso 999)
          const pesoA = indexA === -1 ? 999 : indexA;
          const pesoB = indexB === -1 ? 999 : indexB;

          if (pesoA !== pesoB) return pesoA - pesoB;
          return nomeA.localeCompare(nomeB); // Desempate alfabético se ambas tiverem o mesmo peso
        });

        return {
          ...func,
          turmas_dinamicas: todasTurmas 
        };
      });

      setFuncionarios(funcionariosComTurmas);
    }
  }

  const funcionariosFiltrados = funcionarios.filter(f => 
    f.nome.toLowerCase().includes(busca.toLowerCase()) || 
    (f.cargo && f.cargo.toLowerCase().includes(busca.toLowerCase())) ||
    (f.turmas_dinamicas && f.turmas_dinamicas.some((t: string) => t.toLowerCase().includes(busca.toLowerCase())))
  );

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

  const fecharModalPrincipal = () => {
    if (modoEdicao && idEdicao) {
      setModoEdicao(false); 
    } else {
      setModalAberto(false); 
    }
  };

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
        nome: nome.trim(), 
        cpf: cpf || null, 
        data_nascimento: dataNascimento || null, 
        cargo, 
        whatsapp: whatsapp || null, 
        email: email ? email.trim() : null, 
        cep: cep || null,
        endereco: endereco || null,
        foto_url: urlFinal 
      };

      const { error: dbError } = idEdicao 
        ? await supabase.from('funcionarios').update(dados).eq('id', idEdicao)
        : await supabase.from('funcionarios').insert([dados]);

      if (dbError) throw dbError;

      if (idEdicao) {
        await registrarLog("EDIÇÃO", `Editou os dados do colaborador: ${nome.trim()} (Cargo: ${cargo || 'Não definido'})`);
      } else {
        await registrarLog("INSERÇÃO", `Cadastrou um novo colaborador: ${nome.trim()} (Cargo: ${cargo || 'Não definido'})`);
      }

      setModalAberto(false); 
      await buscarFuncionariosETurmas(); 
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
        await buscarFuncionariosETurmas();
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
        await buscarFuncionariosETurmas();
        
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
    setIdEdicao(null); setNome(""); setCpf(""); setDataNascimento(""); 
    setCargo(""); setWhatsapp(""); setEmail("");
    setCep(""); setEndereco(""); 
    setArquivoFoto(null); setPreviewUrl(null); setModoEdicao(false);
    setDocRG(null); setDocComprovante(null); setDocCertidao(null);
    setFotoOriginal(null); setCompletedCrop(undefined);
  }

  function abrirFicha(f: any) {
    setIdEdicao(f.id); setNome(f.nome); setCpf(f.cpf || ""); setDataNascimento(f.data_nascimento || "");
    setCargo(f.cargo || ""); setWhatsapp(f.whatsapp || ""); setEmail(f.email || "");
    setCep(f.cep || ""); setEndereco(f.endereco || ""); 
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

  if (verificandoAcesso) return <div className="p-[50px] text-center font-sans text-slate-500 font-bold animate-pulse">Validando acesso à equipe...</div>;

  return (
    <div className="w-full min-h-screen bg-slate-50 p-4 md:p-[30px] font-sans pb-24 md:pb-10">
      
      {/* HEADER DA PÁGINA */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 md:mb-[32px] gap-4 md:gap-[15px]">
        <div>
          <h1 className="text-2xl md:text-[28px] font-extrabold text-slate-900 tracking-tight m-0">Gestão de Equipe</h1>
          <p className="text-sm md:text-[15px] text-slate-500 mt-1">Controle central de colaboradores ABC DO PARK</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 md:gap-[12px] w-full md:w-auto">
          <input 
            type="text" 
            placeholder="🔍 Pesquisar colaborador..." 
            value={busca} 
            onChange={(e)=>setBusca(e.target.value)} 
            className="w-full sm:w-[280px] p-3 md:py-[12px] md:px-[18px] rounded-xl border border-slate-200 outline-none bg-white text-sm transition-colors shadow-sm focus:border-slate-400"
          />
          <button onClick={() => { limparFormulario(); setModoEdicao(true); setModalAberto(true); }} 
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-3 px-6 md:py-[12px] md:px-[24px] rounded-xl transition-all shadow-md active:scale-95 hover:-translate-y-px"
          >
            + NOVO COLABORADOR
          </button>
        </div>
      </div>

      {/* CONTAINER DA TABELA (Tabela no Desktop, Cards no Mobile) */}
      <div className="md:bg-white md:rounded-[16px] md:border md:border-slate-200 md:shadow-sm">
        <table className="w-full block md:table md:min-w-[800px] border-collapse text-left">
          <thead className="hidden md:table-header-group bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="w-[35%] px-[24px] py-[16px] text-xs font-bold text-slate-500 uppercase tracking-wider">Colaborador</th>
              <th className="w-[40%] px-[24px] py-[16px] text-xs font-bold text-slate-500 uppercase tracking-wider">Cargo & Turmas</th>
              <th className="w-[20%] px-[24px] py-[16px] text-xs font-bold text-slate-500 uppercase tracking-wider">Contato</th>
              <th className="w-[5%] px-[24px] py-[16px]"></th>
            </tr>
          </thead>
          <tbody className="block md:table-row-group space-y-4 md:space-y-0 md:divide-y md:divide-slate-100">
            {funcionariosFiltrados.length > 0 ? (
              funcionariosFiltrados.map((f) => (
                <tr 
                  key={f.id} 
                  onClick={() => abrirFicha(f)}
                  className="block md:table-row bg-white border border-slate-200 md:border-none rounded-2xl md:rounded-none p-4 md:p-0 relative shadow-sm md:shadow-none cursor-pointer hover:bg-slate-50 transition-colors"
                  title="Clique para ver a ficha completa"
                >
                  <td className="block md:table-cell p-0 md:px-[24px] md:py-[20px] mb-4 md:mb-0 border-b border-dashed border-slate-100 md:border-none pb-4 md:pb-0">
                    <div className="flex items-center gap-4 md:gap-[16px]">
                      <div className="w-14 h-14 md:w-[48px] md:h-[48px] rounded-full overflow-hidden shrink-0 border-2 border-slate-100 shadow-sm bg-blue-50 flex items-center justify-center">
                        {f.foto_url ? (
                          <img src={f.foto_url} className="w-full h-full object-cover" alt={f.nome} />
                        ) : (
                          <span className="text-2xl">👤</span>
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-base md:text-[15px] mb-0.5">{f.nome}</div>
                        <div className="text-slate-500 text-xs md:text-[13px]">{f.cpf ? mCPF(f.cpf) : 'CPF não informado'}</div>
                      </div>
                    </div>
                  </td>

                  <td className="block md:table-cell p-0 md:px-[24px] md:py-[20px] mb-4 md:mb-0">
                    <span className="md:hidden text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Cargo & Turmas</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center text-[11px] md:text-[12px] font-semibold text-blue-800 bg-blue-50 px-3 py-1.5 md:px-[12px] md:py-[6px] rounded-full border border-blue-200">
                        {f.cargo || "Não Definido"}
                      </span>
                      
                      {f.turmas_dinamicas && f.turmas_dinamicas.length > 0 && (
                        <>
                          <span className="text-slate-300 mx-1 hidden md:inline">|</span>
                          {f.turmas_dinamicas.map((tNome: string, idx: number) => (
                            <span key={idx} className="inline-flex items-center text-[10px] md:text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 md:px-[10px] md:py-[5px] rounded-full border border-emerald-200">
                              📚 {tNome}
                            </span>
                          ))}
                        </>
                      )}
                    </div>
                  </td>

                  <td className="block md:table-cell p-0 md:px-[24px] md:py-[20px]">
                    <span className="md:hidden text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Contato</span>
                    <div className="flex flex-col gap-1.5 md:gap-[4px]">
                      <div className="flex items-center gap-2 text-sm md:text-[14px] text-slate-700 font-medium">
                        <span>📱</span> {f.whatsapp ? mWhatsApp(f.whatsapp) : '--'}
                      </div>
                      <div className="flex items-center gap-2 text-xs md:text-[13px] text-slate-500">
                        <span>✉️</span> {f.email || '--'}
                      </div>
                    </div>
                  </td>

                  <td className="absolute md:relative right-4 top-8 md:right-auto md:top-auto block md:table-cell p-0 md:px-[24px] md:py-[20px] text-right text-slate-300 text-2xl md:text-lg">
                    <span className="inline-block md:scale-y-150 font-black">›</span>
                  </td>
                </tr>
              ))
            ) : (
              <tr className="block md:table-row bg-white border border-slate-200 md:border-none rounded-2xl md:rounded-none">
                <td colSpan={4} className="block md:table-cell p-10 text-center text-slate-500 text-sm md:text-[15px]">
                  Nenhum colaborador encontrado com essa busca.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL PRINCIPAL (FICHA/EDIÇÃO) */}
      {modalAberto && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 md:p-[15px]"
          onClick={fecharModalPrincipal}
        >
          
          {fotoOriginal && modoEdicao && (
              <div 
                className="absolute inset-0 bg-black/85 z-[1100] flex flex-col items-center justify-center p-4 md:p-[20px]"
                onClick={cancelarCorte}
              >
                  <div 
                    className="bg-white p-6 md:p-[24px] rounded-3xl md:rounded-[24px] text-center w-full max-w-lg max-h-[95%] flex flex-col shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                      <h3 className="mt-0 text-slate-900 font-extrabold mb-4">Ajustar Enquadramento (Capa do Card)</h3>
                      <div className="overflow-auto flex-1 bg-slate-50 rounded-2xl md:rounded-[16px] mb-5 flex items-center justify-center">
                        <ReactCrop crop={crop} onChange={(pixelCrop, percentCrop) => setCrop(percentCrop)} onComplete={(c) => setCompletedCrop(c)} aspect={aspect}>
                            <img ref={imgRef} src={fotoOriginal} alt="Crop" className="max-w-full max-h-[50vh] object-contain" onLoad={onImageLoad} />
                        </ReactCrop>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3 md:gap-[12px] justify-center">
                          <button type="button" onClick={cancelarCorte} className="w-full sm:w-auto p-3 md:py-[12px] md:px-[24px] rounded-xl bg-white border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-colors">Cancelar</button>
                          <button type="button" onClick={aplicarCorte} className="w-full sm:w-auto p-3 md:py-[12px] md:px-[24px] rounded-xl bg-blue-600 text-white font-bold border-none hover:bg-blue-700 transition-colors">Aplicar Corte</button>
                      </div>
                  </div>
              </div>
          )}

          <div 
            className="bg-white p-6 md:p-[32px] rounded-[24px] md:rounded-[28px] w-full max-w-[500px] max-h-[90vh] overflow-y-auto shadow-2xl custom-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            {!modoEdicao ? (
              <div className="text-center">
                <div className="w-full h-32 md:h-[160px] rounded-2xl md:rounded-[16px] bg-slate-100 mb-5 overflow-hidden border border-slate-200 relative shadow-inner">
                  {previewUrl ? (
                      <img src={previewUrl} className="w-full h-full object-cover" />
                  ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-indigo-100 to-blue-100">👤</div>
                  )}
                </div>

                <h2 className="m-0 mb-1 font-extrabold text-2xl md:text-[24px] text-slate-900">{nome}</h2>
                
                <div className="flex flex-col items-center gap-2 mt-2">
                  <span className="inline-block text-blue-800 font-extrabold text-xs md:text-[12px] bg-blue-50 px-4 py-1.5 md:py-[6px] md:px-[16px] rounded-full border border-blue-100">{cargo}</span>
                  
                  {funcionarios.find(f => f.id === idEdicao)?.turmas_dinamicas?.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap justify-center mt-1">
                      {funcionarios.find(f => f.id === idEdicao).turmas_dinamicas.map((tNome: string, idx: number) => (
                        <span key={idx} className="inline-block text-emerald-800 font-extrabold text-[10px] md:text-[11px] bg-emerald-50 px-2.5 py-1 md:py-[4px] md:px-[10px] rounded-full border border-emerald-100">
                          📚 {tNome}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="text-left bg-slate-50 p-4 md:p-[20px] rounded-2xl md:rounded-[20px] mt-6 md:mt-[24px] flex flex-col gap-3 md:gap-[12px] border border-slate-100 shadow-sm">
                  <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
                    <span className="text-xs md:text-[13px] text-slate-500 font-bold">CPF</span>
                    <span className="text-sm md:text-[14px] text-slate-900 font-semibold">{mCPF(cpf) || '--'}</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
                    <span className="text-xs md:text-[13px] text-slate-500 font-bold">Nascimento</span>
                    <span className="text-sm md:text-[14px] text-slate-900 font-semibold">{dataNascimento ? new Date(dataNascimento).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : '--'}</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
                    <span className="text-xs md:text-[13px] text-slate-500 font-bold">WhatsApp</span>
                    <span className="text-sm md:text-[14px] text-slate-900 font-semibold">{mWhatsApp(whatsapp) || '--'}</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
                    <span className="text-xs md:text-[13px] text-slate-500 font-bold">E-mail</span>
                    <span className="text-sm md:text-[14px] text-slate-900 font-semibold truncate max-w-[150px] md:max-w-none">{email || '--'}</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
                    <span className="text-xs md:text-[13px] text-slate-500 font-bold">CEP</span>
                    <span className="text-sm md:text-[14px] text-slate-900 font-semibold">{mCEP(cep) || '--'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs md:text-[13px] text-slate-500 font-bold mb-1">Endereço</span>
                    <span className="text-sm md:text-[14px] text-slate-900 font-semibold leading-snug">{endereco || '--'}</span>
                  </div>
                </div>

                <button 
                  onClick={abrirModalDocs}
                  className="w-full p-3.5 md:p-[14px] rounded-xl md:rounded-[14px] border border-slate-200 bg-slate-50 hover:bg-slate-100 font-bold text-slate-600 mt-6 flex items-center justify-center gap-2 transition-colors active:scale-95 text-xs md:text-sm"
                >
                  📂 DOCUMENTOS DO COLABORADOR
                </button>

                <div className="flex flex-col sm:flex-row gap-2 md:gap-[12px] mt-4 md:mt-[16px]">
                  <button onClick={() => setModalAberto(false)} className="w-full sm:flex-1 p-3.5 md:p-[14px] rounded-xl bg-white border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-colors text-xs md:text-sm">FECHAR</button>
                  <button onClick={() => setModoEdicao(true)} className="w-full sm:flex-1 p-3.5 md:p-[14px] rounded-xl bg-blue-600 text-white font-bold border-none hover:bg-blue-700 transition-colors shadow-md text-xs md:text-sm">EDITAR</button>
                  <button onClick={excluirFuncionario} className="p-3.5 md:p-[14px] rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-500 border-none transition-colors shrink-0" title="Excluir Colaborador">🗑️</button>
                </div>
              </div>
            ) : (
              <form onSubmit={salvarFuncionario} className="flex flex-col gap-4 md:gap-[16px]">
                <h2 className="text-center font-extrabold text-slate-900 m-0 mb-2 md:mb-[10px] text-xl md:text-2xl">{idEdicao ? "Editar Colaborador" : "Novo Colaborador"}</h2>
                
                <label className="cursor-pointer mb-2 md:mb-[10px] block relative group">
                  <div className="w-full aspect-video rounded-2xl md:rounded-[16px] border-2 border-dashed border-slate-300 overflow-hidden bg-slate-50 flex items-center justify-center relative transition-colors group-hover:border-blue-600 group-hover:bg-blue-50/30">
                    {previewUrl ? <img src={previewUrl} className="w-full h-full object-cover" /> : <div className="flex flex-col items-center"><span className="text-3xl md:text-[24px] mb-2">📸</span><span className="text-xs md:text-[13px] text-slate-500 font-bold group-hover:text-blue-600">Clique para Capa (16:9)</span></div>}
                  </div>
                  <input type="file" accept="image/*" hidden onChange={handleTrocarFoto} />
                </label>

                <input type="text" placeholder="Nome Completo" value={nome} onChange={(e)=>setNome(e.target.value)} required className="w-full p-3 md:p-[14px] rounded-xl border border-slate-200 outline-none text-sm md:text-[15px] focus:border-blue-400 bg-slate-50 focus:bg-white transition-colors" />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-[12px]">
                    <input type="text" placeholder="CPF" value={cpf} onChange={(e)=>setCpf(mCPF(e.target.value))} className="w-full p-3 md:p-[14px] rounded-xl border border-slate-200 outline-none text-sm md:text-[15px] focus:border-blue-400 bg-slate-50 focus:bg-white transition-colors" />
                    <input type="date" value={dataNascimento} onChange={(e)=>setDataNascimento(e.target.value)} className="w-full p-3 md:p-[14px] rounded-xl border border-slate-200 outline-none text-sm md:text-[15px] focus:border-blue-400 bg-slate-50 focus:bg-white transition-colors" />
                </div>

                <select value={cargo} onChange={(e)=>setCargo(e.target.value)} required className={`w-full p-3 md:p-[14px] rounded-xl border border-slate-200 outline-none text-sm md:text-[15px] focus:border-blue-400 bg-slate-50 focus:bg-white transition-colors ${cargo ? 'text-slate-900' : 'text-slate-400'}`}>
                  <option value="" disabled>Selecione o Cargo...</option>
                  <option value="Professor">Professor(a)</option>
                  <option value="Auxiliar">Auxiliar</option>
                  <option value="Coordenação">Coordenação</option>
                  <option value="Serviços Gerais">Serviços Gerais</option>
                  <option value="Outro">Outro</option>
                </select>
                
                {(cargo === "Professor" || cargo === "Auxiliar") && (
                  <div className="text-[11px] md:text-[12px] text-emerald-700 bg-emerald-50 px-3 md:px-[12px] py-2 md:py-[8px] rounded-lg border border-emerald-200 shadow-sm leading-relaxed">
                    💡 <b>Dica:</b> O vínculo das turmas deste colaborador é feito automaticamente pela aba <b>"Turmas"</b>. 
                  </div>
                )}

                <input type="text" placeholder="WhatsApp" value={whatsapp} onChange={(e)=>setWhatsapp(mWhatsApp(e.target.value))} className="w-full p-3 md:p-[14px] rounded-xl border border-slate-200 outline-none text-sm md:text-[15px] focus:border-blue-400 bg-slate-50 focus:bg-white transition-colors" />
                <input type="email" placeholder="E-mail" value={email} onChange={(e)=>setEmail(e.target.value)} className="w-full p-3 md:p-[14px] rounded-xl border border-slate-200 outline-none text-sm md:text-[15px] focus:border-blue-400 bg-slate-50 focus:bg-white transition-colors" />

                <div className="flex flex-col md:flex-row gap-3 md:gap-[12px]">
                  <input 
                    type="text" 
                    placeholder="CEP" 
                    value={cep} 
                    onChange={(e)=>setCep(mCEP(e.target.value))} 
                    onBlur={(e)=>buscarEnderecoPorCep(e.target.value)}
                    className="w-full md:flex-1 p-3 md:p-[14px] rounded-xl border border-slate-200 outline-none text-sm md:text-[15px] focus:border-blue-400 bg-slate-50 focus:bg-white transition-colors" 
                  />
                  <input 
                    type="text" 
                    placeholder="Endereço Completo" 
                    value={endereco} 
                    onChange={(e)=>setEndereco(e.target.value)} 
                    className="w-full md:flex-[2] p-3 md:p-[14px] rounded-xl border border-slate-200 outline-none text-sm md:text-[15px] focus:border-blue-400 bg-slate-50 focus:bg-white transition-colors" 
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 md:gap-[12px] mt-2 md:mt-[16px]">
                  <button type="button" onClick={() => idEdicao ? setModoEdicao(false) : setModalAberto(false)} className="w-full sm:flex-1 py-3 md:py-[14px] rounded-xl bg-white border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-colors text-xs md:text-sm">CANCELAR</button>
                  <button type="submit" disabled={carregando} className="w-full sm:flex-1 py-3 md:py-[14px] rounded-xl bg-blue-600 text-white font-bold border-none hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50 text-xs md:text-sm">
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
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1010] flex items-center justify-center p-4 md:p-[15px]"
          onClick={() => setModalDocsAberto(false)}
        >
          <div 
            className="bg-white p-6 md:p-[32px] rounded-[24px] md:rounded-[28px] w-full max-w-[500px] max-h-[90vh] overflow-y-auto shadow-2xl custom-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-center font-extrabold mt-0 mb-1 text-slate-900 text-xl md:text-[22px]">Documentos Obrigatórios</h2>
            <p className="text-center text-slate-500 text-xs md:text-[14px] mb-6 md:mb-[24px]">{nome}</p>

            <form onSubmit={salvarDocumentos} className="flex flex-col gap-3 md:gap-[16px]">
              
              <div className="flex flex-col gap-2 bg-slate-50 p-4 md:p-[16px] rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center">
                  <label className="text-xs md:text-[14px] font-extrabold text-slate-700">Registro Geral (RG)</label>
                  {urlsDocs.rg && <a href={urlsDocs.rg} target="_blank" rel="noreferrer" className="text-[10px] md:text-[11px] text-blue-600 font-bold bg-blue-50 px-2 py-1 md:px-[10px] md:py-[6px] rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors">👁️ Visualizar Arquivo</a>}
                </div>
                <input type="file" accept=".pdf,image/*" onChange={(e) => setDocRG(e.target.files?.[0] || null)} className="text-[11px] md:text-[13px] p-2 md:p-[10px] border border-dashed border-slate-300 rounded-xl bg-white text-slate-600 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer" />
              </div>

              <div className="flex flex-col gap-2 bg-slate-50 p-4 md:p-[16px] rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center">
                  <label className="text-xs md:text-[14px] font-extrabold text-slate-700">Comprovante Residência</label>
                  {urlsDocs.comprovante && <a href={urlsDocs.comprovante} target="_blank" rel="noreferrer" className="text-[10px] md:text-[11px] text-blue-600 font-bold bg-blue-50 px-2 py-1 md:px-[10px] md:py-[6px] rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors">👁️ Visualizar Arquivo</a>}
                </div>
                <input type="file" accept=".pdf,image/*" onChange={(e) => setDocComprovante(e.target.files?.[0] || null)} className="text-[11px] md:text-[13px] p-2 md:p-[10px] border border-dashed border-slate-300 rounded-xl bg-white text-slate-600 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer" />
              </div>

              <div className="flex flex-col gap-2 bg-slate-50 p-4 md:p-[16px] rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center">
                  <label className="text-xs md:text-[14px] font-extrabold text-slate-700">Certidão Nascimento</label>
                  {urlsDocs.certidao && <a href={urlsDocs.certidao} target="_blank" rel="noreferrer" className="text-[10px] md:text-[11px] text-blue-600 font-bold bg-blue-50 px-2 py-1 md:px-[10px] md:py-[6px] rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors">👁️ Visualizar Arquivo</a>}
                </div>
                <input type="file" accept=".pdf,image/*" onChange={(e) => setDocCertidao(e.target.files?.[0] || null)} className="text-[11px] md:text-[13px] p-2 md:p-[10px] border border-dashed border-slate-300 rounded-xl bg-white text-slate-600 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer" />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 md:gap-[12px] mt-4 md:mt-[16px]">
                <button type="button" onClick={() => setModalDocsAberto(false)} className="w-full sm:flex-1 py-3 md:py-[14px] rounded-xl bg-white border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-colors text-xs md:text-sm">FECHAR</button>
                <button type="submit" disabled={carregando} className="w-full sm:flex-1 py-3 md:py-[14px] rounded-xl bg-emerald-500 text-white font-bold border-none hover:bg-emerald-600 transition-colors shadow-md disabled:opacity-50 text-xs md:text-sm">
                  {carregando ? "SALVANDO..." : "SALVAR DOCS"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ajuste Global para Rolagem Elegante */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}} />
    </div>
  );
}