"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function Login() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [ehCadastro, setEhCadastro] = useState(false);
  const [esqueciSenha, setEsqueciSenha] = useState(false); // Novo estado para tela de recuperação
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);
  const router = useRouter();

  // Função para enviar e-mail de recuperação
  async function lidarRecuperacao(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    setMensagem("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/dashboard/redefinir-senha`,
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
        setMensagem("Erro: Usuário ou senha inválidos.");
        setCarregando(false);
      } else {
        router.push("/dashboard");
      }
    }
  }

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6', fontFamily: 'sans-serif' }}>
      <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
        
        <div style={{ marginBottom: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img src="https://mnmakhazghgncqummksu.supabase.co/storage/v1/object/public/assets/logo.jpg.jpg" alt="Logo ABC DO PARK" style={{ height: '80px', width: 'auto', marginBottom: '15px', objectFit: 'contain' }} />
          <h2 style={{ color: '#2563eb', fontWeight: '800', margin: '0', fontSize: '24px' }}>ABC DO PARK</h2>
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '5px' }}>
            {esqueciSenha ? "Recuperação de Acesso" : ehCadastro ? "Crie sua conta administrativa" : "Portal de Gestão Escolar"}
          </p>
        </div>

        {/* FORMULÁRIO DE RECUPERAÇÃO DE SENHA */}
        {esqueciSenha ? (
          <form onSubmit={lidarRecuperacao} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ textAlign: 'left' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#4b5563', marginBottom: '5px', display: 'block', marginLeft: '5px' }}>E-MAIL CADASTRADO</label>
              <input type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '16px' }} />
            </div>
            {mensagem && (
              <div style={{ backgroundColor: mensagem.includes("Erro") ? '#fee2e2' : '#dcfce7', color: mensagem.includes("Erro") ? '#ef4444' : '#166534', padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold' }}>
                {mensagem}
              </div>
            )}
            <button type="submit" disabled={carregando} style={{ padding: '16px', borderRadius: '12px', backgroundColor: carregando ? '#93c5fd' : '#2563eb', color: 'white', fontWeight: 'bold', border: 'none', cursor: carregando ? 'not-allowed' : 'pointer', fontSize: '16px', marginTop: '10px' }}>
              {carregando ? "ENVIANDO..." : "ENVIAR LINK DE RECUPERAÇÃO"}
            </button>
            <button type="button" onClick={() => { setEsqueciSenha(false); setMensagem(""); }} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '14px', cursor: 'pointer' }}>
              Voltar para o login
            </button>
          </form>
        ) : (
          /* FORMULÁRIO DE LOGIN / CADASTRO */
          <form onSubmit={lidarFormulario} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {ehCadastro && (
              <div style={{ textAlign: 'left' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#4b5563', marginBottom: '5px', display: 'block', marginLeft: '5px' }}>NOME COMPLETO</label>
                <input type="text" placeholder="Seu nome" value={nome} onChange={(e) => setNome(e.target.value)} required={ehCadastro} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '16px' }} />
              </div>
            )}

            <div style={{ textAlign: 'left' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#4b5563', marginBottom: '5px', display: 'block', marginLeft: '5px' }}>E-MAIL</label>
              <input type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '16px' }} />
            </div>

            <div style={{ textAlign: 'left' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#4b5563', marginBottom: '5px', display: 'block', marginLeft: '5px' }}>SENHA</label>
              <input type="password" placeholder="••••••••" value={senha} onChange={(e) => setSenha(e.target.value)} required style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '16px' }} />
              
              {!ehCadastro && (
                <button type="button" onClick={() => { setEsqueciSenha(true); setMensagem(""); }} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', float: 'right', marginTop: '5px' }}>
                  Esqueceu a senha?
                </button>
              )}
            </div>
            
            {mensagem && (
              <div style={{ backgroundColor: ehCadastro && !mensagem.includes("Erro") ? '#dcfce7' : '#fee2e2', color: ehCadastro && !mensagem.includes("Erro") ? '#166534' : '#ef4444', padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', marginTop: '10px' }}>
                {mensagem}
              </div>
            )}

            <button type="submit" disabled={carregando} style={{ padding: '16px', borderRadius: '12px', backgroundColor: carregando ? '#93c5fd' : '#2563eb', color: 'white', fontWeight: 'bold', border: 'none', cursor: carregando ? 'not-allowed' : 'pointer', fontSize: '16px', marginTop: '10px' }}>
              {carregando ? "PROCESSANDO..." : ehCadastro ? "CRIAR CONTA" : "ENTRAR NO SISTEMA"}
            </button>
          </form>
        )}

        <p style={{ marginTop: '20px', fontSize: '14px', color: '#6b7280' }}>
          {ehCadastro ? "Já tem uma conta?" : "Ainda não tem acesso?"} {" "}
          <button onClick={() => { setEhCadastro(!ehCadastro); setEsqueciSenha(false); setMensagem(""); }} style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }}>
            {ehCadastro ? "Faça login" : "Cadastre-se"}
          </button>
        </p>
      </div>
    </div>
  );
}