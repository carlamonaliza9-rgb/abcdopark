"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

// Lista imutável dos documentos exigidos pela escola
const DOCUMENTOS_EXIGIDOS = [
  { id: "rg_responsavel", nome: "RG do Responsável", descricao: "Frente e verso legíveis" },
  { id: "cpf_responsavel", nome: "CPF do Responsável", descricao: "Comprovante de situação cadastral" },
  { id: "rg_aluno", nome: "RG do Aluno", descricao: "Documento de identidade do estudante" },
  { id: "cpf_aluno", nome: "CPF do Aluno", descricao: "Documento do estudante" },
  { id: "certidao_nascimento", nome: "Certidão de Nascimento", descricao: "Certidão de nascimento do aluno" },
  { id: "comprovante_residencia", nome: "Comprovante de Residência", descricao: "Atualizado (últimos 3 meses)" },
  { id: "historico_escolar", nome: "Histórico Escolar", descricao: "Documentação de transferência ou anos anteriores" },
  { id: "ressalva", nome: "Ressalva", descricao: "Termo de pendência ou declaração provisória" }
];

export default function PastaDocumentosAlunoPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const alunoId = resolvedParams.id;

  const [aluno, setAluno] = useState<any>(null);
  const [arquivosEnviados, setArquivosEnviados] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [processandoId, setProcessandoId] = useState<string | null>(null);
  
  const [ehVisitante, setEhVisitante] = useState(true);

  useEffect(() => {
    initPage();
  }, [alunoId]);

  async function initPage() {
    setCarregando(true);
    
    // 1. Validação de Acesso
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push("/login");

    const emailAtual = user.email || "";
    const { data: perfil } = await supabase.from('perfis').select('cargo').eq('id', user.id).single();
    
    // Apenas Admin e Direção podem alterar os documentos
    const isVisitante = emailAtual !== 'carlamonaliza9@gmail.com' && emailAtual !== 'diretoria@abcdopark.com' && perfil?.cargo !== 'Admin' && perfil?.cargo !== 'Direção';
    setEhVisitante(isVisitante);

    // 2. Busca Dados do Aluno para o Cabeçalho
    const { data: dataAluno } = await supabase.from('alunos').select('nome, turma').eq('id', alunoId).single();
    if (!dataAluno) {
      alert("Aluno não encontrado.");
      return router.push('/admin/alunos');
    }
    setAluno(dataAluno);

    // 3. Busca a pasta digital do aluno
    await carregarArquivosDoBanco();
    setCarregando(false);
  }

  async function carregarArquivosDoBanco() {
    const { data } = await supabase
      .from('documentos_alunos')
      .select('*')
      .eq('aluno_id', alunoId);
      
    if (data) setArquivosEnviados(data);
  }

  // --- FUNÇÃO PARA SALVAR O ARQUIVO NO SUPABASE STORAGE ---
  async function handleAnexarArquivo(e: React.ChangeEvent<HTMLInputElement>, tipoDocumentoId: string) {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const arquivo = e.target.files[0];
    
    // Trava de tamanho: 10MB máximo
    if (arquivo.size > 10 * 1024 * 1024) {
      return alert("Arquivo muito grande. O limite é de 10MB.");
    }

    setProcessandoId(tipoDocumentoId);
    try {
      const extensao = arquivo.name.split('.').pop();
      const nomeDoArquivoNoStorage = `${alunoId}/${tipoDocumentoId}_${Date.now()}.${extensao}`;

      // 1. Faz o upload físico do arquivo para o bucket 'documentos-alunos'
      const { error: uploadError } = await supabase.storage
        .from('documentos-alunos')
        .upload(nomeDoArquivoNoStorage, arquivo, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      // 2. Pega o link público gerado
      const urlPublica = supabase.storage.from('documentos-alunos').getPublicUrl(nomeDoArquivoNoStorage).data.publicUrl;

      // 3. Salva a referência na tabela para sabermos que ele entregou
      const { error: dbError } = await supabase.from('documentos_alunos').upsert({
        aluno_id: alunoId,
        tipo_documento: tipoDocumentoId,
        url_arquivo: urlPublica,
        status: "Entregue",
        data_atualizacao: new Date().toISOString()
      }, { onConflict: 'aluno_id,tipo_documento' });

      if (dbError) throw dbError;

      await carregarArquivosDoBanco();
    } catch (error: any) {
      alert("Falha ao salvar o documento: " + error.message);
    } finally {
      setProcessandoId(null);
    }
  }

  // --- FUNÇÃO PARA DELETAR O ARQUIVO ---
  async function handleExcluirArquivo(idDoRegistro: string, tipoDocumentoId: string) {
    if (!confirm("Tem certeza que deseja apagar este documento? Ele constará como Pendente novamente.")) return;

    setProcessandoId(tipoDocumentoId);
    try {
      const { error } = await supabase
        .from('documentos_alunos')
        .delete()
        .eq('id', idDoRegistro);

      if (error) throw error;

      await carregarArquivosDoBanco();
    } catch (error: any) {
      alert("Erro ao excluir: " + error.message);
    } finally {
      setProcessandoId(null);
    }
  }

  if (carregando) {
    return <div className="flex justify-center items-center h-screen bg-slate-50 text-slate-500 font-bold tracking-wide">Acessando Pasta Digital...</div>;
  }

  const quantidadeEntregue = arquivosEnviados.length;
  const totalExigido = DOCUMENTOS_EXIGIDOS.length;
  const porcentagem = Math.round((quantidadeEntregue / totalExigido) * 100);

  return (
    <div className="w-full bg-[#f8fafc] min-h-screen font-sans antialiased text-slate-800 pb-24 md:p-6 lg:p-8">
      <div className="max-w-[1200px] w-full mx-auto space-y-6 lg:space-y-8 animate-in fade-in duration-300">
        
        {/* BANNER DO ALUNO */}
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-sky-600 to-indigo-600 opacity-10"></div>
          
          <div className="p-6 md:p-8 relative z-10 flex flex-col sm:flex-row items-center gap-6">
            <button 
              onClick={() => router.push(`/admin/alunos/${alunoId}`)}
              className="bg-white border border-slate-200 text-slate-600 hover:text-slate-900 px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-2"
            >
              ← Voltar à Ficha
            </button>
            <div className="text-center sm:text-left flex-1">
              <div className="inline-block px-3 py-1 bg-sky-50 text-sky-700 text-[10px] font-black tracking-wider rounded-lg mb-1.5 uppercase border border-sky-100">
                Pasta Digital do Aluno
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{aluno?.nome}</h1>
              <p className="text-sm font-bold text-slate-500 mt-1">Turma: {aluno?.turma}</p>
            </div>
            
            {/* PROGRESSO CIRCULAR / BADGE */}
            <div className="bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl flex flex-col items-center justify-center shadow-inner">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Checklist</span>
              <span className={`text-xl font-black ${porcentagem === 100 ? 'text-emerald-600' : 'text-amber-500'}`}>
                {quantidadeEntregue} / {totalExigido}
              </span>
            </div>
          </div>
        </div>

        {/* CONTAINER DO CHECKLIST DE DOCUMENTOS */}
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 md:p-8">
          <div className="border-b border-slate-100 pb-5 mb-6">
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Documentação Pessoal</h2>
            <p className="text-xs font-semibold text-slate-400 mt-1">Gerencie os arquivos entregues pelo aluno e responsáveis no ato da matrícula.</p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {DOCUMENTOS_EXIGIDOS.map((docExigido) => {
              // Verifica se o aluno já enviou este documento específico
              const arquivoNoBanco = arquivosEnviados.find(arq => arq.tipo_documento === docExigido.id);
              const estaProcessando = processandoId === docExigido.id;

              return (
                <div key={docExigido.id} className="p-4 md:p-5 bg-slate-50/50 rounded-2xl border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-indigo-200 transition-colors group">
                  
                  {/* INFORMAÇÕES DO DOCUMENTO */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {arquivoNoBanco ? (
                         <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      ) : (
                         <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                      )}
                      <h3 className="text-sm md:text-base font-bold text-slate-800">{docExigido.nome}</h3>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium pl-4">{docExigido.descricao}</p>
                  </div>

                  {/* AÇÕES (ENVIAR, VER, EXCLUIR) */}
                  <div className="flex items-center gap-3 w-full md:w-auto justify-end border-t border-slate-200/60 md:border-none pt-3 md:pt-0">
                    {estaProcessando ? (
                      <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-500">
                        <div className="w-4 h-4 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin"></div>
                        Processando...
                      </div>
                    ) : arquivoNoBanco ? (
                      <>
                        <span className="text-[10px] font-black px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg uppercase tracking-wider border border-emerald-200">Entregue</span>
                        <a 
                          href={arquivoNoBanco.url_arquivo} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="bg-white border border-slate-200 hover:border-sky-300 hover:text-sky-700 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                        >
                          👁️ Ver Arquivo
                        </a>
                        {!ehVisitante && (
                          <button 
                            onClick={() => handleExcluirArquivo(arquivoNoBanco.id, docExigido.id)} 
                            className="bg-rose-50 border border-rose-200 hover:bg-rose-600 hover:text-white text-rose-600 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
                            title="Apagar este documento"
                          >
                            🗑️
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="text-[10px] font-black px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg uppercase tracking-wider border border-rose-100">Pendente</span>
                        {!ehVisitante && (
                          <label className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-xs font-bold cursor-pointer shadow-md shadow-indigo-200 transition-all flex items-center gap-1.5">
                            📤 Anexar PDF/Foto
                            <input 
                              type="file" 
                              accept="image/*,.pdf" 
                              onChange={(e) => handleAnexarArquivo(e, docExigido.id)} 
                              className="hidden" 
                            />
                          </label>
                        )}
                      </>
                    )}
                  </div>

                </div>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
}