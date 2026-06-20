"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function GestaoUsuarios() {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [meuId, setMeuId] = useState<string | null>(null);

  useEffect(() => {
    async function verificarAcesso() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");

      setMeuId(user.id);

      const { data: perfil } = await supabase.from('perfis').select('cargo').eq('id', user.id).single();

      // BARREIRA DE SEGURANÇA: Somente o e-mail Master ou quem for Admin pode entrar aqui.
      const ehAutorizado = user.email === 'carlamonaliza9@gmail.com' || perfil?.cargo === 'Admin';
      
      if (!ehAutorizado) {
        alert("Acesso Negado: Apenas a administração possui acesso a esta área.");
        return router.push("/dashboard");
      }

      buscarUsuarios();
    }
    verificarAcesso();
  }, [router]);

  async function buscarUsuarios() {
    setCarregando(true);
    const { data, error } = await supabase.from('perfis').select('*').order('nome');
    if (data) setUsuarios(data);
    setCarregando(false);
  }

  async function alternarCargo(idSelecionado: string, cargoAtual: string, emailSelecionado: string) {
    // PROTEÇÃO 1: Evita a auto-demissão acidental
    if (idSelecionado === meuId) {
      return alert("Operação bloqueada: Você não pode alterar o próprio nível de acesso para evitar perda de administração.");
    }

    // PROTEÇÃO 2: Ninguém pode rebaixar a conta master
    if (emailSelecionado === 'carlamonaliza9@gmail.com') {
      return alert("Operação bloqueada: O cargo da conta raiz não pode ser alterado.");
    }

    const novoCargo = cargoAtual === 'Admin' ? 'Professor' : 'Admin';
    
    const confirmacao = confirm(`Tem a certeza absoluta que deseja mudar o cargo de ${cargoAtual} para ${novoCargo}?\nIsso alterará os acessos deste usuário imediatamente.`);
    if (!confirmacao) return;

    const { error } = await supabase
      .from('perfis')
      .update({ cargo: novoCargo })
      .eq('id', idSelecionado);

    if (!error) {
      alert("✅ Sucesso! Permissões de cargo atualizadas.");
      buscarUsuarios(); 
    } else {
      alert("❌ Erro ao atualizar no banco de dados. Verifique as políticas de segurança (RLS).");
    }
  }

  if (carregando) return <div style={{ padding: '40px', fontWeight: 'bold', color: '#64748b' }}>A validar credenciais e buscar utilizadores...</div>;

  return (
    <div style={{ padding: '30px', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '10px' }}>Administração de Utilizadores</h1>
      <p style={{ color: '#6b7280', marginBottom: '30px' }}>Gerencie de forma rigorosa quem tem acesso às funções de diretoria da escola.</p>

      <div style={{ backgroundColor: 'white', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f9fafb' }}>
            <tr>
              <th style={{ textAlign: 'left', padding: '15px' }}>Nome e Contacto</th>
              <th style={{ textAlign: 'left', padding: '15px' }}>Cargo Atual</th>
              <th style={{ textAlign: 'center', padding: '15px' }}>Nível de Acesso</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map(u => (
              <tr key={u.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                <td style={{ padding: '15px' }}>
                  <div style={{ fontWeight: 'bold' }}>{u.nome}</div>
                  <div style={{ fontSize: '12px', color: '#9ca3af' }}>{u.email}</div>
                </td>
                <td style={{ padding: '15px' }}>
                  <span style={{ 
                    backgroundColor: u.cargo === 'Admin' ? '#f5f3ff' : '#f1f5f9',
                    color: u.cargo === 'Admin' ? '#7e22ce' : '#475569',
                    padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold'
                  }}>
                    {u.cargo}
                  </span>
                </td>
                <td style={{ padding: '15px', textAlign: 'center' }}>
                  <button 
                    onClick={() => alternarCargo(u.id, u.cargo, u.email)}
                    style={{ 
                      padding: '8px 15px', 
                      borderRadius: '10px', 
                      border: '1px solid #e5e7eb', 
                      backgroundColor: 'white',
                      cursor: 'pointer', 
                      fontSize: '13px',
                      fontWeight: 'bold',
                      color: '#334155',
                      opacity: u.id === meuId || u.email === 'carlamonaliza9@gmail.com' ? 0.5 : 1
                    }}
                    disabled={u.id === meuId || u.email === 'carlamonaliza9@gmail.com'}
                  >
                    ⚙️ Alterar Permissão
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}