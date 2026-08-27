begin;

-- Colunas usadas pelo PDV e pelo portal financeiro, mas ausentes no schema atual.
alter table public.historico_pagamentos
  add column if not exists data_vencimento date,
  add column if not exists comprovante_url text;

create index if not exists historico_pagamentos_aluno_id_idx
  on public.historico_pagamentos (aluno_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'historico_pagamentos_aluno_id_fkey'
      and conrelid = 'public.historico_pagamentos'::regclass
  ) then
    alter table public.historico_pagamentos
      add constraint historico_pagamentos_aluno_id_fkey
      foreign key (aluno_id) references public.alunos(id)
      on delete cascade not valid;
  end if;
end;
$$;

-- Funções auxiliares de autorização. SECURITY DEFINER evita recursão de RLS;
-- o search_path vazio impede troca maliciosa de objetos referenciados.
create or replace function public.cargo_atual()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.cargo
  from public.perfis p
  where p.id = auth.uid()
  limit 1
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.cargo_atual() in ('Admin', 'Direção'), false)
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.cargo_atual() in ('Admin', 'Direção', 'Professor'), false)
$$;

create or replace function public.is_guardian_of_student(p_aluno_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.alunos a
    where a.id = p_aluno_id
      and lower(trim(coalesce(auth.jwt() ->> 'email', ''))) in (
        lower(trim(coalesce(a.email_responsavel, ''))),
        lower(trim(coalesce(a.email_responsavel_2, ''))),
        lower(trim(coalesce(a.email_responsavel_3, '')))
      )
      and coalesce(auth.jwt() ->> 'email', '') <> ''
  )
$$;

create or replace function public.is_guardian_of_class(p_nome_turma text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.alunos a
    where a.turma = p_nome_turma
      and public.is_guardian_of_student(a.id)
  )
$$;

revoke all on function public.cargo_atual() from public;
revoke all on function public.is_admin() from public;
revoke all on function public.is_staff() from public;
revoke all on function public.is_guardian_of_student(bigint) from public;
revoke all on function public.is_guardian_of_class(text) from public;
grant execute on function public.cargo_atual() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.is_guardian_of_student(bigint) to authenticated;
grant execute on function public.is_guardian_of_class(text) to authenticated;

-- Pais recebem apenas primeiro nome e dia/mês dos aniversários.
create or replace function public.portal_aniversarios(p_aluno_id bigint)
returns table (categoria text, nome text, dia integer, mes integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (public.is_guardian_of_student(p_aluno_id) or public.is_staff()) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  return query
    select
      'turma'::text,
      split_part(trim(a.nome), ' ', 1),
      extract(day from a.data_nascimento)::integer,
      extract(month from a.data_nascimento)::integer
    from public.alunos origem
    join public.alunos a on a.turma = origem.turma
    where origem.id = p_aluno_id
      and a.data_nascimento is not null
      and coalesce(a.status, 'ativo') <> 'transferido'

    union all

    select
      'equipe'::text,
      split_part(trim(f.nome), ' ', 1),
      extract(day from f.data_nascimento)::integer,
      extract(month from f.data_nascimento)::integer
    from public.funcionarios f
    where f.data_nascimento is not null
      and coalesce(f.status, 'ativo') = 'ativo';
end;
$$;

-- Evita expor aos pais o JSON completo com todos os participantes do evento.
create or replace function public.portal_eventos_financeiros(p_aluno_id bigint)
returns table (id bigint, nome text, data_evento date, valor_unitario numeric)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (public.is_guardian_of_student(p_aluno_id) or public.is_staff()) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  return query
    select e.id::bigint, e.nome, e.data_evento, e.valor_unitario
    from public.eventos_controle e
    where coalesce(e.arquivado, false) = false
      and (
        coalesce(e.participantes::jsonb, '[]'::jsonb) @> jsonb_build_array(p_aluno_id)
        or coalesce(e.participantes::jsonb, '[]'::jsonb) @> jsonb_build_array(p_aluno_id::text)
      );
end;
$$;

revoke all on function public.portal_aniversarios(bigint) from public;
revoke all on function public.portal_eventos_financeiros(bigint) from public;
grant execute on function public.portal_aniversarios(bigint) to authenticated;
grant execute on function public.portal_eventos_financeiros(bigint) to authenticated;

-- Novas contas nunca devem virar Professor automaticamente.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfis (id, email, nome, cargo)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'nome', 'Novo Usuário'),
    case
      when lower(new.email) in ('diretoria@abcdopark.com', 'carlamonaliza9@gmail.com') then 'Admin'
      else 'Responsável'
    end
  )
  on conflict (id) do update
    set email = excluded.email,
        nome = coalesce(public.perfis.nome, excluded.nome);
  return new;
