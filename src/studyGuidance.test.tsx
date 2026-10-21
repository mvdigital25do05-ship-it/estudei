import React from 'react';
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildStudyGuidance, studyRecordDay } from './studyGuidance';
import { Discipline, ExerciseLog } from './types';
import StudyIntelligence from './components/StudyIntelligence';
import DashboardHome from './components/DashboardHome';

const now = new Date('2026-10-21T12:00:00Z');
const discipline = (id = 'portugues'): Discipline => ({
  id, name: id, icon: 'book', colorClass: 'blue',
  topics: [{ id: id + '_1', name: 'Primeiro assunto', completed: false }, { id: id + '_2', name: 'Segundo assunto', completed: false }],
  topicsTotal: 2, topicsDone: 0, timeSpentMin: 0, correctAnswers: 0, wrongAnswers: 0,
});
const attempt = (id: string, date: string, correct: number, wrong: number, d = discipline()): ExerciseLog => ({
  id, date, correctAnswers: correct, wrongAnswers: wrong, questionsCount: correct + wrong,
  disciplineId: d.id, disciplineName: d.name, topicId: d.topics[0].id, topicName: d.topics[0].name,
  accuracyPercent: 0, difficulty: 'Média', notes: '',
});

test('datas brasileiras, ISO e barras são equivalentes; datas inválidas são recusadas', () => {
  assert.equal(studyRecordDay('21 Out 2026'), studyRecordDay('2026-10-21'));
  assert.equal(studyRecordDay('21/10/2026'), studyRecordDay('2026-10-21'));
  assert.equal(studyRecordDay('31 Fev 2026'), null);
  assert.equal(studyRecordDay('data ilegível'), null);
});

test('sem resultados específicos, recomenda o começo da sequência e não inventa fraqueza', () => {
  const d = { ...discipline(), correctAnswers: 100, wrongAnswers: 500 };
  const result = buildStudyGuidance([d], [], [], now);
  assert.equal(result.weaknesses.length, 0);
  assert.equal(result.next[0].kind, 'new');
  assert.equal(result.next[0].topicId, d.topics[0].id);
  assert.equal(result.next[0].accuracy, null);
});

test('poucas questões e resultados de um único dia não confirmam dificuldade', () => {
  for (const log of [attempt('few', '21 Out 2026', 1, 4), attempt('one-day', '21 Out 2026', 20, 80)]) {
    const result = buildStudyGuidance([discipline()], [log], [], now);
    assert.equal(result.weaknesses.length, 0);
    assert(result.diagnostics.some(row => row.topicId === discipline().topics[0].id));
  }
});

test('erros recorrentes em dois dias geram revisão com motivo e amostra', () => {
  const logs = [attempt('a', '20 Out 2026', 4, 6), attempt('b', '19 Out 2026', 3, 7)];
  const result = buildStudyGuidance([discipline()], logs, [], now);
  assert.equal(result.weaknesses.length, 1);
  assert.equal(result.weaknesses[0].recentQuestions, 20);
  assert.equal(result.weaknesses[0].recentDays, 2);
  assert.equal(result.next[0].kind, 'review');
  assert.equal(result.weaknesses[0].interval, 1);
});

test('desempenho consistente amplia para 7 ou 30 dias; erro recente encurta para 1', () => {
  const logs = [attempt('a', '20 Out 2026', 18, 2), attempt('b', '19 Out 2026', 18, 2)];
  const stable = buildStudyGuidance([discipline()], logs, [], now);
  assert.equal(stable.reviews[0].interval, 7);
  assert.equal(stable.reviews[0].dueDay, studyRecordDay('2026-10-27'));
  logs.push(attempt('c', '18 Out 2026', 18, 2));
  assert.equal(buildStudyGuidance([discipline()], logs, [], now).reviews[0].interval, 30);
  logs.push(attempt('bad', '21 Out 2026', 5, 5));
  assert.equal(buildStudyGuidance([discipline()], logs, [], now).reviews[0].interval, 1);
});

