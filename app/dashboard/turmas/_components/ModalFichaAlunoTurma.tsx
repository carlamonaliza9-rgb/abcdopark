"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

interface ModalFichaAlunoTurmaProps {
  aluno: any;
  onClose: () => void;
  historico?: any[];
  ehAdmin: boolean;
  calcularIdade: (data: string) => string;
}

export function ModalFichaAlunoTurma({ aluno, onClose, ehAdmin, calcularIdade }: ModalFichaAlunoTurmaProps) {
  const [gerandoPDF, setGerandoPDF] = useState(false);

  if (!aluno) return null;

  const abrirWhatsApp = (numero: any) => {
    if (!numero) return;
    const apenasNumeros = String(numero).replace(/\D/g, '');
    window.open(`https://wa.me/55${apenasNumeros}`, '_blank');
  };

  const contatos = [
    { nome: aluno.responsavel, whats: aluno.whatsapp, tag: aluno.parentesco_1 || "Mãe", cor: "#db2777", bg: "#fdf2f8" },
    { nome: aluno.responsavel2 || aluno.responsavel_2_nome, whats: aluno.whatsapp2 || aluno.responsavel_2_contato, tag: aluno.parentesco_2 || "Pai", cor: "#2563eb", bg: "#eff6ff" },
    { nome: aluno.responsavel3 || aluno.responsavel_3_nome, whats: aluno.whatsapp3 || aluno.responsavel_3_contato, tag: aluno.parentesco_3 || "Outro", cor: "#16a34a", bg: "#f0fdf4" }
  ];

  const gerarBoletimPDF = async () => {
    setGerandoPDF(true);
    try {
      const { data: notas, error } = await supabase
        .from('boletins')
        .select('*')
        .eq('aluno_id', aluno.id)
        .eq('ano', '2026');

      if (error) throw error;

      const janelaImpressao = window.open('', '_blank');
      if (!janelaImpressao) return;

      const conteudoBoletim = `
        <html>
          <head>
            <title>Boletim Escolar - ${aluno.nome}</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
              
              body { 
                font-family: 'Inter', sans-serif; 
                padding: 40px; 
                color: #1e293b; 
                position: relative;
                min-height: 100vh;
              }

              /* MARCA D'ÁGUA EM ESCALA DE CINZA */
              .marca-dagua {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 500px;
                opacity: 0.05;
                filter: grayscale(100%);
                z-index: -1;
              }

              .cabecalho { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; position: relative; }
              .logo-topo { width: 100px; margin-bottom: 10px; }
              .escola-nome { font-size: 24px; font-weight: 900; color: #1e3a8a; margin: 0; }
              .escola-info { font-size: 12px; color: #64748b; margin: 5px 0; }
              
              .titulo-documento { font-size: 18px; font-weight: 800; background: #f1f5f9; padding: 10px; border-radius: 8px; margin: 20px 0; text-transform: uppercase; letter-spacing: 1px; border: 1px solid #e2e8f0; }
              
              .dados-container { 
                display: grid; 
                grid-template-columns: 1fr 1fr; 
                gap: 15px; 
                margin-bottom: 30px; 
                background: rgba(255,255,255,0.8);
                padding: 15px;
                border-radius: 12px;
              }
              
              .dado-item { border-bottom: 1px solid #f1f5f9; padding-bottom: 5px; }
              .label { font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 2px; }
              .valor { font-size: 13px; font-weight: 700; color: #1e293b; }

              table { width: 100%; border-collapse: collapse; margin-top: 20px; background: rgba(255,255,255,0.9); }
              th { background-color: #1e3a8a; color: white; padding: 12px; font-size: 11px; text-transform: uppercase; border: 1px solid #1e3a8a; }
              td { padding: 10px; border: 1px solid #e2e8f0; text-align: center; font-size: 12px; font-weight: 700; }
              .disciplina-nome { text-align: left; font-weight: 800; background-color: #f8fafc; padding-left: 15px; }
              .nota-baixa { color: #dc2626; }

              .assinaturas { margin-top: 60px; display: grid; grid-template-columns: 1fr 1fr; gap: 60px; }
              .campo-assinatura { border-top: 1px solid #1e293b; text-align: center; padding-top: 10px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
              
              @media print {
                body { padding: 0; }
                .marca-dagua { -webkit-print-color-adjust: exact; }
              }
            </style>
          </head>
          <body>
            <img src="https://mnmakhazghgncqummksu.supabase.co/storage/v1/object/public/assets/logo.png" class="marca-dagua">

            <div class="cabecalho">
              <img src="https://mnmakhazghgncqummksu.supabase.co/storage/v1/object/public/assets/logo.png" class="logo-topo">
              <h1 class="escola-nome">ABC DO PARK</h1>
              <p class="escola-info">Educação Infantil e Ensino Fundamental • Belém - Pará</p>
            </div>

            <center><div class="titulo-documento">Boletim de Desempenho Escolar - 2026</div></center>

            <div class="dados-container">
              <div class="dado-item">
                <div class="label">Estudante</div>
                <div class="valor">${aluno.nome}</div>
              </div>
              <div class="dado-item">
                <div class="label">Turma Atual</div>
                <div class="valor">${aluno.turma}</div>
              </div>
              <div class="dado-item">
                <div class="label">Responsável</div>
                <div class="valor">${aluno.responsavel || 'Não informado'}</div>
              </div>
              <div class="dado-item">
                <div class="label">Idade / Nascimento</div>
                <div class="valor">${calcularIdade(aluno.data_nascimento)} (${new Date(aluno.data_nascimento).toLocaleDateString('pt-BR', {timeZone: 'UTC'})})</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width: 35%;">Componente Curricular</th>
                  <th>1º Bim</th>
                  <th>2º Bim</th>
                  <th>Rec 1</th>
                  <th>3º Bim</th>
                  <th>4º Bim</th>
                  <th>Rec 2</th>
                </tr>
              </thead>
              <tbody>
                ${notas?.map(n => `
                  <tr>
                    <td class="disciplina-nome">${n.disciplina}</td>
                    <td class="${n.bimestre1 < 7 && n.bimestre1 !== null ? 'nota-baixa' : ''}">${n.bimestre1 ?? '-'}</td>
                    <td class="${n.bimestre2 < 7 && n.bimestre2 !== null ? 'nota-baixa' : ''}">${n.bimestre2 ?? '-'}</td>
                    <td class="${n.recuperacao1 < 7 && n.recuperacao1 !== null ? 'nota-baixa' : ''}">${n.recuperacao1 ?? '-'}</td>
                    <td class="${n.bimestre3 < 7 && n.bimestre3 !== null ? 'nota-baixa' : ''}">${n.bimestre3 ?? '-'}</td>
                    <td class="${n.bimestre4 < 7 && n.bimestre4 !== null ? 'nota-baixa' : ''}">${n.bimestre4 ?? '-'}</td>
                    <td class="${n.recuperacao2 < 7 && n.recuperacao2 !== null ? 'nota-baixa' : ''}">${n.recuperacao2 ?? '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="assinaturas">
              <div class="campo-assinatura">Assinatura do Docente</div>
              <div class="campo-assinatura">Coordenação Pedagógica</div>
            </div>

            <div style="position: absolute; bottom: 20px; width: 100%; text-align: center; font-size: 9px; color: #94a3b8; font-weight: bold;">
              Documento emitido em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')} • ABC DO PARK Gestão
            </div>

            <script>
              window.onload = () => {
                setTimeout(() => { window.print(); }, 500);
              };
            </script>
          </body>
        </html>
      `;

      janelaImpressao.document.write(conteudoBoletim);
      janelaImpressao.document.close();
    } catch (err: any) {
      alert("Erro ao carregar boletim: " + err.message);
    } finally {
      setGerandoPDF(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, backdropFilter: 'blur(8px)' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '30px', width: '95%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto', padding: '30px', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 20, right: 20, border: 'none', background: '#f1f5f9', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer' }}>✕</button>
        
        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            {aluno.foto_url ? (
              <img src={aluno.foto_url} style={{ width: '150px', height: '150px', borderRadius: '50%', objectFit: 'cover', border: '4px solid #fff', boxShadow: '0 6px 15px rgba(0,0,0,0.15)' }} alt="Foto" />
            ) : (
              <div style={{ width: '150px', height: '150px', borderRadius: '50%', backgroundColor: '#f1f5f9', margin: '0 auto', fontSize: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                👤
              </div>
            )}
            
            {aluno.e_autista && (
               <span style={{ position: 'absolute', bottom: 10, right: 5, fontSize: '32px', backgroundColor: 'white', borderRadius: '50%', padding: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                  🧩
               </span>
            )}
          </div>

          <h2 style={{ margin: '15px 0 5px', fontSize: '24px', fontWeight: '900', color: '#1e293b' }}>{aluno.nome}</h2>
          
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center', marginTop: '5px' }}>
            <span style={{ fontSize: '15px', color: '#64748b', fontWeight: 'bold' }}>{calcularIdade(aluno.data_nascimento)}</span>
            <span style={{ color: '#cbd5e1' }}>•</span>
            <span style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '4px 12px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold' }}>{aluno.turma}</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px' }}>
          <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '15px', border: '1px solid #f1f5f9' }}>
            <small style={{ color: '#94a3b8', fontWeight: 'bold', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Data de Nascimento</small>
            <p style={{ margin: 0, fontWeight: 'bold', fontSize: '14px', color: '#475569' }}>
              {aluno.data_nascimento ? new Date(aluno.data_nascimento).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : '--'}
            </p>
          </div>

          {ehAdmin && (
            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '15px', border: '1px solid #f1f5f9' }}>
              <small style={{ color: '#94a3b8', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>DOCUMENTO (CPF)</small>
              <p style={{ margin: 0, fontWeight: 'bold', fontSize: '14px' }}>{aluno.cpf_aluno || '--'}</p>
            </div>
          )}
        </div>

        <div style={{ backgroundColor: '#f8fafc', padding: '15px', borderRadius: '15px', border: '1px solid #f1f5f9', marginTop: '15px' }}>
          <p style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'bold', margin: '0 0 12px', textTransform: 'uppercase' }}>Contatos de Emergência</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {contatos.map((contato, index) => contato.nome && (
              <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '9px', fontWeight: '800', color: contato.cor, backgroundColor: contato.bg, padding: '1px 6px', borderRadius: '4px', alignSelf: 'flex-start', textTransform: 'uppercase' }}>
                    {contato.tag}
                  </span>
                  <p style={{ margin: 0, fontWeight: '700', color: '#475569', fontSize: '13px' }}>{contato.nome}</p>
                </div>
                {contato.whats && (
                  <button onClick={() => abrirWhatsApp(contato.whats)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px', opacity: 0.8 }}>
                    <span style={{ fontSize: '20px' }}>📱</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: '#fffbeb', padding: '15px', borderRadius: '15px', marginTop: '15px', border: '1px solid #fef3c7' }}>
          <p style={{ margin: 0, color: '#b45309', fontWeight: 'bold', fontSize: '11px', marginBottom: '5px', textTransform: 'uppercase' }}>📝 Observações da Ficha</p>
          <p style={{ margin: 0, color: '#92400e', fontSize: '14px', fontWeight: '600', lineHeight: '1.4' }}>
            {aluno.observacoes || "Nenhuma observação cadastrada."}
          </p>
        </div>

        {aluno.tem_alergia && (
          <div style={{ background: '#fef2f2', padding: '15px', borderRadius: '15px', marginTop: '15px', border: '1px solid #fecaca' }}>
            <p style={{ margin: 0, color: '#dc2626', fontWeight: 'bold', fontSize: '11px', marginBottom: '5px', textTransform: 'uppercase' }}>⚠️ Alergia / Restrição</p>
            <p style={{ margin: 0, color: '#991b1b', fontSize: '14px', fontWeight: '600' }}>{aluno.alergia_descricao || "Sim"}</p>
          </div>
        )}

        <div style={{ marginTop: '30px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button 
            onClick={gerarBoletimPDF} 
            disabled={gerandoPDF}
            style={{ 
              width: '100%', 
              padding: '16px', 
              borderRadius: '15px', 
              border: '2px solid #1e3a8a', 
              backgroundColor: 'white', 
              color: '#1e3a8a', 
              fontWeight: 'bold', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}
          >
            {gerandoPDF ? "GERANDO..." : "🎓 IMPRIMIR BOLETIM"}
          </button>

          <button onClick={onClose} style={{ width: '100%', padding: '16px', borderRadius: '15px', border: 'none', backgroundColor: '#1e3a8a', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
            FECHAR FICHA
          </button>
        </div>
      </div>
    </div>
  );
}