"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Buscando os componentes na pasta original para não duplicar arquivos
import { AlunosHeader } from "@/app/dashboard/alunos/_components/AlunosHeader";
import { AlunoCard } from "@/app/dashboard/alunos/_components/AlunoCard";
import { FichaAlunoModal } from "@/app/dashboard/alunos/_components/FichaAlunoModal";
import { FormAlunoModal } from "@/app/dashboard/alunos/_components/FormAlunoModal";

export default function AlunosAdminPage() {
  const router = useRouter();
  const [modalAberto, setModalAberto] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [alunos, setAlunos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [verificandoAcesso, setVerificandoAcesso] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  
  // --- ESTADOS DOS CAMPOS ---
  const [idEdicao, setIdEdicao] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [cpfAluno, setCpfAluno] = useState("");
  const [turma, setTurma] = useState("");
  const [turno, setTurno] = useState("");

  // Endereço
  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState("");
  const [numero, setNumero] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  
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

  // --- TRAVA DE SEGURANÇA E CARREGAMENTO ---
  useEffect(() => { 
    async function verificarAcesso() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");

      const emailAtual = user.email || "";
      setUserEmail(emailAtual);
      
      const { data: perfil } = await supabase.from('perfis').select('cargo').eq('id', user.id).single();
      const ehAdmin = emailAtual === 'carlamonaliza9@gmail.com' || emailAtual === 'diretoria@abcdopark.com' || perfil?.cargo === 'Admin';
      
      if (!ehAdmin) return router.push("/dashboard");

      await buscarAlunos();
      setVerificandoAcesso(false);
    }
    verificarAcesso();
  }, [router]);

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
    const v = valorNota === "" ? 0 : parseFloat(valorNota.replace(',', '.'));
    const notaAtual = notas.find(n => n.id === id);
    if (!notaAtual) return;
    const nCalculo = { ...notaAtual, [campo]: v };
    let n1 = parseFloat(nCalculo.bimestre1 || 0);
    let n2 = parseFloat(nCalculo.bimestre2 || 0);
    let r1 = parseFloat(nCalculo.recuperacao1 || 0);
    let n3 = parseFloat(nCalculo.bimestre3 || 0);
    let n4 = parseFloat(nCalculo.bimestre4 || 0);
    let r2 = parseFloat(nCalculo.recuperacao2 || 0);

    if (r1 > Math.min(n1, n2)) {
      if (n1 <= n2) n1 = r1; else n2 = r1;
    }
    if (r2 > Math.min(n3, n4)) {
      if (n3 <= n4) n3 = r2; else n4 = r2;
    }
    const novaMedia = parseFloat(((n1 + n2 + n3 + n4) / 4).toFixed(1));
    const { error } = await supabase.from('boletins').update({ [campo]: v, media: novaMedia }).eq('id', id);
    if (error) return console.error("Erro ao salvar:", error.message);
    setNotas(notas.map(n => n.id === id ? { ...n, [campo]: v, media: novaMedia } : n));
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

  function gerarPDFHistorico() {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("EXTRATO FINANCEIRO - ESCOLA ABC DO PARK", 105, 20, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Aluno: ${nome.toUpperCase()}`, 15, 35);
    autoTable(doc, {
      startY: 45,
      head: [['DATA', 'DESCRIÇÃO', 'VALOR']],
      body: historico.map(h => [
        new Date(h.data_pagamento).toLocaleDateString('pt-BR', {timeZone: 'UTC'}),
        h.descricao.toUpperCase(),
        `R$ ${h.valor_total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      ]),
      headStyles: { fillColor: [37, 99, 235] }
    });
    doc.save(`Extrato_${nome.replace(/\s+/g, '_')}.pdf`);
  }

  function gerarPDFBoletim() {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("BOLETIM ESCOLAR 2026 - ESCOLA ABC DO PARK", 105, 20, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Aluno: ${nome.toUpperCase()}`, 15, 35);
    autoTable(doc, {
      startY: 45,
      head: [['DISCIPLINA', '1ºB', '2ºB', 'R1', '3ºB', '4ºB', 'R2', 'MÉD']],
      body: notas.map(n => [
        n.disciplina.toUpperCase(),
        n.bimestre1 || '-', n.bimestre2 || '-', n.recuperacao1 || '-',
        n.bimestre3 || '-', n.bimestre4 || '-', n.recuperacao2 || '-',
        n.media || '0.0'
      ]),
      headStyles: { fillColor: [37, 99, 235] },
      styles: { halign: 'center' },
      columnStyles: { 0: { halign: 'left' } }
    });
    doc.save(`Boletim_${nome.replace(/\s+/g, '_')}.pdf`);
  }

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
        nome, cpf_aluno: cpfAluno, turma, turno,
        cep, endereco, numero, bairro, cidade, estado,
        responsavel, parentesco_1: parentesco1, whatsapp, cpf_responsavel: cpfResponsavel,
        responsavel_2_nome: responsavel2, parentesco_2: parentesco2, responsavel_2_contato: whatsapp2, cpf_responsavel_2: cpfResponsavel2,
        responsavel_3_nome: responsavel3, parentesco_3: parentesco3, responsavel_3_contato: whatsapp3,
        valor: valor ? parseFloat(valor.toString()) : null, vencimento, data_nascimento: dataNascimento,
        tem_alergia: temAlergia, alergia_descricao: temAlergia ? alergiaDescricao : "", e_autista: eAutista, 
        observacoes, foto_url: urlFinal
      };

      if (idEdicao) {
        await supabase.from('alunos').update(dados).eq('id', idEdicao);
      } else {
        await supabase.from('alunos').insert([{ ...dados, status: 'pendente' }]);
      }

      setModalAberto(false); setModoEdicao(false); buscarAlunos();
      alert("Salvo com sucesso!");
    } catch (error: any) { alert("Erro ao salvar: " + error.message); } finally { setCarregando(false); }
  }

  function limparEContinuar() {
    setIdEdicao(null); setNome(""); setCpfAluno(""); setTurma(""); setTurno("");
    setCep(""); setEndereco(""); setNumero(""); setBairro(""); setCidade(""); setEstado("");
    setResponsavel(""); setParentesco1("Mãe"); setCpfResponsavel(""); setWhatsapp(""); 
    setResponsavel2(""); setParentesco2("Pai"); setCpfResponsavel2(""); setWhatsapp2(""); 
    setResponsavel3(""); setParentesco3(""); setWhatsapp3("");
    setValor(""); setVencimento(""); setDataNascimento(""); setTemAlergia(false); setAlergiaDescricao("");
    setEAutista(false); setObservacoes(""); setArquivoFoto(null); setPreviewUrl(null);
    setModoEdicao(true); setModalAberto(true);
  }

  function abrirFicha(aluno: any) {
    setIdEdicao(aluno.id); setNome(aluno.nome); setCpfAluno(aluno.cpf_aluno || ""); setTurma(aluno.turma); setTurno(aluno.turno || "");
    setCep(aluno.cep || ""); setEndereco(aluno.endereco || ""); setNumero(aluno.numero || ""); 
    setBairro(aluno.bairro || ""); setCidade(aluno.cidade || ""); setEstado(aluno.estado || "");
    setResponsavel(aluno.responsavel); setParentesco1(aluno.parentesco_1 || "Mãe"); 
    setCpfResponsavel(aluno.cpf_responsavel || ""); setWhatsapp(aluno.whatsapp);
    setResponsavel2(aluno.responsavel_2_nome || ""); setParentesco2(aluno.parentesco_2 || "Pai");
    setCpfResponsavel2(aluno.cpf_responsavel_2 || ""); setWhatsapp2(aluno.responsavel_2_contato || ""); 
    setResponsavel3(aluno.responsavel_3_nome || ""); setParentesco3(aluno.parentesco_3 || ""); 
    setWhatsapp3(aluno.responsavel_3_contato || "");
    setValor(aluno.valor?.toString() || ""); setVencimento(aluno.vencimento || ""); setDataNascimento(aluno.data_nascimento || "");
    setTemAlergia(aluno.tem_alergia || false); setAlergiaDescricao(aluno.alergia_descricao || "");
    setEAutista(aluno.e_autista || false); setObservacoes(aluno.observacoes || ""); setPreviewUrl(aluno.foto_url);
    setModoEdicao(false); setVerHistorico(false); setVerBoletim(false); setModalAberto(true);
  }

  if (verificandoAcesso) return <div className="p-10 text-center">Validando permissões...</div>;

  return (
    <div style={{ width: '100%', padding: 'clamp(10px, 3vw, 25px)', fontFamily: 'sans-serif', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      <AlunosHeader busca={busca} setBusca={setBusca} ehVisitante={ehVisitante} onNovoAluno={limparEContinuar} />

      {/* NOVO BOTÃO DE NAVEGAÇÃO PARA RELATÓRIO DE FREQUÊNCIA */}
      {!ehVisitante && (
        <div style={{ marginBottom: '25px', display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            onClick={() => router.push('/admin/frequencia')}
            style={{ padding: '12px 24px', borderRadius: '12px', border: 'none', backgroundColor: '#eff6ff', color: '#2563eb', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '4px solid #dbeafe' }}
          >
            📊 Relatório de Frequência Geral
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '20px' }}>
        {alunosFiltrados.map((aluno) => (
          <AlunoCard key={aluno.id} aluno={aluno} obterCorTurma={obterCorTurma} mWhatsApp={mWhatsApp} onAbrirFicha={abrirFicha} />
        ))}
      </div>

      {modalAberto && !modoEdicao && (
        <FichaAlunoModal 
          aluno={{
            id: idEdicao, nome, cpf_aluno: cpfAluno, turma, turno,
            cep, endereco, numero, bairro, cidade, estado,
            responsavel, parentesco1: parentesco1, 
            whatsapp, cpf_responsavel: cpfResponsavel, responsavel2, parentesco2: parentesco2, 
            whatsapp2, cpf_responsavel2: cpfResponsavel2, responsavel3, parentesco3: parentesco3, 
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
          form={{nome, cpfAluno, dataNascimento, turma, turno, cep, endereco, numero, bairro, cidade, estado, valor, vencimento, responsavel, parentesco1, whatsapp, cpfResponsavel, responsavel2, parentesco2, whatsapp2, cpfResponsavel2, responsavel3, parentesco3, whatsapp3, eAutista, temAlergia, alergiaDescricao, observacoes}}
          setForm={(d: any) => { 
            if (d.nome !== undefined) setNome(d.nome);
            if (d.cpfAluno !== undefined) setCpfAluno(d.cpfAluno);
            if (d.dataNascimento !== undefined) setDataNascimento(d.dataNascimento);
            if (d.turma !== undefined) setTurma(d.turma);
            if (d.turno !== undefined) setTurno(d.turno);
            if (d.cep !== undefined) setCep(d.cep);
            if (d.endereco !== undefined) setEndereco(d.endereco);
            if (d.numero !== undefined) setNumero(d.numero);
            if (d.bairro !== undefined) setBairro(d.bairro);
            if (d.cidade !== undefined) setCidade(d.cidade);
            if (d.estado !== undefined) setEstado(d.estado);
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