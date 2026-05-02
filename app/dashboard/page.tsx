"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function DashboardPage() {
  const [dados, setDados] = useState({
    totalAlunos: 0,
    porTurma: {} as { [key: string]: number },
    aniversariantes: [] as any[],
    alertasSaude: [] as any[],
    proximosEventos: [] as any[]
  });
  const [carregando, setCarregando] = useState(true);
  
  // Estados para o Modal de Aviso (WhatsApp)
  const [modalAvisoAberto, setModalAvisoAberto] = useState(false);
  const [mensagemAviso, setMensagemAviso] = useState("");
  const [arquivoImagem, setArquivoImagem] = useState<File | null>(null);
  const [previewImagem, setPreviewImagem] = useState<string | null>(null);
  const [arrastando, setArrastando] = useState(false);

  // Estados para Calendário em Cards
  const [modalCalendarioAberto, setModalCalendarioAberto] = useState(false);
  const [eventos, setEventos] = useState<any[]>([]);
  const [novoEventoNome, setNovoEventoNome] = useState("");
  const [novoEventoData, setNovoEventoData] = useState("");
  
  // Estados para Edição
  const [idEditando, setIdEditando] = useState<number | null>(null);

  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  async function carregarDados() {
    try {
      const { data: alunos } = await supabase.from('alunos').select('*');
      const { data: listaEventos } = await supabase.from('eventos_calendario').select('*').order('data', { ascending: true });
      
      if (alunos) {
        const hoje = new Date();
        const mesAtual = hoje.getUTCMonth();
        
        const hojeString = hoje.toISOString().split('T')[0];
        const futuros = listaEventos ? listaEventos.filter(ev => ev.data >= hojeString).slice(0, 4) : [];

        setDados({
          totalAlunos: alunos.length,
          porTurma: alunos.reduce((acc: any, curr: any) => {
            const t = curr.turma || "Sem Turma";
            acc[t] = (acc[t] || 0) + 1;
            return acc;
          }, {}),
          // Filtro de aniversariantes para o mês atual
          aniversariantes: alunos.filter(a => a.data_nascimento && new Date(a.data_nascimento).getUTCMonth() === mesAtual),
          alertasSaude: alunos.filter(a => a.tem_alergia === true),
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

  // --- Funções do Calendário ---
  async function salvarEvento() {
    if (!novoEventoNome || !novoEventoData) return alert("Preencha o nome e a data.");
    try {
      if (idEditando) {
        const { error } = await supabase
          .from('eventos_calendario')
          .update({ titulo: novoEventoNome, data: novoEventoData })
          .eq('id', idEditando);
        if (error) throw error;
        setIdEditando(null);
      } else {
        const { error } = await supabase
          .from('eventos_calendario')
          .insert([{ titulo: novoEventoNome, data: novoEventoData }]);
        if (error) throw error;
      }
      setNovoEventoNome(""); 
      setNovoEventoData("");
      await carregarDados();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  }

  async function excluirEvento(id: number) {
    if (!confirm("Tem certeza que deseja excluir este evento?")) return;
    try {
      const { error } = await supabase.from('eventos_calendario').delete().eq('id', id);
      if (error) throw error;
      await carregarDados();
    } catch (err: any) {
      alert(`Erro ao excluir: ${err.message}`);
    }
  }

  const prepararEdicao = (ev: any) => {
    setIdEditando(ev.id);
    setNovoEventoNome(ev.titulo);
    setNovoEventoData(ev.data);
  };

  const cancelarEdicao = () => {
    setIdEditando(null);
    setNovoEventoNome("");
    setNovoEventoData("");
  };

  // --- Funções do Aviso Geral ---
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setArrastando(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setArrastando(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setArquivoImagem(file);
      setPreviewImagem(URL.createObjectURL(file));
    }
  };

  const enviarAvisoWhatsApp = () => {
    const textoFinal = `📢 *AVISO ABC DO PARK*\n\n${mensagemAviso}`;
    navigator.clipboard.writeText(textoFinal);
    window.open(`https://wa.me/?text=${encodeURIComponent(textoFinal)}`, '_blank');
    setModalAvisoAberto(false);
    setMensagemAviso("");
    setPreviewImagem(null);
  };

  if (carregando) return <div style={{ padding: '40px', textAlign: 'center' }}>Carregando visão geral...</div>;

  return (
    <div style={{ width: '100%', padding: '30px', fontFamily: 'sans-serif', backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
      
      <header style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#111827' }}>Olá, Administrador! 👋</h1>
        <p style={{ color: '#6b7280' }}>Resumo atualizado da ABC DO PARK.</p>
      </header>

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
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '10px' }}>
            🚀 Próximas Programações
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {dados.proximosEventos.length > 0 ? dados.proximosEventos.map((ev, i) => (
              <div key={i} style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '12px', borderLeft: '4px solid #2563eb' }}>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#2563eb', textTransform: 'uppercase' }}>
                  {new Date(ev.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                </span>
                <p style={{ margin: '4px 0 0', fontSize: '14px', fontWeight: '700', color: '#1f2937' }}>{ev.titulo}</p>
              </div>
            )) : (
              <p style={{ color: '#9ca3af', fontSize: '14px', fontStyle: 'italic' }}>Nenhuma programação agendada.</p>
            )}
          </div>
        </div>

        <div style={{ backgroundColor: '#2563eb', padding: '30px', borderRadius: '20px', color: 'white', boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.2)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '10px' }}>Ações de Gestão</h2>
          <p style={{ fontSize: '14px', opacity: 0.9, marginBottom: '25px' }}>Gerencie sua escola de forma rápida e eficiente.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button onClick={() => setModalCalendarioAberto(true)} style={{ padding: '14px', borderRadius: '12px', border: 'none', backgroundColor: 'rgba(255,255,255,0.15)', color: 'white', fontWeight: 'bold', textAlign: 'left', cursor: 'pointer', fontSize: '14px' }}>📅 Consultar calendário</button>
            <button onClick={() => setModalAvisoAberto(true)} style={{ padding: '14px', borderRadius: '12px', border: 'none', backgroundColor: 'rgba(255,255,255,0.15)', color: 'white', fontWeight: 'bold', textAlign: 'left', cursor: 'pointer', fontSize: '14px' }}>📢 Enviar aviso geral (WhatsApp)</button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '25px' }}>
        {/* --- CARD ATUALIZADO: Aniversariantes do Mês --- */}
        <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px' }}>
            🎂 Aniversariantes de {meses[new Date().getUTCMonth()]}
          </h2>
          <div style={{ display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '10px' }}>
            {dados.aniversariantes.length > 0 ? dados.aniversariantes.map(aluno => {
              const dataNasc = new Date(aluno.data_nascimento);
              const dia = dataNasc.getUTCDate();
              return (
                <div key={aluno.id} style={{ textAlign: 'center', minWidth: '90px' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#f3f4f6', margin: '0 auto', overflow: 'hidden', border: '2px solid #2563eb' }}>
                    {aluno.foto_url ? (
                      <img src={aluno.foto_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#2563eb' }}>
                        {aluno.nome.charAt(0)}
                      </div>
                    )}
                  </div>
                  <p style={{ fontSize: '12px', fontWeight: 'bold', marginTop: '8px', color: '#1f2937' }}>
                    {aluno.nome.split(' ')[0]}
                  </p>
                  <p style={{ fontSize: '11px', color: '#2563eb', fontWeight: '600' }}>
                    Dia {dia < 10 ? `0${dia}` : dia}
                  </p>
                </div>
              );
            }) : <p style={{ color: '#9ca3af', fontSize: '14px' }}>Nenhum aniversário este mês.</p>}
          </div>
        </div>

        {/* --- Card de Alertas de Saúde / Alergias --- */}
        <div style={{ backgroundColor: '#fff5f5', padding: '25px', borderRadius: '20px', border: '1px solid #fed7d7', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px', color: '#c53030' }}>⚠️ Alertas de Saúde / Alergias</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {dados.alertasSaude.length > 0 ? dados.alertasSaude.map(aluno => (
              <div key={aluno.id} style={{ backgroundColor: 'white', padding: '8px 12px', borderRadius: '10px', border: '1px solid #fed7d7', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '50%', backgroundColor: '#feb2b2', overflow: 'hidden' }}>
                  {aluno.foto_url ? <img src={aluno.foto_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>{aluno.nome.charAt(0)}</div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#1f2937' }}>{aluno.nome}</span>
                  <span style={{ fontSize: '11px', color: '#c53030', fontWeight: '600' }}>
                    {aluno.alergia_descricao || "Alergia"}
                  </span>
                </div>
              </div>
            )) : <p style={{ color: '#4a5568', fontSize: '14px' }}>Nenhum alerta registrado.</p>}
          </div>
        </div>
      </div>

      {/* --- MODAL CALENDÁRIO --- */}
      {modalCalendarioAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: '#f8fafc', padding: '30px', borderRadius: '24px', width: '95%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 'bold' }}>📅 Calendário Escolar</h2>
              <button onClick={() => setModalCalendarioAberto(false)} style={{ border: 'none', background: 'none', fontSize: '24px', cursor: 'pointer' }}>✖</button>
            </div>

            <div style={{ backgroundColor: idEditando ? '#fffbeb' : 'white', padding: '20px', borderRadius: '15px', marginBottom: '25px', display: 'flex', gap: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: idEditando ? '1px solid #fbbf24' : 'none' }}>
              <input type="text" placeholder="Nome do evento" value={novoEventoNome} onChange={(e) => setNovoEventoNome(e.target.value)} style={{ flex: 2, padding: '12px', border: '1px solid #ddd', borderRadius: '10px' }} />
              <input type="date" value={novoEventoData} onChange={(e) => setNovoEventoData(e.target.value)} style={{ flex: 1, padding: '12px', border: '1px solid #ddd', borderRadius: '10px' }} />
              <button onClick={salvarEvento} style={{ backgroundColor: idEditando ? '#f59e0b' : '#2563eb', color: 'white', padding: '12px 24px', borderRadius: '10px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
                {idEditando ? 'ATUALIZAR' : 'ADICIONAR'}
              </button>
              {idEditando && (
                <button onClick={cancelarEdicao} style={{ backgroundColor: '#ef4444', color: 'white', padding: '12px 15px', borderRadius: '10px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>X</button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
              {meses.map((mesNome, index) => (
                <div key={index} style={{ backgroundColor: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#2563eb', borderBottom: '2px solid #f3f4f6', paddingBottom: '8px', marginBottom: '12px' }}>{mesNome}</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {eventos.filter(ev => new Date(ev.data).getUTCMonth() === index).length > 0 ? (
                      eventos.filter(ev => new Date(ev.data).getUTCMonth() === index).map((ev, i) => (
                        <div key={i} style={{ fontSize: '13px', padding: '10px', backgroundColor: '#f9fafb', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span style={{ fontWeight: 'bold', display: 'block' }}>Dia {new Date(ev.data).getUTCDate()}:</span>
                            <span>{ev.titulo}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '5px' }}>
                            <button onClick={() => prepararEdicao(ev)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px' }} title="Editar">✏️</button>
                            <button onClick={() => excluirEvento(ev.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px' }} title="Excluir">🗑️</button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p style={{ fontSize: '12px', color: '#9ca3af', fontStyle: 'italic' }}>Sem eventos</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal Aviso Geral */}
      {modalAvisoAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '24px', width: '90%', maxWidth: '500px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '10px' }}>📢 Enviar Aviso Geral</h2>
            <div onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop} onClick={() => document.getElementById('input-imagem')?.click()} style={{ width: '100%', height: '150px', border: arrastando ? '2px solid #2563eb' : '2px dashed #e5e7eb', borderRadius: '15px', backgroundColor: arrastando ? '#eff6ff' : '#f9fafb', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', cursor: 'pointer', overflow: 'hidden' }}>
              {previewImagem ? <img src={previewImagem} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <><span style={{ fontSize: '30px' }}>🖼️</span><p style={{ fontSize: '12px', color: '#6b7280', marginTop: '10px' }}>Arraste a imagem ou clique aqui</p></>}
              <input type="file" id="input-imagem" accept="image/*" hidden onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) { setArquivoImagem(file); setPreviewImagem(URL.createObjectURL(file)); }
              }} />
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