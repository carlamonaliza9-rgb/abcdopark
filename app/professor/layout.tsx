"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  LayoutDashboard, GraduationCap, School, BookOpen, 
  BarChart3, FileText, Briefcase, CreditCard, 
  Receipt, Award, LogOut, Loader2
} from "lucide-react";

import { AlertaVencimento } from "@/app/dashboard/_components/AlertaVencimento";
import { AlertaEvasao } from "@/app/dashboard/_components/AlertaEvasao"; 

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ehAdmin, setEhAdmin] = useState(false);
  const [carregando, setCarregando] = useState(true);

  const logoUrl = "https://mnmakhazghgncqummksu.supabase.co/storage/v1/object/public/assets/logo.png";

  useEffect(() => {
    async function verificarAcesso() {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        const email = authData.user.email;
        const { data: perfil } = await supabase
          .from('perfis')
          .select('cargo')
          .eq('id', authData.user.id)
          .single();

        if (
          email === 'carlamonaliza9@gmail.com' || 
          email === 'diretoria@abcdopark.com' || 
          perfil?.cargo === 'Admin'
        ) {
          setEhAdmin(true);
        }
      }
      setCarregando(false);
    }
    verificarAcesso();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const getMenuItems = () => {
    const items = [
      { name: "Painel", icon: LayoutDashboard, path: "/dashboard", adminOnly: false },
      { name: "Alunos", icon: GraduationCap, path: "/admin/alunos", adminOnly: true },
      { name: "Turmas", icon: School, path: ehAdmin ? "/admin/turmas" : "/professor/turmas", adminOnly: false },
      { name: "Diário", icon: BookOpen, path: ehAdmin ? "/admin/diario" : "/professor/diario", adminOnly: false },
      { name: "Avaliações", icon: BarChart3, path: "/professor/avaliacoes", adminOnly: false },
      { name: "Docs", icon: FileText, path: "/dashboard/documentacoes", adminOnly: true },
      { name: "Equipe", icon: Briefcase, path: "/admin/funcionarios", adminOnly: true },
      { name: "Financeiro", icon: CreditCard, path: "/admin/financeiro", adminOnly: true },
      { name: "A Pagar", icon: Receipt, path: "/admin/financeiro/contas-a-pagar", adminOnly: true },
      { name: "Fechamento", icon: Award, path: "/admin/fechamento", adminOnly: true },
    ];
    return items.filter(item => !item.adminOnly || ehAdmin);
  };

  const menuItems = getMenuItems();

  if (carregando) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-blue-600 gap-3">
        <Loader2 size={32} className="animate-spin" strokeWidth={3} />
        <span className="font-bold uppercase tracking-widest text-xs">Sincronizando...</span>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f4f7f9] relative">
      
      <div className="absolute top-0 w-full z-[100]">
        <AlertaVencimento />
        {ehAdmin && <AlertaEvasao />}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 767px) { body, main { padding-bottom: 90px !important; } }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />

      {/* ========================================================= */}
      {/* DESKTOP SIDEBAR: Clean, sombras suaves e tipografia nítida */}
      {/* ========================================================= */}
      <aside className="hidden md:flex w-64 bg-white h-screen sticky top-0 border-r border-slate-200/50 p-5 flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-50">
        
        <div className="mb-8 mt-4 flex flex-col items-center">
          <img src={logoUrl} alt="Logo ABC DO PARK" className="w-28 h-auto object-contain mb-3 drop-shadow-sm" />
          <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.25em] text-center bg-slate-100 px-3 py-1 rounded-full">
            {ehAdmin ? "Gestão Escolar" : "Portal do Professor"}
          </p>
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

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 w-full overflow-y-auto relative">
        {children}
      </main>

      {/* ========================================================= */}
      {/* MOBILE BOTTOM BAR: Efeito Glassmorphism e Ícones Otimizados */}
      {/* ========================================================= */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200/60 px-2 pb-safe pt-1 flex items-center justify-around z-[9999] shadow-[0_-8px_30px_rgba(0,0,0,0.04)]">
        {menuItems.slice(0, ehAdmin ? 4 : 4).map((item) => {
          const isActive = pathname === item.path || pathname.startsWith(`${item.path}/`);
          return (
            <Link
              key={item.name}
              href={item.path}
              className="flex flex-col items-center justify-center flex-1 py-2 rounded-2xl relative"
            >
              <div className={`p-1.5 rounded-full transition-all duration-300 ${isActive ? 'bg-blue-100/50' : 'bg-transparent'}`}>
                <item.icon size={24} className={isActive ? "text-blue-600" : "text-slate-400"} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`text-[9px] font-black uppercase tracking-wider truncate mt-0.5 transition-colors ${isActive ? "text-blue-600" : "text-slate-400"}`}>
                {item.name}
              </span>
            </Link>
          );
        })}
        
        <button onClick={handleLogout} className="flex flex-col items-center justify-center flex-1 py-2 rounded-2xl group">
          <div className="p-1.5 rounded-full bg-transparent group-hover:bg-rose-50 transition-all duration-300">
            <LogOut size={24} strokeWidth={2} className="text-rose-400 group-hover:text-rose-500" />
          </div>
          <span className="text-[9px] font-black uppercase tracking-wider truncate mt-0.5 text-rose-400 group-hover:text-rose-500">Sair</span>
        </button>
      </div>

    </div>
  );
}