"use client";

interface TurmaCardProps {
  turma: any;
  ehAdmin: boolean;
  onAbrirTurma: (turma: any) => void;
  onEditarProfessor: (e: React.MouseEvent, nomeTurma: string) => void;
  onGerenciarMaterias: (e: React.MouseEvent, nomeTurma: string) => void; // Prop necessária para limpar o erro
  onAbrirUploadHorario: (e: React.MouseEvent, turma: any) => void;
  onAbrirAgenda: (e: React.MouseEvent, turma: any) => void;
}

export function TurmaCard({ 
  turma, 
  ehAdmin, 
  onAbrirTurma, 
  onEditarProfessor, 
  onGerenciarMaterias, 
  onAbrirUploadHorario, 
  onAbrirAgenda 
}: TurmaCardProps) {
  // Lógica para decidir o que exibir no campo de professores fixos
  const exibirProfessoresFixos = () => {
    if (!turma.profFixo1 && !turma.profFixo2) return "Não definido";
    if (turma.profFixo1 && !turma.profFixo2) return turma.profFixo1;
    if (!turma.profFixo1 && turma.profFixo2) return turma.profFixo2;
    return `${turma.profFixo1} / ${turma.profFixo2}`;
  };

  // Lógica para professores especialistas
  const temEspecialistas = turma.profEspec1 || turma.profEspec2;
  const exibirEspecialistas = () => {
    const lista = [turma.profEspec1, turma.profEspec2].filter(p => p !== "" && p !== null);
    return lista.join(" / ");
  };

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
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', margin: '15px 0' }}>
          {ehAdmin ? (
            <>
              <button 
                onClick={(e) => onEditarProfessor(e, turma.nome)} 
                style={{ 
                  fontSize: '11px', 
                  color: turma.texto, 
                  background: 'white', 
                  border: `1px solid ${turma.borda}`, 
                  padding: '10px', 
                  borderRadius: '12px', 
                  fontWeight: '600', 
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    👤 {exibirProfessoresFixos()}
                  </span>
                  <span style={{ fontSize: '10px' }}>✏️</span>
                </div>
                
                {temEspecialistas && (
                  <div style={{ 
                    fontSize: '10px', 
                    opacity: 0.7, 
                    borderTop: `1px solid ${turma.borda}44`, 
                    marginTop: '4px', 
                    paddingTop: '6px',
                    color: '#4b5563'
                  }}>
                    ⭐ {exibirEspecialistas()}
                  </div>
                )}
              </button>

              {/* BOTÃO DE GESTÃO DE MATÉRIAS */}
              <button 
                onClick={(e) => onGerenciarMaterias(e, turma.nome)} 
                style={{ fontSize: '12px', color: turma.texto, background: 'white', border: `1px solid ${turma.borda}`, padding: '6px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
              >
                📚 Grade de Matérias
              </button>

              <button 
                onClick={(e) => onAbrirUploadHorario(e, turma)} 
                style={{ fontSize: '12px', color: turma.texto, background: 'white', border: `1px solid ${turma.borda}`, padding: '6px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
              >
                📅 {turma.horario_url ? "Trocar Horário" : "Definir Horário"}
              </button>

              <button 
                onClick={(e) => onAbrirAgenda(e, turma)} 
                style={{ fontSize: '12px', color: turma.texto, background: 'white', border: `1px solid ${turma.borda}`, padding: '6px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
              >
                📝 Agenda Escolar
              </button>
            </>
          ) : (
            <>
              <div style={{ 
                fontSize: '11px', 
                color: turma.texto, 
                background: 'rgba(255,255,255,0.5)', 
                border: `1px solid ${turma.borda}`, 
                padding: '10px', 
                borderRadius: '12px', 
                fontWeight: '600',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                <span>👤 {exibirProfessoresFixos()}</span>
                
                {temEspecialistas && (
                  <div style={{ 
                    fontSize: '10px', 
                    opacity: 0.8, 
                    borderTop: `1px solid ${turma.borda}44`, 
                    marginTop: '4px', 
                    paddingTop: '6px' 
                  }}>
                    ⭐ {exibirEspecialistas()}
                  </div>
                )}
              </div>

              <button 
                onClick={(e) => onAbrirAgenda(e, turma)} 
                style={{ fontSize: '12px', color: turma.texto, background: 'white', border: `1px solid ${turma.borda}`, padding: '6px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', marginTop: '2px' }}
              >
                📝 Agenda Escolar
              </button>
            </>
          )}
      </div>

      <div style={{ backgroundColor: 'white', padding: '8px 15px', borderRadius: '12px', fontSize: '13px', fontWeight: 'bold', color: '#4b5563' }}>
        👥 {turma.totalAlunos || 0} Alunos
      </div>
    </div>
  );
}