"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import { User, ShieldCheck, Heart, Phone, FileText, MapPin, Fingerprint, CreditCard } from "lucide-react";

export default function FichaAlunoPage() {
  const { id } = useParams();
  const [aluno, setAluno] = useState<any>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function buscarDados() {
      if (!id) return;
      const { data } = await supabase.from("alunos").select("*").eq("id", id).single();
      if (data) setAluno(data);
      setCarregando(false);
    }
    buscarDados();
  }, [id]);

  const formatarCEP = (cep: any) => {
    if (!cep) return "---";
    const limpo = String(cep).replace(/\D/g, "");
    return limpo.replace(/(\d{5})(\d{3})/, "$1-$2");
  };

  const LinhaInfo = ({ icone: Icon, label, value }: { icone: any; label: string; value: string }) => (
    <div className="flex items-center justify-between py-4 border-b border-slate-50 last:border-0 group transition-all hover:bg-slate-50/50 px-2 rounded-lg">
      <div className="flex items-center gap-4">
        <div className="text-slate-300 group-hover:text-indigo-500 transition-colors">
          <Icon size={16} strokeWidth={2.5} />
        </div>
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
      </div>
      <span className="text-xs font-bold text-slate-700 uppercase">{value || "---"}</span>
    </div>
  );

  if (carregando) return <div className="p-10 text-center text-[10px] font-black uppercase text-slate-300 animate-pulse tracking-widest">Sincronizando prontuário...</div>;
  if (!aluno) return <div className="p-10 text-center text-[10px] font-black uppercase text-rose-400 font-bold">Registro não localizado.</div>;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10 w-full px-2">
      
      <header className="mb-10">
        <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter italic">Ficha Cadastral</h1>
        <div className="h-1 w-20 bg-indigo-600 mt-2 rounded-full"></div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        
        <div className="lg:col-span-8 space-y-8">
          {/* IDENTIFICAÇÃO DO ALUNO */}
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-50">
            <h2 className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
              <Fingerprint size={14} /> Identificação do Aluno
            </h2>
            <div className="flex flex-col">
              <LinhaInfo icone={User} label="Nome do Aluno" value={aluno.nome} />
              <LinhaInfo icone={Fingerprint} label="Matrícula" value={String(aluno.id).toUpperCase().slice(0, 10)} />
              <LinhaInfo icone={ShieldCheck} label="Turma / Turno" value={`${aluno.turma} • ${aluno.turno || 'Integral'}`} />
              <LinhaInfo icone={Heart} label="Saúde / Alergias" value={aluno.alergias} />
            </div>
          </div>

          {/* RESPONSÁVEIS E LOCALIZAÇÃO */}
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-50">
            <h2 className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
              <Phone size={14} /> Responsáveis e Contato
            </h2>
            <div className="flex flex-col">
              <LinhaInfo icone={User} label="Responsável 01" value={aluno.responsavel} />
              <LinhaInfo icone={CreditCard} label="CPF R1" value={aluno.cpf_responsavel} />
              <LinhaInfo icone={Phone} label="Contato R1" value={aluno.telefone} />
              
              <div className="my-6 border-t border-slate-50 relative">
                <span className="absolute left-1/2 -top-2 -translate-x-1/2 bg-white px-4 text-[7px] font-black text-slate-300 uppercase tracking-[0.4em]">Apoio Familiar</span>
              </div>

              <LinhaInfo icone={User} label="Responsável 02" value={aluno.responsavel_2_nome} />
              <LinhaInfo icone={CreditCard} label="CPF R2" value={aluno.responsavel_2_cpf} />
              <LinhaInfo icone={Phone} label="Contato R2" value={aluno.responsavel_2_telefone} />
              
              <div className="my-6 border-t border-slate-50"></div>
              
              <LinhaInfo icone={MapPin} label="Endereço Cadastrado" value={aluno.endereco} />
              <LinhaInfo icone={MapPin} label="CEP" value={formatarCEP(aluno.cep)} />
            </div>
          </div>
        </div>

        {/* COLUNA LATERAL */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-indigo-200 group transition-all hover:-translate-y-1">
            <div className="bg-white/20 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
              <FileText size={24} />
            </div>
            <h3 className="text-lg font-black uppercase tracking-tight leading-tight mb-2 italic">Documentação</h3>
            <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-widest leading-relaxed mb-8">Contratos, RG, CPF e declarações digitalizadas.</p>
            
            <button className="w-full bg-white text-indigo-600 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all">
              Abrir Documentação
            </button>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-[2.5rem] p-8 text-center">
            <p className="text-[9px] text-slate-400 font-bold uppercase leading-relaxed italic">
              Para atualizações cadastrais entre em contato com a coordenação.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}