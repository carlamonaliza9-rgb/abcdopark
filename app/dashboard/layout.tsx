import Link from "next/link";
import { AlertaVencimento } from "./_components/AlertaVencimento";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* NOVO: Componente que monitora os vencimentos do dia */}
      <AlertaVencimento />

      {/* Menu Lateral (Sidebar) */}
      <aside className="w-64 bg-blue-600/10 backdrop-blur-md flex flex-col shadow-sm border-r border-blue-100">
        
        {/* Cabeçalho com Logo */}
        <div className="p-6 border-b border-blue-200 flex flex-col items-center text-center">
          <img
            src="https://mnmakhazghgncqummksu.supabase.co/storage/v1/object/public/assets/logo.png"
            alt="Logo ABC DO PARK"
            className="h-48 w-auto mb-4 object-contain"
          />
          <h2 className="text-2xl font-bold text-blue-900">ABC DO PARK</h2>
          <p className="text-xs text-blue-600 mt-1 uppercase tracking-widest font-semibold">Gestão Escolar</p>
        </div>

        {/* Links de Navegação - FONTE AUMENTADA (text-lg e font-bold) */}
        <nav className="flex-1 p-4 space-y-2">
          <Link href="/dashboard" className="block p-3 rounded-lg text-blue-900 hover:bg-blue-600/20 hover:text-blue-700 text-lg font-bold transition-all">
            📊 Dashboard
          </Link>
          <Link href="/dashboard/alunos" className="block p-3 rounded-lg text-blue-900 hover:bg-blue-600/20 hover:text-blue-700 text-lg font-bold transition-all">
            👨‍🎓 Alunos
          </Link>
          <Link href="/dashboard/turmas" className="block p-3 rounded-lg text-blue-900 hover:bg-blue-600/20 hover:text-blue-700 text-lg font-bold transition-all">
            🏫 Turmas
          </Link>
          
          <Link href="/dashboard/funcionarios" className="block p-3 rounded-lg text-blue-900 hover:bg-blue-600/20 hover:text-blue-700 text-lg font-bold transition-all">
            👥 Funcionários
          </Link>

          <Link href="/dashboard/financeiro" className="block p-3 rounded-lg text-blue-900 hover:bg-blue-600/20 hover:text-blue-700 text-lg font-bold transition-all">
            💰 Financeiro
          </Link>

          {/* LINK DE CONTAS A PAGAR */}
          <Link href="/dashboard/financeiro/contas-a-pagar" className="block p-3 rounded-lg text-blue-900 hover:bg-blue-600/20 hover:text-blue-700 text-lg font-bold transition-all">
            💸 Contas a Pagar
          </Link>

          <Link href="/dashboard/fechamento" className="block p-3 rounded-lg text-blue-900 hover:bg-blue-600/20 hover:text-blue-700 text-lg font-bold transition-all">
            🎓 Fechamento Letivo
          </Link>
        </nav>

        {/* Botão Sair */}
        <div className="p-4 border-t border-blue-200">
          <Link href="/" className="block p-3 rounded-lg text-red-600 hover:bg-red-50 text-lg font-bold transition-all text-center">
            Sair do Sistema
          </Link>
        </div>
      </aside>

      {/* Área Central */}
      <main className="flex-1 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}