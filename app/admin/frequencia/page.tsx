"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function RelatorioFrequenciaAdminPage() {
  const router = useRouter();
  const [alunos, setAlunos] = useState<any[]>([]);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [turmaSelecionada, setTurmaSelecionada] = useState("");
  const [mesFiltro, setMesFiltro] = useState(new Date().toISOString().substring(0, 7));
  const [frequenciaMensal, setFrequenciaMensal] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [verificandoAcesso, setVerificandoAcesso] = useState(true);

  // --- TRAVA DE SEGURANÇA ---
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

      if (!ehAdmin) return router.push("/dashboard");
      
      setVerificandoAcesso(false);
      buscarTurmas();
    }
    verificarAcesso();
  }, [router]);

  async function buscarTurmas() {
    const { data } = await supabase.from('turmas_info').select('nome_turma').order('nome_turma', { ascending: true });
    if (data) {
      setTurmas(data);
      if (data.length > 0) setTurmaSelecionada(data[0].nome_turma);
    }
  }

  useEffect(() => {
    if (turmaSelecionada && !verificandoAcesso) {
      buscarDadosFrequencia();
    }
  }, [turmaSelecionada, mesFiltro, verificandoAcesso]);

  async function buscarDadosFrequencia() {
    setCarregando(true);
    // Busca os alunos da turma selecionada
    const { data: listaAlunos } = await supabase
      .from('alunos')
      .select('id, nome')
      .eq('turma', turmaSelecionada)
      .order('nome', { ascending: true });

    if (listaAlunos) setAlunos(listaAlunos);

    // Busca as frequências do mês
    const { data: faltas } = await supabase
      .from('frequencias')
      .select('*')
      .gte('data', `${mesFiltro}-01`)
      .lte('data', `${mesFiltro}-31`);

    if (faltas) setFrequenciaMensal(faltas);
    setCarregando(false);
  }

  const diasNoMes = new Date(parseInt(mesFiltro.split('-')[0]), parseInt(mesFiltro.split('-')[1]), 0).getDate();
  const nomeMes = new Date(mesFiltro + "-01").toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

  if (verificandoAcesso) return <div style={{ padding: '50px', textAlign: 'center' }}>Verificando credenciais de acesso...</div>;

  return (
    <div style={{ padding: '32px 20px', maxWidth: '1200px', margin: '0 auto', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '900', color: '#1e3a8a', margin: 0 }}>Relatório de Frequência Administrativo 📊</h1>
        <p style={{ color: '#64748b', marginTop: '5px' }}>Visão geral de presenças e faltas da ABC DO PARK</p>
        
        <div style={{ marginTop: '25px', display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontWeight: 'bold', color: '#475569', fontSize: '12px', textTransform: 'uppercase' }}>Selecionar Turma:</label>
            <select 
              value={turmaSelecionada} 
              onChange={(e) => setTurmaSelecionada(e.target.value)}
              style={{ padding: '10px', borderRadius: '12px', border: '2px solid #e2e8f0', fontWeight: '600', color: '#1e3a8a', outline: 'none', minWidth: '200px' }}
            >
              {turmas.map(t => <option key={t.nome_turma} value={t.nome_turma}>{t.nome_turma}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontWeight: 'bold', color: '#475569', fontSize: '12px', textTransform: 'uppercase' }}>Mês de Referência:</label>
            <input 
              type="month" 
              value={mesFiltro} 
              onChange={(e) => setMesFiltro(e.target.value)} 
              style={{ padding: '10px', borderRadius: '12px', border: '2px solid #e2e8f0', fontWeight: '600', color: '#1e3a8a', outline: 'none' }}
            />
          </div>
        </div>
      </header>

      <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflowX: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, color: '#1e3a8a', fontWeight: '800', textTransform: 'capitalize' }}>{nomeMes} - {turmaSelecionada}</h3>
            <div style={{ display: 'flex', gap: '15px', fontSize: '12px', fontWeight: 'bold' }}>
                <span style={{ color: '#22c55e' }}>● Presença (P)</span>
                <span style={{ color: '#ef4444' }}>● Falta (F)</span>
            </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', position: 'sticky', left: 0, zIndex: 10, minWidth: '150px' }}>Aluno</th>
              {[...Array(diasNoMes)].map((_, i) => (
                <th key={i} style={{ padding: '5px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', textAlign: 'center', width: '25px' }}>{i + 1}</th>
              ))}
              <th style={{ padding: '10px', border: '1px solid #e2e8f0', backgroundColor: '#eff6ff', color: '#1e3a8a', textAlign: 'center' }}>Faltas</th>
            </tr>
          </thead>
          <tbody>
            {carregando ? (
              <tr><td colSpan={diasNoMes + 2} style={{ textAlign: 'center', padding: '20px' }}>Carregando dados...</td></tr>
            ) : alunos.map(aluno => {
              let totalFaltas = 0;
              return (
                <tr key={aluno.id}>
                  <td style={{ padding: '12px', border: '1px solid #e2e8f0', fontWeight: '700', color: '#334155', backgroundColor: 'white', position: 'sticky', left: 0, zIndex: 5 }}>
                    {aluno.nome.split(' ')[0]} {aluno.nome.split(' ').slice(-1)}
                  </td>
                  {[...Array(diasNoMes)].map((_, i) => {
                    const dia = (i + 1).toString().padStart(2, '0');
                    const reg = frequenciaMensal.find(f => f.aluno_id === aluno.id && f.data === `${mesFiltro}-${dia}`);
                    if (reg && reg.presente === false) totalFaltas++;
                    return (
                      <td key={i} style={{ border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 'bold', color: reg ? (reg.presente ? '#22c55e' : '#ef4444') : '#d1d5db' }}>
                        {reg ? (reg.presente ? 'P' : 'F') : '-'}
                      </td>
                    );
                  })}
                  <td style={{ border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: '800', color: totalFaltas > 3 ? '#ef4444' : '#64748b', backgroundColor: '#f8fafc' }}>
                    {totalFaltas}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '30px', display: 'flex', gap: '10px' }}>
        <button 
            onClick={() => window.print()} 
            style={{ padding: '12px 24px', borderRadius: '12px', border: 'none', backgroundColor: '#1e3a8a', color: 'white', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
            🖨️ Imprimir Relatório
        </button>
        <button 
            onClick={() => router.push('/admin/alunos')} 
            style={{ padding: '12px 24px', borderRadius: '12px', border: '2px solid #e2e8f0', backgroundColor: 'white', color: '#475569', fontWeight: 'bold', cursor: 'pointer' }}
        >
            Voltar para Alunos
        </button>
      </div>
    </div>
  );
}