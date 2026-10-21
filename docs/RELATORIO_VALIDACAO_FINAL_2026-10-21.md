# Estudei 2.0: parecer técnico de pré-publicação (21/10/2026)

**Estado: publicação pendente de homologação.** Código disponível na PR #2 em rascunho.

## Auditoria realizada
- Revisão do salvamento em debounce, fila de gravações e operações de perfil.
- Revisão de backup v3, recuperação em cópia e regras Firestore.
- Testes de unidade, TypeScript e compilação no GitHub Actions.
- Testes de integração com Firebase Emulator nos bancos padrão e nomeado.
- Testes de interface em Chromium desktop e mobile, com dados simulados.

## Correções realizadas nesta rodada
- **Criação de plano:** primeiro confirma gravação do perfil anterior e criação remota do novo; depois troca a tela. Em erro, não perde o contexto atual.
- **Renomeação:** agora persiste inclusive planos inativos antes de fechar o editor.
- **Backup:** bloqueia exportação enquanto o salvamento automático estiver agendado, em andamento ou apresentar erro.
- **Cronômetro:** usa atualização funcional dos registros, para preservar lançamentos consecutivos.

## O que ainda impede a publicação
- Ambiente Firebase de homologação efetivamente conectado e configurado, distinto do ambiente atualmente usado.
- Testes do aplicativo autenticado, com troca de planos, recuperação, importação, duas sessões abertas e quedas de conexão.
- Estratégia de conflitos em dispositivos/abas simultâneas: atualmente a gravação por documento usa arrays e a fila sequencial só atua dentro da sessão.
- Conferência manual das capturas, acessibilidade e eventuais retificações do edital TJSP.
- Backup conferido e aprovação explícita para integração e deploy.

**Decisão:** não mesclar à main, nem publicar ou alterar as regras de produção nesta etapa.

Os testes automatizados verificam apenas o que suas suítes cobrem e não substituem homologação real.
