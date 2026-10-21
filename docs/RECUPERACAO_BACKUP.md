# Estudei 2.0 — Recuperação de backup (etapa 9)

## Entregas implementadas

- O formato de backup v3 inclui **cada caderno individual de erros**
  junto dos perfis e seus históricos, com checksum SHA-256.
- `src/backupRecovery.ts` monta um plano de **cópia não destrutiva**:
  cada perfil recuperado recebe um novo identificador e o título
  `(recuperado)`. Os IDs internos de disciplinas, tópicos e logs são
  preservados; os erros individuais mantêm seus IDs e status, mas passam
  a indicar o ID do novo perfil.
- A preparação não copia metadados pessoais da conta (nome, e-mail
  e configurações da autenticação). Ela não escreve no Firestore.
- `BackupButton` agora exibe a **prévia de elegibilidade** dos planos
  após a verificação do backup, com contagens de questões e erros.
  A interface continua somente leitura; não existe botão de restauração
  em nuvem nesta etapa.

## Condições de recusa

O planejador interrompe a recuperação quando:
1. O arquivo não é **v3** com **SHA-256 verificado**.
2. O ID de destino é inválido, repete o ID de origem ou a origem não existe.
3. Há campos desconhecidos ou obrigatórios inválidos no perfil/erro.
4. Algum histórico excede os limites das regras Firestore.
5. O documento do perfil supera um limite de tamanho estimado de
   **750 KB**, conservador diante do máximo de 1 MiB do Firestore.
6. Existem mais de **400 erros** no perfil, o que exige restauração
   segmentada e procedimento específico.

Um checksum bem-sucedido detecta alteração do conteúdo **desde sua
geração**, mas não comprova que o arquivo tenha sido criado por uma fonte
confiável. O backup deve ser mantido privado pelo usuário.

## Homologação no emulador

Os testes unitários de `tests/backupRecovery.test.ts` verificam:
- integridade obrigatória, rejeição de v1/v2, rejeição de campos inesperados;
- preservação de progresso, históricos, identidade interna dos tópicos
  e status dos cartões;
- não modificação do backup de origem.

Em `tests/firestore.rules.emulator.test.mjs`, um teste adicional usa o
**projeto fictício** `demo-estudei-tjsp` para:
1. Criar plano e erro no emulador, registrar atividades/questões.
2. Exportar um backup v3 e preparar uma cópia com novo ID.
3. Gravar a cópia no emulador respeitando as regras reais do projeto.
4. Verificar exercício, atividade e flashcard recuperados.
5. Verificar o plano **original intacto** e a proibição de acesso de outro
   usuário à cópia.

Essa simulação prova que o formato da cópia é aceito pelas regras; ela
não implementa um fluxo de restauração transacional completo.

## Antes de habilitar restauração na interface de produção

- Validar identidade do usuário e gerar ID de destino aleatório.
- Confirmar que o ID de destino **não existe** no banco antes da gravação.
- Evitar restauração parcial se houver falha intermediária.
  Preferir preparação transacional ou procedimento reexecutável com
  marcador de progresso, validação final e recuperação de falhas.
- Confirmar que a interface não mostrará planos incompletos.
- Testar restauração de grandes cadernos com paginação.
- Validar a aplicação em um **projeto Firebase de homologação separado**
  e no banco nomeado; testar também duas abas/dispositivos.
- Criar um backup real novo antes de qualquer restauração e manter o
  original fora do GitHub.

**Não foi feito acesso, importação nem escrita no Firebase de produção.**
O PR continua em rascunho, sem merge em `main`.

## Etapa seguinte: restauração atômica em código (ainda não ativada)

O módulo `src/atomicRecovery.ts` implementa
`restoreBackupAtomically(db, authenticatedUid, backup, sourceProfileId)`:

1. Prepara e valida um plano v3 íntegro e gera ID aleatório para destino.
2. Faz leitura transacional do novo ID e **recusa qualquer colisão**.
3. Cria, em **uma transação Firestore**, o novo plano e todos os erros
   individuais associados. O limite já existente de 400 erros permanece.
4. Se a transação falhar, nenhuma criação daquele grupo é confirmada.
   Planos anteriores e dados da conta não são alterados.

Para que o mesmo commit seja aceito sem relaxar a segurança, a regra da
subcoleção passa a exigir `existsAfter()` para o documento de perfil pai,
em vez de `exists()`. Isso permite validar a existência do pai **após**
a transação; continua recusando registros órfãos.

**Testes incluídos:** atomicidade de perfil + notas, rejeição de falta
de permissão sem criação, preservação do original e rejeição de erro sem
perfil pai, no Firestore Emulator. Há também verificação da operação no
banco nomeado com Authentication Emulator.

**Limitações importantes:** a operação ainda não foi exposta como ação
no aplicativo para usuários reais, não executa recuperação no projeto
Firebase de produção e não substitui a validação final num projeto
homologado separado. Transações possuem limites da plataforma e exigem
rede; a interface futura deverá mostrar confirmação específica e atualizar
os planos **somente após** a gravação confirmada.

O uso real depende de publicação segura das novas regras no banco nomeado
correto e autorização explícita para a operação.
