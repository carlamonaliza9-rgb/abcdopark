-- Consulta somente de leitura para validar o caixa mensal automático.
select
  'colunas_caixa_mensal' as verificacao,
  count(*)::text as resultado
from information_schema.columns
where table_schema = 'public'
  and table_name = 'sessoes_caixa'
  and column_name in ('competencia', 'caixa_mensal', 'fechamento_automatico')

union all

select
  'tabela_movimentos_mensais',
  case when to_regclass('public.recebimentos_caixa_mensal') is not null then 'ok' else 'ausente' end

union all

select
  'funcoes_automaticas',
  count(*)::text
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in (
    'garantir_caixa_mensal_atual',
    'obter_ou_criar_caixa_mensal',
    'atualizar_totais_caixa_mensal'
  )

union all

select
  'gatilhos_pagamentos',
  count(*)::text
from pg_trigger
where tgrelid = 'public.historico_pagamentos'::regclass
  and not tgisinternal
  and tgname in (
    'vincular_caixa_mensal_ao_pagamento',
    'registrar_movimento_caixa_mensal'
  )

union all

select
  'caixa_mes_atual',
  count(*)::text
from public.sessoes_caixa
where caixa_mensal
  and competencia = date_trunc('month', timezone('America/Sao_Paulo', now()))::date
  and status = 'aberto'
  and fundo_inicial = 0

union all

select
  'caixas_mensais_duplicados',
  count(*)::text
from (
  select competencia
  from public.sessoes_caixa
  where caixa_mensal
  group by competencia
  having count(*) > 1
) duplicados;
