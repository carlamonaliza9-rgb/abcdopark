"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Menu, X } from "lucide-react";

import { AlertaVencimento } from "./AlertaVencimento";
import { AlertaEvasao } from "./AlertaEvasao";

export default function SidebarAdmin({ children }: { children?: React.ReactNode }) {
  const [ehAdmin, setEhAdmin] = useState(false);
  const [carregando, setCarregando] = useState(true);
  
  const [menuFinanceiroAberto, setMenuFinanceiroAberto] = useState(false);
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);

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

  const fecharMenuMobile = () => {
    if (window.innerWidth < 768) {
      setMenuMobileAberto(false);
    }
  };

  if (carregando) return <div className="hidden md:flex w-[280px] bg-gray-50 items-center justify-center border-r border-blue-100 h-screen">Carregando menu...</div>;

  return (
    <>
      <AlertaVencimento />
      {ehAdmin && <AlertaEvasao />}

      {/* BOTÃO HAMBÚRGUER FLUTUANTE */}
      <button
        onClick={() => setMenuMobileAberto(true)}
        className="md:hidden fixed top-4 left-4 z-40 p-2 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 transition-colors active:scale-95"
      >
        <Menu size={22} strokeWidth={2.5} />
      </button>

      {/* OVERLAY ESCURO */}
      {menuMobileAberto && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setMenuMobileAberto(false)}
        />
      )}

      {/* BARRA LATERAL (Drawer no Mobile / Fixa "Sticky" no Desktop) */}
      {/* Reduzido a largura de w-[296px] para w-[280px] para ficar mais proporcional */}
      <aside 
        className={`fixed md:sticky top-0 left-0 h-[100dvh] w-[280px] bg-white md:bg-blue-600/10 backdrop-blur-md flex flex-col shadow-2xl md:shadow-sm border-r border-blue-100 z-50 md:z-0 transition-transform duration-300 ease-in-out ${
          menuMobileAberto ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        
        {/* CABEÇALHO DO MENU COMPACTADO */}
        <div className="p-4 border-b border-blue-200 flex flex-col items-center text-center relative shrink-0">
          <button 
            onClick={() => setMenuMobileAberto(false)}
            className="md:hidden absolute top-3 right-3 p-1.5 text-blue-400 hover:text-blue-600 bg-blue-50 rounded-full"
          >
            <X size={18} strokeWidth={3} />
          </button>

          {/* Tamanho da Logo Reduzido para h-24 */}
          <img
            src="https://mnmakhazghgncqummksu.supabase.co/storage/v1/object/public/assets/logo.png"
            alt="Logo ABC DO PARK"
            className="h-20 md:h-40 w-auto mb-1 md:mb-2 object-contain mt-2 md:mt-0"
          />
          <h2 className="text-lg md:text-xl font-bold text-blue-900 leading-tight">ABC DO PARK</h2>
          <p className="text-[9px] md:text-[10px] text-blue-600 mt-0.5 uppercase tracking-widest font-bold">Gestão Escolar</p>
        </div>

        {/* NAVEGAÇÃO COMPACTADA */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar flex flex-col justify-start">
          
          <Link href="/dashboard" onClick={fecharMenuMobile} className="block p-2.5 rounded-lg text-blue-900 hover:bg-blue-600/20 hover:text-blue-700 text-sm text-lg md:text-xl font-bold transition-all shrink-0">
            📊 Painel de Controle
          </Link>

          {ehAdmin && (
            <>
              <Link href="/admin/alunos" onClick={fecharMenuMobile} className="block p-2.5 rounded-lg text-blue-900 hover:bg-blue-600/20 hover:text-blue-700 text-sm text-lg md:text-xl font-bold transition-all shrink-0">
                👨‍🎓 Alunos
              </Link>
            </>
          )}

          <Link href={ehAdmin ? "/admin/turmas" : "/professor/turmas"} onClick={fecharMenuMobile} className="block p-2.5 rounded-lg text-blue-900 hover:bg-blue-600/20 hover:text-blue-700 text-sm text-lg md:text-xl font-bold transition-all shrink-0">
            {ehAdmin ? "🏫 Turmas" : "🏫 Minha Turma"}
          </Link>

          {!ehAdmin && (
            <Link href="/professor/diario" onClick={fecharMenuMobile} className="block p-2.5 rounded-lg text-blue-900 hover:bg-blue-600/20 hover:text-blue-700 text-sm text-lg md:text-xl font-bold transition-all shrink-0">
              📒 Diário de Classe
            </Link>
          )}
          
          {ehAdmin && (
            <>
              <Link href="/dashboard/documentacoes" onClick={fecharMenuMobile} className="block p-2.5 rounded-lg text-blue-900 hover:bg-blue-600/20 hover:text-blue-700 text-sm text-lg md:text-xl font-bold transition-all shrink-0">
                📑 Documentações
              </Link>

              <Link href="/admin/funcionarios" onClick={fecharMenuMobile} className="block p-2.5 rounded-lg text-blue-900 hover:bg-blue-600/20 hover:text-blue-700 text-sm text-lg md:text-xl font-bold transition-all shrink-0">
                👥 Funcionários
              </Link>

              <div className="shrink-0 transition-all duration-300 ease-in-out overflow-hidden">
                <button
                  onClick={() => setMenuFinanceiroAberto(!menuFinanceiroAberto)}
                  className="w-full flex justify-between items-center p-2.5 rounded-lg text-blue-900 hover:bg-blue-600/20 hover:text-blue-700 text-sm text-lg md:text-xl font-bold transition-all text-left outline-none"
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
                
                <div 
                  className={`pl-3 space-y-0.5 bg-blue-50 md:bg-blue-900/5 rounded-lg border-l-2 border-blue-400 overflow-hidden transition-all duration-300 ease-in-out ${
                    menuFinanceiroAberto ? "max-h-[300px] mt-1 py-1 opacity-100" : "max-h-0 opacity-0 m-0 p-0 border-transparent"
                  }`}
                >
                  <Link href="/admin/financeiro" onClick={fecharMenuMobile} className="block p-2 rounded-md text-blue-900 hover:bg-blue-600/10 text-sm text-lg md:text-xl font-bold transition-all">
                    📊 Visão Geral
                  </Link>
                  <Link href="/admin/financeiro/acordos-dividas-creditos" onClick={fecharMenuMobile} className="block p-2 rounded-md text-blue-900 hover:bg-blue-600/10 text-sm text-lg md:text-xl font-bold transition-all">
                    💲 Controle Pagamentos
                  </Link>
                  <Link href="/admin/financeiro/vendas-taxas-eventos" onClick={fecharMenuMobile} className="block p-2 rounded-md text-blue-900 hover:bg-blue-600/10 text-sm text-lg md:text-xl font-bold transition-all">
                    🛍️ Eventos & Taxas
                  </Link>
                  <Link href="/admin/pdv" onClick={fecharMenuMobile} className="block p-2 rounded-md text-blue-900 hover:bg-blue-600/10 text-sm text-lg md:text-xl font-bold transition-all">
                    🛒 Ponto de Venda
                  </Link>
                  <Link href="/admin/financeiro/saidas" onClick={fecharMenuMobile} className="block p-2 rounded-md text-blue-900 hover:bg-blue-600/10 text-sm text-lg md:text-xl font-bold transition-all">
                    💸 Saídas
                  </Link>
                </div>
              </div>

              <Link href="/admin/fechamento" onClick={fecharMenuMobile} className="block p-2.5 rounded-lg text-blue-900 hover:bg-blue-600/20 hover:text-blue-700 text-sm text-lg md:text-xl font-bold transition-all shrink-0">
                🎓 Fechamento Letivo
              </Link>

              <Link href="/admin/logs" onClick={fecharMenuMobile} className="block p-2.5 rounded-lg text-blue-900 hover:bg-blue-600/20 hover:text-blue-700 text-sm text-lg md:text-xl font-bold transition-all shrink-0">
                🛡️ Logs do Sistema
              </Link>
            </>
          )}
        </nav>

        <div className="p-3 border-t border-blue-200 bg-white md:bg-transparent shrink-0">
          <Link href="/" className="block p-2.5 rounded-lg text-red-600 hover:bg-red-50 text-sm text-lg md:text-xl font-bold transition-all text-center">
            Sair do Sistema
          </Link>
        </div>
      </aside>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}} />
    </>
  );
}