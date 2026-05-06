"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, usePathname } from "next/navigation";

export function AlertaVencimento() {
  const [contasDeHoje, setContasDeHoje] = useState<any[]>([]);
  const [visivel, setVisivel] = useState(false);
  const router = useRouter();
  const pathname = usePathname(); // Deteta a página atual
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  async function verificarVencimentos() {
    // Se estiver na página de contas, não precisamos mostrar o alerta
    if (pathname === "/dashboard/financeiro/contas-a-pagar") {
      setVisivel(false);
      return;
    }

    const hoje = new Date().toISOString().split('T')[0];
    
    const { data } = await supabase
      .from('contas_a_pagar')
      .select('descricao, valor')
      .eq('pago', false)
      .eq('data_vencimento', hoje);

    if (data && data.length > 0) {
      setContasDeHoje(data);
      setVisivel(true);
    } else {
      setVisivel(false);
    }
  }

  // EFEITO 1: Monitora a página e o tempo
  useEffect(() => {
    // Se o utilizador entrar na página de Contas a Pagar, esconde o alerta e inicia o contador de 30min
    if (pathname === "/dashboard/financeiro/contas-a-pagar") {
      setVisivel(false);
      
      // Limpa cronómetros anteriores para não duplicar
      if (timerRef.current) clearTimeout(timerRef.current);

      // Agenda uma nova verificação para daqui a 30 minutos
      timerRef.current = setTimeout(() => {
        verificarVencimentos();
      }, 30 * 60 * 1000); // 30 minutos em milissegundos
    } else {
      // Se não estiver na página, verifica imediatamente
      verificarVencimentos();
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [pathname]); // Executa sempre que mudar de página

  if (!visivel || contasDeHoje.length === 0) return null;

  return (
    <div 
      onClick={() => router.push("/dashboard/financeiro/contas-a-pagar")}
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        backgroundColor: '#fff',
        borderLeft: '6px solid #ef4444',
        borderRadius: '16px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        padding: '20px',
        width: '320px',
        fontFamily: 'sans-serif',
        cursor: 'pointer',
        transition: 'transform 0.2s ease',
      }}
      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <strong style={{ color: '#111827', fontSize: '14px' }}>⚠️ Pendências de Hoje</strong>
        <button 
          onClick={(e) => {
            e.stopPropagation(); 
            setVisivel(false);
            // Ao fechar manualmente, também agendamos o retorno em 30min
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(verificarVencimentos, 30 * 60 * 1000);
          }} 
          style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '18px' }}
        >
          ✕
        </button>
      </div>
      
      <p style={{ fontSize: '12px', color: '#4b5563', margin: '0 0 10px 0' }}>
        Abre a página para regularizar.
      </p>

      <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
        {contasDeHoje.map((conta, index) => (
          <div key={index} style={{ backgroundColor: '#fef2f2', padding: '8px', borderRadius: '8px', marginBottom: '5px', display: 'flex', justifyContent: 'space-between', border: '1px solid #fee2e2' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold' }}>{conta.descricao}</span>
            <span style={{ fontSize: '11px', color: '#b91c1c' }}>R$ {conta.valor.toLocaleString('pt-BR')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}