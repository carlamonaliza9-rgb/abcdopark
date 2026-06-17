"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, BookOpen, BarChart3, LogOut, User, BrainCircuit, Users, Menu, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

export function SidebarProfessor({ children }: { children?: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [nomeProfessor, setNomeProfessor] = useState<string>("Professor(a)");
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);

  useEffect(() => {
    async function buscarDadosProfessor() {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) return;

      const emailAtual = authData.user.email || "";
      const metadata = authData.user.user_metadata;

      // Busca nas outras tabelas para ter todas as opções possíveis
      const { data: perfil } = await supabase.from('perfis').select('nome').eq('id', authData.user.id).single();
      const { data: func } = await supabase.from('funcionarios').select('nome').eq('email', emailAtual).single();

      // Fallback: Nome baseado no e-mail (ex: umotaria@... vira Umotaria)
      const emailPart = emailAtual.split('@')[0];
      const emailCapitalizado = emailPart.charAt(0).toUpperCase() + emailPart.slice(1);

      // Filtro inteligente: ignora vazios e nomes genéricos (independente de acento ou maiúscula)
      const ehNomeValido = (n: string | null | undefined) => {
        if (!n) return false;
        const limpo = n.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Tira acentos
        return !limpo.includes("novo usu") && !limpo.includes("professor");
      };

      // Fila de prioridade: o sistema vai pegar o primeiro nome válido que encontrar
      const candidatos = [
        metadata?.nome,
        metadata?.name,
        metadata?.full_name,
        func?.nome,
        perfil?.nome,
        emailCapitalizado
      ];

      const nomeReal = candidatos.find(ehNomeValido) || "Professor(a)";

      // Formatação: pega o primeiro e o último nome
      const nomes = nomeReal.trim().split(" ");
      setNomeProfessor(nomes.length > 1 ? `${nomes[0]} ${nomes[nomes.length - 1]}` : nomes[0]);
    }
    
    buscarDadosProfessor();
  }, []);

  const menuItems = [
    { name: "Painel", icon: Home, path: "/dashboard" },
    { name: "Turmas", icon: Users, path: "/professor/turmas" },
    { name: "Notas", icon: BarChart3, path: "/professor/avaliacoes" },
    { name: "Relatórios", icon: BrainCircuit, path: "/professor/avancos-dificuldades" },
    { name: "Diário", icon: BookOpen, path: "/professor/diario" },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const fecharMenuMobile = () => {
    if (window.innerWidth < 768) {
      setMenuMobileAberto(false);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}} />

      {/* BOTÃO HAMBÚRGUER FLUTUANTE (MOBILE) */}
      <button
        onClick={() => setMenuMobileAberto(true)}
        className="md:hidden fixed top-4 left-4 z-40 p-2 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 transition-colors active:scale-95"
      >
        <Menu size={22} strokeWidth={2.5} />
      </button>

      {/* OVERLAY ESCURO (MOBILE) */}
      {menuMobileAberto && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setMenuMobileAberto(false)}
        />
      )}

      {/* BARRA LATERAL (Drawer no Mobile / Fixa no Desktop) */}
      <aside 
        className={`fixed md:sticky top-0 left-0 h-[100dvh] w-[280px] bg-white flex flex-col shadow-2xl md:shadow-[4px_0_24px_rgba(0,0,0,0.02)] border-r border-slate-100 z-50 transition-transform duration-300 ease-in-out ${
          menuMobileAberto ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        
        {/* CABEÇALHO DA SIDEBAR */}
        <div className="p-5 flex flex-col items-center relative shrink-0">
          <button 
            onClick={() => setMenuMobileAberto(false)}
            className="md:hidden absolute top-3 right-3 p-1.5 text-blue-400 hover:text-blue-600 bg-blue-50 rounded-full"
          >
            <X size={20} strokeWidth={3} />
          </button>

          <img 
            src="https://mnmakhazghgncqummksu.supabase.co/storage/v1/object/public/assets/logo.png" 
            alt="Logo ABC DO PARK" 
            className="h-24 md:h-auto w-50 object-contain mb-3 drop-shadow-sm mt-4 md:mt-2" 
          />
          <p className="text-[10px] text-blue-600 font-bold uppercase tracking-[0.2em] text-center bg-blue-50 px-4 py-1.5 rounded-full">Portal do Professor</p>
        </div>

        {/* INFORMAÇÕES DO PROFESSOR */}
        <div className="px-5 mb-4 shrink-0">
          <div className="flex items-center gap-4 px-4 py-3.5 bg-[#f8f9fc] border border-gray-100 rounded-2xl">
            <div className="w-10 h-10 bg-white shadow-sm text-blue-600 rounded-full flex items-center justify-center flex-shrink-0 border border-gray-100">
              <User size={20} strokeWidth={2.5} />
            </div>
            <div className="overflow-hidden">
              <p className="text-[11px] md:text-sm text-gray-500 font-bold uppercase tracking-wider mb-0.5">Bem-vindo(a)</p>
              <p className="text-sm md:text-lg font-black text-gray-900 truncate">{nomeProfessor}</p>
            </div>
          </div>
        </div>

        {/* NAVEGAÇÃO COMPACTADA */}
        <nav className="flex-1 px-3 pb-3 space-y-1 overflow-y-auto custom-scrollbar flex flex-col justify-start">
          {menuItems.map((item) => {
            const isActive = pathname === item.path || pathname.startsWith(`${item.path}/`);
            return (
              <Link 
                key={item.name} 
                href={item.path} 
                onClick={fecharMenuMobile}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm md:text-lg transition-all duration-200 shrink-0 ${
                  isActive 
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/20 translate-x-1" 
                    : "text-gray-600 hover:bg-blue-50 hover:text-blue-600"
                }`}
              >
                <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} /> {item.name}
              </Link>
            );
          })}
        </nav>

        {/* RODAPÉ / BOTÃO DE SAIR */}
        <div className="p-4 border-t border-gray-100 shrink-0">
          <button 
            onClick={handleLogout} 
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold text-sm md:text-lg text-rose-500 hover:bg-rose-50 transition-all border border-rose-100"
          >
            <LogOut size={22} strokeWidth={2.5} /> Sair do Sistema
          </button>
        </div>
      </aside>
    </>
  );
}