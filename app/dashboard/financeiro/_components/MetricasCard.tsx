"use client";

interface MetricasCardProps {
  metricas: {
    total: number;
    pago: number;
    pendente: number;
    descontos: number;
    gastos: number;
    lucro: number;
  };
  onAbrirListaGastos: () => void;
  onAbrirListaReceitas: () => void;
}

export function MetricasCard({ metricas, onAbrirListaGastos, onAbrirListaReceitas }: MetricasCardProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '30px' }}>
      <div onClick={onAbrirListaReceitas} style={{ backgroundColor: 'white', padding: '20px', borderRadius: '15px', borderLeft: '6px solid #10b981', cursor: 'pointer' }}>
        <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 'bold' }}>RECEITA NO MÊS 👁️</span>
        <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#064e3b' }}>R$ {metricas.pago.toLocaleString('pt-BR')}</h2>
      </div>
      
      <div onClick={onAbrirListaGastos} style={{ backgroundColor: 'white', padding: '20px', borderRadius: '15px', borderLeft: '6px solid #ef4444', cursor: 'pointer' }}>
        <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 'bold' }}>GASTOS NO MÊS 👁️</span>
        <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#991b1b' }}>R$ {metricas.gastos.toLocaleString('pt-BR')}</h2>
      </div>
      
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '15px', borderLeft: '6px solid #2563eb' }}>
        <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 'bold' }}>LUCRO REAL</span>
        <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#1e3a8a' }}>R$ {metricas.lucro.toLocaleString('pt-BR')}</h2>
      </div>
      
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '15px', borderLeft: '6px solid #f59e0b' }}>
        <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 'bold' }}>DESCONTOS</span>
        <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#92400e' }}>R$ {metricas.descontos.toLocaleString('pt-BR')}</h2>
      </div>
      
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '15px', borderLeft: '6px solid #6b7280' }}>
        <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 'bold' }}>PENDENTE GERAL</span>
        <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#374151' }}>R$ {metricas.pendente.toLocaleString('pt-BR')}</h2>
      </div>
    </div>
  );
}