import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTopicDiagnostics } from '../src/studyStrategy';
import { summarizeStudyOverview } from '../src/studyOverview';
import type { Discipline, ExerciseLog } from '../src/types';

const mock: Discipline[] = [
  {
    id:'penal', name:'Direito Penal', icon:'gavel', colorClass:'emerald',
    topicsTotal:4, topicsDone:2, timeSpentMin:90, correctAnswers:0, wrongAnswers:0,
    topics:[
      {id:'t1',name:'Peculato',completed:true,examPriority:'A'},
      {id:'t2',name:'Concussão',completed:false,examPriority:'A'},
      {id:'t3',name:'Corrupção passiva',completed:true,examPriority:'B'},
      {id:'t4',name:'Prevaricação',completed:false},
    ]
  },
  {
    id:'info',name:'Informática',icon:'computer',colorClass:'purple',
    topicsTotal:1,topicsDone:0,timeSpentMin:0,correctAnswers:0,wrongAnswers:0,
    topics:[{id:'t1',name:'Excel',completed:false}],
  }
];

const entry=(id:string,disciplineId:string,topicId:string,correct:number,wrong:number):ExerciseLog => ({
  id,disciplineId,topicId,disciplineName:'',topicName:'',correctAnswers:correct,
  wrongAnswers:wrong,accuracyPercent:Math.round(correct/(correct+wrong)*100),
  questionsCount:correct+wrong,notes:'',date:'21 Out 2026',difficulty:'Média',
  isNewQuestions:true,
});

test('coverage is based on actual topic completion, not manual counters', () => {
  const result=summarizeStudyOverview(mock,buildTopicDiagnostics(mock,[]));
  assert.equal(result.topicsTotal,5);
  assert.equal(result.completed,2);
  assert.equal(result.coveragePercent,40);
  assert.equal(result.byDiscipline[0].coveragePercent,50);
  assert.equal(result.byDiscipline[1].coveragePercent,0);
});

test('historical A/B/C classification stays separate from personal urgency', () => {
  const rows=buildTopicDiagnostics(mock,[entry('a','penal','t2',2,18)]);
  const result=summarizeStudyOverview(mock,rows);
  assert.equal(result.classified,3);
  assert.equal(result.missingClassification,2);
  assert.equal(result.highPriorityUnfinished,1);
  assert.equal(result.byDiscipline[0].priority.A,2);
  assert.equal(result.byDiscipline[0].priority.B,1);
  assert.equal(result.byDiscipline[0].personalUrgency.A>=1,true);
});

test('strong topic only counted with minimum sample, not manually marked mastery', () => {
  const original=structuredClone(mock);
  original[0].topics[3].learningPhase='dominio';
  const result=summarizeStudyOverview(original,buildTopicDiagnostics(original,[
    entry('e1','penal','t1',18,2),
    entry('e2','penal','t2',2,18),
    entry('e3','penal','t3',9,1),
  ]));
  assert.equal(result.sampled,2);
  assert.equal(result.strongEvidence,1);
  assert.equal(result.below70,1);
  assert.equal(result.byDiscipline[0].sampleAccuracy,50);
  assert.equal(result.byDiscipline[0].sampleQuestions,40);
  assert.equal(result.byDiscipline[0].newQuestions,50);
});

test('never mix the same topic ID across distinct disciplines', () => {
  const rows=buildTopicDiagnostics(mock,[
    entry('e1','penal','t1',18,2),
    entry('e2','info','t1',0,20),
  ]);
  const result=summarizeStudyOverview(mock,rows);
  assert.equal(result.byDiscipline[0].strongEvidence,1);
  assert.equal(result.byDiscipline[1].below70,1);
});

test('empty syllabus and zero question samples are zero or not available',()=>{
  const result=summarizeStudyOverview([],[]);
  assert.equal(result.topicsTotal,0);
  assert.equal(result.coveragePercent,0);
  assert.equal(result.byDiscipline.length,0);
  const incomplete=summarizeStudyOverview(mock,buildTopicDiagnostics(mock,[]));
  assert.equal(incomplete.byDiscipline[0].sampleAccuracy,null);
  assert.equal(incomplete.strongEvidence,0);
});
