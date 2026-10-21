# Estudei 2.0 — Homologação visual (etapa 11)

## Objetivo e isolamento

Os testes automatizados de interface usam uma **tela de dados fictícios**,
sem login e sem gravação em Firestore. Ela só aparece em ambiente de
desenvolvimento Vite se a variável `VITE_ESTUDEI_UI_TESTS=true` estiver
definida **e** a URL contiver `?ui-test=1`.

A versão compilada para produção (`import.meta.env.PROD`) não ativa essa
rota. Nenhum dado pessoal, acesso, login ou backup é usado nessa suíte.

Arquivos:
- `src/UiTestHarness.tsx`: dashboard, distribuição de questões e formulário
  de A/B/C montados com apenas dois componentes disciplinares sintéticos.
- `src/main.tsx`: guarda explícita para habilitação exclusiva de Vite DEV.
- `tests-ui/dashboard.spec.mjs`: quatro cenários por tipo de tela.
- `playwright.config.mjs`: Chromium em desktop e emulação de celular.
- `.github/workflows/ui-smoke.yml`: instalação de dependências, execução
  em CI e artefatos de relatórios com capturas das duas interfaces.

## Cobertura atual: 8 casos

Em **desktop e celular**, os testes verificam:
1. Painel com mapa por disciplina, cobertura por tópico, distribuição
   oficial da prova e métricas com denominadores declarados.
2. Filtros por incidência e tópicos ainda não classificados; ação para
   iniciar sessão a partir da recomendação.
3. Importação A/B/C exige backup confirmado antes de gravar.
   Classificações são revisadas antes de alterar tópicos.
4. Grupos genéricos da planilha não geram correspondência automática.
5. A largura das seções respeita a janela, inclusive em celular.

Capturas e relatório podem ser abertos na página da execução do workflow,
na área **Artifacts**, item `estudei2-interface-testes`.

## Executar localmente em desenvolvimento

Com Node.js 22:

```bash
npm ci
npm install --no-save --package-lock=false @playwright/test@1.56.1
npx playwright install chromium
npx playwright test --config playwright.config.mjs
```

Não substituir os dados fictícios por backups reais. A configuração de testes
não solicita credenciais nem faz deploy.

## O que ainda não foi homologado

- O ciclo de autenticação real, persistência e troca de perfis por navegador;
- O upload de arquivos CSV reais que contenham delimitadores/acentos
  heterogêneos em dispositivos reais;
- O salvamento e a recuperação em **Firebase de homologação distinto da
  produção**, inclusive com quedas de rede e duas abas;
- Navegação assistiva e inspeção visual humana das capturas;
- O texto definitivo de retificações do edital e seus pesos.

A aprovação da suíte visual não substitui validação com pessoas,
acessibilidade auditada ou teste de integração do Firebase real.
