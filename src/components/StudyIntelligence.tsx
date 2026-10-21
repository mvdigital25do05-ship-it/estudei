import React, { useMemo, useState } from 'react';
import type { ActivityLog, Discipline, ExerciseLog } from '../types';
import { buildTopicDiagnostics, PHASE_LABELS } from '../studyStrategy';
import { summarizeStudyOverview } from '../studyOverview';
import { formatMinutes, getLocalDateString, getLogDateKey } from '../utils';
import {
  ArrowRight, BarChart3, BookOpenCheck, CalendarDays,
  ChevronDown, Info, Layers3, Target, TrendingUp,
} from 'lucide-react';

interface StudyIntelligenceProps {
  disciplines: Discipline[];
  exerciseLogs: ExerciseLog[];
  activityLogs: ActivityLog[];
  onStartTopic?: (disciplineId: string, topicId: string) => void;
}

type Filter = 'all' | 'urgent' | 'priorityA' | 'unclassified';

const urgencyStyle = {
  A: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
  B: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  C: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
};

const tabs: { id: Filter; label: string }[] = [
  {id:'all',label:'Todas'},
  {id:'urgent',label:'Urgência A'},
  {id:'priorityA',label:'Incidência A'},
  {id:'unclassified',label:'Sem classificação'},
];

