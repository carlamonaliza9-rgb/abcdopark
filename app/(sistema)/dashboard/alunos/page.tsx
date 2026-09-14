"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AlunosRedirectorPage() {
  const router = useRouter();

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

      // Administradores vão para a nova gestão, outros voltam para o dashboard
      if (ehAdmin) {
        router.push("/admin/alunos");
      } else {
        router.push("/dashboard");
      }
    }
    verificarAcesso();
  }, [router]);

  return <div className="p-10 text-center text-blue-600 font-bold">Direcionando para o painel de alunos...</div>;
}