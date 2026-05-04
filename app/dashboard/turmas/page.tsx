"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function Turmas() {
  const [turmas, setTurmas] = useState<any[]>([]);
  const [todosAlunos, setTodosAlunos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  
  const [turmaSelecionada, setTurmaSelecionada] = useState<any>(null);
  const [modalTurmaAberto, setModalTurmaAberto] = useState(false);

  // Estados para a Ficha do Aluno
  const [alunoSelecionado, setAlunoSelecionado] = useState<any>(null);
  const [modalFichaAberto, setModalFichaAberto] = useState(false);
  const [historico, setHistorico] = useState<any[]>([]);

  const configTurmas: any = {
    "Maternal": { cor: "#e0f2fe", icone: "👶", borda: "#bae6fd", texto: "#0369a1" },
    "Jardim I": { cor: "#f0fdf4", icone: "🎨", borda: "#bbf7d0", texto: "#15803d" },
    "Jardim II": { cor: "#fdf2f8", icone: "🍃", borda: "#fbcfe8", texto: "#be185d" },
    "1º Ano": { cor: "#faf5ff", icone: "✏️", borda: "#e9d5ff", texto: "#7e22ce" },
    "2º Ano": { cor: "#fff7ed", icone: "📚", borda: "#ffedd5", texto: "#c2410c" },
    "3º Ano": { cor: "#f5f3ff", icone: "🧪", borda: "#ddd6fe", texto: "#6d28d9" },
    "4º Ano": { cor: "#ecfeff", icone: "🌍", borda: "#a5f3fc", texto: "#0e7490" },
    "5º Ano": { cor: "#fefce8", icone: "🚀", borda: "#fef08a", texto: "#a16207" },
  };

  async function carregarDados() {
    setCarregando(true);
    const { data: alunos } = await supabase.from('alunos').select('*');
    const { data: infos } = await supabase.from('turmas_info').select('*');
    
    if (alunos) {
      setTodosAlunos(alunos);
      const contagem = alunos.reduce((acc: any, curr: any) => {
        acc[curr.turma] = (acc[curr.turma] || 0) + 1;
        return acc;
      }, {});

      const listaTurmas = Object.keys(configTurmas).map(nome => {
        const infoProf = infos?.find(i => i.nome_turma === nome);
        return {
          nome,
          totalAlunos: contagem[nome] || 0,
          professor: infoProf ? infoProf.professor_nome : "Clique para definir",
          ...configTurmas[nome]
        };
      });
      setTurmas(listaTurmas);
    }
    setCarregando(false);
  }

  useEffect(() => { carregarDados(); }, []);

  async function editarProfessor(e: React.MouseEvent, nomeTurma: string, atual: string) {
    e.stopPropagation();
    const novoNome = prompt(`Nome do professor(a) para ${nomeTurma}:`, atual === "Clique para definir" ? "" : atual);
    
    if (novoNome !== null) {
      // O uso do upsert com a restrição correta resolve o erro de "duplicate key"
      const { error } = await supabase
        .from('turmas_info')
        .upsert({ nome_turma: nomeTurma, professor_nome: novoNome }, { onConflict: 'nome_turma' });

      if (!error) carregarDados();
      else alert("Erro ao salvar: " + error.message);
    }
  }

  const abrirTurma = (turma: any) => {
    const lista = todosAlunos.filter(a => a.turma === turma.nome);
    setTurmaSelecionada({ ...turma, alunos: lista });
    setModalTurmaAberto(true);
  };

  async function abrirFichaAluno(aluno: any) {
    setAlunoSelecionado(aluno);
    setModalFichaAberto(true);
    const { data } = await supabase.from('historico_pagamentos').select('*').eq('aluno_id', aluno.id).order('data_pagamento', { ascending: false });
    if (data) setHistorico(data);
  }

  if (carregando) return <div style={{ padding: '50px', textAlign: 'center' }}>Carregando dados...</div>;

  return (
    <div style={{ width: '100%', padding: 'clamp(10px, 3vw, 30px)', fontFamily: 'sans-serif', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#111827', margin: 0 }}>Gestão de Turmas</h1>
        <p style={{ color: '#6b7280', marginTop: '5px' }}>Gerencie professores e acesse fichas de alunos rapidamente.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '25px' }}>
        {turmas.map((turma) => (
          <div key={turma.nome} onClick={() => abrirTurma(turma)} style={{ backgroundColor: turma.cor, border: `2px solid ${turma.borda}`, borderRadius: '24px', padding: '25px', textAlign: 'center', cursor: 'pointer', transition: '0.2s' }}>
            <div style={{ fontSize: '45px', marginBottom: '10px' }}>{turma.icone}</div>
            <h3 style={{ fontSize: '22px', fontWeight: '800', color: turma.texto }}>{turma.nome}</h3>
            <button onClick={(e) => editarProfessor(e, turma.nome, turma.professor)} style={{ fontSize: '13px', color: turma.texto, background: 'rgba(255,255,255,0.4)', border: 'none', padding: '4px 10px', borderRadius: '8px', margin: '8px 0 15px', fontWeight: '600', cursor: 'pointer' }}>👤 {turma.professor} ✏️</button>
            <div style={{ backgroundColor: 'white', padding: '6px 15px', borderRadius: '12px', fontSize: '13px', fontWeight: 'bold' }}>👥 {turma.totalAlunos} Alunos</div>
          </div>
        ))}
      </div>

      {/* MODAL LISTA DE ALUNOS */}
      {modalTurmaAberto && turmaSelecionada && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '24px', width: '90%', maxWidth: '450px', maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <div style={{ backgroundColor: turmaSelecionada.cor, padding: '20px', textAlign: 'center' }}>
              <h2 style={{ margin: 0, color: turmaSelecionada.texto }}>{turmaSelecionada.nome}</h2>
              <button onClick={() => setModalTurmaAberto(false)} style={{ position: 'absolute', top: 15, right: 15, background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: '20px', overflowY: 'auto' }}>
              {turmaSelecionada.alunos.map((aluno: any) => (
                <div key={aluno.id} onClick={() => abrirFichaAluno(aluno)} style={{ padding: '12px', borderBottom: '1px solid #eee', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 'bold', color: '#2563eb' }}>{aluno.nome}</span>
                  <div>{aluno.e_autista && "🧩"} {aluno.tem_alergia && "⚠️"}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL FICHA DO ALUNO */}
      {modalFichaAberto && alunoSelecionado && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, backdropFilter: 'blur(8px)' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '30px', width: '95%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', padding: '30px', position: 'relative' }}>
            <button onClick={() => setModalFichaAberto(false)} style={{ position: 'absolute', top: 20, right: 20, border: 'none', background: '#f1f5f9', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer' }}>✕</button>
            
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              {alunoSelecionado.foto_url ? <img src={alunoSelecionado.foto_url} style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover' }} /> : <div style={{ width: '120px', height: '120px', borderRadius: '50%', backgroundColor: '#f1f5f9', margin: '0 auto', fontSize: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{alunoSelecionado.nome[0]}</div>}
              <h2 style={{ margin: '15px 0 5px' }}>{alunoSelecionado.nome}</h2>
              <span style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '5px 15px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold' }}>{alunoSelecionado.turma}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '20px' }}>
              <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '15px' }}>
                <small style={{ color: '#94a3b8', fontWeight: 'bold' }}>NASCIMENTO</small>
                <p style={{ margin: 0, fontWeight: 'bold' }}>{new Date(alunoSelecionado.data_nascimento).toLocaleDateString('pt-BR')}</p>
              </div>
              <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '15px' }}>
                <small style={{ color: '#94a3b8', fontWeight: 'bold' }}>RESPONSÁVEL</small>
                <p style={{ margin: 0, fontWeight: 'bold', fontSize: '12px' }}>{alunoSelecionado.responsavel}</p>
              </div>
            </div>

            {alunoSelecionado.tem_alergia && (
              <div style={{ background: '#fef2f2', padding: '15px', borderRadius: '15px', marginTop: '15px', border: '1px solid #fecaca' }}>
                <p style={{ margin: 0, color: '#dc2626', fontWeight: 'bold' }}>⚠️ ALERGIA: {alunoSelecionado.alergia_descricao}</p>
              </div>
            )}

            <h3 style={{ fontSize: '16px', marginTop: '25px' }}>Histórico de Pagamentos</h3>
            <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
              {historico.length > 0 ? historico.map((h, i) => (
                <div key={i} style={{ padding: '10px', borderBottom: '1px solid #eee', fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{new Date(h.data_pagamento).toLocaleDateString('pt-BR')}</span>
                  <span style={{ fontWeight: 'bold', color: '#10b981' }}>R$ {h.valor_total}</span>
                </div>
              )) : <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>Sem pagamentos registrados.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}