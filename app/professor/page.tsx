"use client";
import { useRouter } from "next/navigation";

export default function ProfessorDashboard() {
  const router = useRouter();

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-blue-900 mb-4">Portal do Professor</h1>
      <p className="text-gray-600 mb-8">Olá! Selecione uma opção para gerenciar suas atividades escolares.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button 
          onClick={() => router.push('/professor/turmas')}
          className="p-6 bg-white border border-blue-100 rounded-2xl shadow-sm hover:shadow-md transition text-left"
        >
          <div className="text-3xl mb-3">🏫</div>
          <h3 className="text-xl font-bold text-blue-800">Minhas Turmas</h3>
          <p className="text-gray-500 text-sm">Acesse a lista de alunos e frequências.</p>
        </button>

        <button 
          onClick={() => router.push('/professor/diario')}
          className="p-6 bg-white border border-blue-100 rounded-2xl shadow-sm hover:shadow-md transition text-left"
        >
          <div className="text-3xl mb-3">📒</div>
          <h3 className="text-xl font-bold text-blue-800">Diário de Classe</h3>
          <p className="text-gray-500 text-sm">Lançamento de notas e conteúdos.</p>
        </button>
      </div>
    </div>
  );
}