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

  const obterCorTurma = (turmaNome: string) => {
    const cores: any = { "Maternal": "#e0f2fe", "Jardim I": "#f0fdf4", "Jardim II": "#fdf2f8", "1º Ano": "#faf5ff", "2º Ano": "#fff7ed", "3º Ano": "#f5f3ff", "4º Ano": "#ecfeff", "5º Ano": "#fefce8" };
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

  // --- MOTOR DE PDF ---
  function gerarPDFHistorico() {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return alert("Permita pop-ups no seu navegador.");

    const linhas = historico.map(h => `
      <tr>
        <td style="padding:10px; border-bottom:1px solid #eee;">${new Date(h.data_pagamento).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</td>
        <td style="padding:10px; border-bottom:1px solid #eee;">${h.descricao || 'Mensalidade'}</td>
        <td style="padding:10px; border-bottom:1px solid #eee; text-align:right;">R$ ${h.valor_total?.toLocaleString('pt-BR')}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <body style="font-family:sans-serif; padding:40px; color:#333;">
          <div style="text-align:center; border-bottom:2px solid #2563eb; padding-bottom:20px; marginBottom:30px;">
            <h1 style="margin:0; color:#2563eb;">ABC DO PARK</h1>
            <p style="margin:5px 0; font-size:14px; font-weight:bold;">EXTRATO FINANCEIRO 2026</p>
          </div>
          <p><b>Aluno:</b> ${nome.toUpperCase()}</p>
          <p><b>Turma:</b> ${turma}</p>
          <table style="width:100%; border-collapse:collapse; margin-top:20px;">
            <thead>
              <tr style="background:#f3f4f6; text-align:left;">
                <th style="padding:10px;">Data</th>
                <th style="padding:10px;">Descrição</th>
                <th style="padding:10px; text-align:right;">Valor</th>
              </tr>
            </thead>
            <tbody>${linhas}</tbody>
          </table>
        </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 500);
  }

  function gerarPDFBoletim() {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return alert("Permita pop-ups.");

    const linhas = notas.map(n => `
      <tr>
        <td style="padding:12px; border:1px solid #000; font-weight:bold;">${n.disciplina}</td>
        <td style="padding:12px; border:1px solid #000; text-align:center;">${n.bimestre1 || '-'}</td>
        <td style="padding:12px; border:1px solid #000; text-align:center;">${n.bimestre2 || '-'}</td>
        <td style="padding:12px; border:1px solid #000; text-align:center; background:#f9f9f9;">${n.recuperacao1 || '-'}</td>
        <td style="padding:12px; border:1px solid #000; text-align:center;">${n.bimestre3 || '-'}</td>
        <td style="padding:12px; border:1px solid #000; text-align:center;">${n.bimestre4 || '-'}</td>
        <td style="padding:12px; border:1px solid #000; text-align:center; background:#f9f9f9;">${n.recuperacao2 || '-'}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <body style="font-family:Arial, sans-serif; padding:20px;">
          <div style="border:4px double #000; padding:30px;">
            <h1 style="text-align:center; margin:0; font-size:28px;">ABC DO PARK</h1>
            <p style="text-align:center; font-weight:bold; margin:5px 0;">BOLETIM ESCOLAR - ANO LETIVO 2026</p>
            
            <div style="margin:30px 0; font-size:16px;">
              <p><b>ALUNO(A):</b> ${nome.toUpperCase()}</p>
              <p><b>TURMA:</b> ${turma}</p>
            </div>

            <table style="width:100%; border-collapse:collapse; margin-top:20px;">
              <thead>
                <tr style="background:#eee;">
                  <th style="padding:12px; border:1px solid #000; text-align:left;">DISCIPLINA</th>
                  <th style="padding:12px; border:1px solid #000; width:50px;">1º B</th>
                  <th style="padding:12px; border:1px solid #000; width:50px;">2º B</th>
                  <th style="padding:12px; border:1px solid #000; width:50px; background:#ddd;">REC 1</th>
                  <th style="padding:12px; border:1px solid #000; width:50px;">3º B</th>
                  <th style="padding:12px; border:1px solid #000; width:50px;">4º B</th>
                  <th style="padding:12px; border:1px solid #000; width:50px; background:#ddd;">REC 2</th>
                </tr>
              </thead>
              <tbody>${linhas}</tbody>
            </table>

            <div style="margin-top:80px; display:flex; justify-content:space-around;">
              <div style="border-top:1px solid #000; width:200px; text-align:center; padding-top:5px;">Coordenação</div>
              <div style="border-top:1px solid #000; width:200px; text-align:center; padding-top:5px;">Responsável</div>
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 500);
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
          onGerarPDFBoletim={gerarPDFBoletim}
          onGerarPDFHistorico={gerarPDFHistorico}
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