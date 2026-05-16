"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import { Calendar as CalendarIcon, Bell, Heart, Star } from "lucide-react";

export default function DashboardAluno() {
  const params = useParams();
  // Garante que o ID seja tratado corretamente como string
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  
  const router = useRouter();
  const [aluno, setAluno] = useState<any>(null);
  const [nomeResponsavel, setNomeResponsavel] = useState("");
  const [colegas, setColegas] = useState<any[]>([]);
  const [programacoes, setProgramacoes] = useState<any[]>([]);
  const [equipe, setEquipe] = useState<any[]>([]);
  const [abaAniversario, setAbaAniversario] = useState<"turma" | "equipe">("turma");
  
  // Estados para a conexão com o Diário de Classe (Estrelas)
  const [mediaGeral, setMediaGeral] = useState<number>(0);
  const [criterios, setCriterios] = useState({
    participacao: 0,
    comportamento: 0,
    atividades: 0,
    socioemocional: 0
  });

  useEffect(() => {
    if (id) {
      buscarDadosIniciais();
      buscarMediaEstrelas();
    }
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
    if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) { idade--; }
    return `${idade} anos`;
  };

  const obterPesoCronologico = (dataString: string) => {
    if (!dataString) return 9999;
    const d = new Date(dataString + "T12:00:00");
    return ((d.getUTCMonth() + 1) * 100) + d.getUTCDate();
  };

  async function buscarMediaEstrelas() {
    const { data: avaliacoes } = await supabase
      .from("avaliacoes")
      .select("participacao, comportamento, atividades, socioemocional")
      .eq("aluno_id", id);

    if (avaliacoes && avaliacoes.length > 0) {
      let somaParticipacao = 0;
      let somaComportamento = 0;
      let somaAtividades = 0;
      let somaSocioemocional = 0;

      avaliacoes.forEach(a => {
        somaParticipacao += (a.participacao || 0);
        somaComportamento += (a.comportamento || 0);
        somaAtividades += (a.atividades || 0);
        somaSocioemocional += (a.socioemocional || 0);
      });

      const total = avaliacoes.length;
      const medias = {
        participacao: somaParticipacao / total,
        comportamento: somaComportamento / total,
        atividades: somaAtividades / total,
        socioemocional: somaSocioemocional / total
      };

      setCriterios(medias);

      // Média Geral baseada nos 4 critérios do diário
      const final = (medias.participacao + medias.comportamento + medias.atividades + medias.socioemocional) / 4;
      setMediaGeral(final);
    }
  }

  async function buscarDadosIniciais() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push("/");

    const emailLogado = user.email?.toLowerCase().trim();

    const { data: dadosAluno } = await supabase
      .from("alunos")
      .select("*")
      .eq("id", id)
      .single();

    if (dadosAluno) {
      // Ajuste de segurança para comparar e-mails sem erro de espaços ou maiúsculas
      const email1 = dadosAluno.email_responsavel?.toLowerCase().trim();
      const email2 = dadosAluno.email_responsavel_2?.toLowerCase().trim();
      const email3 = dadosAluno.email_responsavel_3?.toLowerCase().trim();

      const ehResponsavel = 
        email1 === emailLogado || 
        email2 === emailLogado || 
        email3 === emailLogado;

      if (!ehResponsavel) {
        console.error("Acesso negado: Este e-mail não é responsável por este aluno.");
        return router.push("/dashboard");
      }

      setAluno(dadosAluno);
      
      let nomeCompletoResp = dadosAluno.responsavel;
      if (email2 === emailLogado) nomeCompletoResp = dadosAluno.responsavel_2_nome;
      if (email3 === emailLogado) nomeCompletoResp = dadosAluno.responsavel_3_nome;
      
      setNomeResponsavel(nomeCompletoResp?.split(' ')[0] || "Responsável");

      const { data: c } = await supabase.from("alunos").select("nome, data_nascimento, foto_url").eq("turma", dadosAluno.turma);
      if (c) setColegas(c.sort((a, b) => obterPesoCronologico(a.data_nascimento) - obterPesoCronologico(b.data_nascimento)));
    }

    const { data: p } = await supabase.from("eventos_calendario").select("*").order("data", { ascending: true });
    if (p) setProgramacoes(p);
    
    const { data: e } = await supabase.from("funcionarios").select("nome, data_nascimento, foto_url");
    if (e) setEquipe(e.sort((a, b) => obterPesoCronologico(a.data_nascimento) - obterPesoCronologico(b.data_nascimento)));
  }

  const formatarData = (d: string) => d ? d.split("-").reverse().slice(0, 2).join("/") : "";
  const renderEstrelas = (media: number) => Array.from({ length: 5 }).map((_, i) => <Star key={i} size={20} className={i < Math.round(media) ? "fill-yellow-400 text-yellow-400" : "text-slate-200"} />);

  if (!aluno) return <div className="p-10 text-center text-xl sm:text-2xl md:text-[10px] font-black uppercase text-slate-300 animate-pulse tracking-widest">Carregando painel...</div>;

  return (
    <div className="animate-in fade-in duration-500 pb-10 px-4 md:px-0">
      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 pb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl md:text-2xl font-black text-slate-800 uppercase tracking-tight italic">Olá, {nomeResponsavel}! 👋</h1>
          <p className="text-slate-400 font-bold uppercase text-lg sm:text-xl md:text-[9px] tracking-widest mt-1">Portal da Família • <span className="text-indigo-600">Acompanhando: {aluno.nome}</span></p>
        </div>
        <button onClick={() => router.push(`/portal-pais/${id}/calendario`)} className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-5 py-3 rounded-xl font-bold text-base sm:text-lg md:text-[10px] uppercase tracking-wider hover:bg-indigo-700 shadow-sm active:scale-95 w-full md:w-auto">
          <CalendarIcon size={14} strokeWidth={3} /> Calendário Escolar
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 md:gap-8">
        {/* COLUNA ESQUERDA: PERFIL + MÉDIAS (SE EMPILHA LADO A LADO EM TABLETS/CELULARES DEITADOS) */}
        <div className="md:col-span-2 lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-col gap-6">
          <div className="bg-white p-3 rounded-[2rem] shadow-sm border border-slate-50">
            <div className="aspect-square w-full rounded-[1.5rem] overflow-hidden shadow-inner bg-slate-100">
              {aluno.foto_url ? <img src={aluno.foto_url} alt={aluno.nome} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300 font-black text-4xl">{aluno.nome[0]}</div>}
            </div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-50 text-center flex flex-col justify-center">
            <p className="text-xl sm:text-2xl md:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Média de Desempenho</p>
            <div className="flex justify-center gap-1 mb-1">{renderEstrelas(mediaGeral)}</div>
            <p className="text-lg sm:text-xl md:text-[8px] font-black text-indigo-500 uppercase italic mb-4">
              {mediaGeral >= 4.5 ? "Excelente Aluno(a)!" : mediaGeral >= 3.5 ? "Bom Desempenho!" : "Acompanhamento Necessário"}
            </p>
            
            <div className="grid grid-cols-1 gap-1.5 pt-3 border-t border-slate-50">
              {[
                { label: "Participação", valor: criterios.participacao },
                { label: "Comportamento", valor: criterios.comportamento },
                { label: "Atividades", valor: criterios.atividades },
                { label: "Socioemocional", valor: criterios.socioemocional }
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between bg-slate-50 px-3 py-2.5 rounded-lg border border-slate-100/50">
                  <span className="text-lg sm:text-xl md:text-[8px] font-black text-slate-500 uppercase tracking-wider">{item.label}</span>
                  <div className={`w-2 h-2 rounded-full shadow-sm ${item.valor >= 3.5 ? 'bg-green-400 shadow-green-100' : item.valor >= 2.5 ? 'bg-yellow-400 shadow-yellow-100' : 'bg-red-400 shadow-red-100'}`} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* PROXIMAS PROGRAMAÇÕES */}
        <div className="md:col-span-1 lg:col-span-4 bg-white rounded-[2rem] p-6 shadow-sm border border-slate-50 flex flex-col h-[450px] md:h-[520px]">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-indigo-50 p-3 rounded-xl text-xl">🗓️</div>
            <h2 className="text-xl sm:text-2xl md:text-xs font-black text-slate-800 uppercase tracking-widest">Próximas Programações</h2>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            {programacoes.map((prog) => {
              const estilo = getEventoStyle(prog.titulo);
              return (
                <div key={prog.id} className={`${estilo.bg} p-4 rounded-2xl border-l-4 ${estilo.border}`}>
                  <p className={`font-black ${estilo.text} text-base sm:text-lg md:text-[8px] mb-1 uppercase tracking-widest`}>{formatarData(prog.data)}</p>
                  <h3 className="font-bold text-slate-800 text-lg sm:text-xl md:text-[10px] uppercase">{prog.titulo}</h3>
                </div>
              );
            })}
          </div>
        </div>

        {/* ANIVERSÁRIOS */}
        <div className="md:col-span-1 lg:col-span-5 bg-white rounded-[2rem] p-6 shadow-sm border border-slate-50 flex flex-col h-[450px] md:h-[520px]">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-pink-50 p-3 rounded-xl text-xl">🧁</div>
              <h2 className="text-xl sm:text-2xl md:text-xs font-black text-slate-800 uppercase tracking-widest">Aniversários</h2>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
              <button onClick={() => setAbaAniversario("turma")} className={`px-4 py-1.5 rounded-lg text-base sm:text-lg md:text-[8px] font-black uppercase transition-all ${abaAniversario === "turma" ? "bg-white shadow text-indigo-600" : "text-slate-400"}`}>Turma</button>
              <button onClick={() => setAbaAniversario("equipe")} className={`px-4 py-1.5 rounded-lg text-base sm:text-lg md:text-[8px] font-black uppercase transition-all ${abaAniversario === "equipe" ? "bg-white shadow text-pink-600" : "text-slate-400"}`}>Equipe</button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 gap-2 content-start custom-scrollbar">
            {(abaAniversario === "turma" ? colegas : equipe).map((p, idx) => (
              <div key={idx} className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-transparent hover:border-slate-200 transition-all">
                <div className="w-10 h-10 rounded-full bg-white border border-slate-100 overflow-hidden flex-shrink-0 flex items-center justify-center font-bold text-xs text-slate-300">{p.foto_url ? <img src={p.foto_url} className="w-full h-full object-cover" /> : p.nome[0]}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-black text-slate-800 text-lg sm:text-xl md:text-[10px] uppercase truncate leading-none">{abaAniversario === "equipe" ? `Tio(a) ${p.nome.split(' ')[0]}` : p.nome.split(' ')[0]}</p>
                    {abaAniversario === "turma" && <span className="text-base sm:text-lg md:text-[8px] font-black text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded-md uppercase">{calcularIdade(p.data_nascimento)}</span>}
                  </div>
                  <p className="text-base sm:text-lg md:text-[9px] text-indigo-500 font-bold mt-1">🎂 {formatarData(p.data_nascimento)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}