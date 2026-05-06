"use client";

interface ModalFichaAlunoTurmaProps {
  aluno: any;
  onClose: () => void;
  historico?: any[];
}

export function ModalFichaAlunoTurma({ aluno, onClose }: ModalFichaAlunoTurmaProps) {
  if (!aluno) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, backdropFilter: 'blur(8px)' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '30px', width: '95%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto', padding: '30px', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 20, right: 20, border: 'none', background: '#f1f5f9', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer' }}>✕</button>
        
        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            {aluno.foto_url ? (
              <img src={aluno.foto_url} style={{ width: '110px', height: '110px', borderRadius: '50%', objectFit: 'cover', border: '4px solid #fff', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }} alt="Foto" />
            ) : (
              <div style={{ width: '110px', height: '110px', borderRadius: '50%', backgroundColor: '#f1f5f9', margin: '0 auto', fontSize: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {aluno.nome?.[0]}
              </div>
            )}
            
            {/* Símbolo TEA (Autismo) Sobreposto na Foto */}
            {aluno.e_autista && (
               <span style={{ position: 'absolute', bottom: 5, right: 0, fontSize: '24px', backgroundColor: 'white', borderRadius: '50%', padding: '2px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                 🧩
               </span>
            )}
          </div>

          <h2 style={{ margin: '15px 0 5px', fontSize: '22px', fontWeight: '800' }}>{aluno.nome}</h2>
          
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center', marginTop: '5px' }}>
            <span style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '6px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold' }}>{aluno.turma}</span>
            {/* Badges Adicionais Abaixo do Nome */}
            {aluno.e_autista && <span style={{ backgroundColor: '#f5f3ff', color: '#7c3aed', padding: '6px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>TEA 🧩</span>}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '15px', border: '1px solid #f1f5f9' }}>
            <small style={{ color: '#94a3b8', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>NASCIMENTO</small>
            <p style={{ margin: 0, fontWeight: 'bold', fontSize: '14px' }}>
              {aluno.data_nascimento ? new Date(aluno.data_nascimento).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : '--'}
            </p>
          </div>
          <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '15px', border: '1px solid #f1f5f9' }}>
            <small style={{ color: '#94a3b8', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>RESPONSÁVEL</small>
            <p style={{ margin: 0, fontWeight: 'bold', fontSize: '12px' }}>{aluno.responsavel || '--'}</p>
          </div>
        </div>

        {/* Alerta de Alergia Detalhado */}
        {aluno.tem_alergia && (
          <div style={{ background: '#fef2f2', padding: '15px', borderRadius: '15px', marginTop: '15px', border: '1px solid #fecaca' }}>
            <p style={{ margin: 0, color: '#dc2626', fontWeight: 'bold', fontSize: '13px', marginBottom: '5px' }}>⚠️ ALERGIA / RESTRIÇÃO</p>
            <p style={{ margin: 0, color: '#991b1b', fontSize: '14px' }}>{aluno.alergia_descricao || "Nenhuma descrição fornecida."}</p>
          </div>
        )}

        <div style={{ marginTop: '30px' }}>
          <button onClick={onClose} style={{ width: '100%', padding: '14px', borderRadius: '15px', border: 'none', backgroundColor: '#f1f5f9', color: '#475569', fontWeight: 'bold', cursor: 'pointer' }}>
            FECHAR
          </button>
        </div>
      </div>
    </div>
  );
}