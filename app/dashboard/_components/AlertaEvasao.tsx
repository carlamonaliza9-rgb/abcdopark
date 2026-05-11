"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

export function AlertaEvasao() {
  const [alertas, setAlertas] = useState<any[]>([]);
  const [visivel, setVisivel] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  async function verificarAlertasEvasao() {
    // Pegamos a data de hoje no formato YYYY-MM-DD para bater com o banco
    const hoje = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('historico_pedagogico')
      .select(`
        descricao,
        data,
        aluno_id,
        alunos (nome, turma)
      `)
      .ilike('descricao', '%ALERTA%') // Filtra apenas registros de alerta
      .eq('data', hoje);

    if (data && data.length > 0) {
      setAlertas(data);
      setVisivel(true);
    } else {
      setVisivel(false);
    }
    
    if (error) console.error("Erro ao buscar alertas:", error.message);
  }

  useEffect(() => {
    // Verifica assim que o Admin loga
    verificarAlertasEvasao();

    // Verifica a cada 5 minutos se há novos alertas de evasão
    timerRef.current = setInterval(verificarAlertasEvasao, 5 * 60 * 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (!visivel || alertas.length === 0) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: '100px', 
        right: '20px',
        zIndex: 9999,
        backgroundColor: '#fff',
        borderLeft: '6px solid #ef4444', // Vermelho para chamar atenção do Admin
        borderRadius: '16px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        padding: '20px',
        width: '350px',
        fontFamily: 'sans-serif',
        animation: 'slideIn 0.5s ease-out'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <strong style={{ color: '#b91c1c', fontSize: '14px' }}>⚠️ Alerta de Evasão Escolar</strong>
        <button 
          onClick={() => setVisivel(false)} 
          style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '18px' }}
        >
          ✕
        </button>
      </div>
      
      <p style={{ fontSize: '12px', color: '#4b5563', margin: '0 0 15px 0', lineHeight: '1.4' }}>
        Os seguintes alunos faltaram por <b>2 dias consecutivos</b>. Acompanhe a situação pedagógica:
      </p>

      <div style={{ maxHeight: '200px', overflowY: 'auto', paddingRight: '5px' }}>
        {alertas.map((alerta, index) => (
          <div key={index} style={{ backgroundColor: '#fef2f2', padding: '10px', borderRadius: '10px', marginBottom: '8px', border: '1px solid #fee2e2' }}>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#991b1b' }}>
              {alerta.alunos?.nome}
            </div>
            <div style={{ fontSize: '10px', color: '#b91c1c', fontWeight: '600', marginBottom: '4px' }}>
              Turma: {alerta.alunos?.turma}
            </div>
            <div style={{ fontSize: '11px', color: '#475569', fontStyle: 'italic', borderTop: '1px solid #fecaca', paddingTop: '4px' }}>
              {alerta.descricao}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(120%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}