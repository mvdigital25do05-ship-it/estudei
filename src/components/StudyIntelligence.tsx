import React, { useMemo } from 'react';
import { ActivityLog, Discipline, ExerciseLog } from '../types';
import { formatMinutes, getLocalDateString, getLogDateKey, formatTopicName } from '../utils';
import { BarChart3, BookOpenCheck, CalendarDays, Target } from 'lucide-react';

interface StudyIntelligenceProps {
  disciplines: Discipline[];
  exerciseLogs: ExerciseLog[];
  activityLogs: ActivityLog[];
}

type StudyPriority = 'A' | 'B' | 'C';

const priorityLabel: Record<StudyPriority, string> = {
  A: 'Reforço imediato',
  B: 'Diagnosticar / consolidar',
  C: 'Manutenção',
};

const priorityClass: Record<StudyPriority, string> = {
  A: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
  B: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  C: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
};

export default function StudyIntelligence({ disciplines, exerciseLogs, activityLogs }: StudyIntelligenceProps) {
  const insights = useMemo(() => {
    const rows = disciplines.map((discipline) => {
      const correct = Math.max(0, discipline.correctAnswers || 0);
      const wrong = Math.max(0, discipline.wrongAnswers || 0);
      const total = correct + wrong;
      const accuracy = total ? Math.round((correct / total) * 100) : null;
      const topics = discipline.topics || [];
      const completed = topics.filter((topic) => topic.completed).length;
      const coverage = topics.length ? Math.round((completed / topics.length) * 100) : 0;
      let priority: StudyPriority = 'C';
      let action = 'Manter questões e revisões periódicas';

      if (total >= 10 && accuracy !== null && accuracy < 75) {
        priority = 'A';
        action = 'Revisar os erros e retomar a teoria dos pontos fracos';
      } else if (total < 10) {
        priority = 'B';
        action = 'Resolver pelo menos 10 questões para medir o desempenho';
      } else if ((accuracy !== null && accuracy < 85) || coverage < 65) {
        priority = 'B';
        action = coverage < 65 ? 'Avançar tópicos pendentes e fazer questões' : 'Treinar os assuntos com maior taxa de erro';
      }

      const score = priority === 'A'
        ? 200 + (75 - (accuracy || 0))
        : priority === 'B'
          ? 100 + (100 - coverage) / 4 + (accuracy === null ? 15 : 100 - accuracy) / 4
          : 100 - coverage;

      return { id: discipline.id, name: discipline.name, total, accuracy, coverage, completed, topicsTotal: topics.length, priority, action, score };
    }).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'pt-BR'));

    // Activity logs and exercise logs can represent the same questions.
    // For topic diagnostics use only exerciseLogs, never sum both sources.
    const topicMap = new Map<string, { name: string; disciplineName: string; correct: number; wrong: number }>();
    for (const log of exerciseLogs) {
      const key = `${log.disciplineId}::${log.topicId || log.topicName}`;
      const entry = topicMap.get(key) || { name: log.topicName || 'Sem tópico', disciplineName: log.disciplineName, correct: 0, wrong: 0 };
      entry.correct += Math.max(0, log.correctAnswers || 0);
      entry.wrong += Math.max(0, log.wrongAnswers || 0);
      topicMap.set(key, entry);
    }
    const weakTopics = Array.from(topicMap.values())
      .map((topic) => ({ ...topic, total: topic.correct + topic.wrong }))
      .filter((topic) => topic.total >= 5 && topic.wrong > 0)
      .sort((a, b) => (a.correct / a.total) - (b.correct / b.total) || b.wrong - a.wrong)
      .slice(0, 3);

    const lastSevenDays = new Set<string>();
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      lastSevenDays.add(getLocalDateString(date));
    }
    let minutesSevenDays = 0;
    const studiedDays = new Set<string>();
    for (const log of activityLogs) {
      const date = getLogDateKey(log);
      if (lastSevenDays.has(date) && (log.timeSpentMin || 0) > 0) {
        minutesSevenDays += Math.max(0, log.timeSpentMin || 0);
        studiedDays.add(date);
      }
    }

    return { rows, weakTopics, minutesSevenDays, daysSevenDays: studiedDays.size };
  }, [disciplines, exerciseLogs, activityLogs]);

  if (!disciplines.length) return null;

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900" aria-labelledby="study-insights-title">
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <div className="mb-1 flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
            <Target size={17} aria-hidden="true" />
            <h2 id="study-insights-title" className="text-sm font-extrabold tracking-tight">Inteligência de estudo</h2>
          </div>
          <p className="max-w-2xl text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Prioridades calculadas com seus registros. A/B/C aqui representam <strong>necessidade pessoal de revisão</strong>, não frequência de cobrança da Vunesp.
          </p>
        </div>
        <div className="flex shrink-0 gap-3 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/80">
          <CalendarDays size={18} className="mt-0.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Últimos 7 dias</p>
            <p className="text-base font-bold text-slate-800 dark:text-white">{formatMinutes(insights.minutesSevenDays)}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{insights.daysSevenDays} de 7 dias com tempo registrado</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <div className="mb-3 flex items-center gap-2">
            <BarChart3 size={15} className="text-slate-500" aria-hidden="true" />
            <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-100">Por onde começar</h3>
          </div>
          <div className="space-y-2">
            {insights.rows.slice(0, 5).map((row) => (
              <div key={row.id} className="rounded-xl border border-slate-100 p-3 dark:border-slate-800">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-xs font-bold text-slate-800 dark:text-slate-100">{row.name}</p>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{row.action}</p>
                  </div>
                  <span title={priorityLabel[row.priority]} className={`rounded-md px-2 py-1 text-[10px] font-extrabold ${priorityClass[row.priority]}`}>
                    {row.priority} · {priorityLabel[row.priority]}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Questões: <strong className="text-slate-700 dark:text-slate-200">{row.total}</strong></span>
                  <span>Acertos: <strong className="text-slate-700 dark:text-slate-200">{row.accuracy === null ? 'Sem dados' : `${row.accuracy}%`}</strong></span>
                  <span>Edital cadastrado: <strong className="text-slate-700 dark:text-slate-200">{row.completed}/{row.topicsTotal} tópicos</strong></span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" role="progressbar" aria-label={`Progresso em ${row.name}`} aria-valuenow={row.coverage} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${row.coverage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="xl:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <BookOpenCheck size={15} className="text-slate-500" aria-hidden="true" />
            <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-100">Tópicos para revisar</h3>
          </div>
          {insights.weakTopics.length ? (
            <div className="space-y-2">
              {insights.weakTopics.map((topic) => (
                <div key={`${topic.disciplineName}-${topic.name}`} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/70">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{topic.disciplineName}</p>
                  <p className="mt-1 text-xs font-bold text-slate-800 dark:text-white">{formatTopicName(topic.name)}</p>
                  <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">
                    {topic.wrong} erros de {topic.total} questões · {Math.round((topic.correct / topic.total) * 100)}% de acerto
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-xs leading-relaxed text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Ainda não há tópicos com pelo menos 5 questões e erros registrados para identificar pontos fracos.
            </div>
          )}
          <p className="mt-3 text-[10px] leading-relaxed text-slate-400 dark:text-slate-500">
            Diagnóstico pessoal: A = abaixo de 75% com 10 ou mais questões; B = amostra pequena, 75–84% ou edital cadastrado abaixo de 65%; C = demais casos. Não soma questões duplicadas entre os dois históricos.
          </p>
        </div>
      </div>
    </section>
  );
}
