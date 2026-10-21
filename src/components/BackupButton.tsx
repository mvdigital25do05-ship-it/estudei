import React, { useRef, useState } from 'react';
import { Download, FileCheck2, Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { auth, db } from '../firebase';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { createBackup, inspectBackup, MAX_BACKUP_FILE_BYTES, BackupInspection } from '../backup';

/**
 * Backup e inspeção locais. Nenhuma operação de importação/restauração é
 * realizada por este componente. Todas as leituras do banco exigem login.
 */
export default function BackupButton() {
  const [working, setWorking] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [inspection, setInspection] = useState<BackupInspection | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const exportBackup = async () => {
    const user = auth.currentUser;
    if (!user || working || checking) return;
    setWorking(true);
    setError('');

    try {
      const userSnap = await getDoc(doc(db, 'users', user.uid));
      const profilesSnap = await getDocs(collection(db, 'users', user.uid, 'profiles'));
      const backup = await createBackup({
        user: userSnap.exists() ? userSnap.data() : null,
        profiles: profilesSnap.docs.map(profile => ({
          documentId: profile.id,
          data: profile.data(),
        })),
      });

      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: 'application/json;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      try {
        const link = document.createElement('a');
        link.href = url;
        link.download = `estudei-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
      } finally {
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (cause) {
      console.error('Falha na exportação do backup', cause);
      setError('Não foi possível exportar. Verifique sua conexão e tente novamente.');
    } finally {
      setWorking(false);
    }
  };

  const verifyBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file || working || checking) return;

    setChecking(true);
    setError('');
    setInspection(null);

    try {
      if (file.size > MAX_BACKUP_FILE_BYTES) {
        throw new Error('O arquivo é muito grande para a verificação local (limite de 30 MB).');
      }
      const parsed: unknown = JSON.parse(await file.text());
      setInspection(await inspectBackup(parsed));
    } catch (cause) {
      setError(cause instanceof SyntaxError
        ? 'O arquivo selecionado não é um JSON válido.'
        : cause instanceof Error ? cause.message : 'Não foi possível verificar o arquivo.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={exportBackup}
          disabled={working || checking}
          title="Exportar todos os perfis e históricos do Firebase em JSON"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
        >
          {working ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          {working ? 'Exportando...' : 'Backup JSON'}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          onChange={verifyBackup}
          className="hidden"
          aria-label="Selecionar um backup JSON para verificar"
        />
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={working || checking}
          title="Conferir um arquivo de backup localmente, sem importar nem modificar seus dados"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
        >
          {checking ? <Loader2 size={14} className="animate-spin" /> : <FileCheck2 size={14} />}
          {checking ? 'Verificando...' : 'Verificar backup'}
        </button>
      </div>

      {error && <p role="alert" className="max-w-sm text-right text-[11px] text-rose-600">{error}</p>}
      {inspection && (
        <div
          role="status"
          className={`max-w-sm rounded-lg border px-3 py-2 text-left text-[11px] shadow-sm ${
            inspection.valid
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200'
              : 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200'
          }`}
        >
          <p className="flex items-center gap-1.5 font-bold">
            {inspection.valid ? <ShieldCheck size={14} /> : <AlertTriangle size={14} />}
            {inspection.valid ? 'Estrutura válida' : 'Backup com problemas'}
            {inspection.integrity === 'verified' && ' · Integridade verificada'}
          </p>
          <p className="mt-1">
            {inspection.profileCount} perfil(is), {inspection.exerciseRecords} registros de questões,
            {' '}{inspection.activityRecords} atividades e {inspection.questionsCount} questões contabilizadas.
          </p>
          {inspection.errors.map((issue, i) => <p key={`error-${i}`} className="mt-1">Erro: {issue}</p>)}
          {inspection.warnings.map((notice, i) => <p key={`warn-${i}`} className="mt-1">Aviso: {notice}</p>)}
          <p className="mt-1 opacity-80">Somente leitura local. Seus dados na nuvem não foram alterados.</p>
        </div>
      )}
    </div>
  );
}
