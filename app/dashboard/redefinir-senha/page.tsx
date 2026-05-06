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
        router.push("/login");
      }, 2000);
    }
  }

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6', fontFamily: 'sans-serif' }}>
      <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
        
        <div style={{ marginBottom: '30px' }}>
          <h2 style={{ color: '#2563eb', fontWeight: '800', margin: '0', fontSize: '24px' }}>Nova Senha</h2>
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '5px' }}>Crie uma nova senha para acessar o portal.</p>
        </div>

        <form onSubmit={atualizarSenha} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ textAlign: 'left' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#4b5563', marginBottom: '5px', display: 'block', marginLeft: '5px' }}>NOVA SENHA</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              required 
              style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '16px' }} 
            />
          </div>

          <div style={{ textAlign: 'left' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#4b5563', marginBottom: '5px', display: 'block', marginLeft: '5px' }}>CONFIRMAR NOVA SENHA</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              required 
              style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '16px' }} 
            />
          </div>

          {mensagem && (
            <div style={{ 
              backgroundColor: mensagem.includes("sucesso") ? '#dcfce7' : '#fee2e2', 
              color: mensagem.includes("sucesso") ? '#166534' : '#ef4444', 
              padding: '10px', 
              borderRadius: '8px', 
              fontSize: '13px', 
              fontWeight: 'bold' 
            }}>
              {mensagem}
            </div>
          )}

          <button 
            type="submit" 
            disabled={carregando}
            style={{ padding: '16px', borderRadius: '12px', backgroundColor: carregando ? '#93c5fd' : '#2563eb', color: 'white', fontWeight: 'bold', border: 'none', cursor: carregando ? 'not-allowed' : 'pointer', fontSize: '16px' }}
          >
            {carregando ? "ATUALIZANDO..." : "ATUALIZAR SENHA"}
          </button>
        </form>
      </div>
    </div>
  );
}