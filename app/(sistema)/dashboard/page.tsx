"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function DashboardRedirectorPage() {
  const router = useRouter();

  // Novos estados para controlar a tela de escolha de múltiplos filhos
  const [filhosEncontrados, setFilhosEncontrados] = useState<any[]>([]);
  const [escolhendoFilho, setEscolhendoFilho] = useState(false);

  useEffect(() => {
    async function verificarAcesso() {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Se não estiver logado, volta para a raiz (onde está o seu login)
      if (!user) return router.push("/");

      const emailAtual = user.email || "";
      
      // Busca o cargo do usuário logado na tabela de perfis
      const { data: perfil } = await supabase
        .from('perfis')
        .select('cargo')
        .eq('id', user.id)
        .single();
      
      // --- REGRA: ADMIN ---
      const ehAdmin = 
        emailAtual === 'carlamonaliza9@gmail.com' || 
        emailAtual === 'diretoria@abcdopark.com' || 
        perfil?.cargo === 'Admin';

      if (ehAdmin) {
        return router.push("/admin/dashboard");
      }

      // --- REGRA: PROFESSOR ---
      const ehProfessor = perfil?.cargo === 'Professor';
      if (ehProfessor) {
        return router.push("/professor/dashboard");
      }

      // --- REGRA: RESPONSÁVEL (PAIS) ---
      if (perfil?.cargo === 'Responsável') {
        // Busca o ID e o nome do aluno vinculado a este e-mail nas colunas de responsáveis
        // Removido o .maybeSingle() para trazer todos os registros correspondentes
        const { data: alunosVinculados } = await supabase
          .from('alunos')
          .select('id, nome')
          .or(`email_responsavel.eq.${emailAtual},email_responsavel_2.eq.${emailAtual},email_responsavel_3.eq.${emailAtual}`);

        if (alunosVinculados && alunosVinculados.length > 0) {
          if (alunosVinculados.length === 1) {
            // Se encontrar apenas 1 aluno, vai direto para o portal
            return router.push(`/portal-pais/${alunosVinculados[0].id}`);
          } else {
            // Se encontrar 2 ou mais, pausa o redirecionamento e ativa a tela de escolha
            setFilhosEncontrados(alunosVinculados);
            setEscolhendoFilho(true);
            return;
          }
        }
      }

      // Caso seja um e-mail de pai que ainda não foi vinculado na tabela de alunos
      // Tentamos uma busca direta por precaução antes de barrar o acesso
      const { data: buscaExtra } = await supabase
        .from('alunos')
        .select('id, nome')
        .or(`email_responsavel.eq.${emailAtual},email_responsavel_2.eq.${emailAtual},email_responsavel_3.eq.${emailAtual}`);

      if (buscaExtra && buscaExtra.length > 0) {
        if (buscaExtra.length === 1) {
          return router.push(`/portal-pais/${buscaExtra[0].id}`);
        } else {
          setFilhosEncontrados(buscaExtra);
          setEscolhendoFilho(true);
          return;
        }
      }

      // Se não cair em nenhuma regra ou não tiver aluno vinculado, manda para a home por segurança
      router.push("/");
    }
    verificarAcesso();
  }, [router]);

  // --- TELA DE ESCOLHA (Aparece apenas se tiver + de 1 filho) ---
  if (escolhendoFilho) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-2xl bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center">
          <img 
            src="https://mnmakhazghgncqummksu.supabase.co/storage/v1/object/public/assets/logo.png" 
            alt="Logo ABC DO PARK" 
            className="h-20 mx-auto mb-6 object-contain" 
          />
          <h1 className="text-2xl font-bold text-blue-900 mb-2">Bem-vindo(a) à Família ABC!</h1>
          <p className="text-gray-500 mb-8">Identificamos mais de um aluno vinculado ao seu e-mail. Qual portal você deseja acessar agora?</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filhosEncontrados.map((filho) => (
              <button
                key={filho.id}
                onClick={() => router.push(`/portal-pais/${filho.id}`)}
                className="flex flex-col items-center justify-center p-6 bg-blue-50 border-2 border-transparent hover:border-blue-400 hover:bg-blue-100 rounded-xl transition-all group"
              >
                <div className="w-16 h-16 bg-blue-200 text-blue-700 rounded-full flex items-center justify-center text-xl font-bold mb-3 group-hover:scale-110 transition-transform">
                  {filho.nome ? filho.nome.charAt(0).toUpperCase() : "A"}
                </div>
                <span className="font-bold text-blue-900 text-lg">
                  {filho.nome || "Aluno sem nome"}
                </span>
                <span className="text-sm text-blue-600 mt-1">Acessar Portal ➔</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- TELA DE CARREGAMENTO PADRÃO ---
  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      backgroundColor: '#f9fafb' 
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          border: '4px solid #dbeafe', 
          borderTop: '4px solid #2563eb', 
          borderRadius: '50%', 
          animation: 'spin 1s linear infinite',
          margin: '0 auto 20px'
        }}></div>
        <p style={{ color: '#2563eb', fontWeight: 'bold', fontSize: '14px', letterSpacing: '0.05em' }}>
          VALIDANDO SEU ACESSO...
        </p>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}