end;
$$;

-- Corrige perfis antigos criados pela função anterior. Um professor que também
-- seja responsável continua Professor quando possuir cadastro em funcionarios.
update public.perfis
set cargo = 'Admin'
where lower(email) in ('diretoria@abcdopark.com', 'carlamonaliza9@gmail.com');

update public.perfis p
set cargo = 'Responsável'
where p.cargo = 'Professor'
  and exists (
    select 1
    from public.alunos a
    where lower(p.email) in (
      lower(coalesce(a.email_responsavel, '')),
      lower(coalesce(a.email_responsavel_2, '')),
      lower(coalesce(a.email_responsavel_3, ''))
    )
  )
  and not exists (
    select 1
    from public.funcionarios f
    where lower(coalesce(f.email, '')) = lower(p.email)
  );

-- Corrige a função que apontava para a tabela inexistente "caixas".
create or replace function public.fechar_caixa_automatico()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.sessoes_caixa
  set status = 'fechado',
      data_fechamento = coalesce(data_fechamento, now())
  where status = 'aberto';
end;
$$;

revoke all on function public.fechar_caixa_automatico() from public, anon, authenticated;
grant execute on function public.fechar_caixa_automatico() to service_role;

-- A versão anterior apagava pagamentos/gastos e alterava o status acadêmico
-- de todos os alunos. Mantemos a função inacessível até existir rotina de
-- fechamento contábil auditável e não destrutiva.
revoke all on function public.zerar_mes_financeiro(date, date) from public, anon, authenticated;

-- Políticas permissivas são combinadas com OR. Por isso, removemos as antigas
-- antes de criar um conjunto único e coerente.
do $$
declare politica record;
begin
  for politica in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      politica.policyname,
      politica.schemaname,
      politica.tablename
    );
  end loop;
end;
$$;

do $$
declare tabela record;
begin
  for tabela in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', tabela.tablename);
  end loop;
end;
$$;

-- Perfis e cadastros centrais.
create policy perfis_select_authenticated on public.perfis
  for select to authenticated using (true);
create policy perfis_admin_manage on public.perfis
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy alunos_select_authorized on public.alunos
  for select to authenticated
  using (public.is_staff() or public.is_guardian_of_student(id));
create policy alunos_admin_manage on public.alunos
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy funcionarios_staff_select on public.funcionarios
  for select to authenticated using (public.is_staff());
create policy funcionarios_admin_manage on public.funcionarios
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Vida acadêmica.
create policy agenda_select_authorized on public.agenda_escolar
  for select to authenticated
  using (public.is_staff() or public.is_guardian_of_class(nome_turma));
create policy agenda_staff_manage on public.agenda_escolar
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy avaliacoes_select_authorized on public.avaliacoes
  for select to authenticated
  using (
    public.is_staff()
    or (coalesce(visivel_para_pais, false) and public.is_guardian_of_student(aluno_id))
  );
create policy avaliacoes_staff_manage on public.avaliacoes
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy boletins_select_authorized on public.boletins
  for select to authenticated
  using (public.is_staff() or public.is_guardian_of_student(aluno_id));
create policy boletins_staff_manage on public.boletins
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy frequencias_select_authorized on public.frequencias
  for select to authenticated
  using (public.is_staff() or public.is_guardian_of_student(aluno_id));
