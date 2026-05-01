"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);
  const router = useRouter();

  async function lidarLogin(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    setMensagem("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (error) {
      setMensagem("Erro: Usuário ou senha inválidos.");
      setCarregando(false);
    } else {
      router.push("/dashboard"); // Vai para o sistema após o login
    }
  }

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      backgroundColor: '#f3f4f6',
      fontFamily: 'sans-serif' 
    }}>
      <div style={{ 
        backgroundColor: 'white', 
        padding: '40px', 
        borderRadius: '24px', 
        boxShadow: '0 10px 25px rgba(0,0,0,0.05)', 
        width: '100%', 
        maxWidth: '400px',
        textAlign: 'center'
      }}>
        
        {/* CABEÇALHO COM LOGO */}
        <div style={{ marginBottom: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img 
            src="https://mnmakhazghgncqummksu.supabase.co/storage/v1/object/public/assets/logo.jpg.jpg" 
            alt="Logo ABC DO PARK" 
            style={{ height: '80px', width: 'auto', marginBottom: '15px', objectFit: 'contain' }} 
          />
          <h2 style={{ color: '#2563eb', fontWeight: '800', margin: '0', fontSize: '24px' }}>ABC DO PARK</h2>
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '5px' }}>Portal de Gestão Escolar</p>
        </div>

        <form onSubmit={lidarLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ textAlign: 'left' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#4b5563', marginBottom: '5px', display: 'block', marginLeft: '5px' }}>
              E-MAIL
            </label>
            <input 
              type="email" 
              placeholder="seu@email.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '16px' }}
            />
          </div>

          <div style={{ textAlign: 'left' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#4b5563', marginBottom: '5px', display: 'block', marginLeft: '5px' }}>
              SENHA
            </label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '16px' }}
            />
          </div>
          
          {mensagem && (
            <div style={{ backgroundColor: '#fee2e2', color: '#ef4444', padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold' }}>
              {mensagem}
            </div>
          )}

          <button 
            type="submit" 
            disabled={carregando}
            style={{ 
              padding: '16px', 
              borderRadius: '12px', 
              backgroundColor: carregando ? '#93c5fd' : '#2563eb', 
              color: 'white', 
              fontWeight: 'bold', 
              border: 'none', 
              cursor: carregando ? 'not-allowed' : 'pointer',
              transition: '0.3s',
              fontSize: '16px',
              boxShadow: '0 4px 6px rgba(37, 99, 235, 0.2)'
            }}
          >
            {carregando ? "ENTRANDO..." : "ENTRAR NO SISTEMA"}
          </button>
        </form>
      </div>
    </div>
  );
}