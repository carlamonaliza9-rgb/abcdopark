"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LogsAdminPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [verificandoAcesso, setVerificandoAcesso] = useState(true);

  // --- TRAVA DE SEGURANÇA E CARREGAMENTO ---
  useEffect(() => {
    async function verificarAcesso() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");

      const emailAtual = user.email || "";
      const { data: perfil } = await supabase.from('perfis').select('cargo').eq('id', user.id).single();

      const ehAdmin = 
        emailAtual === 'carlamonaliza9@gmail.com' || 
        emailAtual === 'diretoria@abcdopark.com' || 
        perfil?.cargo === 'Admin';

      if (!ehAdmin) {
        return router.push("/dashboard");
      }

      await buscarLogs();
      setVerificandoAcesso(false);
    }
    verificarAcesso();
  }, [router]);

  async function buscarLogs() {
    setCarregando(true);
    const { data, error } = await supabase
      .from('logs_sistema')
      .select('*')
      .order('criado_em', { ascending: false }); // Mostra os mais recentes primeiro

    if (error) {
      console.error("Erro ao buscar logs:", error.message);
    } else if (data) {
      setLogs(data);
    }
    setCarregando(false);
  }

  // Filtra os logs pelo e-mail do usuário ou pelos detalhes da ação
  const logsFiltrados = logs.filter(log => 
    log.usuario_email.toLowerCase().includes(busca.toLowerCase()) ||
    log.detalhes.toLowerCase().includes(busca.toLowerCase()) ||
    log.acao.toLowerCase().includes(busca.toLowerCase())
  );

  // Função auxiliar para colorir os crachás de ação
  const obterEstiloAcao = (acao: string) => {
    switch (acao) {
      case "INSERÇÃO":
        return { backgroundColor: '#e6f4ea', color: '#137333' }; // Verde
      case "EDIÇÃO":
        return { backgroundColor: '#feefe3', color: '#b06000' }; // Laranja
      case "EXCLUSÃO":
        return { backgroundColor: '#fce8e6', color: '#c5221f' }; // Vermelho
      default:
        return { backgroundColor: '#f1f3f4', color: '#3c4043' }; // Cinza
    }
  };

  if (verificandoAcesso) return <div style={{ padding: '50px', textAlign: 'center' }}>Validando credenciais de auditoria...</div>;

  return (
    <div style={{ width: '100%', padding: '25px', fontFamily: 'sans-serif', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      
      {/* Cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 'bold', color: '#111827', margin: 0 }}>🛡️ Logs do Sistema</h1>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>Auditoria e histórico de alterações da plataforma ABC DO PARK</p>
        </div>
        <div>
          <input 
            type="text" 
            placeholder="🔍 Filtrar por e-mail, ação ou detalhe..." 
            value={busca} 
            onChange={(e) => setBusca(e.target.value)} 
            style={{ padding: '12px 20px', borderRadius: '12px', border: '1px solid #e5e7eb', outline: 'none', width: '320px', fontSize: '14px', boxShadow: '0 2px 4px rgba(0,0,0,0.01)' }} 
          />
        </div>
      </div>

      {/* Tabela de Histórico */}
      <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9', overflowX: 'auto' }}>
        {carregando ? (
          <p style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>Carregando histórico...</p>
        ) : logsFiltrados.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>Nenhum registro de alteração encontrado.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#475569' }}>
                <th style={{ padding: '12px 16px', fontWeight: '600' }}>Data / Hora</th>
                <th style={{ padding: '12px 16px', fontWeight: '600' }}>Usuário</th>
                <th style={{ padding: '12px 16px', fontWeight: '600' }}>Ação</th>
                <th style={{ padding: '12px 16px', fontWeight: '600' }}>Onde mudou</th>
                <th style={{ padding: '12px 16px', fontWeight: '600' }}>Detalhes do Evento</th>
              </tr>
            </thead>
            <tbody>
              {logsFiltrados.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid #f8fafc', color: '#334155', transition: 'background 0.2s' }}>
                  <td style={{ padding: '16px', color: '#64748b', whiteSpace: 'nowrap' }}>
                    {new Date(log.criado_em).toLocaleString('pt-BR', { timeZone: 'America/Belem' })}
                  </td>
                  <td style={{ padding: '16px', fontWeight: '500', color: '#1e293b' }}>
                    {log.usuario_email}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', padding: '4px 10px', borderRadius: '12px', ...obterEstiloAcao(log.acao) }}>
                      {log.acao}
                    </span>
                  </td>
                  <td style={{ padding: '16px', color: '#475569', textTransform: 'uppercase', fontSize: '12px', fontWeight: '600' }}>
                    📂 {log.tabela}
                  </td>
                  <td style={{ padding: '16px', color: '#334155', lineHeight: '1.4' }}>
                    {log.detalhes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}