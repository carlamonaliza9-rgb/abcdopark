"use client";
import { useState } from "react";

interface UploadComprovanteProps {
  onFileSelect: (file: File) => void;
}

export function UploadComprovante({ onFileSelect }: UploadComprovanteProps) {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  return (
    <div 
      onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
      style={{
        border: `2px dashed ${dragActive ? '#2563eb' : '#e2e8f0'}`,
        borderRadius: '16px',
        padding: '30px',
        textAlign: 'center',
        backgroundColor: dragActive ? '#eff6ff' : '#f8fafc',
        transition: '0.3s',
        cursor: 'pointer'
      }}
    >
      <input 
        type="file" id="file-upload" hidden 
        onChange={(e) => e.target.files?.[0] && onFileSelect(e.target.files[0])} 
      />
      <label htmlFor="file-upload" style={{ cursor: 'pointer' }}>
        <div style={{ fontSize: '30px', marginBottom: '10px' }}>📄</div>
        <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
          <strong>Arraste o comprovante</strong> ou clique para selecionar
        </p>
      </label>
    </div>
  );
}