"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { X, FileText, Lock, CalendarDays, UserRound, Loader2 } from "lucide-react";

type Trimestre = "1º Trimestre" | "2º Trimestre" | "3º Trimestre" | "4º Trimestre";

interface ModalAvancosDificuldadesProps {
  turma: any;
  onClose: () => void;
}

interface Aluno {
  id: number;
  nome: string;
  foto_url?: string | null;
}

interface Parecer {
  id: string | number;
  aluno_id: number;
  trimestre: Trimestre;
  ano: string;
  avancos: string | null;
  dificuldades: string | null;
  professor_nome: string | null;
  data_registro: string | null;
}

const TRIMESTRES: Trimestre[] = [
  "1º Trimestre",
  "2º Trimestre",
  "3º Trimestre",
  "4º Trimestre"
];

export function ModalAvancosDificuldades({
  turma,
  onClose
}: ModalAvancosDificuldadesProps) {
  const [trimestreSelecionado, setTrimestreSelecionado] =
    useState<Trimestre>("1º Trimestre");
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [pareceres, setPareceres] = useState<Parecer[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregar() {
      setCarregando(true);

      try {
        const { data: alunosData, error: alunosError } = await supabase
          .from("alunos")
          .select("id, nome, foto_url")
          .eq("turma", turma.nome)
          .neq("status", "transferido")
          .order("nome", { ascending: true });

        if (alunosError) throw alunosError;

        const alunosLista = alunosData || [];
        setAlunos(alunosLista);

        if (alunosLista.length === 0) {
          setPareceres([]);
          return;
        }

        const ids = alunosLista.map((aluno) => aluno.id);

        const { data: pareceresData, error: pareceresError } = await supabase
          .from("avancos_dificuldades")
          .select(
            "id, aluno_id, trimestre, ano, avancos, dificuldades, professor_nome, data_registro"
          )
          .in("aluno_id", ids)
          .eq("ano", "2026")
          .order("data_registro", { ascending: true });

        if (pareceresError) throw pareceresError;

        setPareceres((pareceresData || []) as Parecer[]);
      } catch (error) {
        console.error("Erro ao carregar avanços e dificuldades:", error);
        alert("Não foi possível carregar os pareceres desta turma.");
      } finally {
        setCarregando(false);
      }
    }

    carregar();
  }, [turma.nome]);

  const pareceresDoTrimestre = useMemo(() => {
    const mapa = new Map<number, Parecer>();

    pareceres
      .filter(
        (parecer) => parecer.trimestre === trimestreSelecionado
      )
      .forEach((parecer) => {
        mapa.set(parecer.aluno_id, parecer);
      });

    return mapa;
  }, [pareceres, trimestreSelecionado]);

  const formatarData = (data: string | null) => {
    if (!data) return "Data não registrada";

    const dataObj = new Date(data);
    if (Number.isNaN(dataObj.getTime())) return "Data inválida";

    return dataObj.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div
      className="fixed inset-0 z-[1200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 md:p-6"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-6xl max-h-[92vh] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <header className="p-5 md:p-7 border-b border-slate-100 bg-white flex items-start justify-between gap-4 shrink-0">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <FileText size={22} strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">
                  Avanços e Dificuldades
                </h2>
                <p className="text-xs font-bold text-indigo-600 mt-0.5">
                  Turma: {turma.nome}
                </p>
              </div>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-3">
              Visualização administrativa • Ano letivo 2026
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 flex items-center justify-center transition-colors shrink-0"
            aria-label="Fechar"
          >
            <X size={19} strokeWidth={2.5} />
          </button>
        </header>

        {/* Seletor de trimestre */}
        <div className="px-5 md:px-7 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex flex-wrap gap-2">
            {TRIMESTRES.map((trimestre) => {
              const ativo = trimestre === trimestreSelecionado;

              return (
                <button
                  key={trimestre}
                  type="button"
                  onClick={() => setTrimestreSelecionado(trimestre)}
                  className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                    ativo
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20"
                      : "bg-white text-slate-500 border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200"
                  }`}
                >
                  {trimestre}
                </button>
              );
            })}
          </div>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-5 md:p-7 custom-scrollbar">
          {carregando ? (
            <div className="min-h-[300px] flex items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-slate-400">
                <Loader2 size={28} className="animate-spin text-indigo-500" />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  Carregando pareceres...
                </span>
              </div>
            </div>
          ) : alunos.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                Nenhum aluno matriculado nesta turma.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {alunos.map((aluno) => {
                const parecer = pareceresDoTrimestre.get(aluno.id);

                return (
                  <article
                    key={aluno.id}
                    className={`rounded-2xl border p-4 md:p-5 ${
                      parecer
                        ? "border-slate-200 bg-white"
                        : "border-slate-100 bg-slate-50/70"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center">
                          {aluno.foto_url ? (
                            <img
                              src={aluno.foto_url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <UserRound size={18} className="text-slate-300" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-black text-slate-800 text-sm md:text-base truncate">
                            {aluno.nome}
                          </h3>

                          {parecer ? (
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md">
                                <Lock size={9} strokeWidth={3} />
                                Registrado
                              </span>
                              <span className="text-[9px] font-bold text-slate-400">
                                {formatarData(parecer.data_registro)}
                              </span>
                            </div>
                          ) : (
                            <span className="inline-flex mt-1 text-[9px] font-black uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
                              Ainda não registrado
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {parecer ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="rounded-xl bg-emerald-50/70 border border-emerald-100 p-4">
                          <p className="text-[9px] font-black uppercase tracking-widest text-emerald-700 mb-2">
                            Avanços observados
                          </p>
                          <p className="text-xs leading-relaxed text-slate-600 whitespace-pre-wrap">
                            {parecer.avancos?.trim() || "Não informado."}
                          </p>
                        </div>

                        <div className="rounded-xl bg-rose-50/70 border border-rose-100 p-4">
                          <p className="text-[9px] font-black uppercase tracking-widest text-rose-600 mb-2">
                            Dificuldades observadas
                          </p>
                          <p className="text-xs leading-relaxed text-slate-600 whitespace-pre-wrap">
                            {parecer.dificuldades?.trim() || "Não informado."}
                          </p>
                        </div>

                        <div className="md:col-span-2 flex flex-wrap items-center gap-x-5 gap-y-2 pt-1">
                          <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                            <UserRound size={11} />
                            Professor: {parecer.professor_nome || "Não informado"}
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                            <CalendarDays size={11} />
                            {formatarData(parecer.data_registro)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center">
                        <p className="text-[10px] font-bold text-slate-400">
                          O professor ainda não registrou o parecer deste trimestre.
                        </p>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <footer className="px-5 md:px-7 py-4 border-t border-slate-100 bg-slate-50 shrink-0 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-3 rounded-xl bg-slate-800 text-white font-black uppercase tracking-widest text-[10px] hover:bg-slate-900 transition-colors"
          >
            Fechar
          </button>
        </footer>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}