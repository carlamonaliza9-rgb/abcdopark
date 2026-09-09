begin;

-- Cada competência possui um único caixa mensal, sempre iniciado em R$ 0,00.
alter table public.sessoes_caixa
  add column if not exists competencia date,
  add column if not exists caixa_mensal boolean not null default false,
  add column if not exists fechamento_automatico boolean not null default false;

create unique index if not exists sessoes_caixa_competencia_mensal_uniq
  on public.sessoes_caixa (competencia)
  where caixa_mensal;

-- Livro imutável de movimentos. O caixa usa a data real da operação, e não
-- o mês de referência ou o vencimento da mensalidade.
create table if not exists public.recebimentos_caixa_mensal (
  id uuid primary key default gen_random_uuid(),
  caixa_id uuid not null references public.sessoes_caixa(id) on delete restrict,
  historico_pagamento_id bigint references public.historico_pagamentos(id) on delete set null,
  aluno_id bigint,
  valor_movimento numeric(12,2) not null check (valor_movimento <> 0),
  natureza text not null check (natureza in ('pagamento', 'ajuste', 'estorno')),
  descricao text,
  detalhes jsonb not null default '{}'::jsonb,
  data_operacao timestamptz not null default now(),
  usuario_id uuid default auth.uid()
);

create index if not exists recebimentos_caixa_mensal_caixa_data_idx
  on public.recebimentos_caixa_mensal (caixa_id, data_operacao desc);

create index if not exists recebimentos_caixa_mensal_historico_idx
  on public.recebimentos_caixa_mensal (historico_pagamento_id);

alter table public.recebimentos_caixa_mensal enable row level security;

drop policy if exists recebimentos_caixa_mensal_select_v3 on public.recebimentos_caixa_mensal;
create policy recebimentos_caixa_mensal_select_v3
  on public.recebimentos_caixa_mensal
  for select to authenticated
  using (public.tem_permissao('financeiro.visualizar'));

revoke all on public.recebimentos_caixa_mensal from anon, authenticated;
grant select on public.recebimentos_caixa_mensal to authenticated;

