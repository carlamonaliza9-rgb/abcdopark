"use client";

interface ModalFichaAlunoTurmaProps {
  aluno: any;
  historico: any[];
  onClose: () => void;
}

export function ModalFichaAlunoTurma({ aluno, historico, onClose }: ModalFichaAlunoTurmaProps) {
  if (!aluno) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, backdropFilter: 'blur(8px)' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '30px', width: '95%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto', padding: '30px', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 20, right: 20, border: 'none', background: '#f1f5f9', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer' }}>✕</button>
        
        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
          {aluno.foto_url ? <img src={aluno.foto_url} style={{ width: '110px', height: '110px', borderRadius: '50%', objectFit: 'cover', border: '4px solid #fff', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }} alt="Foto" /> : <div style={{ width: '110px', height: '110px', borderRadius: '50%', backgroundColor: '#f1f5f9', margin: '0 auto', fontSize: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{aluno.nome?.[0]}</div>}
          <h2 style={{ margin: '15px 0 5px', fontSize: '22px' }}>{aluno.nome}</h2>
          <span style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '6px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold' }}>{aluno.turma}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '15px', border: '1px solid #f1f5f9' }}>
            <small style={{ color: '#94a3b8', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>NASCIMENTO</small>
            <p style={{ margin: 0, fontWeight: 'bold', fontSize: '14px' }}>{aluno.data_nascimento ? new Date(aluno.data_nascimento).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : '--'}</p>
          </div>
          <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '15px', border: '1px solid #f1f5f9' }}>
            <small style={{ color: '#94a3b8', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>RESPONSÁVEL</small>
            <p style={{ margin: 0, fontWeight: 'bold', fontSize: '12px' }}>{aluno.responsavel || '--'}</p>
          </div>
        </div>

        {aluno.tem_alergia && (
          <div style={{ background: '#fef2f2', padding: '15px', borderRadius: '15px', marginTop: '15px', border: '1px solid #fecaca' }}>
            <p style={{ margin: 0, color: '#dc2626', fontWeight: 'bold', fontSize: '13px' }}>⚠️ ALERGIA: {aluno.alergia_descricao}</p>
          </div>
        )}

        <h3 style={{ fontSize: '16px', marginTop: '25px', color: '#1f2937', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>Histórico Financeiro</h3>
        <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
          {historico.length > 0 ? historico.map((h, i) => (
            <div key={i} style={{ padding: '12px 5px', borderBottom: '1px solid #f1f5f9', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#4b5563' }}>{new Date(h.data_pagamento).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</span>
              <span style={{ fontWeight: 'bold', color: '#10b981' }}>R$ {h.valor_total?.toLocaleString('pt-BR')}</span>
            </div>
          )) : <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', marginTop: '15px' }}>Sem pagamentos registrados.</p>}
        </div>
      </div>
    </div>
  );
}