create policy frequencias_staff_manage on public.frequencias
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy avancos_select_authorized on public.avancos_dificuldades
  for select to authenticated
  using (public.is_staff() or public.is_guardian_of_student(aluno_id));
create policy avancos_staff_manage on public.avancos_dificuldades
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy historico_pedagogico_staff_manage on public.historico_pedagogico
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy historico_escolar_anos_select on public.historico_escolar_anos
  for select to authenticated
  using (public.is_staff() or public.is_guardian_of_student(aluno_id));
create policy historico_escolar_anos_staff_manage on public.historico_escolar_anos
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy historico_escolar_disciplinas_select on public.historico_escolar_disciplinas
  for select to authenticated
  using (
    public.is_staff()
    or exists (
      select 1 from public.historico_escolar_anos h
      where h.id = historico_ano_id
        and public.is_guardian_of_student(h.aluno_id)
    )
  );
create policy historico_escolar_disciplinas_staff_manage on public.historico_escolar_disciplinas
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- Documentação.
create policy documentos_alunos_select on public.documentos_alunos
  for select to authenticated
  using (public.is_staff() or public.is_guardian_of_student(aluno_id));
create policy documentos_alunos_staff_manage on public.documentos_alunos
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy solicitacoes_documentos_select on public.solicitacoes_documentos
  for select to authenticated
  using (public.is_staff() or public.is_guardian_of_student(aluno_id));
create policy solicitacoes_documentos_insert on public.solicitacoes_documentos
  for insert to authenticated
  with check (public.is_staff() or public.is_guardian_of_student(aluno_id));
create policy solicitacoes_documentos_update on public.solicitacoes_documentos
  for update to authenticated
  using (public.is_staff() or public.is_guardian_of_student(aluno_id))
  with check (public.is_staff() or public.is_guardian_of_student(aluno_id));
create policy solicitacoes_documentos_delete on public.solicitacoes_documentos
  for delete to authenticated
  using (public.is_staff() or public.is_guardian_of_student(aluno_id));

create policy historico_documentos_select on public.historico_documentos
  for select to authenticated
  using (public.is_staff() or public.is_guardian_of_student(aluno_id));
create policy historico_documentos_staff_manage on public.historico_documentos
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- Calendário e organização escolar.
create policy eventos_calendario_select on public.eventos_calendario
  for select to authenticated using (true);
create policy eventos_calendario_staff_manage on public.eventos_calendario
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy eventos_controle_staff_select on public.eventos_controle
  for select to authenticated using (public.is_staff());
create policy eventos_controle_admin_manage on public.eventos_controle
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy configuracao_turmas_staff_select on public.configuracao_turmas
  for select to authenticated using (public.is_staff());
create policy configuracao_turmas_admin_manage on public.configuracao_turmas
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy turma_disciplinas_staff_select on public.turma_disciplinas
  for select to authenticated using (public.is_staff());
create policy turma_disciplinas_admin_manage on public.turma_disciplinas
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy turmas_info_staff_select on public.turmas_info
  for select to authenticated using (public.is_staff());
create policy turmas_info_admin_manage on public.turmas_info
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy configuracoes_authenticated_select on public.configuracoes
  for select to authenticated using (true);
create policy configuracoes_admin_manage on public.configuracoes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Financeiro: responsáveis só leem lançamentos do próprio filho.
create policy historico_pagamentos_select on public.historico_pagamentos
  for select to authenticated
  using (public.is_admin() or public.is_guardian_of_student(aluno_id));
create policy historico_pagamentos_admin_manage on public.historico_pagamentos
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy contas_a_pagar_admin_manage on public.contas_a_pagar
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy gastos_admin_manage on public.gastos
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy sessoes_caixa_admin_manage on public.sessoes_caixa
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy movimentacoes_caixa_admin_manage on public.movimentacoes_caixa
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Logs e notificações.
create policy logs_sistema_insert_own on public.logs_sistema
  for insert to authenticated
  with check (lower(usuario_email) = lower(coalesce(auth.jwt() ->> 'email', '')));
create policy logs_sistema_admin_select on public.logs_sistema
  for select to authenticated using (public.is_admin());

