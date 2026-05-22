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
    return { 
      bg: isEspecial ? "bg-purple-50" : "bg-blue-50", 
      border: isEspecial ? "border-purple-500" : "border-indigo-600", 
      color: isEspecial ? "text-purple-700" : "text-indigo-600" 
    };
  };

  if (carregando) return <div className="p-10 text-center text-xl sm:text-2xl md:text-[10px] font-black uppercase text-slate-300 animate-pulse tracking-widest">Sincronizando painel...</div>;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10 w-full px-2 relative min-h-screen bg-slate-50/50">
      
      {/* MODAL CONFIGURAÇÕES */}
      {modalConfigAberto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-sm p-8 shadow-2xl animate-in zoom-in-95">
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

      {/* NOTIFICAÇÃO BDAY PERSONALIZADA */}
      {modalBdayAberto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[3rem] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-8">
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
                          className="w-10 h-10 rounded-xl bg-green-500 hover:bg-green-600 text-white flex items-center justify-center text-lg shadow-sm transition-transform active:scale-95"
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

      {/* HEADER / AÇÕES GLOBAIS */}
      <header className="mb-8 flex justify-end px-2 md:px-4">
        <button 
          onClick={() => setModalCalendarioAberto(true)} 
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 text-white font-black uppercase tracking-widest text-[10px] md:text-xs shadow-md shadow-indigo-200 transition-all active:scale-95"
        >
          <span>📅</span> Calendário Escolar
        </button>
      </header>

      {/* GRID PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start px-2 md:px-4">
        
        {/* COLUNA ESQUERDA (Destaque Principal) */}
        <div className="lg:col-span-7 flex flex-col gap-8">
          
          <div className="bg-white rounded-[3rem] p-8 shadow-sm border border-slate-50 flex flex-col items-center text-center relative overflow-hidden group hover:shadow-md transition-all">
            <div className="flex justify-center items-center gap-3 w-full mb-1 relative z-10">
              <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tighter m-0 italic">Olá, {nomeUsuario}! 👋</h1>
              <button onClick={() => setModalConfigAberto(true)} className="text-slate-300 hover:text-indigo-500 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </button>
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 mb-6 z-10">Resumo da ABC DO PARK</p>
            
            <div className="w-full max-w-[250px] mb-8 z-10 transform group-hover:scale-105 transition-transform duration-500">
              <img src={ilustracaoProfessor || "/image_de2d33.jpg"} alt="" className="w-full h-auto rounded-3xl object-contain" />
            </div>
            
            <div className="w-full border-t border-slate-50 pt-6 mt-auto z-10">
              <h3 className="text-6xl font-black text-indigo-600 m-0 leading-none">{dados.totalAlunos}</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">Meus Alunos</p>
            </div>
          </div>

        </div>

        {/* COLUNA DIREITA (Avisos e Eventos) */}
        <div className="lg:col-span-5 flex flex-col gap-8">
          
          {/* Próximos Eventos */}
          <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-50">
            <h2 className="text-xl md:text-sm font-black text-slate-800 uppercase tracking-tighter italic flex items-center gap-2 mb-6">
              <span>🚀</span> Próximas Programações
            </h2>
            <div className="flex flex-col gap-3">
              {dados.proximosEventos.length > 0 ? dados.proximosEventos.map((ev, i) => {
                const estilo = getEventoStyle(ev.titulo);
                return (
                  <div key={i} className={`p-4 rounded-2xl border-l-[6px] ${estilo.bg} ${estilo.border}`}>
                    <span className={`text-[9px] font-black uppercase tracking-widest ${estilo.color}`}>
                      {formatarDataLocal(ev.data)}
                    </span>
                    <p className="mt-1 text-sm font-bold text-slate-700 leading-snug">{ev.titulo}</p>
                  </div>
                );
              }) : (
                <div className="p-6 text-center border border-dashed border-slate-200 rounded-2xl">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Nenhuma programação próxima.</p>
                </div>
              )}
            </div>
          </div>

          {/* Aniversariantes */}
          <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-50">
            <h2 className="text-xl md:text-sm font-black text-slate-800 uppercase tracking-tighter italic flex items-center gap-2 mb-6">
              <span>🎂</span> Aniversariantes ({meses[new Date().getUTCMonth()]})
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
              {dados.aniversariantes.length > 0 ? dados.aniversariantes.map(persona => {
                const dia = extrairDiaUTC(persona.data_nascimento);
                const isFunc = persona.tipo === 'funcionario';
                return (
                  <div key={`${persona.tipo}-${persona.id}`} className="text-center min-w-[70px] flex flex-col items-center">
                    <div className={`w-14 h-14 rounded-full bg-slate-50 border-2 p-0.5 overflow-hidden ${isFunc ? 'border-purple-300' : 'border-indigo-300'}`}>
                      <div className="w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center">
                        {persona.foto_url ? (
                          <img src={persona.foto_url} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <span className="font-black text-slate-300">{persona.nome.charAt(0)}</span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs font-bold mt-2 text-slate-600 line-clamp-1">{persona.nome.split(' ')[0]}</p>
                    <p className={`text-[9px] font-black uppercase tracking-widest ${isFunc ? 'text-purple-500' : 'text-indigo-500'}`}>
                      Dia {dia < 10 ? `0${dia}` : dia}
                    </p>
                  </div>
                );
              }) : (
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 w-full text-center py-4">Sem aniversários no mês.</p>
              )}
            </div>
          </div>

          {/* Alertas de Saúde */}
          <div className="bg-rose-50/30 rounded-[2.5rem] p-6 shadow-sm border border-rose-100">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
              <h2 className="text-xl md:text-sm font-black text-rose-600 uppercase tracking-tighter italic flex items-center gap-2">
                <span>⚠️</span> Saúde
              </h2>
              <input 
                type="text" 
                placeholder="Buscar..." 
                value={buscaSaude} 
                onChange={(e) => setBuscaSaude(e.target.value)} 
                className="px-4 py-2 rounded-2xl border border-rose-200 text-xs font-bold text-slate-600 w-full sm:w-32 outline-none focus:border-rose-400 bg-white"
              />
            </div>
            <div className="flex flex-col gap-3 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
              {alertasFiltrados.length > 0 ? alertasFiltrados.map(aluno => (
                <div key={aluno.id} className="bg-white p-3 rounded-2xl border border-rose-100 flex items-center gap-3 shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-100 shrink-0 flex items-center justify-center overflow-hidden">
                    {aluno.foto_url ? (
                      <img src={aluno.foto_url} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <span className="text-rose-400 font-black text-sm">{aluno.nome.charAt(0)}</span>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-700 line-clamp-1">{aluno.nome}</span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-rose-500 line-clamp-1 mt-0.5">{aluno.alergia_descricao || "Atenção médica"}</span>
                  </div>
                </div>
              )) : (
                <p className="text-[10px] font-black uppercase tracking-widest text-rose-300 w-full text-center py-4">Nenhum alerta.</p>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* MODAL CALENDÁRIO */}
      {modalCalendarioAberto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
          <div className="bg-slate-50 rounded-[3rem] w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95">
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
                              <div key={i} className={`p-3 rounded-xl border-l-4 flex flex-col gap-1 ${estilo.bg} ${estilo.border}`}>
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