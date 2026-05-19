"use client";

interface TurmaCardProps {
  turma: any;
  ehAdmin: boolean;
  onAbrirTurma: (turma: any) => void;
  onEditarProfessor: (e: React.MouseEvent, nomeTurma: string) => void;
  onGerenciarMaterias: (e: React.MouseEvent, nomeTurma: string) => void;
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

  const listaEspecialistas = [turma.profEspec1, turma.profEspec2].filter(p => p !== "" && p !== null);

  // Estilo de bloco para o nome do professor (Fundo branco translúcido)
  const styleBlocoNome = {
    background: 'rgba(255, 255, 255, 0.6)',
    padding: '8px 12px',
    borderRadius: '10px',
    border: '1px solid rgba(255, 255, 255, 0.8)',
    fontSize: '11px',
    color: '#334155',
    fontWeight: '700',
    textAlign: 'left' as const,
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
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
        boxShadow: '0 4px 6px rgba(0,0,0,0.02)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '360px',
        transition: 'all 0.2s ease-in-out'
      }}
      className="hover:shadow-lg"
    >
      <div>
        {/* Cabeçalho */}
        <div style={{ fontSize: '45px', marginBottom: '8px' }}>{turma.icone || '🏫'}</div>
        <h3 style={{ fontSize: '20px', fontWeight: '800', color: turma.texto || '#111827', margin: '0 0 10px 0' }}>
          {turma.nome}
        </h3>
        
        <div style={{ backgroundColor: 'white', padding: '5px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold', color: '#64748b', display: 'inline-block', marginBottom: '15px', border: '1px solid #f1f5f9' }}>
          👥 {turma.totalAlunos || 0} Alunos
        </div>

        {/* Blocos de Professores Individuais */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {!turma.profFixo1 && !turma.profFixo2 && (
            <div style={{ ...styleBlocoNome, justifyContent: 'center', color: '#94a3b8' }}>👤 Regência: Não definido</div>
          )}
          
          {turma.profFixo1 && (
            <div style={styleBlocoNome}><span>👤</span> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>Regência: {turma.profFixo1}</span></div>
          )}
          
          {turma.profFixo2 && (
            <div style={styleBlocoNome}><span>👥</span> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>Auxiliar: {turma.profFixo2}</span></div>
          )}
          
          {listaEspecialistas.map((especialista, idx) => (
            <div key={idx} style={{ ...styleBlocoNome, borderStyle: 'dashed' }}>
              <span>⭐</span> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>Esp: {especialista}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Rodapé: Botões de ícones alinhados à direita */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.3)', paddingTop: '12px', marginTop: '15px' }}>
        {ehAdmin ? (
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={(e) => { e.stopPropagation(); onEditarProfessor(e, turma.nome); }} title="Vincular Professores" style={{ padding: '7px 10px', background: 'white', border: `1px solid ${turma.borda}`, borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>👨‍🏫</button>
            <button onClick={(e) => { e.stopPropagation(); onGerenciarMaterias(e, turma.nome); }} title="Grade de Matérias" style={{ padding: '7px 10px', background: 'white', border: `1px solid ${turma.borda}`, borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>📚</button>
            <button onClick={(e) => { e.stopPropagation(); onAbrirUploadHorario(e, turma); }} title="Quadro de Horários" style={{ padding: '7px 10px', background: 'white', border: `1px solid ${turma.borda}`, borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>📅</button>
            <button onClick={(e) => { e.stopPropagation(); onAbrirAgenda(e, turma); }} title="Agenda Escolar" style={{ padding: '7px 10px', background: 'white', border: `1px solid ${turma.borda}`, borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>📝</button>
          </div>
        ) : (
          <button onClick={(e) => { e.stopPropagation(); onAbrirAgenda(e, turma); }} style={{ padding: '6px 12px', background: 'white', border: `1px solid ${turma.borda}`, borderRadius: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>📝 Ver Agenda</button>
        )}
      </div>
    </div>
  );
}