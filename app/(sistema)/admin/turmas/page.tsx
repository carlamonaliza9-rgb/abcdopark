"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

// --- IMPORTAÇÕES RESTAURADAS ---
import { TurmasHeader } from "@/app/(sistema)/dashboard/turmas/_components/TurmasHeader";
import { TurmaCard } from "@/app/(sistema)/dashboard/turmas/_components/TurmaCard";
import { ModalHorario } from "@/app/(sistema)/dashboard/turmas/_components/ModalHorario";
import { ModalDetalhesTurma } from "@/app/(sistema)/dashboard/turmas/_components/ModalDetalhesTurma";
import { ModalFichaAlunoTurma } from "@/app/(sistema)/dashboard/turmas/_components/ModalFichaAlunoTurma";
import { ModalAgendaTurma } from "@/app/(sistema)/dashboard/turmas/_components/ModalAgendaTurma";

// --- FUNÇÕES AUXILIARES DE CORTE ---
function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number) {
  return centerCrop(
    makeAspectCrop({ unit: "%", width: 90 }, aspect, mediaWidth, mediaHeight),
    mediaWidth, mediaHeight
  );
}

async function getCroppedImg(image: HTMLImageElement, crop: PixelCrop, fileName: string): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0, 0, crop.width, crop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Canvas is empty"));
        return;
      }
      (blob as any).name = fileName;
      resolve(blob);
    }, "image/jpeg", 0.95);
  });
}

