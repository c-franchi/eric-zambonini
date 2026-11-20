# Modelo AgendaAÍ para profissionais — versão 1

A instalação Eric é a primeira configuração do mesmo modelo reutilizável. Seus dados, domínio, arquivos, sessão Google, recursos e configurações de Pix foram preservados. O plano inicial de compatibilidade é Premium, com todos os módulos atuais.

## Planos e liberação

- Agenda: agenda, clientes, serviços, conversas e portfólio.
- Gestão e Vendas: todos os anteriores, financeiro, loja/vendas e estoque de produtos.
- Premium: mesmas ferramentas de Gestão e Vendas e serviço inicial de personalização/conteúdo conforme escopo comercial. Não inclui produção mensal de conteúdo.
- Personalização da apresentação e edição pelo profissional estão disponíveis em todos os planos.
- Premium inclui insumos por serviço, conclusão com baixa e margem estimada. Gestão e Premium incluem caixa de receitas e despesas. Consulte `docs/gestao-completa.md`.

`/admin/assinatura` apresenta o plano e as ferramentas. Somente as contas `platformAdminEmails` em `config/installation.json`, autenticadas com Google, podem aplicar um plano. A alteração exige origem válida, justificativa e deixa histórico em `settings` (`license_audit:*`). Os administradores do profissional não podem liberar o próprio plano. Mudanças de plano preservam os registros existentes e bloqueiam telas e APIs de módulos não incluídos. Nenhum menu de agendamento/pagamento básico necessário ao atendimento é tratado como relatório financeiro premium.

Não existe cobrança automática nem conexão de pagamento com o funil. O operador confirma a contratação/pagamento e libera o plano nesta instalação. Cada cliente tem uma instalação independente; não há um banco compartilhado entre profissionais nem um painel central de todos os clientes nesta versão.

## Identidade

`config/brand.json` guarda a identidade inicial. `/admin/identidade` permite editar nome, apresentação, logos, capa, contatos e links, com persistência no banco. O perfil já existente continua sendo respeitado. A configuração é usada na página inicial, logos das páginas, painel, metadados, manifesto PWA, WhatsApp e links de notificações. Pix e remetente de e-mail continuam em seus formulários próprios. Imagens podem ser informadas por link HTTPS ou caminho de arquivo já disponibilizado no site; o upload de portfólio existente continua disponível.

## Gerar uma instalação limpa

Crie um JSON fora do repositório:

```json
{
  "installationId": "novo-profissional",
  "name": "Nome do negócio",
  "adminEmail": "cliente@example.com",
  "platformAdminEmail": "operador@example.com",
  "plan": "agenda",
  "siteUrl": "https://novo-profissional.example.com",
  "whatsapp": "5511999999999"
}
```

Execute no checkout do modelo:

```sh
node scripts/create-client-template.mjs --config /caminho/cliente.json --out /workspace/sites/novo-profissional
```

O destino deve ser novo e fora da instalação original. O gerador copia apenas as pastas/fontes necessárias e migrações. Não copia Git, ID do Site, dados D1/R2, arquivos enviados, imagens/ícones do Eric, credenciais, configurações de Pix, remetentes, arquivos de ambiente ou arquivos de versões antigas. Inclui ícones neutros, nenhuma foto e nenhum serviço cadastrado. Configura apenas os e-mails explicitamente fornecidos, o plano escolhido e uma identidade inicial neutra. Não publica nem cria cobrança.

Para colocar o novo cliente no ar, registrar um NOVO projeto Sites, persistir o novo project_id, provisionar D1/R2 próprios, aplicar todas as migrações e configurar credenciais próprias de sessão e Google. Autorizar o novo domínio no Google. Configurar Pix, identidade e integrações específicas. Nunca reutilizar o project_id, banco, bucket ou segredo de sessão do Eric. Fazer o build e a publicação pelo fluxo oficial Sites.

## Verificação

```sh
node scripts/test-admin-navigation.mjs
node scripts/test-plans.mjs
node scripts/test-inventory.mjs
node scripts/test-client-template.mjs
node node_modules/typescript/bin/tsc --noEmit --incremental false
```

Os testes de planos usam banco em memória, contas fictícias/configuradas e renderizam o shell administrativo real para os três planos. O teste de template cria uma instalação isolada, aplica todas as migrações em banco vazio, verifica ausência de registros, referências ao acesso/domínio original e executa tipos e testes na cópia. Não altera o banco de produção.
