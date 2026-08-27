"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  BookOpen,
  Plus,
  Save,
  Trash2,
  RefreshCcw,
  UserRound,
  Eye,
  X,
  Printer,
} from "lucide-react";

import HistoricoEscolar from "./HistoricoEscolar";

const COMPONENTES_COMUNS = [
  "Língua Portuguesa",
  "Arte",
  "História",
  "Geografia",
  "Matemática",
  "Ciências",
  "Língua Estrangeira Moderna - Inglês",
  "Educação Física",
] as const;

const normalizar = (valor: any) =>
  String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

function nomeDisciplinaOficial(nome: any) {
  const n = normalizar(nome);

  if (
    n === "portugues" ||
    n === "lingua portuguesa" ||
    n === "l portuguesa" ||
    n === "l. portuguesa"
  ) {
    return "Língua Portuguesa";
  }

  if (n === "arte" || n === "artes") return "Arte";
  if (n === "historia") return "História";
  if (n === "geografia") return "Geografia";
  if (n === "matematica") return "Matemática";
  if (n === "ciencias") return "Ciências";

  if (
    n === "ingles" ||
    n === "lingua estrangeira moderna ingles" ||
    n === "língua estrangeira moderna - inglês"
  ) {
    return "Língua Estrangeira Moderna - Inglês";
  }

  if (
    n === "educacao fisica" ||
    n === "ed fisica" ||
    n === "ed. fisica"
  ) {
    return "Educação Física";
  }

  if (n === "xadrez" || n === "xadres") return "Xadrez";
  if (n === "musica") return "Música";
  if (n === "informatica") return "Informática";

  return String(nome ?? "").trim();
}

function ehComponenteComum(nome: any) {
  const normalizado = nomeDisciplinaOficial(nome);
  return COMPONENTES_COMUNS.some(
    (item) => nomeDisciplinaOficial(item) === normalizado
  );
}

function ordenarComponentes(lista: DisciplinaHistorico[]) {
  return [...lista].sort((a, b) => {
    const ia = COMPONENTES_COMUNS.findIndex(
      (item) => nomeDisciplinaOficial(item) === nomeDisciplinaOficial(a.componente_curricular)
    );
    const ib = COMPONENTES_COMUNS.findIndex(
      (item) => nomeDisciplinaOficial(item) === nomeDisciplinaOficial(b.componente_curricular)
    );

    const ordemA = ia === -1 ? 1000 : ia;
    const ordemB = ib === -1 ? 1000 : ib;

    if (ordemA !== ordemB) return ordemA - ordemB;

    return String(a.componente_curricular || "").localeCompare(
      String(b.componente_curricular || ""),
      "pt-BR"
    );
  });
}

function numeroOuNull(valor: any): number | null {
  if (valor === null || valor === undefined || valor === "") return null;

  const numero = Number(String(valor).replace(",", "."));
  return Number.isFinite(numero) ? numero : null;
}

function calcularNotaFinal(boletim: any): number | null {
  const bimestres = [
    boletim?.bimestre1,
    boletim?.bimestre2,
    boletim?.bimestre3,
    boletim?.bimestre4,
  ]
    .map(numeroOuNull)
    .filter((v): v is number => v !== null);

  const recuperacoes = [
    boletim?.recuperacao1,
    boletim?.recuperacao2,
  ]
    .map(numeroOuNull)
    .filter((v): v is number => v !== null);

  const mediaInformada = numeroOuNull(boletim?.media);

  // O banco usa 0 como valor padrão em recuperações e média.
  // Consideramos que existe nota real somente quando houver pelo menos
  // um valor positivo em bimestres/recuperações ou uma média positiva.
  const existeNotaReal =
    bimestres.some((n) => n > 0) ||
    recuperacoes.some((n) => n > 0) ||
    (mediaInformada !== null && mediaInformada > 0);

  if (!existeNotaReal) {
    return null;
  }

  if (mediaInformada !== null && mediaInformada > 0) {
    return mediaInformada;
  }

  const mediaBimestres =
    bimestres.length > 0
      ? bimestres.reduce((total, nota) => total + nota, 0) / bimestres.length
      : null;

  const candidatos = [
    ...(mediaBimestres !== null ? [mediaBimestres] : []),
    ...recuperacoes,
  ];

  return candidatos.length ? Math.max(...candidatos) : null;
}

function detectarSerieAtual(turma: string | null | undefined) {
  const texto = normalizar(turma);

  if (texto.includes("maternal")) return "Maternal";
  if (texto.includes("jardim i") || texto.includes("jardim 1")) {
    return "Jardim I";
  }
  if (texto.includes("jardim ii") || texto.includes("jardim 2")) {
    return "Jardim II";
  }

  const numero = texto.match(/\b([1-6])\b/);
  if (numero) return `${numero[1]}º Ano`;

  return turma || "";
}

