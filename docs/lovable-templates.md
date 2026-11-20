# Leitura do projeto no Lovable e criação de templates

## Fonte e escopo

Use `c-franchi/eric-zambonini`, branch `main`, como referência do sistema profissional. O código foi importado da versão 74 do Sites, commit `f022a4f81b0888a9ae587d13262a906bc79ec074`, preservando o histórico. Os repositórios comerciais AgendaAÍ são projetos separados.

## Mapa das fontes

| Caminho | Conteúdo |
| --- | --- |
| `app/` | Páginas, painel administrativo e rotas de API |
| `components/`, `hooks/`, `lib/` | Componentes, comportamento compartilhado e regras |
| `config/` | Identidade, instalação, planos e PWA |
| `db/`, `drizzle/` | Modelo de dados e migrações SQL |
| `scripts/` | Geração de clientes, instalação, execução, build e verificações |
| `build/`, `vite.config.ts` | Integração do build com o ambiente Sites/Cloudflare |
| `public/` | Recursos da instalação original |
| `template-assets/` | Recursos neutros para novas instalações |
| `docs/modelo-profissionais.md` | Planos, permissões e instruções do gerador |
| `docs/gestao-completa.md`, `docs/estoque.md` | Regras dos módulos de gestão e estoque |
| `package.json`, `pnpm-lock.yaml` | Comandos, dependências e versões |

## Gerar uma base limpa

Siga o JSON de exemplo em `docs/modelo-profissionais.md` e execute:

```sh
node scripts/create-client-template.mjs --config /caminho/cliente.json --out /caminho/novo-cliente
```

O gerador cria uma pasta independente, com código, scripts, migrações e identidade neutra. Não reutilize o projeto Sites, domínio, administradores, segredos, banco ou uploads do Eric para outros clientes. O código das integrações está no repositório; dados de produção, credenciais de runtime e conteúdo armazenado em D1/R2 não são fornecidos pelo checkout.

## Orientação para o Lovable

Leia os arquivos reais antes de implementar. Preserve os fluxos e regras de planos, autorização, agenda, clientes, serviços, financeiro, vendas, estoque e personalização conforme o código. Use o gerador como referência de separação entre clientes e as verificações existentes como critérios de regressão.

Este projeto usa Vinext e rotas de servidor com recursos Cloudflare. Não trate o checkout como uma aplicação Vite somente de frontend. Antes de adaptar ao ambiente de destino, mapeie banco D1, bucket R2, sessões, login Google, Pix, notificações e demais integrações utilizadas. Documente o que será mantido e o que exige adaptação. A leitura deste repositório não comprova importação, execução ou publicação no Lovable.

Os scripts externos do serviço de hospedagem, dependências instaladas e infraestrutura do provedor não são parte do código versionado. Alterações futuras no Sites precisam ser transferidas novamente ao GitHub; não há sincronização automática configurada por esta consolidação.
