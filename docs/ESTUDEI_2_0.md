# Estudei 2.0 — plano técnico da fundação

## Objetivo
Evoluir o aplicativo existente sem apagar registros do usuário e sem alterar a branch `main` antes de validação. O produto final recomendará **teoria, questões ou revisão** com base na importância do conteúdo no edital e no domínio demonstrado do estudante.

## Levantamento inicial (20/10/2026)

- Front-end em React 19 + TypeScript + Vite + Tailwind CSS 4.
- Firebase Authentication e Cloud Firestore (ver `src/firebase.ts`).
- Modelos centrais em `src/types.ts` e dados iniciais em `src/data.ts`.
- Há componentes de painel, disciplinas, planejamento, simulados, inteligência de estudos e exportação de backup.
- Perfis em `users/{userId}/profiles/{profileId}` contêm listas `exerciseLogs`, `activityLogs`, `disciplines`, etc.
- Regras atuais limitam `exerciseLogs` e `activityLogs` a 1000 elementos por perfil e exigem identidade do usuário para as leituras e escritas.
- O salvamento automático em `src/App.tsx` usa `setDoc` com debounce de 600 ms; devem ser feitos testes de alternância entre perfis, erros de conexão, salvamentos concorrentes e leitura logo após login.
- O componente `StudyIntelligence.tsx` já fornece prioridades A/B/C **de necessidade pessoal de revisão**. Isso não é a mesma classificação de incidência no edital.

**Importante:** o acesso ao código no GitHub não dá acesso aos registros privados armazenados no Firestore.

## Etapa 1: preservação de dados

### Implementado nesta branch
- Exportação v2 do backup com checksum SHA-256 quando o navegador oferece Web Crypto.
- Leitura e validação local de arquivos JSON de backup, sem importação/restauração.
- Compatibilidade de leitura com backups v1 existentes.
- Verificações de estrutura, IDs duplicados, IDs inconsistentes e integridade do checksum.
- Aviso quando listas de históricos estão próximas dos limites do modelo atual.

### Testes de aceitação
1. Exportar o backup autenticado, guardar o arquivo **fora do GitHub**.
2. Selecionar o mesmo arquivo em "Verificar backup": esperar estrutura válida e, em contexto seguro, integridade verificada.
3. Conferir as contagens de perfis, registros e questões.
4. Verificar que um backup v1 antigo informa a ausência de checksum, mas continua válido.
5. Testar JSON inválido e arquivo com alteração manual do conteúdo: o sistema deve rejeitar ou sinalizar erro.
6. Garantir que a verificação não altera nenhum dado do Firestore.
7. Executar `npm ci`, `npm run lint` e `npm run build`.

Nenhuma restauração automática foi implementada. Futuras migrações terão modo de pré-visualização, backup prévio e estratégia de reversão.

## Etapa 2: evolução do modelo

Proposta a validar:
- `examContents`: disciplina / tópico / subtópico / recorte edital / prioridade edital A-B-C / peso estimado / versão da fonte;
- `studySessions`: data, tópico, tipo (teoria, questões, revisão, lei seca, simulado), duração;
- `questionBatches`: tópico, banca, período, quantidade, acertos, erros, condição inédita/repetida;
- `errorNotes`: origem da questão, classificação do erro, conceito corrigido, referência opcional, status do cartão;
- `studyTopicProgress`: fase da aprendizagem, últimas questões, média móvel, data da última revisão.

Separar:
- **Prioridade do edital (A/B/C)**: frequência/importância histórica da banca, independentemente do usuário;
- **Urgência de estudo (A/B/C)**: necessidade individual, derivada de desempenho, cobertura e revisões.

Os novos registros devem ser armazenados em coleções separadas ou estrutura paginada após teste de migração dos perfis legados. Identificadores existentes não devem ser alterados silenciosamente.

## Critérios de segurança e produto
- Jamais armazenar backups privados no repositório público.
- Não mesclar na `main` sem CI e verificação manual da exportação.
- Preservar o login e o isolamento dos perfis.
- Não contar as mesmas questões duas vezes (há sobreposição potencial entre activityLogs e exerciseLogs).
- Priorizar questões recentes e inéditas nos diagnósticos de domínio; amostras pequenas devem ser identificadas como insuficientes.
- Mudanças futuras no conteúdo do edital devem ser versionadas, sem reescrever históricos antigos.
