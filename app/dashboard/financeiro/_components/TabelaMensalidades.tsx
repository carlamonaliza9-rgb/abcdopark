"use client";

interface TabelaMensalidadesProps {
  alunos: any[];
  filtroNome: string;
  setFiltroNome: (nome: string) => void;
  onPagamento: (aluno: any) => void;
  onCobrar: (aluno: any) => void;
  onDesfazer: (alunoId: string) => void;
}

export function TabelaMensalidades({ 
  alunos, 
  filtroNome, 
  setFiltroNome, 
  onPagamento, 
  onCobrar, 
  onDesfazer 
}: TabelaMensalidadesProps) {
  
  const estiloBtnReduzido = { 
    padding: '4px 10px', 
    borderRadius: '8px', 
    fontSize: '10px', 
    fontWeight: 'bold' as 'bold', 
    border: 'none', 
    cursor: 'pointer', 
    display: 'inline-block' 
  };

  return (
    <div style={{ backgroundColor: 'white', borderRadius: '15px', padding: '20px', marginBottom: '30px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>Status de Pagamento (Mensalidades)</h2>
        <input 
          type="text" 
          placeholder="🔍 Pesquisar aluno..." 
          value={filtroNome} 
          onChange={(e) => setFiltroNome(e.target.value)} 
          style={{ padding: '8px 15px', borderRadius: '10px', border: '1px solid #ddd', width: '250px' }} 
        />
      </div>
      
      {/* ALTERAÇÃO: Removido maxHeight e overflowY para eliminar a rolagem interna do card */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ position: 'sticky', top: 0, backgroundColor: 'white' }}>
            <tr style={{ fontSize: '12px', color: '#6b7280', borderBottom: '2px solid #f3f4f6' }}>
              <th style={{ padding: '12px' }}>ALUNO</th>
              <th>VALOR</th>
              <th style={{ textAlign: 'center' }}>VENC.</th>
              <th style={{ textAlign: 'center' }}>STATUS</th>
              <th style={{ textAlign: 'center' }}>AÇÕES</th>
            </tr>
          </thead>
          <tbody>
            {alunos.map((aluno) => (
              <tr key={aluno.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '12px', fontWeight: 'bold', color: '#1f2937' }}>{aluno.nome}</td>
                <td style={{ padding: '12px' }}>R$ {aluno.valor?.toLocaleString('pt-BR')}</td>
                <td style={{ textAlign: 'center' }}>{aluno.vencimento}</td>
                <td style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                    <span style={{ 
                      ...estiloBtnReduzido, 
                      backgroundColor: aluno.status === 'pago' ? '#dcfce7' : (aluno.status === 'atrasado' ? '#ef4444' : '#fee2e2'), 
                      color: aluno.status === 'pago' ? '#166534' : (aluno.status === 'atrasado' ? 'white' : '#991b1b') 
                    }}>
                      {aluno.status?.toUpperCase() || 'PENDENTE'}
                    </span>
                    {aluno.status === 'pago' && (
                      <button onClick={() => onDesfazer(aluno.id)} title="Desfazer Baixa" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>↩️</button>
                    )}
                  </div>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                    <button onClick={() => onPagamento(aluno)} style={{ ...estiloBtnReduzido, backgroundColor: '#2563eb', color: 'white' }}>+ PGTO</button>
                    {aluno.status !== 'pago' && (
                      <button onClick={() => onCobrar(aluno)} style={{ ...estiloBtnReduzido, backgroundColor: '#10b981', color: 'white' }} title="Cobrar no WhatsApp">COBRAR</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}