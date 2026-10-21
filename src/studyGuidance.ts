import { ActivityLog, Discipline, ExerciseLog } from './types';
import { getMainTopicProgress, getNodeTopics, getTopicGroups } from './topicGroups';
import { formatTopicName, getLocalDateString } from './utils';

const DAY = 86_400_000;
const months: Record<string, number> = { jan: 1, fev: 2, feb: 2, mar: 3, abr: 4, apr: 4, mai: 5, may: 5, jun: 6, jul: 7, ago: 8, aug: 8, set: 9, sep: 9, out: 10, oct: 10, nov: 11, dez: 12, dec: 12 };
const count = (n: number) => Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;

export function studyRecordDay(date?: string, timestamp?: number): number | null {
  let parts: number[] | undefined;
  if (date) {
    const iso = date.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    const slash = date.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    const text = date.trim().match(/^(\d{1,2})\s+([A-Za-zÀ-ÿ]+)\s+(\d{4})$/);
    if (iso) parts = [+iso[1], +iso[2], +iso[3]];
    else if (slash) parts = [+slash[3], +slash[2], +slash[1]];
    else if (text) parts = [+text[3], months[text[2].toLowerCase().slice(0, 3)], +text[1]];
  } else if (timestamp && Number.isFinite(timestamp) && !Number.isNaN(new Date(timestamp).getTime())) {
    return studyRecordDay(getLocalDateString(new Date(timestamp)));
  }
  if (!parts || parts.some(n => !Number.isFinite(n))) return null;
  const [year, month, day] = parts;
  const value = new Date(Date.UTC(year, month - 1, day));
  if (year < 2000 || value.getUTCFullYear() !== year || value.getUTCMonth() !== month - 1 || value.getUTCDate() !== day) return null;
  return value.getTime() / DAY;
}

export type GuidanceKind = 'review' | 'diagnostic' | 'new';
export interface StudySuggestion {
  id: string;
  disciplineId: string;
  disciplineName: string;
  topicId: string;
  topicName: string;
  groupName: string;
  kind: GuidanceKind;
  action: string;
  reason: string;
  score: number;
  sessionType: 'Teoria' | 'Questões' | 'Revisão';
  recentQuestions: number;
  recentDays: number;
  accuracy: number | null;
  trend: number | null;
  confirmedWeakness: boolean;
  dueDay: number | null;
  interval: number;
  historicalQuestions: number;
}

