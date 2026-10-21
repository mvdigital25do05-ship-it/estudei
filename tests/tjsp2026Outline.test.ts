import test from 'node:test';
import assert from 'node:assert/strict';
import { TJSP_2026_OUTLINE, TJSP_2026_DISTRIBUTION } from '../src/tjsp2026Outline';
import { parseOutline, previewOutlineMerge } from '../src/outlineImport';

test('edital TJSP original distribui 70 questões', () => {
  assert.equal(Object.values(TJSP_2026_DISTRIBUTION).reduce((a, b) => a + b, 0), 70);
  assert.equal(TJSP_2026_DISTRIBUTION.direito, 30);
  assert.equal(TJSP_2026_DISTRIBUTION.portugues, 16);
  assert.equal(TJSP_2026_DISTRIBUTION.informatica, 9);
});

test('matriz inclui 11 matérias (seis de direito)', () => {
  const names = new Set(TJSP_2026_OUTLINE.rows.map(row => row.discipline));
  assert.equal(names.size, 11);
  assert.equal(Array.from(names).filter(name => name.startsWith('Direito ') || name === 'Legislação Interna').length, 6);
});

test('todos os 103 registros são válidos no importador e não têm prioridades inventadas', () => {
  const input = parseOutline(JSON.stringify(TJSP_2026_OUTLINE.rows), TJSP_2026_OUTLINE.source);
  assert.equal(input.rows.length, 103);
  assert.ok(input.rows.every(row => row.priority === undefined));
  const { disciplines } = previewOutlineMerge([], input);
  assert.equal(disciplines.length, 11);
  assert.equal(disciplines.filter(d => d.topics.length === 0).length, 0);
});

test('respeita recortes essenciais do edital original 2026', () => {
  const joined = TJSP_2026_OUTLINE.rows.map(r => r.topic + ' ' + (r.subtopic || '')).join(' | ');
  for (const phrase of [
    'CPC — arts. 318 a 538',
    'CPP — arts. 574 a 667',
    'Lei nº 9.099/1995 — arts. 60 a 83',
    'LC estadual nº 1.111/2010',
    'NSCGJ, Tomo I — Capítulo XI, seções I a VII',
    'Lei nº 13.146/2015 — arts. 34 a 38',
    'MS-Teams',
    'OneDrive',
  ]) assert.ok(joined.includes(phrase), 'Missing ' + phrase);
});

test('reaplicar matriz TJSP não cria duplicatas e conserva identificadores', () => {
  const one = previewOutlineMerge([], TJSP_2026_OUTLINE);
  one.disciplines[0].topics[0].completed = true;
  one.disciplines[0].topicsDone = 1;
  one.disciplines[0].timeSpentMin = 240;
  const again = previewOutlineMerge(one.disciplines, TJSP_2026_OUTLINE);
  assert.equal(again.stats.newDisciplines, 0);
  assert.equal(again.stats.newTopics, 0);
  assert.equal(again.stats.newSubtopics, 0);
  assert.equal(again.stats.priorityChanges, 0);
  assert.deepEqual(again.disciplines, one.disciplines);
});
