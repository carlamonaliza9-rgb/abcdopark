"use client";

import { useState, useEffect, useRef } from "react";
import { gerarPDFComunicado, gerarJPGComunicado, desenharDocumentoBase } from "@/app/(sistema)/dashboard/documentacoes/_lib/geradorComunicados";

interface IlustracaoState {
  id: string;
  src: string;
  x: number; 
  y: number;
  width: number;
  height: number;
}

export default function PainelComunicados() {
  const [comunicadoTipo, setComunicadoTipo] = useState<'interno' | 'externo' | 'aviso_curto'>('interno');
  const [comunicadoTitulo, setComunicadoTitulo] = useState('COMUNICADO INTERNO');
  const [comunicadoSaudacao, setComunicadoSaudacao] = useState('Bom dia professores!');
  const [comunicadoConteudo, setComunicadoConteudo] = useState('');
  const [comunicadoTelefone, setComunicadoTelefone] = useState('(91) 98622-7715');
  
  const [ilustracoes, setIlustracoes] = useState<IlustracaoState[]>([]);
  const [imagemAtivaId, setImagemAtivaId] = useState<string | null>(null);

  const previewContainerRef = useRef<HTMLDivElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const LARGURA_A4_REAL = 1240;
  const ALTURA_A4_REAL = 1754;

  useEffect(() => {
    const atualizarPreviewVisual = async () => {
      if (!previewCanvasRef.current) return;
      const ctx = previewCanvasRef.current.getContext('2d');
      if (ctx) {
        await desenharDocumentoBase(ctx, {
          tipo: comunicadoTipo,
          titulo: comunicadoTitulo,
          saudacao: comunicadoSaudacao,
          conteudo: comunicadoConteudo,
          telefoneContato: comunicadoTelefone
        });
      }
    };
    atualizarPreviewVisual();
  }, [comunicadoTipo, comunicadoTitulo, comunicadoSaudacao, comunicadoConteudo, comunicadoTelefone]);

  const handleTipoComunicadoChange = (tipo: 'interno' | 'externo' | 'aviso_curto') => {
    setComunicadoTipo(tipo);
    if (tipo === 'interno') {
      setComunicadoTitulo('COMUNICADO INTERNO');
      setComunicadoSaudacao('Bom dia professores!');
    } else if (tipo === 'externo') {
      setComunicadoTitulo('INFORMATIVO');
      setComunicadoSaudacao('Srs. pais e responsáveis,');
    } else {
      setComunicadoTitulo('AVISO!');
      setComunicadoSaudacao('Prezados pais e responsáveis,');
    }
  };

  const handleNovaImagemUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const novaImg: IlustracaoState = {
          id: Math.random().toString(36).substr(2, 9),
          src: ev.target?.result as string,
          x: 400, y: 700, width: 350, height: 350
        };
        setIlustracoes([...ilustracoes, novaImg]);
        setImagemAtivaId(novaImg.id);
      };
      reader.readAsDataURL(file);
    }
  };

  // --- LÓGICA DE DRAG AND DROP NATIVO ---
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent, imgId: string) => {
    e.stopPropagation(); 
    if (!previewContainerRef.current) return;
    setImagemAtivaId(imgId);
    setIsDragging(true);
    const img = ilustracoes.find(i => i.id === imgId);
    if (!img) return;

    const rect = previewContainerRef.current.getBoundingClientRect();
    const scale = LARGURA_A4_REAL / rect.width;
    const pointerXNoPreview = e.clientX - rect.left;
    const pointerYNoPreview = e.clientY - rect.top;

    setDragOffset({
      x: (pointerXNoPreview * scale) - img.x,
      y: (pointerYNoPreview * scale) - img.y
    });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !imagemAtivaId || !previewContainerRef.current) return;
    const rect = previewContainerRef.current.getBoundingClientRect();
    const scale = LARGURA_A4_REAL / rect.width;
    const pointerXNoPreview = e.clientX - rect.left;
    const pointerYNoPreview = e.clientY - rect.top;

    const novoXReal = (pointerXNoPreview * scale) - dragOffset.x;
    const novoYReal = (pointerYNoPreview * scale) - dragOffset.y;

    setIlustracoes(prev => prev.map(img => img.id === imagemAtivaId ? { ...img, x: novoXReal, y: novoYReal } : img));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const alterarTamanhoImagemAtiva = (delta: number) => {
    setIlustracoes(prev => prev.map(img => img.id === imagemAtivaId ? { ...img, width: img.width + delta, height: img.height + delta } : img));
  };

  const removerImagemAtiva = () => {
    setIlustracoes(prev => prev.filter(img => img.id !== imagemAtivaId));
    setImagemAtivaId(null);
  };

  const executarGeracaoComunicado = async (formato: 'pdf' | 'jpg') => {
    if (!comunicadoConteudo.trim()) return alert("Digite o conteúdo da mensagem.");
    const payloadIlustracoes = ilustracoes.map(img => ({ imgElement: img.src, x: img.x, y: img.y, largura: img.width, altura: img.height }));
    const payload = {
      tipo: comunicadoTipo, titulo: comunicadoTitulo, saudacao: comunicadoSaudacao, conteudo: comunicadoConteudo, telefoneContato: comunicadoTelefone,
      ilustracoes: payloadIlustracoes.length > 0 ? payloadIlustracoes : undefined
    };
    if (formato === 'pdf') await gerarPDFComunicado(payload);
    else await gerarJPGComunicado(payload);
  };

  return (
    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
      {/* FORMULÁRIO */}
      <div style={{ flex: 1, minWidth: '400px', backgroundColor: 'white', padding: '24px', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', marginBottom: '20px' }}>Gerar Comunicado Oficial</h2>
        
        <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px' }}>1. PÚBLICO ALVO / MODELO DE DESIGN</label>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <button onClick={() => handleTipoComunicadoChange('interno')} style={{ flex: 1, minWidth: '130px', padding: '12px', borderRadius: '12px', fontWeight: 'bold', border: comunicadoTipo === 'interno' ? '2px solid #166534' : '1px solid #e2e8f0', backgroundColor: comunicadoTipo === 'interno' ? '#dcfce7' : 'white', color: comunicadoTipo === 'interno' ? '#166534' : '#64748b', cursor: 'pointer' }}>🟢 Equipe (Interno)</button>
          <button onClick={() => handleTipoComunicadoChange('externo')} style={{ flex: 1, minWidth: '130px', padding: '12px', borderRadius: '12px', fontWeight: 'bold', border: comunicadoTipo === 'externo' ? '2px solid #1e40af' : '1px solid #e2e8f0', backgroundColor: comunicadoTipo === 'externo' ? '#dbeafe' : 'white', color: comunicadoTipo === 'externo' ? '#1e40af' : '#64748b', cursor: 'pointer' }}>🔵 Pais (Externo)</button>
          <button onClick={() => handleTipoComunicadoChange('aviso_curto')} style={{ flex: 1, minWidth: '130px', padding: '12px', borderRadius: '12px', fontWeight: 'bold', border: comunicadoTipo === 'aviso_curto' ? '2px solid #2563eb' : '1px solid #e2e8f0', backgroundColor: comunicadoTipo === 'aviso_curto' ? '#e0f2fe' : 'white', color: comunicadoTipo === 'aviso_curto' ? '#1e40af' : '#64748b', cursor: 'pointer' }}>🟡 Avisos Curtos</button>
        </div>

        <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px' }}>TÍTULO PRINCIPAL</label>
            <input type="text" value={comunicadoTitulo} onChange={e => setComunicadoTitulo(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', color: '#1e293b' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px' }}>SAUDAÇÃO INICIAL</label>
            <input type="text" value={comunicadoSaudacao} onChange={e => setComunicadoSaudacao(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', color: '#1e293b' }} />
          </div>
        </div>

        <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px' }}>CORPO DA MENSAGEM</label>
        <textarea value={comunicadoConteudo} onChange={e => setComunicadoConteudo(e.target.value)} placeholder="Use colchetes para gerar blocos de data azuis/verdes. Ex: [27/04] Ensaio." rows={8} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '15px', outline: 'none', resize: 'vertical', fontFamily: 'inherit', color: '#1e293b' }} />

        {comunicadoTipo === 'externo' && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px' }}>TELEFONE NO RODAPÉ</label>
            <input type="text" value={comunicadoTelefone} onChange={e => setComunicadoTelefone(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', color: '#1e293b' }} />
          </div>
        )}

        <div style={{ backgroundColor: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px dashed #cbd5e1', marginBottom: '25px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}>🎨 ADICIONAR IMAGENS EXTRAS</label>
          <input type="file" accept="image/png" onChange={handleNovaImagemUpload} style={{ fontSize: '12px' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button onClick={() => executarGeracaoComunicado('pdf')} style={{ width: '100%', padding: '16px', backgroundColor: '#2563eb', color: 'white', borderRadius: '14px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>BAIXAR COMUNICADO EM PDF 📄</button>
          <button onClick={() => executarGeracaoComunicado('jpg')} style={{ width: '100%', padding: '16px', backgroundColor: '#f59e0b', color: 'white', borderRadius: '14px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>BAIXAR COMUNICADO EM IMAGEM 🖼️</button>
        </div>
      </div>

      {/* PREVIEW WYSIWYG */}
      <div style={{ width: '450px', flexShrink: 0 }}>
        <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e293b', marginBottom: '10px' }}>Pré-visualização WYSIWYG</h3>
        <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '15px' }}>Este quadro exibe exatamente como ficará o arquivo final.</p>
        
        <div ref={previewContainerRef} style={{ position: 'relative', width: '100%', aspectRatio: `${LARGURA_A4_REAL} / ${ALTURA_A4_REAL}`, backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '5px', overflow: 'hidden', touchAction: 'none' }}>
          <canvas ref={previewCanvasRef} width={LARGURA_A4_REAL} height={ALTURA_A4_REAL} style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'none' }} />
          {ilustracoes.map(img => {
            const isActive = imagemAtivaId === img.id;
            return (
              <div 
                key={img.id}
                onPointerDown={(e) => handlePointerDown(e, img.id)} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}
                style={{
                  position: 'absolute',
                  left: `${(img.x / LARGURA_A4_REAL) * 100}%`,
                  top: `${(img.y / ALTURA_A4_REAL) * 100}%`,
                  width: `${(img.width / LARGURA_A4_REAL) * 100}%`,
                  height: `${(img.height / ALTURA_A4_REAL) * 100}%`,
                  cursor: isDragging && isActive ? 'grabbing' : 'grab',
                  border: isActive ? '2px dashed #2563eb' : 'none',
                  userSelect: 'none' 
                }}
              >
                <img src={img.src} alt="Ilustracao Extra" style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }} />
              </div>
            )
          })}
        </div>

        {imagemAtivaId && (
          <div style={{ marginTop: '15px', backgroundColor: 'white', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#2563eb', marginBottom: '10px' }}>IMAGEM SELECIONADA</p>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <button onClick={() => alterarTamanhoImagemAtiva(50)} style={{ flex: 1, padding: '8px', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>➕ Aumentar</button>
              <button onClick={() => alterarTamanhoImagemAtiva(-50)} style={{ flex: 1, padding: '8px', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>➖ Diminuir</button>
            </div>
            <button onClick={removerImagemAtiva} style={{ width: '100%', padding: '8px', backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>🗑️ Remover Imagem</button>
          </div>
        )}
      </div>
    </div>
  );
}