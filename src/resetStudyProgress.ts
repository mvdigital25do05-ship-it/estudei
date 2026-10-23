import { CargoPlan } from './types';

export type StudyProgressState = Pick<CargoPlan,
  'disciplines' | 'activityLogs' | 'exerciseLogs' | 'mockTests' |
  'weeklyHours' | 'weeklyQuestions' | 'weeklyReviews'>;

/** Only these fields are written; syllabus, planning and profile metadata stay intact. */
export function buildStudyResetPatch(state: StudyProgressState): StudyProgressState {
  return {
    disciplines: state.disciplines.map(discipline => ({
      ...discipline,
      timeSpentMin: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
    })),
    activityLogs: [],
    exerciseLogs: [],
    mockTests: [],
    weeklyHours: { ...state.weeklyHours, done: 0 },
    weeklyQuestions: { ...state.weeklyQuestions, done: 0 },
    weeklyReviews: { ...state.weeklyReviews, done: 0 },
  };
}
