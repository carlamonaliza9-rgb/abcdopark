"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

// Importação dos subcomponentes (que criaremos a seguir)
import MenuOpcoes from "./_components/MenuOpcoes";
import PainelComunicados from "./_components/PainelComunicados";
import PainelProvas from "./_components/PainelProvas";
import PainelCodes from "./_components/PainelCodes";
import PainelDocumentosGerais from "./_components/PainelDocumentosGerais";

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

  if (verificandoAcesso) return <div style={{ padding: '50px', textAlign: 'center', color: '#64748b' }}>Validando credenciais...</div>;

  return (
    <div style={{ padding: 'clamp(15px, 5vw, 30px)', backgroundColor: '#f9fafb', minHeight: '100vh', fontFamily: 'sans-serif' }}>

      {!documentoAtivo ? (
        <MenuOpcoes setDocumentoAtivo={setDocumentoAtivo} />
      ) : (
        <div style={{ animation: 'fadeIn 0.3s' }}>
          <button 
            onClick={() => setDocumentoAtivo(null)} 
            style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 'bold', cursor: 'pointer', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '5px' }}
          >
            ← Voltar para opções
          </button>

          {/* ROTEAMENTO DE PAINÉIS */}
          {documentoAtivo === 'comunicados' && <PainelComunicados />}
          {documentoAtivo === 'provas' && <PainelProvas />}
          {documentoAtivo === 'codes' && <PainelCodes alunos={alunos} />}
          {['matricula', 'quitacao', 'ressalva', 'notificacao'].includes(documentoAtivo) && (
            <PainelDocumentosGerais alunos={alunos} documentoAtivo={documentoAtivo} />
          )}
        </div>
      )}
    </div>
  );
}