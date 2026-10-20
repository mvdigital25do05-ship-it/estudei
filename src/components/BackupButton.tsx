import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { auth, db } from '../firebase';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';

export default function BackupButton() {
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  const exportBackup = async () => {
    const user = auth.currentUser;
    if (!user || working) return;
    setWorking(true);
    setError('');
    try {
      // Read-only export, using the same owner-authenticated Firestore paths as App.tsx.
      const userSnap = await getDoc(doc(db, 'users', user.uid));
      const profilesSnap = await getDocs(collection(db, 'users', user.uid, 'profiles'));
      const backup = {
        format: 'estudei-backup',
        version: 1,
        exportedAt: new Date().toISOString(),
        user: userSnap.exists() ? userSnap.data() : null,
        profiles: profilesSnap.docs.map(profile => ({ documentId: profile.id, data: profile.data() })),
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8' });
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

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={exportBackup}
        disabled={working}
        title="Exportar todos os seus perfis e registros, sem alterar o banco"
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
      >
        {working ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
        {working ? 'Exportando...' : 'Backup JSON'}
      </button>
      {error && <p role="alert" className="max-w-56 text-right text-[10px] text-rose-600">{error}</p>}
    </div>
  );
}
