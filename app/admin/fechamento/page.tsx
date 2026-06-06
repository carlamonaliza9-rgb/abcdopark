"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

// Dicionário de abreviações das disciplinas
const mapaAbreviacoes: Record<string, string> = {
  'ARTES': 'Art',
  'CIÊNCIAS': 'Cie',
  'ED.FÍSICA': 'EdF',
  'GEOGRAFIA': 'Geo',
  'HISTÓRIA': 'His',
  'INGLÊS': 'Ing',
  'MATEMÁTICA': 'Mat',
  'MÚSICA': 'Mús',
  'PORTUGUÊS': 'Por',
  'XADREZ': 'Xad',
};

// Função auxiliar que abrevia ou corta as 3 primeiras letras como garantia
function abreviarMateria(nome: string) {
  const nomeUpper = nome.toUpperCase().trim();
  if (mapaAbreviacoes[nomeUpper]) return mapaAbreviacoes[nomeUpper];
  
  // Fallback: se houver uma matéria nova não mapeada, pega as 3 primeiras letras
  return nome.substring(0, 3).charAt(0).toUpperCase() + nome.substring(1, 3).toLowerCase();
}

export default function FechamentoLetivo() {
  const [alunos, setAlunos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [ultimoBackup, setUltimoBackup] = useState<any[] | null>(null);

  const turmasOrdem = [
    "Maternal", "Jardim I", "Jardim II", 
    "1º Ano", "2º Ano", "3º Ano", "4º Ano", "5º Ano"
  ];

  async function carregarDados() {
    setCarregando(true);
    try {
      const { data: listaAlunos, error: erroAlunos } = await supabase.from('alunos').select('*').order('nome');
      
      if (erroAlunos) {
        console.error("Erro ao buscar alunos:", erroAlunos);
        alert("Erro ao carregar alunos. Verifique o console.");
        return;
      }
      
      if (listaAlunos) {
        const { data: todasNotas, error: erroNotas } = await supabase.from('boletins').select('*');

        if (erroNotas) {
          console.error("Erro ao buscar boletins:", erroNotas);
          alert("Erro ao carregar os boletins. Verifique o console.");
          return;
        }

        const promessasDeAtualizacao: any[] = [];

        const alunosProcessados = listaAlunos.map(aluno => {
          const notasDoAluno = todasNotas?.filter(n => n.aluno_id === aluno.id) || [];
          
          const mediasMaterias = notasDoAluno.map(disciplina => {
            let soma = 0;
            let contBimestresPreenchidos = 0;

            ['bimestre1', 'bimestre2', 'bimestre3', 'bimestre4'].forEach(b => {
              const valor = parseFloat(disciplina[b]);
              if (!isNaN(valor)) {
                soma += valor;
                contBimestresPreenchidos++;
              }
            });

            const mediaAnual = soma / 4;

            return {
              id: disciplina.id,
              nome: disciplina.disciplina || 'Desconhecida',
              media: mediaAnual,
              notasLancadas: contBimestresPreenchidos
            };
          }).sort((a, b) => a.nome.localeCompare(b.nome));

          let situacaoCalculada = aluno.situacao_academica;

          if (!situacaoCalculada || situacaoCalculada === 'Em curso') {
            if (mediasMaterias.length > 0) {
              const anoConcluido = mediasMaterias.every(m => m.notasLancadas === 4);
              
              if (anoConcluido) {
                const passouEmTodas = mediasMaterias.every(m => m.media >= 7);
                situacaoCalculada = passouEmTodas ? 'Aprovado' : 'Reprovado';
                
                promessasDeAtualizacao.push(
                  supabase.from('alunos').update({ situacao_academica: situacaoCalculada }).eq('id', aluno.id)
                );
              } else {
                situacaoCalculada = 'Em curso';
              }
            } else {
              situacaoCalculada = 'Em curso';
            }
          }

          return {
            ...aluno,
            mediasMaterias,
            situacao_academica: situacaoCalculada
          };
        });

        if (promessasDeAtualizacao.length > 0) {
          Promise.all(promessasDeAtualizacao).catch(e => console.error("Erro ao salvar status automáticos:", e));
        }

        setAlunos(alunosProcessados);
      }
    } catch (err) {
      console.error("Erro inesperado no carregamento:", err);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { carregarDados(); }, []);

  async function atualizarAluno(id: any, campo: string, valor: any) {
    setAlunos(prev => prev.map(a => a.id === id ? { ...a, [campo]: valor } : a));
    const { error } = await supabase
      .from('alunos')
      .update({ [campo]: valor })
      .eq('id', id);
    
    if (error) {
      console.error("Erro na atualização do aluno:", error);
      alert("Erro ao salvar no banco: " + error.message);
      carregarDados();
    }
  }

  async function promoverAprovados() {
    const senha = prompt("Digite a senha mestre para confirmar a promoção de turmas:");
    if (senha !== "1234") return alert("Senha incorreta!");

    if (!confirm("Isso moverá os alunos 'APROVADOS' para a próxima série. Os boletins atuais SERÃO MANTIDOS no histórico do aluno. Continuar?")) return;

    setUltimoBackup([...alunos]);
    setCarregando(true);

    try {
      const promessas = alunos
        .filter(aluno => aluno.situacao_academica === 'Aprovado')
        .map(aluno => {
          const indexAtual = turmasOrdem.indexOf(aluno.turma);
          if (indexAtual !== -1 && indexAtual < turmasOrdem.length - 1) {
            const proximaTurma = turmasOrdem[indexAtual + 1];
            return supabase.from('alunos').update({ 
              turma: proximaTurma, 
              situacao_academica: 'Em curso',
              status: 'pendente'
            }).eq('id', aluno.id);
          }
          return null;
        })
        .filter(Boolean);

      await Promise.all(promessas);
      alert("Alunos promovidos com sucesso! O histórico de boletins foi preservado.");
    } catch (error) {
      console.error("Erro durante a promoção:", error);
      alert("Houve um erro ao promover os alunos. Verifique o console.");
    } finally {
      carregarDados();
    }
  }

  async function desfazerPromocao() {
    if (!ultimoBackup) return;
    if (!confirm("Deseja reverter os alunos para as turmas e situações anteriores?")) return;

    setCarregando(true);

    try {
      const promessas = ultimoBackup
        .filter(alunoOriginal => alunoOriginal.situacao_academica === 'Aprovado')
        .map(alunoOriginal => {
          return supabase.from('alunos').update({
            turma: alunoOriginal.turma,
            situacao_academica: 'Aprovado',
            status: alunoOriginal.status
          }).eq('id', alunoOriginal.id);
        });

      await Promise.all(promessas);
      setUltimoBackup(null);
      alert("Promoção revertida!");
    } catch (error) {
      console.error("Erro ao desfazer promoção:", error);
      alert("Houve um erro ao reverter. Verifique o console.");
    } finally {
      carregarDados();
    }
  }

  if (carregando) return <div style={{ padding: '40px', textAlign: 'center', fontWeight: 'bold' }}>Carregando dados de fechamento...</div>;

  return (
    <div style={{ width: '100%', padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#1f2937' }}>🎓 Fechamento Letivo</h1>
          <p style={{ color: '#6b7280' }}>Médias anuais por disciplina e cálculo automático de aprovação.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
            {ultimoBackup && (
                <button 
                onClick={desfazerPromocao} 
                style={{ backgroundColor: '#6b7280', color: 'white', padding: '12px 25px', borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
                >
                ↩️ DESFAZER
                </button>
            )}
            <button 
            onClick={promoverAprovados} 
            style={{ backgroundColor: '#10b981', color: 'white', padding: '12px 25px', borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer', boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2)' }}
            >
            🚀 PROMOVER APROVADOS
            </button>
        </div>
      </header>

      {turmasOrdem.map(turmaNome => {
        const alunosDaTurma = alunos.filter(a => a.turma === turmaNome);
        if (alunosDaTurma.length === 0) return null;

        // 1. Descobrir todas as matérias únicas dessa turma para montar as colunas
        const materiasSet = new Set<string>();
        alunosDaTurma.forEach(aluno => {
          if (aluno.mediasMaterias) {
            aluno.mediasMaterias.forEach((mat: any) => materiasSet.add(mat.nome));
          }
        });
        // Ordena as matérias em ordem alfabética para os cabeçalhos ficarem padronizados
        const materiasDaTurma = Array.from(materiasSet).sort((a, b) => a.localeCompare(b));

        return (
          <div key={turmaNome} style={{ backgroundColor: 'white', padding: '20px', borderRadius: '20px', marginBottom: '25px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', borderBottom: '2px solid #f3f4f6', paddingBottom: '10px', marginBottom: '15px', color: '#2563eb' }}>{turmaNome}</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                <thead>
                  <tr style={{ fontSize: '12px', color: '#6b7280', borderBottom: '1px solid #f3f4f6' }}>
                    <th style={{ padding: '12px', width: '25%' }}>NOME DO ALUNO</th>
                    
                    {/* 2. Gerar uma coluna para cada matéria encontrada na turma */}
                    {materiasDaTurma.map(nomeMateria => (
                      <th key={nomeMateria} style={{ padding: '12px', textAlign: 'center' }} title={nomeMateria}>
                        {abreviarMateria(nomeMateria)}
                      </th>
                    ))}

                    <th style={{ padding: '12px', width: '20%', textAlign: 'center' }}>SITUAÇÃO</th>
                  </tr>
                </thead>
                <tbody>
                  {alunosDaTurma.map(aluno => (
                    <tr key={aluno.id} style={{ borderBottom: '1px solid #f9fafb', transition: 'background-color 0.2s' }}>
                      <td style={{ padding: '12px', fontWeight: '600', color: '#374151' }}>{aluno.nome}</td>
                      
                      {/* 3. Para cada matéria da tabela, procuramos a nota do aluno */}
                      {materiasDaTurma.map(nomeMateria => {
                        const mat = aluno.mediasMaterias?.find((m: any) => m.nome === nomeMateria);
                        
                        return (
                          <td key={nomeMateria} style={{ padding: '12px', textAlign: 'center' }}>
                            {mat ? (
                              <span style={{ 
                                display: 'inline-block',
                                padding: '4px 10px', 
                                borderRadius: '999px',
                                backgroundColor: mat.media >= 7 ? '#f0fdf4' : '#fef2f2', 
                                border: `1px solid ${mat.media >= 7 ? '#bbf7d0' : '#fecaca'}`,
                                color: mat.media >= 7 ? '#15803d' : '#b91c1c',
                                fontWeight: '800',
                                fontSize: '12px',
                                minWidth: '40px'
                              }} 
                              title={`${mat.notasLancadas} bimestre(s) lançado(s)`}>
                                {mat.media.toFixed(1)}
                              </span>
                            ) : (
                              // Se o aluno ainda não tem nota nessa matéria, exibe um traço
                              <span style={{ color: '#d1d5db', fontWeight: 'bold' }}>-</span>
                            )}
                          </td>
                        );
                      })}

                      <td style={{ padding: '12px' }}>
                        <select 
                          value={aluno.situacao_academica || 'Em curso'} 
                          onChange={(e) => atualizarAluno(aluno.id, 'situacao_academica', e.target.value)}
                          style={{ 
                            padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', width: '100%', fontWeight: 'bold', fontSize: '13px',
                            backgroundColor: aluno.situacao_academica === 'Aprovado' ? '#dcfce7' : aluno.situacao_academica === 'Reprovado' ? '#fee2e2' : 'white',
                            color: aluno.situacao_academica === 'Aprovado' ? '#166534' : aluno.situacao_academica === 'Reprovado' ? '#991b1b' : '#374151',
                            cursor: 'pointer', outline: 'none'
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