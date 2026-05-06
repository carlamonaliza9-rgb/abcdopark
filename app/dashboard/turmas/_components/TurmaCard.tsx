"use client";

interface TurmaCardProps {
  turma: any;
  ehAdmin: boolean;
  onAbrirTurma: (turma: any) => void;
  onEditarProfessor: (e: React.MouseEvent, nomeTurma: string) => void;
  onAbrirUploadHorario: (e: React.MouseEvent, turma: any) => void;
}

export function TurmaCard({ turma, ehAdmin, onAbrirTurma, onEditarProfessor, onAbrirUploadHorario }: TurmaCardProps) {
  return (
    <div 
      onClick={() => onAbrirTurma(turma)} 
      style={{ 
        backgroundColor: turma.cor || '#ffffff', 
        border: `2px solid ${turma.borda || '#eee'}`, 
        borderRadius: '24px', 
        padding: '25px', 
        textAlign: 'center', 
        cursor: 'pointer', 
        position: 'relative', 
        boxShadow: '0 4px 6px rgba(0,0,0,0.02)' 
      }}
    >
      <div style={{ fontSize: '45px', marginBottom: '10px' }}>{turma.icone || '🏫'}</div>
      <h3 style={{ fontSize: '22px', fontWeight: '800', color: turma.texto || '#111827' }}>{turma.nome}</h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', margin: '10px 0' }}>
          {ehAdmin ? (
            <>
              <button 
                onClick={(e) => onEditarProfessor(e, turma.nome)} 
                style={{ fontSize: '12px', color: turma.texto, background: 'white', border: `1px solid ${turma.borda}`, padding: '6px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
              >
                👤 Prof: {turma.professor || "Não definido"} ✏️
              </button>
              <button 
                onClick={(e) => onAbrirUploadHorario(e, turma)} 
                style={{ fontSize: '12px', color: turma.texto, background: 'white', border: `1px solid ${turma.borda}`, padding: '6px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
              >
                📅 {turma.horario_url ? "Trocar Horário" : "Definir Horário"}
              </button>
            </>
          ) : (
            <span style={{ fontSize: '12px', color: turma.texto, background: 'rgba(255,255,255,0.5)', border: `1px solid ${turma.borda}`, padding: '6px', borderRadius: '8px', fontWeight: '600' }}>
              👤 Prof: {turma.professor || "Não definido"}
            </span>
          )}
      </div>

      <div style={{ backgroundColor: 'white', padding: '8px 15px', borderRadius: '12px', fontSize: '13px', fontWeight: 'bold', color: '#4b5563' }}>
        👥 {turma.totalAlunos || 0} Alunos
      </div>
    </div>
  );
}