import React from 'react';
import { TJSP_2026_DISTRIBUTION } from '../tjsp2026Outline';

const AREAS = [
  { key: 'portugues', label: 'Português', className: 'bg-sky-600' },
  { key: 'direito', label: 'Direito (6 matérias)', className: 'bg-emerald-600' },
  { key: 'atualidades', label: 'Atualidades / LBI', className: 'bg-violet-500' },
  { key: 'matematica', label: 'Matemática', className: 'bg-amber-500' },
  { key: 'informatica', label: 'Informática', className: 'bg-indigo-600' },
  { key: 'raciocinioLogico', label: 'Raciocínio Lógico', className: 'bg-rose-500' },
] as const;

const TOTAL = Object.values(TJSP_2026_DISTRIBUTION).reduce((sum,n)=>sum+n,0);

/**
 * Question weights originate from the exam blueprint, NOT observed
 * topic frequency. All six Law disciplines share one 30-question block;
 * never invent a split within those 30 questions.
 */
export default function TJSPExamDistribution() {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
      aria-labelledby="distribution-tjsp-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 id="distribution-tjsp-title" className="text-sm font-extrabold text-slate-800 dark:text-white">
            Peso dos blocos na prova objetiva
          </h3>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            TJSP · Edital nº 02/2026 · {TOTAL} questões
          </p>
        </div>
        <span className="text-[10px] text-slate-500 dark:text-slate-400">Peso oficial, não frequência por tópico</span>
      </div>
      <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
        role="img" aria-label="Distribuição das questões por área do edital TJSP 02/2026">
        {AREAS.map(area=>(
          <div key={area.key} className={area.className}
            style={{width:`${TJSP_2026_DISTRIBUTION[area.key] / TOTAL * 100}%`}}
            title={`${area.label}: ${TJSP_2026_DISTRIBUTION[area.key]} de ${TOTAL}`}/>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        {AREAS.map(area=>(
          <div key={area.key} className="flex items-start gap-2">
            <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${area.className}`}/>
            <div>
              <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">{area.label}</p>
              <p className="mt-0.5 text-[11px] font-extrabold tabular-nums text-slate-900 dark:text-white">
                {TJSP_2026_DISTRIBUTION[area.key]} questões · {Math.round(TJSP_2026_DISTRIBUTION[area.key] / TOTAL * 100)}%
              </p>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
        Os 30 itens de Direito são compartilhados entre as disciplinas jurídicas;
        o edital não fixa nesta distribuição a quantidade de questões por assunto.
        A prova discursiva, quando prevista, não integra esse total objetivo.
        Use o mapa como referência do edital, não como previsão do que cairá.
      </p>
    </section>
  );
}
