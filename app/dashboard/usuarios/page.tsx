"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function GestaoUsuarios() {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  // Função que busca na tabela 'perfis' (aquela que você criou no SQL)
  async function buscarUsuarios() {
    setCarregando(true);
    const { data, error } = await supabase.from('perfis').select('*').order('nome');
    if (data) setUsuarios(data);
    setCarregando(false);
  }

  useEffect(() => { buscarUsuarios(); }, []);

  // Função para mudar o cargo (Admin <-> Professor)
  async function alternarCargo(id: string, cargoAtual: string) {
    const novoCargo = cargoAtual === 'Admin' ? 'Professor' : 'Admin';
    
    const confirmacao = confirm(`Deseja mudar o cargo de ${cargoAtual} para ${novoCargo}?`);
    if (!confirmacao) return;

    const { error } = await supabase
      .from('perfis')
      .update({ cargo: novoCargo })
      .eq('id', id);

    if (!error) {
      alert("Sucesso! Cargo atualizado.");
      buscarUsuarios(); // Atualiza a lista na tela
    } else {
      alert("Erro: Verifique se você é o administrador principal.");
    }
  }

  if (carregando) return <div style={{ padding: '40px' }}>Carregando usuários...</div>;

  return (
    <div style={{ padding: '30px', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '10px' }}>Administradores e Professores</h1>
      <p style={{ color: '#6b7280', marginBottom: '30px' }}>Gerencie quem tem acesso às funções de diretoria da escola.</p>

      <div style={{ backgroundColor: 'white', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f9fafb' }}>
            <tr>
              <th style={{ textAlign: 'left', padding: '15px' }}>Nome</th>
              <th style={{ textAlign: 'left', padding: '15px' }}>Cargo Atual</th>
              <th style={{ textAlign: 'center', padding: '15px' }}>Ação</th>
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
                    onClick={() => alternarCargo(u.id, u.cargo)}
                    style={{ padding: '8px 15px', borderRadius: '10px', border: '1px solid #e5e7eb', cursor: 'pointer', fontSize: '13px' }}
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