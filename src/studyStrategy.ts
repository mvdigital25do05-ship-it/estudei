import type {
  Discipline,
  ExamPriority,
  ExerciseLog,
  LearningPhase,
  Topic,
} from './types';

/** Prioridade A/B/C do edital NÃO se confunde com urgência individual A/B/C. */
export type PersonalUrgency = 'A' | 'B' | 'C';

export interface TopicDiagnostic {
  key: string;
  disciplineId: string;
  disciplineName: string;
  topicId: string;
  topicName: string;
  examPriority: ExamPriority | null;
  examPrioritySource: string | null;
  urgency: PersonalUrgency;
  phase: LearningPhase;
  phaseIsManual: boolean;
  completed: boolean;
  accuracy: number | null;
  questionsEvaluated: number;
  newQuestionsEvaluated: number;
  hasEnoughQuestions: boolean;
  recommendation: string;
  score: number;
}

const MIN_QUESTIONS = 20;
const RECENT_WINDOW = 50;
const PRIORITY_WEIGHT: Record<ExamPriority, number> = { A: 40, B: 25, C: 10 };

function safeCount(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.floor(value) : 0;
}

function priorityForTopic(topic: Topic): ExamPriority | null {
  return topic.examPriority === 'A' || topic.examPriority === 'B' ||
    topic.examPriority === 'C' ? topic.examPriority : null;
}

function isPhase(value: unknown): value is LearningPhase {
  return value === 'base' || value === 'consolidacao' || value === 'dominio';
}

/**
 * Uses exerciseLogs as the ONLY source for question performance; activityLogs
 * can refer to the same sessions and must not be added again.
 * Logs added by the current app are newest first. A known timestamp improves
 * ordering for more recent log entries; untimestamped legacy logs preserve
 * their original relative order.
 */
export function buildTopicDiagnostics(
  disciplines: Discipline[],
  exerciseLogs: ExerciseLog[],
): TopicDiagnostic[] {
  const byTopic = new Map<string, { log: ExerciseLog; index: number }[]>();
  const seenIds = new Set<string>();

  exerciseLogs.forEach((log, index) => {
    if (!log.disciplineId || !log.topicId) return;
    if (log.id && seenIds.has(log.id)) return;
    if (log.id) seenIds.add(log.id);
    const key = `${log.disciplineId}::${log.topicId}`;
    const entries = byTopic.get(key) ?? [];
    entries.push({ log, index });
    byTopic.set(key, entries);
  });

  const results: TopicDiagnostic[] = [];

  for (const discipline of disciplines) {
    for (const topic of discipline.topics || []) {
      const key = `${discipline.id}::${topic.id}`;
      const matching = [...(byTopic.get(key) ?? [])].sort((a, b) => {
        const at = a.log.createdAtMs;
        const bt = b.log.createdAtMs;
        if (typeof at === 'number' && typeof bt === 'number') {
          return bt - at || a.index - b.index;
        }
        if (typeof at === 'number') return -1;
        if (typeof bt === 'number') return 1;
        return a.index - b.index;
      });

      let correct = 0;
      let wrong = 0;
      let fresh = 0;

      for (const { log } of matching) {
        if (correct + wrong >= RECENT_WINDOW) break;
        const c = safeCount(log.correctAnswers);
        const w = safeCount(log.wrongAnswers);
        if (c + w === 0) continue;
        correct += c;
        wrong += w;
        if (log.isNewQuestions === true) fresh += c + w;
      }

      const total = correct + wrong;
      const accuracy = total > 0 ? Math.round(100 * correct / total) : null;
      const hasEnoughQuestions = total >= MIN_QUESTIONS;
      const examPriority = priorityForTopic(topic);
      const automaticPhase: LearningPhase =
        hasEnoughQuestions && accuracy !== null
          ? accuracy >= 85 ? 'dominio' : accuracy >= 70 ? 'consolidacao' : 'base'
          : topic.completed ? 'consolidacao' : 'base';
      const phaseIsManual = isPhase(topic.learningPhase);
      const phase: LearningPhase = phaseIsManual ? topic.learningPhase! : automaticPhase;

      const baseWeight = examPriority ? PRIORITY_WEIGHT[examPriority] : 20;
      const weaknessWeight = hasEnoughQuestions && accuracy !== null
        ? (100 - accuracy) * 0.65 : 0;
      const phaseWeight = phase === 'base' ? 25 : phase === 'consolidacao' ? 12 : 0;
      const score = Math.round(baseWeight + weaknessWeight + phaseWeight +
        (topic.completed ? 0 : 8));

      const urgency: PersonalUrgency = score >= 70 ? 'A' : score >= 42 ? 'B' : 'C';
      let recommendation: string;

      if (phase === 'base') {
        recommendation = hasEnoughQuestions && accuracy !== null && accuracy < 70
          ? 'Retomar a teoria dos erros e praticar 10–15 questões.'
          : 'Estudar a teoria e praticar 10–15 questões.';
      } else if (phase === 'consolidacao') {
        recommendation = !hasEnoughQuestions
          ? 'Resolver mais questões para confirmar o desempenho.'
          : 'Priorizar 20–30 questões e revisar os erros.';
      } else {
        recommendation = 'Manter questões, simulados e revisão pelo Anki.';
      }

      results.push({
        key,
        disciplineId: discipline.id,
        disciplineName: discipline.name,
        topicId: topic.id,
        topicName: topic.name,
        examPriority,
        examPrioritySource: topic.examPrioritySource || null,
        urgency,
        phase,
        phaseIsManual,
        completed: topic.completed,
        accuracy,
        questionsEvaluated: total,
        newQuestionsEvaluated: fresh,
        hasEnoughQuestions,
        recommendation,
        score,
      });
    }
  }

  return results.sort((a, b) => b.score - a.score ||
    a.disciplineName.localeCompare(b.disciplineName, 'pt-BR') ||
    a.topicName.localeCompare(b.topicName, 'pt-BR'));
}

export const PHASE_LABELS: Record<LearningPhase, string> = {
  base: 'Base teórica',
  consolidacao: 'Consolidação',
  dominio: 'Domínio',
};
