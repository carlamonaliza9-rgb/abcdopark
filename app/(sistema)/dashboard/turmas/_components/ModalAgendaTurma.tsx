"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface ModalAgendaTurmaProps {
  turma: any;
  onClose: () => void;
  userEmail: string | null;
  modo: 'registrar' | 'consultar';
  ehAdmin?: boolean;
}

export function ModalAgendaTurma({ turma, onClose, userEmail, modo, ehAdmin }: ModalAgendaTurmaProps) {
  const [dataSelecionada, setDataSelecionada] = useState(new Date().toLocaleDateString('en-CA'));
  const [conteudoAula, setConteudoAula] = useState("");
  const [tarefaCasa, setTarefaCasa] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [estaEditando, setEstaEditando] = useState(modo === 'registrar');

  const [valoresOriginais, setValoresOriginais] = useState({ conteudo: "", tarefa: "", existe: false });

  async function registrarLog(acao: string, detalhes: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('logs_sistema').insert([{
          usuario_email: user.email,
          acao: acao,
          tabela: 'agenda_escolar',
          detalhes: detalhes
        }]);
      }
    } catch (e) {
      console.error("Erro ao gerar log de auditoria:", e);
    }
  }

  async function carregarRegistroDaData(data: string) {
    setCarregando(true);
    // .maybeSingle() evita o erro 406 ao buscar uma data que ainda não existe
    const { data: registro } = await supabase
      .from('agenda_escolar')
      .select('*')
      .eq('nome_turma', turma.nome)
      .eq('data', data)
      .maybeSingle();

    if (registro) {
      setConteudoAula(registro.conteudo_aula || "");
      setTarefaCasa(registro.tarefa_casa || "");
      setValoresOriginais({
        conteudo: registro.conteudo_aula || "",
        tarefa: registro.tarefa_casa || "",
        existe: true
      });
    } else {
      setConteudoAula(""); 
      setTarefaCasa("");
      setValoresOriginais({ conteudo: "", tarefa: "", existe: false });
    }
    setCarregando(false);
  }

  useEffect(() => {
    carregarRegistroDaData(dataSelecionada);
    setEstaEditando(modo === 'registrar');
  }, [dataSelecionada, modo]);

  async function handleSalvar() {
    if (!conteudoAula && !tarefaCasa) return alert("Preencha ao menos um campo.");
    setSalvando(true);

    const acaoRealizada = valoresOriginais.existe ? "EDIÇÃO" : "INSERÇÃO";
    const dataFormatada = new Date(dataSelecionada + "T12:00:00").toLocaleDateString('pt-BR');
    let textoDetalhes = "";

    if (acaoRealizada === "INSERÇÃO") {
      textoDetalhes = `📝 Realizou o novo registro da agenda diária para a turma ${turma.nome} na data ${dataFormatada}:\n` +
                      `• O que foi realizado em sala: ${conteudoAula || "(Vazio)"}\n` +
                      `• Atividade para casa: ${tarefaCasa || "(Vazio)"}`;
    } else {
      textoDetalhes = `📝 Alterou o registro da agenda diária para a turma ${turma.nome} na data ${dataFormatada}:\n` +
                      `• O que foi realizado em sala:\n  Antes: ${valoresOriginais.conteudo || "(Vazio)"}\n  ➔ Depois: ${conteudoAula || "(Vazio)"}\n` +
                      `• Atividade para casa:\n  Antes: ${valoresOriginais.tarefa || "(Vazio)"}\n  ➔ Depois: ${tarefaCasa || "(Vazio)"}`;
    }

    const { error } = await supabase.from('agenda_escolar').upsert({
      nome_turma: turma.nome, 
      data: dataSelecionada,
      conteudo_aula: conteudoAula, 
      tarefa_casa: tarefaCasa,
      professor_email: userEmail
    }, { onConflict: 'nome_turma, data' });

    if (error) {
      alert("Erro ao salvar: " + error.message);
    } else {
      await registrarLog(acaoRealizada, textoDetalhes);

      // --- INÍCIO DA INTEGRAÇÃO ONESIGNAL (COM MODO RAIO-X) ---
      // Apenas dispara a notificação se for um novo registro daquele dia
      if (acaoRealizada === "INSERÇÃO") {
        try {
          console.log("🔔 [Modo Raio-X] 1. Tentando chamar a API de notificação para a turma:", turma.nome);
          
          const respostaNotificacao = await fetch('/api/notificar-turma', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              turma: turma.nome,
              titulo: "📘 Nova Atualização na Agenda!",
              mensagem: `O professor atualizou a agenda da turma ${turma.nome}. Toque para conferir o que foi feito em sala!`
            })
          });

          const dadosResposta = await respostaNotificacao.json().catch(() => null);
          console.log("📡 [Modo Raio-X] 2. Resposta do Servidor:", respostaNotificacao.status, dadosResposta);

          if (!respostaNotificacao.ok) {
            console.error("❌ [Modo Raio-X] 3. ERRO: O servidor recusou o envio da notificação.", dadosResposta);
          } else {
            console.log("✅ [Modo Raio-X] 3. SUCESSO: O servidor processou e enviou o comando para o OneSignal!");
          }
        } catch (erroGatilho) {
          console.error("❌ [Modo Raio-X] 3. ERRO FATAL: Falha de conexão ao tentar chamar a API /api/notificar-turma:", erroGatilho);
        }
      }
      // --- FIM DA INTEGRAÇÃO ONESIGNAL ---

      alert("Agenda salva com sucesso! 📝");
      if (modo === 'registrar') onClose();
      else {
        setValoresOriginais({ conteudo: conteudoAula, tarefa: tarefaCasa, existe: true });
        setEstaEditando(false);
      }
    }
    setSalvando(false);
  }

  async function handleExcluir() {
    const senha = prompt("🔒 Digite a senha para EXCLUIR este registro:");
    
    if (senha === "1123") {
      const confirmou = confirm("Tem certeza que deseja apagar permanentemente a agenda deste dia?");
      if (confirmou) {
        const dataFormatada = new Date(dataSelecionada + "T12:00:00").toLocaleDateString('pt-BR');
        const textoDetalhes = `🗑️ Excluiu permanentemente o registro da agenda diária da turma ${turma.nome} na data ${dataFormatada}.\n` +
                              `• Conteúdo que foi removido:\n` +
                              `  - Em sala: ${conteudoAula || "(Vazio)"}\n` +
                              `  - Casa: ${tarefaCasa || "(Vazio)"}`;

        const { error } = await supabase
          .from('agenda_escolar')
          .delete()
          .eq('nome_turma', turma.nome)
          .eq('data', dataSelecionada);

        if (error) {
          alert("Erro ao excluir: " + error.message);
        } else {
          await registrarLog("EXCLUSÃO", textoDetalhes);
          alert("Registro removido com sucesso!");
          setConteudoAula("");
          setTarefaCasa("");
          setValoresOriginais({ conteudo: "", tarefa: "", existe: false });
          setEstaEditando(false);
        }
      }
    } else if (senha !== null) {
      alert("⚠️ Senha incorreta.");
    }
  }

  return (
    <div 
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div 
        style={{ backgroundColor: 'white', borderRadius: '30px', width: '95%', maxWidth: '500px', padding: '30px', position: 'relative' }}
        onClick={(e) => e.stopPropagation()}
      >
        {modo === 'consultar' && (
          <button 
            onClick={handleExcluir}
            style={{ position: 'absolute', top: 20, left: 20, border: 'none', background: '#fee2e2', color: '#dc2626', borderRadius: '12px', padding: '8px 15px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            🗑️ EXCLUIR
          </button>
        )}

        <button onClick={onClose} style={{ position: 'absolute', top: 20, right: 20, border: 'none', background: '#f1f5f9', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer' }}>✕</button>

        <header style={{ textAlign: 'center', marginBottom: '25px', marginTop: modo === 'consultar' ? '20px' : '0' }}>
          <span style={{ fontSize: '40px' }}>{modo === 'registrar' ? "📝" : "🔍"}</span>
          <h2 style={{ margin: '10px 0 5px', fontSize: '22px', fontWeight: '800', color: '#111827' }}>
            {modo === 'registrar' ? 'Registrar Agenda de Hoje' : 'Consultar Agendas'}
          </h2>
          <p style={{ margin: 0, color: '#64748b', fontWeight: '600' }}>{turma.nome}</p>
        </header>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', marginBottom: '8px' }}>DATA DA ATIVIDADE</label>
            <input 
              type="date" value={dataSelecionada}
              onChange={(e) => setDataSelecionada(e.target.value)}
              disabled={modo === 'registrar'}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: modo === 'registrar' ? '#f1f5f9' : '#fff' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', marginBottom: '8px' }}>O QUE FOI REALIZADO EM SALA</label>
            <textarea 
              value={conteudoAula} onChange={(e) => setConteudoAula(e.target.value)}
              disabled={!estaEditando || carregando}
              placeholder={estaEditando ? "Descreva as atividades..." : "Sem registro para esta data."}
              style={{ width: '100%', minHeight: '100px', padding: '12px', borderRadius: '12px', border: estaEditando ? '1px solid #2563eb' : '1px solid #e2e8f0', backgroundColor: estaEditando ? '#fff' : '#f8fafc', resize: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', marginBottom: '8px' }}>ATIVIDADE PARA CASA</label>
            <textarea 
              value={tarefaCasa} onChange={(e) => setTarefaCasa(e.target.value)}
              disabled={!estaEditando || carregando}
              placeholder={estaEditando ? "Lição de casa..." : "Nenhuma tarefa registrada."}
              style={{ width: '100%', minHeight: '80px', padding: '12px', borderRadius: '12px', border: estaEditando ? '1px solid #2563eb' : '1px solid #e2e8f0', backgroundColor: estaEditando ? '#fff' : '#f8fafc', resize: 'none' }}
            />
          </div>
        </div>

        <div style={{ marginTop: '30px', display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '14px', borderRadius: '15px', border: 'none', backgroundColor: '#f1f5f9', color: '#475569', fontWeight: 'bold', cursor: 'pointer' }}>FECHAR</button>
          
          {modo === 'consultar' && !estaEditando ? (
            <button onClick={() => setEstaEditando(true)} style={{ flex: 2, padding: '14px', borderRadius: '15px', border: 'none', backgroundColor: '#8b5cf6', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>✏️ EDITAR ESTA DATA</button>
          ) : (
            <button onClick={handleSalvar} disabled={salvando || carregando} style={{ flex: 2, padding: '14px', borderRadius: '15px', border: 'none', backgroundColor: '#2563eb', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
              {salvando ? "SALVANDO..." : "SALVAR NA AGENDA"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}