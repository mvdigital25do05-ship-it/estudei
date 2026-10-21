import { test, expect } from '@playwright/test';

const PATH='/?ui-test=1';

test.beforeEach(async ({page})=>{
  await page.goto(PATH);
  await expect(page.getByRole('heading',{name:'Homologação visual — dados fictícios'})).toBeVisible();
});

test('dashboard renders syllabus evidence without fictional grades',async({page})=>{
  await expect(page.getByRole('heading',{name:'Seu mapa de preparação'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Cobertura por disciplina'})).toBeVisible();
  await expect(page.getByText('1 de 4 tópicos marcados como concluídos')).toBeVisible();
  await expect(page.getByText('3 tópicos sem classificação de incidência')).toBeVisible();
  await expect(page.getByText('Peso dos blocos na prova objetiva')).toBeVisible();
  await expect(page.getByText('Direito (6 matérias)')).toBeVisible();

  const progress=page.getByRole('progressbar',{name:'Cobertura de Direito Penal'});
  await expect(progress).toHaveAttribute('aria-valuenow','50');
  await expect(page.getByRole('progressbar',{name:'Cobertura de Informática'}))
    .toHaveAttribute('aria-valuenow','0');
  await expect(page.getByText('Sem amostra suficiente')).toBeVisible();
  await expect(page.getByRole('heading',{name:'Fila inteligente de estudos'})).toBeVisible();

  await page.getByRole('button',{name:'Sem classificação'}).click();
  await expect(page.getByText('3 tópico(s) neste filtro')).toBeVisible();
  await page.getByRole('button',{name:'Incidência A'}).click();
  await expect(page.getByText('1 tópico(s) neste filtro')).toBeVisible();
  await page.getByRole('button',{name:'Todas',exact:true}).click();
  await page.getByRole('button',{name:'Estudar este tópico'}).first().click();
  await expect(page.getByRole('status',{name:'Última ação'}))
    .toContainText('Abrir estudo: penal/');
});

test('ABC import requires explicit backup confirmation and preserves other topics',async({page})=>{
  const source=page.getByRole('textbox',{name:/Origem da análise/});
  const table=page.getByRole('textbox',{name:/Tabela com Disciplina/});
  await source.fill('Pesquisa simulada para teste');
  await table.fill([
    'Disciplina\tABC\tAssunto\tRecorte',
    'Direito Penal\tB\tPeculato\tCP 312',
    'Direito Penal\tA\tConcussão\tCP 316',
  ].join('\n'));
  await page.getByRole('button',{name:'Revisar correspondências'}).click();
  await expect(page.getByText('2 assuntos lidos · 2 correspondência(s) selecionada(s)')).toBeVisible();
  await expect(page.getByText(/2 classificação\(ões\) para gravar/)).toBeVisible();
  const apply=page.getByRole('button',{name:'Aplicar classificações selecionadas'});
  await expect(apply).toBeDisabled();
  await page.getByRole('checkbox',{name:/Já exportei um backup JSON/}).check();
  await expect(apply).toBeEnabled();
  await apply.click();
  await expect(page.getByRole('status',{name:'Última ação'})).toContainText('Prioridades aplicadas: 2');
  await expect(page.getByText('2 tópicos sem classificação de incidência')).toBeVisible();
  await page.getByRole('button',{name:'Incidência A'}).click();
  await expect(page.getByText('1 tópico(s) neste filtro')).toBeVisible();
  await expect(page.getByText('Concussão',{exact:true}).first()).toBeVisible();
});

test('ambiguous ABC topics are not linked automatically',async({page})=>{
  await page.getByRole('textbox',{name:/Origem da análise/}).fill('Dados fictícios');
  await page.getByRole('textbox',{name:/Tabela com Disciplina/}).fill([
    'Disciplina\tABC\tAssunto',
    'Direito Penal\tA\tCrimes funcionais em geral',
  ].join('\n'));
  await page.getByRole('button',{name:'Revisar correspondências'}).click();
  await expect(page.getByText('1 assuntos lidos · 0 correspondência(s) selecionada(s)')).toBeVisible();
  await page.getByRole('checkbox',{name:/Já exportei um backup JSON/}).check();
  await expect(page.getByRole('button',{name:'Aplicar classificações selecionadas'})).toBeDisabled();
});

test('layout remains usable at desktop or mobile screen widths',async({page},testInfo)=>{
  await expect(page.getByRole('heading',{name:'Seu mapa de preparação'})).toBeVisible();
  const sections=page.locator('main section');
  await expect(sections.first()).toBeVisible();
  await page.screenshot({
    path:testInfo.outputPath('estudei-2-visual.png'),
    fullPage:true,
    animations:'disabled',
  });
  // Check panel container bounds, not incidental scrollable tables.
  const oversized=await sections.evaluateAll(nodes=>nodes
    .filter(n=>{
      const rect=n.getBoundingClientRect();
      return rect.left< -3 || rect.right>window.innerWidth+3;
    })
    .map(n=>n.getAttribute('aria-labelledby')||n.className));
  expect(oversized).toEqual([]);
});
