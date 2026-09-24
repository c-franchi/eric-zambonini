# Eric Zambonini — migração para Sites

Este é o novo projeto independente do Lovable e do Supabase. A aplicação antiga continua intacta em `c-franchi/Agendaaipro` enquanto os fluxos faltantes são reconstruídos e validados.

## Estado atual

- Home responsiva com fotos e identidade do projeto original.
- Serviços, horários de atendimento e reservas gravados no banco D1 do Site.
- Bloqueio de reservas concorrentes em intervalos de 15 minutos por índice único.
- Gestão privada de serviços, expediente e agenda, restrita ao proprietário.
- A aplicação está privada e em validação. Não divulgar a clientes nesta etapa.

## Próximas etapas antes da operação

1. Configurar autenticação pública de clientes com Google OAuth, validar o fluxo de autorização suportado pelo Sites e vincular identidade a cada reserva. Definir redirecionamento após login para o painel do cliente.
2. Migrar painel do cliente: próximos atendimentos, histórico, cancelamento e perfil, com autorização por identidade em cada operação.
3. Migrar painel administrativo completo: edição de serviços, exceções e bloqueios, configurações, portfólio e gestão de usuários.
4. Migrar pagamentos Pix, comprovantes, regras de confirmação e cancelamento; verificar se há webhook/provedor externo ainda necessário.
5. Migrar chat e notificações, com alternativa adequada para mensagens e entrega de e-mails.
6. Integrar uploads (R2), revisar PWA, política de privacidade e testes de telas pequenas.
7. Testar cadastro/login, autorização cruzada, conflitos de agenda e pagamento em ambiente de teste antes de tornar público.
8. Desconectar a sincronização Git do Lovable, retirar sua publicação e só então excluir os recursos Supabase exclusivos deste projeto. Manter backup do repositório.

Os horários e preços não foram inventados: o proprietário cadastra os serviços e o expediente no painel privado.
