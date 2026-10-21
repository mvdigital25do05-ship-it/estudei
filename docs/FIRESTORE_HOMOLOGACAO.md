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
