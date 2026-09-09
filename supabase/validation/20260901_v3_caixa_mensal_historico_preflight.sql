-- Consulta somente de leitura para validar a reconstrução dos caixas anteriores.
select
  'caixas_mensais_anteriores' as verificacao,
  count(*)::text as resultado
from public.sessoes_caixa
where caixa_mensal
  and competencia < date_trunc('month', timezone('America/Sao_Paulo', now()))::date

union all

select
  'movimentos_reconstruidos',
  count(*)::text
from public.recebimentos_caixa_mensal
where reconstrucao_chave is not null

union all

select
  'mes_mais_antigo',
  coalesce(to_char(min(competencia), 'MM/YYYY'), 'nenhum')
from public.sessoes_caixa
where caixa_mensal

union all

select
  'mes_mais_recente',
  coalesce(to_char(max(competencia), 'MM/YYYY'), 'nenhum')
from public.sessoes_caixa
where caixa_mensal

union all

select
  'pagamentos_com_divergencia',
  count(*)::text
from (
  select pagamento.id
  from public.historico_pagamentos pagamento
  left join (
    select
      historico_pagamento_id,
      round(sum(valor_movimento), 2) as total_movimentos
    from public.recebimentos_caixa_mensal
    where historico_pagamento_id is not null
    group by historico_pagamento_id
  ) movimento on movimento.historico_pagamento_id = pagamento.id
  where abs(coalesce(pagamento.valor_pago, 0)) >= 0.01
    and lower(coalesce(pagamento.tipo, '')) not in ('credito', 'estorno')
    and abs(round(coalesce(pagamento.valor_pago, 0), 2) - coalesce(movimento.total_movimentos, 0)) >= 0.01
) divergencias;
