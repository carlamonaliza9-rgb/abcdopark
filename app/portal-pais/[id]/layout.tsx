"use client";

import { SidebarPais } from "../_components/SidebarPais";
import { useParams } from "next/navigation";

export default function PortalAlunoLayout({ children }: { children: React.ReactNode }) {
  const { id } = useParams();

  return (
    // AJUSTE CRUCIAL: flex-col para empilhar no mobile e md:flex-row para alinhar lado a lado no desktop
    <div className="flex flex-col md:flex-row min-h-screen bg-[#f8fafc]">
      
      {/* Sidebar Fixa ou Menu Mobile */}
      <SidebarPais alunoId={id as string} />

      {/* ÁREA DE CONTEÚDO TOTALMENTE EXPANDIDA */}
      <main className="flex-1 overflow-y-auto">
        <div className="w-full p-4 md:p-10">
          {children}
        </div>
      </main>
    </div>
  );
}