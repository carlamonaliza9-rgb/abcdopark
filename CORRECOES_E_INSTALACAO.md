# Correções e instalação

## O que foi corrigido

- Proteção real das rotas com validação da sessão Supabase.
- Validação de que cada responsável só abre o portal dos próprios filhos.
- Remoção do login que consultava datas de nascimento antes da autenticação.
- Novas contas recebem o cargo `Responsável`, nunca `Professor` automaticamente.
- Avaliações exibidas aos pais respeitam `visivel_para_pais` e o ano atual.
- Boletins e mensalidades deixaram de usar o ano fixo de 2026 no portal familiar.
- Campos da ficha familiar foram alinhados aos nomes existentes no banco.
- Documentos dos responsáveis passam a usar bucket privado e links temporários.
- Remoção das chamadas para `mensalidades`, `saidas` e `taxas_eventos`, que não existem.
- Inclusão de `data_vencimento` e `comprovante_url` no histórico financeiro.
- Remoção do segundo modelo Prisma, que não correspondia ao banco real do sistema.
- APIs de diagnóstico sem autenticação foram removidas.
- Notificações manuais exigem usuário da equipe; o cron exige `CRON_SECRET`.
- `middleware.ts` foi migrado para `proxy.ts`, conforme o Next.js 16.
- O arquivo `versel.json` foi corrigido para `vercel.json`.

## Antes de publicar

1. Faça um backup do projeto e do banco no Supabase.
2. No Supabase, abra **SQL Editor > New query**.
3. Abra `supabase/migrations/20260826_security_and_parent_portal.sql`.
4. Copie todo o conteúdo, cole no SQL Editor e clique em **Run** uma única vez.
5. Execute também `supabase/migrations/20260826_financial_consistency.sql`.
6. Configure na Vercel as variáveis listadas em `.env.example`.
7. Gere um valor longo e aleatório para `CRON_SECRET`.
8. Publique o projeto e execute os testes abaixo.

A migração roda dentro de uma transação: se uma instrução falhar, nenhuma alteração
daquele processamento é confirmada. Ela substitui as políticas RLS conflitantes,
portanto deve ser aplicada em um horário controlado.

## Testes obrigatórios

- Admin: alunos, turmas, diário, documentos, financeiro, PDV e encerramento de caixa.
- Professor: turmas, diário, frequência, avaliações e pareceres.
- Responsável com um filho: todas as páginas do portal.
- Responsável com dois filhos: troca entre os portais e agenda correta de cada turma.
- Tentar abrir manualmente o ID de um aluno de outra família; o acesso deve ser negado.
- Confirmar que avaliação com `visivel_para_pais = false` não aparece.
- Quitar uma mensalidade no PDV e conferir o resultado no portal familiar.
- Enviar e abrir um documento pela ficha do responsável.
- Testar a notificação de turma e o cron de lembrete.

## Nova regra de acesso dos responsáveis

O responsável cria a conta com o mesmo e-mail registrado na ficha do aluno e escolhe
uma senha com pelo menos oito caracteres. A data de nascimento não é mais consultada
nem utilizada para criar contas automaticamente. Contas antigas continuam existindo,
mas é recomendado solicitar redefinição de senha para quem ainda usa data de nascimento.

## Horário do cron

A Vercel interpreta cron em UTC. O horário `0 20 * * 1-5` corresponde a 17h em
Fortaleza/Brasília durante o horário padrão.
