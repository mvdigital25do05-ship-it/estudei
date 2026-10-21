import React, { useState } from 'react';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { buildTJSPBackup } from '../tjspBackup';
import { CargoPlan } from '../types';

export default function DownloadTJSPButton() {
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');
  if (import.meta.env.MODE !== 'homologation' || db.app.options.projectId !== 'estudei-2'
    || auth.currentUser?.uid !== 'KTuSpkb179e7uOhgoicGZVruiWg2') return null;

  const download = async () => {
    const user = auth.currentUser;
    if (!user || working) return;
    setWorking(true);
    setMessage('');
    try {
      const userRef = doc(db, 'users', user.uid);
      const [userSnap, profilesSnap] = await Promise.all([getDoc(userRef), getDocs(collection(userRef, 'profiles'))]);
      if (auth.currentUser?.uid !== user.uid) throw Error('A conta mudou. Entre novamente antes de baixar.');
      if (!userSnap.exists()) throw Error('Não foi possível encontrar seus dados na homologação.');
      const profiles = profilesSnap.docs.map(p => ({ ...p.data(), id: p.id } as CargoPlan));
      const result = buildTJSPBackup(userSnap.data(), profiles);
      const url = URL.createObjectURL(new Blob([result.text], { type: 'application/json;charset=utf-8' }));
      const link = document.createElement('a');
      try {
        link.href = url;
        link.download = 'escrevente-tjsp-aproveitamento.json';
        document.body.appendChild(link);
        link.click();
      } finally {
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      setMessage(`Arquivo gerado: ${Math.floor(result.minutes / 60)}h${String(result.minutes % 60).padStart(2, '0')}, ${result.activities} atividades. Selecione-o em Importar estudos.`);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Não foi possível gerar o arquivo. Tente novamente.');
    } finally { setWorking(false); }
  };

  return <div className="flex flex-col items-end gap-1">
    <button type="button" disabled={working} onClick={() => void download()} className="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-800 disabled:opacity-50">
      {working ? 'Preparando arquivo...' : 'Baixar estudos para TJSP'}
    </button>
    {message && <p role="status" className="max-w-72 text-xs text-slate-600 dark:text-slate-300">{message}</p>}
  </div>;
}
