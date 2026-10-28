# Controle de estoque da loja

Esta atualização estende a loja existente do Site atual. Não utiliza o banco da versão Lovable antiga nem copia dados para outro cliente.

- Produtos mantêm cadastro, fotos, pedidos, reservas e política de encomendas.
- Custo unitário de referência e estoque mínimo começam em zero, sem alterar saldos existentes.
- O painel `/admin/estoque` registra compras/entradas, perdas e conferência de saldo disponível, com justificativa.
- Cada operação tem identificador único. Repetir uma requisição não repete a alteração do saldo.
- O histórico começa na publicação. Registros antigos não são reconstruídos nem inventados.
- Alterações de saldo feitas pelos fluxos existentes de pedidos, cancelamentos e catálogo aparecem como movimentações do sistema. Esses registros não afirmam qual pedido ou usuário causou a mudança.
- Compras não são lançadas automaticamente como despesas financeiras nesta etapa. O custo é referência da última compra ou configuração do cadastro, não custo médio contábil.
- Ocultar/publicar um produto altera apenas visibilidade. Editar dados sem mudar a quantidade preserva reservas feitas enquanto o formulário estava aberto. Um ajuste de quantidade concorrente é rejeitado, sem sobrescrever uma venda.
- O acesso usa a autenticação Google e a autorização administrativa já existentes. Não foram criadas contas nem novos meios de login.

## Validação

`node scripts/test-inventory.mjs` testa a migração em SQLite isolado, preservação dos saldos, histórico inicial vazio, entradas, perdas, conferência, repetição de operações, rollback por insuficiência, captura das reservas e devoluções e edição concorrente do catálogo. Não usa dados de clientes nem o banco publicado.

Build com o helper oficial Sites. A checagem global de tipos já tem pendências em chat, pedidos de cliente, vitrine e auth; os arquivos novos e alterados deste módulo não adicionam erros.

## Próximas etapas

Consumo de insumos por serviço, encerramento de atendimentos com baixa de materiais, caixa de despesas e ligação com planos/assinaturas são módulos separados. A cobrança automática do funil deve aguardar validação de entrega e configuração segura de implementação e mensalidade. Não cobrar pelos módulos ainda não entregues.
