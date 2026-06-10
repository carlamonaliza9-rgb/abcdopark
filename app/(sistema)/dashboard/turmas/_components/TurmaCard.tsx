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

export function TurmaCard({ turma, ehAdmin, onAbrirTurma, onEditarProfessor, onGerenciarMaterias, onAbrirUploadHorario, onAbrirAgenda }: TurmaCardProps) {
  
  // Função para pegar Primeiro e Último Nome
  const primeiroUltimo = (nomeCompleto: string) => {
    if (!nomeCompleto) return "";
    const partes = nomeCompleto.trim().split(" ");
    if (partes.length <= 1) return partes[0];
    return `${partes[0]} ${partes[partes.length - 1]}`;
  };

  const styleBloco = (label: string, nome: string, cor: string) => ({
    background: 'rgba(255, 255, 255, 0.7)',
    padding: '8px 12px',
    borderRadius: '12px',
    border: `1px solid ${cor}`,
    fontSize: '12px',
    color: '#1e293b',
    fontWeight: '600',
    textAlign: 'left' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px'
  });

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
        minHeight: '380px',
        transition: 'transform 0.2s, box-shadow 0.2s',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
      }}
      className="hover:shadow-lg hover:-translate-y-1"
    >
      {/* Cabeçalho */}
      <div style={{ fontSize: '35px', marginBottom: '10px' }}>{turma.icone || '🏫'}</div>
      <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#1e293b', margin: '0 0 15px 0' }}>{turma.nome}</h3>

      <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        
        {/* Renderiza Regente(s) */}
        {turma.regentes && turma.regentes.length > 0 ? (
          turma.regentes.map((r: string, idx: number) => (
             <div key={`reg-${idx}`} style={styleBloco("Regente", r, "#cbd5e1")}>
              <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>👨‍🏫 Professor Regente</span>
              <span style={{ fontWeight: '800' }}>{primeiroUltimo(r)}</span>
            </div>
          ))
        ) : (
           <div style={styleBloco("Regente", "Não Definido", "#cbd5e1")}>
              <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>👨‍🏫 Professor Regente</span>
              <span style={{ fontWeight: '800', color: '#94a3b8' }}>Não Definido</span>
           </div>
        )}
        
        {/* Renderiza Auxiliar */}
        {turma.auxiliar && (
          <div style={styleBloco("Auxiliar", turma.auxiliar, "#a7f3d0")}>
            <span style={{ fontSize: '10px', color: '#059669', textTransform: 'uppercase' }}>👩‍🏫 Auxiliar de Sala</span>
            <span style={{ fontWeight: '800' }}>{primeiroUltimo(turma.auxiliar)}</span>
          </div>
        )}

        {/* Renderiza Especialistas - AGORA COM FORMATO "MATÉRIA: NOME" */}
        {turma.especialistas && turma.especialistas.length > 0 && (
          <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '10px', fontWeight: '900', color: '#475569', textTransform: 'uppercase', marginBottom: '2px' }}>Especialistas</span>
            {turma.especialistas.map((esp: string, idx: number) => {
               // Exemplo de string vinda do array: "João Silva (Música)"
               // Vamos inverter para aparecer "Música: João Silva"
               const match = esp.match(/(.*) \((.*)\)/); 
               const nomeProf = match ? primeiroUltimo(match[1]) : primeiroUltimo(esp);
               const materia = match ? match[2] : "Espec.";

               return (
                 <div key={`esp-${idx}`} style={{ 
                   backgroundColor: 'rgba(255,255,255,0.6)', padding: '6px 10px', borderRadius: '8px', 
                   fontSize: '11px', fontWeight: '600', color: '#475569', border: '1px dashed #cbd5e1',
                   textAlign: 'left'
                 }}>
                   <span style={{ color: '#0f172a', fontWeight: '800' }}>{materia}</span>: {nomeProf}
                 </div>
               );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', paddingTop: '15px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
        <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', backgroundColor: 'white', padding: '4px 10px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
           👥 {turma.totalAlunos} Alunos
        </span>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button onClick={(e) => { e.stopPropagation(); onEditarProfessor(e, turma.nome); }} title="Vincular Equipe" style={{ padding: '6px 8px', background: 'white', border: `1px solid ${turma.borda}`, borderRadius: '8px', cursor: 'pointer' }}>👨‍🏫</button>
          <button onClick={(e) => { e.stopPropagation(); onGerenciarMaterias(e, turma.nome); }} title="Grade de Matérias" style={{ padding: '6px 8px', background: 'white', border: `1px solid ${turma.borda}`, borderRadius: '8px', cursor: 'pointer' }}>📚</button>
          <button onClick={(e) => { e.stopPropagation(); onAbrirUploadHorario(e, turma); }} title="Quadro de Horários" style={{ padding: '6px 8px', background: 'white', border: `1px solid ${turma.borda}`, borderRadius: '8px', cursor: 'pointer' }}>📅</button>
          <button onClick={(e) => { e.stopPropagation(); onAbrirAgenda(e, turma); }} title="Agenda Escolar" style={{ padding: '6px 8px', background: 'white', border: `1px solid ${turma.borda}`, borderRadius: '8px', cursor: 'pointer' }}>📝</button>
        </div>
      </div>
    </div>
  );
}