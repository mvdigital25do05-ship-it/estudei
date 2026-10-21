/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * A/B/C do edital: importância histórica de cobrança, atribuída por análise
 * externa fundamentada. NÃO é uma medida de dificuldade individual.
 */
export type ExamPriority = 'A' | 'B' | 'C';

/** Estado pedagógico do tópico, independente da prioridade do edital. */
export type LearningPhase = 'base' | 'consolidacao' | 'dominio';

export interface Subtopic {
  id: string;
  name: string;
  completed: boolean;
}

export interface Topic {
  id: string;
  name: string;
  completed: boolean;
  subtopics?: Subtopic[];
  /** Classificação do edital; ausência = ainda não classificado. */
  examPriority?: ExamPriority;
  /** Ajuste manual opcional da fase, quando necessário. */
  learningPhase?: LearningPhase;
  /** Fonte/versão usada para classificar o edital. */
  examPrioritySource?: string;
}

export interface Discipline {
  id: string;
  name: string;
  topicsTotal: number;
  topicsDone: number;
  topics: Topic[];
  timeSpentMin: number; // in minutes
  correctAnswers: number;
  wrongAnswers: number;
  icon: 'gavel' | 'computer' | 'calculate' | 'book' | 'scale' | 'shield';
  colorClass: string; // e.g., 'blue', 'emerald', 'yellow', 'purple'
}

export interface Reminder {
  id: string;
  text: string;
  type: 'INSCRIÇÕES' | 'PROVAS' | 'GERAL';
  date: string;
  completed: boolean;
}

export type StudyBlockType = 'Teoria' | 'Revisão' | 'Exercícios' | 'Questões' | 'Simulado' | 'Lei Seca';

export interface StudyBlock {
  id: string;
  dayOfWeek: number; // 1 = Seg, 2 = Ter, 3 = Qua, 4 = Qui, 5 = Sex, 6 = Sáb, 7 = Dom
  shift: 'manha' | 'tarde' | 'noite';
  disciplineName: string;
  durationMin: number;
  type: StudyBlockType;
  completed?: boolean;
}

export interface MockTest {
  id: string;
  name: string;
  date: string;
  correctAnswers: number;
  totalQuestions: number;
  scorePercent: number; // e.g. 76.6
  status: 'Concluído' | 'Em Andamento';
}

export interface ActivityLog {
  id: string;
  disciplineName: string;
  timeSpentMin: number;
  timestamp: string; // "5h55min" or "Há 2 horas"
  details: string;
  colorClass: string;
  createdAtMs?: number;
  date?: string;
  questionsSolved?: number;
  topicId?: string;
  studyType?: 'Teoria' | 'Questões' | 'Revisão' | 'Simulado';
  correctAnswers?: number;
  wrongAnswers?: number;
}

export interface StreakDay {
  dateString: string; // "DD/MM"
  status: 'completed' | 'failed' | 'future' | 'rest';
  dateKey?: string;
}

export interface ExerciseLog {
  id: string;
  disciplineId: string;
  disciplineName: string;
  topicId: string;
  topicName: string;
  questionsCount: number;
  accuracyPercent: number; // 0 to 100
  correctAnswers: number;
  wrongAnswers: number;
  notes: string;
  difficulty: 'Baixa' | 'Média' | 'Alta';
  date: string; // formatted e.g., "27 Out 2023"
  /** Data registrada em UTC (quando disponível). Registros antigos podem não ter. */
  createdAtMs?: number;
  /** O bloco continha somente questões ainda não respondidas anteriormente? */
  isNewQuestions?: boolean;
  /** Identificador da banca, opcional para compatibilidade com registros antigos. */
  examBoard?: string;
  /** Maior dificuldade identificada no bloco, se registrada. */
  errorCause?: 'desconhecimento' | 'confusao' | 'interpretacao' | 'desatencao' | 'tempo';
  /** Um conceito a revisar por bloco; estrutura detalhada virá na migração de erros. */
  ankiFront?: string;
  ankiBack?: string;
}

export interface CargoPlan {
  id: string;
  name: string;
  disciplines: Discipline[];
  mockTests: MockTest[];
  exerciseLogs: ExerciseLog[];
  activityLogs: ActivityLog[];
  studyBlocks: StudyBlock[];
  weeklyHours: { done: number; total: number };
  weeklyQuestions: { done: number; total: number };
  weeklyReviews: { done: number; total: number };
  createdAt: string;
  examDate?: string;
  examName?: string;
}

