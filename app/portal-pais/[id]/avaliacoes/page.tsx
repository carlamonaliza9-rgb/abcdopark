"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import { BarChart3, Star, ClipboardCheck } from "lucide-react";

export default function AvaliaçõesPage() {
  const { id } = useParams();
  const [avaliacoes, setAvaliacoes] = useState<any[]>([]);
  const [aluno, setAluno] = useState<any>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function buscarDados() {
      // 1. Busca nome do aluno para o cabeçalho
      const { data: dadosAluno } = await supabase
        .from("alunos")
        .select("nome")
        .eq("id", id)
        .single();
      
      if (dadosAluno) setAluno(dadosAluno);

      // 2. Busca avaliações vinculadas a este ID de aluno
      // Ajuste o nome da tabela 'avaliacoes' se no seu banco for diferente
      const { data: lista } = await supabase
        .from("avaliacoes") 
        .select("*")
        .eq("aluno_id", id) 
        .order("created_at", { ascending: false });

      if (data) setAvaliacoes(data);
      setCarregando(false);
    }
    buscarDados();
  }, [id]);

  if (carregando) return <div className="p-10 text-center text-[10px] font-black uppercase text-slate-300 animate-pulse">Carregando avaliações...</div>;

  return (
    <div className="animate-in fade-in duration-500">
      <header className="mb-6 border-b border-slate-100 pb-6">
        <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight italic">Avaliações e Notas</h1>
        <p className="text-[9px] font-bold uppercase text-slate-400 tracking-widest mt-1">
          Desempenho de: <span className="text-indigo-600">{aluno?.nome}</span>
        </p>
      </header>

      <div className="space-y-4">
        {avaliacoes.length > 0 ? avaliacoes.map((item, index) => (
          <div key={index} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:border-indigo-100 transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
                  <ClipboardCheck size={18} />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-sm uppercase leading-tight">{item.titulo || "Parecer Pedagógico"}</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{item.bimestre || "Referente ao período"}</p>
                </div>
              </div>
              <div className="bg-indigo-600 text-white px-3 py-1 rounded-full text-[10px] font-black">
                NOTA: {item.nota || "A"}
              </div>
            </div>
            
            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl italic">
              "{item.comentario || "Nenhum comentário pedagógico registrado para este período."}"
            </p>
          </div>
        )) : (
          <div className="bg-white p-10 rounded-2xl border border-dashed border-slate-200 text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase italic">Ainda não há avaliações registradas para este aluno.</p>
          </div>
        )}
      </div>
    </div>
  );
}