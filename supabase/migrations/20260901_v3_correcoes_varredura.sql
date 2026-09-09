begin;

-- Garante a existência do bucket legado usado nas justificativas de faltas.
-- Em instalações existentes, as configurações atuais do bucket são preservadas.
insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', true)
on conflict (id) do nothing;

-- Professores e gestores acadêmicos podem anexar comprovantes de justificativa.
-- O nome do arquivo é sempre único e o fluxo não sobrescreve arquivos existentes.
drop policy if exists documentos_storage_professor_insert on storage.objects;
create policy documentos_storage_professor_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'documentos'
    and public.tem_permissao('academico.gerenciar')
  );

commit;
