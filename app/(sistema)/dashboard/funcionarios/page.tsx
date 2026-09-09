"use client";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { temPermissao } from "@/lib/auth/permissions";

export default function FuncionariosRedirector() {
  const router = useRouter();

  useEffect(() => {
    async function verificarAcesso() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/");

      const { data: perfil } = await supabase.from('perfis').select('cargo').eq('id', user.id).single();

      const ehAdmin = temPermissao(perfil?.cargo, 'funcionarios.visualizar');

      if (ehAdmin) {
        router.push("/admin/funcionarios");
      } else {
        router.push("/dashboard");
      }
    }
    verificarAcesso();
  }, [router]);

  return <div style={{ padding: '50px', textAlign: 'center', color: '#111827', fontWeight: 'bold' }}>Organizando painel da equipe...</div>;
}
