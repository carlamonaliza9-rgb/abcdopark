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
  // 1. Tratamento rigoroso para garantir que nada chegue como NaN ou Undefined
  const pago = Number(metricas?.pago) || 0;
  const gastos = Number(metricas?.gastos) || 0;
  const lucro = Number(metricas?.lucro) || 0;

  // 2. Calcula o teto dinâmico: pega a maior barra e adiciona 15% de espaço no topo
  const maiorValor = Math.max(pago, gastos, lucro > 0 ? lucro : 0, 100); 
  const teto = maiorValor * 1.15;

  // 3. Alturas estritamente em % com base no teto dinâmico
  const hReceita = (pago / teto) * 100;
  const hGastos = (gastos / teto) * 100;
  const hLucro = lucro > 0 ? (lucro / teto) * 100 : 0;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '30px' }}>
      
      {/* Resumo por Método */}
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '15px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '15px' }}>Recebido por Método ({mesFiltro})</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {Object.entries(resumoMetodos).map(([key, val]) => (
            <div key={key} style={{ padding: '10px', backgroundColor: '#f9fafb', borderRadius: '10px' }}>
              <p style={{ fontSize: '10px', color: '#6b7280', margin: 0, textTransform: 'uppercase' }}>{key}</p>
              <p style={{ fontWeight: 'bold', color: '#10b981' }}>R$ {(val || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Gráfico de Balanço Geral */}
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '15px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '20px' }}>📊 Balanço Geral ({mesFiltro})</h2>
        
        {/* Container do Gráfico (Altura fixa, barras crescem de baixo para cima) */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '40px', height: '140px', justifyContent: 'center', borderBottom: '1px solid #e5e7eb', paddingBottom: '5px' }}>
          
          {/* Barra Receita */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#1f2937' }}>R$ {pago.toLocaleString('pt-BR', {maximumFractionDigits:0})}</span>
            <div title="Receita" style={{ width: '45px', height: `${hReceita}%`, minHeight: '4px', backgroundColor: '#10b981', borderRadius: '5px 5px 0 0', transition: 'height 0.5s ease' }} />
          </div>

          {/* Barra Gastos */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#1f2937' }}>R$ {gastos.toLocaleString('pt-BR', {maximumFractionDigits:0})}</span>
            <div title="Gastos" style={{ width: '45px', height: `${hGastos}%`, minHeight: '4px', backgroundColor: '#ef4444', borderRadius: '5px 5px 0 0', transition: 'height 0.5s ease' }} />
          </div>

          {/* Barra Lucro */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#1f2937' }}>R$ {lucro.toLocaleString('pt-BR', {maximumFractionDigits:0})}</span>
            <div title="Lucro" style={{ width: '45px', height: `${hLucro}%`, minHeight: '4px', backgroundColor: '#3b82f6', borderRadius: '5px 5px 0 0', transition: 'height 0.5s ease' }} />
          </div>

        </div>

        {/* Legendas */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', marginTop: '10px', fontSize: '10px', fontWeight: '900', color: '#6b7280' }}>
          <span style={{ width: '45px', textAlign: 'center' }}>RECEITA</span>
          <span style={{ width: '45px', textAlign: 'center' }}>GASTOS</span>
          <span style={{ width: '45px', textAlign: 'center' }}>LUCRO</span>
        </div>
      </div>

    </div>
  );
}