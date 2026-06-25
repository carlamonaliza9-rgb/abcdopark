"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import ReactCrop, { PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

// Ícones da Lucide-React (Adicionado o GraduationCap para os alunos!)
import { 
  Search, 
  Plus, 
  Settings, 
  Users, 
  UserCheck, 
  CalendarDays, 
  BookOpen,
  X,
  GraduationCap
} from "lucide-react";

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

    if (resFuncs.data) {
      const profsLimpos = resFuncs.data.map((p: any) => ({
        ...p,
        nome: (p.nome || "").trim()
      }));
      setListaProfessores(profsLimpos);
    }
    
    if (resAlunos.data) {
      setTodosAlunos(resAlunos.data);
      const contagem = resAlunos.data.reduce((acc: any, curr: any) => { acc[curr.turma] = (acc[curr.turma] || 0) + 1; return acc; }, {});
      
      const listaTurmasCompilada = Object.keys(estiloFixoTurmas).map(nome => {
        const infoExtra = resInfos.data?.find(i => i.nome_turma === nome);
        const corFundo = coresAtuais[nome] || "#ffffff";
        
        const discTurma = (resDisc.data || []).filter(d => d.nome_turma === nome && d.professor_vinculado);
        
        const contagemProfs = discTurma.reduce((acc: any, curr: any) => {
            const prof = (curr.professor_vinculado || "").trim();
            if (prof) acc[prof] = (acc[prof] || 0) + 1;
            return acc;
        }, {});
        
        let maxMaterias = 0;
        for (const p in contagemProfs) {
            if (contagemProfs[p] > maxMaterias) maxMaterias = contagemProfs[p];
        }

        let regentesLista: string[] = [];
        let especialistasMap = new Map<string, string[]>();

        discTurma.forEach(d => {
            const prof = (d.professor_vinculado || "").trim();
            if (!prof) return;

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
      alert("Cores atualizadas!");
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
          auxiliar: infoTurmaAtual.auxiliar ? infoTurmaAtual.auxiliar.trim() : null
      }, { onConflict: 'nome_turma' });

      for (const disc of disciplinasTurma) {
          await supabase.from('turma_disciplinas').update({
              professor_vinculado: disc.professor_vinculado ? disc.professor_vinculado.trim() : null
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

          const { error } = await supabase.from('turma_disciplinas').insert(novasMaterias);
          if (error) alert("Erro ao adicionar. Verifique se as matérias já existem.");
          else alert(`${listaMaterias.length} matérias adicionadas com sucesso!`);
        }
      }
    } else if (acao === "2") {
      const { data } = await supabase.from('turma_disciplinas').select('*').eq('nome_turma', nomeTurma).eq('ano', '2026');

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
          const idsParaExcluir = indices.map(idx => dataOrdenada[idx]?.id).filter(id => id !== undefined);

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
        const nomeTurmaLimpo = turmaParaHorario.nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "_").replace(/__+/g, "_").toLowerCase();
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

  if (carregando) return <div className="min-h-screen flex items-center justify-center text-blue-500 font-bold bg-[#fafafc]">Carregando dados pedagógicos...</div>;

  return (
    <div className="w-full min-h-screen bg-[#fafafc] p-4 md:p-8 font-sans animate-in fade-in duration-500">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Gestão de Turmas</h1>
          <p className="text-xs md:text-sm font-medium text-slate-500 mt-1">Gerenciamento de horários e professores (Acesso: Admin).</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative hidden md:block">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Buscar turma..." 
              className="pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all w-64 shadow-sm" 
            />
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl text-sm font-bold flex items-center gap-2 shadow-md transition-all active:scale-95">
            <Plus size={18} strokeWidth={2.5} /> Nova Turma
          </button>
          
          <button 
            onClick={() => { if (editandoCores) setEditandoCores(false); else { setEditandoCores(true); setCoresTemporarias(coresConfig); } }} 
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-sm border ${editandoCores ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
          >
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* ============================================== */}
      {/* BARRA DE STATUS (Ajustada: Fontes menores, ícone Alunos e Responsividade) */}
      {/* ============================================== */}
      <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] p-4 md:p-6 shadow-sm border border-slate-100 grid grid-cols-2 md:grid-cols-3 lg:flex lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-0 mb-8 lg:divide-x divide-slate-100">
        
        {/* 1 - Turmas */}
        <div className="flex items-center gap-3 lg:px-6 flex-1">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
             <Users size={20} strokeWidth={2.5} className="md:w-6 md:h-6" />
          </div>
          <div className="flex flex-col">
            <p className="text-xl md:text-2xl font-black text-slate-800 leading-none">{turmas.length}</p>
            <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1 whitespace-nowrap">Turmas Ativas</p>
          </div>
        </div>
        
        {/* 2 - Alunos (Agora com ícone de Capelo!) */}
        <div className="flex items-center gap-3 lg:px-6 flex-1">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0">
             <GraduationCap size={20} strokeWidth={2.5} className="md:w-6 md:h-6" />
          </div>
          <div className="flex flex-col">
            <p className="text-xl md:text-2xl font-black text-slate-800 leading-none">{todosAlunos.length}</p>
            <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1 whitespace-nowrap">Alunos Matriculados</p>
          </div>
        </div>
        
        {/* 3 - Professores */}
        <div className="flex items-center gap-3 lg:px-6 flex-1">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
             <UserCheck size={20} strokeWidth={2.5} className="md:w-6 md:h-6" />
          </div>
          <div className="flex flex-col">
            <p className="text-xl md:text-2xl font-black text-slate-800 leading-none">{listaProfessores.filter(p=>p.cargo==='Professor').length}</p>
            <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1 whitespace-nowrap">Professores</p>
          </div>
        </div>

        {/* 4 - Disciplinas */}
        <div className="flex items-center gap-3 lg:px-6 flex-1">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-purple-50 text-purple-500 flex items-center justify-center shrink-0">
             <CalendarDays size={20} strokeWidth={2.5} className="md:w-6 md:h-6" />
          </div>
          <div className="flex flex-col">
            <p className="text-xl md:text-2xl font-black text-slate-800 leading-none">15</p>
            <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1 whitespace-nowrap">Disciplinas</p>
          </div>
        </div>

        {/* 5 - Aulas */}
        <div className="flex items-center gap-3 lg:px-6 flex-1">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
             <BookOpen size={20} strokeWidth={2.5} className="md:w-6 md:h-6" />
          </div>
          <div className="flex flex-col">
            <p className="text-xl md:text-2xl font-black text-slate-800 leading-none">128</p>
            <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1 whitespace-nowrap">Aulas Semanais</p>
          </div>
        </div>
      </div>

      {/* EDITOR DE CORES */}
      {editandoCores && (
        <div className="mb-8 p-6 bg-white rounded-[2rem] border border-slate-200 shadow-xl animate-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-lg text-slate-800 font-black">Personalizar Cores das Turmas</h4>
            <div className="flex gap-3">
                <button onClick={() => setEditandoCores(false)} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-colors">Descartar</button>
                <button onClick={confirmarNovasCores} disabled={salvandoCores} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors shadow-md">
                  {salvandoCores ? "Gravando..." : "Salvar Cores"}
                </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {Object.keys(estiloFixoTurmas).map(nome => (
              <div key={nome} className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-sm font-bold text-slate-700">{nome}</span>
                <input type="color" value={coresTemporarias[nome] || "#ffffff"} onChange={(e) => setCoresTemporarias({...coresTemporarias, [nome]: e.target.value})} className="border-none w-8 h-8 cursor-pointer bg-transparent rounded overflow-hidden" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GRID DE CARTÕES */}
       <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 md:gap-8">
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

      {/* MODAL VINCULAR EQUIPE */}
      {modalVincularAberto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1100] flex items-center justify-center p-4 animate-in fade-in">
           <div className="bg-white p-8 rounded-[2rem] w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95">
              
              <div className="flex justify-between items-start mb-2">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Equipe Pedagógica</h2>
                <button onClick={() => setModalVincularAberto(false)} className="w-10 h-10 bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-500 rounded-xl flex items-center justify-center transition-colors"><X size={20}/></button>
              </div>
              <p className="text-sm font-bold text-blue-600 mb-6 bg-blue-50 py-1.5 px-3 rounded-lg inline-block">Turma: {turmaVincular}</p>
              
              <form onSubmit={salvarVinculos} className="flex flex-col gap-5">
                  
                  {(turmaVincular.includes("Maternal") || turmaVincular.includes("Jardim")) && (
                      <div className="flex flex-col gap-2 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                          <label className="text-xs font-black uppercase tracking-widest text-slate-500">👩‍🏫 Auxiliar de Sala</label>
                          <select 
                              value={infoTurmaAtual.auxiliar || ""} 
                              onChange={(e) => setInfoTurmaAtual({...infoTurmaAtual, auxiliar: e.target.value})}
                              className="p-3.5 rounded-xl border border-slate-200 outline-none text-sm font-bold text-slate-700 bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
                          >
                              <option value="">Sem auxiliar vinculada</option>
                              {listaProfessores.filter(p => p.cargo === 'Auxiliar').map(p => (
                                  <option key={p.nome} value={p.nome}>{p.nome}</option>
                              ))}
                          </select>
                      </div>
                  )}

                  <div className="flex flex-col gap-3 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                      <label className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">📚 Professores por Disciplina</label>
                      
                      {disciplinasTurma.length === 0 ? (
                          <div className="p-4 bg-rose-50 rounded-xl border border-rose-100">
                            <p className="m-0 text-sm font-black text-rose-600">Nenhuma matéria cadastrada.</p>
                            <p className="mt-1 text-xs font-medium text-rose-500">Use o botão de livro no cartão da turma para adicionar matérias primeiro.</p>
                          </div>
                      ) : (
                          disciplinasTurma.map((disc, idx) => (
                              <div key={disc.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2">
                                  <span className="text-sm font-bold text-slate-700 flex-1">{disc.disciplina}</span>
                                  <select 
                                      value={disc.professor_vinculado || ""} 
                                      onChange={(e) => {
                                          const novas = [...disciplinasTurma];
                                          novas[idx].professor_vinculado = e.target.value;
                                          setDisciplinasTurma(novas);
                                      }}
                                      className="flex-[2] p-3 rounded-xl border border-slate-200 outline-none text-sm font-semibold text-slate-600 bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
                                  >
                                      <option value="">Não definido...</option>
                                      {listaProfessores.filter(p => p.cargo === 'Professor').map(p => (
                                          <option key={p.nome} value={p.nome}>{p.nome}</option>
                                      ))}
                                  </select>
                              </div>
                          ))
                      )}
                  </div>

                  <div className="flex gap-3 mt-4">
                      <button type="button" onClick={() => setModalVincularAberto(false)} className="flex-1 py-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-black uppercase tracking-widest text-xs transition-colors">CANCELAR</button>
                      <button type="submit" disabled={carregando} className="flex-1 py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white border-none font-black uppercase tracking-widest text-xs transition-colors shadow-md shadow-blue-500/20 active:scale-95">
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