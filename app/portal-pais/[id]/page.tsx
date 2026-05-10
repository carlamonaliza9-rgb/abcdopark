"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import { Calendar as CalendarIcon, Bell, Heart, Star } from "lucide-react";

export default function DashboardAluno() {
  const { id } = useParams();
  const router = useRouter();
  const [aluno, setAluno] = useState<any>(null);
  const [nomeResponsavel, setNomeResponsavel] = useState("");
  const [colegas, setColegas] = useState<any[]>([]);
  const [programacoes, setProgramacoes] = useState<any[]>([]);
  const [equipe, setEquipe] = useState<any[]>([]);
  const [abaAniversario, setAbaAniversario] = useState<"turma" | "equipe">("turma");

  const cpfResponsavelLogado = "016.959.772-54"; 

  useEffect(() => {
    if (id) buscarDadosIniciais();
  }, [id]);

  const getEventoStyle = (titulo: string) => {
    const t = titulo.toLowerCase();
    const isEspecial = t.includes("feriado") || t.includes("facultado");
    return {
      border: isEspecial ? "border-purple-500" : "border-indigo-500",
      text: isEspecial ? "text-purple-600" : "text-indigo-600",
      bg: isEspecial ? "bg-purple-50" : "bg-slate-50"
    };
  };

  const calcularIdade = (dataNasc: string) => {
    if (!dataNasc) return "";
    const hoje = new Date();
    const nascimento = new Date(dataNasc);
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const m = hoje.getMonth() - nascimento.getMonth();
    // AQUI ESTAVA O ERRO: Corrigido de 'hoy' para 'hoje'
    if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) { idade--; }
    return `${idade} anos`;
  };

  const obterPesoCronologico = (dataString: string) => {
    if (!dataString) return 9999;
    const d = new Date(dataString + "T12:00:00");
    return ((d.getUTCMonth() + 1) * 100) + d.getUTCDate();
  };

  async function buscarDadosIniciais() {
    const { data: dadosAluno } = await supabase.from("alunos").select("*").eq("id", id).single();
    if (dadosAluno) {
      setAluno(dadosAluno);
      const nomeFull = dadosAluno.cpf_responsavel === cpfResponsavelLogado ? dadosAluno.responsavel : dadosAluno.responsavel_2_nome;
      setNomeResponsavel(nomeFull?.split(' ')[0] || "Responsável");
      const { data: c } = await supabase.from("alunos").select("nome, data_nascimento, foto_url").eq("turma", dadosAluno.turma);
      if (c) setColegas(c.sort((a, b) => obterPesoCronologico(a.data_nascimento) - obterPesoCronologico(b.data_nascimento)));
    }
    const { data: p } = await supabase.from("eventos_calendario").select("*").order("data", { ascending: true });
    if (p) setProgramacoes(p);
    const { data: e } = await supabase.from("funcionarios").select("nome, data_nascimento, foto_url");
    if (e) setEquipe(e.sort((a, b) => obterPesoCronologico(a.data_nascimento) - obterPesoCronologico(b.data_nascimento)));
  }

  const formatarData = (d: string) => d ? d.split("-").reverse().slice(0, 2).join("/") : "";
  const renderEstrelas = (media: number) => Array.from({ length: 5 }).map((_, i) => <Star key={i} size={14} className={i < media ? "fill-yellow-400 text-yellow-400" : "text-slate-200"} />);

  if (!aluno) return <div className="p-10 text-center text-[10px] font-black uppercase text-slate-300 animate-pulse tracking-widest">Carregando painel...</div>;

  return (
    <div className="animate-in fade-in duration-500 pb-10">
      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 pb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight italic">Olá, {nomeResponsavel}! 👋</h1>
          <p className="text-slate-400 font-bold uppercase text-[9px] tracking-widest mt-1">Portal da Família • <span className="text-indigo-600">Acompanhando: {aluno.nome}</span></p>
        </div>
        <button onClick={() => router.push(`/portal-pais/${id}/calendario`)} className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-3 rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-indigo-700 shadow-sm active:scale-95">
          <CalendarIcon size={14} strokeWidth={3} /> Calendário Escolar
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-3 flex flex-col gap-6">
          <div className="bg-white p-3 rounded-[2rem] shadow-sm border border-slate-50">
            <div className="aspect-square w-full rounded-[1.5rem] overflow-hidden shadow-inner bg-slate-100">
              {aluno.foto_url ? <img src={aluno.foto_url} alt={aluno.nome} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300 font-black text-4xl">{aluno.nome[0]}</div>}
            </div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-50 text-center">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Média de Desempenho</p>
            <div className="flex justify-center gap-1 mb-1">{renderEstrelas(5)}</div>
            <p className="text-[8px] font-black text-indigo-500 uppercase italic mb-4">Excelente Aluno(a)!</p>
            
            <div className="grid grid-cols-1 gap-1.5 pt-3 border-t border-slate-50">
              {["Participação", "Comportamento", "Tarefas", "Pontualidade"].map((t) => (
                <div key={t} className="flex items-center justify-between bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100/50">
                  <span className="text-[8px] font-black text-slate-500 uppercase">{t}</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-sm shadow-green-100" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 bg-white rounded-[2rem] p-6 shadow-sm border border-slate-50 flex flex-col h-[520px]">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-indigo-50 p-3 rounded-xl text-xl">🗓️</div>
            <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest">Próximas Programações</h2>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            {programacoes.map((prog) => {
              const estilo = getEventoStyle(prog.titulo);
              return (
                <div key={prog.id} className={`${estilo.bg} p-4 rounded-2xl border-l-4 ${estilo.border}`}>
                  <p className={`font-black ${estilo.text} text-[8px] mb-1 uppercase tracking-widest`}>{formatarData(prog.data)}</p>
                  <h3 className="font-bold text-slate-800 text-[10px] uppercase">{prog.titulo}</h3>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-5 bg-white rounded-[2rem] p-6 shadow-sm border border-slate-50 flex flex-col h-[520px]">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-pink-50 p-3 rounded-xl text-xl">🧁</div>
              <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest">Aniversários</h2>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button onClick={() => setAbaAniversario("turma")} className={`px-4 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${abaAniversario === "turma" ? "bg-white shadow text-indigo-600" : "text-slate-400"}`}>Turma</button>
              <button onClick={() => setAbaAniversario("equipe")} className={`px-4 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${abaAniversario === "equipe" ? "bg-white shadow text-pink-600" : "text-slate-400"}`}>Equipe</button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 gap-2 content-start custom-scrollbar">
            {(abaAniversario === "turma" ? colegas : equipe).map((p, idx) => (
              <div key={idx} className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-transparent hover:border-slate-200 transition-all">
                <div className="w-10 h-10 rounded-full bg-white border border-slate-100 overflow-hidden flex-shrink-0 flex items-center justify-center font-bold text-xs text-slate-300">{p.foto_url ? <img src={p.foto_url} className="w-full h-full object-cover" /> : p.nome[0]}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-black text-slate-800 text-[10px] uppercase truncate leading-none">{abaAniversario === "equipe" ? `Tio(a) ${p.nome.split(' ')[0]}` : p.nome.split(' ')[0]}</p>
                    {abaAniversario === "turma" && <span className="text-[8px] font-black text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded-md uppercase">{calcularIdade(p.data_nascimento)}</span>}
                  </div>
                  <p className="text-[9px] text-indigo-500 font-bold mt-1">🎂 {formatarData(p.data_nascimento)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}