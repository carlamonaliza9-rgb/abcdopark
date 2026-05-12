"use client";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const router = useRouter();

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-blue-900 mb-4">Painel Administrativo</h1>
      <p className="text-gray-600 mb-8">Bem-vinda à gestão central da ABC DO PARK.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button 
          onClick={() => router.push('/admin/alunos')}
          className="p-6 bg-white border border-blue-100 rounded-2xl shadow-sm hover:shadow-md transition text-left"
        >
          <div className="text-3xl mb-3">👨‍🎓</div>
          <h3 className="text-xl font-bold text-blue-800">Gerenciar Alunos</h3>
          <p className="text-gray-500 text-sm">Matrículas, fichas e boletins.</p>
        </button>

        <button 
          onClick={() => router.push('/admin/financeiro')}
          className="p-6 bg-white border border-blue-100 rounded-2xl shadow-sm hover:shadow-md transition text-left"
        >
          <div className="text-3xl mb-3">💰</div>
          <h3 className="text-xl font-bold text-blue-800">Financeiro</h3>
          <p className="text-gray-500 text-sm">Controle de mensalidades e contas.</p>
        </button>
      </div>
    </div>
  );
}