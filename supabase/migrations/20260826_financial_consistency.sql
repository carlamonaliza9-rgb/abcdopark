begin;

-- Historico antigo usava data_pagamento como se fosse vencimento.
-- Preenche a competencia real sem alterar status ou valores recebidos.
with base as (
  select
    hp.id,
    coalesce(
      substring(coalesce(hp.descricao, '') from '(20[0-9]{2})')::integer,
      extract(year from hp.data_pagamento)::integer,
      extract(year from hp.created_at)::integer
    ) as ano,
    case
      when translate(lower(coalesce(nullif(trim(hp.mes_referencia), ''), hp.descricao, '')), 'áàâãéêíóôõúç', 'aaaaeeiooouc') like '%janeiro%' then 1
      when translate(lower(coalesce(nullif(trim(hp.mes_referencia), ''), hp.descricao, '')), 'áàâãéêíóôõúç', 'aaaaeeiooouc') like '%fevereiro%' then 2
      when translate(lower(coalesce(nullif(trim(hp.mes_referencia), ''), hp.descricao, '')), 'áàâãéêíóôõúç', 'aaaaeeiooouc') like '%marco%' then 3
      when translate(lower(coalesce(nullif(trim(hp.mes_referencia), ''), hp.descricao, '')), 'áàâãéêíóôõúç', 'aaaaeeiooouc') like '%abril%' then 4
      when translate(lower(coalesce(nullif(trim(hp.mes_referencia), ''), hp.descricao, '')), 'áàâãéêíóôõúç', 'aaaaeeiooouc') like '%maio%' then 5
      when translate(lower(coalesce(nullif(trim(hp.mes_referencia), ''), hp.descricao, '')), 'áàâãéêíóôõúç', 'aaaaeeiooouc') like '%junho%' then 6
      when translate(lower(coalesce(nullif(trim(hp.mes_referencia), ''), hp.descricao, '')), 'áàâãéêíóôõúç', 'aaaaeeiooouc') like '%julho%' then 7
      when translate(lower(coalesce(nullif(trim(hp.mes_referencia), ''), hp.descricao, '')), 'áàâãéêíóôõúç', 'aaaaeeiooouc') like '%agosto%' then 8
      when translate(lower(coalesce(nullif(trim(hp.mes_referencia), ''), hp.descricao, '')), 'áàâãéêíóôõúç', 'aaaaeeiooouc') like '%setembro%' then 9
      when translate(lower(coalesce(nullif(trim(hp.mes_referencia), ''), hp.descricao, '')), 'áàâãéêíóôõúç', 'aaaaeeiooouc') like '%outubro%' then 10
      when translate(lower(coalesce(nullif(trim(hp.mes_referencia), ''), hp.descricao, '')), 'áàâãéêíóôõúç', 'aaaaeeiooouc') like '%novembro%' then 11
      when translate(lower(coalesce(nullif(trim(hp.mes_referencia), ''), hp.descricao, '')), 'áàâãéêíóôõúç', 'aaaaeeiooouc') like '%dezembro%' then 12
      else null
    end as mes,
    greatest(
      1,
      least(
        31,
        coalesce(
          nullif(regexp_replace(coalesce(a.vencimento::text, ''), '[^0-9]', '', 'g'), '')::integer,
          10
        )
      )
    ) as dia
  from public.historico_pagamentos hp
  join public.alunos a on a.id = hp.aluno_id
  where lower(coalesce(hp.tipo, '')) = 'mensalidade'
    and hp.data_vencimento is null
), vencimentos as (
  select
    id,
    make_date(
      ano,
      mes,
      least(
        dia,
        extract(day from (make_date(ano, mes, 1) + interval '1 month - 1 day'))::integer
      )
    ) as data_vencimento
  from base
  where ano between 2000 and 2100
    and mes between 1 and 12
)
update public.historico_pagamentos hp
set data_vencimento = v.data_vencimento
from vencimentos v
where hp.id = v.id;

-- Cobranças sem recebimento não podem possuir data de pagamento.
update public.historico_pagamentos
set data_pagamento = null
where lower(coalesce(tipo, '')) = 'mensalidade'
  and lower(coalesce(status, '')) in (
    'pendente',
    'atrasado',
    'cancelado',
    'renegociado',
    'estornado'
  )
  and coalesce(valor_pago, 0) = 0;

commit;
