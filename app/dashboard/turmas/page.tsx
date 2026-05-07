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
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // --- ESTADOS DE CORES ---
  const [coresConfig, setCoresConfig] = useState<any>({});
  const [coresTemporarias, setCoresTemporarias] = useState<any>({});
  const [editandoCores, setEditandoCores] = useState(false);
  const [salvandoCores, setSalvandoCores] = useState(false);

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

  const estiloFixoTurmas: any = {
    "Maternal": { icone: "👶", texto: "#0369a1" },
    "Jardim I": { icone: "🎨", texto: "#15803d" },
    "Jardim II": { icone: "🍃", texto: "#be185d" },
    "1º Ano": { icone: "✏️", texto: "#7e22ce" },
    "2º Ano": { icone: "📚", texto: "#c2410c" },
    "3º Ano": { icone: "🧪", texto: "#6d28d9" },
    "4º Ano": { icone: "🌍", texto: "#0e7490" },
    "5º Ano": { icone: "🚀", texto: "#a16207" },
  };

  const escurecerCor = (hex: string, valor: number = 35) => {
    if (!hex) return "#e5e7eb";
    const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - valor);
    const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - valor);
    const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - valor);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  async function buscarCores() {
    const { data } = await supabase.from('configuracao_turmas').select('*');
    if (data) {
      const mapeamento = data.reduce((acc: any, item: any) => {
        acc[item.nome_turma] = item.cor_hex;
        return acc;
      }, {});
      setCoresConfig(mapeamento);
      return mapeamento;
    }
    return {};
  }

  const cancelarEdicao = () => {
    setEditandoCores(false);
    setTurmas(prev => prev.map(t => ({
      ...t,
      cor: coresConfig[t.nome] || "#ffffff",
      borda: escurecerCor(coresConfig[t.nome] || "#ffffff", 35)
    })));
    setCoresTemporarias({});
  };

  async function confirmarNovasCores() {
    setSalvandoCores(true);
    try {
      for (const nomeTurma in coresTemporarias) {
        await supabase
          .from('configuracao_turmas')
          .update({ cor_hex: coresTemporarias[nomeTurma] })
          .eq('nome_turma', nomeTurma);
      }
      const novasCores = await buscarCores();
      setCoresConfig(novasCores);
      await carregarDados();
      setEditandoCores(false);
      alert("Cores e contornos atualizados com sucesso!");
    } catch (err) {
      alert("Erro ao salvar cores.");
    } finally {
      setSalvandoCores(false);
    }
  }

  async function carregarDados() {
    setCarregando(true);
    const { data: authData } = await supabase.auth.getUser();
    let emailAtual = "";

    if (authData?.user) {
      emailAtual = authData.user.email || "";
      setUserEmail(emailAtual);
      const { data: perfil } = await supabase.from('perfis').select('cargo').eq('id', authData.user.id).single();
      if (emailAtual === 'carlamonaliza9@gmail.com' || emailAtual === 'diretoria@abcdopark.com' || perfil?.cargo === 'Admin') {
        setEhAdmin(true);
      }
    }

    const coresAtuais = await buscarCores();
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

      const listaTurmasCompilada = Object.keys(estiloFixoTurmas).map(nome => {
        const infoExtra = resInfos.data?.find(i => i.nome_turma === nome);
        const corFundo = coresAtuais[nome] || "#ffffff";

        return {
          nome,
          totalAlunos: contagem[nome] || 0,
          // Mapeamento dos novos campos de professores
          profFixo1: infoExtra?.prof_fixo_1 || "Não definido",
          profFixo2: infoExtra?.prof_fixo_2 || "",
          profEspec1: infoExtra?.prof_especifico_1 || "",
          profEspec2: infoExtra?.prof_especifico_2 || "",
          emailFixo1: infoExtra?.email_prof_fixo_1 || "",
          emailFixo2: infoExtra?.email_prof_fixo_2 || "",
          emailEspec1: infoExtra?.email_prof_especifico_1 || "",
          emailEspec2: infoExtra?.email_prof_especifico_2 || "",
          horario_url: infoExtra ? infoExtra.horario_url : null,
          cor: corFundo,
          borda: escurecerCor(corFundo, 35),
          ...estiloFixoTurmas[nome]
        };
      });

      // LÓGICA DE FILTRO: Se não for Admin, mostra apenas onde o e-mail do professor bate
      if (emailAtual && emailAtual !== 'carlamonaliza9@gmail.com' && emailAtual !== 'diretoria@abcdopark.com') {
        const turmasFiltradas = listaTurmasCompilada.filter(t => 
          t.emailFixo1 === emailAtual || 
          t.emailFixo2 === emailAtual || 
          t.emailEspec1 === emailAtual || 
          t.emailEspec2 === emailAtual
        );
        setTurmas(turmasFiltradas);
      } else {
        setTurmas(listaTurmasCompilada);
      }
    }
    setCarregando(false);
  }

  useEffect(() => { carregarDados(); }, []);

  useEffect(() => {
    if (editandoCores) {
      setTurmas(prev => prev.map(t => ({
        ...t,
        cor: coresTemporarias[t.nome] || t.cor,
        borda: escurecerCor(coresTemporarias[t.nome] || t.cor, 35)
      })));
    }
  }, [coresTemporarias, editandoCores]);

  async function editarProfessor(e: React.MouseEvent, nomeTurma: string) {
    e.stopPropagation();
    if (!ehAdmin) return;

    const slot = prompt(
      "Qual cargo deseja preencher?\n1 - Prof. Fixo 1\n2 - Prof. Fixo 2\n3 - Matéria Específica 1\n4 - Matéria Específica 2"
    );

    const mapeamentoCampos: any = {
      "1": { nome: "prof_fixo_1", email: "email_prof_fixo_1" },
      "2": { nome: "prof_fixo_2", email: "email_prof_fixo_2" },
      "3": { nome: "prof_especifico_1", email: "email_prof_especifico_1" },
      "4": { nome: "prof_especifico_2", email: "email_prof_especifico_2" }
    };

    const alvo = mapeamentoCampos[slot || ""];
    if (!alvo) return;

    const nomesProfs = listaProfessores.map((p, i) => `${i + 1} - ${p.nome}`).join('\n');
    const escolha = prompt(`Vincular professor para ${nomeTurma}:\n\n${nomesProfs}\n\nDigite o NÚMERO:`);
    
    if (escolha) {
      const index = parseInt(escolha) - 1;
      const profSelecionado = listaProfessores[index];
      
      if (profSelecionado) {
        const emailProf = prompt(`Confirme o E-MAIL do(a) prof. ${profSelecionado.nome}:`, "");
        
        const { error } = await supabase.from('turmas_info').upsert({ 
          nome_turma: nomeTurma, 
          [alvo.nome]: profSelecionado.nome,
          [alvo.email]: emailProf || null
        }, { onConflict: 'nome_turma' });
        
        if (!error) carregarDados();
      }
    }
  }

  async function salvarHorarioImagem() {
    if (!ehAdmin) return alert("Acesso negado.");
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
      alert("Horário atualizado!");
      setModalHorarioAberto(false);
      carregarDados();
    } catch (err: any) {
      alert("Erro ao salvar: " + err.message);
    } finally {
      setSalvandoHorario(false);
    }
  }

  const handleDrag = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setArrastandoHorario(e.type === "dragenter" || e.type === "dragover"); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setArrastandoHorario(false);
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith("image/")) { setArquivoHorario(file); setPreviewHorario(URL.createObjectURL(file)); }
  };

  if (carregando) return <div style={{ padding: '50px', textAlign: 'center' }}>Carregando dados da escola...</div>;

  return (
    <div style={{ width: '100%', padding: '0px 30px 30px 30px', fontFamily: 'sans-serif', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      
      {ehAdmin && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
          <button
            onClick={() => {
              if (editandoCores) cancelarEdicao();
              else { setEditandoCores(true); setCoresTemporarias(coresConfig); }
            }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', opacity: 0.4 }}
            title="Personalizar Cores"
          >
            {editandoCores ? "✖" : "⚙️"}
          </button>
        </div>
      )}

      {editandoCores && ehAdmin && (
        <div style={{ marginBottom: '25px', padding: '20px', backgroundColor: 'white', borderRadius: '20px', border: '1px solid #e5e7eb', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h4 style={{ margin: 0, fontSize: '15px', color: '#111827', fontWeight: '800' }}>Personalizar Cores (Preview Ativo)</h4>
            <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={cancelarEdicao} style={{ padding: '8px 15px', backgroundColor: '#f3f4f6', color: '#4b5563', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>Descartar</button>
                <button onClick={confirmarNovasCores} disabled={salvandoCores} style={{ padding: '8px 20px', backgroundColor: '#059669', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
                 {salvandoCores ? "Gravando..." : "OK - Salvar Cores e Contornos"}
                </button>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            {Object.keys(estiloFixoTurmas).map(nome => (
              <div key={nome} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', backgroundColor: '#f9fafb', borderRadius: '12px', border: '1px solid #f3f4f6' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#4b5563' }}>{nome}</span>
                <input
                  type="color"
                  value={coresTemporarias[nome] || "#ffffff"}
                  onChange={(e) => setCoresTemporarias({...coresTemporarias, [nome]: e.target.value})}
                  style={{ border: 'none', width: '28px', height: '28px', cursor: 'pointer', backgroundColor: 'transparent' }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <TurmasHeader ehAdmin={ehAdmin} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '25px' }}>
        {turmas.map((turma) => (
          <TurmaCard
            key={turma.nome}
            turma={turma}
            ehAdmin={ehAdmin}
            onAbrirTurma={(t) => {
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
          onFileSelect={(e: any) => {
            const file = e.target.files?.[0];
            if (file) { setArquivoHorario(file); setPreviewHorario(URL.createObjectURL(file)); }
          }}
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