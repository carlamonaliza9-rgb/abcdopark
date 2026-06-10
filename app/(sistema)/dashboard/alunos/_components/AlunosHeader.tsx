"use client";

interface AlunosHeaderProps {
  busca: string;
  setBusca: (val: string) => void;
  ehVisitante: boolean;
  onNovoAluno: () => void;
}

export function AlunosHeader({ busca, setBusca, ehVisitante, onNovoAluno }: AlunosHeaderProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
      <div>
        <h1 style={{ fontSize: 'clamp(20px, 5vw, 26px)', fontWeight: 'bold', color: '#111827', margin: 0 }}>Alunos</h1>
        <p style={{ fontSize: '14px', color: '#6b7280' }}>Gestão ABC DO PARK</p>
      </div>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <input 
          type="text" 
          placeholder="🔍 Pesquisar aluno..." 
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={{ padding: '10px 15px', borderRadius: '10px', border: '1px solid #e5e7eb', outline: 'none', fontSize: '14px', width: 'clamp(150px, 20vw, 250px)' }}
        />
        {!ehVisitante && (
          <button onClick={onNovoAluno} 
            style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
            + NOVO ALUNO
          </button>
        )}
      </div>
    </div>
  );
}