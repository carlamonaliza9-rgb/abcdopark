begin;

-- V3: perfis são a única fonte de verdade para autorização.
alter table public.perfis
  add column if not exists ativo boolean not null default true,
  add column if not exists troca_senha_obrigatoria boolean not null default false;

update public.perfis
set cargo = 'Somente Leitura'
where lower(trim(coalesce(cargo, ''))) = 'visitante';

-- Responsáveis antigos devem trocar senhas potencialmente baseadas em data de nascimento.
update public.perfis
set troca_senha_obrigatoria = true
where cargo = 'Responsável';

create table if not exists public.permissoes_cargos (
  cargo text not null,
  permissao text not null,
  created_at timestamptz not null default now(),
  primary key (cargo, permissao)
);

alter table public.permissoes_cargos enable row level security;
drop policy if exists permissoes_cargos_select on public.permissoes_cargos;
create policy permissoes_cargos_select on public.permissoes_cargos
  for select to authenticated using (true);

revoke all on public.permissoes_cargos from anon;
grant select on public.permissoes_cargos to authenticated;

insert into public.permissoes_cargos (cargo, permissao)
values
  ('Admin', 'painel.admin'),
  ('Admin', 'usuarios.gerenciar'),
  ('Admin', 'alunos.visualizar'),
  ('Admin', 'alunos.gerenciar'),
  ('Admin', 'alunos.excluir'),
  ('Admin', 'academico.visualizar'),
  ('Admin', 'academico.gerenciar'),
  ('Admin', 'documentos.visualizar'),
  ('Admin', 'documentos.gerenciar'),
  ('Admin', 'funcionarios.visualizar'),
  ('Admin', 'funcionarios.gerenciar'),
  ('Admin', 'financeiro.visualizar'),
  ('Admin', 'financeiro.gerenciar'),
  ('Admin', 'financeiro.estornar'),
  ('Admin', 'financeiro.excluir'),
  ('Admin', 'fechamento.executar'),
  ('Admin', 'auditoria.visualizar'),
  ('Admin', 'notificacoes.enviar'),
  ('Direção', 'painel.admin'),
  ('Direção', 'alunos.visualizar'),
  ('Direção', 'alunos.gerenciar'),
  ('Direção', 'academico.visualizar'),
  ('Direção', 'academico.gerenciar'),
  ('Direção', 'documentos.visualizar'),
  ('Direção', 'documentos.gerenciar'),
  ('Direção', 'funcionarios.visualizar'),
  ('Direção', 'funcionarios.gerenciar'),
  ('Direção', 'financeiro.visualizar'),
  ('Direção', 'financeiro.gerenciar'),
  ('Direção', 'financeiro.estornar'),
  ('Direção', 'fechamento.executar'),
  ('Direção', 'auditoria.visualizar'),
  ('Direção', 'notificacoes.enviar'),
  ('Secretaria', 'painel.admin'),
  ('Secretaria', 'alunos.visualizar'),
  ('Secretaria', 'alunos.gerenciar'),
  ('Secretaria', 'academico.visualizar'),
  ('Secretaria', 'documentos.visualizar'),
  ('Secretaria', 'documentos.gerenciar'),
  ('Secretaria', 'funcionarios.visualizar'),
  ('Secretaria', 'notificacoes.enviar'),
  ('Financeiro', 'painel.admin'),
  ('Financeiro', 'alunos.visualizar'),
  ('Financeiro', 'financeiro.visualizar'),
  ('Financeiro', 'financeiro.gerenciar'),
  ('Financeiro', 'financeiro.estornar'),
  ('Financeiro', 'documentos.visualizar'),
  ('Professor', 'academico.visualizar'),
  ('Professor', 'academico.gerenciar'),
  ('Professor', 'alunos.visualizar'),
  ('Professor', 'documentos.visualizar'),
  ('Professor', 'notificacoes.enviar'),
  ('Auxiliar', 'academico.visualizar'),
  ('Auxiliar', 'alunos.visualizar'),
  ('Auxiliar', 'documentos.visualizar'),
  ('Somente Leitura', 'painel.admin'),
  ('Somente Leitura', 'alunos.visualizar'),
  ('Somente Leitura', 'academico.visualizar'),
  ('Somente Leitura', 'documentos.visualizar'),
  ('Somente Leitura', 'funcionarios.visualizar'),
  ('Somente Leitura', 'financeiro.visualizar')
on conflict (cargo, permissao) do nothing;

create or replace function public.tem_permissao(p_permissao text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    exists (
      select 1
      from public.perfis p
      join public.permissoes_cargos pc on pc.cargo = p.cargo
      where p.id = auth.uid()
        and coalesce(p.ativo, true)
        and pc.permissao = p_permissao
    ),
    false
  )
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    exists (
      select 1
      from public.perfis p
      where p.id = auth.uid()
        and coalesce(p.ativo, true)
        and p.cargo in ('Admin', 'Direção')
    ),
    false
  )
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.tem_permissao('academico.visualizar')
      or public.tem_permissao('painel.admin')
$$;

revoke all on function public.tem_permissao(text) from public;
grant execute on function public.tem_permissao(text) to authenticated;

-- Contas novas nunca recebem privilégios por endereço de e-mail.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfis (id, email, nome, cargo, ativo, troca_senha_obrigatoria)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'nome', 'Novo Usuário'),
    'Responsável',
    true,
    false
  )
  on conflict (id) do update
    set email = excluded.email,
        nome = coalesce(public.perfis.nome, excluded.nome);
  return new;
end;
$$;

create or replace function public.concluir_troca_senha()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Sessão inválida' using errcode = '42501';
  end if;

  update public.perfis
  set troca_senha_obrigatoria = false
  where id = auth.uid();
