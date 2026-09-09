-- Consulta somente de leitura para validar a V3.
select
  'colunas_perfis' as verificacao,
  count(*)::text as resultado
from information_schema.columns
where table_schema = 'public'
  and table_name = 'perfis'
  and column_name in ('ativo', 'troca_senha_obrigatoria')

union all

select
  'cargos_configurados',
  count(distinct cargo)::text
from public.permissoes_cargos

union all

select
  'permissoes_configuradas',
  count(*)::text
from public.permissoes_cargos

union all

select
  'tabela_auditoria',
  case when to_regclass('public.auditoria_v3') is not null then 'ok' else 'ausente' end

union all

select
  'gatilhos_auditoria',
  count(*)::text
from pg_trigger
where tgname = 'auditoria_v3_changes'
  and not tgisinternal

union all

select
  'politicas_v3',
  count(*)::text
from pg_policies
where schemaname = 'public'
  and policyname like '%_v3';
