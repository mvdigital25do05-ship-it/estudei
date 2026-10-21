import React, { useState } from 'react';
import StudyIntelligence from './components/StudyIntelligence';
import PriorityEvidencePanel from './components/PriorityEvidencePanel';
import TJSPExamDistribution from './components/TJSPExamDistribution';
import type { Discipline, ExerciseLog, ActivityLog } from './types';
import { previewPriorityAssignments } from './priorityEvidence';

/**
 * Synthetic, local-only UI fixture, reachable exclusively in Vite DEV when
 * VITE_ESTUDEI_UI_TESTS=true and ?ui-test=1.
 * No real authentication, database connection, or user records are used.
 */
const FIXTURE: Discipline[] = [
  {
    id: 'penal', name: 'Direito Penal', icon: 'gavel', colorClass: 'emerald',
    topicsTotal: 2, topicsDone: 1, timeSpentMin: 120,
    correctAnswers: 16, wrongAnswers: 4,
    topics: [
      { id: 'peculato', name: 'Peculato', completed: true, examPriority: 'A',
        examPrioritySource: 'Material demonstrativo' },
      { id: 'concussao', name: 'Concussão', completed: false },
    ],
  },
  {
    id: 'informatica', name: 'Informática', icon: 'computer',
    colorClass: 'indigo', topicsTotal: 2, topicsDone: 0,
    timeSpentMin: 0, correctAnswers: 0, wrongAnswers: 0,
    topics: [
      { id: 'excel', name: 'Excel', completed: false },
      { id: 'internet', name: 'Internet', completed: false },
    ],
  },
];

const QUESTIONS: ExerciseLog[] = [
  {
    id:'fixture-questions', disciplineId:'penal',disciplineName:'Direito Penal',
    topicId:'peculato',topicName:'Peculato',questionsCount:20,
    correctAnswers:16,wrongAnswers:4,accuracyPercent:80,
    difficulty:'Média',date:'21 Out 2026',notes:'',
    isNewQuestions:true,examBoard:'Vunesp',
  },
];

const ACTIVITIES: ActivityLog[] = [];

/**
 * E2E harness proves component behavior with deterministic fixtures.
 * It is not a substitute for Firebase/production deployment testing.
 */
export default function UiTestHarness(){
  const [disciplines,setDisciplines] = useState(FIXTURE);
  const [lastAction,setLastAction] = useState('');
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 dark:bg-slate-950">
      <div className="mx-auto max-w-5xl space-y-4">
        <header>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Homologação visual — dados fictícios
          </h1>
          <p className="text-sm text-slate-500">
            Nenhuma informação desta tela é armazenada no Firebase.
          </p>
        </header>
        <p role="status" aria-label="Última ação" className="text-sm text-slate-700 dark:text-slate-200">
          {lastAction || 'Nenhuma ação registrada'}
        </p>
        <TJSPExamDistribution />
        <StudyIntelligence disciplines={disciplines} exerciseLogs={QUESTIONS}
          activityLogs={ACTIVITIES}
          onStartTopic={(disciplineId,topicId)=>{
            setLastAction(`Abrir estudo: ${disciplineId}/${topicId}`);
          }}/>
        <PriorityEvidencePanel disciplines={disciplines}
          onApply={(evidence,assignments)=>{
            setDisciplines(current=>previewPriorityAssignments(current,evidence,assignments).disciplines);
            setLastAction(`Prioridades aplicadas: ${assignments.length}`);
          }}/>
      </div>
    </main>
  );
}
