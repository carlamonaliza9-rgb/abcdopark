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

      {/* Menu Lateral (Sidebar) - COR ALTERADA PARA VERDE ESCURO */}
      <aside className="w-64 bg-emerald-900 flex flex-col shadow-xl">
        {/* Cabeçalho com Logo - Fundo levemente mais escuro para destaque */}
        <div className="p-6 border-b border-emerald-800 flex flex-col items-center text-center">
          <img
            src="https://mnmakhazghgncqummksu.supabase.co/storage/v1/object/public/assets/logo.jpg.jpg"
            alt="Logo ABC DO PARK"
            className="h-16 w-auto mb-3 object-contain rounded-lg"
          />
          <h2 className="text-2xl font-bold text-white">ABC DO PARK</h2>
          <p className="text-xs text-emerald-400 mt-1 uppercase tracking-widest">Gestão Escolar</p>
        </div>

        {/* Links de Navegação com cores ajustadas para o fundo escuro */}
        <nav className="flex-1 p-4 space-y-2">
          <Link href="/dashboard" className="block p-3 rounded-lg text-emerald-100 hover:bg-emerald-800 hover:text-white font-medium transition-all">
            📊 Dashboard
          </Link>
          <Link href="/dashboard/alunos" className="block p-3 rounded-lg text-emerald-100 hover:bg-emerald-800 hover:text-white font-medium transition-all">
            👨‍🎓 Alunos
          </Link>
          <Link href="/dashboard/turmas" className="block p-3 rounded-lg text-emerald-100 hover:bg-emerald-800 hover:text-white font-medium transition-all">
            🏫 Turmas
          </Link>
          
          <Link href="/dashboard/funcionarios" className="block p-3 rounded-lg text-emerald-100 hover:bg-emerald-800 hover:text-white font-medium transition-all">
            👥 Funcionários
          </Link>

          <Link href="/dashboard/financeiro" className="block p-3 rounded-lg text-emerald-100 hover:bg-emerald-800 hover:text-white font-medium transition-all">
            💰 Financeiro
          </Link>

          {/* LINK DE CONTAS A PAGAR */}
          <Link href="/dashboard/financeiro/contas-a-pagar" className="block p-3 rounded-lg text-emerald-100 hover:bg-emerald-800 hover:text-white font-medium transition-all">
            💸 Contas a Pagar
          </Link>

          <Link href="/dashboard/fechamento" className="block p-3 rounded-lg text-emerald-100 hover:bg-emerald-800 hover:text-white font-medium transition-all">
            🎓 Fechamento Letivo
          </Link>
        </nav>

        {/* Botão Sair com destaque sutil */}
        <div className="p-4 border-t border-emerald-800">
          <Link href="/" className="block p-3 rounded-lg text-emerald-300 hover:bg-red-900 hover:text-white font-medium transition-all text-center">
            Sair do Sistema
          </Link>
        </div>
      </aside>

      {/* Área Central (Mantida branca/cinza claro para foco no conteúdo) */}
      <main className="flex-1 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}