export const APP_ROLES = [
  "Admin",
  "Direção",
  "Secretaria",
  "Financeiro",
  "Professor",
  "Auxiliar",
  "Responsável",
  "Somente Leitura",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const APP_PERMISSIONS = [
  "painel.admin",
  "usuarios.gerenciar",
  "alunos.visualizar",
  "alunos.gerenciar",
  "alunos.excluir",
  "academico.visualizar",
  "academico.gerenciar",
  "documentos.visualizar",
  "documentos.gerenciar",
  "funcionarios.visualizar",
  "funcionarios.gerenciar",
  "financeiro.visualizar",
  "financeiro.gerenciar",
  "financeiro.estornar",
  "financeiro.excluir",
  "fechamento.executar",
  "auditoria.visualizar",
  "notificacoes.enviar",
] as const;

export type AppPermission = (typeof APP_PERMISSIONS)[number];

const TODAS_PERMISSOES = new Set<AppPermission>(APP_PERMISSIONS);

const PERMISSOES_POR_CARGO: Record<AppRole, ReadonlySet<AppPermission>> = {
  Admin: TODAS_PERMISSOES,
  Direção: new Set<AppPermission>([
    "painel.admin",
    "alunos.visualizar",
    "alunos.gerenciar",
    "academico.visualizar",
    "academico.gerenciar",
    "documentos.visualizar",
    "documentos.gerenciar",
    "funcionarios.visualizar",
    "funcionarios.gerenciar",
    "financeiro.visualizar",
    "financeiro.gerenciar",
    "financeiro.estornar",
    "fechamento.executar",
    "auditoria.visualizar",
    "notificacoes.enviar",
  ]),
  Secretaria: new Set<AppPermission>([
    "painel.admin",
    "alunos.visualizar",
    "alunos.gerenciar",
    "academico.visualizar",
    "documentos.visualizar",
    "documentos.gerenciar",
    "funcionarios.visualizar",
    "notificacoes.enviar",
  ]),
  Financeiro: new Set<AppPermission>([
    "painel.admin",
    "alunos.visualizar",
    "financeiro.visualizar",
    "financeiro.gerenciar",
    "financeiro.estornar",
    "documentos.visualizar",
  ]),
  Professor: new Set<AppPermission>([
    "academico.visualizar",
    "academico.gerenciar",
    "alunos.visualizar",
    "documentos.visualizar",
    "notificacoes.enviar",
  ]),
  Auxiliar: new Set<AppPermission>([
    "academico.visualizar",
    "alunos.visualizar",
    "documentos.visualizar",
  ]),
  Responsável: new Set<AppPermission>([]),
  "Somente Leitura": new Set<AppPermission>([
    "painel.admin",
    "alunos.visualizar",
    "academico.visualizar",
    "documentos.visualizar",
    "funcionarios.visualizar",
    "financeiro.visualizar",
  ]),
};

function semAcentos(valor: string) {
  return valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

const ALIASES_CARGOS: Record<string, AppRole> = {
  admin: "Admin",
  administrador: "Admin",
  administracao: "Admin",
  direcao: "Direção",
  diretor: "Direção",
  diretora: "Direção",
  secretaria: "Secretaria",
  secretario: "Secretaria",
  secretária: "Secretaria",
  financeiro: "Financeiro",
  professor: "Professor",
  professora: "Professor",
  auxiliar: "Auxiliar",
  responsavel: "Responsável",
  visitante: "Somente Leitura",
  "somente leitura": "Somente Leitura",
};

export function normalizarCargo(cargo: string | null | undefined): AppRole | null {
  if (!cargo) return null;
  return ALIASES_CARGOS[semAcentos(cargo)] ?? null;
}

export function temPermissao(
  cargo: string | AppRole | null | undefined,
  permissao: AppPermission,
) {
  const cargoNormalizado = normalizarCargo(cargo);
  return cargoNormalizado ? PERMISSOES_POR_CARGO[cargoNormalizado].has(permissao) : false;
}

export function ehCargoAdministrativo(cargo: string | null | undefined) {
  return temPermissao(cargo, "painel.admin");
}

export function ehCargoEquipe(cargo: string | null | undefined) {
  return temPermissao(cargo, "academico.visualizar") || ehCargoAdministrativo(cargo);
}

export function rotaInicialDoCargo(cargo: string | null | undefined) {
  const normalizado = normalizarCargo(cargo);
  if (normalizado === "Professor" || normalizado === "Auxiliar") return "/professor/dashboard";
  if (normalizado === "Responsável") return "/dashboard";
  if (normalizado) return "/dashboard";
  return "/";
}
