# ABC do Park — V3 de segurança (prévia)

Esta versão foi preparada para teste separado. Ela não deve ser publicada diretamente sem validar os perfis de acesso e executar os testes abaixo.

## O que a V3 muda

- Centraliza autorização por cargo e permissão, sem liberar acessos por endereço de e-mail.
- Protege no servidor as áreas administrativas, pedagógicas, financeiras e de usuários.
- Substitui senhas mestras fixas pela senha da própria conta de quem executa a ação.
- Obriga os responsáveis já existentes a trocarem a senha no próximo acesso.
- Registra, em `auditoria_v3`, valores anteriores e posteriores de alterações críticas.
- Arquiva fichas de alunos em vez de apagar o cadastro e seu histórico.
- Desativa a função antiga “Zerar mês”, que apagava pagamentos em massa.
- Mantém as telas administrativa e dos pais usando `historico_pagamentos` como fonte financeira única.

## Matriz inicial de acesso

| Cargo | Acesso principal |
|---|---|
| Admin | Todas as áreas, usuários e exclusões críticas |
| Direção | Gestão escolar, acadêmico, documentos, financeiro e auditoria; sem exclusão financeira permanente |
| Secretaria | Alunos, documentos, consultas acadêmicas e comunicação |
| Financeiro | Consultas, lançamentos e estornos financeiros |
| Professor | Turmas, frequência, avaliações, alunos e comunicação |
| Auxiliar | Consultas acadêmicas, alunos e documentos |
| Responsável | Somente o portal dos próprios filhos |
| Somente Leitura | Consultas internas, sem alterações |

## Garantia de preservação

A migração `20260827_v3_roles_audit_and_passwords.sql`:

- não apaga alunos, pagamentos, notas, documentos ou funcionários;
- não altera valores financeiros;
- não executa transferência de alunos;
- adiciona colunas, funções, permissões, políticas e auditoria;
- marca responsáveis existentes para troca de senha.

Mesmo assim, faça um backup do Supabase e mantenha a versão V2 publicada até concluir a homologação.

## Instalação segura em homologação

1. Crie uma cópia do projeto Supabase ou use um projeto de teste.
2. Copie para esse projeto apenas a estrutura necessária e dados fictícios.
3. Preserve seu `.env` fora do ZIP. Nunca envie chaves em captura de tela.
4. Instale as dependências:

   ```powershell
   npm install
   ```

5. Execute as verificações locais:

   ```powershell
   npm run check:v3
   npm run build:v3
   ```

6. No SQL Editor do Supabase de homologação, execute uma única vez:

   ```text
   supabase\migrations\20260827_v3_roles_audit_and_passwords.sql
   ```

7. Execute a consulta somente de leitura:

   ```text
   supabase\validation\20260827_v3_preflight.sql
   ```

8. Inicie localmente:

   ```powershell
   npm run dev
   ```

## Testes obrigatórios antes da produção

- Admin: acessar todas as áreas, alterar o cargo de outro usuário e não conseguir alterar o próprio cargo.
- Direção: acessar gestão e auditoria, sem ver comandos exclusivos de exclusão financeira.
- Secretaria: cadastrar e editar aluno, sem acessar exclusões ou gestão de usuários.
- Financeiro: lançar e estornar cobrança, conferindo a atualização no portal dos pais.
- Professor: acessar somente as próprias funções pedagógicas.
- Auxiliar: consultar sem editar avaliações.
- Responsável: trocar a senha e enxergar somente os próprios filhos.
- Somente Leitura: navegar nas consultas sem botões de alteração.
- Auditoria: verificar se uma edição gera registro com `dados_antes` e `dados_depois`.
- Financeiro: confirmar que “Zerar mês” não apaga nada.
- Alunos: confirmar que “Arquivar” retira a ficha da lista ativa sem apagar o histórico.

## Publicação

Somente depois dos testes, publique o código em um branch separado, faça o deploy de prévia na Vercel e repita os testes. A migração deve ser aplicada na produção em uma janela de manutenção, com o backup confirmado.

Se houver erro no SQL, não execute novamente nem improvise alterações. Guarde a mensagem completa do erro para análise.
