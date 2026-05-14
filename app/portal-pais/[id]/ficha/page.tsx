"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import { 
  User, ShieldCheck, Heart, Phone, FileText, MapPin, 
  Fingerprint, CreditCard, X, Upload, Clock, Eye, 
  AlertCircle, Stethoscope, Briefcase, Calendar, Info, Mail
} from "lucide-react";

export default function FichaAlunoPage() {
  const { id } = useParams();
  const [aluno, setAluno] = useState<any>(null);
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [enviando, setEnviando] = useState<string | null>(null);
  const [documentosEnviados, setDocumentosEnviados] = useState<any[]>([]);

  const listaDocumentos = [
    "Contrato de prestação de serviços educacionais",
    "Ficha individual do aluno",
    "RG e CPF do aluno",
    "RG e CPF dos pais ou responsáveis",
    "Certidão de nascimento",
    "Comprovante de residência",
    "Declaração de vacinação atualizada",
    "Foto 3x4"
  ];

  useEffect(() => {
    if (id) {
      buscarDados();
      buscarSolicitacoes();
    }
  }, [id]);

  async function buscarDados() {
    const { data } = await supabase.from("alunos").select("*").eq("id", id).single();
    if (data) setAluno(data);
    setCarregando(false);
  }

  async function buscarSolicitacoes() {
    const { data } = await supabase
      .from("solicitacoes_documentos")
      .select("tipo_documento, arquivo_url, status")
      .eq("aluno_id", id);
    if (data) setDocumentosEnviados(data);
  }

  const handleUpload = async (tipo: string, e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    setEnviando(tipo);
    const fileExt = file.name.split('.').pop();
    const fileName = `${id}-${Date.now()}.${fileExt}`;
    const filePath = `solicitacoes/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('escola_arquivos')
      .upload(filePath, file);

    if (uploadError) {
      alert("Erro ao subir arquivo.");
      setEnviando(null);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('escola_arquivos').getPublicUrl(filePath);
    
    await supabase.from("solicitacoes_documentos").insert({
      aluno_id: id,
      tipo_documento: tipo,
      arquivo_url: publicUrl,
      status: 'pendente'
    });

    await buscarSolicitacoes();
    setEnviando(null);
  };

  const formatarCEP = (cep: any) => {
    if (!cep) return "---";
    const limpo = String(cep).replace(/\D/g, "");
    return limpo.replace(/(\d{5})(\d{3})/, "$1-$2");
  };

  const formatarData = (data: string) => {
    if (!data) return "---";
    const [ano, mes, dia] = data.split("-");
    return `${dia}/${mes}/${ano}`;
  };

  const calcularIdade = (dataNasc: string) => {
    if (!dataNasc) return "";
    const hoje = new Date();
    const nascimento = new Date(dataNasc);
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const m = hoje.getMonth() - nascimento.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) {
      idade--;
    }
    return `${idade} anos`;
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
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10 w-full px-2 relative">
      
      {modalAberto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] p-8 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-black text-slate-800 uppercase italic">Central de Documentos</h2>
                <p className="text-[9px] font-bold text-rose-500 uppercase tracking-widest flex items-center gap-1">
                  <AlertCircle size={10} /> Arquivos em vermelho são obrigatórios
                </p>
              </div>
              <button onClick={() => setModalAberto(false)} className="p-3 bg-slate-100 rounded-2xl text-slate-400 hover:text-rose-500 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
              {listaDocumentos.map((doc, index) => {
                const docExistente = documentosEnviados.find(d => d.tipo_documento === doc);
                
                return (
                  <div key={index} className="flex items-center justify-between p-5 bg-slate-50 rounded-[1.8rem] border border-slate-100 hover:border-rose-200 transition-all group">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-rose-600 uppercase leading-tight">{doc}</span>
                      <span className={`text-[8px] font-bold uppercase mt-1 ${docExistente ? 'text-green-500' : 'text-slate-400'}`}>
                        {docExistente ? `Status: ${docExistente.status}` : 'Pendente de envio'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {docExistente && (
                        <a href={docExistente.arquivo_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-wider bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
                          <Eye size={12} /> Visualizar
                        </a>
                      )}

                      <label className="cursor-pointer">
                        <input type="file" className="hidden" onChange={(e) => handleUpload(doc, e)} disabled={enviando === doc} />
                        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-wider transition-all ${enviando === doc ? 'bg-slate-200 text-slate-400' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-100'}`}>
                          {enviando === doc ? <Clock size={12} className="animate-spin" /> : <Upload size={12} />}
                          {enviando === doc ? 'Enviando...' : (docExistente ? 'Substituir' : 'Upload')}
                        </div>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <header className="mb-10">
        <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter italic">Ficha Cadastral</h1>
        <div className="h-1 w-20 bg-indigo-600 mt-2 rounded-full"></div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-8 space-y-8">
          
          {/* IDENTIFICAÇÃO */}
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-50">
            <h2 className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-6 flex items-center gap-2"><Fingerprint size={14} /> Identificação do Aluno</h2>
            <div className="flex flex-col">
              <LinhaInfo icone={User} label="Nome Completo" value={aluno.nome} />
              <LinhaInfo icone={Calendar} label="Data de Nascimento" value={`${formatarData(aluno.data_nascimento)} • ${calcularIdade(aluno.data_nascimento)}`} />
              <LinhaInfo icone={Fingerprint} label="Matrícula" value={String(aluno.id).toUpperCase()} />
              <LinhaInfo icone={ShieldCheck} label="Turma / Turno" value={`${aluno.turma} • ${aluno.turno || 'Integral'}`} />
              <LinhaInfo icone={Info} label="Naturalidade" value={aluno.naturalidade} />
            </div>
          </div>

          {/* SAÚDE */}
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-50">
            <h2 className="text-[11px] font-black text-rose-600 uppercase tracking-[0.3em] mb-6 flex items-center gap-2"><Stethoscope size={14} /> Informações de Saúde</h2>
            <div className="flex flex-col">
              <LinhaInfo icone={Heart} label="Alergias Detectadas" value={aluno.alergias} />
              <LinhaInfo icone={AlertCircle} label="Restrições Alimentares" value={aluno.restricoes_alimentares} />
            </div>
          </div>

          {/* ENDEREÇO */}
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-50">
            <h2 className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-6 flex items-center gap-2"><MapPin size={14} /> Localização de Residência</h2>
            <div className="flex flex-col">
              <LinhaInfo icone={MapPin} label="Logradouro" value={aluno.endereco} />
              <LinhaInfo icone={MapPin} label="Número / Complemento" value={aluno.numero_endereco} />
              <LinhaInfo icone={MapPin} label="Bairro" value={aluno.bairro} />
              <LinhaInfo icone={MapPin} label="CEP" value={formatarCEP(aluno.cep)} />
            </div>
          </div>

          {/* RESPONSÁVEIS */}
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-50">
            <h2 className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-6 flex items-center gap-2"><Phone size={14} /> Responsáveis Legais</h2>
            <div className="flex flex-col">
              <LinhaInfo icone={User} label="Responsável" value={aluno.responsavel} />
              <LinhaInfo icone={CreditCard} label="CPF" value={aluno.cpf_responsavel} />
              <LinhaInfo icone={Briefcase} label="Profissão" value={aluno.responsavel_profissao} />
              <LinhaInfo icone={Phone} label="Telefone" value={aluno.telefone} />
              <LinhaInfo icone={Mail} label="E-mail" value={aluno.email_responsavel} />

              <LinhaInfo icone={User} label="Responsável 2" value={aluno.responsavel_2_nome} />
              <LinhaInfo icone={CreditCard} label="CPF" value={aluno.responsavel_2_cpf} />
              <LinhaInfo icone={Briefcase} label="Profissão" value={aluno.responsavel_2_profissao} />
              <LinhaInfo icone={Phone} label="Telefone" value={aluno.responsavel_2_telefone} />
             <LinhaInfo icone={Mail} label="E-mail" value={aluno.email_responsavel_2} />

            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-indigo-200 group transition-all hover:-translate-y-1">
            <div className="bg-white/20 w-12 h-12 rounded-2xl flex items-center justify-center mb-6"><FileText size={24} /></div>
            <h3 className="text-lg font-black uppercase tracking-tight leading-tight mb-2 italic">Documentação</h3>
            <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-widest leading-relaxed mb-8">Contratos, RG, CPF e declarações digitalizadas.</p>
            <button onClick={() => setModalAberto(true)} className="w-full bg-white text-indigo-600 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all">Abrir Documentação</button>
          </div>
          
          <div className="bg-slate-50 border border-slate-100 rounded-[2.5rem] p-8 text-center">
            <p className="text-[9px] text-slate-400 font-bold uppercase leading-relaxed italic">
              Para atualizações cadastrais ou informar mudanças de saúde, entre em contato com a coordenação via WhatsApp.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}