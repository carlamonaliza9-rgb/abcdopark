-- Consulta somente de leitura para validar as correções da varredura.
select
  'bucket_documentos' as verificacao,
  case
    when exists (select 1 from storage.buckets where id = 'documentos') then 'ok'
    else 'ausente'
  end as resultado

union all

select
  'permissao_upload_documentos',
  case
    when exists (
      select 1
      from pg_policies
      where schemaname = 'storage'
        and tablename = 'objects'
        and policyname = 'documentos_storage_professor_insert'
        and cmd = 'INSERT'
    ) then 'ok'
    else 'ausente'
  end;
