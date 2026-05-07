"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface ModalAgendaTurmaProps {
  turma: any;
  onClose: () => void;
  userEmail: string | null;
}

export function ModalAgendaTurma({ turma, onClose, userEmail }: ModalAgendaTurmaProps) {
  const [dataSelecionada, setDataSelecionada] = useState(new Date().toISOString().split('T')[0]);
  const [conteudoAula, setConteudoAula] = useState("");
  const [tarefaCasa, setTarefaCasa] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(false);

  // Busca se já existe registro para a data selecionada
  async function carregarRegistroDaData(data: string) {
    setCarregando(true);
    const { data: registro, error } = await supabase
      .from('agenda_escolar')
      .select('*')
      .eq('nome_turma', turma.nome)
      .eq('data', data)
      .single();

    if (registro) {
      setConteudoAula(registro.conteudo_aula || "");
      setTarefaCasa(registro.tarefa_casa || "");
    } else {
      setConteudoAula("");
      setTarefaCasa("");
    }
    setCarregando(false);
  }

  useEffect(() => {
    carregarRegistroDaData(dataSelecionada);
  }, [dataSelecionada]);

  async function handleSalvar() {
    if (!conteudoAula && !tarefaCasa) return alert("Preencha ao menos um campo.");
    
    setSalvando(true);
    const { error } = await supabase.from('agenda_escolar').upsert({
      nome_turma: turma.nome,
      data: dataSelecionada,
      conteudo_aula: conteudoAula,
      tarefa_casa: tarefaCasa,
      professor_email: userEmail
    }, { onConflict: 'nome_turma, data' }); // Requer que você tenha uma constraint unique no banco para (nome_turma, data)

    if (error) {
      alert("Erro ao salvar: " + error.message);
    } else {
      alert("Agenda salva com sucesso! 📝");
      onClose();
    }
    setSalvando(false);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, backdropFilter: 'blur(8px)' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '30px', width: '95%', maxWidth: '500px', padding: '30px', position: 'relative', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 20, right: 20, border: 'none', background: '#f1f5f9', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer' }}>✕</button>

        <header style={{ textAlign: 'center', marginBottom: '25px' }}>
          <span style={{ fontSize: '40px' }}>📝</span>
          <h2 style={{ margin: '10px 0 5px', fontSize: '22px', fontWeight: '800', color: '#111827' }}>Agenda da Turma</h2>
          <p style={{ margin: 0, color: '#64748b', fontWeight: '600' }}>{turma.nome}</p>
        </header>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Seleção de Data */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#94a3b8', marginBottom: '8px' }}>DATA DA ATIVIDADE</label>
            <input 
              type="date" 
              value={dataSelecionada}
              onChange={(e) => setDataSelecionada(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none', fontFamily: 'inherit' }}
            />
          </div>

          {/* Conteúdo da Aula */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#94a3b8', marginBottom: '8px' }}>O QUE FOI REALIZADO EM SALA</label>
            <textarea 
              placeholder="Descreva as atividades, temas abordados..."
              value={conteudoAula}
              onChange={(e) => setConteudoAula(e.target.value)}
              disabled={carregando}
              style={{ width: '100%', minHeight: '100px', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          {/* Tarefa de Casa */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#94a3b8', marginBottom: '8px' }}>ATIVIDADE PARA CASA (PARA OS PAIS)</label>
            <textarea 
              placeholder="Livro página X, trazer material Y..."
              value={tarefaCasa}
              onChange={(e) => setTarefaCasa(e.target.value)}
              disabled={carregando}
              style={{ width: '100%', minHeight: '80px', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>
        </div>

        <div style={{ marginTop: '30px', display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '14px', borderRadius: '15px', border: 'none', backgroundColor: '#f1f5f9', color: '#475569', fontWeight: 'bold', cursor: 'pointer' }}>
            CANCELAR
          </button>
          <button 
            onClick={handleSalvar} 
            disabled={salvando || carregando}
            style={{ flex: 2, padding: '14px', borderRadius: '15px', border: 'none', backgroundColor: '#2563eb', color: 'white', fontWeight: 'bold', cursor: 'pointer', opacity: salvando ? 0.7 : 1 }}
          >
            {salvando ? "SALVANDO..." : "SALVAR NA AGENDA"}
          </button>
        </div>
      </div>
    </div>
  );
}