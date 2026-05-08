"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function DashboardPage() {
  const [nomeUsuario, setNomeUsuario] = useState("Administrador");
  const [nomeCompleto, setNomeCompleto] = useState(""); 
  const [ehAdmin, setEhAdmin] = useState(false);
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

  const [modalAvisoAberto, setModalAvisoAberto] = useState(false);
  const [mensagemAviso, setMensagemAviso] = useState("");
  const [arquivoImagem, setArquivoImagem] = useState<File | null>(null);
  const [previewImagem, setPreviewImagem] = useState<string | null>(null);
  const [arrastando, setArrastando] = useState(false);

  const [modalCalendarioAberto, setModalCalendarioAberto] = useState(false);
  const [eventos, setEventos] = useState<any[]>([]);
  const [novoEventoNome, setNovoEventoNome] = useState("");
  const [novoEventoData, setNovoEventoData] = useState("");
  const [idEditando, setIdEditando] = useState<number | null>(null);

  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  async function carregarDados() {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const { data: sessionData } = await supabase.auth.getSession();
      let emailAtual = "";
      
      if (authData?.user) {
        emailAtual = authData.user.email || "";
        setUserEmail(emailAtual);
        
        const { data: perfil } = await supabase.from('perfis').select('cargo').eq('id', authData.user.id).single();
        if (emailAtual === 'carlamonaliza9@gmail.com' || emailAtual === 'diretoria@abcdopark.com' || perfil?.cargo === 'Admin') {
          setEhAdmin(true);
        } else {
          const { data: func } = await supabase.from('funcionarios').select('foto_url').eq('email', emailAtual).single();
          if (func?.foto_url) setIlustracaoProfessor(func.foto_url);
        }

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
      }

      const { data: alunos } = await supabase.from('alunos').select('*');
      const { data: funcionarios } = await supabase.from('funcionarios').select('*');
      const { data: listaEventos } = await supabase.from('eventos_calendario').select('*').order('data', { ascending: true });
      const { data: turmasInfo } = await supabase.from('turmas_info').select('*');

      if (alunos) {
        let alunosBase = alunos;
        if (emailAtual && emailAtual !== 'carlamonaliza9@gmail.com' && emailAtual !== 'diretoria@abcdopark.com') {
           const minhasTurmas = (turmasInfo || [])
            .filter(t => t.email_prof_fixo_1 === emailAtual || t.email_prof_fixo_2 === emailAtual || t.email_prof_especifico_1 === emailAtual || t.email_prof_especifico_2 === emailAtual)
            .map(t => t.nome_turma);
           alunosBase = alunos.filter(a => minhasTurmas.includes(a.turma));
        }

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
            const sessionId = sessionData.session?.access_token.slice(-15) || 'default';
            const notifKey = `bday_session_${hojeString}_${sessionId}`;
            const exibições = parseInt(sessionStorage.getItem(notifKey) || '0');
            if (exibições < 2) {
              setModalBdayAberto(true);
              sessionStorage.setItem(notifKey, (exibições + 1).toString());
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

  async function salvarEvento() {
    if (!novoEventoNome || !novoEventoData) return alert("Preencha o nome e a data.");
    try {
      if (idEditando) {
        const { error } = await supabase.from('eventos_calendario').update({ titulo: novoEventoNome, data: novoEventoData }).eq('id', idEditando);
        if (error) throw error;
        setIdEditando(null);
      } else {
        const { error } = await supabase.from('eventos_calendario').insert([{ titulo: novoEventoNome, data: novoEventoData }]);
        if (error) throw error;
      }
      setNovoEventoNome(""); setNovoEventoData("");
      await carregarDados();
    } catch (err: any) { alert(`Erro: ${err.message}`); }
  }

  async function excluirEvento(id: number) {
    if (!confirm("Tem certeza que deseja excluir este evento?")) return;
    try {
      const { error } = await supabase.from('eventos_calendario').delete().eq('id', id);
      if (error) throw error;
      await carregarDados();
    } catch (err: any) { alert(`Erro ao excluir: ${err.message}`); }
  }

  const prepararEdicao = (ev: any) => { setIdEditando(ev.id); setNovoEventoNome(ev.titulo); setNovoEventoData(ev.data); };
  const cancelarEdicao = () => { setIdEditando(null); setNovoEventoNome(""); setNovoEventoData(""); };
  const formatarDataLocal = (dataString: string) => { const d = new Date(dataString + "T12:00:00"); return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' }); };
  const extrairDiaUTC = (dataString: string) => { const d = new Date(dataString + "T12:00:00"); return d.getUTCDate(); };
  const handleDrag = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setArrastando(e.type === "dragenter" || e.type === "dragover"); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setArrastando(false); const file = e.dataTransfer.files?.[0]; if (file && file.type.startsWith("image/")) { setArquivoImagem(file); setPreviewImagem(URL.createObjectURL(file)); } };

  const enviarAvisoWhatsApp = () => {
    const textoFinal = `📢 *AVISO ABC DO PARK*\n\n${mensagemAviso}`;
    navigator.clipboard.writeText(textoFinal);
    window.open(`https://wa.me/?text=${encodeURIComponent(textoFinal)}`, '_blank');
    setModalAvisoAberto(false); setMensagemAviso(""); setPreviewImagem(null);
  };

  const parabensWhatsApp = (pessoa: any) => {
    const msg = `Parabéns, ${pessoa.nome.split(' ')[0]}! 🎉 A ABC DO PARK te deseja um dia maravilhoso e cheio de alegrias! 🎂🎈`;
    window.open(`https://wa.me/55${pessoa.whatsapp?.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const getEventoStyle = (titulo: string) => {
    const t = titulo.toLowerCase();
    const isEspecial = t.includes("feriado") || t.includes("facultado");
    return { bg: isEspecial ? "#f5f3ff" : "#f9fafb", border: isEspecial ? "4px solid #8b5cf6" : "4px solid #2563eb", color: isEspecial ? "#6d28d9" : "#2563eb" };
  };

  const estiloBotaoAcao = { padding: '12px 20px', borderRadius: '12px', border: 'none', backgroundColor: '#2563eb', color: 'white', fontWeight: 'bold' as 'bold', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px rgba(37, 99, 235, 0.1)' };
  const estiloCard = { background: 'white', padding: '25px', borderRadius: '25px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', position: 'relative' as 'relative' };

  if (carregando) return <div style={{ padding: '40px', textAlign: 'center' }}>Carregando visão geral...</div>;

  return (
    <div style={{ width: '100%', padding: '10px 30px 30px 30px', fontFamily: 'sans-serif', backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
      
      {/* MODAL CONFIGURAÇÕES */}
      {modalConfigAberto && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '24px', width: '100%', maxWidth: '400px', padding: '30px', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '20px', color: '#111827' }}>Configurações de Perfil</h2>
            <div style={{ marginBottom: '20px', textAlign: 'left' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#6b7280', display: 'block', marginBottom: '8px' }}>NOME COMPLETO</label>
              <input type="text" value={novoNomeInput} onChange={(e) => setNovoNomeInput(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '16px', outline: 'none' }} />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setModalConfigAberto(false)} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #e5e7eb', backgroundColor: 'white', fontWeight: 'bold', cursor: 'pointer' }}>CANCELAR</button>
              <button onClick={atualizarPerfil} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', backgroundColor: '#2563eb', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>SALVAR</button>
            </div>
          </div>
        </div>
      )}

      {/* NOTIFICAÇÃO BDAY PERSONALIZADA E CARINHOSA */}
      {modalBdayAberto && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '30px', width: '100%', maxWidth: '480px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', position: 'relative', textAlign: 'center' }}>
            <div style={{ background: 'linear-gradient(135deg, #2563eb 0%, #8b5cf6 100%)', padding: '40px 20px', color: 'white' }}>
              <span style={{ fontSize: '50px' }}>🎂</span>
              <h2 style={{ fontSize: '24px', fontWeight: '800', marginTop: '10px' }}>
                {aniversariantesHoje.some(p => p.email === userEmail) 
                  ? `Parabéns, ${nomeUsuario}! ✨` 
                  : "Aniversariante(s) do Dia!"}
              </h2>
              
              {/* MINI TEXTO CARINHOSO PARA O FUNCIONÁRIO */}
              {aniversariantesHoje.some(p => p.email === userEmail) ? (
                <div style={{ padding: '0 20px', marginTop: '10px' }}>
                  <p style={{ opacity: 0.95, fontSize: '15px', lineHeight: '1.5', fontWeight: '500' }}>
                    "Que seu novo ciclo seja repleto de luz, saúde e muitas alegrias. É um privilégio ter sua dedicação e carinho fazendo parte da nossa história. Aproveite cada segundo do seu dia!"
                  </p>
                  <p style={{ marginTop: '8px', fontSize: '13px', fontWeight: 'bold', fontStyle: 'italic' }}>— Com carinho, Família ABC DO PARK</p>
                </div>
              ) : (
                <p style={{ opacity: 0.9, fontSize: '14px', marginTop: '10px' }}>Hoje o dia é de festa e gratidão na nossa escola!</p>
              )}
            </div>

            <div style={{ padding: '30px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {aniversariantesHoje.map(pessoa => {
                  const ehVoce = pessoa.email === userEmail;
                  return (
                    <div key={`${pessoa.tipo}-${pessoa.id}`} style={{ display: 'flex', alignItems: 'center', gap: '15px', textAlign: 'left', backgroundColor: ehVoce ? '#f0f9ff' : '#f8fafc', padding: '15px', borderRadius: '22px', border: `2px solid ${ehVoce ? '#3b82f6' : '#e5e7eb'}` }}>
                      <div style={{ width: '65px', height: '60px', borderRadius: '50%', backgroundColor: '#fff', border: '2px solid #eee', overflow: 'hidden', flexShrink: 0 }}>
                        {pessoa.foto_url ? <img src={pessoa.foto_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#666' }}>{pessoa.nome.charAt(0)}</div>}
                      </div>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#1e293b' }}>
                          {ehVoce ? "Você está de parabéns! 🥳" : pessoa.nome}
                        </h4>
                        <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: ehVoce ? '#2563eb' : (pessoa.tipo === 'funcionario' ? '#8b5cf6' : '#64748b') }}>
                          {ehVoce ? '🌟 Celebrando sua vida' : (pessoa.tipo === 'funcionario' ? '⭐ Equipe' : `📚 Aluno - ${pessoa.turma}`)}
                        </span>
                      </div>
                      {!ehVoce && (
                        <button onClick={() => parabensWhatsApp(pessoa)} style={{ background: '#22c55e', border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', boxShadow: '0 4px 6px rgba(34, 197, 94, 0.2)' }} title="Dar parabéns">📱</button>
                      )}
                    </div>
                  );
                })}
              </div>
              <button onClick={() => setModalBdayAberto(false)} style={{ marginTop: '25px', width: '100%', padding: '16px', borderRadius: '18px', border: 'none', backgroundColor: '#1e3a8a', color: 'white', fontWeight: '800', cursor: 'pointer', fontSize: '14px', letterSpacing: '0.05em' }}>
                {aniversariantesHoje.some(p => p.email === userEmail) ? 'RECEBER COM CARINHO ❤️' : 'FECHAR'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER DINÂMICO */}
      <header style={{ marginBottom: '15px', display: 'flex', justifyContent: ehAdmin ? 'space-between' : 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        {ehAdmin && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#111827' }}>Olá, {nomeUsuario}! 👋</h1>
              <button onClick={() => setModalConfigAberto(true)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', opacity: 0.6 }}>⚙️</button>
            </div>
            <p style={{ color: '#6b7280' }}>Resumo atualizado da ABC DO PARK.</p>
          </div>
        )}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => setModalCalendarioAberto(true)} style={estiloBotaoAcao}><span>📅</span> Calendário</button>
          {ehAdmin && <button onClick={() => setModalAvisoAberto(true)} style={estiloBotaoAcao}><span>📢</span> Enviar Aviso</button>}
        </div>
      </header>

      {/* ÁREA DE CONTEÚDO */}
      {ehAdmin ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px', marginBottom: '25px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
              <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '20px', textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                <h3 style={{ fontSize: '32px', fontWeight: '800', color: '#111827', margin: '10px 0 0' }}>{dados.totalAlunos}</h3>
                <p style={{ color: '#6b7280', fontSize: '13px', fontWeight: '600' }}>ALUNOS MATRICULADOS</p>
              </div>
              <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px', color: '#1f2937' }}>Alunos por Turma</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {Object.entries(dados.porTurma).map(([nome, qtd]) => (
                    <div key={nome}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '6px' }}>
                        <span style={{ fontWeight: '500' }}>{nome}</span>
                        <span style={{ fontWeight: '800', color: '#2563eb' }}>{qtd}</span>
                      </div>
                      <div style={{ width: '100%', height: '8px', backgroundColor: '#f3f4f6', borderRadius: '10px', overflow: 'hidden' }}>
                        <div style={{ width: `${(qtd / (dados.totalAlunos || 1)) * 100}%`, height: '100%', backgroundColor: '#2563eb' }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '10px' }}>🚀 Próximas Programações</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {dados.proximosEventos.length > 0 ? dados.proximosEventos.map((ev, i) => {
                  const estilo = getEventoStyle(ev.titulo);
                  return (
                    <div key={i} style={{ padding: '12px', backgroundColor: estilo.bg, borderRadius: '12px', borderLeft: estilo.border }}>
                      <span style={{ fontSize: '11px', fontWeight: 'bold', color: estilo.color, textTransform: 'uppercase' }}>{formatarDataLocal(ev.data)}</span>
                      <p style={{ margin: '4px 0 0', fontSize: '14px', fontWeight: '700', color: '#1f2937' }}>{ev.titulo}</p>
                    </div>
                  );
                }) : <p style={{ color: '#9ca3af', fontSize: '14px', fontStyle: 'italic' }}>Nenhuma programação agendada.</p>}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '25px', marginBottom: '25px' }}>
          <div style={{ ...estiloCard, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px', textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '10px' }}>
              <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#111827', margin: 0 }}>Olá, {nomeUsuario}! 👋</h1>
              <button onClick={() => setModalConfigAberto(true)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', opacity: 0.6 }}>⚙️</button>
            </div>
            <p style={{ color: '#6b7280', fontSize: '15px', marginBottom: '30px' }}>Resumo atualizado da ABC DO PARK.</p>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', marginBottom: '30px' }}>
              <img src={ilustracaoProfessor || "/image_de2d33.jpg"} alt="Ilustração" style={{ width: '100%', maxWidth: '380px', height: 'auto', borderRadius: '15px' }} />
            </div>
            <div style={{ width: '100%', borderTop: '2px solid #f1f5f9', paddingTop: '20px' }}>
              <h3 style={{ fontSize: '48px', fontWeight: '900', color: '#111827', margin: 0 }}>{dados.totalAlunos}</h3>
              <p style={{ color: '#64748b', fontSize: '14px', fontWeight: '800', textTransform: 'uppercase', margin: 0, letterSpacing: '0.1em' }}>Meus Alunos</p>
            </div>
          </div>
          <div style={estiloCard}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '10px' }}>🚀 Próximas Programações</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {dados.proximosEventos.length > 0 ? dados.proximosEventos.map((ev, i) => {
                const estilo = getEventoStyle(ev.titulo);
                return (
                  <div key={i} style={{ padding: '12px', backgroundColor: estilo.bg, borderRadius: '12px', borderLeft: estilo.border }}>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: estilo.color, textTransform: 'uppercase' }}>{formatarDataLocal(ev.data)}</span>
                    <p style={{ margin: '4px 0 0', fontSize: '14px', fontWeight: '700', color: '#1f2937' }}>{ev.titulo}</p>
                  </div>
                );
              }) : <p style={{ color: '#9ca3af', fontSize: '14px', fontStyle: 'italic' }}>Nenhuma programação agendada.</p>}
            </div>
          </div>
        </div>
      )}

      {/* ANIVERSARIANTES E SAÚDE */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '25px' }}>
        <div style={estiloCard}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px' }}>🎂 Aniversariantes de {meses[new Date().getUTCMonth()]}</h2>
          <div style={{ display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '10px' }}>
            {dados.aniversariantes.length > 0 ? dados.aniversariantes.map(pessoa => {
              const dia = extrairDiaUTC(pessoa.data_nascimento);
              const corDestaque = pessoa.tipo === 'funcionario' ? '#8b5cf6' : '#2563eb';
              return (
                <div key={`${pessoa.tipo}-${pessoa.id}`} style={{ textAlign: 'center', minWidth: '90px' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#f3f4f6', margin: '0 auto', overflow: 'hidden', border: `2px solid ${corDestaque}` }}>
                    {pessoa.foto_url ? <img src={pessoa.foto_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: corDestaque }}>{pessoa.nome.charAt(0)}</div>}
                  </div>
                  <p style={{ fontSize: '12px', fontWeight: 'bold', marginTop: '8px', color: '#1f2937' }}>{pessoa.nome.split(' ')[0]}</p>
                  <p style={{ fontSize: '11px', color: corDestaque, fontWeight: '600' }}>Dia {dia < 10 ? `0${dia}` : dia} {pessoa.tipo === 'funcionario' && "⭐"}</p>
                </div>
              );
            }) : <p style={{ color: '#9ca3af', fontSize: '14px' }}>Nenhum aniversário este mês.</p>}
          </div>
        </div>
        <div style={{ ...estiloCard, backgroundColor: '#fff5f5', border: '1px solid #fed7d7' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#c53030' }}>⚠️ Alertas de Saúde</h2>
            <input type="text" placeholder="Pesquisar..." value={buscaSaude} onChange={(e) => setBuscaSaude(e.target.value)} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #fed7d7', fontSize: '12px', width: '150px' }} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', maxHeight: '200px', overflowY: 'auto' }}>
            {alertasFiltrados.length > 0 ? alertasFiltrados.map(aluno => (
              <div key={aluno.id} style={{ backgroundColor: 'white', padding: '8px 12px', borderRadius: '10px', border: '1px solid #fed7d7', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '50%', backgroundColor: '#feb2b2', overflow: 'hidden' }}>
                  {aluno.foto_url ? <img src={aluno.foto_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>{aluno.nome.charAt(0)}</div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#1f2937' }}>{aluno.nome}</span>
                  <span style={{ fontSize: '11px', color: '#c53030', fontWeight: '600' }}>{aluno.alergia_descricao || "Alergia"}</span>
                </div>
              </div>
            )) : <p style={{ color: '#4a5568', fontSize: '14px' }}>Nenhum alerta encontrado.</p>}
          </div>
        </div>
      </div>

      {/* MODAL CALENDÁRIO */}
      {modalCalendarioAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: '#f8fafc', padding: '30px', borderRadius: '24px', width: '95%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 'bold' }}>📅 Calendário Escolar</h2>
              <button onClick={() => setModalCalendarioAberto(false)} style={{ border: 'none', background: 'none', fontSize: '24px', cursor: 'pointer' }}>✖</button>
            </div>
            {ehAdmin && (
              <div style={{ backgroundColor: idEditando ? '#fffbeb' : 'white', padding: '20px', borderRadius: '15px', marginBottom: '25px', display: 'flex', gap: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: idEditando ? '1px solid #fbbf24' : 'none' }}>
                <input type="text" placeholder="Nome do evento" value={novoEventoNome} onChange={(e) => setNovoEventoNome(e.target.value)} style={{ flex: 2, padding: '12px', border: '1px solid #ddd', borderRadius: '10px' }} />
                <input type="date" value={novoEventoData} onChange={(e) => setNovoEventoData(e.target.value)} style={{ flex: 1, padding: '12px', border: '1px solid #ddd', borderRadius: '10px' }} />
                <button onClick={salvarEvento} style={{ backgroundColor: idEditando ? '#f59e0b' : '#2563eb', color: 'white', padding: '12px 24px', borderRadius: '10px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>{idEditando ? 'ATUALIZAR' : 'ADICIONAR'}</button>
                {idEditando && <button onClick={cancelarEdicao} style={{ backgroundColor: '#ef4444', color: 'white', padding: '12px 15px', borderRadius: '10px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>X</button>}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
              {meses.map((mesNome, index) => (
                <div key={index} style={{ backgroundColor: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#2563eb', borderBottom: '2px solid #f3f4f6', paddingBottom: '8px', marginBottom: '12px' }}>{mesNome}</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {eventos.filter(ev => new Date(ev.data + "T12:00:00").getUTCMonth() === index).length > 0 ? (
                      eventos.filter(ev => new Date(ev.data + "T12:00:00").getUTCMonth() === index).map((ev, i) => {
                        const estilo = getEventoStyle(ev.titulo);
                        return (
                          <div key={i} style={{ fontSize: '13px', padding: '10px', backgroundColor: estilo.bg, borderRadius: '8px', borderLeft: estilo.border, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div><span style={{ fontWeight: 'bold', display: 'block', color: estilo.color }}>Dia {extrairDiaUTC(ev.data)}:</span><span>{ev.titulo}</span></div>
                            {ehAdmin && (
                              <div style={{ display: 'flex', gap: '5px' }}>
                                <button onClick={() => prepararEdicao(ev)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px' }}>✏️</button>
                                <button onClick={() => excluirEvento(ev.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px' }}>🗑️</button>
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : <p style={{ fontSize: '12px', color: '#9ca3af', fontStyle: 'italic' }}>Sem eventos</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL AVISO */}
      {modalAvisoAberto && ehAdmin && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '24px', width: '90%', maxWidth: '500px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '10px' }}>📢 Enviar Aviso Geral</h2>
            <div onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop} onClick={() => document.getElementById('input-imagem')?.click()} style={{ width: '100%', height: '150px', border: arrastando ? '2px solid #2563eb' : '2px dashed #e5e7eb', borderRadius: '15px', backgroundColor: arrastando ? '#eff6ff' : '#f9fafb', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', cursor: 'pointer', overflow: 'hidden' }}>
              {previewImagem ? <img src={previewImagem} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <><span style={{ fontSize: '30px' }}>🖼️</span><p style={{ fontSize: '12px', color: '#6b7280', marginTop: '10px' }}>Arraste a imagem ou clique aqui</p></>}
              <input type="file" id="input-imagem" accept="image/*" hidden onChange={(e) => { const file = e.target.files?.[0]; if (file) { setArquivoImagem(file); setPreviewImagem(URL.createObjectURL(file)); } }} />
            </div>
            <textarea value={mensagemAviso} onChange={(e) => setMensagemAviso(e.target.value)} placeholder="Digite o texto do comunicado..." style={{ width: '100%', height: '100px', padding: '15px', borderRadius: '15px', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb', fontSize: '14px', outline: 'none', resize: 'none', marginBottom: '20px' }} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setModalAvisoAberto(false)} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid #e5e7eb', backgroundColor: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={enviarAvisoWhatsApp} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', backgroundColor: '#2563eb', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Abrir WhatsApp</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}