"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export function AlertaVencimento() {
  const [contasDeHoje, setContasDeHoje] = useState<any[]>([]);
  const [visivel, setVisivel] = useState(false);

  async function verificarVencimentos() {
    const hoje = new Date().toISOString().split('T')[0];
    
    const { data } = await supabase
      .from('contas_a_pagar')
      .select('descricao, valor')
      .eq('pago', false)
      .eq('data_vencimento', hoje);

    if (data && data.length > 0) {
      setContasDeHoje(data);
      setVisivel(true);
    }
  }

  useEffect(() => {
    verificarVencimentos();
  }, []);

  if (!visivel) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 9999,
      backgroundColor: '#fff',
      borderLeft: '6px solid #ef4444',
      borderRadius: '16px',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      padding: '20px',
      width: '320px',
      animation: 'slideIn 0.5s ease-out'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
        <strong style={{ color: '#111827', fontSize: '14px' }}>⚠️ Alerta de Vencimento</strong>
        <button onClick={() => setVisivel(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
      </div>
      
      <p style={{ fontSize: '13px', color: '#4b5563', margin: '0 0 12px 0' }}>
        Você tem {contasDeHoje.length} {contasDeHoje.length === 1 ? 'conta' : 'contas'} vencendo hoje:
      </p>

      <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
        {contasDeHoje.map((conta, index) => (
          <div key={index} style={{ backgroundColor: '#fef2f2', padding: '8px 12px', borderRadius: '8px', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{conta.descricao}</span>
            <span style={{ fontSize: '12px', color: '#b91c1c' }}>R$ {conta.valor.toLocaleString('pt-BR')}</span>
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}