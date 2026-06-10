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
        style={{ backgroundColor: 'white', padding: '30px', borderRadius: '24px', width: '90%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '5px' }}>📅 Horário: {turma?.nome}</h2>
        <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>Arraste a imagem do horário para o quadro abaixo.</p>
        
        <div 
          onDragEnter={onDragEnter} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop} 
          onClick={() => document.getElementById('input-horario')?.click()} 
          style={{ width: '100%', height: '220px', border: arrastandoHorario ? '2px solid #2563eb' : '2px dashed #cbd5e1', borderRadius: '15px', backgroundColor: arrastandoHorario ? '#eff6ff' : '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', cursor: 'pointer', overflow: 'hidden', transition: '0.2s' }}
        >
          {previewHorario ? (
            <img src={previewHorario} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Preview" />
          ) : (
            <>
              <span style={{ fontSize: '40px' }}>🖼️</span>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '10px', fontWeight: 'bold' }}>Clique ou arraste a imagem aqui</p>
            </>
          )}
          <input type="file" id="input-horario" accept="image/*" hidden onChange={onFileSelect} />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid #e5e7eb', backgroundColor: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Cancelar</button>
          <button onClick={onSalvar} disabled={salvandoHorario} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', backgroundColor: salvandoHorario ? '#93c5fd' : '#2563eb', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
            {salvandoHorario ? "Salvando..." : "Salvar Horário"}
          </button>
        </div>
      </div>
    </div>
  );
}