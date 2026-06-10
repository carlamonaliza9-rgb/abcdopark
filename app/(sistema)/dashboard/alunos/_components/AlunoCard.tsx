"use client";

interface AlunoCardProps {
  aluno: any;
  obterCorTurma: (turma: string) => string;
  mWhatsApp: (v: string) => string;
  onAbrirFicha: (aluno: any) => void;
}

export function AlunoCard({ aluno, obterCorTurma, mWhatsApp, onAbrirFicha }: AlunoCardProps) {
  const isTransferido = aluno.status === 'transferido';
  const bgColor = isTransferido ? '#e5e7eb' : obterCorTurma(aluno.turma);

  return (
    <div 
      key={aluno.id} 
      onClick={() => onAbrirFicha(aluno)}
      style={{ 
        backgroundColor: bgColor, 
        borderRadius: '20px', 
        padding: '24px', 
        border: '1px solid rgba(0,0,0,0.05)', 
        boxShadow: '0 4px 12px rgba(0,0,0,0.03)', 
        position: 'relative', 
        cursor: 'pointer', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        transition: 'transform 0.2s ease',
        height: '100%' 
      }}
    >
      {/* Indicadores de status */}
      <div style={{ position: 'absolute', top: '18px', left: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        {!isTransferido && <span style={{ fontSize: '14px' }}>🟢</span>}
        {aluno.tem_alergia && <div style={{ width: '12px', height: '12px', backgroundColor: '#ef4444', borderRadius: '50%', border: '2px solid white' }} />}
        {aluno.e_autista && <span style={{ fontSize: '16px' }}>🧩</span>}
      </div>

      <div style={{ position: 'absolute', top: '15px', right: '15px', backgroundColor: 'rgba(255,255,255,0.6)', padding: '4px 10px', borderRadius: '10px', fontSize: '10px', fontWeight: 'bold', color: '#64748b' }}>
        VENC: {aluno.vencimento || '--'}
      </div>

      {/* Foto */}
      <div style={{ marginBottom: '16px', textAlign: 'center' }}>
        {aluno.foto_url ? 
          <img src={aluno.foto_url} style={{ height: '90px', width: '90px', borderRadius: '50%', objectFit: 'cover', border: '3px solid white' }} /> : 
          <div style={{ height: '90px', width: '90px', borderRadius: '50%', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#94a3b8', border: '1px solid #eee' }}>{aluno.nome.charAt(0)}</div>
        }
      </div>

      {/* Nome do Aluno com altura mínima fixa para evitar deslocamento */}
      <div style={{ minHeight: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', margin: 0, textAlign: 'center', lineHeight: '1.2' }}>
            {aluno.nome}
        </h3>
      </div>

      {/* Turma fixa */}
      <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#2563eb', backgroundColor: 'rgba(255,255,255,0.7)', padding: '4px 12px', borderRadius: '20px', marginBottom: '15px' }}>
        {isTransferido ? "TRANSFERIDO" : (aluno.turma || "SEM TURMA")}
      </span>

      {/* Ancoragem dos dados do responsável */}
      <div style={{ width: '100%', paddingTop: '15px', borderTop: '1px solid rgba(0,0,0,0.05)', textAlign: 'center', marginTop: 'auto' }}>
        <p style={{ margin: '0', fontSize: '13px', fontWeight: '700', color: '#475569' }}>{aluno.responsavel}</p>
        <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>{mWhatsApp(aluno.whatsapp || "")}</p>
      </div>
    </div>
  );
}