import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookOpenCheck, CalendarDays, Target } from 'lucide-react';
import { ActivityLog, Discipline, ExerciseLog } from '../types';
import { buildStudyGuidance, StudySuggestion } from '../studyGuidance';

interface StudyIntelligenceProps {
  disciplines: Discipline[];
  exerciseLogs: ExerciseLog[];
  activityLogs: ActivityLog[];
  onStart: (suggestion: StudySuggestion) => void;
}

const labels = { review: 'Revisar', diagnostic: 'Diagnosticar', new: 'Avançar conteúdo' };
const colors = { review: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300', diagnostic: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300', new: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' };

export default function StudyIntelligence({ disciplines, exerciseLogs, activityLogs, onStart }: StudyIntelligenceProps) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(timer); }, []);
  const insights = useMemo(() => buildStudyGuidance(disciplines, exerciseLogs, activityLogs, now), [disciplines, exerciseLogs, activityLogs, now]);
  if (!disciplines.length) return null;

  return <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900" aria-labelledby="study-guidance-title">
    <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 id="study-guidance-title" className="flex items-center gap-2 text-sm font-extrabold text-slate-800 dark:text-slate-100"><Target size={17} className="text-emerald-600" />Plano de estudo e revisão</h2>
        <p className="mt-1 max-w-2xl text-xs text-slate-500 dark:text-slate-400">As sugestões se ajustam quando você registra estudos e questões. Resultados recentes ajudam a decidir entre avançar, testar o conhecimento ou revisar.</p>
      </div>
      <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
        <span className="rounded-lg bg-slate-50 px-3 py-2 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{insights.completed}/{insights.total} tópicos principais concluídos</span>
        <span className="rounded-lg bg-rose-50 px-3 py-2 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{insights.dueCount} revisões sugeridas para agora</span>
      </div>
    </div>

    <div className="grid gap-5 xl:grid-cols-3">
      <div className="space-y-3 xl:col-span-2">
        <h3 className="text-xs font-extrabold text-slate-800 dark:text-white">Por onde começar agora</h3>
        {insights.next.map((item, index) => <article key={item.id} className="rounded-xl border border-slate-100 p-4 dark:border-slate-800">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{index + 1}. {item.disciplineName}</p>
            <span className={`rounded-md px-2 py-1 text-[10px] font-bold ${colors[item.kind]}`}>{labels[item.kind]}</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">{item.groupName}</p>
          <h4 className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100">{item.topicName}</h4>
          <p className="mt-2 text-xs font-semibold text-slate-700 dark:text-slate-200">{item.action}</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{item.reason}</p>
          {item.recentQuestions > 0 && <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">{item.recentQuestions} respostas em {item.recentDays} dia(s) na amostra recente · {item.accuracy}% de acertos ponderados</p>}
          {item.trend !== null && Math.abs(item.trend) >= 10 && <p className={`mt-1 text-[11px] ${item.trend >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{item.trend >= 0 ? 'Melhora' : 'Queda'} de {Math.abs(item.trend)} pontos percentuais em relação aos blocos anteriores.</p>}
          <button type="button" onClick={() => onStart(item)} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-700 dark:border-emerald-800 dark:text-emerald-400">Preparar sessão <ArrowRight size={13} /></button>
        </article>)}
        {!insights.next.length && <p className="rounded-xl bg-emerald-50 p-4 text-xs leading-relaxed text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">Não há uma prioridade imediata identificada. Consulte as próximas revisões e mantenha questões de recuperação para acompanhar seu desempenho.</p>}
      </div>

      <div className="space-y-5">
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-xs font-extrabold text-slate-800 dark:text-white"><BookOpenCheck size={15} />Pontos fracos identificados</h3>
          {insights.weaknesses.slice(0, 3).map(item => <div key={item.id} className="mb-2 rounded-xl bg-rose-50 p-3 dark:bg-rose-950/30">
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{item.disciplineName}</p>
            <p className="mt-1 text-xs font-bold text-slate-800 dark:text-slate-100">{item.topicName}</p>
            <p className="mt-1 text-[11px] text-rose-700 dark:text-rose-300">{item.accuracy}% · {item.recentQuestions} respostas em {item.recentDays} dias</p>
            <button type="button" onClick={() => onStart(item)} className="mt-2 text-xs font-bold text-rose-700 underline dark:text-rose-300">Preparar revisão</button>
          </div>)}
          {!insights.weaknesses.length && <p className="rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500 dark:bg-slate-800 dark:text-slate-400">Ainda não há evidência recente suficiente de dificuldade recorrente. Isso não comprova domínio: assuntos com pouca amostra entram para diagnóstico.</p>}
        </div>
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-xs font-extrabold text-slate-800 dark:text-white"><CalendarDays size={15} />Agenda sugerida de revisão</h3>
          {insights.reviews.slice(0, 5).map(item => <button type="button" key={item.id} onClick={() => onStart({ ...item, kind: 'review', sessionType: 'Revisão' })} className="mb-2 block w-full rounded-xl border border-slate-100 p-3 text-left dark:border-slate-800">
            <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400">{item.disciplineName}</span>
            <span className="mt-1 block text-xs font-bold text-slate-700 dark:text-slate-200">{item.topicName}</span>
            <span className="mt-1 block text-[11px] text-slate-500 dark:text-slate-400">{item.dueDay! <= insights.today ? 'Revisar agora' : new Date(item.dueDay! * 86_400_000).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} · intervalo sugerido: {item.interval} dia(s)</span>
          </button>)}
          {!insights.reviews.length && <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">Registre sessões com data e assunto para formar sua agenda. Uma marcação de concluído, sozinha, não informa quando houve estudo.</p>}
        </div>
      </div>
    </div>

    <details className="mt-5 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
      <summary className="cursor-pointer font-semibold">Como as sugestões se ajustam</summary>
      <div className="mt-3 space-y-2 leading-relaxed">
        <p>O diagnóstico usa até cinco blocos de questões dos últimos 30 dias, com mais peso para os recentes. Uma dificuldade exige ao menos 20 respostas em dois dias diferentes e acerto ponderado abaixo de 75%. Poucas respostas geram um pedido de diagnóstico, sem rotular o assunto como ponto fraco.</p>
        <p>As revisões começam com sugestão de um dia. Evidências de desempenho consistente a partir de 85% podem ampliar o intervalo para 7 ou 30 dias; erros recentes o reduzem. São regras de planejamento ajustáveis pelo seu julgamento, não garantia de retenção.</p>
        <p>Questões são contadas apenas no histórico de exercícios, sem somar de novo a sessão correspondente. Horas antigas de grupos não são distribuídas artificialmente entre os assuntos. As sugestões não alteram suas marcações de conclusão e não substituem a ordem de conteúdo do edital.</p>
      </div>
    </details>
  </section>;
}
