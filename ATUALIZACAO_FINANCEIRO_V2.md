# Atualização financeira V2

Esta atualização:

- faz o portal dos responsáveis usar o status real do financeiro administrativo;
- corrige a transferência que consultava uma coluna inexistente;
- separa `data_vencimento` de `data_pagamento` nas novas mensalidades;
- mantém intactos os valores e os meses já marcados como pagos.

## Aplicação

1. Pare o servidor com `Ctrl + C`.
2. Extraia o ZIP sobre a pasta atual `abc-do-park`, permitindo substituir arquivos.
3. No Supabase SQL Editor, execute uma vez o arquivo
   `supabase/migrations/20260826_financial_consistency.sql`.
4. No PowerShell, apague apenas o cache `.next` e execute `npm run build`.
5. Execute `npm run dev` e teste o financeiro dos pais e a transferência.

O SQL não altera os status nem os valores pagos. Ele apenas preenche os vencimentos
e remove datas de pagamento de cobranças que continuam sem recebimento.
