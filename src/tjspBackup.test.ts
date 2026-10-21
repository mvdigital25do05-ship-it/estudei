import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTJSPBackup } from './tjspBackup';
import { CargoPlan } from './types';

const user = { email: 'aluno@example.com', activeProfileId: 'fiscal', reminders: [] };
const profile = (): CargoPlan => ({
  id: 'fiscal', name: 'Fiscal de Posturas',
  disciplines: [{ id: 'lp', name: 'Língua Portuguesa', topics: [
    { id: 'interpretacao', name: 'Interpretação de texto', completed: true },
    { id: 'crase', name: 'Crase', completed: true },
    { id: 'ortografia', name: 'Ortografia', completed: true },
  ], topicsTotal: 3, topicsDone: 3, timeSpentMin: 150, correctAnswers: 0, wrongAnswers: 0, icon: 'book', colorClass: 'blue' }],
  activityLogs: [
    { id: 'a', topicId: 'interpretacao', disciplineName: 'Língua Portuguesa', timeSpentMin: 60, details: 'Leitura', date: '2026-09-01', timestamp: '', colorClass: 'blue' },
    { id: 'b', topicId: 'crase', disciplineName: 'Língua Portuguesa', timeSpentMin: 30, details: 'Crase', date: '2026-09-02', timestamp: '', colorClass: 'blue' },
    { id: 'c', topicId: 'ortografia', disciplineName: 'Língua Portuguesa', timeSpentMin: 60, details: 'Ortografia', timestamp: '', colorClass: 'blue' },
  ], exerciseLogs: [], mockTests: [], studyBlocks: [], weeklyHours: { done: 0, total: 24 }, weeklyQuestions: { done: 0, total: 300 }, weeklyReviews: { done: 0, total: 60 }, createdAt: '',
});

test('gera 287 unidades, preserva origem e não duplica as horas de um grupo', () => {
  const source = profile();
  const original = JSON.stringify(source);
  const result = buildTJSPBackup(user, [source], '2026-10-21T00:00:00Z');
  const target = JSON.parse(result.text).profiles[0].data;
  assert.equal(result.minutes, 90);
  assert.equal(target.disciplines.flatMap(d => d.topics).length, 287);
  assert.equal(target.activityLogs.length, 2);
  assert.equal(target.activityLogs[0].topicId, undefined);
  assert.equal(target.activityLogs[0].coverageTopicIds.length, 7);
  assert.equal(target.activityLogs[0].date, '2026-09-01');
  assert.equal(target.disciplines[0].topics.find(t => t.id === 'tjsp_LP_026').completed, true);
  assert.equal(target.disciplines[0].topics.find(t => t.id === 'tjsp_LP_001').completed, false);
  assert.equal(JSON.stringify(source), original);
});

test('rejeita origem ausente, ambígua e atividades duplicadas', () => {
  assert.throws(() => buildTJSPBackup(user, []));
  assert.throws(() => buildTJSPBackup(user, [profile(), profile()]));
  const duplicate = profile();
  duplicate.activityLogs.push(duplicate.activityLogs[0]);
  assert.throws(() => buildTJSPBackup(user, [duplicate]));
});
