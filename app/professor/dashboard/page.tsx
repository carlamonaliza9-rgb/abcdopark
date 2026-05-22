"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function DashboardProfessorPage() {
  const router = useRouter();
  const [nomeUsuario, setNomeUsuario] = useState("Professor");
  const [nomeCompleto, setNomeCompleto] = useState(""); 
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [ilustracaoProfessor, setIlustracaoProfessor] = useState<string | null>(null);
  
  const [dados, setDados] = useState({
    totalAlunos: 0,
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
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!authData?.user) return router.push("/login");
      
      const emailAtual = authData.user.email || "";
      setUserEmail(emailAtual);
      
      const { data: perfil } = await supabase.from('perfis').select('cargo').eq('id', authData.user.id).single();
      const ehAdmin = emailAtual === 'carlamonaliza9@gmail.com' || emailAtual === 'diretoria@abcdopark.com' || perfil?.cargo === 'Admin';

      if (ehAdmin) return router.push("/dashboard");

      const { data: func } = await supabase.from('funcionarios').select('foto_url').eq('email', emailAtual).single();
      if (func?.foto_url) setIlustracaoProfessor(func.foto_url);

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

      const { data: alunos } = await supabase.from('alunos').select('*');
      const { data: funcionarios } = await supabase.from('funcionarios').select('*');
      const { data: listaEventos } = await supabase.from('eventos_calendario').select('*').order('data', { ascending: true });
      const { data: turmasInfo } = await supabase.from('turmas_info').select('*');

      if (alunos) {
        const minhasTurmas = (turmasInfo || [])
          .filter(t => t.email_prof_fixo_1 === emailAtual || t.email_prof_fixo_2 === emailAtual || t.email_prof_especifico_1 === emailAtual || t.email_prof_especifico_2 === emailAtual)
          .map(t => t.nome_turma);
        
        const alunosBase = alunos.filter(a => minhasTurmas.includes(a.turma));

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

  async function registrarLog(acao: string, detalhes: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('logs_sistema').insert([{
          usuario_email: user.email,
          acao: acao,
          tabela: 'perfis',
          detalhes: detalhes
        }]);
      }
    } catch (e) {
      console.error("Erro ao gerar log de auditoria:", e);
    }
  }

  async function atualizarPerfil() {
    if (!novoNomeInput.trim()) return alert("O nome não pode estar vazio.");
    try {
      const { error } = await supabase.auth.updateUser({ data: { nome: novoNomeInput } });
      if (error) throw error;
      
      await registrarLog("EDIÇÃO", `Atualizou o próprio nome de exibição no perfil para: ${novoNomeInput}`);

      alert("Perfil atualizado com sucesso!");
      setNomeUsuario(novoNomeInput.split(' ')[0]);
      setNomeCompleto(novoNomeInput);
      setModalConfigAberto(false);
    } catch (err: any) { alert(`Erro ao atualizar: ${err.message}`); }
  }

  const alertasFiltrados = buscaSaude === "" ? dados.alertasSaude : dados.alertasSaude.filter(aluno => aluno.nome.toLowerCase().includes(buscaSaude.toLowerCase()));
  const formatarDataLocal = (dataString: string) => { const d = new Date(dataString + "T12:00:00"); return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' }); };
  const extrairDiaUTC = (dataString: string) => { const d = new Date(dataString + "T12:00:00"); return d.getUTCDate(); };

  const parabensWhatsApp = (persona: any) => {
    const msg = `Parabéns, ${persona.nome.split(' ')[0]}! 🎉 A ABC DO PARK te deseja um dia maravilhoso e cheio de alegrias! 🎂🎈`;
    window.open(`https://wa.me/55${persona.whatsapp?.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const getEventoStyle = (titulo: string) => {
    const t = titulo.toLowerCase();
    const isEspecial = t.includes("feriado") || t.includes("facultado");
    return { bg: isEspecial ? "#f5f3ff" : "#f9fafb", border: isEspecial ? "#8b5cf6" : "#2563eb", color: isEspecial ? "#6d28d9" : "#2563eb" };
  };

  if (carregando) return <div className="p-10 text-center text-slate-500 font-medium">Carregando visão geral...</div>;

  return (
    <div className="w-full min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* HEADER PROFESSOR */}
        <header className="flex justify-end items-center mb-2">
          <button 
            onClick={() => setModalCalendarioAberto(true)} 
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all active:scale-95"
          >
            <span>📅</span> Calendário Escolar
          </button>
        </header>

        {/* CARDS PRINCIPAIS (Grid 1 coluna mobile, 2 no desktop) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Card de Boas-vindas */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center relative overflow-hidden">
            <div className="flex items-center justify-center gap-3 w-full relative z-10">
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 m-0">Olá, {nomeUsuario}! 👋</h1>
              <button onClick={() => setModalConfigAberto(true)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </button>
            </div>
            <p className="text-slate-500 text-sm mt-2 mb-6 z-10">Resumo atualizado da ABC DO PARK.</p>
            
            <div className="w-full max-w-sm mb-6 z-10">
              <img 
                src={ilustracaoProfessor || "/image_de2d33.jpg"} 
                alt="Ilustração" 
                className="w-full h-auto rounded-2xl object-contain"
              />
            </div>
            
            <div className="w-full border-t-2 border-slate-50 pt-6 mt-auto z-10">
              <h3 className="text-5xl font-black text-slate-900 m-0">{dados.totalAlunos}</h3>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Meus Alunos</p>
            </div>
          </div>

          {/* Card Próximos Eventos */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col">
            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-3">
              <span>🚀</span> Próximas Programações
            </h2>
            <div className="flex flex-col gap-3 overflow-y-auto pr-2">
              {dados.proximosEventos.length > 0 ? dados.proximosEventos.map((ev, i) => {
                const estilo = getEventoStyle(ev.titulo);
                return (
                  <div key={i} className="p-4 rounded-xl border-l-4 transition-all hover:translate-x-1" style={{ backgroundColor: estilo.bg, borderLeftColor: estilo.border }}>
                    <span className="text-xs font-bold uppercase" style={{ color: estilo.color }}>
                      {formatarDataLocal(ev.data)}
                    </span>
                    <p className="mt-1 text-sm font-bold text-slate-800">{ev.titulo}</p>
                  </div>
                );
              }) : (
                <div className="p-6 text-center border-2 border-dashed border-slate-100 rounded-xl">
                  <p className="text-slate-400 text-sm italic">Nenhuma programação agendada para os próximos dias.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SECUNDÁRIOS: ANIVERSARIANTES E SAÚDE */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Card Aniversariantes */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <span>🎂</span> Aniversariantes de {meses[new Date().getUTCMonth()]}
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              {dados.aniversariantes.length > 0 ? dados.aniversariantes.map(persona => {
                const dia = extrairDiaUTC(persona.data_nascimento);
                const corDestaque = persona.tipo === 'funcionario' ? '#8b5cf6' : '#2563eb';
                return (
                  <div key={`${persona.tipo}-${persona.id}`} className="text-center min-w-[90px] flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-slate-100 overflow-hidden border-2 p-0.5 shadow-sm" style={{ borderColor: corDestaque }}>
                      <div className="w-full h-full rounded-full overflow-hidden bg-white">
                        {persona.foto_url ? (
                          <img src={persona.foto_url} className="w-full h-full object-cover" alt={persona.nome} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-slate-400 text-lg">
                            {persona.nome.charAt(0)}
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-xs font-bold mt-2 text-slate-800 line-clamp-1">{persona.nome.split(' ')[0]}</p>
                    <p className="text-[11px] font-bold mt-0.5" style={{ color: corDestaque }}>Dia {dia < 10 ? `0${dia}` : dia}</p>
                  </div>
                );
              }) : (
                <p className="text-slate-400 text-sm italic w-full text-center py-4">Nenhum aniversário este mês.</p>
              )}
            </div>
          </div>

          {/* Card Alertas de Saúde */}
          <div className="bg-red-50 p-6 rounded-3xl shadow-sm border border-red-100 flex flex-col">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
              <h2 className="text-lg font-bold text-red-700 flex items-center gap-2">
                <span>⚠️</span> Alertas de Saúde
              </h2>
              <input 
                type="text" 
                placeholder="Buscar aluno..." 
                value={buscaSaude} 
                onChange={(e) => setBuscaSaude(e.target.value)} 
                className="px-4 py-2 rounded-xl border border-red-200 text-sm w-full sm:w-auto outline-none focus:ring-2 focus:ring-red-200 bg-white shadow-inner"
              />
            </div>
            <div className="flex flex-col gap-3 max-h-[200px] overflow-y-auto pr-2">
              {alertasFiltrados.length > 0 ? alertasFiltrados.map(aluno => (
                <div key={aluno.id} className="bg-white p-3 rounded-xl border border-red-100 flex items-center gap-3 shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-red-100 border border-red-200 flex-shrink-0 overflow-hidden">
                    {aluno.foto_url ? (
                      <img src={aluno.foto_url} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-red-400 font-bold text-xs">
                        {aluno.nome.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-800 line-clamp-1">{aluno.nome}</span>
                    <span className="text-xs font-bold text-red-600 line-clamp-1">{aluno.alergia_descricao || "Alergia registrada"}</span>
                  </div>
                </div>
              )) : (
                <p className="text-slate-500 text-sm italic w-full text-center py-4">Nenhum alerta de saúde encontrado.</p>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ================= MODAIS ================= */}

      {/* Modal Configuração */}
      {modalConfigAberto && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[10000] p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-bold text-slate-900 mb-6 text-center">⚙️ Editar Perfil</h2>
            <div className="mb-6">
              <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Nome de Exibição</label>
              <input 
                type="text" 
                value={novoNomeInput} 
                onChange={(e) => setNovoNomeInput(e.target.value)} 
                className="w-full p-4 rounded-xl border border-slate-200 text-slate-800 font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" 
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setModalConfigAberto(false)} className="flex-1 p-3 rounded-xl border border-slate-200 bg-white font-bold text-slate-600 hover:bg-slate-50 transition-colors">Cancelar</button>
              <button onClick={atualizarPerfil} className="flex-1 p-3 rounded-xl border-none bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-md transition-colors">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Notificação Aniversariante */}
      {modalBdayAberto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl relative text-center animate-in slide-in-from-bottom-8 duration-300">
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-8 md:p-10 text-white">
              <span className="text-6xl drop-shadow-md block mb-4 animate-bounce">🎂</span>
              <h2 className="text-2xl md:text-3xl font-black">
                {aniversariantesHoje.some(p => p.email === userEmail) 
                  ? `Parabéns, ${nomeUsuario}! ✨` 
                  : "Aniversariante(s) do Dia!"}
              </h2>
              {aniversariantesHoje.some(p => p.email === userEmail) ? (
                <div className="mt-4 text-blue-50">
                  <p className="text-sm md:text-base leading-relaxed font-medium">
                    Hoje o dia amanheceu mais feliz porque é o seu aniversário! 🎈<br/><br/>
                    Que este novo ciclo seja repleto de paz, saúde, conquistas e momentos inesquecíveis. Celebre muito, você merece o mundo!
                  </p>
                  <p className="mt-4 text-xs font-bold italic opacity-90">— Um abraço bem apertado da Família ABC DO PARK ❤️</p>
                </div>
              ) : (
                <p className="text-blue-100 font-medium text-sm md:text-base mt-2">Hoje o dia é de festa e gratidão na nossa escola!</p>
              )}
            </div>
            <div className="p-6 md:p-8 bg-slate-50">
              <div className="flex flex-col gap-4">
                {aniversariantesHoje.map(pessoa => {
                  const ehVoce = pessoa.email === userEmail;
                  return (
                    <div key={`${pessoa.tipo}-${pessoa.id}`} className={`flex items-center gap-4 text-left p-4 rounded-2xl border-2 ${ehVoce ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-100 shadow-sm'}`}>
                      <div className="w-16 h-16 rounded-full bg-white border-2 border-slate-100 overflow-hidden shrink-0 shadow-sm">
                        {pessoa.foto_url ? (
                          <img src={pessoa.foto_url} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-slate-400 text-xl">{pessoa.nome.charAt(0)}</div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="m-0 text-base md:text-lg font-black text-slate-800 line-clamp-1">
                          {ehVoce ? "Você está de parabéns! 🥳" : pessoa.nome}
                        </h4>
                        <span className={`text-xs font-bold uppercase tracking-wider ${ehVoce ? 'text-blue-600' : (pessoa.tipo === 'funcionario' ? 'text-purple-500' : 'text-slate-500')}`}>
                          {ehVoce ? '🌟 Celebrando sua vida' : (pessoa.tipo === 'funcionario' ? '⭐ Nossa Equipe' : `📚 Aluno - ${pessoa.turma}`)}
                        </span>
                      </div>
                      {!ehVoce && (
                        <button 
                          onClick={() => parabensWhatsApp(pessoa)} 
                          className="bg-green-500 hover:bg-green-600 w-12 h-12 rounded-full flex items-center justify-center text-white text-xl shadow-md transition-transform active:scale-90"
                          title="Dar parabéns via WhatsApp"
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
                className="mt-6 w-full py-4 rounded-xl border-none bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm uppercase tracking-wider transition-colors shadow-md active:scale-95"
              >
                {aniversariantesHoje.some(p => p.email === userEmail) ? 'RECEBER COM CARINHO ❤️' : 'FECHAR'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Calendário */}
      {modalCalendarioAberto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
          <div className="bg-slate-50 p-6 md:p-8 rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm sticky top-0 z-10">
              <h2 className="text-xl md:text-2xl font-black text-slate-800">📅 Calendário Letivo 2026</h2>
              <button 
                onClick={() => setModalCalendarioAberto(false)} 
                className="w-10 h-10 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full flex items-center justify-center font-bold text-lg transition-colors"
              >
                ✖
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {meses.map((mesNome, index) => (
                <div key={index} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full">
                  <h3 className="text-base font-black text-blue-600 border-b-2 border-slate-50 pb-3 mb-4">{mesNome}</h3>
                  <div className="flex flex-col gap-3 flex-1">
                    {eventos.filter(ev => new Date(ev.data + "T12:00:00").getUTCMonth() === index).length > 0 ? (
                      eventos.filter(ev => new Date(ev.data + "T12:00:00").getUTCMonth() === index).map((ev, i) => {
                        const estilo = getEventoStyle(ev.titulo);
                        return (
                          <div key={i} className="text-xs p-3 rounded-xl border-l-4 flex flex-col gap-1" style={{ backgroundColor: estilo.bg, borderLeftColor: estilo.border }}>
                            <span className="font-black text-[10px] uppercase tracking-wider" style={{ color: estilo.color }}>
                              Dia {extrairDiaUTC(ev.data)}
                            </span>
                            <span className="font-bold text-slate-700 leading-tight">{ev.titulo}</span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="flex-1 flex items-center justify-center min-h-[60px] border-2 border-dashed border-slate-100 rounded-xl">
                        <p className="text-xs font-bold text-slate-300 italic uppercase tracking-wider">Sem eventos</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}