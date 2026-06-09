"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, BookOpen, BarChart3, ClipboardCheck, LogOut, User } from "lucide-react";
import { supabase } from "@/lib/supabase";

export function SidebarProfessor() {
  const pathname = usePathname();
  const router = useRouter();
  const logoUrl = "https://mnmakhazghgncqummksu.supabase.co/storage/v1/object/public/assets/logo.png";
  
  const [nomeProfessor, setNomeProfessor] = useState<string>("Professor(a)");

  // Conexão com os dados de Admin: Busca quem é o professor logado
  useEffect(() => {
    async function buscarDadosProfessor() {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        const { data: perfil } = await supabase
          .from('perfis')
          .select('nome')
          .eq('id', authData.user.id)
          .single();
        
        if (perfil?.nome) {
          // Pega apenas o primeiro e o último nome para caber na interface
          const nomes = perfil.nome.split(" ");
          setNomeProfessor(nomes.length > 1 ? `${nomes[0]} ${nomes[nomes.length - 1]}` : nomes[0]);
        }
      }
    }
    buscarDadosProfessor();
  }, []);

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
      <style dangerouslySetInnerHTML={{__html: `
        /* AJUSTADO: padding-bottom aumentado para 120px para acomodar a barra maior */
        @media (max-width: 767px) { body, main { padding-bottom: 120px !important; } }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />

      {/* ========================================================= */}
      {/* DESKTOP SIDEBAR */}
      {/* ========================================================= */}
      <aside className="hidden md:flex w-64 bg-white h-screen sticky top-0 border-r border-slate-200/50 p-5 flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-50">
        
        <div className="mb-6 mt-4 flex flex-col items-center">
          <img src={logoUrl} alt="Logo ABC DO PARK" className="w-28 h-auto object-contain mb-3 drop-shadow-sm" />
          <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.25em] text-center bg-slate-100 px-3 py-1 rounded-full">
            Portal do Professor
          </p>
        </div>

        {/* Info do Usuário Logado (Conectado ao Banco) */}
        <div className="mb-6 flex items-center gap-3 px-2 py-3 bg-[#f8fafc] border border-slate-100 rounded-xl">
          <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
            <User size={20} strokeWidth={2.5} />
          </div>
          <div className="overflow-hidden">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Bem-vindo(a)</p>
            <p className="text-xs font-black text-slate-700 truncate">{nomeProfessor}</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1.5 overflow-y-auto hide-scrollbar pr-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.path || pathname.startsWith(`${item.path}/`);
            return (
              <Link
                key={item.name}
                href={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wide transition-all duration-300 ${
                  isActive 
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/20 translate-x-1" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-blue-600"
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
          <LogOut size={18} strokeWidth={2.5} />
          Sair do Sistema
        </button>
      </aside>

      {/* ========================================================= */}
      {/* MOBILE BOTTOM BAR (App-Like nativo) - ACESSIBILIDADE MELHORADA */}
      {/* ========================================================= */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-200/60 px-2 pb-4 pt-3 flex items-center justify-around z-[9999] shadow-[0_-10px_40px_rgba(0,0,0,0.06)] min-h-[90px]">
        {menuItems.map((item) => {
          const isActive = pathname === item.path || pathname.startsWith(`${item.path}/`);
          return (
            <Link
              key={item.name}
              href={item.path}
              className="flex flex-col items-center justify-center flex-1 py-1 rounded-2xl relative group"
            >
              <div className={`p-2 rounded-full transition-all duration-300 ${isActive ? 'bg-blue-100/60 scale-105' : 'bg-transparent active:bg-slate-100'}`}>
                {/* AJUSTADO: Ícones gigantes (size 40) */}
                <item.icon size={40} className={isActive ? "text-blue-600" : "text-slate-400"} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              {/* AJUSTADO: Fonte maior (text-[11px]) */}
              <span className={`text-[11px] font-black uppercase tracking-wider truncate mt-1.5 transition-colors ${isActive ? "text-blue-600" : "text-slate-400"}`}>
                {item.name}
              </span>
            </Link>
          );
        })}
        
        <button onClick={handleLogout} className="flex flex-col items-center justify-center flex-1 py-1 rounded-2xl group active:opacity-70 transition-opacity">
          <div className="p-2 rounded-full bg-transparent">
            {/* AJUSTADO: Ícone de sair gigante (size 40) */}
            <LogOut size={40} strokeWidth={2} className="text-rose-400" />
          </div>
          {/* AJUSTADO: Fonte maior (text-[11px]) */}
          <span className="text-[11px] font-black uppercase tracking-wider truncate mt-1.5 text-rose-400">Sair</span>
        </button>
      </div>
    </>
  );
}