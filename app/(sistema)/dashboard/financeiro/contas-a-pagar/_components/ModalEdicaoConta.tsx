"use client";

interface ModalEdicaoContaProps {
  aberto: boolean;
  contaEmEdicao: any;
  editDescricao: string;
  setEditDescricao: (val: string) => void;
  editValor: string;
  setEditValor: (val: string) => void;
  editVencimento: string;
  setEditVencimento: (val: string) => void;
  editAplicarATodas: boolean;
  setEditAplicarATodas: (val: boolean) => void;
  onSalvar: (e: React.FormEvent) => void;
  onFechar: () => void;
}

export function ModalEdicaoConta({
  aberto,
  contaEmEdicao,
  editDescricao, setEditDescricao,
  editValor, setEditValor,
  editVencimento, setEditVencimento,
  editAplicarATodas, setEditAplicarATodas,
  onSalvar,
  onFechar
}: ModalEdicaoContaProps) {
  
  if (!aberto || !contaEmEdicao) return null;

  return (
    <div 
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}
      onClick={onFechar}
    >
      <div 
        style={{ backgroundColor: 'white', padding: '30px', borderRadius: '24px', width: '90%', maxWidth: '400px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 20px', fontSize: '20px' }}>Editar Conta</h3>
        
        <form onSubmit={onSalvar} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>DESCRIÇÃO</label>
            <input value={editDescricao} onChange={e => setEditDescricao(e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none' }} />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>VALOR (R$)</label>
            <input type="number" step="0.01" min="0" value={editValor} onChange={e => setEditValor(e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none' }} />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>VENCIMENTO</label>
            <input type="date" value={editVencimento} onChange={e => setEditVencimento(e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none' }} />
          </div>
          
          {contaEmEdicao.is_recorrente && (
            <div style={{ marginTop: '5px', backgroundColor: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={editAplicarATodas} 
                  onChange={(e) => setEditAplicarATodas(e.target.checked)} 
                  style={{ marginTop: '3px', width: '16px', height: '16px' }} 
                />
                <div>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', display: 'block' }}>Aplicar o novo VALOR a todas as parcelas</span>
                  <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '2px' }}>As datas de vencimento serão mantidas intactas.</span>
                </div>
              </label>
            </div>
          )}
          
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button type="button" onClick={onFechar} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #e5e7eb', backgroundColor: 'transparent', fontWeight: 'bold', cursor: 'pointer' }}>Cancelar</button>
            <button type="submit" style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', backgroundColor: '#2563eb', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Salvar</button>
          </div>
        </form>

      </div>
    </div>
  );
}