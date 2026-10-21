import type { Discipline, ExamPriority } from './types';
import type { TopicDiagnostic } from './studyStrategy';

export interface DisciplineStudyOverview {
  id: string;
  name: string;
  topicsTotal: number;
  completed: number;
  coveragePercent: number;
  classified: number;
  sampled: number;
  newQuestions: number;
  below70: number;
  strongEvidence: number;
  /** Accuracy is weighted by the number of sampled questions, not by topics. */
  sampleAccuracy: number | null;
  sampleQuestions: number;
  priority: Record<ExamPriority, number>;
  personalUrgency: Record<ExamPriority, number>;
}

export interface StudyOverview {
  byDiscipline: DisciplineStudyOverview[];
  topicsTotal: number;
  completed: number;
  coveragePercent: number;
  classified: number;
  sampled: number;
  strongEvidence: number;
  below70: number;
  missingClassification: number;
  highPriorityUnfinished: number;
}

/**
 * The overview uses the SAME recent topic diagnostics as the recommendations.
 * It deliberately does not extrapolate confidence to unsampled topics or
 * allocate the 30 shared law questions to specific disciplines.
 */
export function summarizeStudyOverview(
  disciplines: Discipline[],
  diagnostics: TopicDiagnostic[],
): StudyOverview {
  const byKey = new Map(diagnostics.map(d => [d.key, d]));
  const byDiscipline: DisciplineStudyOverview[] = [];
  let total = 0;
  let completed = 0;
  let classified = 0;
  let sampled = 0;
  let below70 = 0;
  let strongEvidence = 0;
  let highPriorityUnfinished = 0;

  for (const disc of disciplines) {
    const rows = (disc.topics || []).map(topic =>
      ({ topic, diagnostic: byKey.get(`${disc.id}::${topic.id}`) }));
    const validRows = rows.filter(row => row.diagnostic);
    let correctWeighted = 0;
    let weight = 0;
    const summary: DisciplineStudyOverview = {
      id: disc.id,
      name: disc.name,
      topicsTotal: rows.length,
      completed: 0,
      coveragePercent: 0,
      classified: 0,
      sampled: 0,
      newQuestions: 0,
      below70: 0,
      strongEvidence: 0,
      sampleAccuracy: null,
      sampleQuestions: 0,
      priority: { A: 0, B: 0, C: 0 },
      personalUrgency: { A: 0, B: 0, C: 0 },
    };

    for (const { topic, diagnostic } of validRows) {
      if (!diagnostic) continue;
      if (topic.completed) summary.completed++;
      if (diagnostic.examPriority) {
        summary.classified++;
        summary.priority[diagnostic.examPriority]++;
      }
      summary.personalUrgency[diagnostic.urgency]++;
      if (diagnostic.examPriority === 'A' && !topic.completed) highPriorityUnfinished++;
      if (diagnostic.hasEnoughQuestions && diagnostic.accuracy !== null) {
        summary.sampled++;
        summary.sampleQuestions += diagnostic.questionsEvaluated;
        correctWeighted += diagnostic.accuracy * diagnostic.questionsEvaluated;
        weight += diagnostic.questionsEvaluated;
        if (diagnostic.accuracy < 70) summary.below70++;
        if (diagnostic.accuracy >= 85) summary.strongEvidence++;
      }
      summary.newQuestions += diagnostic.newQuestionsEvaluated;
    }

    summary.coveragePercent = summary.topicsTotal
      ? Math.round(100 * summary.completed / summary.topicsTotal) : 0;
    summary.sampleAccuracy = weight > 0 ? Math.round(correctWeighted / weight) : null;
    byDiscipline.push(summary);

    total += summary.topicsTotal;
    completed += summary.completed;
    classified += summary.classified;
    sampled += summary.sampled;
    below70 += summary.below70;
    strongEvidence += summary.strongEvidence;
  }

  // Unclassified material stays visible rather than being assigned a
  // fictitious grade based on exam frequency or personal performance.
  return {
    byDiscipline,
    topicsTotal: total,
    completed,
    coveragePercent: total ? Math.round(100 * completed / total) : 0,
    classified,
    sampled,
    strongEvidence,
    below70,
    missingClassification: Math.max(0, total - classified),
    highPriorityUnfinished,
  };
}