export default function TurmasAdminPage() {
  const router = useRouter();
  const [turmas, setTurmas] = useState<any[]>([]);
  const [todosAlunos, setTodosAlunos] = useState<any[]>([]);
  const [listaProfessores, setListaProfessores] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const ehAdmin = true; 

  const [coresConfig, setCoresConfig] = useState<any>({});
  const [coresTemporarias, setCoresTemporarias] = useState<any>({});
  const [editandoCores, setEditandoCores] = useState(false);
  const [salvandoCores, setSalvandoCores] = useState(false);

  const [turmaSelecionada, setTurmaSelecionada] = useState<any>(null);
  const [modalTurmaAberto, setModalTurmaAberto] = useState(false);
  const [alunoSelecionado, setAlunoSelecionado] = useState<any>(null);
  const [modalFichaAberto, setModalFichaAberto] = useState(false);

  const [modalHorarioAberto, setModalHorarioAberto] = useState(false);
  const [turmaParaHorario, setTurmaParaHorario] = useState<any>(null);
  const [arquivoHorario, setArquivoHorario] = useState<File | null>(null);
  const [previewHorario, setPreviewHorario] = useState<string | null>(null);
  const [arrastandoHorario, setArrastandoHorario] = useState(false);
  const [salvandoHorario, setSalvandoHorario] = useState(false);

  const [modalAgendaAberto, setModalAgendaAberto] = useState(false);
  const [turmaParaAgenda, setTurmaParaAgenda] = useState<any>(null);
  const [modoAgenda, setModoAgenda] = useState<'registrar' | 'consultar'>('registrar');

  // --- NOVOS ESTADOS PARA VINCULAÇÃO GRANULAR DE PROFESSORES ---
  const [modalVincularAberto, setModalVincularAberto] = useState(false);
  const [turmaVincular, setTurmaVincular] = useState<string>("");
  const [disciplinasTurma, setDisciplinasTurma] = useState<any[]>([]);
  const [infoTurmaAtual, setInfoTurmaAtual] = useState<any>({});

  const estiloFixoTurmas: any = {
    "Maternal": { icone: "👶", texto: "#0369a1" },
    "Jardim I": { icone: "🎨", texto: "#15803d" },
    "Jardim II": { icone: "🍃", texto: "#be185d" },
    "1º Ano": { icone: "✏️", texto: "#7e22ce" },
    "2º Ano": { icone: "📚", texto: "#c2410c" },
    "3º Ano": { icone: "🧪", texto: "#6d28d9" },
    "4º Ano": { icone: "🌍", texto: "#0e7490" },
    "5º Ano": { icone: "🚀", texto: "#a16207" },
  };

  const escurecerCor = (hex: string, valor: number = 35) => {
    if (!hex) return "#e5e7eb";
    const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - valor);
    const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - valor);
    const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - valor);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  async function carregarDados() {
    setCarregando(true);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return router.push("/login");

    const email = authData.user.email || "";
    const { data: perfil } = await supabase.from('perfis').select('cargo').eq('id', authData.user.id).single();
    const verificadoAdmin = email === 'carlamonaliza9@gmail.com' || email === 'diretoria@abcdopark.com' || perfil?.cargo === 'Admin';
    
    if (!verificadoAdmin) return router.push("/dashboard");
    setUserEmail(email);

    const { data: coresData } = await supabase.from('configuracao_turmas').select('*');
    const coresAtuais = coresData?.reduce((acc: any, item: any) => { acc[item.nome_turma] = item.cor_hex; return acc; }, {}) || {};
    setCoresConfig(coresAtuais);

    const [resAlunos, resInfos, resFuncs, resDisc] = await Promise.all([
      supabase.from('alunos').select('*'),
      supabase.from('turmas_info').select('*'),
      supabase.from('funcionarios').select('nome, cargo').in('cargo', ['Professor', 'Auxiliar']).order('nome'),
      supabase.from('turma_disciplinas').select('*').eq('ano', '2026')
    ]);

    if (resFuncs.data) setListaProfessores(resFuncs.data);
    
    if (resAlunos.data) {
      setTodosAlunos(resAlunos.data);
      const contagem = resAlunos.data.reduce((acc: any, curr: any) => { acc[curr.turma] = (acc[curr.turma] || 0) + 1; return acc; }, {});
      
      const listaTurmasCompilada = Object.keys(estiloFixoTurmas).map(nome => {
        const infoExtra = resInfos.data?.find(i => i.nome_turma === nome);
        const corFundo = coresAtuais[nome] || "#ffffff";
        
        // --- MOTOR DE TRIAGEM HIERÁRQUICA ---
        const discTurma = (resDisc.data || []).filter(d => d.nome_turma === nome && d.professor_vinculado);
        
        // 1. Conta quem dá mais aulas
        const contagemProfs = discTurma.reduce((acc: any, curr: any) => {
            acc[curr.professor_vinculado] = (acc[curr.professor_vinculado] || 0) + 1;
            return acc;
        }, {});
        
        // 2. Acha o número máximo de matérias que um professor tem
        let maxMaterias = 0;
        for (const p in contagemProfs) {
            if (contagemProfs[p] > maxMaterias) maxMaterias = contagemProfs[p];
        }

        // 3. Separa Regentes (quem tem maxMaterias) dos Especialistas
        let regentesLista: string[] = [];
        let especialistasMap = new Map<string, string[]>(); // Map de Professor -> [Música, Xadrez...]

        discTurma.forEach(d => {
            const prof = d.professor_vinculado;
            if (contagemProfs[prof] === maxMaterias) {
                if (!regentesLista.includes(prof)) regentesLista.push(prof);
            } else {
                const matAtual = especialistasMap.get(prof) || [];
                matAtual.push(d.disciplina);
                especialistasMap.set(prof, matAtual);
            }
        });

        const arrayEspecialistasFormatado = Array.from(especialistasMap.entries()).map(([prof, mat]) => {
             return `${prof} (${mat.join(", ")})`;
        });

        return {
          nome, 
          totalAlunos: contagem[nome] || 0,
          regentes: regentesLista,
          especialistas: arrayEspecialistasFormatado,
          auxiliar: infoExtra?.auxiliar || "",
          horario_url: infoExtra ? infoExtra.horario_url : null, 
          cor: corFundo, 
          borda: escurecerCor(corFundo, 35),
          ...estiloFixoTurmas[nome]
        };
      });
      setTurmas(listaTurmasCompilada);
    }
    setCarregando(false);
  }

  useEffect(() => { carregarDados(); }, []);

  async function confirmarNovasCores() {
    setSalvandoCores(true);
    try {
      for (const nomeTurma in coresTemporarias) {
        await supabase.from('configuracao_turmas').update({ cor_hex: coresTemporarias[nomeTurma] }).eq('nome_turma', nomeTurma);
      }
      await carregarDados();
      setEditandoCores(false);
      alert("Cores e contornos atualizados!");
    } catch (err) { alert("Erro ao salvar cores."); } finally { setSalvandoCores(false); }
  }

  async function editarProfessor(e: React.MouseEvent, nomeTurma: string) {
    e.stopPropagation();
    setTurmaVincular(nomeTurma);
    const { data: discData } = await supabase.from('turma_disciplinas').select('*').eq('nome_turma', nomeTurma).eq('ano', '2026');
    setDisciplinasTurma(discData || []);
    const { data: infoData } = await supabase.from('turmas_info').select('*').eq('nome_turma', nomeTurma).single();
    setInfoTurmaAtual(infoData || { nome_turma: nomeTurma });
    setModalVincularAberto(true);
  }

  async function salvarVinculos(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    try {
      await supabase.from('turmas_info').upsert({
          nome_turma: turmaVincular,
          auxiliar: infoTurmaAtual.auxiliar || null
      }, { onConflict: 'nome_turma' });

      for (const disc of disciplinasTurma) {
          await supabase.from('turma_disciplinas').update({
              professor_vinculado: disc.professor_vinculado || null
          }).eq('id', disc.id);
      }
      
      await carregarDados();
      setModalVincularAberto(false);
      alert("Equipe vinculada com sucesso!");
    } catch (error: any) {
      alert("Erro ao vincular equipe: " + error.message);
    } finally {
      setCarregando(false);
    }
  }

  async function gerenciarMaterias(e: React.MouseEvent, nomeTurma: string) {
    e.stopPropagation();
    const acao = prompt(`Gerenciar Matérias - ${nomeTurma}\n1 - Adicionar Matérias (Várias por vez)\n2 - Ver/Remover Matérias`);
    
    if (acao === "1") {
      const input = prompt("Digite as matérias separadas por VÍRGULA (Ex: Português, Matemática, Artes):");
      
      if (input) {
        const listaMaterias = input.split(",")
          .map(m => m.trim())
          .filter(m => m !== "");

        if (listaMaterias.length > 0) {
          const novasMaterias = listaMaterias.map(materia => ({
            nome_turma: nomeTurma,
            disciplina: materia,
            ano: "2026"
          }));

          const { error } = await supabase
            .from('turma_disciplinas')
            .insert(novasMaterias);
          
          if (error) alert("Erro ao adicionar. Verifique se as matérias já existem.");
          else alert(`${listaMaterias.length} matérias adicionadas com sucesso!`);
        }
      }
    } else if (acao === "2") {
      const { data } = await supabase
        .from('turma_disciplinas')
        .select('*')
        .eq('nome_turma', nomeTurma)
        .eq('ano', '2026');

      if (data && data.length > 0) {
        const ordemManual = ['Português', 'Matemática', 'Ciências', 'História', 'Geografia', 'Artes', 'Inglês', 'Música', 'Xadrez', 'Ed.Física'];
        
        const dataOrdenada = data.sort((a, b) => {
          const indexA = ordemManual.indexOf(a.disciplina);
          const indexB = ordemManual.indexOf(b.disciplina);
          return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
        });

        const lista = dataOrdenada.map((m, i) => `${i + 1} - ${m.disciplina}`).join('\n');
        const escolha = prompt(`Matérias para ${nomeTurma}:\n\n${lista}\n\nDigite os NÚMEROS para EXCLUIR separados por vírgula (Ex: 1, 3, 5):`);
        
        if (escolha) {
          const indices = escolha.split(',').map(num => parseInt(num.trim()) - 1);
          const idsParaExcluir = indices
            .map(idx => dataOrdenada[idx]?.id)
            .filter(id => id !== undefined);

          if (idsParaExcluir.length > 0 && confirm(`Deseja remover ${idsParaExcluir.length} matéria(s) da grade da turma?`)) {
            const { error } = await supabase.from('turma_disciplinas').delete().in('id', idsParaExcluir);
            if (!error) alert("Matérias removidas com sucesso!");
            else alert("Erro ao excluir matérias.");
          }
        }
      } else {
        alert("Nenhuma matéria cadastrada para esta turma.");
      }
    }
  }

  async function salvarHorarioImagem() {
    if (!arquivoHorario && !previewHorario) return alert("Selecione uma imagem.");
    setSalvandoHorario(true);
    try {
      let publicUrl = previewHorario;
      if (arquivoHorario) {
        const fileExt = arquivoHorario.name.split('.').pop();
        const nomeTurmaLimpo = turmaParaHorario.nome
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-zA-Z0-9]/g, "_")
          .replace(/__+/g, "_")
          .toLowerCase();

        const fileName = `${nomeTurmaLimpo}_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('horarios').upload(fileName, arquivoHorario);
        if (uploadError) throw uploadError;
        publicUrl = supabase.storage.from('horarios').getPublicUrl(fileName).data.publicUrl;
      }
      await supabase.from('turmas_info').upsert({ nome_turma: turmaParaHorario.nome, horario_url: publicUrl }, { onConflict: 'nome_turma' });
      setModalHorarioAberto(false); carregarDados();
    } catch (err: any) { alert("Erro ao salvar: " + err.message); } finally { setSalvandoHorario(false); }
  }

  const handleDrag = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setArrastandoHorario(e.type === "dragenter" || e.type === "dragover"); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setArrastandoHorario(false); const file = e.dataTransfer.files?.[0]; if (file?.type.startsWith("image/")) { setArquivoHorario(file); setPreviewHorario(URL.createObjectURL(file)); } };

  if (carregando) return <div style={{ padding: '50px', textAlign: 'center' }}>Carregando dados pedagógicos...</div>;

  return (
    <div style={{ width: '100%', padding: '0px 30px 30px 30px', fontFamily: 'sans-serif', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
        <button onClick={() => { if (editandoCores) setEditandoCores(false); else { setEditandoCores(true); setCoresTemporarias(coresConfig); } }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', opacity: 0.4 }}>
          {editandoCores ? "✖" : "⚙️"}
        </button>
      </div>

      {editandoCores && (
        <div style={{ marginBottom: '25px', padding: '20px', backgroundColor: 'white', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h4 style={{ margin: 0, fontSize: '15px', color: '#111827', fontWeight: '800' }}>Personalizar Cores</h4>
            <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setEditandoCores(false)} style={{ padding: '8px 15px', backgroundColor: '#f3f4f6', color: '#4b5563', border: 'none', borderRadius: '10px', fontWeight: 'bold' }}>Descartar</button>
                <button onClick={confirmarNovasCores} disabled={salvandoCores} style={{ padding: '8px 20px', backgroundColor: '#059669', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold' }}>
                  {salvandoCores ? "Gravando..." : "Salvar Cores"}
                </button>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            {Object.keys(estiloFixoTurmas).map(nome => (
              <div key={nome} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', backgroundColor: '#f9fafb', borderRadius: '12px', border: '1px solid #f3f4f6' }}>
                <span style={{ fontSize: '12px', fontWeight: '700' }}>{nome}</span>
                <input type="color" value={coresTemporarias[nome] || "#ffffff"} onChange={(e) => setCoresTemporarias({...coresTemporarias, [nome]: e.target.value})} style={{ border: 'none', width: '28px', height: '28px', cursor: 'pointer', backgroundColor: 'transparent' }} />
              </div>
            ))}
          </div>
        </div>
      )}

      <TurmasHeader ehAdmin={true} />

      {/* GRADE COM LARGURA MÍNIMA AUMENTADA */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '25px' }}>
        {turmas.map((turma) => (
          <TurmaCard
            key={turma.nome}
            turma={turma}
            ehAdmin={true}
            onAbrirTurma={(t: any) => {
              const listaOrdenada = todosAlunos.filter(a => a.turma === t.nome).sort((a, b) => a.nome.localeCompare(b.nome));
              setTurmaSelecionada({ ...t, alunos: listaOrdenada });
              setModalTurmaAberto(true);
            }}
            onEditarProfessor={editarProfessor}
            onGerenciarMaterias={gerenciarMaterias}
            onAbrirUploadHorario={(e: any, t: any) => { e.stopPropagation(); setTurmaParaHorario(t); setArquivoHorario(null); setPreviewHorario(t.horario_url || null); setModalHorarioAberto(true); }}
            onAbrirAgenda={(e: any, t: any) => { e.stopPropagation(); setTurmaParaAgenda(t); setModoAgenda('consultar'); setModalAgendaAberto(true); }}
          />
        ))}
      </div>

      {modalHorarioAberto && (
        <ModalHorario turma={turmaParaHorario} previewHorario={previewHorario} arrastandoHorario={arrastandoHorario} salvandoHorario={salvandoHorario} onClose={() => setModalHorarioAberto(false)} onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop} onFileSelect={(e: any) => { const file = e.target.files?.[0]; if (file) { setArquivoHorario(file); setPreviewHorario(URL.createObjectURL(file)); } }} onSalvar={salvarHorarioImagem} />
      )}
      {modalTurmaAberto && (
        <ModalDetalhesTurma turma={turmaSelecionada} onClose={() => setModalTurmaAberto(false)} onAbrirFichaAluno={async (aluno: any) => { setAlunoSelecionado(aluno); setModalFichaAberto(true); }} />
      )}
      {modalFichaAberto && (
        <ModalFichaAlunoTurma aluno={alunoSelecionado} ehAdmin={true} onClose={() => setModalFichaAberto(false)} calcularIdade={(d: any) => d} />
      )}
      {modalAgendaAberto && (
        <ModalAgendaTurma turma={turmaParaAgenda} userEmail={userEmail} modo={modoAgenda} ehAdmin={true} onClose={() => setModalAgendaAberto(false)} />
      )}

      {/* NOVO MODAL: VINCULAR EQUIPE PEDAGÓGICA */}
      {modalVincularAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, backdropFilter: 'blur(4px)', padding: '15px' }}>
           <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '28px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
              <h2 style={{ textAlign: 'center', fontWeight: '900', marginTop: 0, color: '#0f172a', fontSize: '22px', marginBottom: '4px' }}>Equipe Pedagógica</h2>
              <p style={{ textAlign: 'center', color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>Turma: {turmaVincular}</p>
              
              <form onSubmit={salvarVinculos} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {(turmaVincular.includes("Maternal") || turmaVincular.includes("Jardim")) && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                          <label style={{ fontSize: '14px', fontWeight: '800', color: '#334155' }}>👩‍🏫 Auxiliar de Sala</label>
                          <select 
                              value={infoTurmaAtual.auxiliar || ""} 
                              onChange={(e) => setInfoTurmaAtual({...infoTurmaAtual, auxiliar: e.target.value})}
                              style={{ padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px' }}
                          >
                              <option value="">Sem auxiliar vinculada</option>
                              {listaProfessores.filter(p => p.cargo === 'Auxiliar').map(p => (
                                  <option key={p.nome} value={p.nome}>{p.nome}</option>
                              ))}
                          </select>
                      </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                      <label style={{ fontSize: '14px', fontWeight: '800', color: '#334155', marginBottom: '8px' }}>📚 Professores por Disciplina</label>
                      
                      {disciplinasTurma.length === 0 ? (
                          <div style={{ padding: '15px', backgroundColor: '#fee2e2', borderRadius: '10px', border: '1px solid #fca5a5' }}>
                            <p style={{ margin: 0, fontSize: '13px', color: '#b91c1c', fontWeight: 'bold' }}>Nenhuma matéria cadastrada para esta turma.</p>
                            <p style={{ margin: '5px 0 0 0', fontSize: '11px', color: '#991b1b' }}>Use o botão "Matérias da Turma" no card primeiro.</p>
                          </div>
                      ) : (
                          disciplinasTurma.map((disc, idx) => (
                              <div key={disc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#475569', flex: 1 }}>{disc.disciplina}</span>
                                  <select 
                                      value={disc.professor_vinculado || ""} 
                                      onChange={(e) => {
                                          const novas = [...disciplinasTurma];
                                          novas[idx].professor_vinculado = e.target.value;
                                          setDisciplinasTurma(novas);
                                      }}
                                      style={{ flex: 2, padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13px', backgroundColor: 'white' }}
                                  >
                                      <option value="">Professor não definido...</option>
                                      {listaProfessores.filter(p => p.cargo === 'Professor').map(p => (
                                          <option key={p.nome} value={p.nome}>{p.nome}</option>
                                      ))}
                                  </select>
                              </div>
                          ))
                      )}
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                      <button type="button" onClick={() => setModalVincularAberto(false)} style={{ flex: 1, padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', backgroundColor: 'white', fontWeight: 'bold', cursor: 'pointer', color: '#475569' }}>FECHAR</button>
                      <button type="submit" disabled={carregando} style={{ flex: 1, padding: '14px', borderRadius: '14px', backgroundColor: '#2563eb', color: 'white', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
                          {carregando ? "SALVANDO..." : "SALVAR VÍNCULOS"}
                      </button>
                  </div>
              </form>
           </div>
        </div>
      )}

    </div>
  );
}