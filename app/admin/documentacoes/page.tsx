"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

// Importação das bibliotecas da pasta original
import { gerarPDFMatricula } from "@/app/dashboard/documentacoes/_lib/geradorMatricula";
import { gerarPDFImpostoRenda } from "@/app/dashboard/documentacoes/_lib/geradorImpostoRenda";
import { gerarPDFRessalva } from "@/app/dashboard/documentacoes/_lib/geradorRessalva";

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

      await buscarAlunos();
      setVerificandoAcesso(false);
    }
    verificarAcesso();
  }, [router]);

  async function buscarAlunos() {
    const { data } = await supabase.from("alunos").select("*").order("nome");
    if (data) setAlunos(data);
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
        </div>
      ) : (
        <div style={{ animation: 'fadeIn 0.3s' }}>
          <button onClick={() => { setDocumentoAtivo(null); setAlunoSelecionado(null); setResponsavelEscolhido({ nome: "", cpf: "", telefone: "" }); }} style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 'bold', cursor: 'pointer', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            ← Voltar para opções
          </button>

          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', maxWidth: '600px' }}>
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
        </div>
      )}
    </div>
  );
}