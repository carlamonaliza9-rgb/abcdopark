"use client";

interface BalancoResumoProps {
  resumoMetodos: {
    pix: number;
    dinheiro: number;
    credito: number;
    debito: number;
  };
  metricas: {
    pago: number;
    gastos: number;
    lucro: number;
  };
  mesFiltro: string;
}

export function BalancoResumo({ resumoMetodos, metricas, mesFiltro }: BalancoResumoProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '30px' }}>
      
      {/* Resumo por Método */}
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '15px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '15px' }}>Recebido por Método ({mesFiltro})</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {Object.entries(resumoMetodos).map(([key, val]) => (
            <div key={key} style={{ padding: '10px', backgroundColor: '#f9fafb', borderRadius: '10px' }}>
              <p style={{ fontSize: '10px', color: '#6b7280', margin: 0, textTransform: 'uppercase' }}>{key}</p>
              <p style={{ fontWeight: 'bold', color: '#10b981' }}>R$ {val.toLocaleString('pt-BR')}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Gráfico de Balanço Geral */}
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '15px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '20px' }}>📊 Balanço Geral ({mesFiltro})</h2>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '20px', height: '120px', justifyContent: 'center' }}>
          <div title="Receita" style={{ width: '40px', height: `${(metricas.pago / (Math.max(metricas.pago, metricas.gastos, 1))) * 100}px`, backgroundColor: '#10b981', borderRadius: '5px' }} />
          <div title="Gastos" style={{ width: '40px', height: `${(metricas.gastos / (Math.max(metricas.pago, metricas.gastos, 1))) * 100}px`, backgroundColor: '#ef4444', borderRadius: '5px' }} />
          <div title="Lucro" style={{ width: '40px', height: `${(Math.max(0, metricas.lucro) / (Math.max(metricas.pago, metricas.gastos, 1))) * 100}px`, backgroundColor: '#2563eb', borderRadius: '5px' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '10px', fontSize: '10px', fontWeight: 'bold' }}>
          <span>RECEITA</span><span>GASTOS</span><span>LUCRO</span>
        </div>
      </div>

    </div>
  );
}