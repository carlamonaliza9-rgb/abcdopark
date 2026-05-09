"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { jsPDF } from "jspdf";

export default function DocumentacoesPage() {
  const [alunos, setAlunos] = useState<any[]>([]);
  const [alunoSelecionado, setAlunoSelecionado] = useState<any>(null);
  const [responsavelEscolhido, setResponsavelEscolhido] = useState({ nome: "", cpf: "" });
  const [documentoAtivo, setDocumentoAtivo] = useState<string | null>(null);

  useEffect(() => {
    buscarAlunos();
  }, []);

  async function buscarAlunos() {
    const { data } = await supabase.from("alunos").select("*").order("nome");
    if (data) setAlunos(data);
  }

  const selecionarResponsavel = (aluno: any, tipo: number) => {
    if (tipo === 1) {
      setResponsavelEscolhido({ 
        nome: aluno.responsavel || "", 
        cpf: aluno.cpf_responsavel || "" 
      });
    } else if (tipo === 2) {
      setResponsavelEscolhido({ 
        nome: aluno.responsavel2 || aluno.responsavel_2_nome || "", 
        cpf: aluno.cpf_responsavel2 || aluno.cpf_responsavel_2 || "" 
      });
    } else {
      setResponsavelEscolhido({ 
        nome: aluno.responsavel3 || aluno.responsavel_3_nome || "", 
        cpf: aluno.responsavel_3_contato || "" 
      });
    }
  };

  const gerarPDF = async (aluno: any, resp: any) => {
    const doc = new jsPDF();
    const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

    // 1. Cabeçalho e Logo do Supabase
    try {
      const logoUrl = "https://mnmakhazghgncqummksu.supabase.co/storage/v1/object/public/assets/logo.png";
      doc.addImage(logoUrl, "PNG", 20, 10, 35, 35); 
    } catch (e) {
      console.error("Erro ao carregar a logo do Supabase");
    }

    // 2. Informações Institucionais (Lado direito da logo)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("ESCOLA ABC DO PARK", 60, 20);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("CNPJ 05.067.797-68", 60, 26);
    doc.text("CONJ PARKLANDIA - QUADRA A CASA 02", 60, 31);
    doc.text("TELEFONE (91) 3268-3484 / (91) 98622-7715", 60, 36);
    doc.text("INEP - 15159213", 60, 41);

    // Linha divisória
    doc.setLineWidth(0.5);
    doc.line(20, 50, 190, 50);

    // 3. Título do Documento
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("DECLARAÇÃO DE MATRÍCULA", 105, 70, { align: "center" });

    // 4. Texto da Declaração
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    
    const texto = `Declaramos para os devidos fins de direito que ${resp.nome}, portador(a) do CPF de número ${resp.cpf} é o(a) responsável legal de ${aluno.nome}.

O aluno encontra-se regularmente matriculado neste Estabelecimento de Ensino no ano de 2026 na turma do ${aluno.turma} do Ensino Infantil no turno da manhã.

É um aluno assíduo e participativo.

Colocamo-nos à disposição para quaisquer esclarecimentos.`;

    const textoLinhas = doc.splitTextToSize(texto, 170);
    doc.text(textoLinhas, 20, 90);

    // 5. Local e Data
    doc.text(`Belém, ${hoje}.`, 20, 160);

    // 6. Assinatura e Carimbo
    doc.setFont("helvetica", "bold");
    doc.text("Atenciosamente,", 20, 185);
    
    try {
        doc.addImage("/icon.jpg", "JPEG", 75, 195, 60, 30);
    } catch (e) {}

    doc.text("__________________________________________", 105, 220, { align: "center" });
    doc.text("Suellen C. S. Figueiredo", 105, 226, { align: "center" });
    doc.setFontSize(10);
    doc.text("DIRETORA", 105, 231, { align: "center" });
    doc.text("REG. 6235", 105, 236, { align: "center" });

    doc.save(`Declaracao_${aluno.nome.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div style={{ padding: 'clamp(15px, 5vw, 30px)', backgroundColor: '#f9fafb', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#0f172a', fontWeight: '800', fontSize: '24px' }}>Documentações</h1>
      <p style={{ color: '#64748b', marginBottom: '30px', fontSize: '14px' }}>Selecione o documento que deseja gerar para a Escola ABC do Park.</p>

      {!documentoAtivo ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
          <div 
            onClick={() => setDocumentoAtivo('matricula')}
            style={{ backgroundColor: 'white', padding: '30px', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', cursor: 'pointer', border: '2px solid transparent', transition: '0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}
            onMouseOver={(e) => e.currentTarget.style.borderColor = '#2563eb'}
            onMouseOut={(e) => e.currentTarget.style.borderColor = 'transparent'}
          >
            <span style={{ fontSize: '40px', marginBottom: '15px' }}>📑</span>
            <h3 style={{ color: '#1e293b', fontWeight: '800', fontSize: '16px', margin: 0 }}>Declaração de Matrícula</h3>
            <p style={{ color: '#64748b', fontSize: '12px', marginTop: '8px' }}>Gera o documento padrão com dados do aluno e responsável.</p>
          </div>
        </div>
      ) : (
        <div style={{ animation: 'fadeIn 0.3s' }}>
          <button 
            onClick={() => { setDocumentoAtivo(null); setAlunoSelecionado(null); setResponsavelEscolhido({ nome: "", cpf: "" }); }}
            style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 'bold', cursor: 'pointer', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '5px' }}
          >
            ← Voltar para opções
          </button>

          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', maxWidth: '600px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', marginBottom: '20px' }}>Gerar Declaração de Matrícula</h2>
            
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>1. Selecione o Aluno</label>
            <select 
              value={alunoSelecionado?.id || ""}
              onChange={(e) => {
                const id = e.target.value;
                const selecionado = alunos.find(a => String(a.id) === String(id));
                setAlunoSelecionado(selecionado || null);
                setResponsavelEscolhido({ nome: "", cpf: "" });
              }}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px', outline: 'none', fontSize: '14px' }}
            >
              <option value="">Escolha um aluno na lista...</option>
              {alunos.map(aluno => (
                <option key={aluno.id} value={aluno.id}>{aluno.nome}</option>
              ))}
            </select>

            {alunoSelecionado && (
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '12px', textTransform: 'uppercase' }}>2. Qual responsável assinará o documento?</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  
                  {alunoSelecionado.responsavel && (
                    <button 
                      type="button"
                      onClick={() => selecionarResponsavel(alunoSelecionado, 1)}
                      style={{ textAlign: 'left', padding: '15px', borderRadius: '12px', border: responsavelEscolhido.nome === alunoSelecionado.responsavel ? '2px solid #2563eb' : '1px solid #e2e8f0', backgroundColor: responsavelEscolhido.nome === alunoSelecionado.responsavel ? '#eff6ff' : 'white', cursor: 'pointer' }}
                    >
                      <span style={{ fontWeight: 'bold', display: 'block', color: '#1e293b', fontSize: '14px' }}>{alunoSelecionado.responsavel}</span>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>{alunoSelecionado.parentesco_1 || alunoSelecionado.parentesco1 || "Responsável Principal"}</span>
                    </button>
                  )}

                  {(alunoSelecionado.responsavel2 || alunoSelecionado.responsavel_2_nome) && (
                    <button 
                      type="button"
                      onClick={() => selecionarResponsavel(alunoSelecionado, 2)}
                      style={{ textAlign: 'left', padding: '15px', borderRadius: '12px', border: responsavelEscolhido.nome === (alunoSelecionado.responsavel2 || alunoSelecionado.responsavel_2_nome) ? '2px solid #2563eb' : '1px solid #e2e8f0', backgroundColor: responsavelEscolhido.nome === (alunoSelecionado.responsavel2 || alunoSelecionado.responsavel_2_nome) ? '#eff6ff' : 'white', cursor: 'pointer' }}
                    >
                      <span style={{ fontWeight: 'bold', display: 'block', color: '#1e293b', fontSize: '14px' }}>{alunoSelecionado.responsavel2 || alunoSelecionado.responsavel_2_nome}</span>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>{alunoSelecionado.parentesco_2 || alunoSelecionado.parentesco2 || "Responsável 2"}</span>
                    </button>
                  )}
                </div>

                {responsavelEscolhido.nome && (
                  <button 
                    type="button"
                    onClick={() => gerarPDF(alunoSelecionado, responsavelEscolhido)}
                    style={{ width: '100%', marginTop: '30px', padding: '16px', backgroundColor: '#2563eb', color: 'white', borderRadius: '14px', fontWeight: 'bold', border: 'none', cursor: 'pointer', fontSize: '14px' }}
                  >
                    GERAR PDF AGORA
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}