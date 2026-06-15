"use client";

interface ModalHorarioProps {
  turma: any;
  previewHorario: string | null;
  arrastandoHorario: boolean;
  salvandoHorario: boolean;
  onClose: () => void;
  onDragEnter: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSalvar: () => void;
}

export function ModalHorario(props: ModalHorarioProps) {
  const { turma, previewHorario, arrastandoHorario, salvandoHorario, onClose, onDragEnter, onDragOver, onDragLeave, onDrop, onFileSelect, onSalvar } = props;

  return (
    <div 
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div 
        style={{ backgroundColor: 'white', padding: '30px', borderRadius: '24px', width: '95%', maxWidth: '800px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>📅 Horário: {turma?.nome}</h2>
        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>Arraste a imagem do horário para o quadro abaixo.</p>
        
        <div 
          onDragEnter={onDragEnter} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop} 
          onClick={() => document.getElementById('input-horario')?.click()} 
          style={{ width: '100%', height: '400px', border: arrastandoHorario ? '2px solid #2563eb' : '2px dashed #cbd5e1', borderRadius: '15px', backgroundColor: arrastandoHorario ? '#eff6ff' : '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', cursor: 'pointer', overflow: 'hidden', transition: '0.2s' }}
        >
          {previewHorario ? (
            <img src={previewHorario} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Preview" />
          ) : (
            <>
              <span style={{ fontSize: '48px' }}>🖼️</span>
              <p style={{ fontSize: '14px', color: '#64748b', marginTop: '12px', fontWeight: 'bold' }}>Clique ou arraste a imagem aqui</p>
            </>
          )}
          <input type="file" id="input-horario" accept="image/*" hidden onChange={onFileSelect} />
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '16px', borderRadius: '12px', border: '1px solid #e5e7eb', backgroundColor: 'white', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', transition: 'background-color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}>
            Cancelar
          </button>
          <button onClick={onSalvar} disabled={salvandoHorario} style={{ flex: 1, padding: '16px', borderRadius: '12px', border: 'none', backgroundColor: salvandoHorario ? '#93c5fd' : '#2563eb', color: 'white', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', transition: 'background-color 0.2s' }} onMouseOver={(e) => { if (!salvandoHorario) e.currentTarget.style.backgroundColor = '#1d4ed8' }} onMouseOut={(e) => { if (!salvandoHorario) e.currentTarget.style.backgroundColor = '#2563eb' }}>
            {salvandoHorario ? "Salvando..." : "Salvar Horário"}
          </button>
        </div>
      </div>
    </div>
  );
}