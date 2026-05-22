"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, BookOpen, BarChart3, ClipboardCheck, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";

export function SidebarProfessor() {
  const pathname = usePathname();
  const router = useRouter();
  const logoUrl = "https://mnmakhazghgncqummksu.supabase.co/storage/v1/object/public/assets/logo.png";

  // Rotas específicas do portal do professor
  const menuItems = [
    { name: "Painel", icon: Home, path: "/professor/dashboard" },
    { name: "Diário", icon: BookOpen, path: "/professor/diario" },
    { name: "Notas", icon: BarChart3, path: "/professor/avaliacoes" },
    { name: "Frequência", icon: ClipboardCheck, path: "/professor/frequencia" },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <>
      {/* INJEÇÃO DE ESTILO GLOBAL PARA MOBILE: Evita de forma definitiva que a barra fixa cubra o final das páginas */}
      <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 767px) {
          body, main, .animate-in { padding-bottom: 100px !important; }
        }
      `}} />

      {/* ========================================================= */}
      {/* VISUALIZAÇÃO DESKTOP: Mantida 100% idêntica e visível apenas em telas grandes */}
      {/* ========================================================= */}
      <aside className="hidden md:flex w-64 bg-white h-screen sticky top-0 border-r border-slate-100 p-6 flex-col shadow-sm z-50">
        
        {/* Logo Centralizada */}
        <div className="mb-10 flex flex-col items-center">
          <img src={logoUrl} alt="Logo ABC DO PARK" className="w-32 h-auto object-contain mb-2" />
          <p className="text-[8px] text-slate-400 font-black uppercase tracking-[0.3em]">Portal do Professor</p>
        </div>

        {/* Navegação */}
        <nav className="flex-1 space-y-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.path || pathname.startsWith(`${item.path}/`);
            return (
              <Link
                key={item.name}
                href={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-[11px] uppercase tracking-wider transition-all ${
                  isActive 
                  ? "bg-blue-600 text-white shadow-md shadow-blue-100" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-blue-600"
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
          Sair do Sistema
        </button>
      </aside>

      {/* ========================================================= */}
      {/* VISUALIZAÇÃO PORTÁTIL (CELULAR/TABLET): Menu ampliado (h-[85px]) */}
      {/* ========================================================= */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200/60 px-2 py-2 flex items-center justify-around z-[9999] h-[85px] shadow-[0_-4px_25px_rgba(0,0,0,0.06)]">
        {menuItems.map((item) => {
          const isActive = pathname === item.path || pathname.startsWith(`${item.path}/`);
          return (
            <Link
              key={item.name}
              href={item.path}
              className={`flex flex-col items-center justify-center gap-1 min-w-[72px] px-2 py-2 rounded-2xl transition-all ${
                isActive 
                ? "text-blue-600 bg-blue-50/50" 
                : "text-slate-400 hover:text-blue-600 hover:bg-slate-50"
              }`}
            >
              <item.icon size={26} className={isActive ? "text-blue-600" : "text-slate-400"} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[9px] font-black uppercase tracking-wider truncate w-full text-center mt-1">{item.name}</span>
            </Link>
          );
        })}
        
        {/* Botão Sair integrado na navegação móvel */}
        <button 
          onClick={handleLogout}
          className="flex flex-col items-center justify-center gap-1 min-w-[72px] px-2 py-2 rounded-2xl text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
        >
          <LogOut size={26} strokeWidth={2} />
          <span className="text-[9px] font-black uppercase tracking-wider truncate w-full text-center mt-1">Sair</span>
        </button>
      </div>
    </>
  );
}