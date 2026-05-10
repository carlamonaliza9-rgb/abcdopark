"use client";

// O segredo está no "../_components" para subir um nível e achar a pasta correta
import { SidebarPais } from "../_components/SidebarPais";
import { useParams } from "next/navigation";

export default function PortalAlunoLayout({ children }: { children: React.ReactNode }) {
  const { id } = useParams();

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      {/* Sidebar Fixa */}
      <SidebarPais alunoId={id as string} />

      {/* ÁREA DE CONTEÚDO TOTALMENTE EXPANDIDA */}
      <main className="flex-1">
        {/* Removemos qualquer max-width para preencher as áreas azuis do seu print */}
        <div className="w-full p-4 md:p-10">
          {children}
        </div>
      </main>
    </div>
  );
}