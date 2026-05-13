"use client";
import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const router = useRouter();

  // Instância do Supabase preparada para trabalhar com Cookies (SSR)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    setMensagem("");

    // Tenta autenticar o usuário
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (error) {
      setMensagem("E-mail ou senha incorretos.");
      setCarregando(false);
    } else {
      // Login com sucesso! 
      // O 'refresh' ajuda o Middleware a notar que agora existe um usuário logado
      router.refresh();
      router.push("/dashboard");
    }
  }

  return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-blue-100">
        <div className="text-center mb-8">
          <img
            src="https://mnmakhazghgncqummksu.supabase.co/storage/v1/object/public/assets/logo.png"
            alt="Logo ABC DO PARK"
            className="h-32 mx-auto mb-4 object-contain"
          />
          <h2 className="text-2xl font-bold text-blue-900 uppercase">ABC DO PARK</h2>
          <p className="text-blue-600 text-sm font-semibold tracking-widest uppercase">Gestão Escolar</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 font-bold">E-mail Institucional</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-black"
              placeholder="exemplo@abcdopark.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 font-bold">Senha de Acesso</label>
            <input
              type="password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-black"
              placeholder="••••••••"
            />
          </div>

          {mensagem && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center font-bold">
              {mensagem}
            </div>
          )}

          <button
            type="submit"
            disabled={carregando}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50"
          >
            {carregando ? "Verificando..." : "Entrar no Sistema"}
          </button>
        </form>
      </div>
    </div>
  );
}