test('novos resultados bons retiram o alerta de fraqueza; histórico antigo não prende o aluno', () => {
  const logs = [attempt('a', '19 Out 2026', 3, 7), attempt('b', '20 Out 2026', 4, 6)];
  assert.equal(buildStudyGuidance([discipline()], logs, [], now).weaknesses.length, 1);
  for (let day = 21; day <= 25; day++) logs.push(attempt('good' + day, `${day} Out 2026`, 20, 0));
  const improved = buildStudyGuidance([discipline()], logs, [], new Date('2026-10-26T12:00:00Z'));
  assert.equal(improved.weaknesses.length, 0);
  assert.equal(improved.reviews[0].interval, 30);
});

test('histórico antigo pede recuperação sem afirmar desempenho atual; datas futuras não pesam', () => {
  const result = buildStudyGuidance([discipline()], [attempt('old', '1 Ago 2026', 90, 10), attempt('future', '22 Out 2026', 0, 100)], [], now);
  assert.equal(result.weaknesses.length, 0);
  assert.equal(result.next[0].recentQuestions, 0);
  assert(result.next[0].reason.includes('histórico antigo'));
  assert.equal(result.reviews[0].historicalQuestions, 100);
});

test('não duplica respostas entre exercícios e atividades nem por ID repetido', () => {
  const log = attempt('same', '21 Out 2026', 7, 3);
  const activity: any = { id: 'session', date: '2026-10-21', disciplineName: log.disciplineName, topicId: log.topicId, timeSpentMin: 30, questionsSolved: 10, correctAnswers: 7, wrongAnswers: 3 };
  const result = buildStudyGuidance([discipline()], [log, log], [activity, activity], now);
  assert.equal(result.reviews[0].recentQuestions, 10);
  assert.equal(result.reviews[0].accuracy, 70);
  assert.equal(result.weaknesses.length, 0);
});

test('mistura revisão e conteúdo novo em vez de só recomendar toda a fila atrasada', () => {
  const a = discipline('a'), b = discipline('b'), c = discipline('c');
  const logs = [attempt('bad1', '20 Out 2026', 2, 8, a), attempt('bad2', '19 Out 2026', 2, 8, a)];
  const result = buildStudyGuidance([a, b, c], logs, [], now);
  assert.equal(result.next.length, 3);
  assert(result.next.some(row => row.kind === 'review'));
  assert(result.next.some(row => row.kind === 'new'));
  assert.equal(new Set(result.next.map(row => row.disciplineId)).size, 3);
});

test('sugestões não alteram dados ou marcações e a interface oferece preparar sessão', () => {
  const d = discipline();
  const before = JSON.stringify(d);
  buildStudyGuidance([d], [], [], now);
  assert.equal(JSON.stringify(d), before);
  const html = renderToStaticMarkup(<StudyIntelligence disciplines={[d]} exerciseLogs={[]} activityLogs={[]} onStart={() => {}} />);
  assert(html.includes('Plano de estudo e revisão'));
  assert(html.includes('Preparar sessão'));
  assert(html.includes('Por onde começar agora'));
  assert(!html.includes('Reforço imediato'));
});

test('painel de orientação fica abaixo dos indicadores e do histórico na página inicial', () => {
  const noop = () => {};
  const html = renderToStaticMarkup(<DashboardHome
    disciplines={[discipline()]} reminders={[]} exerciseLogs={[]} activityLogs={[]}
    onAddReminder={noop} onToggleReminder={noop} onDeleteReminder={noop} onDeleteActivityLog={noop}
    weeklyGoalsHours={{ done: 0, total: 24 }} weeklyGoalsQuestions={{ done: 0, total: 300 }} weeklyGoalsReviews={{ done: 0, total: 30 }}
    onAddStudySession={noop} activeProfileName="Meu concurso" profilesCount={1} onCreateProfile={noop}
  />);
  const panel = html.indexOf('Plano de estudo e revisão');
  const indicators = html.indexOf('Progresso no Edital');
  const history = html.indexOf('Nenhum estudo registrado ainda.');
  assert(indicators >= 0 && history >= 0 && panel >= 0);
  assert(panel > indicators && panel > history);
});
