"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { confirmarAcaoCritica } from "@/lib/auth/client";
import { APP_ROLES, temPermissao, type AppRole } from "@/lib/auth/permissions";

type PerfilUsuario = {
  id: string;
  nome: string | null;
  email: string | null;
  cargo: string | null;
};

export default function GestaoUsuarios() {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<PerfilUsuario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [meuId, setMeuId] = useState<string | null>(null);

  useEffect(() => {
    async function verificarAcesso() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/");

      setMeuId(user.id);

      const { data: perfil } = await supabase.from('perfis').select('cargo').eq('id', user.id).single();

      const ehAutorizado = temPermissao(perfil?.cargo, 'usuarios.gerenciar');
      
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
    const { data } = await supabase.from('perfis').select('id, nome, email, cargo').order('nome');
    if (data) setUsuarios(data);
    setCarregando(false);
  }

  async function alterarCargo(idSelecionado: string, cargoAtual: string | null, novoCargo: AppRole) {
    // PROTEÇÃO 1: Evita a auto-demissão acidental
    if (idSelecionado === meuId) {
      return alert("Operação bloqueada: Você não pode alterar o próprio nível de acesso para evitar perda de administração.");
    }

    if (novoCargo === cargoAtual) return;
    if (!(await confirmarAcaoCritica({ permissao: 'usuarios.gerenciar', titulo: 'Alterar cargo do usuário', descricao: `Mudar o cargo de ${cargoAtual || 'não definido'} para ${novoCargo}.` }))) return;
    
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
                  <select
                    value={u.cargo || 'Responsável'}
                    onChange={(evento) => alterarCargo(u.id, u.cargo, evento.target.value as AppRole)}
                    style={{ 
                      padding: '8px 15px', 
                      borderRadius: '10px', 
                      border: '1px solid #e5e7eb', 
                      backgroundColor: 'white',
                      cursor: 'pointer', 
                      fontSize: '13px',
                      fontWeight: 'bold',
                      color: '#334155',
                      opacity: u.id === meuId ? 0.5 : 1
                    }}
                    disabled={u.id === meuId}
                  >
                    {APP_ROLES.map((cargo) => <option key={cargo} value={cargo}>{cargo}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
