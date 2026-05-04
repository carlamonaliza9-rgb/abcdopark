"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function FechamentoLetivo() {
  const [alunos, setAlunos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  const turmasOrdem = [
    "Maternal", "Jardim I", "Jardim II", 
    "1º Ano", "2º Ano", "3º Ano", "4º Ano", "5º Ano"
  ];

  async function carregarDados() {
    setCarregando(true);
    try {
      const { data: listaAlunos } = await supabase.from('alunos').select('*').order('nome');
      
      if (listaAlunos) {
        const { data: todasNotas } = await supabase.from('boletins').select('*');

        const alunosComMedias = listaAlunos.map(aluno => {
          const notasDoAluno = todasNotas?.filter(n => n.aluno_id === aluno.id) || [];
          let somaTotal = 0;
          let contagemNotas = 0;

          notasDoAluno.forEach(disciplina => {
            ['bimestre1', 'bimestre2', 'bimestre3', 'bimestre4'].forEach(b => {
              if (disciplina[b] !== null && disciplina[b] !== undefined) {
                somaTotal += parseFloat(disciplina[b]);
                contagemNotas++;
              }
            });
          });

          const mediaCalculada = contagemNotas > 0 ? (somaTotal / contagemNotas).toFixed(1) : "0.0";

          return {
            ...aluno,
            media_calculada: mediaCalculada
          };
        });

        setAlunos(alunosComMedias);
      }
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { carregarDados(); }, []);

  async function atualizarAluno(id: any, campo: string, valor: any) {
    // Atualização otimista (local)
    setAlunos(prev => prev.map(a => a.id === id ? { ...a, [campo]: valor } : a));

    // Salva no banco (garantindo que o ID seja tratado como número se necessário)
    const { error } = await supabase
      .from('alunos')
      .update({ [campo]: valor })
      .eq('id', id);
    
    if (error) {
      alert("Erro ao salvar no banco: " + error.message);
      carregarDados(); // Reverte em caso de falha
    }
  }

  async function promoverAprovados() {
    const senha = prompt("Digite a senha mestre para confirmar a promoção de turmas:");
    if (senha !== "1234") return alert("Senha incorreta!");

    if (!confirm("Isso moverá todos os alunos 'APROVADOS' para a próxima série. Deseja continuar?")) return;

    for (const aluno of alunos) {
      if (aluno.situacao_academica === 'Aprovado') {
        const indexAtual = turmasOrdem.indexOf(aluno.turma);
        if (indexAtual !== -1 && indexAtual < turmasOrdem.length - 1) {
          const proximaTurma = turmasOrdem[indexAtual + 1];
          await supabase.from('alunos').update({ 
            turma: proximaTurma, 
            situacao_academica: 'Em curso',
            status: 'pendente'
          }).eq('id', aluno.id);
          
          await supabase.from('boletins').delete().eq('aluno_id', aluno.id);
        }
      }
    }
    alert("Alunos promovidos com sucesso!");
    carregarDados();
  }

  if (carregando) return <div style={{ padding: '40px', textAlign: 'center' }}>Carregando dados de fechamento...</div>;

  return (
    <div style={{ width: '100%', padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#1f2937' }}>🎓 Fechamento Letivo</h1>
          <p style={{ color: '#6b7280' }}>Média anual automática baseada nos boletins lançados.</p>
        </div>
        <button 
          onClick={promoverAprovados} 
          style={{ backgroundColor: '#10b981', color: 'white', padding: '12px 25px', borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer', boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2)' }}
        >
          🚀 PROMOVER APROVADOS
        </button>
      </header>

      {turmasOrdem.map(turmaNome => {
        const alunosDaTurma = alunos.filter(a => a.turma === turmaNome);
        if (alunosDaTurma.length === 0) return null;

        return (
          <div key={turmaNome} style={{ backgroundColor: 'white', padding: '20px', borderRadius: '20px', marginBottom: '25px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', borderBottom: '2px solid #f3f4f6', paddingBottom: '10px', marginBottom: '15px', color: '#2563eb' }}>{turmaNome}</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ fontSize: '12px', color: '#6b7280', borderBottom: '1px solid #f3f4f6' }}>
                    <th style={{ padding: '12px' }}>NOME DO ALUNO</th>
                    <th style={{ padding: '12px', width: '150px', textAlign: 'center' }}>MÉDIA DO BOLETIM</th>
                    <th style={{ padding: '12px', width: '200px' }}>SITUAÇÃO ACADÊMICA</th>
                  </tr>
                </thead>
                <tbody>
                  {alunosDaTurma.map(aluno => (
                    <tr key={aluno.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                      <td style={{ padding: '12px', fontWeight: '600', color: '#374151' }}>{aluno.nome}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <div style={{ 
                          padding: '8px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0',
                          fontWeight: '800', color: parseFloat(aluno.media_calculada) >= 7 ? '#15803d' : '#b91c1c', fontSize: '16px'
                        }}>
                          {aluno.media_calculada}
                        </div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <select 
                          value={aluno.situacao_academica || 'Em curso'} 
                          onChange={(e) => atualizarAluno(aluno.id, 'situacao_academica', e.target.value)}
                          style={{ 
                            padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', width: '100%', fontWeight: 'bold',
                            backgroundColor: aluno.situacao_academica === 'Aprovado' ? '#dcfce7' : aluno.situacao_academica === 'Reprovado' ? '#fee2e2' : 'white',
                            color: aluno.situacao_academica === 'Aprovado' ? '#166534' : aluno.situacao_academica === 'Reprovado' ? '#991b1b' : '#374151'
                          }}
                        >
                          <option value="Em curso">🟡 Em curso</option>
                          <option value="Aprovado">🟢 Aprovado</option>
                          <option value="Reprovado">🔴 Reprovado</option>
                          <option value="Transferido">⚪ Transferido</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}