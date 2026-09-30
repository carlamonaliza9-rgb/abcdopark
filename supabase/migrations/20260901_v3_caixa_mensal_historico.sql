begin;

-- Identifica cada movimento reconstruído para que esta migração possa ser
-- executada novamente sem duplicar valores.
alter table public.recebimentos_caixa_mensal
  add column if not exists reconstrucao_chave text;

create unique index if not exists recebimentos_caixa_mensal_reconstrucao_uniq
  on public.recebimentos_caixa_mensal (reconstrucao_chave)
  where reconstrucao_chave is not null;

-- Reconstrói os recebimentos anteriores à implantação do caixa mensal.
-- Quando há pagamentos parciais, cada rodada permanece no mês em que ocorreu.
create temporary table caixa_mensal_reconstrucao_v3
on commit drop
as
with pagamentos_base as (
  select
    hp.id,
    hp.aluno_id,
    hp.tipo,
    hp.descricao,
    hp.mes_referencia,
    hp.data_pagamento,
    hp.created_at,
    round(coalesce(hp.valor_pago, 0)::numeric, 2) as valor_pago,
    coalesce(hp.detalhes_metodos, '{}'::jsonb) as detalhes,
    coalesce(movimentos_atuais.total, 0)::numeric as movimentos_atuais
  from public.historico_pagamentos hp
  left join lateral (
    select coalesce(sum(rcm.valor_movimento), 0) as total
    from public.recebimentos_caixa_mensal rcm
    where rcm.historico_pagamento_id = hp.id
      and rcm.reconstrucao_chave is null
  ) movimentos_atuais on true
  where abs(coalesce(hp.valor_pago, 0)) >= 0.01
    and lower(coalesce(hp.tipo, '')) not in ('credito', 'estorno')
),
parciais_brutas as (
  select
    pagamento.id as historico_pagamento_id,
    pagamento.aluno_id,
    pagamento.tipo,
    pagamento.descricao,
    pagamento.mes_referencia,
    pagamento.detalhes,
    parcial.ordem,
    case
      when replace(coalesce(parcial.item->>'valor_pago_rodada', ''), ',', '.')
        ~ '^-?[0-9]+([.][0-9]+)?$'
      then round(replace(parcial.item->>'valor_pago_rodada', ',', '.')::numeric, 2)
      else 0
    end as valor_movimento,
    coalesce(
      case
        when coalesce(parcial.item->>'data_operacao', parcial.item->>'data_recebimento', '')
          ~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}'
        then substring(
          coalesce(parcial.item->>'data_operacao', parcial.item->>'data_recebimento')
          from 1 for 10
        )::date::timestamp at time zone 'America/Sao_Paulo'
      end,
      pagamento.data_pagamento::timestamp at time zone 'America/Sao_Paulo',
      pagamento.created_at
    ) as data_operacao
  from pagamentos_base pagamento
  cross join lateral jsonb_array_elements(
    case
      when jsonb_typeof(pagamento.detalhes->'historico_parciais') = 'array'
      then pagamento.detalhes->'historico_parciais'
      else '[]'::jsonb
    end
  ) with ordinality as parcial(item, ordem)
  where abs(pagamento.movimentos_atuais) < 0.01
),
parciais as (
  select *
  from parciais_brutas
  where abs(valor_movimento) >= 0.01
    and data_operacao is not null
),
soma_parciais as (
  select
    historico_pagamento_id,
    coalesce(sum(valor_movimento), 0) as total
  from parciais
  group by historico_pagamento_id
),
operacoes as (
  select
    parcial.historico_pagamento_id,
    parcial.aluno_id,
    parcial.valor_movimento,
    case when parcial.valor_movimento < 0 then 'estorno' else 'pagamento' end as natureza,
    parcial.descricao,
    jsonb_build_object(
      'origem', 'reconstrucao_historica',
      'tipo', parcial.tipo,
      'mes_referencia', parcial.mes_referencia,
      'metodos', parcial.detalhes,
      'parcial', parcial.ordem
    ) as detalhes,
    parcial.data_operacao,
    format('historico:%s:parcial:%s', parcial.historico_pagamento_id, parcial.ordem) as reconstrucao_chave
  from parciais parcial

  union all

  select
    pagamento.id,
    pagamento.aluno_id,
    round(
      pagamento.valor_pago - case
        when abs(pagamento.movimentos_atuais) >= 0.01 then pagamento.movimentos_atuais
        else coalesce(soma.total, 0)
      end,
      2
    ) as valor_movimento,
    case
      when round(
        pagamento.valor_pago - case
          when abs(pagamento.movimentos_atuais) >= 0.01 then pagamento.movimentos_atuais
          else coalesce(soma.total, 0)
        end,
        2
      ) < 0 then 'estorno'
      when coalesce(soma.total, 0) = 0 and abs(pagamento.movimentos_atuais) < 0.01 then 'pagamento'
      else 'ajuste'
    end as natureza,
    pagamento.descricao,
    jsonb_build_object(
      'origem', 'reconstrucao_historica',
      'tipo', pagamento.tipo,
      'mes_referencia', pagamento.mes_referencia,
      'metodos', pagamento.detalhes,
      'saldo_reconstruido', true
    ) as detalhes,
    coalesce(
      pagamento.data_pagamento::timestamp at time zone 'America/Sao_Paulo',
      pagamento.created_at
    ) as data_operacao,
    format('historico:%s:saldo', pagamento.id) as reconstrucao_chave
  from pagamentos_base pagamento
  left join soma_parciais soma
    on soma.historico_pagamento_id = pagamento.id
  where abs(
    round(
      pagamento.valor_pago - case
        when abs(pagamento.movimentos_atuais) >= 0.01 then pagamento.movimentos_atuais
        else coalesce(soma.total, 0)
      end,
      2
    )
  ) >= 0.01
)
select *
from operacoes
where data_operacao is not null
  and date_trunc('month', timezone('America/Sao_Paulo', data_operacao))::date
    <= date_trunc('month', timezone('America/Sao_Paulo', now()))::date;

