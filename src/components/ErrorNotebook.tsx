import React, { useEffect, useMemo, useState } from 'react';
import { collection, deleteDoc, doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { Download, BookOpenCheck, PlusCircle, AlertCircle, Trash2 } from 'lucide-react';
import { auth, db } from '../firebase';
import type { Discipline } from '../types';
import {
  type ErrorNote, type ErrorCause, prepareErrorNote, exportErrorNotesAnki,
} from '../errorNotebook';

interface Props { profileId: string; disciplines: Discipline[] }

const CAUSES: { value: ErrorCause; label: string }[] = [
  { value: 'desconhecimento', label: 'Não conhecia a regra' },
  { value: 'confusao', label: 'Confusão entre conceitos' },
  { value: 'interpretacao', label: 'Interpretação do enunciado' },
  { value: 'desatencao', label: 'Desatenção' },
  { value: 'tempo', label: 'Tempo insuficiente' },
  { value: 'outro', label: 'Outro' },
];

export default function ErrorNotebook({ profileId, disciplines }: Props) {
  const [notes, setNotes] = useState<ErrorNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [writing, setWriting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [disciplineId, setDisciplineId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [cause, setCause] = useState<ErrorCause>('desconhecimento');
  const [questionRef, setQuestionRef] = useState('');
  const [summary, setSummary] = useState('');
  const [rule, setRule] = useState('');
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const selectedDiscipline = disciplines.find(d => d.id === disciplineId);
  const selectedTopic = selectedDiscipline?.topics.find(t => t.id === topicId);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user || !profileId) {
      setError('Entre em sua conta e selecione um plano para acessar o caderno.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    setNotes([]);
    const notesRef = collection(db, 'users', user.uid, 'profiles', profileId, 'errors');
    const stop = onSnapshot(notesRef, snapshot => {
      const read = snapshot.docs.map(d => d.data() as ErrorNote);
      read.sort((a,b) => b.createdAtMs - a.createdAtMs);
      setNotes(read);
      setLoading(false);
    }, cause => {
      setError('Sem acesso ao banco de erros. A regra de segurança do Firestore precisa ser publicada no ambiente de teste. ' + cause.message);
      setLoading(false);
    });
    return () => stop();
  }, [profileId]);

  const counts = useMemo(() => ({
    open: notes.filter(note => note.status === 'aberto').length,
    reviewed: notes.filter(note => note.status === 'revisado').length,
    cards: notes.filter(note => note.front && note.back && note.status !== 'arquivado').length,
  }), [notes]);

  const getNotesRef = () => {
    const user = auth.currentUser;
    if (!user) throw new Error('Faça login para alterar os registros.');
    return collection(db, 'users', user.uid, 'profiles', profileId, 'errors');
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(''); setSuccess('');
    if (!selectedDiscipline || !selectedTopic) {
      setError('Selecione uma disciplina e um tópico cadastrado.');
      return;
    }
    setWriting(true);
    try {
      const itemRef = doc(getNotesRef());
      const payload = prepareErrorNote(itemRef.id, profileId, {
        disciplineId, disciplineName: selectedDiscipline.name,
        topicId, topicName: selectedTopic.name,
        questionRef, cause, summary, rule, front, back,
      }, Date.now());
      await setDoc(itemRef, payload);
      setQuestionRef(''); setSummary(''); setRule(''); setFront(''); setBack('');
      setSuccess('Erro registrado no perfil atual.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao registrar o erro.');
    } finally {
      setWriting(false);
    }
  };

  const changeStatus = async (note: ErrorNote, status: ErrorNote['status']) => {
    setError('');setSuccess('');
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Faça login para atualizar o registro.');
      await updateDoc(doc(db,'users',user.uid,'profiles',profileId,'errors',note.id),{
        status, updatedAtMs: Date.now(),
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Erro ao atualizar o status.');
    }
  };

  const remove = async (note: ErrorNote) => {
    if (!window.confirm('Excluir definitivamente este erro? Esta ação não altera seu histórico de questões.')) return;
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Faça login para excluir.');
      await deleteDoc(doc(db,'users',user.uid,'profiles',profileId,'errors',note.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Erro ao excluir o registro.');
    }
  };

  const downloadAnki = () => {
    setError('');setSuccess('');
    const deck = exportErrorNotesAnki(notes);
    if (!deck.count) {
      setError('Não há flashcards completos neste caderno para exportar.');
      return;
    }
    const blob = new Blob(['\uFEFF', deck.text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    try {
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'estudei-erros-anki-' + new Date().toISOString().slice(0, 10) + '.txt';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setSuccess(deck.count + ' cartões preparados para importação no Anki.');
    } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
  };

  const visible = notes.filter(n => showArchived || n.status !== 'arquivado');
  const field = 'mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white';

  return (
    <div className="space-y-5 pb-10">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Caderno de erros</h2>
          <p className="mt-1 text-sm text-slate-500">Cada erro é independente e pertence apenas ao plano ativo.</p>
        </div>
        <button type="button" onClick={downloadAnki}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white">
          <Download size={15} /> Exportar Anki
        </button>
      </header>

      <div className="grid grid-cols-3 gap-3">
        {[
          {label:'Pendentes',count:counts.open},
          {label:'Revisados',count:counts.reviewed},
          {label:'Flashcards',count:counts.cards}
        ].map(item => (
          <div key={item.label} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs text-slate-500">{item.label}</p>
            <p className="mt-1 text-xl font-extrabold text-slate-800 dark:text-white">{item.count}</p>
          </div>
        ))}
      </div>

      {error && <p role="alert" className="flex gap-2 rounded-lg border border-rose-200 p-3 text-xs text-rose-700 dark:text-rose-300">
        <AlertCircle size={15} className="shrink-0" />{error}
      </p>}
      {success && <p role="status" className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">{success}</p>}

      <form onSubmit={submit} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <PlusCircle size={16} className="text-emerald-700" />
          <h3 className="font-bold text-slate-800 dark:text-white">Registrar um erro</h3>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-200">
            Matéria
            <select required className={field} value={disciplineId} onChange={e=>{setDisciplineId(e.target.value);setTopicId('');}}>
              <option value="">Selecionar matéria...</option>
              {disciplines.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-200">
            Assunto
            <select required className={field} value={topicId} onChange={e=>setTopicId(e.target.value)}>
              <option value="">Selecionar tópico...</option>
              {(selectedDiscipline?.topics||[]).map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-200">
            Causa do erro
            <select className={field} value={cause} onChange={e=>setCause(e.target.value as ErrorCause)}>
              {CAUSES.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-200">
            Banca, ano ou referência da questão (opcional)
            <input className={field} maxLength={240} value={questionRef} onChange={e=>setQuestionRef(e.target.value)} placeholder="Vunesp, TJSP 2024, questão 12"/>
          </label>
        </div>
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-200">
          O que provocou o erro?
          <textarea className={field} required maxLength={1000} rows={2} value={summary} onChange={e=>setSummary(e.target.value)} placeholder="Confundi o prazo material com o prazo processual."/>
        </label>
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-200">
          Qual é a regra correta?
          <textarea className={field} required maxLength={2000} rows={2} value={rule} onChange={e=>setRule(e.target.value)} placeholder="Regra fundamentada no dispositivo e no material estudado."/>
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-200">
            Frente do flashcard (opcional)
            <textarea className={field} maxLength={500} rows={2} value={front} onChange={e=>setFront(e.target.value)}/>
          </label>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-200">
            Verso (opcional)
            <textarea className={field} maxLength={1000} rows={2} value={back} onChange={e=>setBack(e.target.value)}/>
          </label>
        </div>
        <button disabled={writing || loading} type="submit"
          className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
          {writing ? 'Salvando...' : 'Salvar erro individual'}
        </button>
        <p className="text-[11px] text-slate-500">
          O banco é separado dos históricos de questões. Flashcards devem ser conferidos antes da exportação.
        </p>
      </form>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 font-bold text-slate-800 dark:text-white">
            <BookOpenCheck size={17}/> Registros ({visible.length})
          </h3>
          <label className="flex items-center gap-2 text-xs text-slate-500">
            <input type="checkbox" checked={showArchived} onChange={e=>setShowArchived(e.target.checked)}/>
            Exibir arquivados
          </label>
        </div>
        {loading ? <p className="text-sm text-slate-500">Carregando erros...</p> : visible.length===0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500 dark:border-slate-800">
            Nenhum erro cadastrado neste plano.
          </p>
        ) : visible.slice(0,100).map(note=>(
          <article key={note.id} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-500">{note.disciplineName} · {note.topicName}</p>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{note.questionRef}</p>
              </div>
              <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{note.status}</span>
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{note.summary}</p>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">Regra: {note.rule}</p>
            {note.front && note.back && <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">Anki: {note.front} → {note.back}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button type="button" onClick={()=>changeStatus(note,note.status==='revisado'?'aberto':'revisado')}
                className="rounded-md border border-slate-200 px-2 py-1.5 text-[11px] font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-200">
                {note.status==='revisado'?'Reabrir':'Marcar revisado'}
              </button>
              <button type="button" onClick={()=>changeStatus(note,'arquivado')}
                className="rounded-md border border-slate-200 px-2 py-1.5 text-[11px] font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-200">
                Arquivar
              </button>
              <button type="button" onClick={()=>remove(note)} title="Excluir erro definitivamente"
                className="ml-auto rounded-md border border-rose-100 px-2 py-1.5 text-[11px] text-rose-600 dark:border-rose-900">
                <Trash2 size={13}/>
              </button>
            </div>
          </article>
        ))}
        {visible.length>100 && <p className="text-xs text-slate-500">Mostrando os 100 registros mais recentes. A paginação será adicionada antes de ampliar o volume.</p>}
      </section>
    </div>
  );
}
