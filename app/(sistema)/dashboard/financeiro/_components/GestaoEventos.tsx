"use client";

interface GestaoEventosProps {
  eventosAtivos: any[];
  eventoParaGerenciar: any;
  setEventoParaGerenciar: (evento: any) => void;
  alunos: any[];
  historicoPagamentosEventos: any[];
  onEditarEvento: (evento: any) => void;
  onExcluirEvento: (id: string) => void;
  onGerarPDF: () => void;
  onAtualizarParticipante: (alunoId: string, estaParticipando: boolean) => void;
  onAbrirPagamento: (aluno: any, evento: any, pgtoExistente?: any) => void;
  onExcluirPagamento: (id: string) => void;
}

export function GestaoEventos({
  eventosAtivos,
  eventoParaGerenciar,
  setEventoParaGerenciar,
  alunos,
  historicoPagamentosEventos,
  onEditarEvento,
  onExcluirEvento,
  onGerarPDF,
  onAtualizarParticipante,
  onAbrirPagamento,
  onExcluirPagamento
}: GestaoEventosProps) {
  
  const estiloBtnReduzido = { padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold' as 'bold', border: 'none', cursor: 'pointer', display: 'inline-block' };

  return (
    <div style={{ borderTop: '2px solid #e5e7eb', paddingTop: '30px', paddingBottom: '50px' }}>
      <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '20px', color: '#1f2937' }}>Gestão de Eventos</h2>
      
      {/* Lista de Eventos Ativos */}
      <div style={{ display: 'flex', gap: '15px', overflowX: 'auto', marginBottom: '20px' }}>
        {eventosAtivos.map(ev => (
          <div 
            key={ev.id} 
            onClick={() => setEventoParaGerenciar(ev)} 
            style={{ 
              minWidth: '220px', 
              backgroundColor: 'white', 
              padding: '15px', 
              borderRadius: '15px', 
              border: eventoParaGerenciar?.id === ev.id ? '2px solid #7c3aed' : '2px solid #ddd6fe', 
              position: 'relative', 
              cursor: 'pointer' 
            }}
          >
            <div style={{ position: 'absolute', top: 8, right: 8 }}>
              <button onClick={(e) => { e.stopPropagation(); onEditarEvento(ev); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✏️</button>
              <button onClick={(e) => { e.stopPropagation(); onExcluirEvento(ev.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>🗑️</button>
            </div>
            <h3 style={{ margin: 0, fontSize: '15px', color: '#7c3aed' }}>{ev.nome}</h3>
            <p style={{ margin: 0, fontSize: '12px' }}>R$ {ev.valor_unitario}</p>
          </div>
        ))}
      </div>

      {/* Tabela do Evento Selecionado */}
      {eventoParaGerenciar && (
        <div style={{ backgroundColor: 'white', borderRadius: '15px', padding: '20px', border: '2px solid #7c3aed' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#7c3aed' }}>{eventoParaGerenciar.nome}</h2>
            <button onClick={onGerarPDF} style={{ ...estiloBtnReduzido, backgroundColor: '#2563eb', color: 'white' }}>📄 PDF LISTA</button>
          </div>
          <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: '#6b7280', borderBottom: '1px solid #eee' }}>
                <th style={{ textAlign: 'left', paddingBottom: '10px' }}>ALUNO</th>
                <th style={{ paddingBottom: '10px' }}>PARTICIPAÇÃO</th>
                <th style={{ paddingBottom: '10px' }}>STATUS</th>
                <th style={{ paddingBottom: '10px' }}>AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {alunos.map(aluno => {
                const part = eventoParaGerenciar.participantes?.includes(aluno.id);
                const pgto = historicoPagamentosEventos.find(p => p.aluno_id === aluno.id && p.descricao.includes(eventoParaGerenciar.nome));
                
                return (
                  <tr key={aluno.id} style={{ opacity: part ? 1 : 0.5, borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '8px', fontWeight: 'bold' }}>{aluno.nome}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        onClick={() => onAtualizarParticipante(aluno.id, !part)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}
                      >
                        {part ? "✅" : "NÃO"}
                      </button>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: part ? 'bold' : 'normal', color: pgto ? '#10b981' : '#6b7280' }}>
                      {part ? (pgto ? "PAGO" : "PENDENTE") : "-"}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
                        {part && !pgto && (
                          <button onClick={() => onAbrirPagamento(aluno, eventoParaGerenciar)} style={{ ...estiloBtnReduzido, backgroundColor: '#8b5cf6', color: 'white' }}>+ PGTO</button>
                        )}
                        {pgto && (
                          <>
                            <button onClick={() => onAbrirPagamento(aluno, eventoParaGerenciar, pgto)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✏️</button>
                            <button onClick={() => onExcluirPagamento(pgto.id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>🗑️</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}