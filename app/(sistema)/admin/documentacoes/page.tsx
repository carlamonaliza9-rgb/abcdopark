"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react"; 

// Importação dos subcomponentes 
import MenuOpcoes from "./_components/MenuOpcoes";
import PainelComunicados from "./_components/PainelComunicados";
import PainelProvas from "./_components/PainelProvas";
import PainelCodes from "./_components/PainelCodes";
import PainelDocumentosGerais from "./_components/PainelDocumentosGerais";
import PainelHistorico from "./_components/PainelHistorico"; // Novo Painel Importado

export default function DocumentacoesAdminPage() {
  const router = useRouter();
  const [verificandoAcesso, setVerificandoAcesso] = useState(true);
  const [alunos, setAlunos] = useState<any[]>([]);
  const [documentoAtivo, setDocumentoAtivo] = useState<string | null>(null);

  // --- TRAVA DE SEGURANÇA E CARREGAMENTO INICIAL ---
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

      buscarAlunos(); 
      setVerificandoAcesso(false);
    }
    verificarAcesso();
  }, [router]);

  async function buscarAlunos() {
    const { data } = await supabase.from("alunos").select("*").order("nome");
    if (data) setAlunos(data);
  }

  if (verificandoAcesso) return <div className="p-12 text-center text-slate-500 font-medium w-full">Validando credenciais...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans w-full flex flex-col">
      <div className="w-full flex-1 p-6 md:p-8 lg:p-10">
        
        {!documentoAtivo ? (
          <MenuOpcoes setDocumentoAtivo={setDocumentoAtivo} />
        ) : (
          <div className="w-full animate-in fade-in duration-300">
            <button 
              onClick={() => setDocumentoAtivo(null)} 
              className="group flex items-center gap-2 text-blue-600 font-bold hover:text-blue-700 transition-colors mb-8"
            >
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
              Voltar para opções
            </button>

            {/* ROTEAMENTO DE PAINÉIS */}
            <div className="w-full">
              {documentoAtivo === 'comunicados' && <PainelComunicados />}
              {documentoAtivo === 'provas' && <PainelProvas />}
              {documentoAtivo === 'codes' && <PainelCodes alunos={alunos} />}
              {documentoAtivo === 'historico' && <PainelHistorico />}
              
              {['matricula', 'quitacao', 'ressalva', 'notificacao'].includes(documentoAtivo) && (
                <PainelDocumentosGerais alunos={alunos} documentoAtivo={documentoAtivo} />
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}