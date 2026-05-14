"use client";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function DashboardRedirectorPage() {
  const router = useRouter();

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
        // Busca o ID do aluno vinculado a este e-mail nas colunas de responsáveis
        const { data: alunoVinculado } = await supabase
          .from('alunos')
          .select('id')
          .or(`email_responsavel.eq.${emailAtual},email_responsavel_2.eq.${emailAtual},email_responsavel_3.eq.${emailAtual}`)
          .maybeSingle();

        if (alunoVinculado) {
          return router.push(`/portal-pais/${alunoVinculado.id}`);
        }
      }

      // Caso seja um e-mail de pai que ainda não foi vinculado na tabela de alunos
      // Tentamos uma busca direta por precaução antes de barrar o acesso
      const { data: buscaExtra } = await supabase
        .from('alunos')
        .select('id')
        .or(`email_responsavel.eq.${emailAtual},email_responsavel_2.eq.${emailAtual},email_responsavel_3.eq.${emailAtual}`)
        .maybeSingle();

      if (buscaExtra) {
        return router.push(`/portal-pais/${buscaExtra.id}`);
      }

      // Se não cair em nenhuma regra ou não tiver aluno vinculado, manda para a home por segurança
      router.push("/");
    }
    verificarAcesso();
  }, [router]);

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