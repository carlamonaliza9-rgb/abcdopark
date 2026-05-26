"use client";

interface TurmasHeaderProps {
  ehAdmin: boolean;
}

export function TurmasHeader({ ehAdmin }: TurmasHeaderProps) {
  return (
    <header style={{ marginBottom: '40px' }}>
    <h1 style={{ fontSize: '26px', fontWeight: 'bold', color: '#111827', margin: 0 }}>Gestão de Turmas</h1>
      <p style={{ color: '#6b7280', marginTop: '5px' }}>
        Gerenciamento de horários e professores (Acesso: {ehAdmin ? 'Admin' : 'Visitante'}).
      </p>
    </header>
  );
}