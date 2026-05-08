"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

export function AlertaEvasao() {
  const [alertas, setAlertas] = useState<any[]>([]);
  const [visivel, setVisivel] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  async function verificarAlertasEvasao() {
    // REGRA DE LIMITE: Verifica quantas vezes já apareceu neste login
    const exibicoesHoje = sessionStorage.getItem("exibicoes_alerta_evasao") || "0";
    
    if (parseInt(exibicoesHoje) >= 2) {
      setVisivel(false);
      return; // Se já apareceu 2 vezes, interrompe a função aqui
    }

    const agora = new Date();
    const hoje = [
      agora.getFullYear(),
      String(agora.getMonth() + 1).padStart(2, '0'),
      String(agora.getDate()).padStart(2, '0')
    ].join('-');
    
    const { data } = await supabase
      .from('historico_pedagogico')
      .select(`
        descricao,
        data,
        aluno_id,
        alunos (nome, turma)
      `)
      .ilike('descricao', '%ALERTA%')
      .eq('data', hoje);

    if (data && data.length > 0) {
      setAlertas(data);
      setVisivel(true);
      
      // Incrementa o contador no sessionStorage
      const novaContagem = parseInt(exibicoesHoje) + 1;
      sessionStorage.setItem("exibicoes_alerta_evasao", novaContagem.toString());
    } else {
      setVisivel(false);
    }
  }

  useEffect(() => {
    verificarAlertasEvasao();

    // Mantemos a verificação em segundo plano, mas a regra do sessionStorage travará a exibição
    timerRef.current = setInterval(verificarAlertasEvasao, 10 * 60 * 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (!visivel || alertas.length === 0) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: '160px', 
        right: '20px',
        zIndex: 9998,
        backgroundColor: '#fff',
        borderLeft: '6px solid #f59e0b', 
        borderRadius: '16px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        padding: '20px',
        width: '320px',
        fontFamily: 'sans-serif',
        cursor: 'default',
        animation: 'slideIn 0.5s ease-out'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <strong style={{ color: '#92400e', fontSize: '14px' }}>🚨 Alerta Pedagógico (Hoje)</strong>
        <button 
          onClick={() => setVisivel(false)} 
          style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '18px' }}
        >
          ✕
        </button>
      </div>
      
      <p style={{ fontSize: '12px', color: '#4b5563', margin: '0 0 10px 0' }}>
        Faltas consecutivas detectadas hoje:
      </p>

      <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
        {alertas.map((alerta, index) => (
          <div key={index} style={{ backgroundColor: '#fffbeb', padding: '8px', borderRadius: '8px', marginBottom: '5px', border: '1px solid #fef3c7' }}>
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#92400e' }}>
              {alerta.alunos?.nome?.split(' ')[0]} - {alerta.alunos?.turma}
            </div>
            <div style={{ fontSize: '10px', color: '#b45309', marginTop: '2px' }}>
              {alerta.descricao}
            </div>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}