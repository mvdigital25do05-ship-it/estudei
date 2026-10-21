# Estudei 2.0 — Homologação de segurança do Firestore

## O que está automatizado

O teste `tests/firestore.rules.emulator.test.mjs` executa operações reais
da SDK Firestore contra **emulador local com projeto fictício**
(`demo-estudei-tjsp`). Usa `@firebase/rules-unit-testing` para criar
identidades simuladas, conforme a documentação oficial do Firebase.

Verifica:
1. Dono cria, lê, **lista**, atualiza e exclui seus erros individuais;
2. Outro usuário autenticado não lê/escreve o caderno do dono;
3. Visitante sem login não consulta os erros;
4. Erro cujo perfil pai não existe é rejeitado;
5. IDs e vínculos inconsistentes são bloqueados;
6. Campos obrigatórios, tamanhos e valores inválidos são rejeitados;
7. Campos imutáveis não podem ser substituídos;
8. E-mail da conta e ID do plano não podem ser adulterados;
9. Caminhos não previstos permanecem privados.
10. Backup JSON v3 gerado por leitura efetiva do Firestore Emulator
    inclui o caderno individual e valida o SHA-256 sem acessar produção.

Os testes são independentes dos 48 testes unitários e da compilação
do aplicativo. A execução é feita pelo workflow
`.github/workflows/firestore-emulator.yml`.

## Execução local (isolada)

Pré-requisitos: Node.js 22, Java 21, dependências npm instaladas.

```bash
npm ci
npm install --no-save --package-lock=false @firebase/rules-unit-testing@5.0.2 firebase-tools@14.27.0
./node_modules/.bin/firebase emulators:exec \
  --config firebase.emulator.json \
  --project demo-estudei-tjsp \
  --only firestore \
  'node --test tests/firestore.rules.emulator.test.mjs'
```

**O projeto `demo-` não é o Firebase da sua conta.** Nunca substituir por
identificador da conta real nesses comandos de homologação.

## ATENÇÃO: banco de dados NOMEADO na aplicação

`src/firebase.ts` escolhe o banco por meio de
`firebase-applet-config.json.firestoreDatabaseId`, que atualmente não é
`(default)`. Portanto, ele é **um banco nomeado**.

O emulador configurado em `firebase.emulator.json` avalia as regras do
banco **padrão de teste**. A aprovação é necessária, **mas insuficiente**
para afirmar que as regras de produção já protegem o banco nomeado.

Conforme documentação Firebase, bancos nomeados criados implicitamente
pelo emulador podem aceitar acessos sem regras: NÃO utilizar o sucesso
de testes do banco padrão como prova de isolamento para o banco nomeado.

Exigências antes de publicar:
- Identificar no console Firebase o **banco nomeado usado pelo app**;
- Examinar suas regras atuais com acesso de administrador autorizado;
- Validar e implantar regras especificamente no banco correto em um
  **projeto de homologação próprio**, não de produção;
- Repetir leitura, listagem, criação, edição e exclusão para contas A e B,
  usando no app de teste o mesmo padrão de banco nomeado;
- Verificar se a exclusão do plano bloqueia corretamente subcoleções
  existentes; testar backup v3, exportação Anki e recarga da página;
- Verificar o mínimo de privilégios e **não sobrescrever** regras de
  outros projetos/bancos.

### Risco de deploy

A presença de `firestore.rules` no GitHub não equivale a implantar as
regras. Não executar comandos de deploy sobre banco real sem confirmação
do ID do projeto, ID do banco, backup e autorização explícita.

## Ensaio de exportação de backup com dados simulados

O sétimo caso de integração lê a conta fictícia, o perfil e a subcoleção
de erros do emulador, monta `createBackup()` e confere `inspectBackup()`.
Garante que o backup v3 contém o cartão e tem checksum verificado.

Isso **não** representa recuperação/restauração de backup em conta real
nem um teste do banco nomeado de produção.

## Critérios de aceite

