import React, { useState } from 'react';
import { AlertTriangle, FileUp, FileCheck, ShieldCheck } from 'lucide-react';
import type { Discipline } from '../types';
import { parseOutline, previewOutlineMerge, type OutlineInput, type OutlinePreview } from '../outlineImport';
import { TJSP_2026_OUTLINE } from '../tjsp2026Outline';

type Prepared = { input: OutlineInput; preview: OutlinePreview };

interface Props {
  disciplines: Discipline[];
  onApply: (outline: OutlineInput) => void;
}

const SAMPLE = [
  'Disciplina\tTópico\tSubtópico\tPrioridade',
  'Direito Penal\tCrimes contra a Administração Pública\tPeculato\tA',
  'Direito Penal\tCrimes contra a Administração Pública\tConcussão\tA',
  'Informática\tPlanilhas eletrônicas\tReferências de células\tA',
].join('\n');

/**
 * O conteúdo importado jamais é encaminhado a um servidor por este componente.
 * A aplicação ao perfil só é solicitada depois de pré-visualização e confirmação.
 */
export default function OutlineImportPanel({ disciplines, onApply }: Props) {
  const [source, setSource] = useState('');
  const [text, setText] = useState('');
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [error, setError] = useState('');
  const [backupConfirmed, setBackupConfirmed] = useState(false);
  const [message, setMessage] = useState('');

  const clearPreview = () => {
    setPrepared(null);
    setBackupConfirmed(false);
    setError('');
    setMessage('');
  };

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    clearPreview();
    if (file.size > 500_000) {
      setError('Arquivo acima do limite de 500 KB.');
      return;
    }
    try {
      setText(await file.text());
    } catch {
      setError('Não foi possível ler o arquivo.');
    }
  };

  const loadTjsp = () => {
    setError('');
    setMessage('');
    setBackupConfirmed(false);
    setSource(TJSP_2026_OUTLINE.source);
    setText(JSON.stringify(TJSP_2026_OUTLINE.rows, null, 2));
    try {
      const preview = previewOutlineMerge(disciplines, TJSP_2026_OUTLINE);
      setPrepared({ input: TJSP_2026_OUTLINE, preview });
    } catch (cause) {
      setPrepared(null);
      setError(cause instanceof Error ? cause.message : 'Não foi possível preparar a matriz TJSP.');
    }
  };

  const prepare = () => {
    setError('');
    setMessage('');
    setPrepared(null);
    setBackupConfirmed(false);
    try {
      const input = parseOutline(text, source);
      const preview = previewOutlineMerge(disciplines, input);
      setPrepared({ input, preview });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível ler a lista.');
    }
  };

  const apply = () => {
    if (!prepared || !backupConfirmed) return;
    try {
      // Recheck against the latest prop state before applying.
      const now = previewOutlineMerge(disciplines, prepared.input);
      if (JSON.stringify(now.disciplines) !== JSON.stringify(prepared.preview.disciplines)) {
        setPrepared({ input: prepared.input, preview: now });
        setBackupConfirmed(false);
        setError('Os dados mudaram. Confira a nova prévia e confirme novamente.');
        return;
      }
      onApply(prepared.input);
      setPrepared(null);
      setBackupConfirmed(false);
      setMessage('Importação solicitada para o perfil ativo. Aguarde o indicador de salvamento na nuvem.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Erro ao aplicar a importação.');
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900" aria-labelledby="outline-import-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 id="outline-import-title" className="text-sm font-extrabold text-slate-800 dark:text-white">
            Importação segura do edital
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Cole uma tabela copiada de planilha ou importe TSV/JSON. Tópicos já cadastrados mantêm histórico, IDs e progresso.
          </p>
        </div>
        <FileUp size={20} className="text-slate-400" aria-hidden="true" />
      </div>
      <button
        type="button"
        onClick={loadTjsp}
        className="mt-3 w-full rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2.5 text-left text-xs font-bold text-emerald-900 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200"
      >
        Carregar matriz TJSP 02/2026 · Anexo VIII (103 linhas, 11 matérias)
        <span className="mt-1 block text-[11px] font-normal">Conferida com a publicação de 19/10/2026; prioridades A/B/C não são presumidas.</span>
      </button>
      <div className="mt-3 grid grid-cols-1 gap-3">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
          Origem e versão da classificação
          <input
            type="text"
            value={source}
            onChange={event => { setSource(event.target.value); clearPreview(); }}
            placeholder="Ex.: Edital TJSP 02/2026, Anexo VIII + prioridades revisadas"
            maxLength={320}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs font-normal text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </label>
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
          Linhas do edital (TAB entre as colunas)
          <textarea
            rows={5}
            value={text}
            onChange={event => { setText(event.target.value); clearPreview(); }}
            spellCheck={false}
            placeholder={SAMPLE}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 font-mono text-[11px] font-normal text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </label>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
          <FileUp size={14} aria-hidden="true" /> Selecionar TSV/JSON
          <input
            className="sr-only"
            type="file"
            accept=".tsv,.txt,.json,text/plain,application/json"
            onChange={handleFile}
          />
        </label>
        <button
          type="button"
          onClick={prepare}
          className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white hover:opacity-90"
        >
          Pré-visualizar sem gravar
        </button>
      </div>
      {error && <p role="alert" className="mt-2 flex items-start gap-1 text-xs text-rose-700 dark:text-rose-300">
        <AlertTriangle size={14} className="shrink-0" /> {error}
      </p>}
      {message && <p role="status" className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">{message}</p>}

      {prepared && (
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/70">
          <p className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-white">
            <FileCheck size={15} /> Prévia: {prepared.input.rows.length} linhas
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-700 sm:grid-cols-4 dark:text-slate-200">
            <span>Novas disciplinas: <b>{prepared.preview.stats.newDisciplines}</b></span>
            <span>Novos tópicos: <b>{prepared.preview.stats.newTopics}</b></span>
            <span>Novos subtópicos: <b>{prepared.preview.stats.newSubtopics}</b></span>
            <span>Prioridades alteradas: <b>{prepared.preview.stats.priorityChanges}</b></span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            Nenhuma matéria, questão ou sessão anterior é excluída. Importações repetidas não duplicam os mesmos nomes.
            O A/B/C é uma classificação informada por você, não verificada automaticamente contra o edital.
          </p>
          <label className="mt-3 flex cursor-pointer items-start gap-2 text-[11px] text-slate-700 dark:text-slate-200">
            <input type="checkbox" className="mt-0.5" checked={backupConfirmed}
              onChange={event => setBackupConfirmed(event.target.checked)} />
            <span>Já exportei e guardei um backup JSON do perfil antes desta alteração.</span>
          </label>
          <button
            type="button"
            disabled={!backupConfirmed}
            onClick={apply}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ShieldCheck size={14} /> Confirmar importação no perfil ativo
          </button>
        </div>
      )}
    </section>
  );
}
