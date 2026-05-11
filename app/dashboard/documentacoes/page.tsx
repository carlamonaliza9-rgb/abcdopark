"use client";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function DocumentacoesRedirector() {
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

      if (ehAdmin) {
        router.push("/admin/documentacoes");
      } else {
        router.push("/dashboard");
      }
    }
    verificarAcesso();
  }, [router]);

  return <div style={{ padding: '50px', textAlign: 'center', color: '#1e293b', fontWeight: 'bold' }}>Acessando documentos da secretaria...</div>;
}