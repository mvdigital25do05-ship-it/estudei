import React, { useRef, useState } from 'react';
import { collection, doc, runTransaction, waitForPendingWrites } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { parseBackup, StudyBackup } from '../backup';

export default function ImportBackupButton() {
  const input = useRef<HTMLInputElement>(null);
  const [backup, setBackup] = useState<StudyBackup | null>(null);
  const [digest, setDigest] = useState('');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  if (import.meta.env.MODE !== 'homologation') return null;

  const chooseFile = async (file?: File) => {
    setError('');
    setBackup(null);
    if (!file) return;
    try {
      if (file.size > 8_000_000) throw Error('O backup excede o limite de 8 MB.');
      const text = await file.text();
      const parsed = parseBackup(text);
      if (parsed.user.email.toLowerCase().trim() !== auth.currentUser?.email?.toLowerCase().trim()) {
        throw Error('Entre na homologação com uma conta criada com o mesmo e-mail do backup.');
      }
      const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(parsed)));
      setDigest(Array.from(new Uint8Array(hash)).map(x => x.toString(16).padStart(2, '0')).join('').slice(0, 24));
      setBackup(parsed);
    } catch (cause) {
      setError(cause instanceof SyntaxError ? 'O arquivo não contém JSON válido.' : cause instanceof Error ? cause.message : 'Não foi possível ler o backup.');
    }
  };

  const restore = async () => {
    const user = auth.currentUser;
    if (!backup || !user || working) return;
    if (db.app.options.projectId !== 'estudei-2' || db.app.options.appId !== '1:75477904031:web:1efeafa64e0db41b5750aa') {
      setError('A importação só está disponível no projeto de homologação estudei-2.');
      return;
    }
    setWorking(true);
    setError('');
    try {
      await waitForPendingWrites(db);
      const userRef = doc(db, 'users', user.uid);
      const entries = backup.profiles.map((profile, index) => ({
        ...profile,
        ref: doc(collection(userRef, 'profiles'), `import_${digest}_${index}`),
      }));
      await runTransaction(db, async transaction => {
        const current = await transaction.get(userRef);
        if (!current.exists()) throw Error('Conclua o cadastro na homologação antes de importar.');
        if (current.data().email?.toLowerCase().trim() !== backup.user.email.toLowerCase().trim()) throw Error('O e-mail da conta não corresponde ao backup.');
        for (const entry of entries) {
          if ((await transaction.get(entry.ref)).exists()) throw Error('Este backup já foi importado. Nenhum dado foi alterado.');
        }
        for (const entry of entries) transaction.set(entry.ref, { ...entry.data, id: entry.ref.id });
        const active = entries.find(entry => entry.documentId === backup.user.activeProfileId) || entries[0];
        transaction.update(userRef, { activeProfileId: active.ref.id, reminders: backup.user.reminders });
      });
      setDone(true);
      setBackup(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível importar. Nenhum dado deste lote foi gravado.');
    } finally {
      setWorking(false);
    }
  };

  return <>
    <input ref={input} type="file" accept=".json,application/json" className="hidden" aria-label="Arquivo de backup do Estudei" onChange={event => {
      void chooseFile(event.target.files?.[0]);
      event.target.value = '';
    }} />
    <button type="button" onClick={() => input.current?.click()} className="rounded-lg border px-3 py-2 text-xs font-bold">Importar estudos</button>
    {(backup || error || done) && <div role="dialog" aria-modal="true" aria-label="Importar estudos" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-w-lg rounded-xl bg-white p-6 text-slate-900 shadow-xl">
        <h2 className="mb-3 text-lg font-bold">Importar estudos na homologação</h2>
        {backup && <>
          <p>{backup.profiles.length} perfil(is), {backup.profiles.reduce((n, p) => n + (p.data.activityLogs?.length || 0), 0)} registros de atividade e {backup.profiles.reduce((n, p) => n + (p.data.exerciseLogs?.length || 0), 0)} registros de exercícios.</p>
          <p className="my-3">Seus perfis atuais serão preservados. Os lembretes serão substituídos pelos do backup e o perfil importado ficará ativo. Os dados do Estudei 1 permanecem intactos.</p>
          <button type="button" disabled={working} onClick={() => void restore()} className="mr-3 rounded bg-indigo-600 px-4 py-2 text-white disabled:opacity-50">{working ? 'Importando...' : 'Confirmar importação'}</button>
        </>}
        {error && <p role="alert" className="my-3 text-rose-700">{error}</p>}
        {done && <p className="my-3">Importação concluída. Recarregue para abrir seus estudos.</p>}
        <button type="button" disabled={working} onClick={() => {
          if (done) window.location.reload();
          else { setBackup(null); setError(''); }
        }} className="rounded border px-4 py-2">{done ? 'Abrir meus estudos' : 'Fechar'}</button>
      </div>
    </div>}
  </>;
}
