"use client";

import {
  ChangeEvent,
  PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";

interface FotoAlunoCropperProps {
  previewUrl: string | null;
  onTrocarFoto: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemover: () => void;
  obrigatoria?: boolean;
}

interface ImagemInfo {
  src: string;
  larguraNatural: number;
  alturaNatural: number;
}

const TAMANHO_RECORTE = 260;
const TAMANHO_SAIDA = 600;
const ZOOM_MINIMO = 1;
const ZOOM_MAXIMO = 4;

export function FotoAlunoCropper({
  previewUrl,
  onTrocarFoto,
  onRemover,
  obrigatoria = false,
}: FotoAlunoCropperProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const arrasteRef = useRef({
    ativo: false,
    inicioX: 0,
    inicioY: 0,
    posicaoX: 0,
    posicaoY: 0,
  });

  const [editorAberto, setEditorAberto] = useState(false);
  const [imagemInfo, setImagemInfo] = useState<ImagemInfo | null>(null);
  const [zoom, setZoom] = useState(1);
  const [posicao, setPosicao] = useState({ x: 0, y: 0 });
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState("");
  const [nomeArquivo, setNomeArquivo] = useState("foto-aluno.jpg");
  const [revogarFonteAoFechar, setRevogarFonteAoFechar] = useState(false);

  const obterEscalaBase = (info: ImagemInfo) =>
    Math.max(
      TAMANHO_RECORTE / info.larguraNatural,
      TAMANHO_RECORTE / info.alturaNatural
    );

  const limitarPosicao = (
    x: number,
    y: number,
    zoomAtual: number,
    info: ImagemInfo | null = imagemInfo
  ) => {
    if (!info) return { x: 0, y: 0 };

    const escala = obterEscalaBase(info) * zoomAtual;
    const larguraExibida = info.larguraNatural * escala;
    const alturaExibida = info.alturaNatural * escala;

    const limiteX = Math.max(0, (larguraExibida - TAMANHO_RECORTE) / 2);
    const limiteY = Math.max(0, (alturaExibida - TAMANHO_RECORTE) / 2);

    return {
      x: Math.min(limiteX, Math.max(-limiteX, x)),
      y: Math.min(limiteY, Math.max(-limiteY, y)),
    };
  };

  useEffect(() => {
    if (!imagemInfo) return;
    setPosicao((atual) =>
      limitarPosicao(atual.x, atual.y, zoom, imagemInfo)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, imagemInfo?.larguraNatural, imagemInfo?.alturaNatural]);

  const carregarImagem = (
    src: string,
    nome: string,
    deveRevogarAoFechar = false
  ) => {
    setErro("");

    const imagem = new Image();
    imagem.crossOrigin = "anonymous";

    imagem.onload = () => {
      setImagemInfo({
        src,
        larguraNatural: imagem.naturalWidth,
        alturaNatural: imagem.naturalHeight,
      });
      setNomeArquivo(nome || "foto-aluno.jpg");
      setRevogarFonteAoFechar(deveRevogarAoFechar);
      setZoom(1);
      setPosicao({ x: 0, y: 0 });
      setEditorAberto(true);
    };

    imagem.onerror = () => {
      if (deveRevogarAoFechar && src.startsWith("blob:")) {
        URL.revokeObjectURL(src);
      }
      setErro(
        "Não foi possível abrir esta imagem. Escolha outra foto do dispositivo."
      );
    };

    imagem.src = src;
  };

  const selecionarArquivo = (e: ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    e.target.value = "";

    if (!arquivo) return;

    if (!arquivo.type.startsWith("image/")) {
      setErro("Selecione um arquivo de imagem válido.");
      return;
    }

    if (arquivo.size > 12 * 1024 * 1024) {
      setErro("A imagem deve ter no máximo 12 MB.");
      return;
    }

    const urlTemporaria = URL.createObjectURL(arquivo);
    carregarImagem(urlTemporaria, arquivo.name, true);
  };

  const editarFotoAtual = () => {
    if (!previewUrl) {
      inputRef.current?.click();
      return;
    }

    carregarImagem(previewUrl, "foto-aluno-atual.jpg", false);
  };

  const fecharEditor = () => {
    if (revogarFonteAoFechar && imagemInfo?.src.startsWith("blob:")) {
      URL.revokeObjectURL(imagemInfo.src);
    }

    setEditorAberto(false);
    setImagemInfo(null);
    setZoom(1);
    setPosicao({ x: 0, y: 0 });
    setErro("");
    setRevogarFonteAoFechar(false);
  };

  const iniciarArraste = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!imagemInfo || processando) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    arrasteRef.current = {
      ativo: true,
      inicioX: e.clientX,
      inicioY: e.clientY,
      posicaoX: posicao.x,
      posicaoY: posicao.y,
    };
  };

  const moverImagem = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!arrasteRef.current.ativo || !imagemInfo || processando) return;

    const novoX =
      arrasteRef.current.posicaoX + (e.clientX - arrasteRef.current.inicioX);
    const novoY =
      arrasteRef.current.posicaoY + (e.clientY - arrasteRef.current.inicioY);

    setPosicao(limitarPosicao(novoX, novoY, zoom, imagemInfo));
  };

  const finalizarArraste = (e: ReactPointerEvent<HTMLDivElement>) => {
    arrasteRef.current.ativo = false;

    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const centralizarImagem = () => {
    setZoom(1);
    setPosicao({ x: 0, y: 0 });
  };

  const gerarFotoRecortada = async () => {
    if (!imagemInfo || processando) return;

    setProcessando(true);
    setErro("");

    try {
      const imagem = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Falha ao carregar a imagem."));
        img.src = imagemInfo.src;
      });

      const escalaTotal = obterEscalaBase(imagemInfo) * zoom;
      const larguraExibida = imagemInfo.larguraNatural * escalaTotal;
      const alturaExibida = imagemInfo.alturaNatural * escalaTotal;

      const esquerdaImagem =
        (TAMANHO_RECORTE - larguraExibida) / 2 + posicao.x;
      const topoImagem =
        (TAMANHO_RECORTE - alturaExibida) / 2 + posicao.y;

      let origemX = -esquerdaImagem / escalaTotal;
      let origemY = -topoImagem / escalaTotal;
      let tamanhoOrigem = TAMANHO_RECORTE / escalaTotal;

      tamanhoOrigem = Math.min(
        tamanhoOrigem,
        imagemInfo.larguraNatural,
        imagemInfo.alturaNatural
      );

      origemX = Math.max(
        0,
        Math.min(imagemInfo.larguraNatural - tamanhoOrigem, origemX)
      );
      origemY = Math.max(
        0,
        Math.min(imagemInfo.alturaNatural - tamanhoOrigem, origemY)
      );

      const canvas = document.createElement("canvas");
      canvas.width = TAMANHO_SAIDA;
      canvas.height = TAMANHO_SAIDA;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Não foi possível processar o recorte.");

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(
        imagem,
        origemX,
        origemY,
        tamanhoOrigem,
        tamanhoOrigem,
        0,
        0,
        TAMANHO_SAIDA,
        TAMANHO_SAIDA
      );

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (resultado) =>
            resultado
              ? resolve(resultado)
              : reject(new Error("Não foi possível gerar a foto.")),
          "image/jpeg",
          0.92
        );
      });

      const nomeSemExtensao = nomeArquivo.replace(/\.[^/.]+$/, "") || "foto-aluno";
      const arquivoRecortado = new File(
        [blob],
        `${nomeSemExtensao}-recortada.jpg`,
        { type: "image/jpeg", lastModified: Date.now() }
      );

      const eventoSimulado = {
        target: { files: [arquivoRecortado] },
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      onTrocarFoto(eventoSimulado);
      fecharEditor();
    } catch (error: any) {
      console.error(error);
      setErro(
        "Não foi possível salvar o recorte. Para fotos antigas, selecione novamente o arquivo no dispositivo."
      );
    } finally {
      setProcessando(false);
    }
  };

  const confirmarRemocao = () => {
    if (!previewUrl) return;
    if (!confirm("Deseja realmente remover a foto deste aluno?")) return;
    onRemover();
  };

  const escalaVisual = imagemInfo
    ? obterEscalaBase(imagemInfo) * zoom
    : 1;

  const larguraVisual = imagemInfo
    ? imagemInfo.larguraNatural * escalaVisual
    : 0;

  const alturaVisual = imagemInfo
    ? imagemInfo.alturaNatural * escalaVisual
    : 0;

  return (
    <>
      <div
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "12px",
          borderRadius: "16px",
          border: obrigatoria && !previewUrl
            ? "1px solid #fecaca"
            : "1px solid #e2e8f0",
          backgroundColor: obrigatoria && !previewUrl ? "#fffafa" : "#f8fafc",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          onChange={selecionarArquivo}
          style={{ display: "none" }}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "104px minmax(0, 1fr)",
            alignItems: "center",
            gap: "14px",
            width: "100%",
          }}
        >
          <button
            type="button"
            onClick={previewUrl ? editarFotoAtual : () => inputRef.current?.click()}
            style={{
              position: "relative",
              width: "104px",
              height: "104px",
              minWidth: "104px",
              padding: 0,
              borderRadius: "50%",
              border: obrigatoria && !previewUrl
                ? "2px solid #ef4444"
                : "2px solid #bfdbfe",
              backgroundColor: "white",
              overflow: "hidden",
              cursor: "pointer",
              boxShadow: "0 5px 16px rgba(15, 23, 42, 0.10)",
            }}
            aria-label={previewUrl ? "Ajustar recorte da foto" : "Selecionar foto do aluno"}
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Foto do aluno"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px",
                  color: "#64748b",
                }}
              >
                <span style={{ fontSize: "25px", lineHeight: 1 }}>📷</span>
                <span
                  style={{
                    fontSize: "8px",
                    fontWeight: 900,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                   </span>
              </div>
            )}

            <span
              style={{
                position: "absolute",
                right: "3px",
                bottom: "3px",
                width: "27px",
                height: "27px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#2563eb",
                color: "white",
                border: "2px solid white",
                fontSize: "12px",
                lineHeight: 1,
                boxShadow: "0 3px 8px rgba(37, 99, 235, 0.30)",
              }}
            >
              {previewUrl ? "✏️" : "+"}
            </span>
          </button>

          <div style={{ minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "6px",
                marginBottom: "5px",
              }}
            >
              <span
                style={{
                  color: "#1e293b",
                  fontSize: "11px",
                  fontWeight: 900,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Foto do aluno
              </span>

              {obrigatoria && !previewUrl && (
                <span
                  style={{
                    padding: "2px 6px",
                    borderRadius: "999px",
                    backgroundColor: "#fee2e2",
                    color: "#b91c1c",
                    fontSize: "8px",
                    fontWeight: 900,
                    textTransform: "uppercase",
                  }}
                >
                  Pendente
                </span>
              )}
            </div>

            <p
              style={{
                margin: 0,
                color: "#64748b",
                fontSize: "10px",
                lineHeight: 1.45,
                fontWeight: 600,
              }}
            >
              {previewUrl
                ? "Ajuste o enquadramento, troque ou remova a foto cadastrada."
                : "Selecione uma imagem. A tela de enquadramento abrirá automaticamente."}
            </p>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "7px",
                marginTop: "10px",
              }}
            >
              {!previewUrl ? (
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  style={{
                    border: "none",
                    backgroundColor: "#2563eb",
                    color: "white",
                    padding: "8px 11px",
                    borderRadius: "9px",
                    fontSize: "9px",
                    fontWeight: 900,
                    cursor: "pointer",
                    textTransform: "uppercase",
                    boxShadow: "0 4px 10px rgba(37, 99, 235, 0.20)",
                  }}
                >
                  Selecionar foto
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={editarFotoAtual}
                    style={{
                      border: "none",
                      backgroundColor: "#2563eb",
                      color: "white",
                      padding: "8px 10px",
                      borderRadius: "9px",
                      fontSize: "9px",
                      fontWeight: 900,
                      cursor: "pointer",
                      textTransform: "uppercase",
                    }}
                  >
                    Ajustar recorte
                  </button>

                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    style={{
                      border: "1px solid #cbd5e1",
                      backgroundColor: "white",
                      color: "#475569",
                      padding: "7px 10px",
                      borderRadius: "9px",
                      fontSize: "9px",
                      fontWeight: 900,
                      cursor: "pointer",
                      textTransform: "uppercase",
                    }}
                  >
                    Trocar
                  </button>

                  <button
                    type="button"
                    onClick={confirmarRemocao}
                    style={{
                      border: "1px solid #fecaca",
                      backgroundColor: "#fff1f2",
                      color: "#dc2626",
                      padding: "7px 10px",
                      borderRadius: "9px",
                      fontSize: "9px",
                      fontWeight: 900,
                      cursor: "pointer",
                      textTransform: "uppercase",
                    }}
                  >
                    Remover
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {erro && !editorAberto && (
          <div
            style={{
              marginTop: "10px",
              padding: "8px 10px",
              borderRadius: "10px",
              border: "1px solid #fecaca",
              backgroundColor: "#fff1f2",
              color: "#b91c1c",
              fontSize: "10px",
              fontWeight: 700,
            }}
          >
            {erro}
          </div>
        )}
      </div>

      {editorAberto && imagemInfo && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 3000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "10px",
            backgroundColor: "rgba(15, 23, 42, 0.86)",
            backdropFilter: "blur(8px)",
          }}
          onClick={fecharEditor}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "430px",
              maxHeight: "96vh",
              overflowY: "auto",
              backgroundColor: "white",
              borderRadius: "24px",
              padding: "16px",
              boxShadow: "0 25px 70px rgba(0,0,0,0.35)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "12px",
                marginBottom: "14px",
              }}
            >
              <div>
                <h3
                  style={{
                    margin: 0,
                    color: "#0f172a",
                    fontSize: "17px",
                    fontWeight: 900,
                  }}
                >
                  Ajustar foto
                </h3>
                <p
                  style={{
                    margin: "4px 0 0",
                    color: "#64748b",
                    fontSize: "11px",
                    fontWeight: 600,
                  }}
                >
                  Arraste a imagem dentro do círculo, como no WhatsApp.
                </p>
              </div>

              <button
                type="button"
                onClick={fecharEditor}
                disabled={processando}
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  border: "1px solid #e2e8f0",
                  backgroundColor: "#f8fafc",
                  color: "#64748b",
                  cursor: processando ? "not-allowed" : "pointer",
                  fontSize: "16px",
                  fontWeight: 900,
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                width: `${TAMANHO_RECORTE}px`,
                height: `${TAMANHO_RECORTE}px`,
                maxWidth: "100%",
                margin: "0 auto",
                position: "relative",
                overflow: "hidden",
                borderRadius: "50%",
                backgroundColor: "#0f172a",
                border: "4px solid white",
                outline: "2px solid #60a5fa",
                boxShadow: "0 12px 35px rgba(15,23,42,0.25)",
                cursor: processando ? "wait" : "grab",
                touchAction: "none",
                userSelect: "none",
              }}
              onPointerDown={iniciarArraste}
              onPointerMove={moverImagem}
              onPointerUp={finalizarArraste}
              onPointerCancel={finalizarArraste}
            >
              <img
                src={imagemInfo.src}
                alt="Imagem para recorte"
                draggable={false}
                style={{
                  position: "absolute",
                  width: `${larguraVisual}px`,
                  height: `${alturaVisual}px`,
                  maxWidth: "none",
                  left: `calc(50% - ${larguraVisual / 2}px + ${posicao.x}px)`,
                  top: `calc(50% - ${alturaVisual / 2}px + ${posicao.y}px)`,
                  pointerEvents: "none",
                  userSelect: "none",
                }}
              />

              <div
                style={{
                  position: "absolute",
                  inset: "33.333% 0 auto 0",
                  borderTop: "1px solid rgba(255,255,255,0.42)",
                  pointerEvents: "none",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: "66.666% 0 auto 0",
                  borderTop: "1px solid rgba(255,255,255,0.42)",
                  pointerEvents: "none",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: "0 auto 0 33.333%",
                  borderLeft: "1px solid rgba(255,255,255,0.42)",
                  pointerEvents: "none",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: "0 auto 0 66.666%",
                  borderLeft: "1px solid rgba(255,255,255,0.42)",
                  pointerEvents: "none",
                }}
              />
            </div>

            <div style={{ marginTop: "18px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px",
                  marginBottom: "7px",
                }}
              >
                <label
                  htmlFor="zoom-foto-aluno"
                  style={{
                    fontSize: "10px",
                    fontWeight: 900,
                    color: "#475569",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  Zoom
                </label>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 800,
                    color: "#2563eb",
                  }}
                >
                  {Math.round(zoom * 100)}%
                </span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "28px 1fr 28px",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span style={{ textAlign: "center", fontSize: "16px" }}>−</span>
                <input
                  id="zoom-foto-aluno"
                  type="range"
                  min={ZOOM_MINIMO}
                  max={ZOOM_MAXIMO}
                  step={0.01}
                  value={zoom}
                  disabled={processando}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  style={{ width: "100%", cursor: "pointer" }}
                />
                <span style={{ textAlign: "center", fontSize: "16px" }}>＋</span>
              </div>
            </div>

            <button
              type="button"
              onClick={centralizarImagem}
              disabled={processando}
              style={{
                width: "100%",
                marginTop: "12px",
                padding: "10px",
                borderRadius: "11px",
                border: "1px solid #e2e8f0",
                backgroundColor: "#f8fafc",
                color: "#475569",
                fontSize: "10px",
                fontWeight: 900,
                cursor: processando ? "not-allowed" : "pointer",
                textTransform: "uppercase",
              }}
            >
              Centralizar novamente
            </button>

            {erro && (
              <div
                style={{
                  marginTop: "12px",
                  padding: "10px",
                  borderRadius: "10px",
                  border: "1px solid #fecaca",
                  backgroundColor: "#fff1f2",
                  color: "#b91c1c",
                  fontSize: "10px",
                  fontWeight: 700,
                }}
              >
                {erro}
              </div>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1.4fr",
                gap: "10px",
                marginTop: "16px",
              }}
            >
              <button
                type="button"
                onClick={fecharEditor}
                disabled={processando}
                style={{
                  padding: "13px",
                  borderRadius: "12px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "white",
                  color: "#475569",
                  fontSize: "11px",
                  fontWeight: 900,
                  cursor: processando ? "not-allowed" : "pointer",
                }}
              >
                CANCELAR
              </button>

              <button
                type="button"
                onClick={gerarFotoRecortada}
                disabled={processando}
                style={{
                  padding: "13px",
                  borderRadius: "12px",
                  border: "none",
                  backgroundColor: processando ? "#93c5fd" : "#2563eb",
                  color: "white",
                  fontSize: "11px",
                  fontWeight: 900,
                  cursor: processando ? "wait" : "pointer",
                  boxShadow: "0 8px 18px rgba(37,99,235,0.23)",
                }}
              >
                {processando ? "PROCESSANDO..." : "USAR ESTA FOTO"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}