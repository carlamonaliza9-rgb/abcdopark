"use client";

import { Users, BookOpen, CalendarDays, MoreVertical } from "lucide-react";

interface TurmaCardProps {
  turma: any;
  ehAdmin: boolean;
  onAbrirTurma: (turma: any) => void;
  onEditarProfessor: (e: React.MouseEvent, nomeTurma: string) => void;
  onGerenciarMaterias: (e: React.MouseEvent, nomeTurma: string) => void;
  onAbrirUploadHorario: (e: React.MouseEvent, turma: any) => void;
  onAbrirAgenda: (e: React.MouseEvent, turma: any) => void;
}

export function TurmaCard({ turma, ehAdmin, onAbrirTurma, onEditarProfessor, onGerenciarMaterias, onAbrirUploadHorario, onAbrirAgenda }: TurmaCardProps) {
  
  const primeiroUltimo = (nomeCompleto: string) => {
    if (!nomeCompleto) return "";
    const partes = nomeCompleto.trim().split(" ");
    if (partes.length <= 1) return partes[0];
    return `${partes[0]} ${partes[partes.length - 1]}`;
  };

  // Cor base definida ou fallback
  const bgColor = turma.cor || '#f1f5f9';

  // O Segredo do Degradê: Mistura a cor base com 60% de branco no topo e desce para a cor 100% pura na base
  const cardStyle = {
    background: `linear-gradient(145deg, color-mix(in srgb, ${bgColor} 40%, white) 0%, ${bgColor} 100%)`
  };

  return (
    <div 
      onClick={() => onAbrirTurma(turma)} 
      className="group relative flex flex-col rounded-[2rem] p-5 text-center cursor-pointer transition-all duration-300 hover:-translate-y-2 shadow-sm hover:shadow-xl border border-white/60 overflow-hidden min-h-[380px]"
      style={cardStyle}
    >
      {/* Brilho superior tipo "Vidro" para dar volume 3D */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-white/5 to-transparent pointer-events-none rounded-[2rem]"></div>

      <div className="relative z-10 flex flex-col items-center mb-4">
        <div className="text-4xl mb-2 drop-shadow-sm transition-transform duration-300 group-hover:scale-110">
          {turma.icone || '🏫'}
        </div>
        <h3 className="text-xl font-black text-slate-800 tracking-tight">
          {turma.nome}
        </h3>
      </div>

      <div className="relative z-10 flex flex-col gap-2 flex-grow">
        
        {/* Regente */}
        {turma.regentes && turma.regentes.length > 0 ? (
          turma.regentes.map((r: string, idx: number) => (
             <div key={`reg-${idx}`} className="bg-white/80 backdrop-blur-md rounded-2xl p-3 flex flex-col gap-0.5 text-left shadow-[0_2px_10px_rgb(0,0,0,0.02)] border border-white transition-colors group-hover:bg-white">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Professor Regente</span>
              <span className="text-xs font-bold text-slate-700 leading-tight truncate">{primeiroUltimo(r)}</span>
            </div>
          ))
        ) : (
           <div className="bg-white/80 backdrop-blur-md rounded-2xl p-3 flex flex-col gap-0.5 text-left shadow-[0_2px_10px_rgb(0,0,0,0.02)] border border-white transition-colors group-hover:bg-white">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Professor Regente</span>
              <span className="text-xs font-bold text-slate-400 leading-tight truncate">Não Definido</span>
           </div>
        )}
        
        {/* Auxiliar */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-3 flex flex-col gap-0.5 text-left shadow-[0_2px_10px_rgb(0,0,0,0.02)] border border-white transition-colors group-hover:bg-white">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Auxiliar de Sala</span>
          <span className={`text-xs font-bold leading-tight truncate ${!turma.auxiliar ? 'text-slate-400' : 'text-slate-700'}`}>
            {turma.auxiliar ? primeiroUltimo(turma.auxiliar) : "Sem Auxiliar"}
          </span>
        </div>

        {/* Especialistas */}
        {turma.especialistas && turma.especialistas.length > 0 && (
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-3 flex flex-col gap-1.5 text-left shadow-[0_2px_10px_rgb(0,0,0,0.02)] border border-white transition-colors group-hover:bg-white">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Especialistas</span>
            <div className="flex flex-col gap-1">
              {turma.especialistas.map((esp: string, idx: number) => {
                 const match = esp.match(/(.*) \((.*)\)/); 
                 const nomeProf = match ? primeiroUltimo(match[1]) : primeiroUltimo(esp);
                 const materia = match ? match[2] : "";

                 return (
                   <div key={`esp-${idx}`} className="text-[10px] font-medium text-slate-600 flex items-start leading-snug">
                     <span className="text-emerald-500 font-black mr-1.5 opacity-80">•</span>
                     <span className="truncate">
                       {materia && <span className="font-extrabold text-slate-800">{materia}: </span>}
                       {nomeProf}
                     </span>
                   </div>
                 );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="relative z-10 flex justify-between items-center mt-4 pt-4 border-t border-slate-800/5">
        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1.5 bg-white/60 px-2.5 py-1.5 rounded-lg shadow-sm whitespace-nowrap">
            <Users size={12} className="text-slate-500" /> {turma.totalAlunos} Alunos
        </span>
        
        <div className="flex gap-1">
          {[
            { icon: <Users size={13} strokeWidth={2.5} />, action: onEditarProfessor, arg: turma.nome, title: "Vincular Equipe" },
            { icon: <BookOpen size={13} strokeWidth={2.5} />, action: onGerenciarMaterias, arg: turma.nome, title: "Grade de Matérias" },
            { icon: <CalendarDays size={13} strokeWidth={2.5} />, action: onAbrirUploadHorario, arg: turma, title: "Quadro de Horários" },
            { icon: <MoreVertical size={13} strokeWidth={2.5} />, action: onAbrirAgenda, arg: turma, title: "Mais Opções" }
          ].map((btn, i) => (
            <button 
              key={i}
              onClick={(e) => { e.stopPropagation(); btn.action(e, btn.arg); }} 
              title={btn.title} 
              className="w-7 h-7 bg-white/70 hover:bg-white text-slate-500 hover:text-slate-800 border border-white shadow-sm rounded-lg flex justify-center items-center transition-all duration-200 hover:scale-110 active:scale-95 shrink-0"
            >
              {btn.icon}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}