# V3 — registro de alterações

## Correções da varredura — 01/09/2026

- A rota antiga de contas a pagar agora abre a tela unificada de saídas sem erro 404.
- Favoritos antigos em `/admin/financeiro/contas-a-pagar` continuam funcionando.
- Professores e gestores acadêmicos passam a poder anexar comprovantes de justificativas de faltas.
- A migração da permissão é transacional, repetível e acompanhada por consulta de validação.

## Caixa mensal automático — 01/09/2026

- Um único caixa é criado para cada mês-calendário no horário de Brasília.
- O caixa do mês inicia automaticamente com fundo de R$ 0,00.
- A virada encerra o mês anterior e abre o novo mês sem intervenção manual.
- Cada baixa ou estorno é registrado pela data real da operação, independentemente da competência da mensalidade.
- A abertura e o fechamento manuais foram retirados do PDV.
- O histórico permite selecionar qualquer caixa mensal e consultar pagamentos, estornos, total líquido e movimentos detalhados.
- Todos os meses entre o primeiro pagamento preservado e o mês atual passam a ter caixa próprio, inclusive meses zerados; os movimentos são reconstruídos pelas datas reais sem modificar os pagamentos originais.

## Segurança e acesso

- Matriz central de oito cargos e dezoito permissões.
- Verificação de permissão no servidor para áreas sensíveis.
- Menus filtrados conforme o cargo.
- Remoção dos e-mails privilegiados embutidos no código.
- Remoção das senhas mestras fixas.
- Reautenticação de ações críticas com a senha da própria conta.
- Bloqueio da alteração do próprio cargo na gestão de usuários.
- Seleção de todos os cargos na tela de usuários.

## Dados e auditoria

- Nova tabela `auditoria_v3` com estado anterior e posterior.
- Gatilhos de auditoria em cadastros, financeiro, acadêmico e documentos.
- Fichas de alunos arquivadas, sem exclusão em cascata.
- Exclusão total de pagamentos do mês desativada.
- Responsáveis existentes marcados para troca obrigatória de senha.

## Validação executada

- Testes de segurança: 9 aprovados, 0 falhas.
- TypeScript: aprovado sem erros.
- ESLint dos novos módulos de segurança: aprovado sem erros.
- Build de produção do Next.js 16: aprovado com 36 páginas.

## Escopo da próxima etapa

- Tela dedicada de consulta à `auditoria_v3` com filtros.
- Fluxos de estorno exclusivamente por RPC transacional no banco.
- Recuperação visual de fichas arquivadas.
- Testes de navegador por perfil com dados fictícios.
- Alertas de inadimplência e agenda configuráveis.
