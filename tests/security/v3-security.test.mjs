import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const raiz = process.cwd();

async function arquivosCodigo(diretorio) {
  const resultado = [];
  for (const item of await readdir(diretorio, { withFileTypes: true })) {
    const caminho = path.join(diretorio, item.name);
    if (item.isDirectory()) resultado.push(...await arquivosCodigo(caminho));
    else if (/\.(?:ts|tsx|js|jsx)$/.test(item.name)) resultado.push(caminho);
  }
  return resultado;
}

test("o aplicativo não contém credenciais mestras nem e-mails privilegiados", async () => {
  const arquivos = [
    ...await arquivosCodigo(path.join(raiz, "app")),
    ...await arquivosCodigo(path.join(raiz, "lib")),
  ];
  const proibidos = [
    /SENHA_MESTRA/i,
    /senha\s*(?:===|!==)\s*["'`]\d{4,}["'`]/i,
    /carlamonaliza9/i,
    /diretoria@abcdopark/i,
  ];

  const ocorrencias = [];
  for (const arquivo of arquivos) {
    const conteudo = await readFile(arquivo, "utf8");
    if (proibidos.some((padrao) => padrao.test(conteudo))) {
      ocorrencias.push(path.relative(raiz, arquivo));
    }
  }
  assert.deepEqual(ocorrencias, []);
});

test("a matriz V3 declara todos os cargos e permissões críticas", async () => {
  const conteudo = await readFile(path.join(raiz, "lib/auth/permissions.ts"), "utf8");
  for (const cargo of ["Admin", "Direção", "Secretaria", "Financeiro", "Professor", "Auxiliar", "Responsável", "Somente Leitura"]) {
    assert.match(conteudo, new RegExp(cargo));
  }
  for (const permissao of ["usuarios.gerenciar", "alunos.excluir", "financeiro.estornar", "financeiro.excluir", "auditoria.visualizar"]) {
    assert.match(conteudo, new RegExp(permissao.replace(".", "\\.")));
  }
});

test("a migração V3 é transacional, auditável e repetível", async () => {
  const conteudo = await readFile(
    path.join(raiz, "supabase/migrations/20260827_v3_roles_audit_and_passwords.sql"),
    "utf8",
  );
  assert.match(conteudo, /^begin;/i);
  assert.match(conteudo, /commit;\s*$/i);
  assert.match(conteudo, /create table if not exists public\.auditoria_v3/i);
  assert.match(conteudo, /dados_antes jsonb/i);
  assert.match(conteudo, /dados_depois jsonb/i);
  assert.match(conteudo, /drop policy if exists perfis_select_v3/i);
  assert.match(conteudo, /troca_senha_obrigatoria = true/i);
  assert.doesNotMatch(conteudo, /@gmail\.com|diretoria@/i);
});

test("exclusão de ficha de aluno virou arquivamento", async () => {
  const perfil = await readFile(path.join(raiz, "app/(sistema)/admin/alunos/[id]/page.tsx"), "utf8");
  const lista = await readFile(path.join(raiz, "app/(sistema)/admin/alunos/page.tsx"), "utf8");
  assert.match(perfil, /update\(\{ status: 'arquivado' \}\)/);
  assert.match(lista, /update\(\{ status: 'arquivado' \}\)/);
  assert.doesNotMatch(perfil, /from\('alunos'\)\.delete\(\)/);
  assert.doesNotMatch(lista, /from\('alunos'\)\.delete\(\)/);
});

test("o caixa V3 é mensal, automático e inicia zerado", async () => {
  const migracao = await readFile(
    path.join(raiz, "supabase/migrations/20260901_v3_caixa_mensal_automatico.sql"),
    "utf8",
  );
  const hookPDV = await readFile(
    path.join(raiz, "app/(sistema)/admin/pdv/_hooks/usePDV.ts"),
    "utf8",
  );
  const telaPDV = await readFile(
    path.join(raiz, "app/(sistema)/admin/pdv/_components/PDVViews.tsx"),
    "utf8",
  );

  assert.match(migracao, /^begin;/i);
  assert.match(migracao, /competencia date/i);
  assert.match(migracao, /where caixa_mensal/i);
  assert.match(migracao, /'Sistema mensal',[\s\S]*?\n\s*0,[\s\S]*?\n\s*'aberto'/i);
  assert.match(migracao, /timezone\('America\/Sao_Paulo', now\(\)\)/i);
  assert.match(migracao, /recebimentos_caixa_mensal/i);
  assert.match(migracao, /before insert or update of valor_pago/i);
  assert.match(migracao, /after insert or update of valor_pago/i);
  assert.match(migracao, /commit;\s*$/i);

  assert.match(hookPDV, /rpc\('obter_ou_criar_caixa_mensal'\)/i);
  assert.match(hookPDV, /eq\('caixa_mensal', true\)/i);
  assert.match(hookPDV, /order\('competencia', \{ ascending: false \}\)/i);
  assert.doesNotMatch(hookPDV, /insert\(\[\{ operador_nome: 'Administração'/i);
  assert.match(telaPDV, /Aberto automaticamente com fundo inicial/i);
  assert.match(telaPDV, /Histórico de Caixas Mensais/i);
  assert.match(telaPDV, /Todos os meses/i);
  assert.doesNotMatch(telaPDV, />Fechar Caixa</i);
});

test("os caixas mensais anteriores são reconstruídos sem duplicação", async () => {
  const migracao = await readFile(
    path.join(raiz, "supabase/migrations/20260901_v3_caixa_mensal_historico.sql"),
    "utf8",
  );

  assert.match(migracao, /^begin;/i);
  assert.match(migracao, /reconstrucao_chave/i);
  assert.match(migracao, /historico_parciais/i);
  assert.match(migracao, /data_recebimento/i);
  assert.match(migracao, /generate_series/i);
  assert.match(migracao, /fundo_inicial,[\s\S]*?0,/i);
  assert.match(migracao, /on conflict \(reconstrucao_chave\)/i);
  assert.doesNotMatch(migracao, /update public\.historico_pagamentos/i);
  assert.match(migracao, /commit;\s*$/i);
});

test("o balanço usa o livro mensal e o histórico mostra os alunos", async () => {
  const financeiro = await readFile(
    path.join(raiz, "app/(sistema)/admin/financeiro/page.tsx"),
    "utf8",
  );
  const telaPDV = await readFile(
    path.join(raiz, "app/(sistema)/admin/pdv/_components/PDVViews.tsx"),
    "utf8",
  );
  const paginaPDV = await readFile(
    path.join(raiz, "app/(sistema)/admin/pdv/page.tsx"),
    "utf8",
  );

  assert.match(financeiro, /from\('recebimentos_caixa_mensal'\)/i);
  assert.match(financeiro, /eq\('competencia', dataInicio\)/i);
  assert.match(financeiro, /movimentosRecebidosNoMes/i);
  assert.doesNotMatch(financeiro, /onExcluir=\{handleExcluirReceita\}/i);
  assert.match(telaPDV, /Aluno e descrição/i);
  assert.match(telaPDV, /nomeAluno/i);
  assert.match(paginaPDV, /alunos=\{pdv\.alunos\}/i);
});

test("as rotas financeiras antigas apontam para a tela unificada existente", async () => {
  const financeiroAntigo = await readFile(
    path.join(raiz, "app/(sistema)/dashboard/financeiro/page.tsx"),
    "utf8",
  );
  const contasAntigas = await readFile(
    path.join(raiz, "app/(sistema)/dashboard/financeiro/contas-a-pagar/page.tsx"),
    "utf8",
  );
  const compatibilidade = await readFile(
    path.join(raiz, "app/(sistema)/admin/financeiro/contas-a-pagar/page.tsx"),
    "utf8",
  );
  const telaUnificada = await readFile(
    path.join(raiz, "app/(sistema)/admin/financeiro/saidas/page.tsx"),
    "utf8",
  );

  assert.match(financeiroAntigo, /router\.replace\(["']\/admin\/financeiro\/saidas["']\)/i);
  assert.match(contasAntigas, /router\.replace\(["']\/admin\/financeiro\/saidas["']\)/i);
  assert.match(compatibilidade, /redirect\(["']\/admin\/financeiro\/saidas["']\)/i);
  assert.match(telaUnificada, /VisaoContasAPagar/i);
  assert.doesNotMatch(financeiroAntigo, /router\.(?:push|replace)\(["']\/admin\/financeiro\/contas-a-pagar/i);
  assert.doesNotMatch(contasAntigas, /router\.(?:push|replace)\(["']\/admin\/financeiro\/contas-a-pagar/i);
});

test("professores podem enviar comprovantes de justificativa", async () => {
  const migracao = await readFile(
    path.join(raiz, "supabase/migrations/20260901_v3_correcoes_varredura.sql"),
    "utf8",
  );
  const frequencia = await readFile(
    path.join(raiz, "app/(sistema)/professor/frequencia/page.tsx"),
    "utf8",
  );

  assert.match(migracao, /^begin;/i);
  assert.match(migracao, /drop policy if exists documentos_storage_professor_insert/i);
  assert.match(migracao, /create policy documentos_storage_professor_insert[\s\S]*?for insert to authenticated/i);
  assert.match(migracao, /bucket_id = 'documentos'/i);
  assert.match(migracao, /tem_permissao\('academico\.gerenciar'\)/i);
  assert.match(migracao, /commit;\s*$/i);
  assert.match(frequencia, /\.from\('documentos'\)[\s\S]*?\.upload\(fileName, arquivoComprovante\)/i);
});
