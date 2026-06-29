"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { 
  CalendarDays, 
  Settings, 
  Users, 
  Cake, 
  AlertTriangle, 
  MessageCircleHeart,
  ChevronRight,
  Search,
  BookOpen,
  ClipboardList,
  Megaphone
} from "lucide-react";

export default function DashboardProfessorPage() {
  const router = useRouter();
  const [nomeUsuario, setNomeUsuario] = useState("Professor");
  const [nomeCompleto, setNomeCompleto] = useState(""); 
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [ilustracaoProfessor, setIlustracaoProfessor] = useState<string | null>(null);
  
  const [dados, setDados] = useState({
    totalAlunos: 0,
    minhasTurmas: [] as string[],
    porTurma: {} as { [key: string]: number },
    aniversariantes: [] as any[],
    alertasSaude: [] as any[],
    proximosEventos: [] as any[]
  });
  const [carregando, setCarregando] = useState(true);
  const [buscaSaude, setBuscaSaude] = useState("");
  
  const [modalConfigAberto, setModalConfigAberto] = useState(false);
  const [novoNomeInput, setNovoNomeInput] = useState("");

  const [modalBdayAberto, setModalBdayAberto] = useState(false);
  const [aniversariantesHoje, setAniversariantesHoje] = useState<any[]>([]);

  const [modalCalendarioAberto, setModalCalendarioAberto] = useState(false);
  const [eventos, setEventos] = useState<any[]>([]);

  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  async function carregarDados() {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) return router.push("/login");
      
      const emailAtual = authData.user.email || "";
      setUserEmail(emailAtual);
      
      const { data: perfil } = await supabase.from('perfis').select('cargo').eq('id', authData.user.id).single();
      const ehAdmin = emailAtual === 'carlamonaliza9@gmail.com' || emailAtual === 'diretoria@abcdopark.com' || perfil?.cargo === 'Admin';

      if (ehAdmin) return router.push("/dashboard");

      const { data: func } = await supabase.from('funcionarios').select('nome, foto_url').eq('email', emailAtual).single();
      if (func?.foto_url) setIlustracaoProfessor(func.foto_url);
      const nomeDoProf = func?.nome || "";

      const metadata = authData.user.user_metadata;
      let nome = metadata?.nome || metadata?.name || metadata?.full_name;
      if (!nome && emailAtual) {
        const emailPart = emailAtual.split('@')[0];
        nome = emailPart.charAt(0).toUpperCase() + emailPart.slice(1);
      }
      if (nome) {
        setNomeCompleto(nome);
        setNomeUsuario(nome.split(' ')[0]);
        setNovoNomeInput(nome);
      }

      const [resAlunos, resFuncs, resEventos, resTurmasInfo, resTurmasProf] = await Promise.all([
        supabase.from('alunos').select('*'),
        supabase.from('funcionarios').select('*'),
        supabase.from('eventos_calendario').select('*').order('data', { ascending: true }),
        supabase.from('turmas_info').select('*'),
        supabase.from('turma_disciplinas').select('nome_turma').eq('professor_vinculado', nomeDoProf).eq('ano', '2026')
      ]);

      const alunos = resAlunos.data;
      const funcionarios = resFuncs.data;
      const listaEventos = resEventos.data;
      const turmasInfo = resTurmasInfo.data;
      const turmasDisciplinas = resTurmasProf.data;

      if (alunos) {
        const ordemHierarquicaTurmas = ["maternal", "jardim", "jardim i", "jardim ii", "jardim 1", "jardim 2", "1º ano", "2º ano", "3º ano", "4º ano", "5º ano"];
        const obterPesoPedagogico = (turmaNome: string) => {
          const nomeMinusculo = (turmaNome || "").toLowerCase().trim();
          const index = ordemHierarquicaTurmas.findIndex(t => nomeMinusculo.includes(t));
          return index === -1 ? 999 : index;
        };

        const turmasNomesBrutos = Array.from(new Set((turmasDisciplinas || []).map(t => t.nome_turma)));

        (turmasInfo || []).forEach(t => {
          if (
            t.auxiliar === nomeDoProf ||
            t.email_prof_fixo_1 === emailAtual || 
            t.email_prof_fixo_2 === emailAtual || 
            t.email_prof_especifico_1 === emailAtual || 
            t.email_prof_especifico_2 === emailAtual
          ) {
            if (!turmasNomesBrutos.includes(t.nome_turma)) {
              turmasNomesBrutos.push(t.nome_turma);
            }
          }
        });

        const turmasAlocadas = turmasNomesBrutos.sort((a, b) => obterPesoPedagogico(a) - obterPesoPedagogico(b) || a.localeCompare(b));
        const alunosBase = alunos.filter(a => turmasAlocadas.includes(a.turma));

        const hoje = new Date();
        const mesAtual = hoje.getUTCMonth();
        const diaAtual = hoje.getDate();
        const hojeString = hoje.toISOString().split('T')[0];
        const futuros = listaEventos ? listaEventos.filter(ev => ev.data >= hojeString).slice(0, 4) : [];

        const bdayAlunos = alunosBase
          .filter(a => a.data_nascimento && new Date(a.data_nascimento + "T12:00:00").getUTCMonth() === mesAtual)
          .map(a => ({ ...a, tipo: 'aluno' }));

        const bdayFuncs = (funcionarios || [])
          .filter(f => f.data_nascimento && new Date(f.data_nascimento + "T12:00:00").getUTCMonth() === mesAtual)
          .map(f => ({ ...f, tipo: 'funcionario' }));

        const listaAniversariantes = [...bdayAlunos, ...bdayFuncs]
          .sort((a, b) => extrairDiaUTC(a.data_nascimento) - extrairDiaUTC(b.data_nascimento));

        const quemFezHoje = listaAniversariantes.filter(p => extrairDiaUTC(p.data_nascimento) === diaAtual);
        
        if (quemFezHoje.length > 0) {
          setAniversariantesHoje(quemFezHoje);
          if (typeof window !== 'undefined') {
            const hojeStringLocal = hoje.toLocaleDateString('en-CA');
            const notifKey = `bday_alerta_${hojeStringLocal}`;
            const exibicoes = parseInt(localStorage.getItem(notifKey) || '0');
            
            if (exibicoes < 2) {
              setModalBdayAberto(true);
              localStorage.setItem(notifKey, (exibicoes + 1).toString());
            }
          }
        }

        const listaSaude = alunosBase.filter(a => a.tem_alergia === true).sort((a, b) => a.nome.localeCompare(b.nome));

        setDados({
          totalAlunos: alunosBase.length,
          minhasTurmas: turmasAlocadas,
          porTurma: alunosBase.reduce((acc: any, curr: any) => {
            const t = curr.turma || "Sem Turma";
            acc[t] = (acc[t] || 0) + 1;
            return acc;
          }, {}),
          aniversariantes: listaAniversariantes,
          alertasSaude: listaSaude,
          proximosEventos: futuros
        });
      }
      if (listaEventos) setEventos(listaEventos);
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { carregarDados(); }, []);

  async function atualizarPerfil() {
    if (!novoNomeInput.trim()) return alert("O nome não pode estar vazio.");
    try {
      const { error } = await supabase.auth.updateUser({ data: { nome: novoNomeInput } });
      if (error) throw error;
      
      alert("Perfil atualizado com sucesso!");
      setNomeUsuario(novoNomeInput.split(' ')[0]);
      setNomeCompleto(novoNomeInput);
      setModalConfigAberto(false);
    } catch (err: any) { alert(`Erro ao atualizar: ${err.message}`); }
  }

  const alertasFiltrados = buscaSaude === "" ? dados.alertasSaude : dados.alertasSaude.filter(aluno => aluno.nome.toLowerCase().includes(buscaSaude.toLowerCase()));
  
  const formatarDataLocal = (dataString: string) => { 
    const d = new Date(dataString + "T12:00:00"); 
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' }); 
  };
  
  const extrairDiaUTC = (dataString: string) => { 
    const d = new Date(dataString + "T12:00:00"); 
    return d.getUTCDate(); 
  };

  const extrairMesCurtoUTC = (dataString: string) => {
    const d = new Date(dataString + "T12:00:00");
    return meses[d.getUTCMonth()].substring(0, 3).toUpperCase();
  };

  const parabensWhatsApp = (persona: any) => {
    const msg = `Parabéns, ${persona.nome.split(' ')[0]}! 🎉 A ABC DO PARK te deseja um dia maravilhoso e cheio de alegrias! 🎂🎈`;
    window.open(`https://wa.me/55${persona.whatsapp?.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const getEventoStyle = (titulo: string) => {
    const t = titulo.toLowerCase();
    const isEspecial = t.includes("feriado") || t.includes("facultado");
    return { 
      bg: isEspecial ? "bg-fuchsia-50/50" : "bg-slate-50", 
      border: isEspecial ? "border-fuchsia-200" : "border-slate-200", 
      color: isEspecial ? "text-fuchsia-600" : "text-blue-600",
      bracket: isEspecial ? "border-fuchsia-500" : "border-blue-500"
    };
  };

  if (carregando) return <div className="p-10 text-center text-xs font-black uppercase text-slate-400 animate-pulse tracking-widest min-h-screen flex items-center justify-center bg-slate-50">Carregando seu espaço...</div>;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 w-full relative min-h-screen bg-[#d8e8f2] overflow-x-hidden pb-10 md:p-6">
      
      {/* ============================================== */}
      {/* HEADER: Native App Mobile & Desktop Dashboard */}
      {/* ============================================== */}
      <div className="flex items-center justify-end gap-4 px-4 pt-4 pb-2 md:hidden">
        <div className="flex gap-2">
          <button 
            onClick={() => setModalCalendarioAberto(true)} 
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 font-black uppercase tracking-widest text-[10px] shadow-sm hover:bg-slate-50 transition-all active:scale-95"
          >
            <CalendarDays size={18} strokeWidth={2.5} />
          </button>
          
          <button 
            onClick={() => setModalConfigAberto(true)} 
            className="w-10 h-10 bg-white border border-slate-200 text-slate-500 hover:text-blue-600 rounded-xl flex items-center justify-center transition-all shadow-sm active:scale-95"
          >
            <Settings size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* ============================================== */}
      {/* HERO BANNER: Com a foto do usuário restaurada */}
      {/* ============================================== */}
      <div className="px-4 md:px-0 mb-6">
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 relative overflow-hidden flex flex-col md:flex-row items-center md:items-center justify-between gap-6">
          
          {/* BOTÕES DO DESKTOP - Canto Superior Direito */}
          <div className="hidden md:flex absolute top-6 right-6 gap-3 z-30">
            {/* O Botão de Calendário superior foi removido conforme solicitado */}
            
            <button 
              onClick={() => setModalConfigAberto(true)} 
              className="relative w-10 h-10 rounded-full bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 flex items-center justify-center transition-all shadow-sm active:scale-95"
            >
              <Settings size={18} strokeWidth={2} />
            </button>
          </div>

          <div className="flex flex-col md:flex-row items-center md:items-center gap-6 w-full relative z-10">
            {/* Foto Original do Usuário */}
            <div className="w-24 h-24 md:w-40 md:h-40 rounded-full border-4 border-slate-50 shadow-md shrink-0 flex items-center justify-center overflow-hidden bg-black">
              {ilustracaoProfessor ? (
                 <img src={ilustracaoProfessor} alt="Seu Perfil" className="w-full h-full object-cover" />
              ) : (
                 <span className="text-white text-[12px] text-center font-black">Escola<br/>do Park</span>
              )}
            </div>
            
            {/* Informações Pessoais & Turmas */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-2xl md:text-[28px] font-black text-[#1e293b] tracking-tight flex items-center justify-center md:justify-start gap-2">
                Olá, {nomeUsuario}! <span className="animate-wave origin-bottom-right text-[28px]">👋</span>
              </h1>
              <p className="text-slate-500 font-medium text-[13px] mb-4 max-w-[400px] mt-1 leading-relaxed">
                Acompanhe o andamento das suas turmas, registre o diário e fique de olho nos próximos eventos.
              </p>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                {/* Badge Alunos */}
                <div className="bg-blue-50/60 border border-blue-100 rounded-2xl px-4 py-2 flex items-center gap-3">
                  <div className="bg-white p-1.5 rounded-full shadow-sm">
                    <Users size={16} className="text-blue-500" strokeWidth={2.5} />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Alunos</span>
                    <span className="text-[15px] font-black text-[#1e293b] leading-tight mt-0.5">{dados.totalAlunos}</span>
                  </div>
                </div>

                {/* Badge Turmas Atribuídas */}
                <div className="bg-[#f8fafc] border border-slate-200 rounded-2xl px-4 py-2 flex flex-col justify-center min-w-[160px]">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Turmas Atribuídas</span>
                  <div className="flex flex-wrap gap-1.5">
                    {dados.minhasTurmas.length > 0 ? dados.minhasTurmas.map(t => (
                      <span key={t} className="text-[11px] font-bold bg-white text-slate-600 border border-slate-200 px-2 py-0.5 rounded-md shadow-sm">{t}</span>
                    )) : (
                      <span className="text-[11px] font-medium text-slate-400">Nenhuma</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ============================================== */}
      {/* GRID DE INFORMAÇÕES (Cards 3 Colunas) */}
      {/* ============================================== */}
      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6 px-4 md:px-0">
        
        {/* ===================== COLUNA 1: Programação ===================== */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 flex flex-col">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0">
              <CalendarDays size={20} strokeWidth={2.5} />
            </div>
            <h2 className="text-[15px] font-bold text-[#1e293b]">Programação</h2>
          </div>
          
          <div className="flex-1 flex flex-col relative">
            {dados.proximosEventos.length > 0 ? (
              <div className="relative border-l-2 border-[#0019ff] ml-4 mt-2 space-y-6 pb-6">
                {dados.proximosEventos.map((ev, i) => {
                  const isHoje = extrairDiaUTC(ev.data) === new Date().getDate();
                  return (
                    <div key={i} className="relative pl-6 flex items-center justify-between group">
                      <span className={`absolute -left-[9px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-4 border-white ring-1 ${isHoje ? 'bg-indigo-500 ring-indigo-200' : 'bg-[#cbd5e1] ring-transparent'}`}></span>
                      
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col text-center min-w-[36px]">
                          <span className={`text-[15px] font-black leading-none ${isHoje ? 'text-indigo-600' : 'text-[#475569]'}`}>{extrairDiaUTC(ev.data)}</span>
                          <span className={`text-[10px] font-bold uppercase ${isHoje ? 'text-indigo-500' : 'text-slate-400'}`}>{extrairMesCurtoUTC(ev.data)}</span>
                        </div>
                        <span className="text-[13px] font-bold text-[#334155] uppercase tracking-wide">{ev.titulo}</span>
                      </div>

                      {isHoje && (
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">Hoje</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8 border border-dashed border-slate-200 rounded-2xl bg-slate-50 min-h-[120px]">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Agenda livre.</p>
              </div>
            )}
          </div>
          
          {/* O botão 'Ver calendário completo' que agora assume a função exclusiva */}
          <button 
            onClick={() => setModalCalendarioAberto(true)}
            className="mt-auto w-full py-2.5 rounded-xl border border-slate-200 text-[#475569] hover:bg-slate-50 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
          >
            <CalendarDays size={14} /> Ver calendário completo
          </button>
        </div>

        {/* ===================== COLUNA 2: Aniversários ===================== */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
                <Cake size={20} strokeWidth={2.5} />
              </div>
              <h2 className="text-[15px] font-bold text-[#1e293b]">
                Aniversários ({meses[new Date().getUTCMonth()]})
              </h2>
            </div>
            <button className="text-[11px] font-bold bg-slate-50 text-[#475569] hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors">
              Ver todos
            </button>
          </div>
          
          <div className="flex flex-col gap-3">
            {dados.aniversariantes.length > 0 ? dados.aniversariantes.slice(0,4).map(persona => {
              const dia = extrairDiaUTC(persona.data_nascimento);
              const isFunc = persona.tipo === 'funcionario';
              return (
                <div key={`${persona.tipo}-${persona.id}`} className="flex items-center justify-between px-4 py-3 rounded-2xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-colors group bg-white shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                  <div className="flex items-center gap-4 w-full">
                    <div className="flex flex-col items-center justify-center min-w-[32px]">
                      <span className={`text-[15px] font-black leading-none ${isFunc ? 'text-purple-500' : 'text-orange-500'}`}>{dia}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">{extrairMesCurtoUTC(persona.data_nascimento)}</span>
                    </div>
                    
                    <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                      {persona.foto_url ? (
                        <img src={persona.foto_url} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <span className="font-black text-slate-400 text-xs">{persona.nome.charAt(0)}</span>
                      )}
                    </div>
                    
                    <div className="flex flex-col flex-1">
                      <span className="text-[13px] font-bold text-[#1e293b] line-clamp-1">{persona.nome}</span>
                      <span className={`text-[10px] font-bold ${isFunc ? 'text-purple-500' : 'text-slate-400'}`}>
                        {isFunc ? 'Equipe' : `Aluno • ${persona.turma}`}
                      </span>
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="p-8 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50 flex items-center justify-center h-full min-h-[120px]">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ninguém faz aniversário.</p>
              </div>
            )}
          </div>
        </div>

        {/* ===================== COLUNA 3: Saúde & Alergias ===================== */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} strokeWidth={2.5} />
              </div>
              <h2 className="text-[15px] font-bold text-[#1e293b]">Saúde & Alergias</h2>
            </div>
            <button className="text-[11px] font-bold bg-rose-50 text-rose-600 hover:bg-rose-100 px-3 py-1.5 rounded-lg border border-rose-100 transition-colors">
              Ver todos
            </button>
          </div>

          <div className="relative mb-4">
            <input
              type="text"
              placeholder="Pesquisar alergia..."
              value={buscaSaude}
              onChange={(e) => setBuscaSaude(e.target.value)}
              className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-[#f8fafc] border border-slate-200 text-[13px] font-medium text-slate-600 outline-none focus:border-rose-300 focus:bg-white transition-all"
            />
            <Search size={16} className="absolute right-3 top-3 text-slate-400" />
          </div>

          <div className="flex flex-col gap-2 flex-1 overflow-y-auto max-h-[250px] custom-scrollbar pr-1">
            {alertasFiltrados.length > 0 ? alertasFiltrados.map(aluno => (
              <div key={aluno.id} className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-slate-100 hover:border-rose-200 hover:bg-rose-50/50 cursor-pointer group transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                
                {/* Imagem do aluno restaurada */}
                <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center overflow-hidden">
                  {aluno.foto_url ? (
                    <img src={aluno.foto_url} className="w-full h-full object-cover" alt={aluno.nome} />
                  ) : (
                    <span className="text-slate-500 font-black text-sm">{aluno.nome.charAt(0)}</span>
                  )}
                </div>

                <div className="flex flex-col flex-1">
                  <span className="text-[13px] font-bold text-[#1e293b] line-clamp-1">{aluno.nome}</span>
                  <span className="text-[10px] font-bold uppercase text-rose-500 line-clamp-1">{aluno.alergia_descricao || "Atenção médica"}</span>
                </div>
                <ChevronRight size={16} className="text-slate-300 group-hover:text-rose-400 transition-colors" />
              </div>
            )) : (
              <div className="p-8 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50 flex items-center justify-center h-full min-h-[120px]">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nenhum alerta encontrado.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ============================================== */}
      {/* MODAL CONFIGURAÇÕES */}
      {/* ============================================== */}
      {modalConfigAberto && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setModalConfigAberto(false)}
        >
          <div 
            className="bg-white rounded-[3rem] w-full max-w-sm p-8 shadow-2xl animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-6 text-center">Configurações</h2>
            <div className="mb-6">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">NOME COMPLETO</label>
              <input 
                type="text" 
                value={novoNomeInput} 
                onChange={(e) => setNovoNomeInput(e.target.value)} 
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-slate-700 font-bold outline-none focus:border-indigo-400 transition-colors"
              />
            </div>
            <div className="flex flex-col gap-3">
              <button onClick={atualizarPerfil} className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-black uppercase tracking-wider shadow-lg hover:bg-indigo-700 transition-all active:scale-95">SALVAR</button>
              <button onClick={() => setModalConfigAberto(false)} className="w-full py-4 rounded-2xl border border-slate-200 text-slate-500 font-black uppercase tracking-wider hover:bg-slate-50 transition-colors active:scale-95">CANCELAR</button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================== */}
      {/* NOTIFICAÇÃO BDAY PERSONALIZADA */}
      {/* ============================================== */}
      {modalBdayAberto && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setModalBdayAberto(false)}
        >
          <div 
            className="bg-white w-full max-w-md rounded-[3rem] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-8 text-center text-white relative">
              <span className="text-6xl drop-shadow-md mb-4 block animate-bounce">🎂</span>
              <h2 className="text-2xl font-black tracking-tight leading-tight">
                {aniversariantesHoje.some(p => p.email === userEmail) 
                  ? `Parabéns, ${nomeUsuario}! ✨` 
                  : "Aniversariante(s) do Dia!"}
              </h2>
              {aniversariantesHoje.some(p => p.email === userEmail) ? (
                <div className="mt-4 text-indigo-50">
                  <p className="text-sm font-medium leading-relaxed">
                    Hoje o dia amanheceu mais feliz porque é o seu aniversário! 🎈<br/><br/>
                    Que este novo ciclo seja repleto de paz, saúde, conquistas e momentos inesquecíveis. Você é uma peça fundamental na nossa escola, e é um privilégio gigante ter o seu brilho e a sua dedicação fazendo parte da nossa história.
                  </p>
                  <p className="mt-4 text-[10px] font-black uppercase tracking-widest opacity-90">— Um abraço bem apertado da Família ABC DO PARK ❤️</p>
                </div>
              ) : (
                <p className="text-indigo-100 font-medium text-sm mt-2">Hoje o dia é de festa e gratidão na nossa escola!</p>
              )}
            </div>
            
            <div className="p-6 bg-slate-50">
              <div className="flex flex-col gap-3">
                {aniversariantesHoje.map(pessoa => {
                  const ehVoce = pessoa.email === userEmail;
                  return (
                    <div key={`${pessoa.tipo}-${pessoa.id}`} className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${ehVoce ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-100 shadow-sm'}`}>
                      <div className="w-14 h-14 rounded-full bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                        {pessoa.foto_url ? (
                          <img src={pessoa.foto_url} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <span className="font-black text-slate-400 text-lg">{pessoa.nome.charAt(0)}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-base font-black text-slate-800 line-clamp-1">
                          {ehVoce ? "Você está de parabéns! 🥳" : pessoa.nome}
                        </h4>
                        <span className={`text-[9px] font-black uppercase tracking-widest ${ehVoce ? 'text-blue-600' : (pessoa.tipo === 'funcionario' ? 'text-purple-600' : 'text-slate-500')}`}>
                          {ehVoce ? '🌟 Celebrando sua vida' : (pessoa.tipo === 'funcionario' ? '⭐ Equipe' : `📚 Aluno - ${pessoa.turma}`)}
                        </span>
                      </div>
                      {!ehVoce && (
                        <button 
                          onClick={() => parabensWhatsApp(pessoa)} 
                          className="w-10 h-10 rounded-xl bg-green-500 hover:bg-green-600 text-white flex items-center justify-center text-lg shadow-sm transition-transform active:scale-95 shrink-0"
                        >
                          📱
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              <button 
                onClick={() => setModalBdayAberto(false)} 
                className="w-full mt-6 py-4 rounded-2xl bg-slate-800 text-white font-black uppercase tracking-widest transition-all active:scale-95 shadow-md text-xs"
              >
                {aniversariantesHoje.some(p => p.email === userEmail) ? 'RECEBER COM CARINHO ❤️' : 'FECHAR'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================== */}
      {/* MODAL CALENDÁRIO */}
      {/* ============================================== */}
      {modalCalendarioAberto && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4"
          onClick={() => setModalCalendarioAberto(false)}
        >
          <div 
            className="bg-slate-50 rounded-[3rem] w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-6 md:p-8 bg-white border-b border-slate-100 shadow-sm z-10">
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter italic flex items-center gap-2">
                <span>📅</span> Calendário
              </h2>
              <button 
                onClick={() => setModalCalendarioAberto(false)} 
                className="w-12 h-12 bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-500 rounded-2xl flex items-center justify-center transition-colors"
              >
                ✖
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {meses.map((mesNome, index) => {
                  const eventosDoMes = eventos.filter(ev => new Date(ev.data + "T12:00:00").getUTCMonth() === index);
                  return (
                    <div key={index} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col">
                      <h3 className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.2em] border-b border-slate-100 pb-3 mb-4">{mesNome}</h3>
                      <div className="flex flex-col gap-3 flex-1">
                        {eventosDoMes.length > 0 ? (
                          eventosDoMes.map((ev, i) => {
                            const estilo = getEventoStyle(ev.titulo);
                            return (
                              <div key={i} className={`p-3 rounded-xl border flex flex-col gap-1 ${estilo.bg} ${estilo.border}`}>
                                <span className={`font-black text-[9px] uppercase tracking-widest ${estilo.color}`}>
                                  Dia {extrairDiaUTC(ev.data)}
                                </span>
                                <span className="font-bold text-slate-600 leading-tight text-xs">{ev.titulo}</span>
                              </div>
                            );
                          })
                        ) : (
                          <div className="flex-1 flex items-center justify-center min-h-[50px] border border-dashed border-slate-200 rounded-xl">
                            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Sem eventos</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ajuste de scrollbar global */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}} />
    </div>
  );
}