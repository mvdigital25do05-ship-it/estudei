import React from 'react';
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import syllabus from './data/tjsp2026.json';
import { Discipline, Topic } from './types';
import { getMainTopicProgress, getNodeStats, getNodeTopics, getTopicGroups, setContentCompletion } from './topicGroups';
import StudyTopicsTree from './components/StudyTopicsTree';
import StudyTopicOptions from './components/StudyTopicOptions';

const disciplines: Discipline[] = syllabus.disciplines.map(d => ({ ...d, icon: 'book', topics: d.topics.map(t => ({ ...t, completed: t.id === 'tjsp_LP_026' })), topicsTotal: d.topics.length, topicsDone: 0, timeSpentMin: 0, correctAnswers: 0, wrongAnswers: 0 }));

test('agrupa as 287 unidades uma vez, preservando IDs, nomes e conclusões', () => {
  let count = 0;
  for (const d of disciplines) {
    const original = JSON.stringify(d);
    const topics = getTopicGroups(d).flatMap(getNodeTopics);
    assert.equal(topics.length, d.topics.length);
    assert.equal(new Set(topics.map(t => t.id)).size, d.topics.length);
    for (const t of topics) assert.equal(t, d.topics.find(source => source.id === t.id));
    assert.equal(JSON.stringify(d), original);
    count += topics.length;
  }
  assert.equal(count, 287);
});

test('Excel contém apenas seus 11 assuntos e as leis ficam como referência sem nível intermediário', () => {
  const inf = getTopicGroups(disciplines.find(d => d.id === 'tjsp_INF')!);
  const excel = inf.find(g => g.name === 'Excel')!;
  assert.equal(getNodeTopics(excel).length, 11);
  assert.deepEqual(getNodeTopics(excel).map(t => t.id).sort(), Array.from({ length: 11 }, (_, i) => `tjsp_INF_${String(i + 18).padStart(3, '0')}`).sort());
  const internal = getTopicGroups(disciplines.find(d => d.id === 'tjsp_LI')!);
  const eproc = internal.find(g => g.name.includes('eproc'))!;
  assert.equal(eproc.reference, 'Resolução TJSP nº 963/2025');
  assert(eproc.children!.every(child => !!child.topic && !child.children));
  assert.equal(getNodeTopics(eproc).length, 3);
  assert.equal(inf[0].name, 'Windows');
});

test('conclusão em grupo preserva totais de horas e assuntos fora do grupo', () => {
  const d = { ...disciplines.find(d => d.id === 'tjsp_INF')!, timeSpentMin: 500 };
  const ids = getNodeTopics(getTopicGroups(d).find(g => g.name === 'Excel')!).map(t => t.id);
  const updated = setContentCompletion(d, ids, true);
  assert.equal(updated.topicsDone, 11);
  assert.equal(updated.topicsTotal, 40);
  assert.equal(updated.timeSpentMin, 500);
  assert.equal(d.topics.filter(t => t.completed).length, 0);
  assert(updated.topics.filter(t => !ids.includes(t.id)).every(t => !t.completed));
});

test('horas antigas de um grupo são contadas uma vez, sem rateio nos assuntos', () => {
  const d = disciplines.find(d => d.id === 'tjsp_LP')!;
  const group = getTopicGroups(d).find(g => g.name === 'Leitura e interpretação')!;
  const activities: any[] = [{ id: 'a', disciplineName: d.name, timeSpentMin: 60, coverageTopicIds: ['tjsp_LP_001','tjsp_LP_002'] }, { id: 'b', disciplineName: d.name, timeSpentMin: 20, topicId: 'tjsp_LP_001' }];
  assert.equal(getNodeStats(group, activities, [], d.id, d.name).minutes, 80);
  const leaf = group.children!.find(g => g.id === 'tjsp_LP_001')!;
  assert.equal(getNodeStats(leaf, activities, [], d.id, d.name).minutes, 20);
});

test('preserva assuntos personalizados em seu grupo e conteúdos de outros cargos', () => {
  const d = disciplines.find(d => d.id === 'tjsp_INF')!;
  const excel = getTopicGroups(d).find(g => g.name === 'Excel')!;
  const custom: Topic = { id: 'custom', name: 'Novo assunto Excel', completed: false, studyGroupId: excel.id };
  const updated = { ...d, topics: [...d.topics, custom] };
  assert(getNodeTopics(getTopicGroups(updated).find(g => g.name === 'Excel')!).includes(custom));
  const fiscal = { ...d, id: 'fiscal' };
  assert.equal(getTopicGroups(fiscal).length, fiscal.topics.length);
});

test('renderiza títulos, leis, subtópicos numerados e opções com os IDs originais', () => {
  const d = disciplines.find(d => d.id === 'tjsp_INF')!;
  const html = renderToStaticMarkup(<StudyTopicsTree discipline={d} activities={[]} exercises={[]} onSetCompletion={() => {}} onRename={() => {}} onDelete={() => {}} onAdd={() => {}} onToggleSubtopic={() => {}} />);
  assert(html.includes('Excel'));
  assert(html.includes('Fórmulas'));
  assert(!html.includes('[A]'));
  const options = renderToStaticMarkup(<select><StudyTopicOptions discipline={d} /></select>);
  assert(options.includes('optgroup'));
  assert(options.includes('value="tjsp_INF_021"'));
  assert.equal((options.match(/<option /g) || []).length, 40);
});

test('concluído/pendente considera 46 tópicos principais e nunca as 287 unidades detalhadas', () => {
  assert.equal(disciplines.reduce((n, d) => n + getMainTopicProgress(d).total, 0), 46);
  const allDone = disciplines.map(d => ({ ...d, topics: d.topics.map(t => ({ ...t, completed: true })) }));
  assert.equal(allDone.reduce((n, d) => n + getMainTopicProgress(d).completed, 0), 46);
  allDone[0].topics[0].completed = false;
  assert.equal(allDone.reduce((n, d) => n + getMainTopicProgress(d).completed, 0), 45);
  assert.equal(allDone.reduce((n, d) => n + getMainTopicProgress(d).pending, 0), 1);
});

test('subtópicos parciais não concluem o principal; concluir Excel conta um tópico e não onze', () => {
  const d = disciplines.find(d => d.id === 'tjsp_INF')!;
  const ids = getNodeTopics(getTopicGroups(d).find(g => g.name === 'Excel')!).map(t => t.id);
  const partial = setContentCompletion(d, ids.slice(0, 1), true);
  assert.deepEqual(getMainTopicProgress(partial), { total: 5, completed: 0, pending: 5, percentage: 0, started: true });
  const completed = setContentCompletion(partial, ids, true);
  assert.deepEqual(getMainTopicProgress(completed), { total: 5, completed: 1, pending: 4, percentage: 20, started: true });
  assert.equal(partial.topics.find(t => t.id === ids[0])!.completed, true);
});

test('todos os tópicos exibem subtópicos diretos; não há mais um nível de código ou lei', () => {
  for (const d of disciplines) for (const group of getTopicGroups(d)) {
    assert(group.children!.every(child => !!child.topic && !child.children));
  }
  const d = disciplines.find(d => d.id === 'tjsp_DP')!;
  const html = renderToStaticMarkup(<StudyTopicsTree discipline={d} activities={[]} exercises={[]} onSetCompletion={() => {}} onRename={() => {}} onDelete={() => {}} onAdd={() => {}} onToggleSubtopic={() => {}} />);
  assert.equal((html.match(/<details /g) || []).length, 4);
  assert(!html.includes('1.1.1-'));
  assert(!html.includes('1.1- Código Penal'));
  assert(html.includes('Código Penal'));
});
