"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function Turmas() {
  const [turmas, setTurmas] = useState<any[]>([]);
  const [todosAlunos, setTodosAlunos] = useState<any[]>([]);
  const [listaProfessores, setListaProfessores] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [ehAdmin, setEhAdmin] = useState(false);
  
  const [turmaSelecionada, setTurmaSelecionada] = useState<any>(null);
  const [modalTurmaAberto, setModalTurmaAberto] = useState(false);

  const [alunoSelecionado, setAlunoSelecionado] = useState<any>(null);
  const [modalFichaAberto, setModalFichaAberto] = useState(false);
  const [historico, setHistorico] = useState<any[]>([]);

  // Estados para o Upload de Horário
  const [modalHorarioAberto, setModalHorarioAberto] = useState(false);
  const [turmaParaHorario, setTurmaParaHorario] = useState<any>(null);
  const [arquivoHorario, setArquivoHorario] = useState<File | null>(null);
  const [previewHorario, setPreviewHorario] = useState<string | null>(null);
  const [arrastandoHorario, setArrastandoHorario] = useState(false);
  const [salvandoHorario, setSalvandoHorario] = useState(false);

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
    
    // 1. VERIFICAÇÃO DE ADMIN (E-mail Carla + Tabela Perfis)
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user) {
      const emailLogado = authData.user.email;
      
      // Busca cargo na tabela perfis
      const { data: perfil } = await supabase
        .from('perfis')
        .select('cargo')
        .eq('id', authData.user.id)
        .single();

      if (emailLogado === 'carlamonaliza9@gmail.com' || emailLogado === 'diretoria@abcdopark.com' || perfil?.cargo === 'Admin') {
        setEhAdmin(true);
      }
    }

    // 2. BUSCA DE DADOS DAS TABELAS
    const { data: alunos } = await supabase.from('alunos').select('*');
    const { data: infos } = await supabase.from('turmas_info').select('*');
    const { data: funcs } = await supabase.from('funcionarios').select('nome').eq('cargo', 'Professor').order('nome');
    
    if (funcs) setListaProfessores(funcs);

    if (alunos) {
      setTodosAlunos(alunos);
      const contagem = alunos.reduce((acc: any, curr: any) => {
        acc[curr.turma] = (acc[curr.turma] || 0) + 1;
        return acc;
      }, {});

      const listaTurmas = Object.keys(configTurmas).map(nome => {
        const infoExtra = infos?.find(i => i.nome_turma === nome);
        return {
          nome,
          totalAlunos: contagem[nome] || 0,
          professor: infoExtra ? infoExtra.professor_nome : "Não definido",
          horario_url: infoExtra ? infoExtra.horario_url : null,
          ...configTurmas[nome]
        };
      });
      setTurmas(listaTurmas);
    }
    setCarregando(false);
  }

  useEffect(() => { carregarDados(); }, []);

  async function editarProfessor(e: React.MouseEvent, nomeTurma: string) {
    e.stopPropagation();
    if (!ehAdmin) return; 
    if (listaProfessores.length === 0) return alert("Cadastre um professor primeiro.");
    const nomesProfs = listaProfessores.map((p, i) => `${i + 1} - ${p.nome}`).join('\n');
    const escolha = prompt(`Vincular professor para ${nomeTurma}:\n\n${nomesProfs}\n\nDigite o NÚMERO:`);
    if (escolha) {
      const index = parseInt(escolha) - 1;
      if (listaProfessores[index]) {
        const { error } = await supabase.from('turmas_info').upsert({ nome_turma: nomeTurma, professor_nome: listaProfessores[index].nome }, { onConflict: 'nome_turma' });
        if (!error) carregarDados();
      }
    }
  }

  function abrirUploadHorario(e: React.MouseEvent, turma: any) {
    e.stopPropagation();
    if (!ehAdmin) return;
    setTurmaParaHorario(turma);
    setArquivoHorario(null);
    setPreviewHorario(turma.horario_url || null);
    setModalHorarioAberto(true);
  }

  const handleDragHorario = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setArrastandoHorario(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDropHorario = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setArrastandoHorario(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setArquivoHorario(file);
      setPreviewHorario(URL.createObjectURL(file));
    }
  };

  async function salvarHorarioImagem() {
    if (!arquivoHorario && !previewHorario) return alert("Selecione uma imagem.");
    setSalvandoHorario(true);

    try {
      let publicUrl = previewHorario; 

      if (arquivoHorario) {
        const fileExt = arquivoHorario.name.split('.').pop();
        const fileName = `${turmaParaHorario.nome.replace(/\s/g, '')}_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('horarios')
          .upload(fileName, arquivoHorario);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('horarios').getPublicUrl(fileName);
        publicUrl = data.publicUrl;
      }

      const { error: dbError } = await supabase
        .from('turmas_info')
        .upsert({ nome_turma: turmaParaHorario.nome, horario_url: publicUrl }, { onConflict: 'nome_turma' });

      if (dbError) throw dbError;

      alert("Horário atualizado com sucesso!");
      setModalHorarioAberto(false);
      carregarDados();
    } catch (err: any) {
      alert("Erro ao salvar: " + err.message);
    } finally {
      setSalvandoHorario(false);
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

  if (carregando) return <div style={{ padding: '50px', textAlign: 'center' }}>Carregando dados da escola...</div>;

  return (
    <div style={{ width: '100%', padding: '30px', fontFamily: 'sans-serif', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#111827', margin: 0 }}>Gestão de Turmas</h1>
        <p style={{ color: '#6b7280', marginTop: '5px' }}>Gerenciamento de horários e professores (Acesso: {ehAdmin ? 'Admin' : 'Visitante'}).</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '25px' }}>
        {turmas.map((turma) => (
          <div key={turma.nome} onClick={() => abrirTurma(turma)} style={{ backgroundColor: turma.cor, border: `2px solid ${turma.borda}`, borderRadius: '24px', padding: '25px', textAlign: 'center', cursor: 'pointer', position: 'relative', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '45px', marginBottom: '10px' }}>{turma.icone}</div>
            <h3 style={{ fontSize: '22px', fontWeight: '800', color: turma.texto }}>{turma.nome}</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', margin: '10px 0' }}>
                {ehAdmin ? (
                  <>
                    <button onClick={(e) => editarProfessor(e, turma.nome)} style={{ fontSize: '12px', color: turma.texto, background: 'white', border: `1px solid ${turma.borda}`, padding: '6px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>👤 Prof: {turma.professor} ✏️</button>
                    <button onClick={(e) => abrirUploadHorario(e, turma)} style={{ fontSize: '12px', color: turma.texto, background: 'white', border: `1px solid ${turma.borda}`, padding: '6px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>📅 {turma.horario_url ? "Trocar Horário" : "Definir Horário"}</button>
                  </>
                ) : (
                  <span style={{ fontSize: '12px', color: turma.texto, background: 'rgba(255,255,255,0.5)', border: `1px solid ${turma.borda}`, padding: '6px', borderRadius: '8px', fontWeight: '600' }}>👤 Prof: {turma.professor}</span>
                )}
            </div>

            <div style={{ backgroundColor: 'white', padding: '8px 15px', borderRadius: '12px', fontSize: '13px', fontWeight: 'bold', color: '#4b5563' }}>👥 {turma.totalAlunos} Alunos</div>
          </div>
        ))}
      </div>

      {/* MODAL: UPLOAD DE HORÁRIO (DRAG & DROP) */}
      {modalHorarioAberto && turmaParaHorario && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '24px', width: '90%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '5px' }}>📅 Horário: {turmaParaHorario.nome}</h2>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>Arraste a imagem do horário para o quadro abaixo.</p>
            
            <div 
              onDragEnter={handleDragHorario} onDragOver={handleDragHorario} onDragLeave={handleDragHorario} onDrop={handleDropHorario} 
              onClick={() => document.getElementById('input-horario')?.click()} 
              style={{ width: '100%', height: '220px', border: arrastandoHorario ? '2px solid #2563eb' : '2px dashed #cbd5e1', borderRadius: '15px', backgroundColor: arrastandoHorario ? '#eff6ff' : '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', cursor: 'pointer', overflow: 'hidden', transition: '0.2s' }}
            >
              {previewHorario ? (
                <img src={previewHorario} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <>
                  <span style={{ fontSize: '40px' }}>🖼️</span>
                  <p style={{ fontSize: '13px', color: '#64748b', marginTop: '10px', fontWeight: 'bold' }}>Clique ou arraste a imagem aqui</p>
                </>
              )}
              <input type="file" id="input-horario" accept="image/*" hidden onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) { setArquivoHorario(file); setPreviewHorario(URL.createObjectURL(file)); }
              }} />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setModalHorarioAberto(false)} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid #e5e7eb', backgroundColor: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={salvarHorarioImagem} disabled={salvandoHorario} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', backgroundColor: salvandoHorario ? '#93c5fd' : '#2563eb', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
                {salvandoHorario ? "Salvando..." : "Salvar Horário"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DETALHES DA TURMA E HORÁRIO */}
      {modalTurmaAberto && turmaSelecionada && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '24px', width: '90%', maxWidth: '550px', maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <div style={{ backgroundColor: turmaSelecionada.cor, padding: '20px', textAlign: 'center' }}>
              <h2 style={{ margin: 0, color: turmaSelecionada.texto }}>{turmaSelecionada.nome}</h2>
              <button onClick={() => setModalTurmaAberto(false)} style={{ position: 'absolute', top: 15, right: 15, background: 'white', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>✕</button>
            </div>
            
            <div style={{ padding: '25px', overflowY: 'auto' }}>
              <div style={{ marginBottom: '25px' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>📅 Quadro de Horários</h4>
                {turmaSelecionada.horario_url ? (
                  <div style={{ border: '2px solid #f1f5f9', borderRadius: '16px', overflow: 'hidden', backgroundColor: '#f8fafc' }}>
                    <img src={turmaSelecionada.horario_url} alt="Horário Escolar" style={{ width: '100%', height: 'auto', display: 'block' }} />
                  </div>
                ) : (
                  <div style={{ padding: '20px', borderRadius: '16px', background: '#f8fafc', border: '2px dashed #e2e8f0', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>Nenhum horário cadastrado para esta turma.</p>
                  </div>
                )}
              </div>

              <h4 style={{ fontSize: '14px', color: '#64748b', marginBottom: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>👥 Alunos da Turma</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {turmaSelecionada.alunos.map((aluno: any) => (
                  <div key={aluno.id} onClick={() => abrirFichaAluno(aluno)} style={{ padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: '12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #f1f5f9' }}>
                    <span style={{ fontWeight: 'bold', color: '#1f2937' }}>{aluno.nome}</span>
                    <div style={{ fontSize: '18px' }}>{aluno.e_autismo && "🧩"} {aluno.tem_alergia && "⚠️"}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: FICHA DO ALUNO */}
      {modalFichaAberto && alunoSelecionado && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, backdropFilter: 'blur(8px)' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '30px', width: '95%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto', padding: '30px', position: 'relative' }}>
            <button onClick={() => setModalFichaAberto(false)} style={{ position: 'absolute', top: 20, right: 20, border: 'none', background: '#f1f5f9', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer' }}>✕</button>
            
            <div style={{ textAlign: 'center', marginBottom: '25px' }}>
              {alunoSelecionado.foto_url ? <img src={alunoSelecionado.foto_url} style={{ width: '110px', height: '110px', borderRadius: '50%', objectFit: 'cover', border: '4px solid #fff', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }} /> : <div style={{ width: '110px', height: '110px', borderRadius: '50%', backgroundColor: '#f1f5f9', margin: '0 auto', fontSize: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{alunoSelecionado.nome[0]}</div>}
              <h2 style={{ margin: '15px 0 5px', fontSize: '22px' }}>{alunoSelecionado.nome}</h2>
              <span style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '6px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold' }}>{alunoSelecionado.turma}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '15px', border: '1px solid #f1f5f9' }}>
                <small style={{ color: '#94a3b8', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>NASCIMENTO</small>
                <p style={{ margin: 0, fontWeight: 'bold', fontSize: '14px' }}>{alunoSelecionado.data_nascimento ? new Date(alunoSelecionado.data_nascimento).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : '--'}</p>
              </div>
              <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '15px', border: '1px solid #f1f5f9' }}>
                <small style={{ color: '#94a3b8', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>RESPONSÁVEL</small>
                <p style={{ margin: 0, fontWeight: 'bold', fontSize: '12px' }}>{alunoSelecionado.responsavel}</p>
              </div>
            </div>

            {alunoSelecionado.tem_alergia && (
              <div style={{ background: '#fef2f2', padding: '15px', borderRadius: '15px', marginTop: '15px', border: '1px solid #fecaca' }}>
                <p style={{ margin: 0, color: '#dc2626', fontWeight: 'bold', fontSize: '13px' }}>⚠️ ALERGIA: {alunoSelecionado.alergia_descricao}</p>
              </div>
            )}

            <h3 style={{ fontSize: '16px', marginTop: '25px', color: '#1f2937', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>Histórico Financeiro</h3>
            <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
              {historico.length > 0 ? historico.map((h, i) => (
                <div key={i} style={{ padding: '12px 5px', borderBottom: '1px solid #f1f5f9', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#4b5563' }}>{new Date(h.data_pagamento).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</span>
                  <span style={{ fontWeight: 'bold', color: '#10b981' }}>R$ {h.valor_total?.toLocaleString('pt-BR')}</span>
                </div>
              )) : <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', marginTop: '15px' }}>Sem pagamentos registrados.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}