/** Transparent local rules, recalculated from saved records; no inferred answers or external model. */
export function buildStudyGuidance(disciplines: Discipline[], exerciseLogs: ExerciseLog[], activityLogs: ActivityLog[], now = new Date()) {
  const today = studyRecordDay(getLocalDateString(now))!;
  const seenExercises = new Set<string>();
  const exercises = exerciseLogs.filter(log => {
    const key = `${log.disciplineId}:${log.id}`;
    if (seenExercises.has(key)) return false;
    seenExercises.add(key);
    return true;
  });
  const seenActivities = new Set<string>();
  const activities = activityLogs.filter(log => {
    const key = `${log.disciplineName}:${log.id}`;
    if (seenActivities.has(key)) return false;
    seenActivities.add(key);
    return true;
  });
  const candidates: StudySuggestion[] = [];
  const followUps: StudySuggestion[] = [];
  const weaknesses: StudySuggestion[] = [];
  const diagnostics: StudySuggestion[] = [];
  for (const [disciplineIndex, discipline] of disciplines.entries()) {
    let offeredNew = false;
    for (const group of getTopicGroups(discipline)) {
      const topics = getNodeTopics(group);
      const ids = new Set(topics.map(t => t.id));
      const unscopedHistory = exercises.some(log => log.disciplineId === discipline.id && !ids.has(log.topicId)
        && (log as ExerciseLog & { coverageTopicIds?: string[] }).coverageTopicIds?.some(id => ids.has(id)))
        || activities.some(log => log.disciplineName === discipline.name && !ids.has(log.topicId || '')
          && (log as ActivityLog & { coverageTopicIds?: string[] }).coverageTopicIds?.some(id => ids.has(id)));
      for (const topic of topics) {
        const attempts = exercises.filter(log => log.disciplineId === discipline.id && log.topicId === topic.id)
          .map(log => ({ day: studyRecordDay(log.date), correct: count(log.correctAnswers), wrong: count(log.wrongAnswers) }))
          .filter(log => log.correct + log.wrong > 0 && (log.day === null || log.day <= today));
        const dated = attempts.filter(log => log.day !== null).sort((a, b) => b.day! - a.day!);
        const recent = dated.filter(log => today - log.day! <= 30).slice(0, 5);
        const questions = recent.reduce((n, log) => n + log.correct + log.wrong, 0);
        const days = new Set(recent.map(log => log.day)).size;
        let weight = 0, correctWeight = 0;
        for (const log of recent) {
          const sample = log.correct + log.wrong;
          const w = Math.min(sample, 100) * Math.pow(0.5, (today - log.day!) / 21);
          weight += w;
          correctWeight += w * log.correct / sample;
        }
        const accuracy = weight ? Math.round(100 * correctWeight / weight) : null;
        const sufficient = questions >= 20 && days >= 2;
        const badSessions = recent.filter(log => log.correct / (log.correct + log.wrong) < 0.75).length;
        const weak = sufficient && accuracy !== null && accuracy < 75;
        const rate = (logs: typeof recent) => {
          const total = logs.reduce((n, log) => n + log.correct + log.wrong, 0);
          return total >= 10 ? 100 * logs.reduce((n, log) => n + log.correct, 0) / total : null;
        };
        const latestRate = rate(recent.slice(0, 2));
        const olderRate = rate(recent.slice(2, 4));
        const trend = latestRate !== null && olderRate !== null ? Math.round(latestRate - olderRate) : null;
        const contacts = activities.filter(log => log.disciplineName === discipline.name && log.topicId === topic.id
          && (log.timeSpentMin > 0 || count(log.questionsSolved || 0) > 0 || log.studyType === 'Revisão'))
          .map(log => studyRecordDay(log.date, log.createdAtMs)).filter((day): day is number => day !== null && day <= today);
        const lastDay = [...dated.map(log => log.day!), ...contacts].sort((a, b) => b - a)[0];
        const historicalQuestions = attempts.reduce((n, log) => n + log.correct + log.wrong, 0);
        const successfulDays = new Set(recent.filter(log => log.correct + log.wrong >= 10 && log.correct / (log.correct + log.wrong) >= 0.85).map(log => log.day)).size;
        const latestFailed = recent.length > 0 && recent[0].correct / (recent[0].correct + recent[0].wrong) < 0.75;
        const interval = !sufficient || weak || latestFailed || accuracy! < 85 ? 1 : successfulDays >= 3 && questions >= 40 ? 30 : successfulDays >= 2 ? 7 : 1;
        const dueDay = lastDay !== undefined ? lastDay + interval : null;
        const base: StudySuggestion = {
          id: `${discipline.id}:${topic.id}`, disciplineId: discipline.id, disciplineName: discipline.name,
          topicId: topic.id, topicName: formatTopicName(topic.name), groupName: group.name,
          kind: 'diagnostic', action: 'Faça 10 a 15 questões e registre os resultados reais.', reason: '', score: 0,
          sessionType: 'Questões', recentQuestions: questions, recentDays: days, accuracy, trend,
          confirmedWeakness: weak, dueDay, interval, historicalQuestions,
        };
        if (dueDay !== null) followUps.push(base);
        if (weak) {
          const item: StudySuggestion = { ...base, kind: 'review', sessionType: 'Revisão',
            action: 'Retome a teoria dos erros e confirme a melhora com novas questões.',
            reason: `${accuracy}% de acertos nas ${questions} respostas recentes, em ${days} dias.${badSessions >= 2 ? ` Resultados abaixo de 75% em ${badSessions} sessões.` : ''}`,
            score: 400 + (75 - accuracy!) + Math.min(badSessions * 5, 20) };
          weaknesses.push(item);
          candidates.push(item);
        } else if (dueDay !== null && dueDay <= today) {
          const item: StudySuggestion = { ...base, kind: 'review', sessionType: sufficient ? 'Revisão' : 'Questões',
            action: sufficient ? 'Revise o conteúdo e resolva questões sem consultar o material.' : 'Faça uma revisão ativa com 10 a 15 questões para atualizar o diagnóstico.',
            reason: historicalQuestions && !questions ? 'Há histórico antigo, mas faltam respostas dos últimos 30 dias para avaliar seu nível atual.' : `Último contato há ${today - lastDay} dia(s). Revisão sugerida após ${interval} dia(s).`,
            score: 250 + Math.min(today - dueDay, 30) };
          candidates.push(item);
        } else if ((attempts.length > 0 || contacts.length > 0 || topic.completed) && (!sufficient || accuracy! < 85)) {
          const item = { ...base,
            reason: !sufficient ? `${questions} respostas recentes em ${days} dia(s). A amostra ainda não confirma domínio ou dificuldade.` : `${accuracy}% de acertos recentes: consolidar antes de ampliar o intervalo.`,
            score: 170 - disciplineIndex };
          diagnostics.push(item);
          candidates.push(item);
        }
        if (!offeredNew && !topic.completed && !attempts.length && !contacts.length) {
          offeredNew = true;
          const item: StudySuggestion = { ...base, kind: unscopedHistory ? 'diagnostic' : 'new', sessionType: unscopedHistory ? 'Questões' : 'Teoria',
            action: unscopedHistory ? 'Teste este assunto com 10 a 15 questões antes de decidir se precisa retomar a teoria.' : 'Estude o próximo assunto da sequência e faça questões de fixação.',
            reason: unscopedHistory ? 'O grupo tem estudo anterior, mas não há desempenho identificado para este assunto.' : 'Próximo assunto pendente na sequência de estudo; ainda sem registros específicos.',
            score: (unscopedHistory ? 150 : 130) - disciplineIndex };
          candidates.push(item);
          if (unscopedHistory) diagnostics.push(item);
        }
      }
    }
  }
  const ranked = [...new Map(candidates.map(item => [item.id, item])).values()].sort((a, b) => b.score - a.score);
  const next: StudySuggestion[] = [];
  // Include new learning alongside reviews; avoid a backlog monopolizing the whole plan.
  for (const kind of ['review', 'new', 'diagnostic'] as const) {
    const item = ranked.find(row => row.kind === kind && !next.some(selected => selected.disciplineId === row.disciplineId));
    if (item) next.push(item);
  }
  for (const item of ranked) {
    if (next.length >= 3) break;
    if (!next.some(selected => selected.disciplineId === item.disciplineId)) next.push(item);
  }
  for (const item of ranked) {
    if (next.length >= 3) break;
    if (!next.some(selected => selected.id === item.id)) next.push(item);
  }
  const progress = disciplines.map(getMainTopicProgress);
  return {
    today, next, weaknesses: weaknesses.sort((a, b) => b.score - a.score),
    diagnostics: diagnostics.sort((a, b) => b.score - a.score),
    reviews: followUps.sort((a, b) => a.dueDay! - b.dueDay!),
    dueCount: followUps.filter(item => item.dueDay! <= today).length,
    completed: progress.reduce((n, p) => n + p.completed, 0), total: progress.reduce((n, p) => n + p.total, 0),
  };
}
