# Insumos, conclusão de serviços e caixa

Disponível no template padrão e nesta instalação. Gestão e Premium possuem caixa; Premium também possui insumos e margem por serviço. A licença é verificada no servidor e no menu.

## Operação

1. Em Insumos e serviços, cadastrar o material em ml, g ou unidades e seu custo de referência por unidade (reais, até 2 decimais). Não informar o custo da embalagem como custo de 1 ml. Registrar o saldo inicial como ajuste de entrada.
2. Registrar entradas, perdas e ajustes com justificativa. A compra atualiza o custo de referência; ela não representa automaticamente um pagamento de despesa.
3. Vincular um ou mais materiais ao serviço e definir o consumo por atendimento (até três decimais).
4. Após realizar o atendimento, selecionar a reserva e confirmar o consumo. A operação registra receita e custos do serviço e baixa os materiais numa única transação. Saldo insuficiente desfaz toda a conclusão. Pagamento não é confirmado por essa ação.
5. Para corrigir, estornar a conclusão com motivo. O estoque é devolvido uma única vez. Se o material foi efetivamente gasto, registrar a perda antes de concluir novamente. Agendamentos concluídos não podem mudar serviço, data, preço ou ser cancelados até o estorno. Histórico com consumo não é excluído automaticamente.
6. No Financeiro, registrar despesas pagas e receitas manuais com data, categoria e referência. Corrigir lançamentos manuais por estorno, sem apagar o histórico.

## Caixa e resultado

- Novos pagamentos confirmados em atendimentos, vendas e encomendas entram no caixa pela data da confirmação no sistema. Repetir confirmação não duplica a receita.
- Pagamentos anteriores à ativação não são recriados, pois não existe data confiável de recebimento. Podem ser lançados manualmente com referência, sem duplicar os novos recebimentos automáticos.
- Cancelamento não afirma que houve reembolso. A devolução efetiva de dinheiro deve ser registrada como saída, categoria Reembolso, com a referência do recebimento. Receitas automáticas não podem ser apagadas pelo formulário.
- Caixa mensal = entradas menos saídas registradas; não é saldo bancário. Resumo de atendimentos usa a data do agendamento, diferente da data de caixa.
- Margem estimada = valor do serviço concluído menos os materiais registrados naquela conclusão. Custos históricos permanecem iguais quando o cadastro muda. Não é lucro líquido: não inclui mão de obra, impostos, aluguel e outros custos.
- Sem materiais vinculados, a confirmação informa explicitamente custo de materiais zero. Serviços com preço a combinar precisam do valor definido antes da conclusão.

## Segurança e validação

Migração aditiva 0020, sem apagar dados ou inventar histórico. Triggers garantem consumo transacional, estoque não negativo, uma conclusão ativa por agendamento, devolução única e registro único de recebimento. APIs autenticadas, autorização por plano, mesma origem e validação de valores no servidor. Todas as tabelas novas são exportadas vazias no template.

`node scripts/test-management.mjs`: migrações em SQLite, consumo/rollback, repetição, custos históricos, cancelamento, estorno e caixa.
`node scripts/test-plans.mjs`: autorização, servidor, menu e formulários.
`node scripts/test-client-template.mjs`: template isolado, sem dados ou acessos do Eric.

Preview visual depende do daemon de preview. Não realizar testes com dados de clientes em produção.
