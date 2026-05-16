"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, FileText, BarChart3, CreditCard, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";

export function SidebarPais({ alunoId }: { alunoId: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const logoUrl = "https://mnmakhazghgncqummksu.supabase.co/storage/v1/object/public/assets/logo.png";

  const menuItems = [
    { name: "Home", icon: Home, path: `/portal-pais/${alunoId}` },
    { name: "Ficha", icon: FileText, path: `/portal-pais/${alunoId}/ficha` },
    { name: "Avaliações", icon: BarChart3, path: `/portal-pais/${alunoId}/avaliacoes` },
    { name: "Financeiro", icon: CreditCard, path: `/portal-pais/${alunoId}/financeiro` },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <>
      {/* VISUALIZAÇÃO DESKTOP: Mantida 100% idêntica e visível apenas em telas grandes */}
      <aside className="hidden md:flex w-64 bg-white h-screen sticky top-0 border-r border-slate-100 p-6 flex flex-col shadow-sm">
        {/* Logo Centralizada */}
        <div className="mb-10 flex flex-col items-center">
          <img src={logoUrl} alt="Logo" className="w-32 h-auto object-contain mb-2" />
          <p className="text-[8px] text-slate-400 font-black uppercase tracking-[0.3em]">Portal da Família</p>
        </div>

        {/* Navegação */}
        <nav className="flex-1 space-y-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.name}
                href={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-[11px] uppercase tracking-wider transition-all ${
                  isActive 
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-indigo-600"
                }`}
              >
                <item.icon size={16} strokeWidth={2.5} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Botão Sair */}
        <button 
          onClick={handleLogout}
          className="mt-auto flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-[11px] uppercase text-rose-500 hover:bg-rose-50 transition-all"
        >
          <LogOut size={16} strokeWidth={2.5} />
          Sair
        </button>
      </aside>

      {/* VISUALIZAÇÃO PORTÁTIL (CELULAR/TABLET): Menu inferior moderno estilo aplicativo móvel com fontes ampliadas apenas no mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200/60 px-2 py-1 flex items-center justify-around z-50 h-16 shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
        {menuItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.name}
              href={item.path}
              className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 rounded-xl text-xs md:text-[9px] font-black uppercase tracking-wider transition-all ${
                isActive 
                ? "text-indigo-600" 
                : "text-slate-400 hover:text-indigo-600"
              }`}
            >
              <item.icon size={18} className={isActive ? "text-indigo-600" : "text-slate-400"} strokeWidth={isActive ? 3 : 2.5} />
              <span className="text-xs md:text-[8px] font-black truncate">{item.name}</span>
            </Link>
          );
        })}
        
        {/* Botão Sair integrado na navegação móvel */}
        <button 
          onClick={handleLogout}
          className="flex flex-col items-center justify-center gap-1 flex-1 py-1 rounded-xl text-xs md:text-[9px] font-black uppercase tracking-wider text-rose-500 hover:text-rose-600 transition-all"
        >
          <LogOut size={18} strokeWidth={2.5} />
          <span className="text-xs md:text-[8px] font-black truncate">Sair</span>
        </button>
      </div>
    </>
  );
}