"use client";

import { 
  ShieldCheck, 
  FileBadge, 
  BadgeDollarSign, 
  RefreshCcwDot, 
  ClipboardList, 
  Scale, 
  CalendarDays, 
  Megaphone,
  ArrowRight,
  LockKeyhole,
  FileClock
} from "lucide-react";

interface MenuProps {
  setDocumentoAtivo: (doc: string) => void;
}

const temas = {
  purple: { iconBg: 'bg-purple-50', iconText: 'text-purple-500', btnBg: 'bg-purple-50', btnText: 'text-purple-600', btnHover: 'group-hover:bg-purple-100' },
  emerald: { iconBg: 'bg-emerald-50', iconText: 'text-emerald-500', btnBg: 'bg-emerald-50', btnText: 'text-emerald-600', btnHover: 'group-hover:bg-emerald-100' },
  blue: { iconBg: 'bg-blue-50', iconText: 'text-blue-500', btnBg: 'bg-blue-50', btnText: 'text-blue-600', btnHover: 'group-hover:bg-blue-100' },
  orange: { iconBg: 'bg-orange-50', iconText: 'text-orange-500', btnBg: 'bg-orange-50', btnText: 'text-orange-600', btnHover: 'group-hover:bg-orange-100' },
  teal: { iconBg: 'bg-teal-50', iconText: 'text-teal-500', btnBg: 'bg-teal-50', btnText: 'text-teal-600', btnHover: 'group-hover:bg-teal-100' },
  pink: { iconBg: 'bg-pink-50', iconText: 'text-pink-500', btnBg: 'bg-pink-50', btnText: 'text-pink-600', btnHover: 'group-hover:bg-pink-100' },
  indigo: { iconBg: 'bg-indigo-50', iconText: 'text-indigo-500', btnBg: 'bg-indigo-50', btnText: 'text-indigo-600', btnHover: 'group-hover:bg-indigo-100' }
};

export default function MenuOpcoes({ setDocumentoAtivo }: MenuProps) {
  const opcoes = [
    { id: 'matricula', Icone: FileBadge, tema: temas.purple, titulo: 'Declaração de Matrícula', desc: 'Gera o documento padrão com dados do aluno.' },
    { id: 'quitacao', Icone: BadgeDollarSign, tema: temas.emerald, titulo: 'Quitação Imposto de Renda', desc: 'Declaração de valores pagos no ano base.' },
    { id: 'ressalva', Icone: RefreshCcwDot, tema: temas.blue, titulo: 'Ressalva', desc: 'Documento de transferência com direito à matrícula.' },
    { id: 'codes', Icone: ClipboardList, tema: temas.orange, titulo: 'CODES', desc: 'Relatório oficial (1º ao 5º Ano) exigido pela SEDUC.' },
    { id: 'notificacao', Icone: Scale, tema: temas.teal, titulo: 'Notificação Extrajudicial', desc: 'Cobrança formal de débitos em aberto.' },
    { id: 'provas', Icone: CalendarDays, tema: temas.pink, titulo: 'Cronograma de Provas', desc: 'Datas e conteúdos das avaliações e provas.' },
    { id: 'comunicados', Icone: Megaphone, tema: temas.indigo, titulo: 'Avisos e Comunicados', desc: 'Avisos formatados para Pais (Azul) e Equipe (Verde).' }
  ];

  return (
    <div className="w-full max-w-[1400px] mx-auto p-4 md:p-6 lg:p-8 animate-in fade-in duration-500">
      
      {/* CABEÇALHO COMPACTADO */}
      <div className="mb-5">
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight mb-1">Documentações Administrativas</h1>
        <p className="text-[13px] font-medium text-slate-500">Emissão de documentos oficiais da Escola ABC do Park.</p>
      </div>

      {/* BANNER SUPERIOR - ESPAÇAMENTO E ALTURA REDUZIDOS */}
      <div className="bg-slate-50/80 border border-slate-100 rounded-[1.5rem] p-4 md:py-4 md:px-6 mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0 border border-blue-100">
            <ShieldCheck size={24} strokeWidth={2} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-0.5">Documentos oficiais e seguros</h3>
            <p className="text-[11px] font-medium text-slate-500">Emita documentos com validade legal e padronização exigida pelos órgãos competentes.</p>
          </div>
        </div>
        <div className="hidden md:flex text-4xl drop-shadow-sm pr-2">
          📋✨
        </div>
      </div>

      {/* GRID DE CARTÕES COMPACTADOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {opcoes.map((opcao) => {
          const { Icone, tema } = opcao;
          return (
            <div 
              key={opcao.id}
              onClick={() => setDocumentoAtivo(opcao.id)} 
              className="group bg-white rounded-[1.5rem] p-5 flex flex-col items-center text-center border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer"
            >
              <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110 ${tema.iconBg} ${tema.iconText}`}>
                <Icone size={24} strokeWidth={2} />
              </div>
              
              <h3 className="text-[14px] font-extrabold text-slate-800 mb-1.5 leading-tight">
                {opcao.titulo}
              </h3>
              <p className="text-[11px] font-medium text-slate-400 mb-5 flex-1 px-1 leading-relaxed">
                {opcao.desc}
              </p>
              
              <div className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors ${tema.btnBg} ${tema.btnText} ${tema.btnHover}`}>
                Emitir <ArrowRight size={14} strokeWidth={2.5} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>

      {/* BANNER INFERIOR COMPACTADO */}
      <div className="bg-white border border-slate-200 rounded-[1.5rem] p-4 md:py-4 md:px-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center shrink-0 border border-slate-100">
            <LockKeyhole size={20} strokeWidth={2} />
          </div>
          <div>
            <h3 className="text-[13px] font-bold text-slate-800 mb-0.5">Seus documentos sempre disponíveis</h3>
            <p className="text-[10px] font-medium text-slate-400">Visualize e reimprima documentos a qualquer momento com segurança.</p>
          </div>
        </div>
        
        <button className="w-full md:w-auto flex items-center justify-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-blue-600 px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm transition-colors shrink-0">
          <FileClock size={16} strokeWidth={2.5} /> Ver histórico
        </button>
      </div>

    </div>
  );
}