type AnoHistorico = {
  id: number;
  aluno_id: number;
  ano_letivo: string;
  serie_ano: string | null;
  estabelecimento: string | null;
  municipio: string | null;
  uf: string | null;
  resultado_final: string | null;
  total_aulas_anual: number | null;
  carga_horaria_anual: number | null;
  observacao: string | null;
  origem: "manual" | "sistema";
  ordem: number | null;
};

type DisciplinaHistorico = {
  id: number;
  historico_ano_id: number;
  componente_curricular: string;
  grupo: "BASE NACIONAL COMUM" | "PARTE DIVERSIFICADA";
  nota_final: number | null;
  carga_horaria: number | null;
  observacao: string | null;
};

export default function PainelHistoricoEscolar() {
  const [alunos, setAlunos] = useState<any[]>([]);
  const [alunoId, setAlunoId] = useState("");
  const [aluno, setAluno] = useState<any | null>(null);

  const [anos, setAnos] = useState<AnoHistorico[]>([]);
  const [disciplinasPorAno, setDisciplinasPorAno] = useState<
    Record<string, DisciplinaHistorico[]>
  >({});

  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [mostrarPreview, setMostrarPreview] = useState(false);
  const previewScrollRef = useRef<HTMLDivElement | null>(null);

  const [novoAno, setNovoAno] = useState({
    ano_letivo: "",
    serie_ano: "",
    estabelecimento: "",
    municipio: "BELÉM",
    uf: "PA",
    resultado_final: "",
    total_aulas_anual: "200",
    carga_horaria_anual: "800",
    observacao: "",
  });

  useEffect(() => {
    async function carregarAlunos() {
      const { data, error } = await supabase
        .from("alunos")
        .select(
          "id,nome,data_nascimento,responsavel,responsavel_2_nome,cidade,estado,sexo,turma,status"
        )
        .order("nome", { ascending: true });

      if (error) {
        console.error(error);
        alert("Não foi possível carregar os alunos.");
        return;
      }

      setAlunos(data || []);
    }

    carregarAlunos();
  }, []);

  const anosOrdenados = useMemo(
    () =>
      [...anos].sort(
        (a, b) => Number(a.ano_letivo) - Number(b.ano_letivo)
      ),
    [anos]
  );

  async function carregarHistorico(id: string) {
    if (!id) {
      setAlunoId("");
      setAluno(null);
      setAnos([]);
      setDisciplinasPorAno({});
      return;
    }

    setAlunoId(id);
    setCarregando(true);

    try {
      const alunoAtual =
        alunos.find((item) => String(item.id) === String(id)) || null;

      setAluno(alunoAtual);

      const { data: anosExistentes, error: anosError } = await supabase
        .from("historico_escolar_anos")
        .select("*")
        .eq("aluno_id", Number(id))
        .order("ano_letivo", { ascending: true });

      if (anosError) throw anosError;

      let anosFinais = (anosExistentes || []) as AnoHistorico[];

      const { data: boletins, error: boletinsError } = await supabase
        .from("boletins")
        .select(
          "id,aluno_id,disciplina,bimestre1,bimestre2,bimestre3,bimestre4,recuperacao1,recuperacao2,media,ano"
        )
        .eq("aluno_id", Number(id));

      if (boletinsError) throw boletinsError;

      const anosNosBoletins = Array.from(
        new Set(
          (boletins || [])
            .map((item) => String(item.ano || "").trim())
            .filter(Boolean)
        )
      );

      // Criamos somente os anos encontrados no boletim.
      // A série pode ser preenchida manualmente se não estiver disponível.
      for (const anoLetivo of anosNosBoletins) {
        const jaExiste = anosFinais.some(
          (item) => String(item.ano_letivo) === String(anoLetivo)
        );

        if (jaExiste) continue;

        const { data: novoAno, error: inserirErro } = await supabase
          .from("historico_escolar_anos")
          .insert({
            aluno_id: Number(id),
            ano_letivo: anoLetivo,
            serie_ano:
              String(anoLetivo) === String(new Date().getFullYear())
                ? detectarSerieAtual(alunoAtual?.turma)
                : null,
            estabelecimento: "ESCOLA ABC DO PARK",
            municipio: alunoAtual?.cidade || "BELÉM",
            uf: alunoAtual?.estado || "PA",
            origem: "sistema",
            total_aulas_anual: 200,
            carga_horaria_anual: 800,
            ordem: Number(anoLetivo),
          })
          .select("*")
          .single();

        if (inserirErro) {
          console.error(
            `Erro ao criar o ano ${anoLetivo}:`,
            inserirErro
          );
          continue;
        }

        if (novoAno) {
          anosFinais.push(novoAno as AnoHistorico);
        }
      }

      anosFinais.sort(
        (a, b) => Number(a.ano_letivo) - Number(b.ano_letivo)
      );

      setAnos(anosFinais);

      const idsAnos = anosFinais.map((item) => item.id);

      let disciplinasBD: DisciplinaHistorico[] = [];

      if (idsAnos.length) {
        const { data, error } = await supabase
          .from("historico_escolar_disciplinas")
          .select(
            "id,historico_ano_id,componente_curricular,grupo,nota_final,carga_horaria,observacao"
          )
          .in("historico_ano_id", idsAnos);

        if (error) throw error;

        disciplinasBD = (data || []) as DisciplinaHistorico[];
      }

      const mapa: Record<string, DisciplinaHistorico[]> = {};

      for (const ano of anosFinais) {
        const existentes = disciplinasBD.filter(
          (item) => item.historico_ano_id === ano.id
        );

        const porNome = new Map<string, DisciplinaHistorico>();

        for (const item of existentes) {
          porNome.set(
            nomeDisciplinaOficial(item.componente_curricular),
            item
          );
        }

        // Os 8 componentes da Base Nacional Comum são padrão do Histórico.
        // Garantimos que existam no histórico de cada ano, mesmo sem nota.
        for (const componente of COMPONENTES_COMUNS) {
          const chave = nomeDisciplinaOficial(componente);
          if (porNome.has(chave)) continue;

          const { data: novoComum, error: erroComum } = await supabase
            .from("historico_escolar_disciplinas")
            .insert({
              historico_ano_id: ano.id,
              componente_curricular: componente,
              grupo: "BASE NACIONAL COMUM",
              nota_final: null,
              carga_horaria: null,
              observacao: null,
            })
            .select("*")
            .single();

          if (erroComum) {
            console.error(
              `Erro ao criar componente padrão ${componente}:`,
              erroComum
            );
            continue;
          }

          if (novoComum) {
            porNome.set(
              chave,
              novoComum as DisciplinaHistorico
            );
          }
        }

        const boletinsDoAno = (boletins || []).filter(
          (item) =>
            String(item.ano) === String(ano.ano_letivo)
        );

        // Importa automaticamente apenas as notas dos componentes comuns.
        // A Parte Diversificada será acrescentada manualmente pela secretaria.
        for (const boletim of boletinsDoAno) {
          const nome = nomeDisciplinaOficial(boletim.disciplina);
          if (!nome || !ehComponenteComum(nome)) continue;

          const registroExistente = porNome.get(nome);
          const notaFinal = calcularNotaFinal(boletim);

          // Não sobrescreve uma nota já registrada manualmente.
          // Apenas preenche quando o registro padrão ainda está sem nota.
          if (registroExistente) {
            if (registroExistente.nota_final === null && notaFinal !== null) {
              const { data: atualizado, error: erroAtualizacao } = await supabase
                .from("historico_escolar_disciplinas")
                .update({ nota_final: notaFinal })
                .eq("id", registroExistente.id)
                .select("*")
                .single();

              if (!erroAtualizacao && atualizado) {
                porNome.set(
                  nome,
                  atualizado as DisciplinaHistorico
                );
              }
            }
            continue;
          }
        }

        mapa[String(ano.id)] = ordenarComponentes(
          Array.from(porNome.values())
        );
      }

      setDisciplinasPorAno(mapa);
    } catch (error: any) {
      console.error(error);
      alert(
        "Erro ao carregar o Histórico Escolar:\n\n" +
          (error?.message || "Erro desconhecido.")
      );
    } finally {
      setCarregando(false);
    }
  }

  function atualizarAno(
    id: number,
    campo: keyof AnoHistorico,
    valor: any
  ) {
    setAnos((anterior) =>
      anterior.map((item) =>
        item.id === id
          ? {
              ...item,
              [campo]: valor,
            }
          : item
      )
    );
  }

  function atualizarDisciplina(
    anoId: number,
    id: number,
    campo: keyof DisciplinaHistorico,
    valor: any
  ) {
    setDisciplinasPorAno((anterior) => ({
      ...anterior,
      [String(anoId)]:
        anterior[String(anoId)]?.map((item) =>
          item.id === id
            ? {
                ...item,
                [campo]: valor,
              }
            : item
        ) || [],
    }));
  }

  async function salvarHistorico() {
    if (!aluno) {
      alert("Selecione um aluno.");
      return;
    }

    setSalvando(true);

    try {
      for (const ano of anos) {
        const { error: anoError } = await supabase
          .from("historico_escolar_anos")
          .update({
            serie_ano: ano.serie_ano || null,
            estabelecimento: ano.estabelecimento || null,
            municipio: ano.municipio || null,
            uf: ano.uf || null,
            resultado_final: ano.resultado_final || null,
            total_aulas_anual:
              ano.total_aulas_anual === null ||
              ano.total_aulas_anual === undefined
                ? null
                : Number(ano.total_aulas_anual),
            carga_horaria_anual:
              ano.carga_horaria_anual === null ||
              ano.carga_horaria_anual === undefined
                ? null
                : Number(ano.carga_horaria_anual),
            observacao: ano.observacao || null,
            ordem: Number(ano.ano_letivo),
          })
          .eq("id", ano.id);

        if (anoError) throw anoError;

        const disciplinas =
          disciplinasPorAno[String(ano.id)] || [];

        for (const disciplina of disciplinas) {
          const nota =
            disciplina.nota_final === null ||
            disciplina.nota_final === undefined
              ? null
              : numeroOuNull(disciplina.nota_final);

          const carga =
            disciplina.carga_horaria === null ||
            disciplina.carga_horaria === undefined
              ? null
              : numeroOuNull(disciplina.carga_horaria);

          const { error: disciplinaError } = await supabase
            .from("historico_escolar_disciplinas")
            .update({
              componente_curricular:
                disciplina.componente_curricular,
              grupo:
                disciplina.grupo ||
                "BASE NACIONAL COMUM",
              nota_final: nota,
              carga_horaria: carga,
              observacao:
                disciplina.observacao || null,
            })
            .eq("id", disciplina.id);

          if (disciplinaError) throw disciplinaError;
        }
      }

      alert("Histórico Escolar salvo com sucesso.");
    } catch (error: any) {
      console.error(error);
      alert(
        "Erro ao salvar o Histórico Escolar:\n\n" +
          (error?.message || "Erro desconhecido.")
      );
    } finally {
      setSalvando(false);
    }
  }

  async function adicionarAnoManual() {
    if (!aluno) {
      alert("Selecione um aluno primeiro.");
      return;
    }

    if (!novoAno.ano_letivo.trim()) {
      alert("Informe o ano letivo.");
      return;
    }

    if (
      anos.some(
        (item) =>
          String(item.ano_letivo) ===
          String(novoAno.ano_letivo)
      )
    ) {
      alert("Esse ano já existe no histórico.");
      return;
    }

    const { data, error } = await supabase
      .from("historico_escolar_anos")
      .insert({
        aluno_id: Number(aluno.id),
        ano_letivo: novoAno.ano_letivo,
        serie_ano: novoAno.serie_ano || null,
        estabelecimento: novoAno.estabelecimento || null,
        municipio: novoAno.municipio || "BELÉM",
        uf: novoAno.uf || "PA",
        resultado_final: novoAno.resultado_final || null,
        total_aulas_anual:
          novoAno.total_aulas_anual === ""
            ? null
            : Number(novoAno.total_aulas_anual),
        carga_horaria_anual:
          novoAno.carga_horaria_anual === ""
            ? null
            : Number(novoAno.carga_horaria_anual),
        observacao: novoAno.observacao || null,
        origem: "manual",
        ordem: Number(novoAno.ano_letivo),
      })
      .select("*")
      .single();

    if (error) {
      alert(
        "Erro ao adicionar ano:\n\n" +
          error.message
      );
      return;
    }

    if (!data) return;

    setAnos((anterior) =>
      [...anterior, data as AnoHistorico].sort(
        (a, b) =>
          Number(a.ano_letivo) -
          Number(b.ano_letivo)
      )
    );

    // Todo novo ano já nasce com os 8 componentes da Base Nacional Comum.
    const { data: componentesComunsCriados, error: componentesError } = await supabase
      .from("historico_escolar_disciplinas")
      .insert(
        COMPONENTES_COMUNS.map((componente) => ({
          historico_ano_id: Number(data.id),
          componente_curricular: componente,
          grupo: "BASE NACIONAL COMUM",
          nota_final: null,
          carga_horaria: null,
          observacao: null,
        }))
      )
      .select("*");

    if (componentesError) {
      console.error("Erro ao criar componentes comuns:", componentesError);
      alert("O ano foi criado, mas os componentes padrão não puderam ser criados. Recarregue o aluno para tentar novamente.");
    }

    setDisciplinasPorAno((anterior) => ({
      ...anterior,
      [String(data.id)]: (componentesComunsCriados || []) as DisciplinaHistorico[],
    }));

    setNovoAno({
      ano_letivo: "",
      serie_ano: "",
      estabelecimento: "",
      municipio: "BELÉM",
      uf: "PA",
      resultado_final: "",
      total_aulas_anual: "200",
      carga_horaria_anual: "800",
      observacao: "",
    });
  }

  async function adicionarParteDiversificada(anoId: number) {
    const nome = window.prompt(
      "Nome do componente da Parte Diversificada:"
    );

    if (!nome?.trim()) return;

    const nomeOficial = nomeDisciplinaOficial(nome.trim());

    if (ehComponenteComum(nomeOficial)) {
      alert("Esse componente já pertence à Base Nacional Comum e já está cadastrado automaticamente.");
      return;
    }

    const existente = (
      disciplinasPorAno[String(anoId)] || []
    ).some(
      (item) =>
        nomeDisciplinaOficial(item.componente_curricular) ===
        nomeOficial
    );

    if (existente) {
      alert("Esse componente já está cadastrado para este ano.");
      return;
    }

    const { data, error } = await supabase
      .from("historico_escolar_disciplinas")
      .insert({
        historico_ano_id: Number(anoId),
        componente_curricular: nomeOficial,
        grupo: "PARTE DIVERSIFICADA",
        nota_final: null,
        carga_horaria: null,
        observacao: null,
      })
      .select("*")
      .single();

    if (error) {
      alert(
        "Erro ao adicionar componente da Parte Diversificada:\n\n" +
          error.message
      );
      return;
    }

    if (!data) return;

    setDisciplinasPorAno((anterior) => ({
      ...anterior,
      [String(anoId)]: ordenarComponentes([
        ...(anterior[String(anoId)] || []),
        data as DisciplinaHistorico,
      ]),
    }));
  }

  async function removerAno(ano: AnoHistorico) {
    const confirmar = window.confirm(
      `Deseja excluir o ano ${ano.ano_letivo} do Histórico Escolar?\n\n` +
        "Os boletins originais não serão apagados."
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("historico_escolar_anos")
      .delete()
      .eq("id", ano.id);

    if (error) {
      alert(
        "Erro ao excluir o ano:\n\n" +
          error.message
      );
      return;
    }

    setAnos((anterior) =>
      anterior.filter(
        (item) => item.id !== ano.id
      )
    );

    setDisciplinasPorAno((anterior) => {
      const copia = { ...anterior };
      delete copia[String(ano.id)];
      return copia;
    });
  }

  return (
    <div className="w-full space-y-6">

      {/* CABEÇALHO */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6">
        <div className="flex flex-col xl:flex-row justify-between gap-4 xl:items-center">

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <BookOpen size={24} />
            </div>

            <div>
              <h2 className="text-2xl font-black text-slate-800">
                Histórico Escolar
              </h2>

              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Trajetória escolar oficial
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={alunoId}
              onChange={(e) =>
                carregarHistorico(e.target.value)
              }
              className="w-full sm:w-[380px] p-3.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-700 outline-none focus:border-indigo-400"
            >
              <option value="">
                Selecione o aluno...
              </option>

              {alunos.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nome}
                  {item.status === "transferido"
                    ? " — Transferido"
                    : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {aluno && (
        <>
          {/* IDENTIFICAÇÃO */}
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <UserRound size={18} className="text-indigo-600" />
              <h3 className="font-black text-slate-800">
                Dados do aluno
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

              <div className="md:col-span-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Nome
                </label>

                <div className="mt-1 p-3 rounded-xl bg-slate-50 border border-slate-100 font-black text-slate-800">
                  {aluno.nome}
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Data de nascimento
                </label>

                <div className="mt-1 p-3 rounded-xl bg-slate-50 border border-slate-100 font-bold text-slate-700">
                  {aluno.data_nascimento
                    ? new Date(
                        aluno.data_nascimento
                      ).toLocaleDateString(
                        "pt-BR",
                        { timeZone: "UTC" }
                      )
                    : "*****"}
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Turma atual
                </label>

                <div className="mt-1 p-3 rounded-xl bg-slate-50 border border-slate-100 font-bold text-slate-700">
                  {aluno.turma || "*****"}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Pai / Responsável
                </label>

                <div className="mt-1 p-3 rounded-xl bg-slate-50 border border-slate-100 font-bold text-slate-700">
                  {aluno.responsavel || "*****"}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Mãe / 2º Responsável
                </label>

                <div className="mt-1 p-3 rounded-xl bg-slate-50 border border-slate-100 font-bold text-slate-700">
                  {aluno.responsavel_2_nome || "*****"}
                </div>
              </div>
            </div>
          </div>

          {/* TRAJETÓRIA */}
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6">

            <div className="flex flex-col lg:flex-row justify-between gap-4 mb-5">
              <div>
                <h3 className="font-black text-slate-800">
                  Estudos realizados
                </h3>

                <p className="text-xs text-slate-400 mt-1">
                  Cadastre aqui anos feitos em outra escola ou complemente os anos da ABC DO PARK.
                </p>
              </div>

              <button
                onClick={() =>
                  setNovoAno((anterior) => ({
                    ...anterior,
                    ano_letivo:
                      anterior.ano_letivo ||
                      String(new Date().getFullYear()),
                  }))
                }
                className="px-4 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 font-black text-[10px] uppercase tracking-widest"
              >
                <Plus
                  size={14}
                  className="inline mr-1"
                />
                Preparar ano
              </button>
            </div>

            <div className="overflow-x-auto">

              <table className="w-full min-w-[1100px] text-xs">

                <thead>
                  <tr className="bg-slate-50 text-[9px] uppercase tracking-widest text-slate-400">
                    <th className="p-3 text-left">Ano</th>
                    <th className="p-3 text-left">Série/Ano</th>
                    <th className="p-3 text-left">Estabelecimento</th>
                    <th className="p-3">Município</th>
                    <th className="p-3">UF</th>
                    <th className="p-3">Resultado</th>
                    <th className="p-3">Origem</th>
                    <th className="p-3">Ação</th>
                  </tr>
                </thead>

                <tbody>
                  {anosOrdenados.map((ano) => (
                    <tr
                      key={ano.id}
                      className="border-b border-slate-100"
                    >

                      <td className="p-2">
                        <input
                          value={ano.ano_letivo}
                          disabled
                          className="w-20 p-2 rounded-lg bg-slate-100 font-bold"
                        />
                      </td>

                      <td className="p-2">
                        <input
                          value={ano.serie_ano || ""}
                          onChange={(e) =>
                            atualizarAno(
                              ano.id,
                              "serie_ano",
                              e.target.value
                            )
                          }
                          placeholder="Ex.: 3º Ano"
                          className="w-28 p-2 rounded-lg border border-slate-200 font-bold"
                        />
                      </td>

                      <td className="p-2">
                        <input
                          value={ano.estabelecimento || ""}
                          onChange={(e) =>
                            atualizarAno(
                              ano.id,
                              "estabelecimento",
                              e.target.value
                            )
                          }
                          className="w-72 p-2 rounded-lg border border-slate-200 font-bold"
                        />
                      </td>

                      <td className="p-2">
                        <input
                          value={ano.municipio || ""}
                          onChange={(e) =>
                            atualizarAno(
                              ano.id,
                              "municipio",
                              e.target.value
                            )
                          }
                          className="w-28 p-2 rounded-lg border border-slate-200 font-bold"
                        />
                      </td>

                      <td className="p-2">
                        <input
                          value={ano.uf || ""}
                          onChange={(e) =>
                            atualizarAno(
                              ano.id,
                              "uf",
                              e.target.value
                            )
                          }
                          maxLength={2}
                          className="w-16 p-2 rounded-lg border border-slate-200 font-bold uppercase"
                        />
                      </td>

                      <td className="p-2">
                        <input
                          value={ano.resultado_final || ""}
                          onChange={(e) =>
                            atualizarAno(
                              ano.id,
                              "resultado_final",
                              e.target.value
                            )
                          }
                          placeholder="APROVADO"
                          className="w-28 p-2 rounded-lg border border-slate-200 font-bold"
                        />
                      </td>

                      <td className="p-2 text-center">
                        <span
                          className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${
                            ano.origem === "sistema"
                              ? "bg-indigo-50 text-indigo-600"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {ano.origem === "sistema"
                            ? "Sistema"
                            : "Manual"}
                        </span>
                      </td>

                      <td className="p-2 text-center">
                        <button
                          onClick={() =>
                            removerAno(ano)
                          }
                          className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100"
                          title="Excluir este ano do histórico"
                        >
                          <Trash2
                            size={14}
                            className="mx-auto"
                          />
                        </button>
                      </td>

                    </tr>
                  ))}
                </tbody>

              </table>
            </div>

            {/* FORMULÁRIO ANO MANUAL */}
            <div className="mt-6 p-5 rounded-2xl bg-amber-50 border border-amber-100">

              <div className="flex items-center gap-2 mb-4">
                <Plus
                  size={17}
                  className="text-amber-700"
                />

                <h4 className="font-black text-amber-800">
                  Adicionar ano anterior / escola de origem
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">

                <input
                  value={novoAno.ano_letivo}
                  onChange={(e) =>
                    setNovoAno((anterior) => ({
                      ...anterior,
                      ano_letivo:
                        e.target.value,
                    }))
                  }
                  placeholder="Ano letivo"
                  className="p-3 rounded-xl border border-amber-200 bg-white text-sm font-bold"
                />

                <input
                  value={novoAno.serie_ano}
                  onChange={(e) =>
                    setNovoAno((anterior) => ({
                      ...anterior,
                      serie_ano:
                        e.target.value,
                    }))
                  }
                  placeholder="Série/Ano"
                  className="p-3 rounded-xl border border-amber-200 bg-white text-sm font-bold"
                />

                <input
                  value={novoAno.estabelecimento}
                  onChange={(e) =>
                    setNovoAno((anterior) => ({
                      ...anterior,
                      estabelecimento:
                        e.target.value,
                    }))
                  }
                  placeholder="Estabelecimento de Ensino"
                  className="p-3 rounded-xl border border-amber-200 bg-white text-sm font-bold lg:col-span-2"
                />

                <input
                  value={novoAno.municipio}
                  onChange={(e) =>
                    setNovoAno((anterior) => ({
                      ...anterior,
                      municipio:
                        e.target.value,
                    }))
                  }
                  placeholder="Município"
                  className="p-3 rounded-xl border border-amber-200 bg-white text-sm font-bold"
                />

                <input
                  value={novoAno.uf}
                  onChange={(e) =>
                    setNovoAno((anterior) => ({
                      ...anterior,
                      uf: e.target.value,
                    }))
                  }
                  placeholder="UF"
                  maxLength={2}
                  className="p-3 rounded-xl border border-amber-200 bg-white text-sm font-bold uppercase"
                />

                <input
                  value={novoAno.resultado_final}
                  onChange={(e) =>
                    setNovoAno((anterior) => ({
                      ...anterior,
                      resultado_final:
                        e.target.value,
                    }))
                  }
                  placeholder="Resultado final"
                  className="p-3 rounded-xl border border-amber-200 bg-white text-sm font-bold"
                />

                <input
                  value={novoAno.total_aulas_anual}
                  onChange={(e) =>
                    setNovoAno((anterior) => ({
                      ...anterior,
                      total_aulas_anual:
                        e.target.value,
                    }))
                  }
                  placeholder="Total de aulas"
                  className="p-3 rounded-xl border border-amber-200 bg-white text-sm font-bold"
                />

                <input
                  value={novoAno.carga_horaria_anual}
                  onChange={(e) =>
                    setNovoAno((anterior) => ({
                      ...anterior,
                      carga_horaria_anual:
                        e.target.value,
                    }))
                  }
                  placeholder="Carga horária"
                  className="p-3 rounded-xl border border-amber-200 bg-white text-sm font-bold"
                />

                <button
                  onClick={adicionarAnoManual}
                  className="p-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest"
                >
                  <Plus
                    size={14}
                    className="inline mr-1"
                  />
                  Adicionar ano
                </button>

              </div>
            </div>
          </div>

          {/* COMPONENTES */}
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6">

            <div className="flex flex-col lg:flex-row justify-between gap-4 mb-5">

              <div>
                <h3 className="font-black text-slate-800">
                  Componentes Curriculares
                </h3>

                <p className="text-xs text-slate-400 mt-1">
                  Os 8 componentes comuns são padrão. Use “Parte Diversificada” apenas para acrescentar componentes adicionais.
                </p>
              </div>

              <button
                onClick={() => {
                  setMostrarPreview(true);
                  window.setTimeout(() => {
                    previewScrollRef.current?.scrollTo({
                      top: 0,
                      left: 0,
                      behavior: "auto",
                    });
                  }, 0);
                }}
                disabled={!aluno}
                className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] flex items-center gap-2 disabled:opacity-40"
              >
                <Eye size={15} />
                Visualizar PDF
              </button>

              <button
                onClick={salvarHistorico}
                disabled={salvando}
                className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[10px] flex items-center gap-2 disabled:opacity-50"
              >
                {salvando ? (
                  <RefreshCcw
                    size={15}
                    className="animate-spin"
                  />
                ) : (
                  <Save size={15} />
                )}

                {salvando
                  ? "Salvando..."
                  : "Salvar Histórico"}
              </button>
            </div>

            {anosOrdenados.map((ano) => (
              <div
                key={ano.id}
                className="mb-6 p-5 rounded-2xl bg-slate-50 border border-slate-100"
              >

                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">

                  <div>
                    <h4 className="font-black text-slate-800">
                      {ano.serie_ano ||
                        "Série/Ano não informado"}{" "}
                      — {ano.ano_letivo}
                    </h4>

                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                      {ano.estabelecimento ||
                        "Estabelecimento não informado"}
                    </span>
                  </div>

                  <button
                    onClick={() =>
                      adicionarParteDiversificada(
                        ano.id
                      )
                    }
                    className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest"
                  >
                    <Plus
                      size={12}
                      className="inline mr-1"
                    />
                    Parte Diversificada
                  </button>

                </div>

                <div className="overflow-x-auto">

                  <table className="w-full min-w-[860px] text-xs">

                    <thead>
                      <tr className="border-b border-slate-200 text-[9px] uppercase tracking-widest text-slate-400">

                        <th className="p-2 text-left">
                          Componente
                        </th>

                        <th className="p-2">
                          Grupo
                        </th>

                        <th className="p-2">
                          Nota Final
                        </th>

                        <th className="p-2">
                          Carga Horária
                        </th>

                      </tr>
                    </thead>

                    <tbody>
                      {(disciplinasPorAno[
                        String(ano.id)
                      ] || []).map(
                        (disciplina) => (
                          <tr
                            key={disciplina.id}
                            className="border-b border-slate-100 last:border-0"
                          >

                            <td className="p-2">
                              <input
                                value={
                                  disciplina.componente_curricular ||
                                  ""
                                }
                                onChange={(e) =>
                                  atualizarDisciplina(
                                    ano.id,
                                    disciplina.id,
                                    "componente_curricular",
                                    e.target.value
                                  )
                                }
                                className="w-72 p-2 rounded-lg border border-slate-200 font-bold"
                              />
                            </td>

                            <td className="p-2 text-center">
                              <span
                                className={`inline-flex px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wide ${
                                  disciplina.grupo === "PARTE DIVERSIFICADA"
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-indigo-50 text-indigo-600"
                                }`}
                              >
                                {disciplina.grupo === "PARTE DIVERSIFICADA"
                                  ? "Parte Diversificada"
                                  : "Base Nacional Comum"}
                              </span>
                            </td>

                            <td className="p-2">
                              <input
                                value={
                                  disciplina.nota_final ??
                                  ""
                                }
                                onChange={(e) =>
                                  atualizarDisciplina(
                                    ano.id,
                                    disciplina.id,
                                    "nota_final",
                                    e.target.value
                                  )
                                }
                                className="w-24 p-2 rounded-lg border border-slate-200 font-bold text-center"
                              />
                            </td>

                            <td className="p-2">
                              <input
                                value={
                                  disciplina.carga_horaria ??
                                  ""
                                }
                                onChange={(e) =>
                                  atualizarDisciplina(
                                    ano.id,
                                    disciplina.id,
                                    "carga_horaria",
                                    e.target.value
                                  )
                                }
                                className="w-28 p-2 rounded-lg border border-slate-200 font-bold text-center"
                              />
                            </td>

                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {mostrarPreview && aluno && (
        <div className="fixed inset-0 z-[350] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 print-preview-modal">
          <div className="w-full max-w-[1200px] h-full max-h-[95vh] bg-slate-200 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col">
            <div className="shrink-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between gap-4 print-hide">
              <div>
                <h3 className="text-lg font-black text-slate-800">
                  Visualização do Histórico Escolar
                </h3>
                <p className="text-xs font-medium text-slate-400">
                  Confira o documento antes de imprimir ou salvar em PDF.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-2"
                >
                  <Printer size={15} />
                  Imprimir / Salvar PDF
                </button>

                <button
                  onClick={() => setMostrarPreview(false)}
                  className="w-11 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
                  title="Fechar"
                >
                  <X size={19} />
                </button>
              </div>
            </div>

            <div
              ref={previewScrollRef}
              className="flex-1 overflow-auto p-6 print-preview-scroll"
            >
              <div className="flex justify-center">
                <HistoricoEscolar
                  aluno={aluno}
                  anos={anos}
                  disciplinasPorAno={disciplinasPorAno}
                  textoEscala="Escala de Avaliação: Escala numérica de notas de 0 (zero) a 10 (dez) com patamar indicativo de desempenho escolar satisfatório, a nota igual ou superior a 07 (sete)."
                  textoObservacao="*****"
                  textoConduta="*****"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {carregando && (
        <div className="fixed inset-0 z-[400] bg-slate-900/30 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-2xl px-6 py-5 shadow-xl font-black text-sm text-slate-700">
            Carregando Histórico Escolar...
          </div>
        </div>
      )}
    </div>
  );
}