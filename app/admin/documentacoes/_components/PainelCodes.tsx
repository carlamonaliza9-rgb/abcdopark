"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { gerarDocumentoCodes } from "@/app/dashboard/documentacoes/_lib/geradorCodes";

interface PainelCodesProps {
  alunos: any[];
}

export default function PainelCodes({ alunos }: PainelCodesProps) {
  const [turmas, setTurmas] = useState<any[]>([]);
  const [boletins, setBoletins] = useState<any[]>([]);
  const [abaTurmaAtiva, setAbaTurmaAtiva] = useState<string>("");
  const [carregandoCodes, setCarregandoCodes] = useState(true);

  useEffect(() => {
    async function carregarDadosCodes() {
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
    carregarDadosCodes();
  }, []);

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

  return (
    <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', maxWidth: '1200px', width: '100%', overflowX: 'auto' }}>
      {carregandoCodes ? (
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
      )}
    </div>
  );
}