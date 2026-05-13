"use client";
import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [ehCadastro, setEhCadastro] = useState(false);
  const [esqueciSenha, setEsqueciSenha] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);
  const router = useRouter();

  // Instância do Supabase preparada para trabalhar com Cookies (SSR)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  async function lidarRecuperacao(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    setMensagem("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });

    if (error) {
      setMensagem(`Erro: ${error.message}`);
    } else {
      setMensagem("E-mail de recuperação enviado! Verifique sua caixa de entrada.");
    }
    setCarregando(false);
  }

  async function lidarFormulario(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    setMensagem("");

    if (ehCadastro) {
      const { error } = await supabase.auth.signUp({
        email,
        password: senha,
        options: { data: { nome: nome } },
      });

      if (error) {
        setMensagem(`Erro no cadastro: ${error.message}`);
      } else {
        setMensagem("Conta criada com sucesso! Verifique seu e-mail.");
        setEhCadastro(false);
      }
      setCarregando(false);
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      });

      if (error) {
        setMensagem("E-mail ou senha incorretos.");
        setCarregando(false);
      } else {
        // ESSENCIAL: refresh avisa o Middleware que agora o usuário tem o "crachá"
        router.refresh();
        router.push("/dashboard");
      }
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-[2rem] shadow-2xl p-8 border border-slate-100">
        
        <div className="text-center mb-8 flex flex-col items-center">
          <img 
            src="https://mnmakhazghgncqummksu.supabase.co/storage/v1/object/public/assets/logo.png" 
            alt="Logo ABC DO PARK" 
            className="h-24 w-auto mb-4 object-contain" 
          />
          <h2 className="text-3xl font-black text-blue-700 tracking-tight">ABC DO PARK</h2>
          <p className="text-slate-500 text-sm mt-1 font-medium uppercase tracking-wider">
            {esqueciSenha ? "Recuperação de Acesso" : ehCadastro ? "Criar Conta Administrativa" : "Portal de Gestão Escolar"}
          </p>
        </div>

        {esqueciSenha ? (
          <form onSubmit={lidarRecuperacao} className="space-y-5">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 ml-1 uppercase">E-mail Cadastrado</label>
              <input 
                type="email" 
                placeholder="seu@email.com" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                className="w-full p-4 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-slate-50 text-black" 
              />
            </div>
            {mensagem && (
              <div className={`p-4 rounded-xl text-sm font-bold text-center ${mensagem.includes("Erro") ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                {mensagem}
              </div>
            )}
            <button 
              type="submit" 
              disabled={carregando} 
              className="w-full py-4 rounded-2xl bg-blue-600 text-white font-bold text-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50"
            >
              {carregando ? "ENVIANDO..." : "ENVIAR RECUPERAÇÃO"}
            </button>
            <button 
              type="button" 
              onClick={() => { setEsqueciSenha(false); setMensagem(""); }} 
              className="w-full text-slate-500 text-sm font-semibold hover:text-blue-600 transition-colors"
            >
              Voltar para o login
            </button>
          </form>
        ) : (
          <form onSubmit={lidarFormulario} className="space-y-5">
            {ehCadastro && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 ml-1 uppercase">Nome Completo</label>
                <input 
                  type="text" 
                  placeholder="Seu nome" 
                  value={nome} 
                  onChange={(e) => setNome(e.target.value)} 
                  required={ehCadastro} 
                  className="w-full p-4 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-slate-50 text-black" 
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 ml-1 uppercase">E-mail Institucional</label>
              <input 
                type="email" 
                placeholder="seu@email.com" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                className="w-full p-4 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-slate-50 text-black" 
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 ml-1 uppercase">Senha de Acesso</label>
              <input 
                type="password" 
                placeholder="••••••••" 
                value={senha} 
                onChange={(e) => setSenha(e.target.value)} 
                required 
                className="w-full p-4 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-slate-50 text-black" 
              />
              {!ehCadastro && (
                <button 
                  type="button" 
                  onClick={() => { setEsqueciSenha(true); setMensagem(""); }} 
                  className="text-[10px] font-black text-blue-600 uppercase float-right mt-1 hover:underline"
                >
                  Esqueceu a senha?
                </button>
              )}
            </div>
            
            {mensagem && (
              <div className={`p-4 rounded-xl text-sm font-bold text-center ${mensagem.includes("Erro") ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                {mensagem}
              </div>
            )}

            <button 
              type="submit" 
              disabled={carregando} 
              className="w-full py-4 rounded-2xl bg-blue-600 text-white font-bold text-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50"
            >
              {carregando ? "PROCESSANDO..." : ehCadastro ? "CRIAR MINHA CONTA" : "ENTRAR NO SISTEMA"}
            </button>
          </form>
        )}

        <div className="mt-8 text-center">
          <p className="text-slate-500 text-sm font-medium">
            {ehCadastro ? "Já possui acesso?" : "Ainda não tem conta?"}
            <button 
              onClick={() => { setEhCadastro(!ehCadastro); setEsqueciSenha(false); setMensagem(""); }} 
              className="ml-2 text-blue-600 font-bold hover:underline"
            >
              {ehCadastro ? "Fazer Login" : "Cadastre-se agora"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}