"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import SidebarAdmin from "@/app/(sistema)/dashboard/_components/SidebarAdmin"; 
import { SidebarProfessor } from "@/app/(sistema)/dashboard/_components/SidebarProfessor";
import { ehCargoAdministrativo, normalizarCargo } from "@/lib/auth/permissions";

export default function SistemaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [cargo, setCargo] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function obterCargo() {
      const { data: authData } = await supabase.auth.getUser();
      
      if (authData?.user) {
        const { data: perfil } = await supabase
          .from("perfis")
          .select("cargo")
          .eq("id", authData.user.id)
          .single();

        setCargo(normalizarCargo(perfil?.cargo));
      }
      setCarregando(false);
    }

    obterCargo();
  }, []);

  if (carregando) {
    return (
      <div className="min-h-screen bg-[#fafafc] flex items-center justify-center text-blue-900 font-bold">
        Carregando painel...
      </div>
    );
  }

  return (
    // 👇 MUDANÇA AQUI: bg-gray-50 mudou para bg-[#fafafc]
    <div className="flex min-h-screen bg-[#fafafc]">
      
      {/* ORQUESTRADOR DE BARRAS LATERAIS */}
      {ehCargoAdministrativo(cargo) && <SidebarAdmin cargoInicial={cargo} />}
      {(cargo === "Professor" || cargo === "Auxiliar") && <SidebarProfessor />}

      {/* CONTEÚDO PRINCIPAL DA PÁGINA */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
      
    </div>
  );
}