create or replace function public.atualizar_totais_caixa_mensal(p_caixa_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pagamentos numeric(12,2);
  v_estornos numeric(12,2);
  v_total numeric(12,2);
begin
  select
    coalesce(sum(valor_movimento) filter (where valor_movimento > 0), 0),
    coalesce(abs(sum(valor_movimento) filter (where valor_movimento < 0)), 0),
    coalesce(sum(valor_movimento), 0)
  into v_pagamentos, v_estornos, v_total
  from public.recebimentos_caixa_mensal
  where caixa_id = p_caixa_id;

  update public.sessoes_caixa
  set total_apurado = v_total,
      resumo_metodos = coalesce(resumo_metodos, '{}'::jsonb) || jsonb_build_object(
        'pagamentos', v_pagamentos,
        'estornos', v_estornos,
        'total_liquido', v_total,
        'modelo', 'mensal_automatico'
      )
  where id = p_caixa_id;
end;
$$;

revoke all on function public.atualizar_totais_caixa_mensal(uuid)
  from public, anon, authenticated;

create or replace function public.garantir_caixa_mensal_atual()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_agora_local timestamp without time zone;
  v_competencia date;
  v_inicio_mes timestamptz;
  v_caixa_id uuid;
  v_caixa record;
begin
  -- Serializa chamadas simultâneas e impede a criação de caixas duplicados.
  perform pg_advisory_xact_lock(hashtext('abc_do_park_caixa_mensal'));

  v_agora_local := timezone('America/Sao_Paulo', now());
  v_competencia := date_trunc('month', v_agora_local)::date;
  v_inicio_mes := v_competencia::timestamp at time zone 'America/Sao_Paulo';

  -- Encerra sessões manuais que tenham permanecido abertas na migração.
  update public.sessoes_caixa
  set status = 'fechado',
      data_fechamento = coalesce(data_fechamento, now()),
      fechamento_automatico = true
  where status = 'aberto'
    and not caixa_mensal;

  -- Encerra caixas mensais anteriores exatamente na virada de competência.
  for v_caixa in
    select id, competencia
    from public.sessoes_caixa
    where caixa_mensal
      and status = 'aberto'
      and competencia <> v_competencia
  loop
    perform public.atualizar_totais_caixa_mensal(v_caixa.id);

    update public.sessoes_caixa
    set status = 'fechado',
        data_fechamento = ((v_caixa.competencia + interval '1 month')::timestamp
          at time zone 'America/Sao_Paulo'),
        fechamento_automatico = true
    where id = v_caixa.id;
  end loop;

  select id
  into v_caixa_id
  from public.sessoes_caixa
  where caixa_mensal
    and competencia = v_competencia;

  if v_caixa_id is null then
    insert into public.sessoes_caixa (
      operador_nome,
      fundo_inicial,
      status,
      data_abertura,
      competencia,
      caixa_mensal,
      fechamento_automatico,
      total_apurado,
      resumo_metodos
    ) values (
      'Sistema mensal',
      0,
      'aberto',
      v_inicio_mes,
      v_competencia,
      true,
      false,
      0,
      jsonb_build_object(
        'pagamentos', 0,
        'estornos', 0,
        'total_liquido', 0,
        'modelo', 'mensal_automatico'
      )
    )
    returning id into v_caixa_id;
  else
    update public.sessoes_caixa
    set status = 'aberto',
        data_fechamento = null,
        fechamento_automatico = false,
        fundo_inicial = 0
    where id = v_caixa_id
      and (
        status <> 'aberto'
        or data_fechamento is not null
        or fechamento_automatico
        or fundo_inicial <> 0
      );
  end if;

  return v_caixa_id;
end;
$$;

revoke all on function public.garantir_caixa_mensal_atual()
  from public, anon, authenticated;

create or replace function public.obter_ou_criar_caixa_mensal()
returns setof public.sessoes_caixa
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caixa_id uuid;
begin
  if auth.uid() is null or not public.tem_permissao('financeiro.gerenciar') then
    raise exception 'Sem permissão para operar o caixa mensal' using errcode = '42501';
  end if;

  v_caixa_id := public.garantir_caixa_mensal_atual();

  return query
    select s.*
    from public.sessoes_caixa s
    where s.id = v_caixa_id;
end;
$$;

revoke all on function public.obter_ou_criar_caixa_mensal()
  from public, anon;
grant execute on function public.obter_ou_criar_caixa_mensal()
  to authenticated;

-- Toda baixa financeira passa a ser vinculada ao caixa do mês da operação.
create or replace function public.vincular_caixa_mensal_ao_pagamento()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_delta numeric(12,2);
begin
  if lower(coalesce(new.tipo, '')) in ('credito', 'estorno') then
    return new;
  end if;

  v_delta := round(
    coalesce(new.valor_pago, 0) -
    case when tg_op = 'UPDATE' then coalesce(old.valor_pago, 0) else 0 end,
    2
  );

  if v_delta <> 0 then
    new.caixa_id := public.garantir_caixa_mensal_atual();
  end if;

  return new;
end;
$$;

create or replace function public.registrar_movimento_caixa_mensal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_delta numeric(12,2);
  v_natureza text;
begin
  if lower(coalesce(new.tipo, '')) in ('credito', 'estorno') then
    return new;
  end if;

  v_delta := round(
    coalesce(new.valor_pago, 0) -
    case when tg_op = 'UPDATE' then coalesce(old.valor_pago, 0) else 0 end,
    2
  );

  if v_delta = 0 or new.caixa_id is null then
    return new;
  end if;

  v_natureza := case
    when v_delta < 0 then 'estorno'
    when tg_op = 'UPDATE' then 'ajuste'
    else 'pagamento'
  end;

  insert into public.recebimentos_caixa_mensal (
    caixa_id,
    historico_pagamento_id,
    aluno_id,
    valor_movimento,
    natureza,
    descricao,
    detalhes,
    data_operacao,
    usuario_id
  ) values (
    new.caixa_id,
    new.id,
    new.aluno_id,
    v_delta,
    v_natureza,
    new.descricao,
    jsonb_build_object(
      'tipo', new.tipo,
      'mes_referencia', new.mes_referencia,
      'data_pagamento_informada', new.data_pagamento,
      'status', new.status,
      'metodos', coalesce(new.detalhes_metodos, '{}'::jsonb)
    ),
    now(),
    auth.uid()
  );

  perform public.atualizar_totais_caixa_mensal(new.caixa_id);
  return new;
end;
$$;

drop trigger if exists vincular_caixa_mensal_ao_pagamento
  on public.historico_pagamentos;
create trigger vincular_caixa_mensal_ao_pagamento
  before insert or update of valor_pago on public.historico_pagamentos
  for each row execute function public.vincular_caixa_mensal_ao_pagamento();

drop trigger if exists registrar_movimento_caixa_mensal
  on public.historico_pagamentos;
create trigger registrar_movimento_caixa_mensal
  after insert or update of valor_pago on public.historico_pagamentos
  for each row execute function public.registrar_movimento_caixa_mensal();

-- A rotina de automação existente passa a fazer a virada mensal completa.
create or replace function public.fechar_caixa_automatico()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.garantir_caixa_mensal_atual();
end;
$$;

revoke all on function public.fechar_caixa_automatico()
  from public, anon, authenticated;
grant execute on function public.fechar_caixa_automatico()
  to service_role;

drop trigger if exists auditoria_v3_changes on public.recebimentos_caixa_mensal;
create trigger auditoria_v3_changes
  after insert or update or delete on public.recebimentos_caixa_mensal
  for each row execute function public.registrar_auditoria_v3();

-- Cria imediatamente o caixa da competência atual com fundo zero.
select public.garantir_caixa_mensal_atual();

commit;
