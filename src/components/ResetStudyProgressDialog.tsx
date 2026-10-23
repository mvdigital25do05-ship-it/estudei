import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { CargoPlan } from '../types';
import { formatMinutes } from '../utils';

interface Props {
  profile: CargoPlan;
  onReset: (profileId: string) => Promise<void>;
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

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  useEffect(() => {
    if (step === 2) confirmationInput.current?.focus();
  }, [step]);

  const minutes = profile.disciplines.reduce((sum, discipline) => sum + discipline.timeSpentMin, 0);
  const questions = profile.disciplines.reduce((sum, discipline) => sum + discipline.correctAnswers + discipline.wrongAnswers, 0);

  const confirmReset = async (event: React.FormEvent) => {
    event.preventDefault();
    if (step !== 2 || !acknowledged || confirmation !== 'ZERAR' || submitting.current) return;
    submitting.current = true;
    setWorking(true);
    setError('');
    try {
      await onReset(profile.id);
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
        <h2 id="reset-study-title" className="flex items-center gap-2 text-lg font-bold"><AlertTriangle size={20} className="shrink-0 text-rose-600" /> Zerar horas e questões</h2>
      </div>
      <button type="button" aria-label="Cancelar" disabled={working} onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800"><X size={20} /></button>
    </div>
    <p id="reset-study-description" className="mb-4 text-sm">Perfil: <strong>{profile.name}</strong></p>
    {step === 1 ? <>
      <div className="mb-4 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800">
        <p><strong>{formatMinutes(minutes)}</strong> de estudo e <strong>{questions.toLocaleString('pt-BR')}</strong> questões nos contadores serão zerados.</p>
        <p className="mt-2">O histórico de sessões, exercícios e simulados deste perfil será apagado. Gráficos, revisões e metas realizadas serão recalculados a partir do zero.</p>
      </div>
      <p className="mb-4 text-sm">Matérias, tópicos concluídos, planejamento e metas definidas serão mantidos. Outros perfis não serão alterados.</p>
      <label className="mb-5 flex cursor-pointer items-start gap-3 text-sm">
        <input type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} className="mt-1 accent-rose-600" />
        Entendo que a exclusão será permanente e confirmei o perfil acima.
      </label>
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm dark:border-slate-600">Cancelar</button>
        <button type="button" disabled={!acknowledged} onClick={() => setStep(2)} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">Continuar</button>
      </div>
    </> : <form onSubmit={event => void confirmReset(event)}>
      <p className="mb-4 text-sm">Para confirmar a exclusão no perfil <strong>{profile.name}</strong>, digite <strong>ZERAR</strong>.</p>
      <label htmlFor="reset-study-confirmation" className="mb-1 block text-sm font-semibold">Confirmação final</label>
      <input ref={confirmationInput} id="reset-study-confirmation" value={confirmation} onChange={event => setConfirmation(event.target.value)} disabled={working}
        autoComplete="off" spellCheck={false} className="mb-4 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-base focus:outline-none focus:ring-2 focus:ring-rose-500 dark:border-slate-600 dark:bg-slate-800" />
      {error && <p role="alert" className="mb-4 text-sm text-rose-700 dark:text-rose-400">{error}</p>}
      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" disabled={working} onClick={() => { setStep(1); setConfirmation(''); setAcknowledged(false); setError(''); }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-40 dark:border-slate-600">Voltar</button>
        <button type="submit" disabled={working || confirmation !== 'ZERAR' || !acknowledged} className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">
          {working && <Loader2 size={16} className="animate-spin" />}{working ? 'Zerando...' : 'Zerar definitivamente'}
        </button>
      </div>
    </form>}
  </dialog>;
}
