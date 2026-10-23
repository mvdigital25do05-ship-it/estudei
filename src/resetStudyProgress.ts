import { ActivityLog, CargoPlan, Discipline } from './types';
import { isDateInCurrentWeek } from './utils';

export type StudyProgressState = Pick<CargoPlan,
  'disciplines' | 'activityLogs' | 'exerciseLogs' | 'mockTests' |
  'weeklyHours' | 'weeklyQuestions' | 'weeklyReviews'>;

export const ALL_DISCIPLINES = '*';
export type StudyResetMetric = 'hours' | 'questions' | 'both';
export interface StudyResetSelection { disciplineId: string; metric: StudyResetMetric }

const normalized = (name: string) => name.trim().toLocaleLowerCase('pt-BR');

function belongsTo(log: ActivityLog, discipline: Discipline, disciplines: Discipline[]): boolean {
  if (log.disciplineId) return log.disciplineId === discipline.id;
  const topicIds = log.topicId ? [log.topicId] : (log as ActivityLog & { coverageTopicIds?: string[] }).coverageTopicIds || [];
  if (topicIds.length) {
    const owners = disciplines.filter(d => topicIds.every(id => d.topics.some(t => t.id === id)));
    if (owners.length === 1) return owners[0].id === discipline.id;
  }
  return normalized(log.disciplineName) === normalized(discipline.name);
}

/** Keep free notes; update only the automatic numeric sentences in activity descriptions. */
function updatedDetails(details: string, hours: boolean, questions: boolean): string {
  const noteStart = details.indexOf(' Obs: ');
  let summary = noteStart < 0 ? details : details.slice(0, noteStart);
  const notes = noteStart < 0 ? '' : details.slice(noteStart);
  if (hours) summary = summary.replace(/^(Estudou .+?) por [\d.,\s]+(?:h|min)[\dhmin.,\s]* usando /, '$1 usando ')
    .replace(/^Ajuste de horas \(\+[^)]+\)/, 'Horas zeradas');
  if (questions) summary = summary.replace(/Resolveu \d+ questões \([^)]*(?:acertos|erros)[^)]*\)\.?/i, 'Questões zeradas.')
    .replace(/^Simulado concluído \([^)]*acertos\)/, 'Questões do simulado zeradas');
  return summary + notes;
}

/** Reset only the chosen metric and subject, including its contribution to charts. */
export function buildStudyResetPatch(state: StudyProgressState, selection: StudyResetSelection, now = new Date()): StudyProgressState {
  if (!['hours', 'questions', 'both'].includes(selection.metric)) throw Error('Escolha horas, questões ou ambos.');
  const all = selection.disciplineId === ALL_DISCIPLINES;
  const target = state.disciplines.find(d => d.id === selection.disciplineId);
  if (!all && !target) throw Error('Escolha uma matéria válida para zerar os registros.');
  if (target && state.disciplines.some(d => d.id !== target.id && normalized(d.name) === normalized(target.name))
    && state.activityLogs.some(log => !log.disciplineId && normalized(log.disciplineName) === normalized(target.name))) {
    throw Error('Existem matérias com o mesmo nome e registros sem identificação. Renomeie as matérias antes de zerar individualmente.');
  }
  const hours = selection.metric !== 'questions';
  const questions = selection.metric !== 'hours';
  const activityLogs = state.activityLogs.map(log => {
    if (!all && !belongsTo(log, target!, state.disciplines)) return log;
    return {
      ...log,
      ...(hours ? { timeSpentMin: 0 } : {}),
      ...(questions ? { questionsSolved: 0, correctAnswers: 0, wrongAnswers: 0 } : {}),
      details: updatedDetails(log.details, hours, questions),
    };
  });
  const currentWeek = activityLogs.filter(log => log.disciplineName !== 'Dia de Descanso'
    && (log.date || log.createdAtMs) && isDateInCurrentWeek(log.date || log.createdAtMs!, now));
  return {
    disciplines: state.disciplines.map(discipline => !all && discipline.id !== target!.id ? discipline : ({
      ...discipline,
      ...(hours ? { timeSpentMin: 0 } : {}),
      ...(questions ? { correctAnswers: 0, wrongAnswers: 0 } : {}),
    })),
    activityLogs,
    exerciseLogs: questions ? state.exerciseLogs.filter(log => !all && log.disciplineId !== target!.id) : state.exerciseLogs,
    // Global mock tests have no subject attribution; a subject reset must not erase them.
    mockTests: questions && all ? [] : state.mockTests,
    weeklyHours: hours ? { ...state.weeklyHours, done: currentWeek.reduce((sum, log) => sum + (log.timeSpentMin || 0), 0) / 60 } : state.weeklyHours,
    weeklyQuestions: questions ? { ...state.weeklyQuestions, done: currentWeek.reduce((sum, log) => sum + (log.questionsSolved ?? ((log.correctAnswers || 0) + (log.wrongAnswers || 0))), 0) } : state.weeklyQuestions,
    weeklyReviews: state.weeklyReviews,
  };
}
