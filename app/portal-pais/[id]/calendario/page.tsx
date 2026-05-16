"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";

export default function CalendarioPaisPage() {
  const { id } = useParams();
  const [eventos, setEventos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  useEffect(() => {
    async function buscarEventos() {
      const { data } = await supabase
        .from('eventos_calendario')
        .select('*')
        .order('data', { ascending: true });
      
      if (data) setEventos(data);
      setCarregando(false);
    }
    buscarEventos();
  }, []);

  const getEventoStyle = (titulo: string) => {
    const t = titulo.toLowerCase();
    const isEspecial = t.includes("feriado") || t.includes("facultado");
    return { 
      bg: isEspecial ? "#f5f3ff" : "#f0f7ff", 
      border: isEspecial ? "4px solid #8b5cf6" : "4px solid #2563eb", 
      color: isEspecial ? "#6d28d9" : "#2563eb" 
    };
  };

  const extrairDiaUTC = (dataString: string) => {
    const d = new Date(dataString + "T12:00:00");
    return d.getUTCDate();
  };

  if (carregando) return <div className="p-10 text-center text-xl sm:text-2xl md:text-[10px] font-black uppercase text-slate-300 animate-pulse">Carregando Calendário...</div>;

  // Lógica de ordenação: Identifica o mês atual e joga os meses que já passaram para o final da lista
  const mesAtualIndex = new Date().getMonth();
  const mesesTransformados = meses.map((mesNome, originalIndex) => ({ mesNome, originalIndex }));
  
  const mesesOrdenados = [
    ...mesesTransformados.filter(m => m.originalIndex >= mesAtualIndex),
    ...mesesTransformados.filter(m => m.originalIndex < mesAtualIndex)
  ];

  return (
    <div className="animate-in fade-in duration-500">
      <header className="mb-8 border-b border-slate-100 pb-8">
        <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight italic">Calendário Escolar</h1>
        <p className="text-lg md:text-[9px] font-bold uppercase text-slate-400 tracking-widest mt-1">
          Acompanhe as datas e eventos da ABC do Park
        </p>
      </header>

      {/* GRID DE MESES: Modificado para md:grid-cols-2 garantindo uma única coluna vertical no celular */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {mesesOrdenados.map(({ mesNome, originalIndex }) => (
          <div key={originalIndex} className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-50 flex flex-col h-full">
            <h3 className="text-xl sm:text-2xl md:text-[10px] font-black text-indigo-600 border-b border-slate-50 pb-2 mb-3 uppercase tracking-widest flex items-center justify-between">
              <span>{mesNome}</span>
              {originalIndex < mesAtualIndex && (
                <span className="text-xs text-slate-300 font-bold lowercase italic tracking-normal">(passado)</span>
              )}
            </h3>
            
            <div className="flex flex-col gap-2">
              {eventos.filter(ev => new Date(ev.data + "T12:00:00").getUTCMonth() === originalIndex).length > 0 ? (
                eventos.filter(ev => new Date(ev.data + "T12:00:00").getUTCMonth() === originalIndex).map((ev, i) => {
                  const estilo = getEventoStyle(ev.titulo);
                  return (
                    <div 
                      key={i} 
                      style={{ backgroundColor: estilo.bg, borderLeft: estilo.border }}
                      className="p-3 rounded-xl transition-all hover:scale-[1.02]"
                    >
                      <span className="text-lg md:text-[8px] font-black block mb-0.5" style={{ color: estilo.color }}>
                        DIA {extrairDiaUTC(ev.data)}
                      </span>
                      <span className="text-xl sm:text-2xl md:text-[10px] font-bold text-slate-700 leading-tight block uppercase">
                        {ev.titulo}
                      </span>
                    </div>
                  );
                })
              ) : (
                <p className="text-lg md:text-[9px] text-slate-300 font-bold uppercase italic mt-1">Sem eventos</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}