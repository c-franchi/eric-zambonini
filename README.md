# Eric Zambonini — código completo e base para templates

Este repositório contém o código da versão 74 do Sites e seu histórico original. Para reutilização no Lovable, comece pelo [guia de templates](docs/lovable-templates.md) e pelo [modelo de profissionais](docs/modelo-profissionais.md). Os scripts estão em `scripts/`, com migrações em `drizzle/` e recursos de build em `build/`.

A aplicação usa React, TypeScript, Vinext e Cloudflare D1/R2. A adaptação ao ambiente do Lovable exige avaliar as integrações de servidor, autenticação, banco e armazenamento. A transferência ao GitHub não configura sincronização automática com o Sites.

## Registro histórico da migração inicial

O texto abaixo descreve o começo da migração, não o estado atual de publicação ou a lista atual de funcionalidades.

# Eric Zambonini — migração para Sites

Este é o novo projeto independente do Lovable e do Supabase. A aplicação antiga continua intacta em `c-franchi/Agendaaipro` enquanto os fluxos faltantes são reconstruídos e validados.

## Estado atual

- Home responsiva com fotos e identidade do projeto original.
- Serviços, horários de atendimento e reservas gravados no banco D1 do Site.
- Bloqueio de reservas concorrentes em intervalos de 15 minutos por índice único.
- Gestão privada de serviços, expediente e agenda, restrita ao proprietário.
- Login com Google em teste: ID token validado no servidor, sessão segura por cookie e agendamentos vinculados ao identificador Google da conta.
- A aplicação está privada e em validação. Não divulgar a clientes nesta etapa.

## Próximas etapas antes da operação

1. Testar o login Google com contas de teste no Site privado, validar abertura do painel, persistência da sessão, isolamento dos agendamentos e saída. Liberar acesso público somente depois das demais funções.
2. Migrar painel do cliente: próximos atendimentos, histórico, cancelamento e perfil, com autorização por identidade em cada operação.
3. Migrar painel administrativo completo: edição de serviços, exceções e bloqueios, configurações, portfólio e gestão de usuários.
4. Migrar pagamentos Pix, comprovantes, regras de confirmação e cancelamento; verificar se há webhook/provedor externo ainda necessário.
5. Migrar chat e notificações, com alternativa adequada para mensagens e entrega de e-mails.
6. Integrar uploads (R2), revisar PWA, política de privacidade e testes de telas pequenas.
7. Testar cadastro/login, autorização cruzada, conflitos de agenda e pagamento em ambiente de teste antes de tornar público.
8. Desconectar a sincronização Git do Lovable, retirar sua publicação e só então excluir os recursos Supabase exclusivos deste projeto. Manter backup do repositório.

Os horários e preços não foram inventados: o proprietário cadastra os serviços e o expediente no painel privado.
