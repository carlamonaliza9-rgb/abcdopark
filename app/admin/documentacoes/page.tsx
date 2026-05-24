"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

// Importação das bibliotecas da pasta original
import { gerarPDFMatricula } from "@/app/dashboard/documentacoes/_lib/geradorMatricula";
import { gerarPDFImpostoRenda } from "@/app/dashboard/documentacoes/_lib/geradorImpostoRenda";
import { gerarPDFRessalva } from "@/app/dashboard/documentacoes/_lib/geradorRessalva";
import { gerarDocumentoCodes } from "@/app/dashboard/documentacoes/_lib/geradorCodes"; // NOVA IMPORTAÇÃO CODES

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

  // --- NOVOS ESTADOS PARA O CODES ---
  const [turmas, setTurmas] = useState<any[]>([]);
  const [boletins, setBoletins] = useState<any[]>([]);
  const [abaTurmaAtiva, setAbaTurmaAtiva] = useState<string>("");

  // --- TRAVA DE SEGURANÇA ---
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

      await buscarDados();
      setVerificandoAcesso(false);
    }
    verificarAcesso();
  }, [router]);

  async function buscarDados() {
    const [resAlunos, resTurmas, resBoletins] = await Promise.all([
      supabase.from("alunos").select("*").order("nome"),
      supabase.from("turmas_info").select("*"),
      supabase.from("boletins").select("*")
    ]);
    
    if (resAlunos.data) setAlunos(resAlunos.data);
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
  }

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
    
    const mensagem = `Olá! Aqui é da *Escola ABC do Park*. Segue a ${nomeDoc} de *${aluno.nome}*. Por favor, salve o arquivo PDF que acabei de gerar para você.`;
    
    const url = `https://wa.me/55${numeroLimpo}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, "_blank");
  };

  // --- LÓGICA AUXILIAR DO CODES ---
  const executarGeracaoCodesPdf = async () => {
    const doc = await gerarDocumentoCodes(turmas, alunos, boletins);
    if (doc) {
      const pdfUrl = doc.output('bloburl');
      window.open(pdfUrl, '_blank');
    }
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

  if (verificandoAcesso) return <div style={{ padding: '50px', textAlign: 'center' }}>Validando credenciais...</div>;

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

          {/* NOVA OPÇÃO CODES ADICIONADA */}
          <div onClick={() => setDocumentoAtivo('codes')} style={{ backgroundColor: 'white', padding: '30px', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', cursor: 'pointer', textAlign: 'center' }}>
            <span style={{ fontSize: '40px', marginBottom: '15px' }}>📋</span>
            <h3 style={{ color: '#1e293b', fontWeight: '800', fontSize: '16px', margin: 0 }}>CODES</h3>
            <p style={{ color: '#64748b', fontSize: '12px', marginTop: '8px' }}>Relatório oficial (1º ao 5º Ano) exigido pela SEDUC.</p>
          </div>
        </div>
      ) : (
        <div style={{ animation: 'fadeIn 0.3s' }}>
          <button onClick={() => { setDocumentoAtivo(null); setAlunoSelecionado(null); setResponsavelEscolhido({ nome: "", cpf: "", telefone: "" }); }} style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 'bold', cursor: 'pointer', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            ← Voltar para opções
          </button>

          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', maxWidth: documentoAtivo === 'codes' ? '1200px' : '600px', width: '100%', overflowX: 'auto' }}>
            
            {/* LÓGICA DE EXIBIÇÃO: SE FOR CODES, MOSTRA PREVIEW, SE NÃO FOR, MOSTRA SELECT DO ALUNO */}
            {documentoAtivo === 'codes' ? (
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
            ) : (
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', marginBottom: '20px' }}>
                  {documentoAtivo === 'matricula' && 'Gerar Declaração de Matrícula'}
                  {documentoAtivo === 'quitacao' && 'Gerar Quitação de Imposto de Renda'}
                  {documentoAtivo === 'ressalva' && 'Gerar Ressalva'}
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
                      3. Qual responsável assinará?
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