"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  LayoutDashboard, GraduationCap, School, BookOpen, 
  BarChart3, FileText, Briefcase, CreditCard, 
  Receipt, Award, LogOut 
} from "lucide-react";

// Caminhos atualizados para buscar os alertas na pasta original sem erro
import { AlertaVencimento } from "@/app/dashboard/_components/AlertaVencimento";
import { AlertaEvasao } from "@/app/dashboard/_components/AlertaEvasao"; 

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

  // Menu Dinâmico: Filtra automaticamente o que o Professor e o Admin podem ver
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

  if (carregando) return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-bold text-slate-400 tracking-widest uppercase text-sm animate-pulse">Sincronizando...</div>;

  return (
    <div className="flex min-h-screen bg-slate-50 relative">
      
      {/* Alertas Globais Mantidos */}
      <AlertaVencimento />
      {ehAdmin && <AlertaEvasao />}

      {/* ESTILOS GLOBAIS MOBILE (Impede o rodapé de cobrir o conteúdo e oculta a barra de rolagem horizontal) */}
      <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 767px) {
          body, main, .animate-in { padding-bottom: 100px !important; }
        }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />

      {/* ========================================================= */}
      {/* VISUALIZAÇÃO DESKTOP: Barra Lateral Fixa (Oculta no Celular) */}
      {/* ========================================================= */}
      <aside className="hidden md:flex w-64 bg-white h-screen sticky top-0 border-r border-slate-100 p-6 flex-col shadow-sm z-50">
        
        {/* Logo */}
        <div className="mb-10 flex flex-col items-center">
          <img src={logoUrl} alt="Logo ABC DO PARK" className="w-32 h-auto object-contain mb-2" />
          <p className="text-[8px] text-slate-400 font-black uppercase tracking-[0.3em] text-center">
            {ehAdmin ? "Gestão Escolar" : "Portal do Professor"}
          </p>
        </div>

        {/* Navegação Desktop */}
        <nav className="flex-1 space-y-2 overflow-y-auto hide-scrollbar pr-2">
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
                <item.icon size={18} strokeWidth={2.5} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Botão Sair Desktop */}
        <button 
          onClick={handleLogout}
          className="mt-4 flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-[11px] uppercase text-rose-500 hover:bg-rose-50 transition-all border border-rose-100/50"
        >
          <LogOut size={18} strokeWidth={2.5} />
          Sair do Sistema
        </button>
      </aside>

      {/* ========================================================= */}
      {/* MAIN CONTENT AREA */}
      {/* ========================================================= */}
      <main className="flex-1 w-full overflow-y-auto">
        {children}
      </main>

      {/* ========================================================= */}
      {/* VISUALIZAÇÃO MOBILE: Bottom Bar App-Like */}
      {/* ========================================================= */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200/60 px-2 py-2 flex items-center z-[9999] h-[85px] shadow-[0_-4px_25px_rgba(0,0,0,0.06)] overflow-x-auto flex-nowrap hide-scrollbar gap-2">
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
              <item.icon size={24} className={isActive ? "text-blue-600" : "text-slate-400"} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[9px] font-black uppercase tracking-wider truncate w-full text-center">{item.name}</span>
            </Link>
          );
        })}
        
        {/* Botão Sair Mobile */}
        <button 
          onClick={handleLogout}
          className="flex flex-col items-center justify-center gap-1 min-w-[72px] px-2 py-2 rounded-2xl text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
        >
          <LogOut size={24} strokeWidth={2.5} />
          <span className="text-[9px] font-black uppercase tracking-wider truncate w-full text-center">Sair</span>
        </button>
      </div>

    </div>
  );
}