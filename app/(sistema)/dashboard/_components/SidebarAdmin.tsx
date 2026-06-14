"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Menu, X } from "lucide-react"; // Importação dos ícones do menu mobile

// Caminhos atualizados para buscar os alertas na pasta original sem erro
import { AlertaVencimento } from "./AlertaVencimento";
import { AlertaEvasao } from "./AlertaEvasao";

export default function SidebarAdmin({ children }: { children?: React.ReactNode }) {
  const [ehAdmin, setEhAdmin] = useState(false);
  const [carregando, setCarregando] = useState(true);
  
  // --- CONTROLE DOS MENUS ---
  const [menuFinanceiroAberto, setMenuFinanceiroAberto] = useState(false);
  const [menuMobileAberto, setMenuMobileAberto] = useState(false); // NOVO: Controle do Mobile

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
      carregandoDados();
    }
    
    function carregandoDados() {
      setCarregando(false);
    }
    
    verificarAcesso();
  }, []);

  // Função auxiliar para fechar o menu no mobile ao clicar num link
  const fecharMenuMobile = () => {
    if (window.innerWidth < 768) {
      setMenuMobileAberto(false);
    }
  };

  if (carregando) return <div className="hidden md:flex w-[296px] bg-gray-50 items-center justify-center border-r border-blue-100 h-screen">Carregando menu...</div>;

  return (
    <>
      <AlertaVencimento />
      {ehAdmin && <AlertaEvasao />}

      {/* BOTÃO HAMBÚRGUER FLUTUANTE (Exclusivo Mobile) */}
      <button
        onClick={() => setMenuMobileAberto(true)}
        className="md:hidden fixed top-4 left-4 z-40 p-2.5 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 transition-colors active:scale-95"
      >
        <Menu size={24} strokeWidth={2.5} />
      </button>

      {/* OVERLAY ESCURO (Exclusivo Mobile quando aberto) */}
      {menuMobileAberto && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setMenuMobileAberto(false)}
        />
      )}

      {/* BARRA LATERAL (Drawer no Mobile / Fixa "Sticky" no Desktop) */}
      <aside 
        className={`fixed md:sticky top-0 left-0 h-[100dvh] w-[296px] bg-white md:bg-blue-600/10 backdrop-blur-md flex flex-col shadow-2xl md:shadow-sm border-r border-blue-100 z-50 md:z-0 transition-transform duration-300 ease-in-out ${
          menuMobileAberto ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        
        {/* CABEÇALHO DO MENU */}
        <div className="p-6 border-b border-blue-200 flex flex-col items-center text-center relative">
          {/* Botão de Fechar dentro do Menu (Exclusivo Mobile) */}
          <button 
            onClick={() => setMenuMobileAberto(false)}
            className="md:hidden absolute top-4 right-4 p-2 text-blue-400 hover:text-blue-600 bg-blue-50 rounded-full"
          >
            <X size={20} strokeWidth={3} />
          </button>

          <img
            src="https://mnmakhazghgncqummksu.supabase.co/storage/v1/object/public/assets/logo.png"
            alt="Logo ABC DO PARK"
            className="h-32 md:h-40 w-auto mb-2 md:mb-4 object-contain mt-4 md:mt-0"
          />
          <h2 className="text-xl md:text-2xl font-bold text-blue-900">ABC DO PARK</h2>
          <p className="text-[10px] md:text-xs text-blue-600 mt-1 uppercase tracking-widest font-semibold">Gestão Escolar</p>
        </div>

        {/* NAVEGAÇÃO */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          
          <Link href="/dashboard" onClick={fecharMenuMobile} className="block p-3 rounded-lg text-blue-900 hover:bg-blue-600/20 hover:text-blue-700 text-base md:text-lg font-bold transition-all">
            📊 Painel de Controle
          </Link>

          {/* ITENS PARA ADMIN */}
          {ehAdmin && (
            <>
              <Link href="/admin/alunos" onClick={fecharMenuMobile} className="block p-3 rounded-lg text-blue-900 hover:bg-blue-600/20 hover:text-blue-700 text-base md:text-lg font-bold transition-all">
                👨‍🎓 Alunos
              </Link>
            </>
          )}

          {/* Turmas Dinâmico */}
          <Link href={ehAdmin ? "/admin/turmas" : "/professor/turmas"} onClick={fecharMenuMobile} className="block p-3 rounded-lg text-blue-900 hover:bg-blue-600/20 hover:text-blue-700 text-base md:text-lg font-bold transition-all">
            {ehAdmin ? "🏫 Turmas" : "🏫 Minha Turma"}
          </Link>

          {/* Diário de Classe - EXCLUSIVO PARA PROFESSORES */}
          {!ehAdmin && (
            <Link href="/professor/diario" onClick={fecharMenuMobile} className="block p-3 rounded-lg text-blue-900 hover:bg-blue-600/20 hover:text-blue-700 text-base md:text-lg font-bold transition-all">
              📒 Diário de Classe
            </Link>
          )}
          
          {/* RESTANTE DOS ITENS ADMIN */}
          {ehAdmin && (
            <>
              <Link href="/dashboard/documentacoes" onClick={fecharMenuMobile} className="block p-3 rounded-lg text-blue-900 hover:bg-blue-600/20 hover:text-blue-700 text-base md:text-lg font-bold transition-all">
                📑 Documentações
              </Link>

              <Link href="/admin/funcionarios" onClick={fecharMenuMobile} className="block p-3 rounded-lg text-blue-900 hover:bg-blue-600/20 hover:text-blue-700 text-base md:text-lg font-bold transition-all">
                👥 Funcionários
              </Link>

              {/* MENU DROPDOWN FINANCEIRO */}
              <div>
                <button
                  onClick={() => setMenuFinanceiroAberto(!menuFinanceiroAberto)}
                  className="w-full flex justify-between items-center p-3 rounded-lg text-blue-900 hover:bg-blue-600/20 hover:text-blue-700 text-base md:text-lg font-bold transition-all text-left outline-none"
                >
                  <span>💰 Financeiro</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                    stroke="currentColor"
                    className={`w-4 h-4 text-blue-900/60 transition-transform duration-200 ${menuFinanceiroAberto ? "rotate-180" : ""}`}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
                
                {menuFinanceiroAberto && (
                  <div className="pl-4 mt-1 space-y-1 bg-blue-50 md:bg-blue-900/5 rounded-lg py-1 border-l-2 border-blue-400">
                    <Link href="/admin/financeiro" onClick={fecharMenuMobile} className="block p-2.5 md:p-2 rounded-md text-blue-900 hover:bg-blue-600/10 text-sm md:text-base font-bold transition-all">
                      📊 Visão Geral
                    </Link>
                    <Link href="/admin/financeiro/acordos-dividas-creditos" onClick={fecharMenuMobile} className="block p-2.5 md:p-2 rounded-md text-blue-900 hover:bg-blue-600/10 text-sm md:text-base font-bold transition-all">
                      💲 Controle de Pagamentos
                    </Link>
                     <Link href="/admin/financeiro/vendas-taxas-eventos" onClick={fecharMenuMobile} className="block p-2.5 md:p-2 rounded-md text-blue-900 hover:bg-blue-600/10 text-sm md:text-base font-bold transition-all">
                      🛍️ Eventos, Vendas & Taxas
                    </Link>
                    <Link href="/admin/pdv" onClick={fecharMenuMobile} className="block p-2.5 md:p-2 rounded-md text-blue-900 hover:bg-blue-600/10 text-sm md:text-base font-bold transition-all">
                      🛒 Ponto de Venda
                    </Link>
                    <Link href="/admin/financeiro/saidas" onClick={fecharMenuMobile} className="block p-2.5 md:p-2 rounded-md text-blue-900 hover:bg-blue-600/10 text-sm md:text-base font-bold transition-all">
                      💸 Saídas
                    </Link>
                  </div>
                )}
              </div>

              <Link href="/admin/fechamento" onClick={fecharMenuMobile} className="block p-3 rounded-lg text-blue-900 hover:bg-blue-600/20 hover:text-blue-700 text-base md:text-lg font-bold transition-all">
                🎓 Fechamento Letivo
              </Link>

              <Link href="/admin/logs" onClick={fecharMenuMobile} className="block p-3 rounded-lg text-blue-900 hover:bg-blue-600/20 hover:text-blue-700 text-base md:text-lg font-bold transition-all">
                🛡️ Logs do Sistema
              </Link>
            </>
          )}
        </nav>

        <div className="p-4 border-t border-blue-200 bg-white md:bg-transparent">
          <Link href="/" className="block p-3 rounded-lg text-red-600 hover:bg-red-50 text-base md:text-lg font-bold transition-all text-center">
            Sair do Sistema
          </Link>
        </div>
      </aside>

      {/* Ajuste de scrollbar para a navegação da Sidebar */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}} />
    </>
  );
}