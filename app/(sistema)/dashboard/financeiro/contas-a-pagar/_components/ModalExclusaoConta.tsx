"use client";

interface ModalExclusaoContaProps {
  aberto: boolean;
  contaParaExcluir: any;
  onProcessarExclusao: (id: string, excluirTodas: boolean, grupoId?: string, baseDescricao?: string) => void;
  onFechar: () => void;
}

export function ModalExclusaoConta({ aberto, contaParaExcluir, onProcessarExclusao, onFechar }: ModalExclusaoContaProps) {
  if (!aberto || !contaParaExcluir) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
      <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '24px', width: '90%', maxWidth: '400px', textAlign: 'center' }}>
        <h3 style={{ margin: '0 0 15px', fontSize: '20px', color: '#111827' }}>Excluir Conta</h3>
        <p style={{ color: '#4b5563', marginBottom: '25px', fontSize: '14px' }}>
          A conta <strong>{contaParaExcluir.descricao}</strong> faz parte de uma recorrência. Como deseja prosseguir?
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button 
            onClick={() => onProcessarExclusao(contaParaExcluir.id, false)} 
            style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: 'white', color: '#111827', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Excluir APENAS esta parcela
          </button>
          <button 
            onClick={() => onProcessarExclusao(contaParaExcluir.id, true, contaParaExcluir.grupo_id, contaParaExcluir.descricao)} 
            style={{ padding: '14px', borderRadius: '12px', border: 'none', backgroundColor: '#ef4444', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Excluir TODAS as parcelas
          </button>
          <button 
            onClick={onFechar} 
            style={{ marginTop: '10px', padding: '10px', background: 'none', border: 'none', color: '#6b7280', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}