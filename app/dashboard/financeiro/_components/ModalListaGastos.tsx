"use client";

interface ModalListaGastosProps {
  aberto: boolean;
  onFechar: () => void;
  mesFiltro: string;
  listaGastos: any[];
}

export function ModalListaGastos({ aberto, onFechar, mesFiltro, listaGastos }: ModalListaGastosProps) {
  if (!aberto) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
      <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '20px', width: '95%', maxWidth: '700px', maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>Gastos de {mesFiltro}</h2>
          <button onClick={onFechar} style={{ fontSize: '24px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>&times;</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead style={{ backgroundColor: '#f9fafb', position: 'sticky', top: 0 }}>
              <tr style={{ color: '#6b7280', borderBottom: '2px solid #f3f4f6' }}><th>DESCRIÇÃO</th><th>DATA</th><th>VALOR</th></tr>
            </thead>
            <tbody>
              {listaGastos.map(g => (
                <tr key={g.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px' }}>{g.descricao}</td>
                  <td>{new Date(g.data_gasto).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</td>
                  <td style={{ color: '#b91c1c', fontWeight: 'bold' }}>R$ {parseFloat(g.valor).toLocaleString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}