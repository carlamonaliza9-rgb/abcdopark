"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
// Caminhos atualizados para buscar os alertas na pasta original sem erro
import { AlertaVencimento } from "@/app/dashboard/_components/AlertaVencimento";
import { AlertaEvasao } from "@/app/dashboard/_components/AlertaEvasao"; 

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [ehAdmin, setEhAdmin] = useState(false);
  const [carregando, setCarregando] = useState(true);

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

  if (carregando) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Carregando menu...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AlertaVencimento />
      
      {ehAdmin && <AlertaEvasao />}

      <aside className="w-64 bg-blue-600/10 backdrop-blur-md flex flex-col shadow-sm border-r border-blue-100">
        
        <div className="p-6 border-b border-blue-200 flex flex-col items-center text-center">
          <img
            src="https://mnmakhazghgncqummksu.supabase.co/storage/v1/object/public/assets/logo.png"
            alt="Logo ABC DO PARK"
            className="h-48 w-auto mb-4 object-contain"
          />
          <h2 className="text-2xl font-bold text-blue-900">ABC DO PARK</h2>
          <p className="text-xs text-blue-600 mt-1 uppercase tracking-widest font-semibold">Gestão Escolar</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {/* Dashboard Geral (Aponta para o nosso Redirecionador) */}
          <Link href="/dashboard" className="block p-3 rounded-lg text-blue-900 hover:bg-blue-600/20 hover:text-blue-700 text-lg font-bold transition-all">
            📊 Dashboard
          </Link>

          {/* SÓ APARECE PARA ADMIN */}
          {ehAdmin && (
            <Link href="/admin/alunos" className="block p-3 rounded-lg text-blue-900 hover:bg-blue-600/20 hover:text-blue-700 text-lg font-bold transition-all">
              👨‍🎓 Alunos
            </Link>
          )}

          {/* Turmas Dinâmico - Redireciona para a pasta correta */}
          <Link href={ehAdmin ? "/admin/turmas" : "/professor/turmas"} className="block p-3 rounded-lg text-blue-900 hover:bg-blue-600/20 hover:text-blue-700 text-lg font-bold transition-all">
            {ehAdmin ? "🏫 Turmas" : "🏫 Minha Turma"}
          </Link>

          {/* Diário de Classe Dinâmico */}
          <Link href={ehAdmin ? "/admin/diario" : "/professor/diario"} className="block p-3 rounded-lg text-blue-900 hover:bg-blue-600/20 hover:text-blue-700 text-lg font-bold transition-all">
            📒 Diário de Classe
          </Link>

          {/* Avaliações - Acesso para Professor e Admin */}
          <Link href="/professor/avaliacoes" className="block p-3 rounded-lg text-blue-900 hover:bg-blue-600/20 hover:text-blue-700 text-lg font-bold transition-all">
            ⭐ Avaliações
          </Link>
          
          {/* SÓ APARECE PARA ADMIN */}
          {ehAdmin && (
            <>
              <Link href="/dashboard/documentacoes" className="block p-3 rounded-lg text-blue-900 hover:bg-blue-600/20 hover:text-blue-700 text-lg font-bold transition-all">
                📑 Documentações
              </Link>

              <Link href="/admin/funcionarios" className="block p-3 rounded-lg text-blue-900 hover:bg-blue-600/20 hover:text-blue-700 text-lg font-bold transition-all">
                👥 Funcionários
              </Link>

              <Link href="/admin/financeiro" className="block p-3 rounded-lg text-blue-900 hover:bg-blue-600/20 hover:text-blue-700 text-lg font-bold transition-all">
                💰 Financeiro
              </Link>

              <Link href="/admin/financeiro/contas-a-pagar" className="block p-3 rounded-lg text-blue-900 hover:bg-blue-600/20 hover:text-blue-700 text-lg font-bold transition-all">
                💸 Contas a Pagar
              </Link>

              <Link href="/admin/fechamento" className="block p-3 rounded-lg text-blue-900 hover:bg-blue-600/20 hover:text-blue-700 text-lg font-bold transition-all">
                🎓 Fechamento Letivo
              </Link>
            </>
          )}
        </nav>

        <div className="p-4 border-t border-blue-200">
          <Link href="/" className="block p-3 rounded-lg text-red-600 hover:bg-red-50 text-lg font-bold transition-all text-center">
            Sair do Sistema
          </Link>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}