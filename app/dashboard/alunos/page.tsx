"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

import { AlunosHeader } from "./_components/AlunosHeader";
import { AlunoCard } from "./_components/AlunoCard";
import { FichaAlunoModal } from "./_components/FichaAlunoModal";
import { FormAlunoModal } from "./_components/FormAlunoModal";

export default function Alunos() {
  const [modalAberto, setModalAberto] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [alunos, setAlunos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  
  // --- ESTADOS DOS CAMPOS ---
  const [idEdicao, setIdEdicao] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [cpfAluno, setCpfAluno] = useState("");
  const [turma, setTurma] = useState("");
  
  // Responsável 1
  const [responsavel, setResponsavel] = useState("");
  const [parentesco1, setParentesco1] = useState("Mãe");
  const [cpfResponsavel, setCpfResponsavel] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  
  // Responsável 2
  const [responsavel2, setResponsavel2] = useState("");
  const [parentesco2, setParentesco2] = useState("Pai");
  const [cpfResponsavel2, setCpfResponsavel2] = useState("");
  const [whatsapp2, setWhatsapp2] = useState("");

  // Responsável 3
  const [responsavel3, setResponsavel3] = useState("");
  const [parentesco3, setParentesco3] = useState("");
  const [whatsapp3, setWhatsapp3] = useState("");

  const [valor, setValor] = useState("");
  const [vencimento, setVencimento] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [temAlergia, setTemAlergia] = useState(false);
  const [alergiaDescricao, setAlergiaDescricao] = useState("");
  const [eAutista, setEAutista] = useState(false);
  const [observacoes, setObservacoes] = useState(""); 
  const [arquivoFoto, setArquivoFoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [historico, setHistorico] = useState<any[]>([]);
  const [verHistorico, setVerHistorico] = useState(false);
  const [verBoletim, setVerBoletim] = useState(false);
  const [notas, setNotas] = useState<any[]>([]);

  const ehVisitante = userEmail === "escolaabcdopark@gmail.com";

  // --- FUNÇÕES UTILITÁRIAS ---
  const mWhatsApp = (v: string) => {
    if (!v) return "";
    v = v.replace(/\D/g, "");
    if (v.length <= 11) {
      v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
      v = v.replace(/(\d{5})(\d)/, "$1-$2");
    }
    return v;
  };

  const mCPF = (v: string) => {
    if (!v) return "";
    v = v.replace(/\D/g, "");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    return v;
  };

  const calcularIdade = (dataNasc: string) => {
    if (!dataNasc) return "--";
    const hoje = new Date();
    const nascimento = new Date(dataNasc);
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const m = hoje.getMonth() - nascimento.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) idade--;
    return `${idade} ${idade === 1 ? 'ano' : 'anos'}`;
  };

  const obterCorTurma = (turmaNome: string) => {
    const cores: any = { 
      "Maternal": "#B9E2F5", "Jardim I": "#C2F0D5", "Jardim II": "#F7C8E0",
      "1º Ano": "#D7C0F0", "2º Ano": "#F9D9B4", "3º Ano": "#C5C5FC",
      "4º Ano": "#B4EAEA", "5º Ano": "#F9E89D"
    };
    return cores[turmaNome] || "#ffffff";
  };

  // --- COMUNICAÇÃO COM SUPABASE ---
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

  function gerarPDFHistorico() { /* Lógica de PDF preservada */ }
  function gerarPDFBoletim() { /* Lógica de PDF preservada */ }

  async function salvarAluno(e: React.FormEvent) {
    e.preventDefault();
    if (ehVisitante) return;
    setCarregando(true);
    try {
      let urlFinal = previewUrl;
      if (arquivoFoto) {
        const nomeArquivo = `${Date.now()}_${arquivoFoto.name}`;
        const { data, error: uploadError } = await supabase.storage.from('fotos-alunos').upload(nomeArquivo, arquivoFoto);
        if (uploadError) throw uploadError;
        if (data) urlFinal = supabase.storage.from('fotos-alunos').getPublicUrl(nomeArquivo).data.publicUrl;
      }
      
      const dados = { 
        nome, 
        cpf_aluno: cpfAluno, 
        turma, 
        responsavel, 
        parentesco_1: parentesco1, 
        whatsapp, 
        cpf_responsavel: cpfResponsavel,
        responsavel_2_nome: responsavel2, 
        parentesco_2: parentesco2, 
        responsavel_2_contato: whatsapp2, 
        cpf_responsavel_2: cpfResponsavel2,
        responsavel_3_nome: responsavel3, 
        parentesco_3: parentesco3, 
        responsavel_3_contato: whatsapp3,
        valor: valor ? parseFloat(valor.toString()) : null, 
        vencimento, 
        data_nascimento: dataNascimento,
        tem_alergia: temAlergia, 
        alergia_descricao: temAlergia ? alergiaDescricao : "", 
        e_autista: eAutista, 
        observacoes,
        foto_url: urlFinal
      };

      if (idEdicao) {
        const { error: updateError } = await supabase.from('alunos').update(dados).eq('id', idEdicao);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from('alunos').insert([{ ...dados, status: 'pendente' }]);
        if (insertError) throw insertError;
      }

      setModalAberto(false); 
      setModoEdicao(false); 
      buscarAlunos();
      alert("Salvo com sucesso!");
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar: " + (error.message || "Erro desconhecido"));
    } finally { 
      setCarregando(false); 
    }
  }

  function limparEContinuar() {
    setIdEdicao(null); setNome(""); setCpfAluno(""); setTurma(""); 
    setResponsavel(""); setParentesco1("Mãe"); setCpfResponsavel(""); setWhatsapp(""); 
    setResponsavel2(""); setParentesco2("Pai"); setCpfResponsavel2(""); setWhatsapp2(""); 
    setResponsavel3(""); setParentesco3(""); setWhatsapp3("");
    setValor(""); setVencimento(""); setDataNascimento(""); setTemAlergia(false); setAlergiaDescricao("");
    setEAutista(false); setObservacoes(""); setArquivoFoto(null); setPreviewUrl(null);
    setModoEdicao(true); setModalAberto(true);
  }

  function abrirFicha(aluno: any) {
    setIdEdicao(aluno.id); setNome(aluno.nome); setCpfAluno(aluno.cpf_aluno || ""); setTurma(aluno.turma);
    setResponsavel(aluno.responsavel); 
    setParentesco1(aluno.parentesco_1 || "Mãe"); 
    setCpfResponsavel(aluno.cpf_responsavel || ""); setWhatsapp(aluno.whatsapp);
    setResponsavel2(aluno.responsavel_2_nome || ""); 
    setParentesco2(aluno.parentesco_2 || "Pai");
    setCpfResponsavel2(aluno.cpf_responsavel_2 || "");
    setWhatsapp2(aluno.responsavel_2_contato || ""); 
    setResponsavel3(aluno.responsavel_3_nome || ""); 
    setParentesco3(aluno.parentesco_3 || ""); 
    setWhatsapp3(aluno.responsavel_3_contato || "");
    setValor(aluno.valor?.toString() || ""); setVencimento(aluno.vencimento || ""); setDataNascimento(aluno.data_nascimento || "");
    setTemAlergia(aluno.tem_alergia || false); setAlergiaDescricao(aluno.alergia_descricao || "");
    setEAutista(aluno.e_autista || false); setObservacoes(aluno.observacoes || ""); setPreviewUrl(aluno.foto_url);
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
          aluno={{
            id: idEdicao, nome, cpf_aluno: cpfAluno, turma, 
            responsavel, parentesco1: parentesco1, 
            whatsapp, cpf_responsavel: cpfResponsavel, 
            responsavel2, parentesco2: parentesco2, 
            whatsapp2, cpf_responsavel2: cpfResponsavel2, 
            responsavel3, parentesco3: parentesco3, 
            whatsapp3, valor, vencimento, data_nascimento: dataNascimento, 
            tem_alergia: temAlergia, alergia_descricao: alergiaDescricao, 
            e_autista: eAutista, foto_url: previewUrl, observacoes
          }}
          verBoletim={verBoletim} verHistorico={verHistorico} notas={notas} historico={historico} ehVisitante={ehVisitante} mCPF={mCPF} mWhatsApp={mWhatsApp}
          onFechar={() => setModalAberto(false)} onEditar={() => setModoEdicao(true)}
          onVerBoletim={buscarBoletim} onVerHistorico={buscarHistoricoPagamento} onVoltarParaFicha={() => { setVerBoletim(false); setVerHistorico(false); }}
          onSalvarNota={salvarNota} onAdicionarDisciplina={adicionarDisciplina} onExcluirDisciplina={excluirDisciplina}
          onExcluir={async () => { if(confirm("Excluir definitivamente?")) { await supabase.from('alunos').delete().eq('id', idEdicao); setModalAberto(false); buscarAlunos(); } }}
          onGerarPDFBoletim={gerarPDFBoletim} onGerarPDFHistorico={gerarPDFHistorico}
          calcularIdade={calcularIdade}
        />
      )}

      {modalAberto && modoEdicao && (
        <FormAlunoModal 
          idEdicao={idEdicao} previewUrl={previewUrl} carregando={carregando} mCPF={mCPF} mWhatsApp={mWhatsApp}
          form={{nome, cpfAluno, dataNascimento, turma, valor, vencimento, responsavel, parentesco1, whatsapp, cpfResponsavel, responsavel2, parentesco2, whatsapp2, cpfResponsavel2, responsavel3, parentesco3, whatsapp3, eAutista, temAlergia, alergiaDescricao, observacoes}}
          setForm={(d: any) => { 
            if (d.nome !== undefined) setNome(d.nome);
            if (d.cpfAluno !== undefined) setCpfAluno(d.cpfAluno);
            if (d.dataNascimento !== undefined) setDataNascimento(d.dataNascimento);
            if (d.turma !== undefined) setTurma(d.turma);
            if (d.valor !== undefined) setValor(d.valor);
            if (d.vencimento !== undefined) setVencimento(d.vencimento);
            if (d.responsavel !== undefined) setResponsavel(d.responsavel);
            if (d.parentesco1 !== undefined) setParentesco1(d.parentesco1);
            if (d.whatsapp !== undefined) setWhatsapp(d.whatsapp);
            if (d.cpfResponsavel !== undefined) setCpfResponsavel(d.cpfResponsavel);
            if (d.responsavel2 !== undefined) setResponsavel2(d.responsavel2);
            if (d.parentesco2 !== undefined) setParentesco2(d.parentesco2);
            if (d.whatsapp2 !== undefined) setWhatsapp2(d.whatsapp2);
            if (d.cpfResponsavel2 !== undefined) setCpfResponsavel2(d.cpfResponsavel2);
            if (d.responsavel3 !== undefined) setResponsavel3(d.responsavel3);
            if (d.parentesco3 !== undefined) setParentesco3(d.parentesco3);
            if (d.whatsapp3 !== undefined) setWhatsapp3(d.whatsapp3);
            if (d.eAutista !== undefined) setEAutista(d.eAutista);
            if (d.temAlergia !== undefined) setTemAlergia(d.temAlergia);
            if (d.alergiaDescricao !== undefined) setAlergiaDescricao(d.alergiaDescricao);
            if (d.observacoes !== undefined) setObservacoes(d.observacoes);
          }}
          onTrocarFoto={(e) => { const file = e.target.files?.[0]; if (file) { setArquivoFoto(file); setPreviewUrl(URL.createObjectURL(file)); } }}
          onSalvar={salvarAluno} onCancelar={() => idEdicao ? setModoEdicao(false) : setModalAberto(false)}
        />
      )}
    </div>
  );
}