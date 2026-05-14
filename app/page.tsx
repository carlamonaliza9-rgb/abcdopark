"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function Login() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [ehCadastro, setEhCadastro] = useState(false);
  const [esqueciSenha, setEsqueciSenha] = useState(false);
  const router = useRouter();

  const lidarRecuperacao = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    setSucesso("");
    setCarregando(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/dashboard/redefinir-senha`,
      });

      if (error) {
        setErro(`Erro: ${error.message}`);
      } else {
        setSucesso("E-mail de recuperação enviado! Verifique sua caixa de entrada.");
      }
    } catch (err) {
      setErro("Ocorreu um erro no servidor. Tente mais tarde.");
    } finally {
      setCarregando(false);
    }
  };

  const fazerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    setSucesso("");
    setCarregando(true);

    try {
      if (ehCadastro) {
        const { data, error } = await supabase.auth.signUp({
          email: email,
          password: senha,
          options: { data: { nome: nome } },
        });

        if (error) {
          setErro(`Erro no cadastro: ${error.message}`);
        } else {
          setSucesso("Conta criada com sucesso! Verifique seu e-mail.");
          setEhCadastro(false);
        }
      } else {
        console.log("🔍 1. Buscando todos os vínculos para:", email);
        
        // Busca todos os alunos sem o .maybeSingle() para evitar erro PGRST116
        const { data: listaAlunos } = await supabase
          .from('alunos')
          .select('data_nascimento, responsavel, responsavel_2_nome, responsavel_3_nome, email_responsavel, email_responsavel_2, email_responsavel_3')
          .or(`email_responsavel.eq.${email},email_responsavel_2.eq.${email},email_responsavel_3.eq.${email}`);

        const datasValidas: string[] = [];
        let alunoReferencia = null;

        if (listaAlunos && listaAlunos.length > 0) {
          alunoReferencia = listaAlunos[0];
          listaAlunos.forEach(aluno => {
            if (aluno.data_nascimento) {
              const partes = aluno.data_nascimento.split("-");
              datasValidas.push(`${partes[2]}${partes[1]}${partes[0]}`); // Formato DDMMAAAA
            }
          });
        }

        console.log("🔍 2. Datas de nascimento válidas encontradas:", datasValidas);

        // --- TENTATIVA 1: Login com a senha digitada pelo usuário ---
        let { data, error } = await supabase.auth.signInWithPassword({
          email: email,
          password: senha,
        });

        // --- TENTATIVA 2: Se falhar, testamos as outras datas (caso a conta use a data do outro filho) ---
        if (error && error.message.includes("Invalid login credentials") && datasValidas.length > 1) {
          console.log("🔄 3. Senha não abriu. Testando datas dos outros filhos...");
          for (const dataNasc of datasValidas) {
            if (dataNasc === senha) continue; // Pula a que já testamos
            
            const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
              email: email,
              password: dataNasc
            });

            if (!retryError) {
              console.log("✅ 4. Login realizado com a data do outro filho!");
              data = retryData;
              error = null;
              break;
            }
          }
        }

        // --- TENTATIVA 3: Auto-Cadastro (Se a senha for válida para um filho mas a conta não existe) ---
        if (error && error.message.includes("Invalid login credentials") && alunoReferencia) {
          const senhaEhValida = datasValidas.includes(senha);
          
          if (senhaEhValida) {
            console.log("🔄 5. Conta inexistente. Iniciando Auto-Cadastro...");
            
            let nomeResp = alunoReferencia.responsavel;
            if (alunoReferencia.email_responsavel_2 === email) nomeResp = alunoReferencia.responsavel_2_nome;
            if (alunoReferencia.email_responsavel_3 === email) nomeResp = alunoReferencia.responsavel_3_nome;

            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
              email: email,
              password: senha, // A conta será criada com a data digitada
              options: { data: { nome: nomeResp } }
            });

            if (!signUpError && signUpData.user) {
              await supabase.from('perfis').upsert([{
                id: signUpData.user.id,
                email: email,
                nome: nomeResp,
                cargo: 'Responsável'
              }], { onConflict: 'id' });

              await supabase.auth.signInWithPassword({ email, password: senha });
              router.push("/dashboard");
              return;
            }
          }
        }

        if (error) {
          setErro("E-mail ou senha incorretos. Tente novamente.");
        } else if (data?.session) {
          router.push("/dashboard");
        }
      }
    } catch (err) {
      console.error("🛑 Erro crítico:", err);
      setErro("Ocorreu um erro no servidor. Tente mais tarde.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 w-full max-w-md">
        
        <div className="text-center mb-8">
          <img 
            src="https://mnmakhazghgncqummksu.supabase.co/storage/v1/object/public/assets/logo.png" 
            alt="Logo ABC DO PARK" 
            className="h-20 w-auto mx-auto mb-4 object-contain" 
          />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">ABC DO PARK</h1>
          <p className="text-gray-500">
            {esqueciSenha ? "Recuperação de Acesso" : ehCadastro ? "Criar Conta" : "Portal da Escola"}
          </p>
        </div>

        {erro && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center mb-4 border border-red-200">
            {erro}
          </div>
        )}

        {sucesso && (
          <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm text-center mb-4 border border-green-200">
            {sucesso}
          </div>
        )}

        {esqueciSenha ? (
          <form onSubmit={lidarRecuperacao} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                E-mail Cadastrado
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
            <button 
              type="submit" 
              disabled={carregando}
              className={`w-full text-white p-3 rounded-lg font-semibold transition-colors ${
                carregando ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {carregando ? "Enviando..." : "Enviar link de recuperação"}
            </button>
            <button 
              type="button" 
              onClick={() => { setEsqueciSenha(false); setErro(""); setSucesso(""); }} 
              className="w-full text-sm text-gray-500 hover:text-blue-600 mt-2 transition-colors"
            >
              Voltar para o login
            </button>
          </form>
        ) : (
          <form onSubmit={fazerLogin} className="space-y-5">
            {ehCadastro && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Completo
                </label>
                <input 
                  type="text" 
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome" 
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required={ehCadastro}
                />
              </div>
            )}

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
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Senha
                </label>
                {!ehCadastro && (
                  <button 
                    type="button" 
                    onClick={() => { setEsqueciSenha(true); setErro(""); setSucesso(""); }} 
                    className="text-xs text-blue-600 hover:underline font-medium"
                  >
                    Esqueceu a senha?
                  </button>
                )}
              </div>
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
              {carregando ? "Processando..." : ehCadastro ? "Criar Conta" : "Entrar no Sistema"}
            </button>
          </form>
        )}

        {!esqueciSenha && (
          <div className="mt-6 text-center text-sm text-gray-600">
            {ehCadastro ? "Já tem uma conta?" : "Ainda não tem acesso?"}{" "}
            <button 
              type="button" 
              onClick={() => { setEhCadastro(!ehCadastro); setErro(""); setSucesso(""); }} 
              className="text-blue-600 font-semibold hover:underline"
            >
              {ehCadastro ? "Faça login" : "Cadastre-se"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}