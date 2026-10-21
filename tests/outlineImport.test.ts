import test from 'node:test';
import assert from 'node:assert/strict';
import { parseOutline, previewOutlineMerge, normalizeOutlineName } from '../src/outlineImport';
import type { Discipline } from '../src/types';

const existing: Discipline = {
  id: 'disc-1', name: 'Direito Penal', topics: [{
    id: 'top-1', name: 'Crimes contra a Administração Pública', completed: true,
    examPriority: 'B', examPrioritySource: 'Classificação antiga',
    learningPhase: 'consolidacao',
    subtopics: [{ id: 'sub-1', name: 'Peculato', completed: true }],
  }],
  topicsTotal: 1, topicsDone: 1, timeSpentMin: 120,
  correctAnswers: 100, wrongAnswers: 10,
  icon: 'gavel', colorClass: 'emerald',
};

test('TSV com cabeçalho importa e preserva todos os registros de progresso', () => {
  const outline = parseOutline([
    'Disciplina\tTópico\tSubtópico\tPrioridade',
    'Direito Penal\tCrimes contra a Administração Pública\tPeculato\tA',
    'Direito Penal\tCrimes contra a Administração Pública\tCorrupção passiva\tA',
    'Informática\tPlanilhas\tReferências de células\tA',
  ].join('\n'), 'Plano de estudos TJSP 2026');
  const merged = previewOutlineMerge([existing], outline);
  assert.equal(merged.stats.newDisciplines, 1);
  assert.equal(merged.stats.newTopics, 1);
  assert.equal(merged.stats.newSubtopics, 2);
  assert.equal(merged.stats.priorityChanges, 2);
  const original = merged.disciplines[0];
  assert.equal(original.id, 'disc-1');
  assert.equal(original.topics[0].id, 'top-1');
  assert.equal(original.topics[0].subtopics?.[0].id, 'sub-1');
  assert.equal(original.topics[0].learningPhase, 'consolidacao');
  assert.equal(original.timeSpentMin, 120);
  assert.equal(original.correctAnswers, 100);
  assert.equal(original.wrongAnswers, 10);
  assert.equal(original.topics[0].completed, true);
  assert.equal(existing.topics[0].completed, true, 'original deve permanecer intacto');
  assert.equal(original.topics[0].examPrioritySource, 'Plano de estudos TJSP 2026');
});

test('importação idempotente: repetir os mesmos dados não duplica nada', () => {
  const input = parseOutline(
    'Direito Penal\tCrimes contra a Administração Pública\tCorrupção passiva\tA',
    'Plano TJSP 2026',
  );
  const first = previewOutlineMerge([existing], input);
  const second = previewOutlineMerge(first.disciplines, input);
  assert.equal(second.stats.newDisciplines, 0);
  assert.equal(second.stats.newTopics, 0);
  assert.equal(second.stats.newSubtopics, 0);
  assert.equal(second.stats.priorityChanges, 0);
  assert.deepEqual(second.disciplines, first.disciplines);
});

test('nenhuma classificação é inventada quando prioridade não foi informada', () => {
  const input = parseOutline('Língua Portuguesa\tPontuação\tUso da vírgula', 'Fonte manual');
  const row = previewOutlineMerge([], input).disciplines[0].topics[0];
  assert.equal(row.examPriority, undefined);
  assert.equal(row.examPrioritySource, undefined);
});

test('validação rejeita conflitos de prioridade no mesmo tópico', () => {
  assert.throws(() => parseOutline([
    'Informática\tExcel\tFunções\tA',
    'Informática\tExcel\tGráficos\tB',
  ].join('\n'), 'Fonte 2026'), /conflitantes/);
});

test('JSON com rows, sem subtópicos, é aceito', () => {
  const text = JSON.stringify({ rows: [{ discipline: 'Raciocínio Lógico', topic: 'Proposições' }] });
  const res = previewOutlineMerge([], parseOutline(text, 'Fonte 2026'));
  assert.equal(res.disciplines.length, 1);
  assert.equal(res.disciplines[0].topics[0].completed, false);
});

test('disciplinas com nomes ambíguos exigem correção antes da importação', () => {
  const second = structuredClone(existing);
  second.id = 'disc-2';
  second.name = 'DIREITO PÉNAL';
  const outline = parseOutline('Direito Penal\tCrimes contra a Administração Pública', 'Fonte 2026');
  assert.throws(() => previewOutlineMerge([existing, second], outline), /disciplinas repetidas/);
});

test('rejeita linhas incompletas, listas grandes e dados inválidos', () => {
  assert.throws(() => parseOutline('Apenas disciplina', 'Fonte 2026'), /TSV/);
  assert.throws(() => parseOutline('Português\tOrtografia', ''), /Fonte/);
  assert.throws(() => parseOutline('Português\tOrtografia\t\tZ', 'Fonte 2026'), /Prioridade inválida/);
});

test('normalização remove diferenças de acentos e de caixa', () => {
  assert.equal(normalizeOutlineName('  LÍNGUA    Portuguesa '), normalizeOutlineName('língua portuguesa'));
});