-- Cria um caixa zerado para cada mês histórico encontrado.
insert into public.sessoes_caixa (
  operador_nome,
  fundo_inicial,
  status,
  data_abertura,
  data_fechamento,
  competencia,
  caixa_mensal,
  fechamento_automatico,
  total_apurado,
  resumo_metodos
)
select
  'Sistema mensal',
  0,
  case
    when competencia = date_trunc('month', timezone('America/Sao_Paulo', now()))::date
    then 'aberto'
    else 'fechado'
  end,
  competencia::timestamp at time zone 'America/Sao_Paulo',
  case
    when competencia = date_trunc('month', timezone('America/Sao_Paulo', now()))::date
    then null
    else (competencia + interval '1 month')::timestamp at time zone 'America/Sao_Paulo'
  end,
  competencia,
  true,
  competencia < date_trunc('month', timezone('America/Sao_Paulo', now()))::date,
  0,
  jsonb_build_object(
    'pagamentos', 0,
    'estornos', 0,
    'total_liquido', 0,
    'modelo', 'mensal_automatico',
    'origem', 'reconstrucao_historica'
  )
from (
  select generate_series(
    date_trunc('month', min(timezone('America/Sao_Paulo', data_operacao)))::date,
    date_trunc('month', timezone('America/Sao_Paulo', now()))::date,
    interval '1 month'
  )::date as competencia
  from caixa_mensal_reconstrucao_v3
  having count(*) > 0
) meses
where not exists (
  select 1
  from public.sessoes_caixa existente
  where existente.caixa_mensal
    and existente.competencia = meses.competencia
);

-- Copia os movimentos para o livro mensal sem alterar os pagamentos originais.
insert into public.recebimentos_caixa_mensal (
  caixa_id,
  historico_pagamento_id,
  aluno_id,
  valor_movimento,
  natureza,
  descricao,
  detalhes,
  data_operacao,
  usuario_id,
  reconstrucao_chave
)
select
  caixa.id,
  operacao.historico_pagamento_id,
  operacao.aluno_id,
  operacao.valor_movimento,
  operacao.natureza,
  operacao.descricao,
  operacao.detalhes,
  operacao.data_operacao,
  null,
  operacao.reconstrucao_chave
from caixa_mensal_reconstrucao_v3 operacao
join public.sessoes_caixa caixa
  on caixa.caixa_mensal
  and caixa.competencia = date_trunc(
    'month',
    timezone('America/Sao_Paulo', operacao.data_operacao)
  )::date
on conflict (reconstrucao_chave)
  where reconstrucao_chave is not null
  do nothing;

-- Recalcula os totais e mantém somente o mês atual aberto.
do $$
declare
  caixa record;
begin
  for caixa in
    select id
    from public.sessoes_caixa
    where caixa_mensal
  loop
    perform public.atualizar_totais_caixa_mensal(caixa.id);
  end loop;
end;
$$;

select public.garantir_caixa_mensal_atual();

commit;
