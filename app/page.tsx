"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const router = useRouter();

  const fazerLogin = async (e: React.FormEvent) => {
    e.preventDefault(); // Impede a página de recarregar
    setErro("");
    setCarregando(true);

    try {
      // 1. Tenta fazer o login no Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: senha,
      });

      if (error) {
        setErro("E-mail ou senha incorretos. Tente novamente.");
        return;
      }

      // 2. Se deu certo, vai para o painel principal
      if (data.session) {
        router.push("/dashboard");
      }
    } catch (err) {
      setErro("Ocorreu um erro no servidor. Tente mais tarde.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 w-full max-w-md">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">ABC DO PARK</h1>
          <p className="text-gray-500">Portal da Escola</p>
        </div>

        {/* Caixinha de Erro (só aparece se der erro) */}
        {erro && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center mb-4 border border-red-200">
            {erro}
          </div>
        )}

        <form onSubmit={fazerLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              E-mail
            </label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Digite seu e-mail" 
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Senha
            </label>
            <input 
              type="password" 
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••" 
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={carregando}
            className={`w-full text-white p-3 rounded-lg font-semibold transition-colors ${
              carregando ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {carregando ? "Entrando..." : "Entrar no Sistema"}
          </button>
        </form>

      </div>
    </div>
  );
}