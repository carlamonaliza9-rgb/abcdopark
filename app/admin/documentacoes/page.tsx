"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

// Importação das bibliotecas da pasta original
import { gerarPDFMatricula } from "@/app/dashboard/documentacoes/_lib/geradorMatricula";
import { gerarPDFImpostoRenda } from "@/app/dashboard/documentacoes/_lib/geradorImpostoRenda";
import { gerarPDFRessalva } from "@/app/dashboard/documentacoes/_lib/geradorRessalva";
import { gerarDocumentoCodes } from "@/app/dashboard/documentacoes/_lib/geradorCodes"; 
import { gerarNotificacaoExtrajudicial } from "@/app/dashboard/documentacoes/_lib/geradorNotificacaoExtrajudicial"; 
import { gerarTextoWhatsAppProvas, gerarPDFCronogramaProvas, obterMateriasPadrao } from "@/app/dashboard/documentacoes/_lib/geradorProvas";

const clean = (val: any) => {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === 'number') return val;
  const str = String(val).trim();
  if (str.includes(',')) return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
  return parseFloat(str) || 0;
};

export default function DocumentacoesAdminPage() {
  const router = useRouter();
  const [alunos, setAlunos] = useState<any[]>([]);
  const [alunoSelecionado, setAlunoSelecionado] = useState<any>(null);
  const [responsavelEscolhido, setResponsavelEscolhido] = useState({ nome: "", cpf: "", telefone: "" });
  const [documentoAtivo, setDocumentoAtivo] = useState<string | null>(null);
  const [sexoAluno, setSexoAluno] = useState<"M" | "F">("M");
  const [verificandoAcesso, setVerificandoAcesso] = useState(true);
  
  const [valorMensalidade, setValorMensalidade] = useState<string>("450,00");
  const [mesesPagos, setMesesPagos] = useState<string>("12");
  const [anoBase, setAnoBase] = useState<string>("2025");

  // --- ESTADOS PARA O CODES ---
  const [turmas, setTurmas] = useState<any[]>([]);
  const [boletins, setBoletins] = useState<any[]>([]);
  const [abaTurmaAtiva, setAbaTurmaAtiva] = useState<string>("");
  const [carregandoCodes, setCarregandoCodes] = useState(false);

  // --- ESTADOS PARA A NOTIFICAÇÃO EXTRAJUDICIAL ---
  const [dataReferencia, setDataReferencia] = useState("");
  const [valorPagoNotificacao, setValorPagoNotificacao] = useState("");
  const [multaNotificacao, setMultaNotificacao] = useState("");
  const [descontoNotificacao, setDescontoNotificacao] = useState("");
  const [prazoDias, setPrazoDias] = useState("15 (quinze)");
  const [cidadeData, setCidadeData] = useState(`Belém, ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}`);
  const [itensNotificacao, setItensNotificacao] = useState<{descricao: string, valor: string}[]>([
    { descricao: "", valor: "" }
  ]);

  // --- ESTADOS PARA CONTEÚDO DE PROVAS ---
  const [turmaProvas, setTurmaProvas] = useState<string>("");
  const [listaProvas, setListaProvas] = useState<{materia: string, data: string, conteudo: string}[]>([
    { materia: "", data: "", conteudo: "" }
  ]);

  // --- MÁSCARAS DE FORMATAÇÃO EM TEMPO REAL ---
  const handleDataChange = (value: string, setter: (val: string) => void) => {
    let v = value.replace(/\D/g, "");
    if (v.length > 2) v = v.substring(0, 2) + "/" + v.substring(2);
    if (v.length > 5) v = v.substring(0, 5) + "/" + v.substring(5, 9);
    setter(v);
  };

  const handleMoedaChange = (value: string, setter: (val: string) => void) => {
    let v = value.replace(/\D/g, "");
    if (v === "") {
      setter("");
      return;
    }
    v = (parseInt(v, 10) / 100).toFixed(2);
    v = v.replace(".", ",");
    v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
    setter(v);
  };

  // --- BUSCADOR AUTOMÁTICO DE INADIMPLÊNCIA (NOTIFICAÇÃO) ---
  useEffect(() => {
    async function carregarPendenciasAluno() {
      if (documentoAtivo === 'notificacao' && alunoSelecionado) {
        const { data } = await supabase.from('historico_pagamentos')
          .select('*')
          .eq('aluno_id', alunoSelecionado.id)
          .in('status', ['pendente', 'parcial', 'atrasado'])
          .order('data_pagamento', { ascending: true });

        if (data && data.length > 0) {
          const pendenciasMapeadas = data.map(p => {
            const restante = clean(p.valor_total) - clean(p.valor_pago);
            let valString = restante.toFixed(2).replace(".", ",");
            valString = valString.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
            
            return {
              descricao: p.descricao ? p.descricao.toUpperCase() : "DÉBITO PENDENTE",
              valor: valString
            };
          });
          setItensNotificacao(pendenciasMapeadas);
        } else {
          setItensNotificacao([{ descricao: "", valor: "" }]);
        }
      }
    }
    carregarPendenciasAluno();
  }, [documentoAtivo, alunoSelecionado]);

  // --- TRAVA DE SEGURANÇA E CARREGAMENTO INICIAL LEVE ---
  useEffect(() => {
    async function verificarAcesso() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");

      const emailAtual = user.email || "";
      const { data: perfil } = await supabase.from('perfis').select('cargo').eq('id', user.id).single();

      const ehAdmin = 
        emailAtual === 'carlamonaliza9@gmail.com' || 
        emailAtual === 'diretoria@abcdopark.com' || 
        perfil?.cargo === 'Admin';

      if (!ehAdmin) {
        return router.push("/dashboard");
      }

      buscarAlunos(); 
      setVerificandoAcesso(false);
    }
    verificarAcesso();
  }, [router]);

  // --- CARREGADORES SEPARADOS ---
  async function buscarAlunos() {
    const { data } = await supabase.from("alunos").select("*").order("nome");
    if (data) setAlunos(data);
  }

  // --- CARREGADOR SOB DEMANDA (LAZY LOAD) APENAS PARA O CODES ---
  useEffect(() => {
    async function carregarDadosCodes() {
      if (documentoAtivo === 'codes' && turmas.length === 0) {
        setCarregandoCodes(true);
        const [resTurmas, resBoletins] = await Promise.all([
          supabase.from("turmas_info").select("*"),
          supabase.from("boletins").select("*")
        ]);
        
        if (resBoletins.data) setBoletins(resBoletins.data);
        if (resTurmas.data) {
          const filtradas = resTurmas.data.filter(t => 
            t.nome_turma.includes("1º") || t.nome_turma.includes("2º") || 
            t.nome_turma.includes("3º") || t.nome_turma.includes("4º") || 
            t.nome_turma.includes("5º")
          ).sort((a, b) => a.nome_turma.localeCompare(b.nome_turma));
          
          setTurmas(filtradas);
          if (filtradas.length > 0) setAbaTurmaAtiva(filtradas[0].nome_turma);
        }
        setCarregandoCodes(false);
      }
    }
    carregarDadosCodes();
  }, [documentoAtivo]);

  const selecionarResponsavel = (aluno: any, tipo: number) => {
    if (tipo === 1) {
      setResponsavelEscolhido({ 
        nome: aluno.responsavel || "", 
        cpf: aluno.cpf_responsavel || "",
        telefone: aluno.whatsapp || "" 
      });
    } else {
      setResponsavelEscolhido({ 
        nome: aluno.responsavel2 || aluno.responsavel_2_nome || "", 
        cpf: aluno.cpf_responsavel2 || aluno.cpf_responsavel_2 || "",
        telefone: aluno.responsavel_2_contato || ""
      });
    }
  };

  const enviarWhatsApp = (aluno: any, resp: any) => {
    if (!resp.telefone) {
      alert("Responsável não possui telefone cadastrado!");
      return;
    }

    const numeroLimpo = resp.telefone.replace(/\D/g, "");
    let nomeDoc = "";
    if (documentoAtivo === 'matricula') nomeDoc = "Declaração de Matrícula";
    else if (documentoAtivo === 'quitacao') nomeDoc = "Quitação de Imposto de Renda";
    else if (documentoAtivo === 'ressalva') nomeDoc = "Ressalva (Transferência)";
    else if (documentoAtivo === 'notificacao') nomeDoc = "Notificação Extrajudicial";
    
    const mensagem = `Olá! Aqui é da *Escola ABC do Park*. Segue a ${nomeDoc} de *${aluno.nome}*. Por favor, salve o arquivo PDF que acabei de gerar para você.`;
    
    const url = `https://wa.me/55${numeroLimpo}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, "_blank");
  };

  const executarGeracaoCodesPdf = async () => {
    const doc = await gerarDocumentoCodes(turmas, alunos, boletins);
    if (doc) {
      const pdfUrl = doc.output('bloburl');
      window.open(pdfUrl, '_blank');
    }
  };

  const executarGeracaoNotificacao = async () => {
    const itensConvertidos = itensNotificacao.map(i => ({
        descricao: i.descricao,
        valor: parseFloat(i.valor.replace(/\./g, '').replace(',', '.')) || 0
    }));

    const dados = {
      nomeResponsavel: responsavelEscolhido.nome,
      cpfResponsavel: responsavelEscolhido.cpf,
      enderecoResponsavel: alunoSelecionado.endereco || "Endereço não cadastrado",
      dataReferencia: dataReferencia,
      valorPago: parseFloat(valorPagoNotificacao.replace(/\./g, '').replace(',', '.')) || 0,
      multa: parseFloat(multaNotificacao.replace(/\./g, '').replace(',', '.')) || 0,
      desconto: parseFloat(descontoNotificacao.replace(/\./g, '').replace(',', '.')) || 0,
      itens: itensConvertidos,
      prazoDias: prazoDias,
      cidadeData: cidadeData
    };
    await gerarNotificacaoExtrajudicial(dados);
  };

  const obterMediaFinalAluno = (alunoId: string, materiaChave: string, materiaChaveSecundaria?: string) => {
    const notas = boletins.filter(b => b.aluno_id === alunoId);
    const registro = notas.find(n => n.materia && (n.materia.toLowerCase().includes(materiaChave.toLowerCase()) || (materiaChaveSecundaria && n.materia.toLowerCase().includes(materiaChaveSecundaria.toLowerCase()))));
    return registro && registro.media ? parseFloat(registro.media).toFixed(1).replace('.', ',') : "-";
  };

  const calcularSituacaoNaTela = (alunoId: string, nomeAluno: string) => {
    const materias = ["portug", "mat", "hist", "geo", "ciên", "arte", "ing"];
    const notas = materias.map(m => {
      const notasAluno = boletins.filter(b => b.aluno_id === alunoId);
      const r = notasAluno.find(n => n.materia && n.materia.toLowerCase().includes(m));
      return r && r.media ? parseFloat(r.media) : null;
    }).filter(n => n !== null) as number[];

    let situacao = "S/ DADOS";
    if (notas.length > 0) {
      const mediaGeral = notas.reduce((a, b) => a + b, 0) / notas.length;
      const pNome = nomeAluno.trim().split(' ')[0].toUpperCase();
      const isMasc = ['ANDRE', 'FELIPE', 'GUILHERME', 'HENRIQUE', 'ALEXANDRE', 'JOSÉ', 'JOSE', 'KAUA', 'CAUA', 'LUCAS', 'MATHEUS', 'MIGUEL', 'DAVI', 'GABRIEL', 'ARTHUR', 'SAMUEL', 'BERNARDO', 'HEITOR', 'JOÃO', 'JOAO', 'TIAGO', 'THIAGO', 'RICHARD'].includes(pNome);
      const isFem = pNome.endsWith('A') || pNome.endsWith('Y') || pNome.endsWith('I') || pNome.endsWith('E');
      const sufixo = isMasc ? 'O' : (isFem ? 'A' : 'O');
      situacao = mediaGeral >= 6.0 ? `APROVAD${sufixo}` : `REPROVAD${sufixo}`;
    }
    return situacao;
  };

  if (verificandoAcesso) return <div style={{ padding: '50px', textAlign: 'center', color: '#64748b' }}>Validando credenciais...</div>;

  return (
    <div style={{ padding: 'clamp(15px, 5vw, 30px)', backgroundColor: '#f9fafb', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#0f172a', fontWeight: '800', fontSize: '24px' }}>Documentações Administrativas</h1>
      <p style={{ color: '#64748b', marginBottom: '30px', fontSize: '14px' }}>Emissão de documentos oficiais da Escola ABC do Park.</p>

      {!documentoAtivo ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
          <div onClick={() => setDocumentoAtivo('matricula')} style={{ backgroundColor: 'white', padding: '30px', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', cursor: 'pointer', textAlign: 'center' }}>
            <span style={{ fontSize: '40px', marginBottom: '15px' }}>📑</span>
            <h3 style={{ color: '#1e293b', fontWeight: '800', fontSize: '16px', margin: 0 }}>Declaração de Matrícula</h3>
            <p style={{ color: '#64748b', fontSize: '12px', marginTop: '8px' }}>Gera o documento padrão com dados do aluno.</p>
          </div>

          <div onClick={() => setDocumentoAtivo('quitacao')} style={{ backgroundColor: 'white', padding: '30px', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', cursor: 'pointer', textAlign: 'center' }}>
            <span style={{ fontSize: '40px', marginBottom: '15px' }}>💰</span>
            <h3 style={{ color: '#1e293b', fontWeight: '800', fontSize: '16px', margin: 0 }}>Quitação Imposto de Renda</h3>
            <p style={{ color: '#64748b', fontSize: '12px', marginTop: '8px' }}>Declaração de valores pagos no ano base.</p>
          </div>

          <div onClick={() => setDocumentoAtivo('ressalva')} style={{ backgroundColor: 'white', padding: '30px', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', cursor: 'pointer', textAlign: 'center' }}>
            <span style={{ fontSize: '40px', marginBottom: '15px' }}>🔄</span>
            <h3 style={{ color: '#1e293b', fontWeight: '800', fontSize: '16px', margin: 0 }}>Ressalva</h3>
            <p style={{ color: '#64748b', fontSize: '12px', marginTop: '8px' }}>Documento de transferência com direito à matrícula.</p>
          </div>

          <div onClick={() => setDocumentoAtivo('codes')} style={{ backgroundColor: 'white', padding: '30px', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', cursor: 'pointer', textAlign: 'center' }}>
            <span style={{ fontSize: '40px', marginBottom: '15px' }}>📋</span>
            <h3 style={{ color: '#1e293b', fontWeight: '800', fontSize: '16px', margin: 0 }}>CODES</h3>
            <p style={{ color: '#64748b', fontSize: '12px', marginTop: '8px' }}>Relatório oficial (1º ao 5º Ano) exigido pela SEDUC.</p>
          </div>

          <div onClick={() => setDocumentoAtivo('notificacao')} style={{ backgroundColor: 'white', padding: '30px', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', cursor: 'pointer', textAlign: 'center' }}>
            <span style={{ fontSize: '40px', marginBottom: '15px' }}>⚖️</span>
            <h3 style={{ color: '#1e293b', fontWeight: '800', fontSize: '16px', margin: 0 }}>Notificação Extrajudicial</h3>
            <p style={{ color: '#64748b', fontSize: '12px', marginTop: '8px' }}>Cobrança formal de débitos em aberto.</p>
          </div>

          {/* NOVO CARD: CRONOGRAMA DE PROVAS */}
          <div onClick={() => setDocumentoAtivo('provas')} style={{ backgroundColor: 'white', padding: '30px', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', cursor: 'pointer', textAlign: 'center' }}>
            <span style={{ fontSize: '40px', marginBottom: '15px' }}>📝</span>
            <h3 style={{ color: '#1e293b', fontWeight: '800', fontSize: '16px', margin: 0 }}>Cronograma de Provas</h3>
            <p style={{ color: '#64748b', fontSize: '12px', marginTop: '8px' }}>Gera PDF e texto para WhatsApp com os conteúdos.</p>
          </div>

        </div>
      ) : (
        <div style={{ animation: 'fadeIn 0.3s' }}>
          <button onClick={() => { setDocumentoAtivo(null); setAlunoSelecionado(null); setResponsavelEscolhido({ nome: "", cpf: "", telefone: "" }); }} style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 'bold', cursor: 'pointer', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            ← Voltar para opções
          </button>

          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', maxWidth: documentoAtivo === 'codes' ? '1200px' : '600px', width: '100%', overflowX: 'auto' }}>
            
            {documentoAtivo === 'codes' ? (
              carregandoCodes ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontWeight: 'bold' }}>
                   A processar boletins e montar matriz curricular...
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', margin: 0 }}>Pré-visualização CODES (SEDUC)</h2>
                    <button onClick={executarGeracaoCodesPdf} style={{ padding: '12px 20px', backgroundColor: '#0f172a', color: 'white', borderRadius: '10px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
                      📄 IMPRIMIR PDF OFICIAL
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '10px' }}>
                    {turmas.map(t => (
                      <button key={t.nome_turma} onClick={() => setAbaTurmaAtiva(t.nome_turma)} style={{ padding: '8px 16px', borderRadius: '8px', border: abaTurmaAtiva === t.nome_turma ? '2px solid #2563eb' : '1px solid #e2e8f0', backgroundColor: abaTurmaAtiva === t.nome_turma ? '#eff6ff' : 'white', fontWeight: 'bold', cursor: 'pointer', color: '#1e293b', whiteSpace: 'nowrap' }}>
                        {t.nome_turma}
                      </button>
                    ))}
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '800px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', color: '#64748b', textAlign: 'left' }}>
                        <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0' }}>Nº</th>
                        <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0' }}>ALUNO</th>
                        <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0', textAlign: 'center' }}>PORT</th>
                        <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0', textAlign: 'center' }}>MAT</th>
                        <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0', textAlign: 'center' }}>CIÊN</th>
                        <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0', textAlign: 'center' }}>HIST</th>
                        <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0', textAlign: 'center' }}>GEO</th>
                        <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0', textAlign: 'center' }}>ARTE</th>
                        <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0', textAlign: 'center' }}>ING</th>
                        <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0', textAlign: 'center' }}>SITUAÇÃO</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alunos.filter(a => a.turma === abaTurmaAtiva).sort((a, b) => a.nome.localeCompare(b.nome)).map((aluno, idx) => {
                        const situacao = calcularSituacaoNaTela(aluno.id, aluno.nome);
                        return (
                          <tr key={aluno.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '12px', color: '#64748b' }}>{(idx + 1).toString().padStart(2, '0')}</td>
                            <td style={{ padding: '12px', fontWeight: 'bold', color: '#1e293b' }}>{aluno.nome.toUpperCase()}</td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>{obterMediaFinalAluno(aluno.id, "portug", "port")}</td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>{obterMediaFinalAluno(aluno.id, "mat")}</td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>{obterMediaFinalAluno(aluno.id, "ciên", "cien")}</td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>{obterMediaFinalAluno(aluno.id, "hist")}</td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>{obterMediaFinalAluno(aluno.id, "geo")}</td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>{obterMediaFinalAluno(aluno.id, "arte")}</td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>{obterMediaFinalAluno(aluno.id, "ing")}</td>
                            <td style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', color: situacao.includes('APROVAD') ? '#16a34a' : situacao.includes('REPROVAD') ? '#dc2626' : '#64748b' }}>{situacao}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            ) : documentoAtivo === 'provas' ? (
              // --- INTERFACE NOVA: CRONOGRAMA DE PROVAS --- //
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', marginBottom: '20px' }}>
                  Gerar Cronograma de Avaliações
                </h2>
                
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px' }}>SELECIONE A TURMA</label>
                <select 
  value={turmaProvas} 
  onChange={(e) => {
    const turmaSelecionada = e.target.value;
    setTurmaProvas(turmaSelecionada);
    
    // Auto-preenche as matérias baseadas na turma selecionada
    if(turmaSelecionada) {
      setListaProvas(obterMateriasPadrao(turmaSelecionada));
    } else {
      setListaProvas([{ materia: "", data: "", conteudo: "" }]);
    }
  }} 
  style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '25px', outline: 'none', fontSize: '14px', color: '#1e293b', backgroundColor: 'white' }}
>
  <option value="">Escolha a turma...</option>
  <option value="Maternal">Maternal</option>
  <option value="Jardim I">Jardim I</option>
  <option value="Jardim II">Jardim II</option>
  <option value="1º Ano">1º Ano</option>
  <option value="2º Ano">2º Ano</option>
  <option value="3º Ano">3º Ano</option>
  <option value="4º Ano">4º Ano</option>
  <option value="5º Ano">5º Ano</option>
</select>


                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px' }}>CONTEÚDO DAS AVALIAÇÕES</label>
                {listaProvas.map((prova, index) => (
                  <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px', backgroundColor: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <input 
                        type="text" 
                        placeholder="Matéria (ex: Língua Portuguesa)" 
                        value={prova.materia} 
                        onChange={(e) => {
                          const novas = [...listaProvas];
                          novas[index].materia = e.target.value;
                          setListaProvas(novas);
                        }}
                        style={{ flex: 1, minWidth: '150px', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                      />
                      <input 
                        type="text" 
                        placeholder="Data (ex: 15/06/2026)" 
                        value={prova.data} 
                        onChange={(e) => handleDataChange(e.target.value, (val) => {
                          const novas = [...listaProvas];
                          novas[index].data = val;
                          setListaProvas(novas);
                        })}
                        maxLength={10}
                        style={{ flex: 1, minWidth: '150px', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                      />
                    </div>
                    <textarea 
                      placeholder="Descreva os conteúdos que cairão na prova..." 
                      value={prova.conteudo} 
                      onChange={(e) => {
                        const novas = [...listaProvas];
                        novas[index].conteudo = e.target.value;
                        setListaProvas(novas);
                      }}
                      rows={3} 
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', resize: 'vertical', fontFamily: 'inherit', outline: 'none' }}
                    />
                    <button 
                      type="button" 
                      onClick={() => setListaProvas(listaProvas.filter((_, i) => i !== index))}
                      style={{ alignSelf: 'flex-end', padding: '8px 15px', backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
                    >
                      Remover
                    </button>
                  </div>
                ))}

                <button 
                  type="button" 
                  onClick={() => setListaProvas([...listaProvas, { materia: "", data: "", conteudo: "" }])} 
                  style={{ width: '100%', padding: '12px', backgroundColor: '#f1f5f9', border: '1px dashed #94a3b8', borderRadius: '12px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', color: '#475569', marginBottom: '25px' }}
                >
                  + Adicionar Outra Matéria
                </button>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button 
                    onClick={async () => {
                      if(!turmaProvas) return alert('Por favor, selecione a turma antes de gerar o documento.');
                      await gerarPDFCronogramaProvas(turmaProvas, listaProvas);
                    }} 
                    style={{ width: '100%', padding: '16px', backgroundColor: '#2563eb', color: 'white', borderRadius: '14px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
                  >
                    BAIXAR CRONOGRAMA EM PDF
                  </button>
                  
                  <button 
                    onClick={() => {
                      if(!turmaProvas) return alert('Por favor, selecione a turma antes de gerar a mensagem.');
                      const txt = gerarTextoWhatsAppProvas(turmaProvas, listaProvas);
                      navigator.clipboard.writeText(txt);
                      alert('Mensagem formatada copiada com sucesso! Vá no WhatsApp e aperte Colar.');
                    }} 
                    style={{ width: '100%', padding: '16px', backgroundColor: '#22c55e', color: 'white', borderRadius: '14px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
                  >
                    COPIAR TEXTO PARA WHATSAPP 📱
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', marginBottom: '20px' }}>
                  {documentoAtivo === 'matricula' && 'Gerar Declaração de Matrícula'}
                  {documentoAtivo === 'quitacao' && 'Gerar Quitação de Imposto de Renda'}
                  {documentoAtivo === 'ressalva' && 'Gerar Ressalva'}
                  {documentoAtivo === 'notificacao' && 'Gerar Notificação Extrajudicial'}
                </h2>
                
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>1. Selecione o Aluno</label>
                <select 
                  value={alunoSelecionado?.id || ""}
                  onChange={(e) => {
                    const id = e.target.value;
                    const selecionado = alunos.find(a => String(a.id) === String(id));
                    setAlunoSelecionado(selecionado || null);
                    setResponsavelEscolhido({ nome: "", cpf: "", telefone: "" });
                  }}
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px', outline: 'none', fontSize: '14px', color: '#1e293b' }}
                >
                  <option value="">Escolha um aluno na lista...</option>
                  {alunos.map(aluno => (
                    <option key={aluno.id} value={aluno.id}>{aluno.nome}</option>
                  ))}
                </select>

                {alunoSelecionado && (
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                    
                    {documentoAtivo === 'quitacao' && (
                      <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px' }}>ANO BASE</label>
                          <input type="text" value={anoBase} onChange={(e) => setAnoBase(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', color: '#1e293b' }} />
                        </div>
                        <div style={{ display: 'flex', gap: '15px' }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px' }}>MENSALIDADE (R$)</label>
                            <input type="text" value={valorMensalidade} onChange={(e) => setValorMensalidade(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', color: '#1e293b' }} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px' }}>MESES PAGOS</label>
                            <input type="text" value={mesesPagos} onChange={(e) => setMesesPagos(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', color: '#1e293b' }} />
                          </div>
                        </div>
                      </div>
                    )}

                    {documentoAtivo === 'notificacao' && (
                      <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                          <div style={{ flex: 1, minWidth: '200px' }}>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px' }}>DATA DE REFERÊNCIA</label>
                            <input type="text" placeholder="Ex: 28/03/2023" value={dataReferencia} onChange={(e) => handleDataChange(e.target.value, setDataReferencia)} maxLength={10} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', color: '#1e293b' }} />
                          </div>
                          <div style={{ flex: 1, minWidth: '200px' }}>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px' }}>VALOR JÁ PAGO (R$)</label>
                            <input type="text" placeholder="Ex: 50,00" value={valorPagoNotificacao} onChange={(e) => handleMoedaChange(e.target.value, setValorPagoNotificacao)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', color: '#1e293b' }} />
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                          <div style={{ flex: 1, minWidth: '200px' }}>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px' }}>MULTA / JUROS (R$)</label>
                            <input type="text" placeholder="Ex: 10,00" value={multaNotificacao} onChange={(e) => handleMoedaChange(e.target.value, setMultaNotificacao)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', color: '#1e293b' }} />
                          </div>
                          <div style={{ flex: 1, minWidth: '200px' }}>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px' }}>DESCONTO (R$)</label>
                            <input type="text" placeholder="Ex: 5,00" value={descontoNotificacao} onChange={(e) => handleMoedaChange(e.target.value, setDescontoNotificacao)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', color: '#1e293b' }} />
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                          <div style={{ flex: 1, minWidth: '200px' }}>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px' }}>PRAZO PARA PAGAMENTO</label>
                            <input type="text" placeholder="Ex: 15 (quinze)" value={prazoDias} onChange={(e) => setPrazoDias(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', color: '#1e293b' }} />
                          </div>
                          <div style={{ flex: 1, minWidth: '200px' }}>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px' }}>LOCAL E DATA DA EMISSÃO</label>
                            <input type="text" value={cidadeData} onChange={(e) => setCidadeData(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', color: '#1e293b' }} />
                          </div>
                        </div>

                        <div style={{ marginTop: '10px' }}>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px' }}>ITENS DEVIDOS</label>
                          {itensNotificacao.map((item, index) => (
                            <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                              <input 
                                type="text" 
                                placeholder="Descrição (ex: Mensalidade Maio)" 
                                value={item.descricao} 
                                onChange={(e) => {
                                  const newItens = [...itensNotificacao];
                                  newItens[index].descricao = e.target.value;
                                  setItensNotificacao(newItens);
                                }}
                                style={{ flex: 2, padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', color: '#1e293b' }}
                              />
                              <input 
                                type="text" 
                                placeholder="Valor (R$)" 
                                value={item.valor} 
                                onChange={(e) => {
                                  const newItens = [...itensNotificacao];
                                  handleMoedaChange(e.target.value, (val) => {
                                      newItens[index].valor = val;
                                      setItensNotificacao(newItens);
                                  });
                                }}
                                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', color: '#1e293b' }}
                              />
                              <button 
                                type="button" 
                                onClick={() => {
                                  const newItens = itensNotificacao.filter((_, i) => i !== index);
                                  setItensNotificacao(newItens);
                                }} 
                                style={{ padding: '0 15px', backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }}
                              >
                                X
                              </button>
                            </div>
                          ))}
                          <button 
                            type="button" 
                            onClick={() => setItensNotificacao([...itensNotificacao, { descricao: "", valor: "" }])} 
                            style={{ padding: '8px 12px', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', color: '#475569' }}
                          >
                            + Adicionar Item
                          </button>
                        </div>
                      </div>
                    )}

                    {(documentoAtivo === 'matricula' || documentoAtivo === 'ressalva') && (
                      <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '12px', textTransform: 'uppercase' }}>2. Qual o sexo do aluno?</label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button type="button" onClick={() => setSexoAluno("M")} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: sexoAluno === "M" ? '2px solid #2563eb' : '1px solid #e2e8f0', backgroundColor: sexoAluno === "M" ? '#eff6ff' : 'white', fontWeight: 'bold', cursor: 'pointer', color: '#1e293b' }}>Masculino</button>
                          <button type="button" onClick={() => setSexoAluno("F")} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: sexoAluno === "F" ? '2px solid #2563eb' : '1px solid #e2e8f0', backgroundColor: sexoAluno === "F" ? '#eff6ff' : 'white', fontWeight: 'bold', cursor: 'pointer', color: '#1e293b' }}>Feminino</button>
                        </div>
                      </div>
                    )}

                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '12px', textTransform: 'uppercase' }}>
                      {documentoAtivo === 'notificacao' ? '2. Qual responsável será notificado?' : '3. Qual responsável assinará?'}
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {[1, 2].map((tipo) => {
                        const nome = tipo === 1 ? alunoSelecionado.responsavel : (alunoSelecionado.responsavel2 || alunoSelecionado.responsavel_2_nome);
                        if (!nome) return null;
                        const isSelected = responsavelEscolhido.nome === nome;
                        return (
                          <button key={tipo} type="button" onClick={() => selecionarResponsavel(alunoSelecionado, tipo)} style={{ textAlign: 'left', padding: '15px', borderRadius: '12px', border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0', backgroundColor: isSelected ? '#eff6ff' : 'white', cursor: 'pointer' }}>
                            <span style={{ fontWeight: 'bold', display: 'block', color: '#1e293b', fontSize: '14px' }}>{nome}</span>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>{tipo === 1 ? (alunoSelecionado.parentesco_1 || "Principal") : (alunoSelecionado.parentesco_2 || "Responsável 2")}</span>
                          </button>
                        );
                      })}
                    </div>

                    {responsavelEscolhido.nome && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '30px' }}>
                        <button 
                          type="button"
                          onClick={() => {
                            if(documentoAtivo === 'matricula') gerarPDFMatricula(alunoSelecionado, responsavelEscolhido, sexoAluno);
                            else if(documentoAtivo === 'quitacao') {
                              const vMensalidade = parseFloat(valorMensalidade.replace(/\./g, '').replace(',', '.'));
                              gerarPDFImpostoRenda(alunoSelecionado, responsavelEscolhido, vMensalidade, parseInt(mesesPagos), anoBase);
                            } else if(documentoAtivo === 'ressalva') {
                              gerarPDFRessalva(alunoSelecionado, sexoAluno);
                            } else if(documentoAtivo === 'notificacao') {
                              executarGeracaoNotificacao();
                            }
                          }}
                          style={{ width: '100%', padding: '16px', backgroundColor: '#2563eb', color: 'white', borderRadius: '14px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
                        >
                          GERAR PDF AGORA
                        </button>
                        
                        <button 
                          type="button"
                          onClick={() => {
                            if(documentoAtivo === 'matricula') gerarPDFMatricula(alunoSelecionado, responsavelEscolhido, sexoAluno);
                            else if(documentoAtivo === 'quitacao') {
                              const vMensalidade = parseFloat(valorMensalidade.replace(/\./g, '').replace(',', '.'));
                              gerarPDFImpostoRenda(alunoSelecionado, responsavelEscolhido, vMensalidade, parseInt(mesesPagos), anoBase);
                            } else if(documentoAtivo === 'ressalva') {
                              gerarPDFRessalva(alunoSelecionado, sexoAluno);
                            } else if(documentoAtivo === 'notificacao') {
                              executarGeracaoNotificacao();
                            }
                            enviarWhatsApp(alunoSelecionado, responsavelEscolhido);
                          }}
                          style={{ width: '100%', padding: '16px', backgroundColor: '#22c55e', color: 'white', borderRadius: '14px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
                        >
                          ENVIAR VIA WHATSAPP 📱
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}