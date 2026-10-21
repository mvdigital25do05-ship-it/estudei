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

## Etapa 2: primeira versão implementada (branch de desenvolvimento)

- Modelo de tópico atualizado com campos **opcionais**, para manter compatibilidade com perfis já gravados:
  - `examPriority`: A/B/C de incidência do edital; ausência significa não classificado;
  - `examPrioritySource`: indicação da origem da classificação;
  - `learningPhase`: escolha manual opcional (base, consolidacao, dominio).
- `src/studyStrategy.ts`: diagnóstico puro por tópico, que lê os históricos existentes sem regravá-los; compara blocos recentes de até aproximadamente 50 questões, requer pelo menos 20 para autoavaliação robusta e não duplica registros entre listas de atividades e exercícios.
- `DisciplinasList.tsx`: controles de prioridade no edital e fase por tópico, usando a persistência atual.
- `StudyIntelligence.tsx`: recomendações por tópico e indicadores de fase, incidência e urgência pessoal separados.
- `tests/studyStrategy.test.ts`: regressões cobrindo desempenho, amostra insuficiente, temas com IDs repetidos em matérias distintas e separação entre importância e fraqueza.

### Restrições conhecidas da Etapa 2

1. A prioridade do edital depende de **fonte validada**. Não há classificação A/B/C automaticamente inventada para tópicos já cadastrados.
2. O campo de fase é opcional; caso ausente, é calculado pelo desempenho recente ou, quando a amostra é insuficiente, pelo marcador de conclusão já existente.
3. Exercícios antigos não registram se cada questão era inédita. O algoritmo não presume essa condição.
4. Esta etapa é **compatível** com o armazenamento anterior: o plano ainda contém listas agregadas de históricos no Firestore.
5. Não há migração para subcoleções, nem alteração de regras de acesso, nem gravação dos dados privados via GitHub. A normalização será executada em etapa independente, com backup real validado e migração reversível.
6. As sugestões são heurísticas configuráveis, não uma previsão confiável de nota de corte ou garantia de aprendizagem.

### Verificações

- `npm run lint`
- `npm test`
- `npm run build`
- Revisão manual do seletor de prioridade/fase e confirmação do salvamento/recarga dos campos no ambiente de teste autenticado.

## Etapa 3: importação não destrutiva + questões + Anki (branch)

### Importador de edital

- `src/outlineImport.ts`: aceita tabela TSV copiada de planilha ou JSON com `rows`. Cada linha possui `discipline`, `topic`, `subtopic` (opcional) e `priority` (A/B/C opcional).
- Origem/versão da classificação deve ser informada; o sistema **não verifica** automaticamente se a lista corresponde integralmente ao edital.
- A mesclagem é calculada localmente (prévia). Confirmação exige declarar que foi realizado backup prévio.
- Disciplinas e tópicos com nomes normalizados iguais reutilizam os mesmos identificadores. Não se apagam questões, horas, históricos, fases, nem o estado de conclusão já registrado.
- Importar duas vezes a mesma lista é idempotente. Se houver nomes ambíguos ou prioridades conflitantes, a importação é bloqueada.
- Uma edição realizada pela importação ainda é armazenada no documento legado do perfil; antes de importar listas grandes, conferir limites do Firestore e a exportação de backup.

**O que falta:** elaborar e auditar uma matriz completa e atualizada do Anexo VIII do Edital TJSP 02/2026. O importador está pronto para recebê-la, mas a base não foi preenchida com supostos tópicos completos ou classificações sem conferência.

### Registro de questões e flashcards

- Campos `examBoard`, `isNewQuestions` e `createdAtMs` para novos blocos de questões.
- Formulário permite diferenciar questões inéditas das repetidas, inclusive para não presumir retrospectivamente a origem das questões dos registros antigos.
- Corrigida a associação entre registro e ID do novo tópico.
- Para blocos com pelo menos um erro: causa principal, pergunta curta e resposta para **um flashcard por bloco**.
- `src/ankiExport.ts` prepara texto UTF-8 TSV com instruções de importação para Anki e etiquetas por disciplina, tópico e banca, descartando duplicatas e entradas incompletas.
- A exportação é feita localmente no navegador; não envia questões ou cartões a serviços externos.
- Os cartões permanecem dentro dos registros de exercícios do perfil **até existir uma migração segura para um banco de erros individualizado**. Portanto, ainda se aplicam os limites do documento legado.

### Segurança e validação

- Executar `npm ci`, `npm run lint`, `npm test`, `npm run build`.
- Testes unitários de importação, duplicidades, preservação de IDs, prioridades, exportação e rejeição de cartões inválidos.
- Realizar teste manual de exportação real do Firestore, importação em perfil de teste, recarga de dados e importação no Anki antes de publicação.
- Não alterar o projeto Firebase de produção nem integrar o PR à `main` antes de validação manual.
