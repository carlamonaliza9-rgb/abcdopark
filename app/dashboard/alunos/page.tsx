"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

// Importando os novos componentes que você criou
import { AdminView } from "./_components/AdminView";
import { ProfessorView } from "./_components/ProfessorView";

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
  const [arquivoFoto, setArquivoFoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // ESTADO DE OBSERVAÇÕES
  const [observacoes, setObservacoes] = useState("");

  const [historico, setHistorico] = useState<any[]>([]);
  const [verHistorico, setVerHistorico] = useState(false);
  const [verBoletim, setVerBoletim] = useState(false);
  const [notas, setNotas] = useState<any[]>([]);

  const ehVisitante = userEmail === "escolaabcdopark@gmail.com";
  // Definindo se é professor (você pode ajustar esse e-mail depois se quiser)
  const ehProfessor = userEmail !== "seu-email-admin@gmail.com" && !ehVisitante;

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
        valor: valor ? parseFloat(valor) : null, 
        vencimento, 
        data_nascimento: dataNascimento,
        tem_alergia: temAlergia, 
        alergia_descricao: temAlergia ? alergiaDescricao : "", 
        e_autista: eAutista, 
        foto_url: urlFinal
      };

      let alunoIdReal = idEdicao;

      if (idEdicao) {
        const { error } = await supabase.from('alunos').update(dados).eq('id', idEdicao);
        if (error) throw error;
      } else {
        const { data: novoAluno, error } = await supabase.from('alunos').insert([{ ...dados, status: 'pendente' }]).select().single();
        if (error) throw error;
        if (novoAluno) alunoIdReal = novoAluno.id;
      }

      if (observacoes.trim() && alunoIdReal) {
        const { error: errorObs } = await supabase.from('historico_pedagogico').insert({
          aluno_id: Number(alunoIdReal),
          descricao: observacoes.trim(),
          data: new Date().toISOString().split('T')[0]
        });
        if (errorObs) alert("Ficha salva, mas observação falhou: " + errorObs.message);
      }

      setModalAberto(false); 
      setModoEdicao(false); 
      setObservacoes(""); 
      buscarAlunos();
      alert("✅ Sucesso ao salvar!");
    } catch (err: any) {
      alert("Erro ao salvar: " + err.message);
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
    setEAutista(false); setArquivoFoto(null); setPreviewUrl(null); setObservacoes("");
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
    setEAutista(aluno.e_autista || false); setPreviewUrl(aluno.foto_url); setObservacoes("");
    setModoEdicao(false); setVerHistorico(false); setVerBoletim(false); setModalAberto(true);
  }

  // --- LOGICA DE RENDERIZAÇÃO ---
  // Se for professor, mostra a ProfessorView. Caso contrário (Admin), mostra AdminView.
  if (ehProfessor) {
    return (
      <ProfessorView 
        busca={busca} setBusca={setBusca} alunosFiltrados={alunosFiltrados} obterCorTurma={obterCorTurma} 
        mWhatsApp={mWhatsApp} onAbrirFicha={abrirFicha} modalAberto={modalAberto} idEdicao={idEdicao}
        nome={nome} cpfAluno={cpfAluno} turma={turma} responsavel={responsavel} parentesco1={parentesco1}
        whatsapp={whatsapp} responsavel2={responsavel2} parentesco2={parentesco2} whatsapp2={whatsapp2}
        responsavel3={responsavel3} parentesco3={parentesco3} whatsapp3={whatsapp3}
        dataNascimento={dataNascimento} temAlergia={temAlergia} alergiaDescricao={alergiaDescricao}
        eAutista={eAutista} previewUrl={previewUrl} verBoletim={verBoletim} notas={notas}
        mCPF={mCPF} setModalAberto={setModalAberto} buscarBoletim={buscarBoletim} calcularIdade={calcularIdade}
      />
    );
  }

  return (
    <AdminView 
      busca={busca} setBusca={setBusca} ehVisitante={ehVisitante} onNovoAluno={limparEContinuar}
      alunosFiltrados={alunosFiltrados} obterCorTurma={obterCorTurma} mWhatsApp={mWhatsApp}
      onAbrirFicha={abrirFicha} modalAberto={modalAberto} modoEdicao={modoEdicao} idEdicao={idEdicao}
      nome={nome} cpfAluno={cpfAluno} turma={turma} responsavel={responsavel} parentesco1={parentesco1}
      whatsapp={whatsapp} cpfResponsavel={cpfResponsavel} responsavel2={responsavel2} parentesco2={parentesco2}
      whatsapp2={whatsapp2} cpfResponsavel2={cpfResponsavel2} responsavel3={responsavel3} parentesco3={parentesco3}
      whatsapp3={whatsapp3} valor={valor} vencimento={vencimento} dataNascimento={dataNascimento}
      temAlergia={temAlergia} alergiaDescricao={alergiaDescricao} eAutista={eAutista} previewUrl={previewUrl}
      verBoletim={verBoletim} verHistorico={verHistorico} notas={notas} historico={historico}
      mCPF={mCPF} setModalAberto={setModalAberto} setModoEdicao={setModoEdicao}
      buscarBoletim={buscarBoletim} buscarHistoricoPagamento={buscarHistoricoPagamento}
      setVerBoletim={setVerBoletim} setVerHistorico={setVerHistorico}
      salvarNota={salvarNota} adicionarDisciplina={adicionarDisciplina} excluirDisciplina={excluirDisciplina}
      excluirAluno={async () => { if(confirm("Excluir definitivamente?")) { await supabase.from('alunos').delete().eq('id', idEdicao); setModalAberto(false); buscarAlunos(); } }}
      calcularIdade={calcularIdade} carregando={carregando} observacoes={observacoes}
      setForm={(d: any) => { setNome(d.nome); setCpfAluno(d.cpfAluno); setDataNascimento(d.dataNascimento); setTurma(d.turma); setValor(d.valor); setVencimento(d.vencimento); setResponsavel(d.responsavel); setParentesco1(d.parentesco1); setWhatsapp(d.whatsapp); setCpfResponsavel(d.cpfResponsavel); setResponsavel2(d.responsavel2); setParentesco2(d.parentesco2); setWhatsapp2(d.whatsapp2); setCpfResponsavel2(d.cpfResponsavel2); setResponsavel3(d.responsavel3); setParentesco3(d.parentesco3); setWhatsapp3(d.whatsapp3); setEAutista(d.eAutista); setTemAlergia(d.temAlergia); setAlergiaDescricao(d.alergiaDescricao); setObservacoes(d.observacoes); }}
      onTrocarFoto={(e: any) => { const file = e.target.files?.[0]; if (file) { setArquivoFoto(file); setPreviewUrl(URL.createObjectURL(file)); } }}
      onSalvar={salvarAluno}
    />
  );
}