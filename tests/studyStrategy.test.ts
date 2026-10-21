import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTopicDiagnostics } from '../src/studyStrategy';
import type { Discipline, ExerciseLog, ExamPriority } from '../src/types';

function discipline(priority: ExamPriority | undefined = undefined): Discipline {
  return {
    id: 'd1', name: 'Processo Civil', topicsTotal: 1, topicsDone: 0,
    topics: [{ id: 't1', name: 'Prazos processuais', completed: false, ...(priority ? { examPriority: priority } : {}) }],
    timeSpentMin: 0, correctAnswers: 0, wrongAnswers: 0,
    icon: 'gavel', colorClass: 'emerald',
  };
}

function batch(id: string, correct: number, wrong: number, extras: Partial<ExerciseLog> = {}): ExerciseLog {
  return {
    id, disciplineId: 'd1', disciplineName: 'Processo Civil',
    topicId: 't1', topicName: 'Prazos processuais',
    questionsCount: correct + wrong, accuracyPercent: Math.round(100*correct/(correct+wrong)),
    correctAnswers: correct, wrongAnswers: wrong, notes: '', difficulty: 'Média',
    date: '20 Out 2026', ...extras,
  };
}

test('tópico sem questões: base teórica, amostra insuficiente e edital desconhecido', () => {
  const [topic] = buildTopicDiagnostics([discipline()], []);
  assert.equal(topic.examPriority, null);
  assert.equal(topic.accuracy, null);
  assert.equal(topic.phase, 'base');
  assert.equal(topic.hasEnoughQuestions, false);
  assert.equal(topic.questionsEvaluated, 0);
});

test('desempenho de 65% pede retomada da teoria e tem urgência alta', () => {
  const [topic] = buildTopicDiagnostics([discipline('A')], [batch('l1', 13, 7)]);
  assert.equal(topic.phase, 'base');
  assert.equal(topic.accuracy, 65);
  assert.equal(topic.urgency, 'A');
  assert.match(topic.recommendation, /Retomar a teoria/);
});

test('desempenho de 80% resulta em consolidação', () => {
  const [topic] = buildTopicDiagnostics([discipline('B')], [batch('l1', 16, 4)]);
  assert.equal(topic.phase, 'consolidacao');
  assert.equal(topic.hasEnoughQuestions, true);
});

test('domínio de 90% permanece mesmo sendo prioridade A no edital', () => {
  const [topic] = buildTopicDiagnostics([discipline('A')], [batch('l1', 18, 2)]);
  assert.equal(topic.examPriority, 'A');
  assert.equal(topic.phase, 'dominio');
  assert.match(topic.recommendation, /Anki/);
});

test('prioridade do edital é distinta da urgência individual', () => {
  const [topic] = buildTopicDiagnostics([discipline('C')], [batch('l1', 2, 18)]);
  assert.equal(topic.examPriority, 'C');
  assert.equal(topic.urgency, 'A');
});

test('não conta logs duplicados e só contabiliza questões inéditas quando sinalizadas', () => {
  const [topic] = buildTopicDiagnostics([discipline()], [
    batch('same-id', 8, 2, { isNewQuestions: true }),
    batch('same-id', 8, 2, { isNewQuestions: true }),
    batch('older', 5, 5),
  ]);
  assert.equal(topic.questionsEvaluated, 20);
  assert.equal(topic.newQuestionsEvaluated, 10);
});

test('não mistura IDs de tópicos de disciplinas diferentes', () => {
  const other = { ...discipline('A'), id: 'd2', name: 'Direito Penal' };
  const rows = buildTopicDiagnostics([discipline('A'), other], [batch('l1', 18, 2)]);
  assert.equal(rows.find(x => x.disciplineId === 'd1')?.accuracy, 90);
  assert.equal(rows.find(x => x.disciplineId === 'd2')?.accuracy, null);
});

test('permite escolher fase manualmente sem reescrever registros históricos', () => {
  const data = discipline();
  data.topics[0].learningPhase = 'base';
  const logs = [batch('l1', 18, 2)];
  const [topic] = buildTopicDiagnostics([data], logs);
  assert.equal(topic.phase, 'base');
  assert.equal(topic.phaseIsManual, true);
  assert.equal(logs.length, 1);
});

test('ignora contagens inválidas, usando no máximo os registros recentes', () => {
  const logs = [
    batch('a', 20, 0),
    batch('b', 10, 0),
    batch('c', 20, 0),
    batch('d', 0, 50),
    batch('invalid', Number.NaN, -4),
  ];
  const [topic] = buildTopicDiagnostics([discipline()], logs);
  assert.equal(topic.questionsEvaluated, 50);
  assert.equal(topic.accuracy, 100);
});

test('ordena resultados por urgência sem modificar a lista original', () => {
  const a = discipline('A');
  const b = discipline('C');
  b.id = 'd2';
  const input = [b, a];
  const results = buildTopicDiagnostics(input, []);
  assert.equal(input[0].id, 'd2');
  assert.equal(results[0].disciplineId, 'd1');
});

test('repetições explicitamente marcadas não determinam o domínio', () => {
  const results = buildTopicDiagnostics([discipline('A')], [
    batch('repeat', 30, 0, { isNewQuestions: false, createdAtMs: 30 }),
    batch('new', 6, 14, { isNewQuestions: true, createdAtMs: 20 }),
  ]);
  assert.equal(results[0].questionsEvaluated, 20);
  assert.equal(results[0].newQuestionsEvaluated, 20);
  assert.equal(results[0].accuracy, 30);
  assert.equal(results[0].phase, 'base');
});

test('registros legados sem novidade informada continuam utilizáveis', () => {
  const results = buildTopicDiagnostics([discipline()], [
    batch('new', 8, 2, { isNewQuestions: true }),
    batch('legacy', 5, 5),
    batch('repeat', 30, 0, { isNewQuestions: false }),
  ]);
  assert.equal(results[0].questionsEvaluated, 20);
  assert.equal(results[0].newQuestionsEvaluated, 10);
  assert.equal(results[0].accuracy, 65);
});
