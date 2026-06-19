"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Clock, FileText, User, Calendar, Loader2, RefreshCw } from "lucide-react";

// Importe suas funções de geração aqui para poder regerar
import { gerarPDFMatricula } from "@/app/(sistema)/dashboard/documentacoes/_lib/geradorMatricula";

interface LogDocumento {
  id: string;
  tipo_documento: string;
  titulo_documento: string;
  aluno_nome: string | null;
  data_emissao: string;
  aluno_id: string;
}

export default function PainelHistorico() {
  const [historico, setHistorico] = useState<LogDocumento[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregarHistorico() {
      const { data } = await supabase
        .from("historico_documentos")
        .select("*")
        .order("data_emissao", { ascending: false });
      if (data) setHistorico(data);
      setCarregando(false);
    }
    carregarHistorico();
  }, []);

  // Função para abrir o documento novamente
  const abrirDocumento = async (log: LogDocumento) => {
    // Aqui você busca os dados do aluno novamente para garantir que os dados estejam atualizados
    const { data: aluno } = await supabase.from("alunos").select("*").eq("id", log.aluno_id).single();
    
    if (aluno) {
      if (log.tipo_documento === 'matricula') {
        // Você pode precisar passar dados do responsável ou sexo se salvou isso antes
        // Por ora, chamamos a função de geração original
        alert("Regenerando documento de: " + aluno.nome);
        gerarPDFMatricula(aluno, { nome: aluno.responsavel }, "M"); 
      }
      // Repita a lógica para 'quitacao', 'ressalva', etc.
    }
  };

  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-xl font-extrabold text-slate-800">Histórico de Emissões</h2>
      </div>

      <div className="w-full bg-white border border-slate-100 rounded-[1.5rem] shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50/70 border-b border-slate-100 uppercase text-[11px] font-black text-slate-400">
            <tr>
              <th className="py-4 px-6">Documento</th>
              <th className="py-4 px-6">Aluno</th>
              <th className="py-4 px-6">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {historico.map((log) => (
              <tr key={log.id} className="hover:bg-blue-50/30 transition-colors cursor-pointer group" onClick={() => abrirDocumento(log)}>
                <td className="py-4 px-6 font-bold text-slate-800 flex items-center gap-3">
                  <FileText size={16} className="text-blue-500" />
                  {log.titulo_documento}
                </td>
                <td className="py-4 px-6">{log.aluno_nome}</td>
                <td className="py-4 px-6">
                  <button className="text-[11px] font-bold text-blue-600 flex items-center gap-1 group-hover:underline">
                    <RefreshCw size={12} /> REIMPRIMIR
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}