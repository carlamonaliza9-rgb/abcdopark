"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function AvaliacoesProfessorPage() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [ehAdmin, setEhAdmin] = useState(false);
  
  const [listaTurmas, setListaTurmas] = useState<string[]>([]);
  const [turmaSelecionada, setTurmaSelecionada] = useState("");
  
  const [disciplinas, setDisciplinas] = useState<any[]>([]);
  const [disciplinaSelecionada, setDisciplinaSelecionada] = useState("");
  const [bimestreSelecionado, setBimestreSelecionado] = useState("bimestre1");
  
  const [alunos, setAlunos] = useState<any[]>([]);
  const [notasLocais, setNotasLocais] = useState<{ [key: string]: string }>({});

  const colunasAvaliacao = [
    { id: "bimestre1", label: "1º Bimestre" },
    { id: "bimestre2", label: "2º Bimestre" },
    { id: "recuperacao1", label: "Recuperação 1" },
    { id: "bimestre3", label: "3º Bimestre" },
    { id: "bimestre4", label: "4º Bimestre" },
    { id: "recuperacao2", label: "Recuperação 2" },
  ];

  useEffect(() => {
    async function inicializar() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");

      const email = user.email || "";
      setUserEmail(email);

      // 1. Verifica se o usuário é Admin
      const { data: perfil } = await supabase.from('perfis').select('cargo').eq('id', user.id).single();
      const adminVerificado = email === 'carlamonaliza9@gmail.com' || email === 'diretoria@abcdopark.com' || perfil?.cargo === 'Admin';
      setEhAdmin(adminVerificado);

      if (adminVerificado) {
        // Se for Admin, carrega os nomes das turmas fixas para o seletor
        const nomesTurmas = ["Maternal", "Jardim I", "Jardim II", "1º Ano", "2º Ano", "3º Ano", "4º Ano", "5º Ano"];
        setListaTurmas(nomesTurmas);
      } else {
        // 2. Lógica para Professores (Fixos e Especialistas)
        // Busca todas as turmas onde o e-mail aparece em qualquer um dos campos de professor
        const { data: turmasData } = await supabase
          .from('turmas_info')
          .select('nome_turma')
          .or(`email_prof_fixo_1.eq.${email},email_prof_fixo_2.eq.${email},email_prof_especifico_1.eq.${email},email_prof_especifico_2.eq.${email}`);

        if (turmasData && turmasData.length > 0) {
          const nomesEncontrados = turmasData.map(t => t.nome_turma);
          setListaTurmas(nomesEncontrados);
          
          // Se o professor só tiver uma turma, já seleciona automaticamente
          if (nomesEncontrados.length === 1) {
            setTurmaSelecionada(nomesEncontrados[0]);
          }
        }
      }
      setCarregando(false);
    }
    inicializar();
  }, [router]);

  // Busca as matérias oficiais sempre que a turma mudar
  useEffect(() => {
    async function buscarMateriasDaTurma() {
      if (!turmaSelecionada) return;
      
      const { data: discData } = await supabase
        .from('turma_disciplinas')
        .select('disciplina')
        .eq('nome_turma', turmaSelecionada)
        .eq('ano', '2026');
      
      if (discData && discData.length > 0) {
        setDisciplinas(discData);
        setDisciplinaSelecionada(discData[0].disciplina);
      } else {
        setDisciplinas([]);
        setDisciplinaSelecionada("");
      }
    }
    buscarMateriasDaTurma();
  }, [turmaSelecionada]);

  // Carrega alunos e notas sempre que mudar a turma, matéria ou o bimestre
  useEffect(() => {
    if (turmaSelecionada && disciplinaSelecionada) {
      carregarDadosLancamento();
    } else {
      setAlunos([]);
      setNotasLocais({});
    }
  }, [turmaSelecionada, disciplinaSelecionada, bimestreSelecionado]);

  async function carregarDadosLancamento() {
    const { data: listaAlunos } = await supabase
      .from('alunos')
      .select('id, nome, foto_url')
      .eq('turma', turmaSelecionada)
      .order('nome', { ascending: true });

    if (listaAlunos) {
      setAlunos(listaAlunos);

      const { data: notasData } = await supabase
        .from('boletins')
        .select('*')
        .eq('disciplina', disciplinaSelecionada)
        .eq('ano', '2026');

      const mapaNotas: { [key: string]: string } = {};
      listaAlunos.forEach((aluno) => {
        const notaReg = notasData?.find((n: any) => n.aluno_id === aluno.id);
        const valorNota = notaReg ? notaReg[bimestreSelecionado as keyof typeof notaReg] : "";
        mapaNotas[String(aluno.id)] = valorNota !== null ? String(valorNota) : "";
      });
      setNotasLocais(mapaNotas);
    }
  }

  const handleNotaChange = (alunoId: string, valor: string) => {
    setNotasLocais(prev => ({ ...prev, [alunoId]: valor.replace(',', '.') }));
  };

  // --- FUNÇÃO AUXILIAR DE AUDITORIA (LOGS) ---
  async function registrarLog(acao: string, detalhes: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('logs_sistema').insert([{
          usuario_email: user.email,
          acao: acao,
          tabela: 'boletins',
          detalhes: detalhes
        }]);
      }
    } catch (e) {
      console.error("Erro ao gerar log de auditoria:", e);
    }
  }

  async function salvarNotas() {
    if (!disciplinaSelecionada) return alert("Selecione uma matéria.");
    setSalvando(true);
    try {
      for (const alunoId of Object.keys(notasLocais)) {
        const valorNota = notasLocais[alunoId] === "" ? null : parseFloat(notasLocais[alunoId]);
        
        const { error } = await supabase
          .from('boletins')
          .upsert({
            aluno_id: parseInt(alunoId),
            disciplina: disciplinaSelecionada,
            ano: "2026",
            [bimestreSelecionado]: valorNota
          }, { onConflict: 'aluno_id, disciplina, ano' });
          
        if (error) throw error;
      }
      
      // Registra a alteração de notas em lote no Log de Auditoria
      const bimestreLabel = colunasAvaliacao.find(col => col.id === bimestreSelecionado)?.label || bimestreSelecionado;
      await registrarLog(
        "EDIÇÃO", 
        `Lançou/Alterou notas da matéria ${disciplinaSelecionada} para a turma ${turmaSelecionada} (${bimestreLabel})`
      );

      alert(`Notas de ${disciplinaSelecionada} salvas com sucesso!`);
    } catch (err: any) {
      alert("Erro ao salvar: " + err.message);
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) return <div style={{ padding: '50px', textAlign: 'center' }}>Carregando sistema de notas...</div>;

  return (
    <div style={{ padding: '30px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <header style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#1e3a8a' }}>Lançamento de Notas</h1>
        <p style={{ color: '#64748b', fontSize: '14px' }}>
          {ehAdmin ? "Painel Administrativo" : `Professor(a): ${userEmail}`}
        </p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginTop: '20px', backgroundColor: '#f8fafc', padding: '20px', borderRadius: '15px' }}>
          
          {/* Seletor de Turma visível para Admin ou Especialistas (mais de 1 turma) */}
          {(ehAdmin || listaTurmas.length > 1) ? (
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>SELECIONE A TURMA</label>
              <select 
                value={turmaSelecionada} 
                onChange={(e) => setTurmaSelecionada(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0', fontWeight: '600' }}
              >
                <option value="">Escolha uma turma...</option>
                {listaTurmas.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          ) : (
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>TURMA</label>
              <div style={{ padding: '10px', backgroundColor: 'white', borderRadius: '10px', border: '1px solid #e2e8f0', fontWeight: '800', color: '#1e3a8a' }}>
                {turmaSelecionada || "Nenhuma turma vinculada"}
              </div>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>MATÉRIA</label>
            <select 
              value={disciplinaSelecionada} 
              onChange={(e) => setDisciplinaSelecionada(e.target.value)}
              disabled={disciplinas.length === 0}
              style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0', fontWeight: '600' }}
            >
              {disciplinas.length > 0 ? (
                disciplinas.map(d => <option key={d.disciplina} value={d.disciplina}>{d.disciplina}</option>)
              ) : (
                <option value="">Nenhuma matéria cadastrada</option>
              )}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>BIMESTRE</label>
            <select 
              value={bimestreSelecionado} 
              onChange={(e) => setBimestreSelecionado(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0', fontWeight: '600' }}
            >
              {colunasAvaliacao.map(col => <option key={col.id} value={col.id}>{col.label}</option>)}
            </select>
          </div>
        </div>
      </header>

      {turmaSelecionada && disciplinas.length > 0 ? (
        <>
          <div style={{ backgroundColor: 'white', borderRadius: '20px', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc' }}>
                  <th style={{ padding: '15px', textAlign: 'left', fontSize: '12px', color: '#64748b' }}>ALUNO</th>
                  <th style={{ padding: '15px', textAlign: 'center', fontSize: '12px', color: '#64748b', width: '100px' }}>NOTA</th>
                </tr>
              </thead>
              <tbody>
                {alunos.map((aluno) => (
                  <tr key={aluno.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 15px', fontWeight: '600', color: '#334155' }}>{aluno.nome}</td>
                    <td style={{ padding: '12px 15px', textAlign: 'center' }}>
                      <input 
                        type="text"
                        value={notasLocais[String(aluno.id)] || ""}
                        onChange={(e) => handleNotaChange(String(aluno.id), e.target.value)}
                        placeholder="0.0"
                        style={{ 
                          width: '60px', 
                          padding: '8px', 
                          textAlign: 'center', 
                          borderRadius: '8px', 
                          border: '1px solid #e2e8f0', 
                          fontWeight: '800',
                          color: parseFloat(notasLocais[String(aluno.id)]) < 7 ? '#ef4444' : '#2563eb'
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '25px', display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              onClick={salvarNotas}
              disabled={salvando}
              style={{ 
                backgroundColor: '#2563eb', 
                color: 'white', 
                padding: '12px 30px', 
                borderRadius: '12px', 
                border: 'none', 
                fontWeight: '700', 
                cursor: 'pointer',
                opacity: salvando ? 0.6 : 1
              }}
            >
              {salvando ? "Gravando..." : "Salvar Notas"}
            </button>
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '50px', backgroundColor: '#f8fafc', borderRadius: '20px', color: '#64748b' }}>
          {!turmaSelecionada 
            ? "Selecione uma turma para começar o lançamento." 
            : "Esta turma ainda não possui matérias cadastradas na Grade de Matérias."}
        </div>
      )}
    </div>
  );
}