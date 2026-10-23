import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { CargoPlan } from '../types';
import { formatMinutes } from '../utils';
import { ALL_DISCIPLINES, StudyResetMetric, StudyResetSelection } from '../resetStudyProgress';

interface Props {
  profile: CargoPlan;
  onReset: (profileId: string, selection: StudyResetSelection) => Promise<void>;
  onClose: () => void;
}

export default function ResetStudyProgressDialog({ profile, onReset, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const confirmationInput = useRef<HTMLInputElement>(null);
  const submitting = useRef(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [acknowledged, setAcknowledged] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [disciplineId, setDisciplineId] = useState('');
  const [metric, setMetric] = useState<StudyResetMetric | ''>('');

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  useEffect(() => {
    if (step === 2) confirmationInput.current?.focus();
  }, [step]);

  const selected = disciplineId === ALL_DISCIPLINES ? profile.disciplines : profile.disciplines.filter(d => d.id === disciplineId);
  const valid = selected.length > 0 && metric !== '';
  const subjectName = disciplineId === ALL_DISCIPLINES ? 'Todas as matérias' : selected[0]?.name || '';
  const metricName = metric === 'hours' ? 'Somente horas' : metric === 'questions' ? 'Somente questões' : 'Horas e questões';
  const minutes = selected.reduce((sum, discipline) => sum + discipline.timeSpentMin, 0);
  const questions = selected.reduce((sum, discipline) => sum + discipline.correctAnswers + discipline.wrongAnswers, 0);

  const confirmReset = async (event: React.FormEvent) => {
    event.preventDefault();
    if (step !== 2 || !valid || !metric || !acknowledged || confirmation !== 'ZERAR' || submitting.current) return;
    submitting.current = true;
    setWorking(true);
    setError('');
    try {
      await onReset(profile.id, { disciplineId, metric });
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível zerar os registros. Tente novamente.');
    } finally {
      submitting.current = false;
      setWorking(false);
    }
  };

  return <dialog ref={dialog} aria-labelledby="reset-study-title" aria-describedby="reset-study-description"
    onCancel={event => { event.preventDefault(); if (!submitting.current) onClose(); }}
    className="m-auto max-h-[90vh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 text-slate-800 shadow-2xl backdrop:bg-black/60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <p className="mb-1 text-xs font-bold text-rose-600 dark:text-rose-400">Confirmação {step} de 2</p>
        <h2 id="reset-study-title" className="flex items-center gap-2 text-lg font-bold"><AlertTriangle size={20} className="shrink-0 text-rose-600" /> Zerar registros de estudo</h2>
      </div>
      <button type="button" aria-label="Cancelar" disabled={working} onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800"><X size={20} /></button>
    </div>
    <p id="reset-study-description" className="mb-4 text-sm">Perfil: <strong>{profile.name}</strong></p>
    {step === 1 ? <>
      <label htmlFor="reset-study-subject" className="mb-1 block text-sm font-semibold">Matéria</label>
      <select id="reset-study-subject" value={disciplineId} onChange={event => { setDisciplineId(event.target.value); setAcknowledged(false); }}
        className="mb-4 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800">
        <option value="">Escolha a matéria</option>
        <option value={ALL_DISCIPLINES}>Todas as matérias</option>
        {profile.disciplines.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
      </select>
      <fieldset className="mb-4 space-y-2 text-sm">
        <legend className="mb-2 font-semibold">O que deseja zerar?</legend>
        {([['hours', 'Somente horas'], ['questions', 'Somente questões'], ['both', 'Horas e questões']] as const).map(([value, label]) =>
          <label key={value} className="flex cursor-pointer items-center gap-2"><input type="radio" name="reset-study-metric" value={value} checked={metric === value}
            onChange={() => { setMetric(value); setAcknowledged(false); }} className="accent-rose-600" />{label}</label>)}
      </fieldset>
      {valid && <div role="group" aria-label="Resumo da seleção" aria-live="polite" className="mb-4 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800">
        <p className="font-bold">{subjectName} — {metricName}</p>
        {metric !== 'questions' && <p className="mt-2">Serão zerados <strong>{formatMinutes(minutes)}</strong> e o tempo correspondente no histórico e nos gráficos.</p>}
        {metric !== 'hours' && <p className="mt-2">Serão zeradas <strong>{questions.toLocaleString('pt-BR')}</strong> questões da seleção e removidos seus resultados de exercícios.</p>}
        {metric !== 'hours' && <p className="mt-2">{disciplineId === ALL_DISCIPLINES ? 'Os simulados gerais também serão apagados.' : 'Os simulados gerais do perfil serão mantidos, pois não pertencem a uma única matéria.'}</p>}
      </div>}
      <p className="mb-4 text-sm">Só os valores selecionados serão zerados. Tópicos concluídos, anotações das sessões, planejamento e outras matérias serão mantidos.</p>
      <label className="mb-5 flex cursor-pointer items-start gap-3 text-sm">
        <input type="checkbox" checked={acknowledged} disabled={!valid} onChange={event => setAcknowledged(event.target.checked)} className="mt-1 accent-rose-600" />
        Conferi a matéria e os valores que serão zerados permanentemente.
      </label>
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm dark:border-slate-600">Cancelar</button>
        <button type="button" disabled={!valid || !acknowledged} onClick={() => setStep(2)} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">Continuar</button>
      </div>
    </> : <form onSubmit={event => void confirmReset(event)}>
      <p className="mb-4 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800"><strong>{subjectName}</strong> — {metricName}</p>
      <p className="mb-4 text-sm">Para confirmar esta seleção no perfil <strong>{profile.name}</strong>, digite <strong>ZERAR</strong>.</p>
      <label htmlFor="reset-study-confirmation" className="mb-1 block text-sm font-semibold">Confirmação final</label>
      <input ref={confirmationInput} id="reset-study-confirmation" value={confirmation} onChange={event => setConfirmation(event.target.value)} disabled={working}
        autoComplete="off" spellCheck={false} className="mb-4 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-base focus:outline-none focus:ring-2 focus:ring-rose-500 dark:border-slate-600 dark:bg-slate-800" />
      {error && <p role="alert" className="mb-4 text-sm text-rose-700 dark:text-rose-400">{error}</p>}
      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" disabled={working} onClick={() => { setStep(1); setConfirmation(''); setAcknowledged(false); setError(''); }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-40 dark:border-slate-600">Voltar</button>
        <button type="submit" disabled={working || !valid || confirmation !== 'ZERAR' || !acknowledged} className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">
          {working && <Loader2 size={16} className="animate-spin" />}{working ? 'Zerando...' : 'Zerar definitivamente'}
        </button>
      </div>
    </form>}
  </dialog>;
}