end;
$$;

revoke all on function public.concluir_troca_senha() from public, anon;
grant execute on function public.concluir_troca_senha() to authenticated;

create table if not exists public.auditoria_v3 (
  id bigint generated always as identity primary key,
  usuario_id uuid,
  usuario_email text,
  operacao text not null,
  tabela text not null,
  registro_id text,
  dados_antes jsonb,
  dados_depois jsonb,
  created_at timestamptz not null default now()
);

create index if not exists auditoria_v3_tabela_created_idx
  on public.auditoria_v3 (tabela, created_at desc);
create index if not exists auditoria_v3_usuario_created_idx
  on public.auditoria_v3 (usuario_id, created_at desc);

alter table public.auditoria_v3 enable row level security;
drop policy if exists auditoria_v3_select on public.auditoria_v3;
create policy auditoria_v3_select on public.auditoria_v3
  for select to authenticated
  using (public.tem_permissao('auditoria.visualizar'));

revoke all on public.auditoria_v3 from anon, authenticated;
grant select on public.auditoria_v3 to authenticated;

create or replace function public.registrar_auditoria_v3()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  antes jsonb;
  depois jsonb;
  registro text;
begin
  antes := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end;
  depois := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end;
  registro := coalesce(depois ->> 'id', antes ->> 'id');

  insert into public.auditoria_v3 (
    usuario_id,
    usuario_email,
    operacao,
    tabela,
    registro_id,
    dados_antes,
    dados_depois
  ) values (
    auth.uid(),
    auth.jwt() ->> 'email',
    tg_op,
    tg_table_name,
    registro,
    antes,
    depois
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

do $$
declare
  tabela_nome text;
begin
  foreach tabela_nome in array array[
    'alunos',
    'perfis',
    'funcionarios',
    'historico_pagamentos',
    'gastos',
    'contas_a_pagar',
    'sessoes_caixa',
    'movimentacoes_caixa',
    'boletins',
    'frequencias',
    'avaliacoes',
    'documentos_alunos',
    'solicitacoes_documentos'
  ] loop
    if to_regclass(format('public.%I', tabela_nome)) is not null then
      execute format('drop trigger if exists auditoria_v3_changes on public.%I', tabela_nome);
      execute format(
        'create trigger auditoria_v3_changes after insert or update or delete on public.%I for each row execute function public.registrar_auditoria_v3()',
        tabela_nome
      );
    end if;
  end loop;
end;
$$;

-- Perfis: cada usuário lê o próprio perfil; gestores de usuários leem todos.
drop policy if exists perfis_select_authenticated on public.perfis;
drop policy if exists perfis_admin_manage on public.perfis;
drop policy if exists perfis_select_v3 on public.perfis;
drop policy if exists perfis_admin_manage_v3 on public.perfis;
create policy perfis_select_v3 on public.perfis
  for select to authenticated
  using (id = auth.uid() or public.tem_permissao('usuarios.gerenciar'));
create policy perfis_admin_manage_v3 on public.perfis
  for all to authenticated
  using (public.tem_permissao('usuarios.gerenciar'))
  with check (public.tem_permissao('usuarios.gerenciar'));

-- Financeiro e cadastros deixam de depender de e-mails especiais.
drop policy if exists historico_pagamentos_select on public.historico_pagamentos;
drop policy if exists historico_pagamentos_admin_manage on public.historico_pagamentos;
drop policy if exists historico_pagamentos_select_v3 on public.historico_pagamentos;
drop policy if exists historico_pagamentos_manage_v3 on public.historico_pagamentos;
create policy historico_pagamentos_select_v3 on public.historico_pagamentos
  for select to authenticated
  using (
    public.tem_permissao('financeiro.visualizar')
    or public.is_guardian_of_student(aluno_id)
  );
create policy historico_pagamentos_manage_v3 on public.historico_pagamentos
  for all to authenticated
  using (public.tem_permissao('financeiro.gerenciar'))
  with check (public.tem_permissao('financeiro.gerenciar'));

drop policy if exists contas_a_pagar_admin_manage on public.contas_a_pagar;
drop policy if exists contas_a_pagar_manage_v3 on public.contas_a_pagar;
create policy contas_a_pagar_manage_v3 on public.contas_a_pagar
  for all to authenticated
  using (public.tem_permissao('financeiro.gerenciar'))
  with check (public.tem_permissao('financeiro.gerenciar'));

drop policy if exists gastos_admin_manage on public.gastos;
drop policy if exists gastos_manage_v3 on public.gastos;
create policy gastos_manage_v3 on public.gastos
  for all to authenticated
  using (public.tem_permissao('financeiro.gerenciar'))
  with check (public.tem_permissao('financeiro.gerenciar'));

drop policy if exists sessoes_caixa_admin_manage on public.sessoes_caixa;
drop policy if exists sessoes_caixa_manage_v3 on public.sessoes_caixa;
create policy sessoes_caixa_manage_v3 on public.sessoes_caixa
  for all to authenticated
  using (public.tem_permissao('financeiro.gerenciar'))
  with check (public.tem_permissao('financeiro.gerenciar'));

drop policy if exists movimentacoes_caixa_admin_manage on public.movimentacoes_caixa;
drop policy if exists movimentacoes_caixa_manage_v3 on public.movimentacoes_caixa;
create policy movimentacoes_caixa_manage_v3 on public.movimentacoes_caixa
  for all to authenticated
  using (public.tem_permissao('financeiro.gerenciar'))
  with check (public.tem_permissao('financeiro.gerenciar'));

commit;
