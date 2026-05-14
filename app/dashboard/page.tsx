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
      const { data: perfil } = await supabase.from('perfis').select('cargo').eq('id', user.id).single();
      
      const ehAdmin = 
        emailAtual === 'carlamonaliza9@gmail.com' || 
        emailAtual === 'diretoria@abcdopark.com' || 
        perfil?.cargo === 'Admin';

      if (ehAdmin) {
        return router.push("/admin/dashboard");
      }

      const ehProfessor = perfil?.cargo === 'Professor';
      if (ehProfessor) {
        return router.push("/professor/dashboard");
      }

      // --- CAMINHO DOS PAIS ---
      // Verifica se o e-mail consta em alguma coluna de responsável na tabela de alunos
      const { data: alunoVinculado } = await supabase
        .from('alunos')
        .select('id')
        .or(`email_responsavel.eq.${emailAtual},email_responsavel_2.eq.${emailAtual},email_responsavel_3.eq.${emailAtual}`)
        .maybeSingle();

      if (alunoVinculado) {
        return router.push(`/portal-pais/${alunoVinculado.id}`);
      }

      // Se não cair em nenhuma regra, por segurança, manda para a home
      router.push("/");
    }
    verificarAcesso();
  }, [router]);

  return <div style={{ padding: '40px', textAlign: 'center', color: '#2563eb', fontWeight: 'bold' }}>Validando sua visão...</div>;
}