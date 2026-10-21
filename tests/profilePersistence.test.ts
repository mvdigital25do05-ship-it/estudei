import test from 'node:test';
import assert from 'node:assert/strict';
import { captureProfileSnapshot, type ActiveProfileState } from '../src/profilePersistence';
import type { CargoPlan } from '../src/types';

const initial = (): CargoPlan => ({
  id: 'tjsp', name: 'Escrevente TJSP', createdAt: '21 Out 2026',
  disciplines: [], mockTests: [], exerciseLogs: [], activityLogs: [], studyBlocks: [],
  weeklyHours: { done: 0, total: 24 },
  weeklyQuestions: { done: 0, total: 300 },
  weeklyReviews: { done: 0, total: 60 },
  examDate: '', examName: '',
});

test('a troca de plano conserva IDs e metadados ao capturar dados recentes', () => {
  const old = initial();
  const state: ActiveProfileState = {
    disciplines: [{
      id:'d',name:'Direito Penal',topicsTotal:1,topicsDone:0,topics:[{id:'t',name:'Crimes',completed:false}],
      timeSpentMin:40,correctAnswers:12,wrongAnswers:3,icon:'gavel',colorClass:'emerald'
    }],
    mockTests: [{id:'m',name:'Simulado',date:'2026-10-21',correctAnswers:40,totalQuestions:50,scorePercent:80,status:'Concluído'}],
    exerciseLogs: [{
      id:'e',disciplineId:'d',disciplineName:'Direito Penal',topicId:'t',topicName:'Crimes',
      questionsCount:15,accuracyPercent:80,correctAnswers:12,wrongAnswers:3,notes:'',difficulty:'Média',date:'21 Out 2026'
    }],
    activityLogs: [{id:'a',disciplineName:'Direito Penal',timeSpentMin:40,timestamp:'Agora',details:'Estudo',colorClass:'blue'}],
    studyBlocks: [],
    weeklyHours:{done:1,total:24},weeklyQuestions:{done:15,total:300},weeklyReviews:{done:1,total:60},
    examDate:'2026-12-06',examName:'TJSP',
  };
  const saved = captureProfileSnapshot(old,state);
  assert.equal(saved.id,'tjsp');
  assert.equal(saved.name,'Escrevente TJSP');
  assert.equal(saved.createdAt,'21 Out 2026');
  assert.equal(saved.exerciseLogs.length,1);
  assert.equal(saved.disciplines[0].timeSpentMin,40);
  assert.equal(saved.weeklyQuestions.done,15);
  assert.equal(saved.examDate,'2026-12-06');
  assert.deepEqual(old.exerciseLogs,[]);
});

test('não permite capturar um perfil sem identidade', () => {
  assert.throws(()=>captureProfileSnapshot({...initial(),id:''},{
    ...initial(),examDate:'',examName:''
  }),/inexistente/);
});
