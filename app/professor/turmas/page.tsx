"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

// Importação dos Componentes
import { ModalFichaAlunoTurma } from "@/app/dashboard/turmas/_components/ModalFichaAlunoTurma";
import { ModalAgendaTurma } from "@/app/dashboard/turmas/_components/ModalAgendaTurma";

export default function TurmasProfessorPage() {
  const router = useRouter();
  const [turmas, setTurmas] = useState<any[]>([]);
  const [todosAlunos, setTodosAlunos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const [alunoSelecionado, setAlunoSelecionado] = useState<any>(null);
  const [modalFichaAberto, setModalFichaAberto] = useState(false);
  const [modalAgendaAberto, setModalAgendaAberto] = useState(false);
  const [turmaParaAgenda, setTurmaParaAgenda] = useState<any>(null);
  const [modoAgenda, setModoAgenda] = useState<'registrar' | 'consultar'>('registrar');

  const calcularIdade = (dataNasc: string) => {
    if (!dataNasc) return "--";
    const hoje = new Date();
    const nascimento = new Date(dataNasc);
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const m = hoje.getMonth() - nascimento.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) idade--;
    return `${idade} ${idade === 1 ? 'ano' : 'anos'}`;
  };

  async function carregarDados() {
    setCarregando(true);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return router.push("/login");

    const email = authData.user.email || "";
    setUserEmail(email);

    const [resAlunos, resInfos, resCores] = await Promise.all([
      supabase.from('alunos').select('*'),
      supabase.from('turmas_info').select('*'),
      supabase.from('configuracao_turmas').select('*')
    ]);

    if (resAlunos.data && resInfos.data) {
      setTodosAlunos(resAlunos.data);
      const coresAtuais = resCores.data?.reduce((acc: any, item: any) => { acc[item.nome_turma] = item.cor_hex; return acc; }, {}) || {};
      
      const turmasDoProfessor = resInfos.data.filter(t => 
        t.email_prof_fixo_1 === email || t.email_prof_fixo_2 === email || 
        t.email_prof_especifico_1 === email || t.email_prof_especifico_2 === email
      ).map(t => ({
        nome: t.nome_turma,
        cor: coresAtuais[t.nome_turma] || "#ffffff",
        horario_url: t.horario_url
      }));

      setTurmas(turmasDoProfessor);
    }
    setCarregando(false);
  }

  useEffect(() => { carregarDados(); }, []);

  if (carregando) return <div style={{ padding: '50px', textAlign: 'center' }}>Carregando suas turmas...</div>;

  return (
    <div style={{ width: '100%', padding: '30px', fontFamily: 'sans-serif', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      {turmas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px', color: '#64748b' }}>Você ainda não está vinculado a nenhuma turma.</div>
      ) : (
        turmas.map(minhaTurma => (
          <div key={minhaTurma.nome} style={{ backgroundColor: 'white', padding: '30px', borderRadius: '30px', border: '1px solid #f1f5f9', marginBottom: '30px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '20px' }}>
              <div>
                <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#1e3a8a', margin: 0 }}>🏫 {minhaTurma.nome}</h1>
                <p style={{ color: '#64748b', fontWeight: '600' }}>{todosAlunos.filter(a => a.turma === minhaTurma.nome).length} alunos matriculados</p>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => { setTurmaParaAgenda(minhaTurma); setModoAgenda('registrar'); setModalAgendaAberto(true); }} style={{ backgroundColor: '#2563eb', color: 'white', padding: '12px 24px', borderRadius: '15px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>📝 Registrar Agenda</button>
                <button onClick={() => { setTurmaParaAgenda(minhaTurma); setModoAgenda('consultar'); setModalAgendaAberto(true); }} style={{ backgroundColor: 'white', color: '#2563eb', padding: '12px 24px', borderRadius: '15px', border: '2px solid #2563eb', fontWeight: 'bold', cursor: 'pointer' }}>🔍 Consultar Agenda</button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {todosAlunos.filter(a => a.turma === minhaTurma.nome).sort((a, b) => a.nome.localeCompare(b.nome)).map((aluno, index) => {
                const paleta = [{ bg: '#ebf5ff', border: '#3b82f6', text: '#1e40af' }, { bg: '#f0fdf4', border: '#22c55e', text: '#166534' }, { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' }];
                const cor = paleta[index % paleta.length];
                return (
                  <div key={aluno.id} onClick={() => { setAlunoSelecionado(aluno); setModalFichaAberto(true); }} style={{ backgroundColor: cor.bg, padding: '18px 25px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', borderLeft: `10px solid ${cor.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                      <div style={{ width: '75px', height: '75px', borderRadius: '14px', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: `1px solid ${cor.border}` }}>
                        {aluno.foto_url ? <img src={aluno.foto_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : "👤"}
                      </div>
                      <div>
                        <p style={{ fontWeight: '900', color: cor.text, fontSize: '18px', margin: 0 }}>{aluno.nome}</p>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 'bold', color: cor.text }}>{calcularIdade(aluno.data_nascimento)}</span>
                          {aluno.tem_alergia && <span style={{ fontSize: '10px', backgroundColor: '#fee2e2', color: '#b91c1c', padding: '3px 10px', borderRadius: '8px', fontWeight: '800' }}>⚠️ ALERGIA</span>}
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: '11px', color: cor.text, fontWeight: '900' }}>VER FICHA ➔</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {modalFichaAberto && (
        <ModalFichaAlunoTurma aluno={alunoSelecionado} ehAdmin={false} onClose={() => setModalFichaAberto(false)} calcularIdade={calcularIdade} />
      )}
      {modalAgendaAberto && (
        <ModalAgendaTurma turma={turmaParaAgenda} userEmail={userEmail} modo={modoAgenda} ehAdmin={false} onClose={() => setModalAgendaAberto(false)} />
      )}
    </div>
  );
}