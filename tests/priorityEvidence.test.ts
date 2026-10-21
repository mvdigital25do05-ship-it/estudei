import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parsePriorityEvidence, matchEvidenceExact, previewPriorityAssignments,
} from '../src/priorityEvidence';
import type { Discipline } from '../src/types';

const data: Discipline[]=[
  {id:'d1',name:'Direito Penal',icon:'gavel',colorClass:'emerald',
    topicsTotal:2,topicsDone:1,timeSpentMin:120,correctAnswers:10,wrongAnswers:2,
    topics:[
      {id:'t1',name:'Crimes funcionais',completed:true,examPriority:'B',learningPhase:'consolidacao'},
      {id:'t2',name:'Falsidade documental',completed:false},
    ]},
  {id:'d2',name:'Direito Processual Civil',icon:'gavel',colorClass:'emerald',
    topicsTotal:1,topicsDone:0,timeSpentMin:0,correctAnswers:0,wrongAnswers:0,
    topics:[{id:'t1',name:'Tutela provisória',completed:false}]},
];

const sheet=[
  'index\tDisciplina\tABC\tOrdem\tAssunto\tRecorte\tFundamento',
  '0\tDireito Penal\tA\t1\tCrimes funcionais\tCP 312 a 317\tHistórico analisado',
  '1\tDireito Penal\tB\t2\tFalsidade documental\tCP 297 a 305\tLevantamento editorial',
  '2\tProcesso Civil\tB\t1\tTutela provisória\tCPC 294 a 311\tMatriz revisada',
].join('\n');

test('reads pasted spreadsheet TSV without uploading private content',()=>{
  const parsed=parsePriorityEvidence(sheet,'Planilha ABC privada do estudante');
  assert.equal(parsed.rows.length,3);
  assert.equal(parsed.rows[0].priority,'A');
  assert.equal(parsed.rows[1].legalScope,'CP 297 a 305');
  assert.equal(parsed.rows[2].discipline,'Processo Civil');
});

test('exact mappings recognize subject aliases but not approximate mixed topics',()=>{
  const parsed=parsePriorityEvidence(sheet,'Fonte do usuário');
  const matches=matchEvidenceExact(data,parsed);
  assert.equal(matches.length,3);
  assert.deepEqual(matches[2],{row:2,disciplineId:'d2',topicId:'t1'});
  const modified=parsePriorityEvidence(
    sheet.replace('Crimes funcionais\t','Crimes funcionais (subgrupo)\t'),'Fonte do usuário');
  assert.equal(matchEvidenceExact(data,modified).length,2);
});

test('applies only confirmed target mapping without modifying history or source',()=>{
  const parsed=parsePriorityEvidence(sheet,'Análise histórica declarada');
  const items=matchEvidenceExact(data,parsed);
  const preview=previewPriorityAssignments(data,parsed,items.slice(0,1));
  assert.equal(preview.applied,1);
  assert.equal(preview.overwritten,1);
  assert.equal(preview.disciplines[0].topics[0].examPriority,'A');
  assert.equal(preview.disciplines[0].topics[0].examPrioritySource,'Análise histórica declarada');
  assert.equal(preview.disciplines[0].topics[0].completed,true);
  assert.equal(preview.disciplines[0].timeSpentMin,120);
  assert.equal(data[0].topics[0].examPriority,'B');
  assert.equal(preview.disciplines[0].topics[1].examPriority,undefined);
});

test('reimporting same evidence is idempotent',()=>{
  const parsed=parsePriorityEvidence(sheet,'Classificação de revisão');
  const chosen=matchEvidenceExact(data,parsed);
  const first=previewPriorityAssignments(data,parsed,chosen);
  const second=previewPriorityAssignments(first.disciplines,parsed,chosen);
  assert.equal(second.applied,0);
  assert.equal(second.unchanged,3);
  assert.deepEqual(second.disciplines,first.disciplines);
});

test('detects conflicting ABC grades for the same target topic',()=>{
  const parsed=parsePriorityEvidence(sheet,'Fonte');
  const duplicate=[
    {row:0,disciplineId:'d1',topicId:'t1'},
    {row:1,disciplineId:'d1',topicId:'t1'},
  ];
  assert.throws(()=>previewPriorityAssignments(data,parsed,duplicate),/conflitantes/);
});

test('refuses cross-discipline target, unsupported source and wrong IDs',()=>{
  const parsed=parsePriorityEvidence(sheet,'Fonte');
  assert.throws(()=>previewPriorityAssignments(data,parsed,[
    {row:0,disciplineId:'d2',topicId:'t1'}
  ]),/não corresponde/);
  assert.throws(()=>previewPriorityAssignments(data,parsed,[
    {row:0,disciplineId:'d1',topicId:'absent'}
  ]),/não existe/);
  assert.throws(()=>parsePriorityEvidence(sheet,''),/fonte/i);
  assert.throws(()=>parsePriorityEvidence('Assunto\tDisciplina','ok'),/cabeçalho/i);
});

test('correctly parses quoted CSV containing commas',()=>{
  const csv='Disciplina,ABC,Assunto,Recorte,Fundamento\nDireito Penal,A,"Crimes, tipo especial","CP 312, 313","Estudo 2024, 2025"';
  const parsed=parsePriorityEvidence(csv,'Fonte');
  assert.equal(parsed.rows[0].topic,'Crimes, tipo especial');
  assert.equal(parsed.rows[0].legalScope,'CP 312, 313');
});

test('does not guess classification from legal ranges shared by different topics',()=>{
  const parsed=parsePriorityEvidence('Disciplina\tABC\tAssunto\nDireito Penal\tA\tCrimes funcionais e sistemas','Fonte');
  assert.deepEqual(matchEvidenceExact(data,parsed),[]);
});
