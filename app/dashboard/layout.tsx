import Link from "next/link";

// Configuração para forçar o zoom inicial em 50% no celular
export const viewport = {
  width: 'device-width',
  initialScale: 1.0,
  maximumScale: 1,
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Menu Lateral (Sidebar) - Escondido ou ajustado para mobile no futuro */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm">
        {/* Cabeçalho com Logo - Centralizado */}
        <div className="p-6 border-b border-gray-100 flex flex-col items-center text-center">
          <img 
            src="https://mnmakhazghgncqummksu.supabase.co/storage/v1/object/public/assets/logo.jpg.jpg" 
            alt="Logo ABC DO PARK" 
            className="h-16 w-auto mb-3 object-contain" 
          />
          <h2 className="text-2xl font-bold text-blue-600">ABC DO PARK</h2>
          <p className="text-xs text-gray-400 mt-1">Gestão Escolar</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <Link href="/dashboard" className="block p-3 rounded-lg hover:bg-blue-50 text-gray-700 hover:text-blue-600 font-medium transition-colors">
            📊 Dashboard
          </Link>
          <Link href="/dashboard/alunos" className="block p-3 rounded-lg hover:bg-blue-50 text-gray-700 hover:text-blue-600 font-medium transition-colors">
            👨‍🎓 Alunos
          </Link>
          <Link href="/dashboard/turmas" className="block p-3 rounded-lg hover:bg-blue-50 text-gray-700 hover:text-blue-600 font-medium transition-colors">
            🏫 Turmas
          </Link>
          <Link href="/dashboard/financeiro" className="block p-3 rounded-lg hover:bg-blue-50 text-gray-700 hover:text-blue-600 font-medium transition-colors">
            💰 Financeiro
          </Link>
          <Link href="/dashboard/fechamento" className="block p-3 rounded-lg hover:bg-blue-50 text-gray-700 hover:text-blue-600 font-medium transition-colors">
            🎓 Fechamento Letivo
          </Link>
        </nav>

        <div className="p-4 border-t border-gray-100">
          <Link href="/" className="block p-3 rounded-lg text-red-500 hover:bg-red-50 font-medium transition-colors text-center">
            Sair do Sistema
          </Link>
        </div>
      </aside>

      {/* Área Central */}
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  );
}