function StatCard({label, value, subtitle, colorClass = 'text-slate-900 dark:text-white'}: {
  label: string; value: string; subtitle: string; colorClass?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-2 text-[26px] font-black leading-none tracking-tight tabular-nums ${colorClass}`}>{value}</p>
      <p className="mt-2 text-[11px] leading-snug text-slate-500 dark:text-slate-400">{subtitle}</p>
    </div>
  );
}

/**
 * Additive dashboard panel only. No Firestore writes and no invented
 * exam-frequency grades, accuracy or readiness values for missing samples.
 */
export default function StudyIntelligence({
  disciplines, exerciseLogs, activityLogs, onStartTopic,
}: StudyIntelligenceProps) {
  const [filter, setFilter] = useState<Filter>('all');
  const [showAll, setShowAll] = useState(false);

  const insights = useMemo(() => {
    const topics = buildTopicDiagnostics(disciplines, exerciseLogs);
    const overview = summarizeStudyOverview(disciplines, topics);
    const lastSevenDays = new Set<string>();
    const today = new Date();
    for (let day = 0; day < 7; day++) {
      const date = new Date(today);
      date.setDate(today.getDate() - day);
      lastSevenDays.add(getLocalDateString(date));
    }

    let minutesSevenDays = 0;
    const studiedDays = new Set<string>();
    for (const log of activityLogs) {
      const date = getLogDateKey(log);
      const time = typeof log.timeSpentMin === 'number' && Number.isFinite(log.timeSpentMin)
        ? Math.max(0, log.timeSpentMin) : 0;
      if (lastSevenDays.has(date) && time > 0) {
        minutesSevenDays += time;
        studiedDays.add(date);
      }
    }

    return {topics, overview, minutesSevenDays, daysSevenDays: studiedDays.size};
  }, [disciplines, exerciseLogs, activityLogs]);

  if (!disciplines.length) return null;

  const visible = insights.topics.filter(item => {
    if (filter === 'urgent') return item.urgency === 'A';
    if (filter === 'priorityA') return item.examPriority === 'A';
    if (filter === 'unclassified') return item.examPriority === null;
    return true;
  });
  const selected = showAll ? visible : visible.slice(0, 6);
  const next = insights.topics[0];
  const overview = insights.overview;

  return (
    <section className="space-y-4" aria-labelledby="study-insights-title">
      <header className="rounded-2xl bg-slate-900 p-5 text-white shadow-sm dark:bg-slate-800">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2 text-emerald-300">
              <Target size={19} aria-hidden="true"/>
              <h2 id="study-insights-title" className="text-base font-extrabold tracking-tight">
                Seu mapa de preparação
              </h2>
            </div>
            <p className="mt-1.5 max-w-xl text-xs leading-relaxed text-slate-300">
              Cobertura do edital, evidências de desempenho e próximas ações.
              A importância histórica da Vunesp permanece separada da sua urgência individual.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3 rounded-xl bg-white/10 px-4 py-3">
            <CalendarDays size={19} className="text-emerald-300" aria-hidden="true"/>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-300">Últimos 7 dias</p>
              <p className="text-lg font-extrabold">{formatMinutes(insights.minutesSevenDays)}</p>
              <p className="text-[10px] text-slate-300">{insights.daysSevenDays}/7 dias com estudo registrado</p>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Edital concluído" value={`${overview.coveragePercent}%`}
          subtitle={`${overview.completed} de ${overview.topicsTotal} tópicos marcados como concluídos`}/>
        <StatCard label="Prioridade A/B/C" value={`${overview.classified}/${overview.topicsTotal}`}
          subtitle={`${overview.missingClassification} tópicos sem classificação de incidência`}/>
        <StatCard label="Amostra suficiente" value={String(overview.sampled)}
          subtitle="Tópicos com pelo menos 20 questões no diagnóstico recente"/>
        <StatCard label="Precisam de reforço" value={String(overview.below70)}
          subtitle="Tópicos abaixo de 70% com amostra suficiente"
          colorClass={overview.below70 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}/>
      </div>

      {next && (
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 dark:border-emerald-900 dark:from-emerald-950/40 dark:to-slate-900">
          <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
            <TrendingUp size={15} aria-hidden="true"/> Próxima sessão sugerida
          </p>
          <div className="mt-2 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="min-w-0">
              <h3 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">{next.topicName}</h3>
              <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                {next.disciplineName} · {PHASE_LABELS[next.phase]}
              </p>
              <p className="mt-2 text-xs text-slate-700 dark:text-slate-200">{next.recommendation}</p>
              <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                Incidência no edital: {next.examPriority ?? 'não classificada'} ·
                Urgência pessoal: {next.urgency} ·
                {next.hasEnoughQuestions ? ` ${next.accuracy}% na amostra recente` : ' amostra de questões insuficiente'}
              </p>
            </div>
            {onStartTopic && (
              <button type="button"
                onClick={() => onStartTopic(next.disciplineId, next.topicId)}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-xs font-bold text-white hover:bg-emerald-800">
                Iniciar estudo <ArrowRight size={15} aria-hidden="true"/>
              </button>
            )}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center gap-2">
          <Layers3 size={16} className="text-emerald-600 dark:text-emerald-400" aria-hidden="true"/>
          <h3 className="text-sm font-extrabold text-slate-800 dark:text-white">Cobertura por disciplina</h3>
        </div>
        <div className="mb-3 flex flex-wrap items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400">
          <span><strong>{overview.strongEvidence}</strong> tópicos com acurácia ≥85% e amostra suficiente</span>
          <span><strong>{overview.highPriorityUnfinished}</strong> tópicos de incidência A ainda não concluídos</span>
        </div>
        <div className="space-y-3">
          {overview.byDiscipline.map(item => (
            <div key={item.id} className="grid grid-cols-1 gap-2 border-t border-slate-100 pt-3 first:border-t-0 first:pt-0 dark:border-slate-800 sm:grid-cols-[minmax(150px,1fr)_minmax(160px,1.2fr)_125px] sm:items-center">
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-100" title={item.name}>{item.name}</p>
                <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                  {item.completed}/{item.topicsTotal} concluídos · {item.classified} classificados
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
                  role="progressbar" aria-label={`Cobertura de ${item.name}`}
                  aria-valuenow={item.coveragePercent} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-full rounded-full bg-emerald-600" style={{width:`${item.coveragePercent}%`}} />
                </div>
                <span className="w-10 shrink-0 text-right text-[11px] font-bold tabular-nums text-slate-700 dark:text-slate-200">
                  {item.coveragePercent}%
                </span>
              </div>
              <div className="text-left text-[10px] text-slate-500 dark:text-slate-400 sm:text-right">
                {item.sampled
                  ? <><strong className="text-slate-700 dark:text-slate-200">{item.sampleAccuracy}%</strong> · {item.sampled} tópico(s) amostrados</>
                  : 'Sem amostra suficiente'}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-[10px] leading-relaxed text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
          <Info size={14} className="mt-0.5 shrink-0"/>
          Conclusão depende do marcador do tópico; não representa uma estimativa de aprovação.
          A acurácia por matéria considera somente assuntos com ao menos 20 questões elegíveis,
          ponderadas pela quantidade de questões. Matérias sem amostra exibem essa ausência.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-800 dark:text-white">
            <BarChart3 size={16} className="text-emerald-600 dark:text-emerald-400"/> Fila inteligente de estudos
          </h3>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {visible.length} tópico(s) neste filtro
          </span>
        </div>
        <div className="my-3 flex flex-wrap gap-2" role="group" aria-label="Filtrar recomendações">
          {tabs.map(tab=>(
            <button type="button" key={tab.id}
              aria-pressed={filter===tab.id}
              onClick={()=>{setFilter(tab.id);setShowAll(false);}}
              className={`rounded-lg px-3 py-2 text-[11px] font-bold transition-colors ${filter===tab.id
                ? 'bg-slate-900 text-white dark:bg-emerald-700'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`}>
              {tab.label}
            </button>
          ))}
        </div>
        {selected.length ? (
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
            {selected.map(item=>(
              <article key={item.key} className="rounded-xl border border-slate-100 p-3.5 dark:border-slate-800">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{item.disciplineName}</p>
                    <h4 className="mt-1 text-xs font-extrabold text-slate-800 dark:text-white">{item.topicName}</h4>
                  </div>
                  <span className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-extrabold ${urgencyStyle[item.urgency]}`}
                    title="A/B/C da sua urgência, não o índice histórico da banca">Urgência {item.urgency}</span>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">{item.recommendation}</p>
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500 dark:text-slate-400">
                  <span>Incidência: <b className="text-slate-700 dark:text-slate-200">{item.examPriority ?? 'não classificada'}</b></span>
                  <span>Fase: <b className="text-slate-700 dark:text-slate-200">{PHASE_LABELS[item.phase]}</b></span>
                  <span>{item.accuracy === null
                    ? 'Sem questões elegíveis'
                    : `${item.accuracy}% · ${item.questionsEvaluated} questões`}</span>
                </div>
                {!item.hasEnoughQuestions && (
                  <p className="mt-1.5 text-[10px] italic text-amber-700 dark:text-amber-300">Amostra inferior a 20 questões.</p>
                )}
                {onStartTopic && (
                  <button type="button"
                    onClick={()=>onStartTopic(item.disciplineId,item.topicId)}
                    className="mt-3 inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-700 hover:underline dark:text-emerald-300">
                    Estudar este tópico <ArrowRight size={12} aria-hidden="true"/>
                  </button>
                )}
              </article>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-slate-200 p-4 text-xs text-slate-500 dark:border-slate-700">
            Nenhum tópico corresponde ao filtro selecionado.
          </p>
        )}
        {visible.length > 6 && (
          <button type="button" onClick={()=>setShowAll(prev=>!prev)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200">
            {showAll?'Mostrar os seis primeiros':`Ver todos os ${visible.length} tópicos`}
            <ChevronDown size={14} className={showAll?'rotate-180':''} aria-hidden="true"/>
          </button>
        )}
      </div>

      <div className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
        <Info size={15} className="mt-0.5 shrink-0 text-slate-500" aria-hidden="true"/>
        <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
          <strong>Incidência A/B/C</strong> depende de classificação histórica explicitamente cadastrada;
          não é inferida da quantidade de erros. <strong>Urgência A/B/C</strong> é sua necessidade individual,
          calculada pelos resultados e pela fase de aprendizagem. Blocos de questões marcados como repetidos
          não entram no diagnóstico. Históricos antigos sem indicação de novidade são utilizados com ressalva.
          O painel não converte as 30 questões conjuntas de Direito em pesos inventados para cada matéria.
        </p>
      </div>

      {insights.topics.some(item=>item.hasEnoughQuestions && item.accuracy!==null && item.accuracy<70) && (
        <p className="flex items-start gap-2 text-xs text-rose-700 dark:text-rose-300">
          <BookOpenCheck size={16} className="mt-0.5 shrink-0"/>
          Há assuntos abaixo de 70% na amostra recente: revise primeiro a teoria dos erros.
        </p>
      )}
    </section>
  );
}
