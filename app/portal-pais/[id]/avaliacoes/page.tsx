"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import { Star, Trophy, BookOpen, GraduationCap, CheckCircle2 } from "lucide-react";

export default function AvaliacoesPage() {
  const { id } = useParams();
  const [aluno, setAluno] = useState<any>(null);
  const [notas, setNotas] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function buscarDados() {
      if (!id) return;
      
      // Busca dados do aluno
      const { data: a } = await supabase.from("alunos").select("*").eq("id", id).single();
      if (a) setAluno(a);

      // Busca Notas (Simulando uma tabela 'notas')
      const { data: n } = await supabase.from("notas").select("*").eq("aluno_id", id);
      if (n) setNotas(n);

      setCarregando(false);
    }
    buscarDados();
  }, [id]);

  const renderEstrelas = (media: number) => (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={14} className={i < media ? "fill-yellow-400 text-yellow-400" : "text-slate-200"} />
      ))}
    </div>
  );

  const TopicoDesempenho = ({ titulo, nota }: { titulo: string, nota: number }) => (
    <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
      <div className="flex items-center gap-3">
        <div className="bg-white p-2 rounded-xl shadow-sm text-indigo-500">
          <CheckCircle2 size={16} />
        </div>
        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{titulo}</span>
      </div>
      {renderEstrelas(nota)}
    </div>
  );

  if (carregando) return <div className="p-10 text-center text-[10px] font-black uppercase text-slate-300 animate-pulse tracking-widest">Carregando avaliações...</div>;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10 w-full px-2">
      
      <header className="mb-10">
        <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter italic">Desempenho Escolar</h1>
        <p className="text-[9px] font-bold uppercase text-slate-400 tracking-widest mt-2 italic">Acompanhamento Pedagógico: <span className="text-indigo-600 font-black">{aluno?.nome}</span></p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* COLUNA 1: AVALIAÇÃO POR TÓPICOS (ESTRELAS) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-50">
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-600"><Trophy size={20} /></div>
              <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest">Avaliação Socioemocional</h2>
            </div>
            
            <div className="space-y-3">
              <TopicoDesempenho titulo="Participação" nota={5} />
              <TopicoDesempenho titulo="Comportamento" nota={5} />
              <TopicoDesempenho titulo="Tarefas" nota={4} />
              <TopicoDesempenho titulo="Pontualidade" nota={5} />
              <TopicoDesempenho titulo="Interação Social" nota={5} />
            </div>

            <div className="mt-8 pt-6 border-t border-slate-50 text-center">
               <p className="text-[10px] font-black text-indigo-500 uppercase italic">"Excelente progresso neste bimestre!"</p>
            </div>
          </div>
        </div>

        {/* COLUNA 2: BOLETIM ESCOLAR */}
        <div className="lg:col-span-8 bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-50">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600"><BookOpen size={20} /></div>
              <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest">Boletim Escolar</h2>
            </div>
            <span className="bg-slate-100 px-4 py-2 rounded-xl text-[9px] font-black text-slate-500 uppercase tracking-widest">Ano Letivo 2025</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-y-2">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">Disciplina</th>
                  <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">1º Bim</th>
                  <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">2º Bim</th>
                  <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">3º Bim</th>
                  <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Média</th>
                </tr>
              </thead>
              <tbody>
                {["Língua Portuguesa", "Matemática", "Ciências", "História", "Geografia", "Artes", "Educação Física"].map((disc) => (
                  <tr key={disc} className="group">
                    <td className="bg-slate-50 group-hover:bg-indigo-50 px-5 py-4 rounded-l-2xl text-[10px] font-black text-slate-700 uppercase transition-colors">{disc}</td>
                    <td className="bg-slate-50 group-hover:bg-indigo-50 px-4 py-4 text-center text-xs font-bold text-slate-600">9.5</td>
                    <td className="bg-slate-50 group-hover:bg-indigo-50 px-4 py-4 text-center text-xs font-bold text-slate-600">--</td>
                    <td className="bg-slate-50 group-hover:bg-indigo-50 px-4 py-4 text-center text-xs font-bold text-slate-600">--</td>
                    <td className="bg-indigo-100/50 px-5 py-4 rounded-r-2xl text-center text-xs font-black text-indigo-600">9.5</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-10 flex flex-col md:flex-row gap-4 items-center justify-between p-6 bg-slate-900 rounded-[2rem] text-white">
            <div className="flex items-center gap-4">
              <div className="bg-white/10 p-3 rounded-2xl"><GraduationCap size={24} /></div>
              <div className="text-left">
                <p className="text-[10px] font-black uppercase opacity-50 tracking-widest">Situação Acadêmica</p>
                <p className="text-sm font-black uppercase italic tracking-tight">Destaque da Turma</p>
              </div>
            </div>
            <button className="bg-white text-slate-900 px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all active:scale-95">
              Imprimir Boletim
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}