import type {
  ActivityLog, CargoPlan, Discipline, ExerciseLog, MockTest, StudyBlock,
} from './types';

export interface ActiveProfileState {
  disciplines: Discipline[];
  mockTests: MockTest[];
  exerciseLogs: ExerciseLog[];
  activityLogs: ActivityLog[];
  studyBlocks: StudyBlock[];
  weeklyHours: { done: number; total: number };
  weeklyQuestions: { done: number; total: number };
  weeklyReviews: { done: number; total: number };
  examDate: string;
  examName: string;
}

/** Capture all editable data from a profile before navigating to another one.
 * This function is pure and preserves the identity and metadata of the plan.
 */
export function captureProfileSnapshot(
  profile: CargoPlan,
  activeState: ActiveProfileState,
): CargoPlan {
  if (!profile?.id) throw new Error('Perfil de origem inexistente.');
  return {
    ...profile,
    disciplines: activeState.disciplines,
    mockTests: activeState.mockTests,
    exerciseLogs: activeState.exerciseLogs,
    activityLogs: activeState.activityLogs,
    studyBlocks: activeState.studyBlocks,
    weeklyHours: activeState.weeklyHours,
    weeklyQuestions: activeState.weeklyQuestions,
    weeklyReviews: activeState.weeklyReviews,
    examDate: activeState.examDate,
    examName: activeState.examName,
  };
}
