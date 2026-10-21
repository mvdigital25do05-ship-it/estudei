import React, { useEffect, useState } from 'react';
import { Check, Edit2, Plus, Trash2, X } from 'lucide-react';
import { ActivityLog, Discipline, ExerciseLog } from '../types';
import { getNodeStats, getNodeTopics, getTopicGroups, StudyContentNode } from '../topicGroups';
import { formatMinutes, formatTopicName } from '../utils';

interface Props {
  discipline: Discipline;
  activities: ActivityLog[];
  exercises: ExerciseLog[];
  onSetCompletion: (ids: string[], completed: boolean) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onAdd: (groupId: string, name: string) => void;
  onToggleSubtopic: (id: string, subtopicId: string) => void;
}

export default function StudyTopicsTree({ discipline, activities, exercises, onSetCompletion, onRename, onDelete, onAdd, onToggleSubtopic }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [adding, setAdding] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  useEffect(() => { setEditing(null); setAdding(null); setName(''); setNewName(''); }, [discipline.id]);
  const groups = getTopicGroups(discipline);
  const groupedMinutes = groups.reduce((n, node) => n + getNodeStats(node, activities, exercises, discipline.id, discipline.name).minutes, 0);
  const unassignedMinutes = Math.max(0, discipline.timeSpentMin - groupedMinutes);
  const render = (node: StudyContentNode, position: string, depth: number): React.ReactNode => {
    const topics = getNodeTopics(node);
    const stats = getNodeStats(node, activities, exercises, discipline.id, discipline.name);
    const allDone = stats.total > 0 && stats.completed === stats.total;
    const checkbox = <input type="checkbox" checked={allDone} aria-label={`Concluir ${formatTopicName(node.name)}`}
      ref={input => { if (input) input.indeterminate = stats.completed > 0 && !allDone; }}
      onClick={event => event.stopPropagation()}
      onChange={event => onSetCompletion(topics.map(t => t.id), event.target.checked)}
      className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-emerald-600" />;
    const metrics = <span className="mt-1 block text-[10px] font-medium text-slate-500">
      {formatMinutes(stats.minutes)}{stats.correct + stats.wrong > 0 ? ` · ${stats.correct + stats.wrong} questões · ${Math.round(100 * stats.correct / (stats.correct + stats.wrong))}% acertos` : ''}
      {!node.topic ? ` · ${stats.completed}/${stats.total} assuntos concluídos` : ''}
    </span>;
    if (!node.topic) return <details key={node.id} open={depth === 0} className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
      <summary className="cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-100">
        <span className="inline-flex max-w-full items-start gap-2 align-middle">{checkbox}<span>{position}- {node.name}{metrics}</span></span>
      </summary>
      <div className="mt-3 space-y-2 border-l border-slate-200 pl-3 dark:border-slate-700">
        {(node.children || []).map((child, index) => render(child, `${position}.${index + 1}`, depth + 1))}
      </div>
      {node.groupId && <div className="mt-3">
        {adding === node.groupId ? <form className="flex gap-2" onSubmit={event => {
          event.preventDefault();
          if (newName.trim()) { onAdd(node.groupId!, newName.trim()); setAdding(null); setNewName(''); }
        }}>
          <input autoFocus aria-label={`Novo assunto de ${node.name}`} value={newName} onChange={event => setNewName(event.target.value)} className="min-w-0 flex-1 rounded border px-2 py-1 text-xs dark:bg-slate-800" />
          <button type="submit" aria-label="Salvar assunto"><Check size={15} /></button>
          <button type="button" aria-label="Cancelar" onClick={() => setAdding(null)}><X size={15} /></button>
        </form> : <button type="button" onClick={() => { setAdding(node.groupId!); setNewName(''); }} className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400"><Plus size={12} />Adicionar assunto</button>}
      </div>}
    </details>;
    return <div key={node.id} className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-800/40">
      <div className="flex items-start gap-2">{checkbox}<div className="min-w-0 flex-1">
        {editing === node.id ? <form className="flex gap-2" onSubmit={event => {
          event.preventDefault();
          if (name.trim()) { onRename(node.id, name.trim()); setEditing(null); }
        }}>
          <input autoFocus aria-label="Nome do assunto" value={name} onChange={event => setName(event.target.value)} className="min-w-0 flex-1 rounded border px-2 py-1 text-xs dark:bg-slate-800" />
          <button type="submit" aria-label="Salvar nome"><Check size={14} /></button>
          <button type="button" aria-label="Cancelar edição" onClick={() => setEditing(null)}><X size={14} /></button>
        </form> : <span className={`text-xs ${allDone ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>{position}- {formatTopicName(node.name)}</span>}
        {metrics}
        {node.topic.subtopics?.map(subtopic => <label key={subtopic.id} className="mt-2 flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
          <input type="checkbox" checked={subtopic.completed} onChange={() => onToggleSubtopic(node.id, subtopic.id)} />{formatTopicName(subtopic.name)}
        </label>)}
      </div>
        <button type="button" aria-label={`Editar ${formatTopicName(node.name)}`} onClick={() => { setEditing(node.id); setName(formatTopicName(node.name)); }} className="text-slate-400 hover:text-emerald-600"><Edit2 size={12} /></button>
        <button type="button" aria-label={`Excluir ${formatTopicName(node.name)}`} onClick={() => onDelete(node.id)} className="text-slate-400 hover:text-rose-600"><Trash2 size={12} /></button>
      </div>
    </div>;
  };
  return <div className="max-h-[460px] space-y-3 overflow-y-auto pr-1">
    {groups.map((node, index) => render(node, String(index + 1), 0))}
    {unassignedMinutes > 0 && <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-300">
      {formatMinutes(unassignedMinutes)} do histórico desta matéria não têm subtópico identificado. Esse tempo continua no total da matéria.
    </p>}
  </div>;
}
