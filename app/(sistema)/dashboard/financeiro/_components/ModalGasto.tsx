"use client";

interface ModalGastoProps {
  aberto: boolean;
  onFechar: () => void;
  dataGasto: string;
  setDataGasto: (val: string) => void;
  descGasto: string;
  setDescGasto: (val: string) => void;
  valorGasto: string;
  setValorGasto: (val: string) => void;
  onAdicionar: () => void;
}

export function ModalGasto({ aberto, onFechar, dataGasto, setDataGasto, descGasto, setDescGasto, valorGasto, setValorGasto, onAdicionar }: ModalGastoProps) {
  if (!aberto) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
      <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '20px', width: '400px' }}>
        <h2 style={{ marginBottom: '20px' }}>Registrar Gasto</h2>
        <div style={{ marginBottom: '15px' }}><label style={{ fontSize: '10px', fontWeight: 'bold' }}>DATA DO GASTO:</label><input type="date" value={dataGasto} onChange={(e) => setDataGasto(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }} /></div>
        <input type="text" placeholder="Descrição" value={descGasto} onChange={(e)=>setDescGasto(e.target.value)} style={{width:'100%', padding:'10px', marginBottom:'10px', borderRadius: '8px', border: '1px solid #ddd'}} />
        <input type="number" placeholder="Valor" value={valorGasto} onChange={(e)=>setValorGasto(e.target.value)} style={{width:'100%', padding:'10px', marginBottom:'20px', borderRadius: '8px', border: '1px solid #ddd'}} />
        <button onClick={onAdicionar} style={{width:'100%', padding:'10px', backgroundColor:'#ef4444', color:'white', borderRadius:'8px', border:'none', fontWeight: 'bold'}}>SALVAR GASTO</button>
        <button onClick={onFechar} style={{width:'100%', marginTop:'10px', background:'none', border:'none', cursor: 'pointer'}}>VOLTAR</button>
      </div>
    </div>
  );
}