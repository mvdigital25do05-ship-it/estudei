import React, { useMemo, useState } from 'react';
import { AlertTriangle, FileSpreadsheet, ShieldCheck } from 'lucide-react';
import type { Discipline } from '../types';
import { normalizeOutlineName } from '../outlineImport';
import {
  matchEvidenceExact, parsePriorityEvidence, previewPriorityAssignments,
  resolveEvidenceDiscipline, type PriorityAssignment, type PriorityEvidenceImport,
} from '../priorityEvidence';

interface Props {
  disciplines: Discipline[];
  onApply: (source: PriorityEvidenceImport, assignments: PriorityAssignment[]) => void;
}

/**
 * The source document stays in browser state; the user decides each mapping.
 * In particular, overlapping legal recortes MUST NOT automatically propagate
 * grades to an entire topic with mixed A/B/C evidence.
 */
export default function PriorityEvidencePanel({disciplines,onApply}:Props) {
  const [text,setText]=useState('');
  const [source,setSource]=useState('');
  const [parsed,setParsed]=useState<PriorityEvidenceImport|null>(null);
  const [mappings,setMappings]=useState<Record<number,string>>({});
  const [backupConfirmed,setBackupConfirmed]=useState(false);
  const [error,setError]=useState('');
  const [success,setSuccess]=useState('');

  const clear=()=>{
    setParsed(null);setMappings({});setBackupConfirmed(false);
    setError('');setSuccess('');
  };

  const importFile=async(event:React.ChangeEvent<HTMLInputElement>)=>{
    const file=event.target.files?.[0];
    event.target.value='';
    if(!file)return;
    clear();
    if(file.size>400_000){setError('Arquivo maior que 400 KB.');return;}
    try{setText(await file.text());}
    catch{setError('Não foi possível ler o arquivo.');}
  };

  const prepare=()=>{
    setError('');setSuccess('');setBackupConfirmed(false);
    try{
      const read=parsePriorityEvidence(text,source);
      const exact=matchEvidenceExact(disciplines,read);
      setParsed(read);
      setMappings(Object.fromEntries(exact.map(row=>[row.row,row.topicId])));
    }catch(cause){
      setParsed(null);
      setError(cause instanceof Error?cause.message:'Não foi possível interpretar a planilha.');
    }
  };

  const {assignments,preview,previewError}=useMemo(()=>{
    if(!parsed)return {assignments:[],preview:null,previewError:''};
    const selected:PriorityAssignment[]=[];
    for(const row of parsed.rows){
      const topicId=mappings[row.row];
      if(!topicId)continue;
      const d=disciplines.filter(disc=>
        normalizeOutlineName(disc.name)===resolveEvidenceDiscipline(row.discipline));
      if(d.length===1)selected.push({row:row.row,disciplineId:d[0].id,topicId});
    }
    try{
      return {
        assignments:selected,
        preview:previewPriorityAssignments(disciplines,parsed,selected),
        previewError:'',
      };
    }catch(cause){
      return {assignments:selected,preview:null,
        previewError:cause instanceof Error?cause.message:'Classificações inconsistentes.'};
    }
  },[parsed,mappings,disciplines]);

  const apply=()=>{
    if(!parsed||!backupConfirmed||!preview||!assignments.length)return;
    setError('');
    try{
      // Revalidate against the latest discipline array before emitting a
      // change request; App repeats this with a functional React state update.
      previewPriorityAssignments(disciplines,parsed,assignments);
      onApply(parsed,assignments);
      setSuccess(`${assignments.length} correspondência(s) enviada(s) ao plano ativo. Confira o salvamento na nuvem.`);
      setParsed(null);setMappings({});setBackupConfirmed(false);
    }catch(cause){setError(cause instanceof Error?cause.message:'Não foi possível aplicar.');}
  };

  const inputClass='mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white';

  return (
    <section className="rounded-xl border border-indigo-200 bg-white p-4 shadow-sm dark:border-indigo-900 dark:bg-slate-900"
      aria-labelledby="priority-evidence-heading">
      <div className="flex items-start gap-3">
        <FileSpreadsheet size={20} className="mt-0.5 shrink-0 text-indigo-600 dark:text-indigo-300"/>
        <div>
          <h3 id="priority-evidence-heading" className="text-sm font-extrabold text-slate-800 dark:text-white">
            Importar prioridades A/B/C da sua planilha
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Exporte a aba Mapa ABC como CSV/TSV ou copie as células do Excel.
            Os dados são lidos localmente. Nenhuma classificação será atribuída
            a um tópico sem uma correspondência revisada.
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
          Origem da análise (não é uma classificação oficial do edital)
          <input className={inputClass} value={source}
            placeholder="Ex.: Minha planilha ABC, pesquisa Vunesp 2021–2025"
            maxLength={180} onChange={e=>{setSource(e.target.value);clear();}}/>
        </label>
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
          Tabela com Disciplina, ABC e Assunto
          <textarea className={inputClass+' font-mono'} rows={4} value={text}
            onChange={e=>{setText(e.target.value);clear();}}
            placeholder={'Disciplina\tABC\tAssunto\tRecorte\nDireito Penal\tA\tCrimes funcionais\tCP 312 a 317'}/>
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <label className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200">
            Escolher CSV/TSV
            <input className="sr-only" type="file" accept=".csv,.tsv,.txt,text/plain,text/csv"
              onChange={importFile}/>
          </label>
          <button type="button" onClick={prepare}
            className="rounded-lg bg-indigo-700 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-800">
            Revisar correspondências
          </button>
        </div>
      </div>

      {error&&<p role="alert" className="mt-2 flex gap-1 text-xs text-rose-700 dark:text-rose-300">
        <AlertTriangle size={14} className="shrink-0"/>{error}
      </p>}
      {success&&<p role="status" className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">{success}</p>}

      {parsed&&(
        <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
          <p className="text-xs font-bold text-slate-800 dark:text-white">
            {parsed.rows.length} assuntos lidos · {assignments.length} correspondência(s) selecionada(s)
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Ao misturar artigos A e B no mesmo tópico do edital, selecione apenas uma
            correspondência fundamentada ou deixe sem classificação.
          </p>
          <div className="mt-3 max-h-[390px] space-y-2 overflow-y-auto pr-1">
            {parsed.rows.map(row=>{
              const choices=disciplines.filter(d=>
                normalizeOutlineName(d.name)===resolveEvidenceDiscipline(row.discipline));
              const discipline=choices.length===1?choices[0]:null;
              return(
                <div key={row.row} className="grid grid-cols-1 gap-2 rounded-lg border border-slate-100 p-2.5 dark:border-slate-800 sm:grid-cols-2 sm:items-center">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-slate-800 dark:text-white">
                      <span className="mr-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] dark:bg-slate-800">{row.priority}</span>
                      {row.topic}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                      {row.discipline} {row.legalScope?'· '+row.legalScope:''}
                    </p>
                    {row.evidence&&<p className="mt-1 text-[10px] italic text-slate-500 dark:text-slate-400">
                      Fonte da planilha: {row.evidence}
                    </p>}
                  </div>
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    Vincular a tópico do seu edital
                    <select aria-label={`Vincular ${row.topic}`} className={inputClass}
                      disabled={!discipline}
                      value={mappings[row.row]||''}
                      onChange={e=>{setMappings(prev=>({...prev,[row.row]:e.target.value}));setBackupConfirmed(false);}}>
                      <option value="">{discipline?'Não vincular / revisar depois':'Matéria não cadastrada'}</option>
                      {discipline?.topics.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </label>
                </div>
              );
            })}
          </div>

          {previewError&&<p role="alert" className="mt-3 text-xs text-rose-700 dark:text-rose-300">{previewError}</p>}
          {preview&&<div className="mt-3 rounded-lg bg-slate-50 p-3 text-[11px] text-slate-600 dark:bg-slate-800/80 dark:text-slate-300">
            Prévia: <strong>{preview.applied} classificação(ões) para gravar</strong>,
            {' '}{preview.overwritten} mudança(s) de grau existente e {preview.unchanged} sem alteração.
          </div>}
          <label className="mt-3 flex cursor-pointer items-start gap-2 text-[11px] text-slate-700 dark:text-slate-200">
            <input type="checkbox" className="mt-0.5" checked={backupConfirmed}
              onChange={e=>setBackupConfirmed(e.target.checked)}/>
            Já exportei um backup JSON e revisei as correspondências antes de atualizar meu perfil.
          </label>
          <button type="button" onClick={apply}
            disabled={!backupConfirmed||!preview||!assignments.length||preview.applied===0}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">
            <ShieldCheck size={14}/> Aplicar classificações selecionadas
          </button>
        </div>
      )}
    </section>
  );
}
