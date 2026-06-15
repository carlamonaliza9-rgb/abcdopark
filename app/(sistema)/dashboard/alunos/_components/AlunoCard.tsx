"use client";

import { useRouter } from "next/navigation";

interface AlunoCardProps {
  aluno: any;
  obterCorTurma: (turma: string) => string;
  mWhatsApp: (v: string) => string;
  onAbrirFicha: (aluno: any) => void;
  rotaPaginaCompleta?: boolean; 
}

export function AlunoCard({ aluno, obterCorTurma, mWhatsApp, onAbrirFicha, rotaPaginaCompleta }: AlunoCardProps) {
  const router = useRouter();
  const isTransferido = aluno.status === 'transferido';
  
  // A cor da turma define o tema principal
  const accentColor = isTransferido ? '#cbd5e1' : obterCorTurma(aluno.turma);

  const lidarComClique = () => {
    if (rotaPaginaCompleta) {
      router.push(`/admin/alunos/${aluno.id}`);
    } else {
      onAbrirFicha(aluno);
    }
  };

  return (
    <div 
      key={aluno.id} 
      onClick={lidarComClique}
      className="bg-white cursor-pointer flex flex-col h-full transition-all duration-300 hover:-translate-y-1 relative group"
      style={{ 
        borderRadius: '20px', 
        border: `3px solid ${isTransferido ? '#e2e8f0' : accentColor}`,
        boxShadow: `0 8px 24px -4px ${accentColor}10` 
      }}
    >
      {/* 1. FAIXA COLORIDA NO TOPO (Capa) */}
      <div 
        className="w-full h-[88px] relative rounded-t-[18px] transition-colors" 
        style={{ backgroundColor: accentColor }}
      >
        {/* Indicadores de status no topo esquerdo */}
        <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-white/40 backdrop-blur-md px-2.5 py-1 rounded-full shadow-sm">
          {!isTransferido && <div className="w-2.5 h-2.5 bg-green-500 rounded-full shadow-sm" title="Matrícula Ativa" />}
          {aluno.tem_alergia && <span className="text-[10px]" title="Alergia">⚠️</span>}
          {aluno.e_autista && <span className="text-[10px]" title="Autista">🧩</span>}
        </div>

        {/* Tag de Vencimento no topo direito */}
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-black text-slate-600 tracking-widest shadow-sm">
          VENC: {aluno.vencimento || '--'}
        </div>
      </div>

      {/* 2. CORPO DO CARD (Fundo Branco) */}
      <div className="flex-1 flex flex-col items-center px-4 pb-6 relative bg-white rounded-b-[18px]">
        
        {/* Foto centralizada */}
        <div className="-mt-11 mb-3 relative z-10 transition-transform duration-300 group-hover:scale-105">
          {aluno.foto_url ? (
            <img 
              src={aluno.foto_url} 
              className="h-[120px] w-[120px] rounded-full object-cover border-4 border-white shadow-md bg-white" 
              alt={`Foto de ${aluno.nome}`}
            />
          ) : (
            <div className="h-[120px] w-[120px] rounded-full bg-slate-50 border-4 border-white shadow-md flex items-center justify-center text-2xl font-black text-slate-300">
              {aluno.nome.charAt(0)}
            </div>
          )}
        </div>

        {/* Tag da Turma */}
        <span 
          className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-3"
          style={{ 
            backgroundColor: isTransferido ? '#f8fafc' : `${accentColor}15`,
            color: isTransferido ? '#64748b' : accentColor
          }}
        >
          {isTransferido ? "Transferido" : (aluno.turma || "Sem Turma")}
        </span>

        {/* Nome do Aluno */}
        <h3 className="text-[15px] font-black text-slate-800 text-center leading-tight mb-4 min-h-[44px] flex items-center justify-center line-clamp-2 px-2">
          {aluno.nome}
        </h3>

        {/* Rodapé: Dados do Responsável com linha colorida herdando a cor da turma */}
        <div 
          className="w-full pt-6 mt-auto border-t-2 flex flex-col items-center text-center transition-colors"
          style={{ borderColor: isTransferido ? '#e2e8f0' : `${accentColor}99` }} // 40 no final aplica 25% de opacidade no hex
        >
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
            Responsável
          </p>
          <p className="text-[12px] font-bold text-slate-700 truncate w-full mb-0.5 px-2">
            {aluno.responsavel || "Não informado"}
          </p>
          <p className="text-[11px] font-black text-slate-500 flex items-center justify-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
            </svg>
            {mWhatsApp(aluno.whatsapp || "") || "--"}
          </p>
        </div>

      </div>
    </div>
  );
}