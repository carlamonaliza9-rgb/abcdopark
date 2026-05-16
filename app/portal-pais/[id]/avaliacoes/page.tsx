"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import { BookOpen, GraduationCap } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function AvaliacoesPage() {
  const { id } = useParams();
  const [aluno, setAluno] = useState<any>(null);
  const [notas, setNotas] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function buscarDados() {
      if (!id) return;
      
      const { data: a } = await supabase.from("alunos").select("*").eq("id", id).single();
      if (a) setAluno(a);

      const { data: n } = await supabase
        .from("boletins")
        .select("*")
        .eq("aluno_id", id)
        .order("disciplina", { ascending: true });
        
      if (n) setNotas(n);

      setCarregando(false);
    }
    buscarDados();
  }, [id]);

  const gerarPDF = () => {
    if (!aluno) return;
    const doc = new jsPDF();

    // Cabeçalho estilizado
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59); // Slate 800
    doc.text("ESCOLA ABC DO PARK", 105, 20, { align: "center" });
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text("Boletim Escolar Oficial - Ano Letivo 2026", 105, 28, { align: "center" });

    // Informações do Aluno e Responsável
    doc.setDrawColor(226, 232, 240);
    doc.line(15, 35, 195, 35);
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text(`ALUNO(A): ${aluno.nome.toUpperCase()}`, 15, 42);
    doc.text(`RESPONSÁVEL: ${aluno.responsavel?.toUpperCase() || "NÃO INFORMADO"}`, 15, 47);
    doc.setFont("helvetica", "normal");
    doc.text(`TURMA: ${aluno.turma}`, 15, 52);
    doc.text(`DATA DE EMISSÃO: ${new Date().toLocaleDateString('pt-BR')}`, 195, 42, { align: "right" });

    // Tabela de Notas
    autoTable(doc, {
      startY: 58,
      head: [['DISCIPLINA', '1ºB', '2ºB', 'R1', '3ºB', '4ºB', 'R2', 'MÉD']],
      body: notas.map(n => [
        n.disciplina.toUpperCase(),
        n.bimestre1 || '-',
        n.bimestre2 || '-',
        n.recuperacao1 || '-',
        n.bimestre3 || '-',
        n.bimestre4 || '-',
        n.recuperacao2 || '-',
        n.media || '0.0'
      ]),
      headStyles: { fillColor: [79, 70, 229], fontSize: 9, halign: 'center' }, // Indigo 600
      bodyStyles: { fontSize: 8, halign: 'center' },
      columnStyles: { 
        0: { halign: 'left', fontStyle: 'bold', cellWidth: 50 } 
      },
      alternateRowStyles: { fillColor: [248, 250, 252] }
    });

    // Rodapé
    const finalY = (doc as any).lastAutoTable.finalY + 20;
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text("Documento gerado digitalmente via Portal do Responsável.", 105, finalY, { align: "center" });

    doc.save(`Boletim_${aluno.nome.replace(/\s+/g, '_')}.pdf`);
  };

  if (carregando) return <div className="p-10 text-center text-sm sm:text-base md:text-[10px] font-black uppercase text-slate-300 animate-pulse tracking-widest">Carregando avaliações...</div>;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10 w-full px-2">
      
      <header className="mb-10">
        <h1 className="text-2xl md:text-3xl font-black text-slate-800 uppercase tracking-tighter italic">Desempenho Escolar</h1>
        <p className="text-sm md:text-[9px] font-bold uppercase text-slate-400 tracking-widest mt-2 italic">Acompanhamento Pedagógico: <span className="text-indigo-600 font-black">{aluno?.nome}</span></p>
      </header>

      <div className="grid grid-cols-1 gap-8 items-start">
        
        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-50">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600"><BookOpen size={20} /></div>
              <h2 className="text-sm md:text-xs font-black text-slate-800 uppercase tracking-widest">Boletim Escolar</h2>
            </div>
            <span className="bg-slate-100 px-4 py-2 rounded-xl text-xs md:text-[9px] font-black text-slate-500 uppercase tracking-widest">Ano Letivo 2026</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-y-2">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-xs sm:text-sm md:text-[9px] font-black text-slate-400 uppercase tracking-widest">Disciplina</th>
                  <th className="px-4 py-2 text-xs sm:text-sm md:text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">1ºB</th>
                  <th className="px-4 py-2 text-xs sm:text-sm md:text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">2ºB</th>
                  <th className="px-2 py-2 text-xs sm:text-sm md:text-[9px] font-black text-red-400 uppercase tracking-widest text-center">R1</th>
                  <th className="px-4 py-2 text-xs sm:text-sm md:text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">3ºB</th>
                  <th className="px-4 py-2 text-xs sm:text-sm md:text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">4ºB</th>
                  <th className="px-2 py-2 text-xs sm:text-sm md:text-[9px] font-black text-red-400 uppercase tracking-widest text-center">R2</th>
                  <th className="px-4 py-2 text-xs sm:text-sm md:text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Média</th>
                </tr>
              </thead>
              <tbody>
                {notas.length > 0 ? (
                  notas.map((item) => (
                    <tr key={item.id} className="group">
                      <td className="bg-slate-50 group-hover:bg-indigo-50 px-5 py-4 rounded-l-2xl text-sm sm:text-base md:text-[10px] font-black text-slate-700 uppercase transition-colors">
                        {item.disciplina}
                      </td>
                      <td className="bg-slate-50 group-hover:bg-indigo-50 px-4 py-4 text-center text-sm sm:text-base md:text-xs font-bold text-slate-600">
                        {item.bimestre1 ?? "--"}
                      </td>
                      <td className="bg-slate-50 group-hover:bg-indigo-50 px-4 py-4 text-center text-sm sm:text-base md:text-xs font-bold text-slate-600">
                        {item.bimestre2 ?? "--"}
                      </td>
                      <td className="bg-red-50/30 group-hover:bg-red-50 px-2 py-4 text-center text-sm sm:text-base md:text-xs font-black text-red-500">
                        {item.recuperacao1 ?? "--"}
                      </td>
                      <td className="bg-slate-50 group-hover:bg-indigo-50 px-4 py-4 text-center text-sm sm:text-base md:text-xs font-bold text-slate-600">
                        {item.bimestre3 ?? "--"}
                      </td>
                      <td className="bg-slate-50 group-hover:bg-indigo-50 px-4 py-4 text-center text-sm sm:text-base md:text-xs font-bold text-slate-600">
                        {item.bimestre4 ?? "--"}
                      </td>
                      <td className="bg-red-50/30 group-hover:bg-red-50 px-2 py-4 text-center text-sm sm:text-base md:text-xs font-black text-red-500">
                        {item.recuperacao2 ?? "--"}
                      </td>
                      <td className="bg-indigo-100/50 px-5 py-4 rounded-r-2xl text-center text-sm sm:text-base md:text-xs font-black text-indigo-600">
                        {item.media ?? "0.0"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-xs sm:text-sm md:text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Nenhum registro de nota localizado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-10 flex flex-col md:flex-row gap-4 items-center justify-between p-6 bg-slate-900 rounded-[2rem] text-white">
            <div className="flex items-center gap-4">
              <div className="bg-white/10 p-3 rounded-2xl"><GraduationCap size={24} /></div>
              <div className="text-left">
                <p className="text-xs sm:text-sm md:text-[10px] font-black uppercase opacity-50 tracking-widest">Situação Acadêmica</p>
                <p className="text-base md:text-sm font-black uppercase italic tracking-tight">Em acompanhamento</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}