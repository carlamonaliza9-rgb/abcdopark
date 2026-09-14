"use client";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function TurmasRedirector() {
  const router = useRouter();

  useEffect(() => {
    async function verificar() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");

      const email = user.email || "";
      const { data: perfil } = await supabase.from('perfis').select('cargo').eq('id', user.id).single();
      const ehAdmin = email === 'carlamonaliza9@gmail.com' || email === 'diretoria@abcdopark.com' || perfil?.cargo === 'Admin';

      if (ehAdmin) {
        router.push("/admin/turmas");
      } else {
        router.push("/professor/turmas");
      }
    }
    verificar();
  }, [router]);

  return <div style={{ padding: '50px', textAlign: 'center', color: '#2563eb', fontWeight: 'bold' }}>Organizando suas turmas...</div>;
}