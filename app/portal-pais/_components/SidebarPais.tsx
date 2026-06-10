"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, FileText, Calendar, BarChart3, CreditCard, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";

export function SidebarPais({ alunoId }: { alunoId: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const logoUrl = "https://mnmakhazghgncqummksu.supabase.co/storage/v1/object/public/assets/logo.png";

  const menuItems = [
    { name: "Home", icon: Home, path: `/portal-pais/${alunoId}` },
    { name: "Ficha", icon: FileText, path: `/portal-pais/${alunoId}/ficha` },
    { name: "Agenda", icon: Calendar, path: `/portal-pais/${alunoId}/agenda` },
    { name: "Avaliações", icon: BarChart3, path: `/portal-pais/${alunoId}/avaliacoes` },
    { name: "Financeiro", icon: CreditCard, path: `/portal-pais/${alunoId}/financeiro` },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 767px) { body, main { padding-bottom: 100px !important; } }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex w-64 bg-white h-screen sticky top-0 border-r border-slate-200/50 p-5 flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-50">
        <div className="mb-6 mt-4 flex flex-col items-center">
          <img src={logoUrl} alt="Logo ABC DO PARK" className="w-28 h-auto object-contain mb-3 drop-shadow-sm" />
          <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.25em] text-center bg-slate-100 px-3 py-1 rounded-full">Portal da Família</p>
        </div>

        <nav className="flex-1 space-y-1.5 overflow-y-auto hide-scrollbar pr-2 mt-4">
          {menuItems.map((item) => {
            const isActive = pathname === item.path || pathname.startsWith(`${item.path}/`);
            return (
              <Link
                key={item.name}
                href={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wide transition-all duration-300 ${
                  isActive 
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20 translate-x-1" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-indigo-600"
                }`}
              >
                <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <button 
          onClick={handleLogout}
          className="mt-6 flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold text-xs uppercase text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-all border border-rose-100/60"
        >
          <LogOut size={18} strokeWidth={2.5} /> Sair
        </button>
      </aside>

      {/* MOBILE BOTTOM BAR (Com sistema de scroll seguro) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-200/60 px-2 pb-4 pt-3 flex items-center justify-start sm:justify-around z-[9999] shadow-[0_-10px_40px_rgba(0,0,0,0.06)] min-h-[85px] overflow-x-auto hide-scrollbar">
        {menuItems.map((item) => {
          const isActive = pathname === item.path || pathname.startsWith(`${item.path}/`);
          return (
            <Link
              key={item.name}
              href={item.path}
              className="flex flex-col items-center justify-center min-w-[70px] flex-1 py-1 rounded-2xl relative group"
            >
              <div className={`p-2 rounded-full transition-all duration-300 ${isActive ? 'bg-indigo-100/60 scale-105' : 'bg-transparent active:bg-slate-100'}`}>
                <item.icon size={26} className={isActive ? "text-indigo-600" : "text-slate-400"} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`text-[9px] font-black uppercase tracking-wider truncate mt-1 transition-colors ${isActive ? "text-indigo-600" : "text-slate-400"}`}>
                {item.name}
              </span>
            </Link>
          );
        })}
        
        <button onClick={handleLogout} className="flex flex-col items-center justify-center min-w-[70px] flex-1 py-1 rounded-2xl group active:opacity-70 transition-opacity">
          <div className="p-2 rounded-full bg-transparent">
            <LogOut size={26} strokeWidth={2} className="text-rose-400" />
          </div>
          <span className="text-[9px] font-black uppercase tracking-wider truncate mt-1 text-rose-400">Sair</span>
        </button>
      </div>
    </>
  );
}