- [ ] Workflow `Homologar regras Firestore` verde.
- [ ] Workflow `Verificar Estudei` verde.
- [ ] Testes em homologação de banco NOMEADO verde.
- [ ] Backup v3 real em perfil de teste com erros incluídos e SHA-256 validado.
- [ ] Teste de duas contas e recuperação de dados concluídos.
- [ ] Revisão das condições de conflito entre abas/dispositivos.
- [ ] Só então planejar merge e eventual publicação mediante autorização.

Documentação: https://firebase.google.com/docs/firestore/security/test-rules-emulator
e https://firebase.google.com/docs/emulator-suite/connect_firestore

## Novo teste de segurança do banco nomeado (emulador)

A aplicação seleciona um banco Firestore **nomeado**, não `(default)`.
Foi adicionado `firebase.named.emulator.json` e um teste com o SDK modular
real em `tests/firestore.named.emulator.test.mjs` que conecta ao mesmo ID
de banco sob projeto `demo-estudei-tjsp`, completamente fictício.

O teste tenta ler um plano e um erro e escrever uma conta **sem login**.
Todas as três operações devem falhar com `permission-denied`. Esse é um
teste de **negação**: se o Firebase CLI criar implicitamente o banco com
regras abertas, o teste obrigatoriamente falhará e bloqueará o merge.

Nos testes de integração, a configuração com **múltiplos bancos em array**
não carregou as regras no Firebase CLI testado e abriu o banco simulado.
O teste de negação detectou essa falha. Para validar o banco nomeado,
`firebase.named.emulator.json` configura **apenas aquele banco**.
Os testes do banco padrão permanecem em um processo separado, com
`firebase.emulator.json`. Nenhuma regra foi relaxada para fazer os
testes passarem.

Esta verificação **não comprova** que regras equivalentes estejam
implantadas no banco nomeado real, nem substitui testes positivos de
leitura/gravação por usuários autenticados no ambiente de homologação
com seu próprio projeto Firebase.

## Troca segura de planos de estudo

`src/profilePersistence.ts` captura o estado de estudo atual, mantendo
ID, nome e metadados do plano. O botão de troca agora aguarda a gravação
do plano de origem, na fila sequencial de Firestore, **antes** de carregar
o plano de destino. Erro de gravação bloqueia a troca, sem apagar dados.
Essa mitigação evita perder edições feitas antes de completar os 600 ms
de debounce do salvamento automático.

Limitação: outras abas/dispositivos podem continuar escrevendo no
mesmo documento. Uma estratégia de detecção de conflito entre clientes
será necessária antes de anunciar sincronização multi-dispositivo.

## Status da homologação

- Matriz do banco padrão: testes de proprietário, isolamento e backup v3.
- Matriz do banco nomeado: teste separado negando três operações anônimas.
- O fluxo é executado no GitHub Actions com projeto `demo-`; não exige
  chaves de produção nem permissão de administrador no Firebase real.
- Teste completo de usuário autenticado no banco nomeado de homologação
  continua como condição de publicação.

## Teste adicional: proprietário autenticado em banco nomeado

A suíte `tests/firestore.named.emulator.test.mjs` agora possui duas
verificações distintas sobre o mesmo ID de banco usado pelo app, mas no
projeto `demo-estudei-tjsp`:

1. Um cliente sem login deve receber `permission-denied` ao tentar ler
   planos, consultar erros ou criar uma conta.
2. Com Firebase Authentication **também emulado**, uma identidade fictícia
   cria conta, plano e um erro individual no banco nomeado; em seguida,
   lê e lista o caderno. O mesmo usuário não deve acessar um perfil
   pertencente a outra identidade, e deve perder acesso após logout.

A suíte compara o ID do banco de `firebase.named.emulator.json` com
`firebase-applet-config.json.firestoreDatabaseId` e falha caso diverjam.
É uma homologação com autenticação simulada, não uma verificação das
regras publicadas no Firebase real.

O fluxo de CI usa `firebase-tools@15.17.0` e executa os dois ambientes
do emulador separadamente para impedir que a configuração experimental de
múltiplos bancos abra o acesso.
