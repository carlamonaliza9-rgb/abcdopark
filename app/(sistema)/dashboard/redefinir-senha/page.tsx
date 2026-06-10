"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function RedefinirSenha() {
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);
  const router = useRouter();

  async function atualizarSenha(e: React.FormEvent) {
    e.preventDefault();
    
    if (novaSenha !== confirmarSenha) {
      return setMensagem("As senhas não coincidem.");
    }

    if (novaSenha.length < 6) {
      return setMensagem("A senha deve ter pelo menos 6 caracteres.");
    }

    setCarregando(true);
    setMensagem("");

    // O Supabase identifica o usuário pelo token que veio no link do e-mail
    const { error } = await supabase.auth.updateUser({
      password: novaSenha
    });

    if (error) {
      setMensagem(`Erro ao atualizar: ${error.message}`);
      setCarregando(false);
    } else {
      setMensagem("Senha atualizada com sucesso! Redirecionando...");
      setTimeout(() => {
        router.push("/"); // Corrigido de /login para / para evitar erro de página não encontrada
      }, 2000);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 w-full max-w-md text-center animate-in fade-in duration-500">
        
        <div className="mb-8">
          <img 
            src="https://mnmakhazghgncqummksu.supabase.co/storage/v1/object/public/assets/logo.png" 
            alt="Logo ABC DO PARK" 
            className="h-20 w-auto mx-auto mb-4 object-contain" 
          />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">ABC DO PARK</h1>
          <p className="text-[9px] font-black uppercase tracking-widest mt-1 text-indigo-600">
            Nova Senha de Acesso
          </p>
        </div>

        <form onSubmit={atualizarSenha} className="space-y-5">
          <div className="text-left">
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">
              Nova Senha
            </label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              required 
              disabled={carregando}
              className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div className="text-left">
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">
              Confirmar Nova Senha
            </label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              required 
              disabled={carregando}
              className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          {mensagem && (
            <div className={`p-3 rounded-lg text-[10px] font-black uppercase text-center border tracking-wider ${
              mensagem.includes("sucesso") 
                ? 'bg-green-50 border-green-200 text-green-700' 
                : 'bg-red-50 border-red-200 text-red-600'
            }`}>
              {mensagem}
            </div>
          )}

          <button 
            type="submit" 
            disabled={carregando}
            className={`w-full text-white p-3 rounded-xl font-black text-xs uppercase tracking-wider transition-colors ${
              carregando ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {carregando ? "Atualizando..." : "Atualizar Senha"}
          </button>
        </form>
      </div>
    </div>
  );
}