create policy dispositivos_push_own on public.dispositivos_push
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Tabelas legadas ficam restritas até serem migradas/removidas.
create policy turma_legacy_admin on public."Turma"
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy mensalidade_legacy_admin on public."Mensalidade"
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Bucket privado usado pelos responsáveis. Os caminhos novos seguem:
-- solicitacoes/{aluno_id}/{arquivo}
do $$
declare politica record;
begin
  for politica in
    select policyname
    from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
  loop
    execute format('drop policy if exists %I on storage.objects', politica.policyname);
  end loop;
end;
$$;

update storage.buckets
set public = false
where id in ('documentos-alunos', 'comprovantes', 'escola_arquivos');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'escola_arquivos',
  'escola_arquivos',
  false,
  10485760,
  array['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists escola_arquivos_select on storage.objects;
drop policy if exists escola_arquivos_insert on storage.objects;
drop policy if exists escola_arquivos_update on storage.objects;
drop policy if exists escola_arquivos_delete on storage.objects;

create policy escola_arquivos_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'escola_arquivos'
    and (
      public.is_admin()
      or public.is_guardian_of_student(
        case
          when (storage.foldername(name))[2] ~ '^[0-9]+$'
          then ((storage.foldername(name))[2])::bigint
          else null
        end
      )
    )
  );

create policy escola_arquivos_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'escola_arquivos'
    and (storage.foldername(name))[1] = 'solicitacoes'
    and (
      public.is_admin()
      or public.is_guardian_of_student(
        case
          when (storage.foldername(name))[2] ~ '^[0-9]+$'
          then ((storage.foldername(name))[2])::bigint
          else null
        end
      )
    )
  );

create policy escola_arquivos_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'escola_arquivos'
    and (
      public.is_admin()
      or public.is_guardian_of_student(
        case
          when (storage.foldername(name))[2] ~ '^[0-9]+$'
          then ((storage.foldername(name))[2])::bigint
          else null
        end
      )
    )
  )
  with check (
    bucket_id = 'escola_arquivos'
    and (
      public.is_admin()
      or public.is_guardian_of_student(
        case
          when (storage.foldername(name))[2] ~ '^[0-9]+$'
          then ((storage.foldername(name))[2])::bigint
          else null
        end
      )
    )
  );

create policy escola_arquivos_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'escola_arquivos'
    and (
      public.is_admin()
      or public.is_guardian_of_student(
        case
          when (storage.foldername(name))[2] ~ '^[0-9]+$'
          then ((storage.foldername(name))[2])::bigint
          else null
        end
      )
    )
  );

create policy documentos_alunos_storage_admin on storage.objects
  for all to authenticated
  using (bucket_id = 'documentos-alunos' and public.is_admin())
  with check (bucket_id = 'documentos-alunos' and public.is_admin());

create policy comprovantes_storage_admin on storage.objects
  for all to authenticated
  using (bucket_id = 'comprovantes' and public.is_admin())
  with check (bucket_id = 'comprovantes' and public.is_admin());

create policy fotos_alunos_storage_select on storage.objects
  for select to authenticated
  using (bucket_id = 'fotos-alunos');
create policy fotos_alunos_storage_admin on storage.objects
  for all to authenticated
  using (bucket_id = 'fotos-alunos' and public.is_admin())
  with check (bucket_id = 'fotos-alunos' and public.is_admin());

create policy horarios_storage_select on storage.objects
  for select to authenticated
  using (bucket_id = 'horarios');
create policy horarios_storage_admin on storage.objects
  for all to authenticated
  using (bucket_id = 'horarios' and public.is_admin())
  with check (bucket_id = 'horarios' and public.is_admin());

create policy recibos_storage_admin on storage.objects
  for all to authenticated
  using (bucket_id = 'recibos' and public.is_admin())
  with check (bucket_id = 'recibos' and public.is_admin());

-- Views não devem contornar as novas regras de alunos.
revoke all on public.view_aniversariantes_hoje from anon, authenticated;

commit;
