"use client";

import "./HistoricoEscolar.css";

const SERIES = [
  { chave: 1, titulo: "1º ANO", subtitulo: "" },
  { chave: 2, titulo: "2º ANO", subtitulo: "1ª SÉRIE" },
  { chave: 3, titulo: "3º ANO", subtitulo: "2ª SÉRIE" },
  { chave: 4, titulo: "4º ANO", subtitulo: "3ª SÉRIE" },
  { chave: 5, titulo: "5º ANO", subtitulo: "4ª SÉRIE" },
  { chave: 6, titulo: "6º ANO", subtitulo: "5ª SÉRIE" },
];

const BASE_NACIONAL = [
  "Língua Portuguesa",
  "Arte",
  "História",
  "Geografia",
  "Matemática",
  "Ciências",
  "Língua Estrangeira Moderna - Inglês",
  "Educação Física",
];

function normalizar(v: any) {
  return String(v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[ºª°]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function disciplina(v: any) {
  const n = normalizar(v);

  if (["portugues", "lingua portuguesa", "l. portuguesa", "l portuguesa"].includes(n)) return "Língua Portuguesa";
  if (n === "arte" || n === "artes") return "Arte";
  if (n === "historia") return "História";
  if (n === "geografia") return "Geografia";
  if (n === "matematica") return "Matemática";
  if (n === "ciencias") return "Ciências";
  if (n === "ingles" || n.includes("lingua estrangeira moderna")) return "Língua Estrangeira Moderna - Inglês";
  if (["educacao fisica", "ed fisica", "ed. fisica"].includes(n)) return "Educação Física";
  if (["xadrez", "xadres"].includes(n)) return "Xadrez";
  if (n === "musica") return "Música";
  if (n === "informatica") return "Informática";

  return String(v ?? "").trim();
}

function serieChave(v: any) {
  const n = normalizar(v);
  const m = n.match(/\b([1-6])\b/);
  return m ? Number(m[1]) : null;
}

function nota(v: any) {
  if (v === null || v === undefined || v === "") return "*";
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n.toFixed(1).replace(".", ",") : "*";
}

function anoDaSerie(anos: any[], chave: number) {
  return anos.find((a) => serieChave(a?.serie_ano) === chave) || null;
}

function componentesDiversificados(lista: any[]) {
  return lista
    .filter((item) => item?.grupo === "PARTE DIVERSIFICADA")
    .filter((item, index, arr) => {
      const chave = disciplina(item?.componente_curricular);
      return arr.findIndex(
        (outro) => disciplina(outro?.componente_curricular) === chave
      ) === index;
    })
    .sort((a, b) =>
      String(a?.componente_curricular || "").localeCompare(
        String(b?.componente_curricular || ""),
        "pt-BR"
      )
    );
}

export default function HistoricoEscolar({
  aluno,
  anos,
  disciplinasPorAno,
  textoEscala,
  textoObservacao,
  textoConduta,
}: {
  aluno: any;
  anos: any[];
  disciplinasPorAno: Record<string, any[]>;
  textoEscala?: string;
  textoObservacao?: string;
  textoConduta?: string;
}) {
  const anosPorSerie = Object.fromEntries(
    SERIES.map((s) => [s.chave, anoDaSerie(anos, s.chave)])
  ) as Record<number, any | null>;

  const listaPorSerie = (chave: number) => {
    const ano = anosPorSerie[chave];
    return ano ? disciplinasPorAno[String(ano.id)] || [] : [];
  };

  const diversificadosPorSerie = (chave: number) =>
    componentesDiversificados(listaPorSerie(chave));

  const nomesDiversificados = Array.from(
    new Set(
      SERIES.flatMap((serie) =>
        diversificadosPorSerie(serie.chave).map((item: any) =>
          String(item?.componente_curricular || "").trim()
        )
      ).filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));

  const buscar = (chave: number, nome: string) =>
    listaPorSerie(chave).find(
      (d: any) => disciplina(d?.componente_curricular) === disciplina(nome)
    );

  const semNota = (chave: number) => {
    const ano = anosPorSerie[chave];
    if (!ano) return true;

    return !listaPorSerie(chave).some((d: any) => {
      if (
        d?.nota_final === null ||
        d?.nota_final === undefined ||
        d?.nota_final === ""
      ) {
        return false;
      }

      const valor = Number(String(d.nota_final).replace(",", "."));
      return Number.isFinite(valor) && valor > 0;
    });
  };

  const pai = aluno?.pai || aluno?.nome_pai || aluno?.responsavel || "*****";
  const mae = aluno?.mae || aluno?.nome_mae || aluno?.responsavel_2_nome || "*****";
  const nascimento = aluno?.data_nascimento
    ? new Date(aluno.data_nascimento).toLocaleDateString("pt-BR", { timeZone: "UTC" })
    : "*****";

  return (
    <div className="historico-preview-root">
      <div className="historico-folha">
        <header className="historico-cabecalho">
          <img
            className="historico-logo"
            src="https://mnmakhazghgncqummksu.supabase.co/storage/v1/object/public/assets/logo.png"
            alt="Escola ABC do Park"
          />
          <strong className="historico-escola">ESCOLA ABC DO PARK</strong>
          <div>Rod. Augusto Montenegro, Conj. Parklândia. Alameda das Rosa</div>
          <div>Quadra A, casas02/03. CEP: 66633-020 Belém -PA</div>
          <div>CNPJ: 05.067.797/0001-68</div>
          <div>Fone: (91)3268-3484</div>
          <strong>INEP- 15159213</strong>
          <div className="historico-email">escolaabcdopark@gmail.com</div>
        </header>

        <div className="historico-titulo">HISTÓRICO ESCOLAR</div>

        <section className="historico-identificacao">
          <div>Nome do (a) Aluno (a): <strong>{String(aluno?.nome || "*****").toUpperCase()}</strong></div>
          <div>Pai: <strong>{String(pai).toUpperCase()}</strong></div>
          <div>Mãe: <strong>{String(mae).toUpperCase()}</strong></div>
          <div className="historico-id-final">
            <span>Data de Nascimento: <strong>{nascimento}</strong></span>
            <span>Município: <strong>{String(aluno?.cidade || "BELÉM").toUpperCase()}</strong></span>
            <span>UF: <strong>{String(aluno?.estado || "PA").toUpperCase()}</strong></span>
          </div>
        </section>

        <section className="historico-matriz">
          <div className="historico-legal">
            Fundamento Legal: Lei Federal 9394/96
          </div>

          <div className="historico-matriz-head">
            <div className="historico-grupos-cabecalho" aria-hidden="true" />
            <div className="historico-componentes-title">
              COMPONENTES CURRICULARES
            </div>
            <div className="historico-series-wrap">
              <div className="historico-series-title">SÉRIES</div>
              <div className="historico-series-grid">
                {SERIES.map((s) => (
                  <div key={s.chave} className="historico-serie-head">
                    <strong>{s.titulo}</strong>
                    {s.subtitulo && <span>{s.subtitulo}</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div
            className="historico-matriz-body"
            style={
              {
                "--diversificada-rows": nomesDiversificados.length,
                "--academic-rows": 10 + nomesDiversificados.length,
              } as React.CSSProperties
            }
          >
            <div className="historico-grupos">
              <div className="grupo-base">BASE NACIONAL COMUM</div>
              <div className="grupo-div">PARTE DIVERSIFICADA</div>
            </div>

            <div className="historico-linhas">
              {BASE_NACIONAL.map((nome) => (
                <div className="historico-row" key={`comum-${nome}`}>
                  <div className="historico-cell nome">{nome}</div>
                  {SERIES.map((s) => {
                    const item = buscar(s.chave, nome);
                    return (
                      <div
                        className="historico-cell nota"
                        key={`${nome}-${s.chave}`}
                      >
                        {item && !semNota(s.chave)
                          ? nota(item.nota_final)
                          : "*"}
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* Parte Diversificada: somente os componentes adicionados pela secretaria */}
              {nomesDiversificados.map((nomeDiversificado) => (
                <div
                  className="historico-row"
                  key={`div-${nomeDiversificado}`}
                >
                  <div className="historico-cell nome">
                    {nomeDiversificado}
                  </div>

                  {SERIES.map((coluna) => {
                    const registro = diversificadosPorSerie(coluna.chave).find(
                      (d: any) =>
                        disciplina(d?.componente_curricular) ===
                        disciplina(nomeDiversificado)
                    );

                    return (
                      <div
                        className="historico-cell nota"
                        key={`div-${nomeDiversificado}-${coluna.chave}`}
                      >
                        {registro && !semNota(coluna.chave)
                          ? nota(registro.nota_final)
                          : "*"}
                      </div>
                    );
                  })}
                </div>
              ))}

              <div className="historico-row total">
                <div className="historico-cell nome">TOTAL DE AULAS ANUAIS</div>
                {SERIES.map((s) => (
                  <div className="historico-cell nota" key={`a-${s.chave}`}>
                    {anosPorSerie[s.chave]?.total_aulas_anual ?? "*****"}
                  </div>
                ))}
              </div>

              <div className="historico-row total">
                <div className="historico-cell nome">TOTAL DA CARGA HORÁRIA ANUAL</div>
                {SERIES.map((s) => (
                  <div className="historico-cell nota" key={`c-${s.chave}`}>
                    {anosPorSerie[s.chave]?.carga_horaria_anual ?? "*****"}
                  </div>
                ))}
              </div>
            </div>

            {SERIES.map((s) =>
              semNota(s.chave) ? (
                <div
                  key={`diag-${s.chave}`}
                  className="historico-diagonal"
                  style={{ "--serie": s.chave } as React.CSSProperties}
                />
              ) : null
            )}
          </div>
        </section>

        <section className="historico-origem">
          <div className="historico-origem-titulo">ESCOLA DE ORIGEM</div>
          <div className="historico-origem-body">
            <div className="historico-estudos-vertical">ESTUDOS REALIZADOS</div>
            <table>
              <thead>
                <tr>
                  <th>Série/Ano</th>
                  <th>Ano</th>
                  <th>Estabelecimento de Ensino</th>
                  <th>Município</th>
                  <th>UF</th>
                </tr>
              </thead>
              <tbody>
                {SERIES.map((s) => {
                  const ano = anosPorSerie[s.chave];
                  return (
                    <tr key={s.chave}>
                      <td>{s.chave}º Ano</td>
                      <td>{ano?.ano_letivo || "*****"}</td>
                      <td>{ano?.estabelecimento || "*****"}</td>
                      <td>{ano?.municipio || "*****"}</td>
                      <td>{ano?.uf || "***"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="historico-textos">
          <div>{textoEscala || "Escala de Avaliação: Escala numérica de notas de 0 (zero) a 10 (dez) com patamar indicativo de desempenho escolar satisfatório, a nota igual ou superior a 07 (sete)."}</div>
          <div>{textoObservacao || "*****"}</div>
          <div>{textoConduta || "*****"}</div>
        </section>

        <footer className="historico-footer">
          <div className="assinatura">
            <img
              src="https://mnmakhazghgncqummksu.supabase.co/storage/v1/object/public/assets/Carimbo%20Suellen.png"
              alt=""
            />
            <div className="assinatura-linha" />
            <strong>Suellen C. S. Figueiredo</strong>
            <span>DIRETORA / REG. 6235</span>
          </div>

          <div className="assinatura">
            <img
              src="https://mnmakhazghgncqummksu.supabase.co/storage/v1/object/public/assets/Carimbo%20Escola.png"
              alt=""
            />
            <div className="assinatura-linha" />
            <strong>Secretaria Escolar</strong>
          </div>

          <div className="historico-data">
            Belém, {new Date().toLocaleDateString("pt-BR")}
          </div>
        </footer>
      </div>
    </div>
  );
}