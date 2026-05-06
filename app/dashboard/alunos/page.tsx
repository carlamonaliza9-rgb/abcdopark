"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

// Importação dos Componentes que você criou
import { AlunosHeader } from "./_components/AlunosHeader";
import { AlunoCard } from "./_components/AlunoCard";
import { FichaAlunoModal } from "./_components/FichaAlunoModal";
import { FormAlunoModal } from "./_components/FormAlunoModal";

export default function Alunos() {
  // --- ESTADOS DE CONTROLE ---
  const [modalAberto, setModalAberto] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [alunos, setAlunos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  
  // --- ESTADOS DE DADOS (Exatamente como o seu original) ---
  const [idEdicao, setIdEdicao] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [cpfAluno, setCpfAluno] = useState("");
  const [turma, setTurma] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [cpfResponsavel, setCpfResponsavel] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [responsavel2, setResponsavel2] = useState("");
  const [cpfResponsavel2, setCpfResponsavel2] = useState("");
  const [whatsapp2, setWhatsapp2] = useState("");
  const [valor, setValor] = useState("");
  const [vencimento, setVencimento] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [temAlergia, setTemAlergia] = useState(false);
  const [alergiaDescricao, setAlergiaDescricao] = useState("");
  const [eAutista, setEAutista] = useState(false);
  const [arquivoFoto, setArquivoFoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [historico, setHistorico] = useState<any[]>([]);
  const [verHistorico, setVerHistorico] = useState(false);
  const [verBoletim, setVerBoletim] = useState(false);
  const [notas, setNotas] = useState<any[]>([]);

  const ehVisitante = userEmail === "escolaabcdopark@gmail.com";

  // --- MÁSCARAS BLINDADAS (Para evitar o erro de 'undefined') ---
  const mWhatsApp = (v: string) => {
    if (!v) return ""; // Proteção contra valores vazios
    v = v.replace(/\D/g, "");
    if (v.length <= 11) {
      v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
      v = v.replace(/(\d{5})(\d)/, "$1-$2");
    }
    return v;
  };

  const mCPF = (v: string) => {
    if (!v) return ""; // Proteção contra valores vazios
    v = v.replace(/\D/g, "");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    return v;
  };

  const obterCorTurma = (turmaNome: string) => {
    const cores: any = { "Maternal": "#e0f2fe", "Jardim I": "#f0fdf4", "Jardim II": "#fdf2f8", "1º Ano": "#faf5ff", "2º Ano": "#fff7ed", "3º Ano": "#f5f3ff", "4º Ano": "#ecfeff", "5º Ano": "#fefce8" };
    return cores[turmaNome] || "#ffffff";
  };

  // --- BUSCA DE DADOS ---
  async function buscarAlunos() {
    const { data } = await supabase.from('alunos').select('*').order('nome', { ascending: true });
    if (data) setAlunos(data);
  }

  useEffect(() => { 
    async function checarUsuario() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserEmail(user.email ?? null);
    }
    checarUsuario();
    buscarAlunos(); 
  }, []);

  const alunosFiltrados = alunos.filter(aluno => 
    aluno.nome?.toLowerCase().includes(busca.toLowerCase())
  );

  // --- FUNÇÕES DE BOLETIM E HISTÓRICO ---
  async function buscarBoletim(alunoId: string) {
    const { data } = await supabase.from('boletins').select('*').eq('aluno_id', alunoId).order('disciplina', { ascending: true });
    if (data) setNotas(data);
    setVerBoletim(true); setVerHistorico(false);
  }

  async function adicionarDisciplina() {
    const disc = prompt("Nome da Disciplina:");
    if (!disc || !idEdicao) return;
    const { data } = await supabase.from('boletins').insert([{ aluno_id: idEdicao, disciplina: disc, ano: "2026" }]).select();
    if (data) setNotas([...notas, data[0]]);
  }

  async function salvarNota(id: string, campo: string, valorNota: string) {
    const v = valorNota === "" ? null : parseFloat(valorNota.replace(',', '.'));
    await supabase.from('boletins').update({ [campo]: v }).eq('id', id);
    setNotas(notas.map(n => n.id === id ? { ...n, [campo]: v } : n));
  }

  async function excluirDisciplina(id: string) {
    if (confirm("Remover esta disciplina?")) {
      await supabase.from('boletins').delete().eq('id', id);
      setNotas(notas.filter(n => n.id !== id));
    }
  }

  async function buscarHistoricoPagamento(alunoId: string) {
    const { data } = await supabase.from('historico_pagamentos').select('*').eq('aluno_id', alunoId).order('data_pagamento', { ascending: false });
    if (data) setHistorico(data);
    setVerHistorico(true); setVerBoletim(false);
  }

  // --- SALVAMENTO ---
  async function salvarAluno(e: React.FormEvent) {
    e.preventDefault();
    if (ehVisitante) return;
    setCarregando(true);
    try {
      let urlFinal = previewUrl;
      if (arquivoFoto) {
        const nomeArquivo = `${Date.now()}_${arquivoFoto.name}`;
        const { data } = await supabase.storage.from('fotos-alunos').upload(nomeArquivo, arquivoFoto);
        if (data) urlFinal = supabase.storage.from('fotos-alunos').getPublicUrl(nomeArquivo).data.publicUrl;
      }
      const dados = { 
        nome, cpf_aluno: cpfAluno, turma, responsavel, cpf_responsavel: cpfResponsavel, whatsapp, 
        responsavel_2_nome: responsavel2, cpf_responsavel_2: cpfResponsavel2, responsavel_2_contato: whatsapp2,
        valor: valor ? parseFloat(valor) : null, vencimento, data_nascimento: dataNascimento,
        tem_alergia: temAlergia, alergia_descricao: temAlergia ? alergiaDescricao : "", e_autista: eAutista, foto_url: urlFinal
      };
      if (idEdicao) await supabase.from('alunos').update(dados).eq('id', idEdicao);
      else await supabase.from('alunos').insert([{ ...dados, status: 'pendente' }]);
      setModalAberto(false); setModoEdicao(false); buscarAlunos();
      alert("Sucesso!");
    } finally { setCarregando(false); }
  }

  // --- INTERFACE ---
  function limparEContinuar() {
    setIdEdicao(null); setNome(""); setCpfAluno(""); setTurma(""); setResponsavel(""); setCpfResponsavel("");
    setWhatsapp(""); setResponsavel2(""); setCpfResponsavel2(""); setWhatsapp2(""); setValor("");
    setVencimento(""); setDataNascimento(""); setTemAlergia(false); setAlergiaDescricao("");
    setEAutista(false); setArquivoFoto(null); setPreviewUrl(null);
    setModoEdicao(true); setModalAberto(true);
  }

  function abrirFicha(aluno: any) {
    setIdEdicao(aluno.id); setNome(aluno.nome); setCpfAluno(aluno.cpf_aluno || ""); setTurma(aluno.turma);
    setResponsavel(aluno.responsavel); setCpfResponsavel(aluno.cpf_responsavel || ""); setWhatsapp(aluno.whatsapp);
    setResponsavel2(aluno.responsavel_2_nome || ""); setCpfResponsavel2(aluno.cpf_responsavel_2 || "");
    setWhatsapp2(aluno.responsavel_2_contato || ""); setValor(aluno.valor?.toString() || "");
    setVencimento(aluno.vencimento || ""); setDataNascimento(aluno.data_nascimento || "");
    setTemAlergia(aluno.tem_alergia || false); setAlergiaDescricao(aluno.alergia_descricao || "");
    setEAutista(aluno.e_autista || false); setPreviewUrl(aluno.foto_url);
    setModoEdicao(false); setVerHistorico(false); setVerBoletim(false); setModalAberto(true);
  }

  return (
    <div style={{ width: '100%', padding: 'clamp(10px, 3vw, 25px)', fontFamily: 'sans-serif', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      <AlunosHeader busca={busca} setBusca={setBusca} ehVisitante={ehVisitante} onNovoAluno={limparEContinuar} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '20px' }}>
        {alunosFiltrados.map((aluno) => (
          <AlunoCard key={aluno.id} aluno={aluno} obterCorTurma={obterCorTurma} mWhatsApp={mWhatsApp} onAbrirFicha={abrirFicha} />
        ))}
      </div>

      {modalAberto && !modoEdicao && (
        <FichaAlunoModal 
          aluno={{id: idEdicao, nome, cpf_aluno: cpfAluno, turma, responsavel, cpf_responsavel: cpfResponsavel, whatsapp, responsavel2, cpf_responsavel2: cpfResponsavel2, whatsapp2, valor, vencimento, data_nascimento: dataNascimento, tem_alergia: temAlergia, alergia_descricao: alergiaDescricao, e_autista: eAutista, foto_url: previewUrl}}
          verBoletim={verBoletim} verHistorico={verHistorico} notas={notas} historico={historico} ehVisitante={ehVisitante} mCPF={mCPF} mWhatsApp={mWhatsApp}
          onFechar={() => setModalAberto(false)} onEditar={() => setModoEdicao(true)}
          onVerBoletim={buscarBoletim} onVerHistorico={buscarHistoricoPagamento} onVoltarParaFicha={() => { setVerBoletim(false); setVerHistorico(false); }}
          onSalvarNota={salvarNota} onAdicionarDisciplina={adicionarDisciplina} onExcluirDisciplina={excluirDisciplina}
          onExcluir={async () => { if(confirm("Excluir?")) { await supabase.from('alunos').delete().eq('id', idEdicao); setModalAberto(false); buscarAlunos(); } }}
        />
      )}

      {modalAberto && modoEdicao && (
        <FormAlunoModal 
          idEdicao={idEdicao} previewUrl={previewUrl} carregando={carregando} mCPF={mCPF} mWhatsApp={mWhatsApp}
          form={{nome, cpfAluno, dataNascimento, turma, valor, vencimento, responsavel, cpfResponsavel, whatsapp, responsavel2, cpfResponsavel2, whatsapp2, eAutista, temAlergia, alergiaDescricao}}
          setForm={(d: any) => { setNome(d.nome); setCpfAluno(d.cpfAluno); setDataNascimento(d.dataNascimento); setTurma(d.turma); setValor(d.valor); setVencimento(d.vencimento); setResponsavel(d.responsavel); setCpfResponsavel(d.cpfResponsavel); setWhatsapp(d.whatsapp); setResponsavel2(d.responsavel2); setCpfResponsavel2(d.cpfResponsavel2); setWhatsapp2(d.whatsapp2); setEAutista(d.eAutista); setTemAlergia(d.temAlergia); setAlergiaDescricao(d.alergiaDescricao); }}
          onTrocarFoto={(e) => { const file = e.target.files?.[0]; if (file) { setArquivoFoto(file); setPreviewUrl(URL.createObjectURL(file)); } }}
          onSalvar={salvarAluno} onCancelar={() => idEdicao ? setModoEdicao(false) : setModalAberto(false)}
        />
      )}
    </div>
  );
}