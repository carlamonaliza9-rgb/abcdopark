"use client";

interface ModalEventoProps {
  aberto: boolean;
  onFechar: () => void;
  idEventoEdicao: string | null;
  nomeEvento: string;
  setNomeEvento: (val: string) => void;
  valorEvento: string;
  setValorEvento: (val: string) => void;
  alunos: any[];
  alunosSelecionados: string[];
  toggleAlunoSelecao: (id: string) => void;
  toggleSelecionarTodos: () => void;
  onSalvar: () => void;
}

export function ModalEvento({ aberto, onFechar, idEventoEdicao, nomeEvento, setNomeEvento, valorEvento, setValorEvento, alunos, alunosSelecionados, toggleAlunoSelecao, toggleSelecionarTodos, onSalvar }: ModalEventoProps) {
  if (!aberto) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
      <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '24px', width: '95%', maxWidth: '500px' }}>
        <h2 style={{textAlign:'center', marginBottom:'20px'}}>{idEventoEdicao ? "✏️ Editar Evento" : "🎟️ Novo Evento"}</h2>
        <input type="text" placeholder="Nome" value={nomeEvento} onChange={(e)=>setNomeEvento(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '10px', border: '1px solid #ddd' }} />
        <input type="number" placeholder="Valor" value={valorEvento} onChange={(e)=>setValorEvento(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '10px', border: '1px solid #ddd' }} />
        {!idEventoEdicao && (
          <div style={{ maxHeight: '180px', overflowY: 'auto', marginBottom: '20px', border: '1px solid #eee', padding: '10px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, borderBottom: '1px solid #eee', paddingBottom: 5 }}>
              <p style={{fontSize: 10, fontWeight: 'bold', color: '#666', margin: 0}}>SELECIONE PARTICIPANTES:</p>
              <button onClick={toggleSelecionarTodos} style={{ background: '#f3f4f6', border: 'none', padding: '2px 8px', borderRadius: 4, fontSize: 10, cursor: 'pointer', fontWeight: 'bold' }}>
                {alunosSelecionados.length === alunos.length ? "DESELECIONAR TODOS" : "SELECIONAR TODOS"}
              </button>
            </div>
            {alunos.map(aluno => (
              <label key={aluno.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '5px', cursor: 'pointer' }}>
                <input type="checkbox" checked={alunosSelecionados.includes(aluno.id)} onChange={() => toggleAlunoSelecao(aluno.id)} />
                <span style={{fontSize: 13}}>{aluno.nome}</span>
              </label>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: '10px' }}><button onClick={onFechar} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #ddd' }}>CANCELAR</button><button onClick={onSalvar} style={{ flex: 1, padding: '12px', borderRadius: '10px', backgroundColor: '#8b5cf6', color: 'white', fontWeight: 'bold' }}>SALVAR</button></div>
      </div>
    </div>
  );
}