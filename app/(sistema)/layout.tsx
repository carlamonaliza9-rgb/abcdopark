"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

// ATENÇÃO AQUI: Os caminhos agora incluem o /(sistema)/
import { AlertaVencimento } from "@/app/(sistema)/dashboard/_components/AlertaVencimento";
import { AlertaEvasao } from "@/app/(sistema)/dashboard/_components/AlertaEvasao"; 
import SidebarAdmin from "@/app/(sistema)/dashboard/_components/SidebarAdmin";
import { SidebarProfessor } from "@/app/(sistema)/dashboard/_components/SidebarProfessor";

export default function SistemaLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [cargo, setCargo] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function verificarAcesso() {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        const email = authData.user.email;
        const { data: perfil } = await supabase.from('perfis').select('cargo').eq('id', authData.user.id).single();

        if (email === 'carlamonaliza9@gmail.com' || email === 'diretoria@abcdopark.com' || perfil?.cargo === 'Admin') {
          setCargo('Admin');
        } else if (perfil?.cargo === 'Professor') {
          setCargo('Professor');
        } else if (perfil?.cargo === 'Responsável') {
          setCargo('Responsável');
        }
      } else {
        router.push("/");
      }
      setCarregando(false);
    }
    verificarAcesso();
  }, [router]);

  if (carregando) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center flex-col gap-3">
      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      <p className="text-blue-600 font-bold uppercase tracking-widest text-xs">A Preparar Ambiente...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      
      {cargo !== 'Responsável' && <AlertaVencimento />}
      {cargo === 'Admin' && <AlertaEvasao />}

      {/* ORQUESTRADOR DE SIDEBARS */}
      {cargo === 'Admin' && <SidebarAdmin />}
      {cargo === 'Professor' && <SidebarProfessor />}

      <main className={`flex-1 overflow-y-auto ${cargo === 'Responsável' ? "p-0" : "p-4 md:p-8"}`}>
        {children}
      </main>
    </div>
  );
}