import React, { useMemo } from 'react';
import type { ActivityLog, Discipline, ExerciseLog } from '../types';
import { buildTopicDiagnostics, PHASE_LABELS } from '../studyStrategy';
import { formatMinutes, getLocalDateString, getLogDateKey } from '../utils';
import { BarChart3, BookOpenCheck, CalendarDays, Info, Target } from 'lucide-react';

interface StudyIntelligenceProps {
  disciplines: Discipline[];
  exerciseLogs: ExerciseLog[];
  activityLogs: ActivityLog[];
}

const urgencyStyle = {
  A: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
  B: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  C: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
};

export default function StudyIntelligence({ disciplines, exerciseLogs, activityLogs }: StudyIntelligenceProps) {
  const insights = useMemo(() => {
    const topics = buildTopicDiagnostics(disciplines, exerciseLogs);
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

    return {
      topics,
      minutesSevenDays,
      daysSevenDays: studiedDays.size,
      classified: topics.filter(topic => topic.examPriority !== null).length,
      phases: {
        base: topics.filter(topic => topic.phase === 'base').length,
        consolidacao: topics.filter(topic => topic.phase === 'consolidacao').length,
        dominio: topics.filter(topic => topic.phase === 'dominio').length,
      },
    };
  }, [disciplines, exerciseLogs, activityLogs]);

  if (!disciplines.length) return null;

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900" aria-labelledby="study-insights-title">
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <div className="mb-1 flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
            <Target size={17} aria-hidden="true" />
            <h2 id="study-insights-title" className="text-sm font-extrabold tracking-tight">Inteligência de estudo por tópico</h2>
          </div>
          <p className="max-w-2xl text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Recomendações de teoria, questões ou manutenção a partir dos seus resultados e das prioridades cadastradas para o edital.
          </p>
        </div>
        <div className="flex shrink-0 gap-3 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/80">
          <CalendarDays size={18} className="mt-0.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Últimos 7 dias</p>
            <p className="text-base font-bold text-slate-800 dark:text-white">{formatMinutes(insights.minutesSevenDays)}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{insights.daysSevenDays} de 7 dias estudados</p>
          </div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
          <p className="text-[10px] font-semibold text-slate-500">Base teórica</p>
          <p className="text-lg font-extrabold text-slate-800 dark:text-slate-100">{insights.phases.base}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
          <p className="text-[10px] font-semibold text-slate-500">Consolidação</p>
          <p className="text-lg font-extrabold text-slate-800 dark:text-slate-100">{insights.phases.consolidacao}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
          <p className="text-[10px] font-semibold text-slate-500">Domínio</p>
          <p className="text-lg font-extrabold text-slate-800 dark:text-slate-100">{insights.phases.dominio}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
          <p className="text-[10px] font-semibold text-slate-500">Classificados A/B/C</p>
          <p className="text-lg font-extrabold text-slate-800 dark:text-slate-100">{insights.classified}/{insights.topics.length}</p>
        </div>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <BarChart3 size={15} className="text-slate-500" aria-hidden="true" />
        <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-100">Onde concentrar o próximo estudo</h3>
      </div>
      {insights.topics.length ? (
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
          {insights.topics.slice(0, 6).map(item => (
            <article key={item.key} className="rounded-xl border border-slate-100 p-3 dark:border-slate-800">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{item.disciplineName}</p>
                  <p className="mt-1 text-xs font-bold text-slate-800 dark:text-white">{item.topicName}</p>
                </div>
                <span className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-extrabold ${urgencyStyle[item.urgency]}`}
                  title="Urgência pessoal: considera desempenho e prioridade cadastrada, não apenas frequência da prova">
                  Urgência {item.urgency}
                </span>
              </div>
              <p className="mt-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300">{item.recommendation}</p>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500 dark:text-slate-400">
                <span>Incidência edital: <strong className="text-slate-700 dark:text-slate-200">{item.examPriority ?? 'Não classificada'}</strong></span>
                <span>Fase: <strong className="text-slate-700 dark:text-slate-200">{PHASE_LABELS[item.phase]}{item.phaseIsManual ? ' (manual)' : ''}</strong></span>
                <span>Acertos: <strong className="text-slate-700 dark:text-slate-200">{item.accuracy === null ? 'Sem dados' : `${item.accuracy}% (${item.questionsEvaluated} q)`}</strong></span>
              </div>
              {!item.hasEnoughQuestions && (
                <p className="mt-1 text-[10px] italic text-amber-700 dark:text-amber-300">
                  Amostra insuficiente para confirmar o desempenho (menos de 20 questões).
                </p>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 p-4 text-xs text-slate-500 dark:border-slate-700">
          Cadastre tópicos nas disciplinas para receber recomendações.
        </div>
      )}

      <div className="mt-4 flex items-start gap-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/70">
        <Info size={15} className="mt-0.5 shrink-0 text-slate-500" aria-hidden="true" />
        <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
          <strong>A/B/C do edital</strong> deve ser cadastrado com base na incidência histórica da banca; não é estimado pelos seus erros.
          <strong> Urgência A/B/C</strong> é pessoal e calculada pelo aplicativo. A fase automática usa blocos recentes de até cerca de 50 questões;
          registros antigos não identificam com segurança se as questões eram inéditas. Os dois históricos de atividades e exercícios
          não são somados para evitar duplicidade.
        </p>
      </div>

      {insights.topics.some(item => item.hasEnoughQuestions && item.accuracy !== null && item.accuracy < 70) && (
        <div className="mt-3 flex items-start gap-2">
          <BookOpenCheck size={15} className="mt-0.5 shrink-0 text-rose-500" />
          <p className="text-[11px] text-slate-600 dark:text-slate-300">
            Existem tópicos abaixo de 70% com amostra suficiente. Priorize revisão teórica dos erros antes de novos blocos.
          </p>
        </div>
      )}
    </section>
  );
}
