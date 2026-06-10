"use client";
import { useState } from "react";

interface UploadComprovanteProps {
  onFileSelect: (file: File) => void;
}

export function UploadComprovante({ onFileSelect }: UploadComprovanteProps) {
  const [dragActive, setDragActive] = useState(false);
  const [erroMensagem, setErroMensagem] = useState("");

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // LÓGICA DE BLINDAGEM DO ARQUIVO
  const validarEProcessarArquivo = (file: File) => {
    setErroMensagem(""); // Limpa erros anteriores

    // 1. Trava de Tipo (Apenas PDF, JPG e PNG)
    const tiposPermitidos = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (!tiposPermitidos.includes(file.type)) {
      setErroMensagem("Formato inválido. Envie apenas PDF, JPG ou PNG.");
      return;
    }

    // 2. Trava de Tamanho (Máximo de 5MB)
    const tamanhoMaximo = 5 * 1024 * 1024; // 5 Megabytes em bytes
    if (file.size > tamanhoMaximo) {
      setErroMensagem("Arquivo muito grande. O limite máximo é 5MB.");
      return;
    }

    // Se passou nas travas, envia para a página principal
    onFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validarEProcessarArquivo(e.dataTransfer.files[0]);
    }
  };

  return (
    <div>
      <div 
        onDragEnter={handleDrag} 
        onDragLeave={handleDrag} 
        onDragOver={handleDrag} 
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragActive ? '#2563eb' : erroMensagem ? '#ef4444' : '#e2e8f0'}`,
          borderRadius: '20px',
          padding: '40px 20px',
          textAlign: 'center',
          backgroundColor: dragActive ? '#eff6ff' : erroMensagem ? '#fef2f2' : '#f8fafc',
          transition: 'all 0.3s ease',
          cursor: 'pointer',
          marginTop: '15px'
        }}
      >
        <input 
          type="file" 
          id="file-upload" 
          hidden 
          accept=".pdf, image/jpeg, image/png, image/jpg" // Ajuda o navegador a filtrar
          onChange={(e) => e.target.files?.[0] && validarEProcessarArquivo(e.target.files[0])} 
        />
        <label htmlFor="file-upload" style={{ cursor: 'pointer' }}>
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>
            {erroMensagem ? '⚠️' : '📤'}
          </div>
          <p style={{ margin: 0, fontSize: '14px', color: erroMensagem ? '#b91c1c' : '#64748b', fontWeight: '500' }}>
            <strong>{erroMensagem ? "Tente novamente" : "Arraste o comprovante aqui"}</strong><br/>
            {!erroMensagem && "ou clique para selecionar o arquivo"}
          </p>
          {!erroMensagem && (
            <small style={{ display: 'block', marginTop: '10px', color: '#94a3b8', fontSize: '11px' }}>
              Formatos aceitos: PDF, JPG, PNG (Máx: 5MB)
            </small>
          )}
        </label>
      </div>

      {/* Exibição visual do erro */}
      {erroMensagem && (
        <div style={{ marginTop: '10px', color: '#ef4444', fontSize: '13px', fontWeight: 'bold' }}>
          {erroMensagem}
        </div>
      )}
    </div>
  );
}