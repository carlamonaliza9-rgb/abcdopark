"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminDashboard() {
  const router = useRouter();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-blue-900">Painel Administrativo - ABC DO PARK</h1>
      <p className="text-gray-600 mt-2">Selecione uma opção no menu lateral para começar.</p>
      
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <button 
          onClick={() => router.push('/admin/alunos')}
          className="p-6 bg-white border border-blue-100 rounded-xl shadow-sm hover:bg-blue-50 transition text-left"
        >
          <span className="text-2xl">👨‍🎓</span>
          <h3 className="font-bold mt-2">Gerenciar Alunos</h3>
          <p className="text-sm text-gray-500">Cadastro, fichas e boletins.</p>
        </button>
        
        <button 
          onClick={() => router.push('/admin/turmas')}
          className="p-6 bg-white border border-blue-100 rounded-xl shadow-sm hover:bg-blue-50 transition text-left"
        >
          <span className="text-2xl">🏫</span>
          <h3 className="font-bold mt-2">Gerenciar Turmas</h3>
          <p className="text-sm text-gray-500">Configuração de disciplinas e horários.</p>
        </button>
      </div>
    </div>
  );
}