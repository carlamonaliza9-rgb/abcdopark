"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

// Importação dos Componentes Blindados
import { TurmasHeader } from "./_components/TurmasHeader";
import { TurmaCard } from "./_components/TurmaCard";
import { ModalHorario } from "./_components/ModalHorario";
import { ModalDetalhesTurma } from "./_components/ModalDetalhesTurma";
import { ModalFichaAlunoTurma } from "./_components/ModalFichaAlunoTurma";

export default function Turmas() {
  // --- ESTADOS DE DADOS ---
  const [turmas, setTurmas] = useState<any[]>([]);
  const [todosAlunos, setTodosAlunos] = useState<any[]>([]);
  const [listaProfessores, setListaProfessores] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [ehAdmin, setEhAdmin] = useState(false);
  
  // --- ESTADOS DE MODAIS E SELEÇÃO ---
  const [turmaSelecionada, setTurmaSelecionada] = useState<any>(null);
  const [modalTurmaAberto, setModalTurmaAberto] = useState(false);
  const [alunoSelecionado, setAlunoSelecionado] = useState<any>(null);
  const [modalFichaAberto, setModalFichaAberto] = useState(false);
  const [historico, setHistorico] = useState<any[]>([]);

  // --- ESTADOS DE UPLOAD DE HORÁRIO ---
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

  // --- LÓGICA DE CARREGAMENTO ---
  async function carregarDados() {
    setCarregando(true);
    const { data: authData } = await supabase.auth.getUser();
    
    if (authData?.user) {
      const emailLogado = authData.user.email;
      const { data: perfil } = await supabase.from('perfis').select('cargo').eq('id', authData.user.id).single();

      if (emailLogado === 'carlamonaliza9@gmail.com' || emailLogado === 'diretoria@abcdopark.com' || perfil?.cargo === 'Admin') {
        setEhAdmin(true);
      }
    }

    const [resAlunos, resInfos, resFuncs] = await Promise.all([
      supabase.from('alunos').select('*'),
      supabase.from('turmas_info').select('*'),
      supabase.from('funcionarios').select('nome').eq('cargo', 'Professor').order('nome')
    ]);

    if (resFuncs.data) setListaProfessores(resFuncs.data);

    if (resAlunos.data) {
      setTodosAlunos(resAlunos.data);
      const contagem = resAlunos.data.reduce((acc: any, curr: any) => {
        acc[curr.turma] = (acc[curr.turma] || 0) + 1;
        return acc;
      }, {});

      const listaTurmas = Object.keys(configTurmas).map(nome => {
        const infoExtra = resInfos.data?.find(i => i.nome_turma === nome);
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

  // --- AÇÕES DE ADMIN COM TRAVA DE SEGURANÇA ---
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

  async function salvarHorarioImagem() {
    if (!ehAdmin) return alert("Acesso negado: apenas administradores podem alterar horários.");
    
    if (!arquivoHorario && !previewHorario) return alert("Selecione uma imagem.");
    setSalvandoHorario(true);

    try {
      let publicUrl = previewHorario; 
      if (arquivoHorario) {
        const fileExt = arquivoHorario.name.split('.').pop();
        const fileName = `${turmaParaHorario.nome.replace(/\s/g, '')}_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('horarios').upload(fileName, arquivoHorario);
        if (uploadError) throw uploadError;
        publicUrl = supabase.storage.from('horarios').getPublicUrl(fileName).data.publicUrl;
      }

      const { error: dbError } = await supabase.from('turmas_info').upsert({ nome_turma: turmaParaHorario.nome, horario_url: publicUrl }, { onConflict: 'nome_turma' });
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

  // --- CONTROLE DE INTERFACE ---
  const handleDrag = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setArrastandoHorario(e.type === "dragenter" || e.type === "dragover"); };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setArrastandoHorario(false);
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith("image/")) { setArquivoHorario(file); setPreviewHorario(URL.createObjectURL(file)); }
  };

  if (carregando) return <div style={{ padding: '50px', textAlign: 'center' }}>Carregando dados da escola...</div>;

  return (
    <div style={{ width: '100%', padding: '30px', fontFamily: 'sans-serif', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      
      <TurmasHeader ehAdmin={ehAdmin} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '25px' }}>
        {turmas.map((turma) => (
          <TurmaCard 
            key={turma.nome} 
            turma={turma} 
            ehAdmin={ehAdmin} 
            onAbrirTurma={(t) => { 
              // FILTRA E ORDENA ALFABETICAMENTE
              const listaOrdenada = todosAlunos
                .filter(a => a.turma === t.nome)
                .sort((a, b) => a.nome.localeCompare(b.nome));

              setTurmaSelecionada({ ...t, alunos: listaOrdenada }); 
              setModalTurmaAberto(true); 
            }}
            onEditarProfessor={editarProfessor}
            onAbrirUploadHorario={(e, t) => { e.stopPropagation(); setTurmaParaHorario(t); setArquivoHorario(null); setPreviewHorario(t.horario_url || null); setModalHorarioAberto(true); }}
          />
        ))}
      </div>

      {modalHorarioAberto && (
        <ModalHorario 
          turma={turmaParaHorario} previewHorario={previewHorario} arrastandoHorario={arrastandoHorario} salvandoHorario={salvandoHorario}
          onClose={() => setModalHorarioAberto(false)}
          onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop}
          onFileSelect={(e) => { const file = e.target.files?.[0]; if (file) { setArquivoHorario(file); setPreviewHorario(URL.createObjectURL(file)); } }}
          onSalvar={salvarHorarioImagem}
        />
      )}

      {modalTurmaAberto && (
        <ModalDetalhesTurma 
          turma={turmaSelecionada} 
          onClose={() => setModalTurmaAberto(false)}
          onAbrirFichaAluno={async (aluno) => { 
            setAlunoSelecionado(aluno); setModalFichaAberto(true); 
            const { data } = await supabase.from('historico_pagamentos').select('*').eq('aluno_id', aluno.id).order('data_pagamento', { ascending: false });
            if (data) setHistorico(data);
          }} 
        />
      )}

      {modalFichaAberto && (
        <ModalFichaAlunoTurma aluno={alunoSelecionado} historico={historico} onClose={() => setModalFichaAberto(false)} />
      )}
    </div>
  );
}