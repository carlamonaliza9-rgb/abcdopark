"use client";

interface ModalDetalhesTurmaProps {
  turma: any;
  onClose: () => void;
  onAbrirFichaAluno: (aluno: any) => void;
}

export function ModalDetalhesTurma({ turma, onClose, onAbrirFichaAluno }: ModalDetalhesTurmaProps) {
  if (!turma) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '24px', width: '90%', maxWidth: '550px', maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <div style={{ backgroundColor: turma.cor, padding: '20px', textAlign: 'center' }}>
          <h2 style={{ margin: 0, color: turma.texto }}>{turma.nome}</h2>
          <button onClick={onClose} style={{ position: 'absolute', top: 15, right: 15, background: 'white', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>✕</button>
        </div>
        
        <div style={{ padding: '25px', overflowY: 'auto' }}>
          <div style={{ marginBottom: '25px' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>📅 Quadro de Horários</h4>
            {turma.horario_url ? (
              <div style={{ border: '2px solid #f1f5f9', borderRadius: '16px', overflow: 'hidden', backgroundColor: '#f8fafc' }}>
                <img src={turma.horario_url} alt="Horário Escolar" style={{ width: '100%', height: 'auto', display: 'block' }} />
              </div>
            ) : (
              <div style={{ padding: '20px', borderRadius: '16px', background: '#f8fafc', border: '2px dashed #e2e8f0', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>Nenhum horário cadastrado para esta turma.</p>
              </div>
            )}
          </div>

          <h4 style={{ fontSize: '14px', color: '#64748b', marginBottom: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>👥 Alunos da Turma</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {turma.alunos?.map((aluno: any) => (
              <div key={aluno.id} onClick={() => onAbrirFichaAluno(aluno)} style={{ padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: '12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #f1f5f9' }}>
                <span style={{ fontWeight: 'bold', color: '#1f2937' }}>{aluno.nome}</span>
                <div style={{ fontSize: '18px' }}>
                  {aluno.e_autista && "🧩"} {aluno.tem_alergia && "⚠️"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}