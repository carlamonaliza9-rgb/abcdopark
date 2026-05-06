"use client";

interface FinanceiroHeaderProps {
  mesFiltro: string;
  setMesFiltro: (val: string) => void;
  onNovoEvento: () => void;
  onRegistrarGasto: () => void;
  onZerarMes: () => void;
  valorPadrao: number;
  setValorPadrao: (val: number) => void;
  editandoValor: boolean;
  setEditandoValor: (val: boolean) => void;
  senhaMestra: string;
}

export function FinanceiroHeader({
  mesFiltro,
  setMesFiltro,
  onNovoEvento,
  onRegistrarGasto,
  onZerarMes,
  valorPadrao,
  setValorPadrao,
  editandoValor,
  setEditandoValor,
  senhaMestra
}: FinanceiroHeaderProps) {
  
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
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
      <header>
        <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#1f2937' }}>Financeiro ABC DO PARK</h1>
        <div style={{ marginTop: '10px' }}>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#6b7280', marginRight: '10px' }}>VISUALIZAR MÊS:</label>
          <input 
            type="month" 
            value={mesFiltro} 
            onChange={(e) => setMesFiltro(e.target.value)} 
            style={{ border: '1px solid #ddd', padding: '5px 10px', borderRadius: '8px', fontWeight: 'bold' }} 
          />
        </div>
      </header>
      
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <button onClick={onNovoEvento} style={{ ...estiloBtnReduzido, padding: '12px 15px', backgroundColor: '#8b5cf6', color: 'white' }}>🎟️ NOVO EVENTO</button>
        <button onClick={() => window.print()} style={{ ...estiloBtnReduzido, padding: '12px 15px', backgroundColor: '#2563eb', color: 'white' }}>📄 PDF</button>
        <button onClick={onRegistrarGasto} style={{ ...estiloBtnReduzido, padding: '12px 15px', backgroundColor: '#ef4444', color: 'white' }}>- GASTO</button>
        <button onClick={onZerarMes} style={{ ...estiloBtnReduzido, padding: '12px 15px', backgroundColor: '#374151', color: 'white' }}>🔄 ZERAR MÊS</button>
        
        <div style={{ backgroundColor: 'white', padding: '10px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
          <button 
            onClick={() => { if(prompt("Senha:") === senhaMestra) setEditandoValor(!editandoValor); }} 
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            {editandoValor ? "🔓" : "🔒"}
          </button>
          <input 
            type="number" 
            value={valorPadrao} 
            disabled={!editandoValor} 
            onChange={(e) => setValorPadrao(Number(e.target.value))} 
            style={{ width: '60px', border: 'none', textAlign: 'center', fontWeight: 'bold' }} 
          />
        </div>
      </div>
    </div>
  );
}