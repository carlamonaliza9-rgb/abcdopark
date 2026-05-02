"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function TurmasPage() {
  const [alunos, setAlunos] = useState<any[]>([]);
  const [configuracoes, setConfiguracoes] = useState<any[]>([]);
  const [turmaAtiva, setTurmaAtiva] = useState("Maternal");
  const [editandoProfessor, setEditandoProfessor] = useState(false);
  const [novoNomeProfessor, setNovoNomeProfessor] = useState("");
  const [carregando, setCarregando] = useState(true);

  const turmasDisponiveis = [
    "Maternal", "Jardim I", "Jardim II", 
    "1º Ano", "2º Ano", "3º Ano", "4º Ano", "5º Ano"
  ];

  async function carregarDados() {
    try {
      const { data: listaAlunos } = await supabase.from('alunos').select('*').order('nome', { ascending: true });
      const { data: listaConfigs } = await supabase.from('Turma').select('*');
      
      if (listaAlunos) setAlunos(listaAlunos);
      if (listaConfigs) setConfiguracoes(listaConfigs);
    } catch (error: any) {
      console.error("Erro ao carregar dados:", error.message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { carregarDados(); }, []);

  const alunosFiltrados = alunos.filter(a => a.turma === turmaAtiva);
  const configTurmaAtual = configuracoes.find(c => c.nome_turma === turmaAtiva);

  async function salvarProfessor() {
    try {
      const { error } = await supabase
        .from('Turma')
        .update({ professor_nome: novoNomeProfessor })
        .ilike('nome_turma', turmaAtiva);
      
      if (error) throw error;

      alert("Professor(a) atualizado(a) com sucesso!");
      
      setConfiguracoes(prev => prev.map(c => 
        c.nome_turma === turmaAtiva ? { ...c, professor_nome: novoNomeProfessor } : c
      ));
      
      setEditandoProfessor(false);
      carregarDados(); 
    } catch (error: any) {
      alert("Erro ao salvar professor: " + error.message);
    }
  }

  const totalAlunos = alunosFiltrados.length;
  const totalTEA = alunosFiltrados.filter(a => a.e_autista).length;
  const totalAlergias = alunosFiltrados.filter(a => a.tem_alergia).length;

  if (carregando) return <div style={{ padding: '40px', textAlign: 'center' }}>Carregando dados das turmas...</div>;

  return (
    <div style={{ width: '100%', padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
      
      <header style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#111827', margin: 0 }}>Gestão de Turmas</h1>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>Organização de professores e alunos da ABC DO PARK.</p>
      </header>

      {/* Seleção de Turmas */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '8px' }}>
        {turmasDisponiveis.map(t => (
          <button
            key={t}
            onClick={() => { setTurmaAtiva(t); setEditandoProfessor(false); }}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: turmaAtiva === t ? '#2563eb' : 'white',
              color: turmaAtiva === t ? 'white' : '#4b5563',
              fontWeight: 'bold',
              fontSize: '12px',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              whiteSpace: 'nowrap'
            }}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '25px' }}>
        
        {/* Card do Professor */}
        <div style={{ backgroundColor: '#2563eb', padding: '15px', borderRadius: '15px', color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '80px' }}>
          <span style={{ fontSize: '10px', fontWeight: 'bold', opacity: 0.8, textTransform: 'uppercase' }}>Professor(a)</span>
          
          {editandoProfessor ? (
            <div style={{ marginTop: '5px', display: 'flex', gap: '5px' }}>
              <input 
                value={novoNomeProfessor} 
                onChange={(e) => setNovoNomeProfessor(e.target.value)}
                autoFocus
                style={{ padding: '4px 8px', borderRadius: '6px', border: 'none', width: '100%', color: '#333', fontSize: '14px' }}
              />
              <button onClick={salvarProfessor} style={{ border: 'none', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', backgroundColor: '#10b981', color: 'white', fontWeight: 'bold' }}>OK</button>
            </div>
          ) : (
            <h2 style={{ fontSize: '16px', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {configTurmaAtual?.professor_nome || "Não definido"}
              <button 
                onClick={() => { setEditandoProfessor(true); setNovoNomeProfessor(configTurmaAtual?.professor_nome || ""); }} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', opacity: 0.7 }}
              >
                ✏️
              </button>
            </h2>
          )}
        </div>

        {/* Card Alunos */}
        <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '15px', border: '1px solid #e5e7eb', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <span style={{ fontSize: '10px', color: '#6b7280', fontWeight: 'bold' }}>ESTUDANTES</span>
          <h2 style={{ fontSize: '20px', margin: '2px 0 0', color: '#111827' }}>{totalAlunos}</h2>
        </div>

        {/* Card TEA/Saúde */}
        <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '15px', border: '1px solid #e5e7eb', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <span style={{ fontSize: '10px', color: '#6b7280', fontWeight: 'bold' }}>TEA / SAÚDE</span>
          <h2 style={{ fontSize: '20px', margin: '2px 0 0', color: '#111827' }}>🧩 {totalTEA} | ⚠️ {totalAlergias}</h2>
        </div>
      </div>

      {/* Listagem de Alunos com Alertas de Saúde */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '15px' }}>
        {alunosFiltrados.map(aluno => (
          <div key={aluno.id} style={{ backgroundColor: 'white', padding: '12px', borderRadius: '15px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9' }}>
            <div style={{ width: '55px', height: '60px', borderRadius: '50%', backgroundColor: '#f3f4f6', margin: '0 auto 8px', overflow: 'hidden', border: '2px solid #fff', boxShadow: '0 0 0 1px #e2e8f0' }}>
              {aluno.foto_url ? (
                <img src={aluno.foto_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={aluno.nome} />
              ) : (
                <span style={{ lineHeight: '60px', color: '#94a3b8', fontWeight: 'bold', fontSize: '18px' }}>{aluno.nome.charAt(0)}</span>
              )}
            </div>
            
            <h4 style={{ fontSize: '12px', margin: 0, color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {aluno.nome}
            </h4>

            {/* Informação de Alergia destacada */}
            {aluno.tem_alergia && (
              <div style={{ 
                fontSize: '9px', 
                color: '#dc2626', 
                fontWeight: 'bold', 
                marginTop: '5px', 
                backgroundColor: '#fee2e2', 
                borderRadius: '6px', 
                padding: '3px 5px',
                border: '1px solid #fecaca'
              }}>
                ⚠️ {aluno.alergia_descricao || "Alergia"}
              </div>
            )}

            {/* Identificação de TEA */}
            {aluno.e_autista && (
              <div style={{ 
                fontSize: '9px', 
                color: '#2563eb', 
                fontWeight: 'bold', 
                marginTop: '3px', 
                backgroundColor: '#dbeafe', 
                borderRadius: '6px', 
                padding: '3px 5px'
              }}>
                🧩 TEA
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}