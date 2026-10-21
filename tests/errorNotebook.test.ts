import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareErrorNote, exportErrorNotesAnki } from '../src/errorNotebook';

const input = {
  disciplineId: 'd1', disciplineName: 'Direito Penal',
  topicId: 't1', topicName: 'Crimes funcionais',
  questionRef: 'Vunesp 2024 questão 12', cause: 'confusao' as const,
  summary: 'Confundi concussão e corrupção passiva.',
  rule: 'A concussão exige a vantagem indevida; corrupção passiva envolve solicitação ou recebimento.',
  front: 'Qual a diferença entre concussão e corrupção passiva?',
  back: 'Concussão: exigir. Corrupção passiva: solicitar/receber ou aceitar promessa.'
};

test('cria registro individual isolado por perfil com carimbo de data', () => {
  const note = prepareErrorNote('error_1', 'tjsp', input, 1800000000000);
  assert.equal(note.profileId, 'tjsp');
  assert.equal(note.id, 'error_1');
  assert.equal(note.status, 'aberto');
  assert.equal(note.createdAtMs, note.updatedAtMs);
  assert.equal(note.cause, 'confusao');
});

test('rejeita registro incompleto, cartão parcialmente preenchido e ID inválido', () => {
  assert.throws(()=>prepareErrorNote('a/b','tjsp',input,123),/Identificador/);
  assert.throws(()=>prepareErrorNote('ok','tjsp',{...input,rule:''},123),/Preencha/);
  assert.throws(()=>prepareErrorNote('ok','tjsp',{...input,back:''},123),/pergunta e resposta/);
});

test('exporta cartões válidos e elimina cartões repetidos', () => {
  const note = prepareErrorNote('id1','tjsp',input,1800000000000);
  const other = { ...note, id:'id2', createdAtMs:1800000000001 };
  const deck = exportErrorNotesAnki([note,other]);
  assert.equal(deck.count,1);
  assert.ok(deck.text.includes('Direito_Penal Crimes_funcionais'));
  assert.ok(deck.text.startsWith('#separator:tab'));
});

test('cartões arquivados ou ausentes não entram no baralho', () => {
  const note=prepareErrorNote('id1','tjsp',input,1800000000000);
  const archived={...note,status:'arquivado' as const};
  const noCard={...note,id:'id3',front:'',back:''};
  assert.equal(exportErrorNotesAnki([archived,noCard]).count,0);
});

test('não permite que tabulações e novas linhas criem campos extras', () => {
  const note=prepareErrorNote('id1','tjsp',{...input,front:'Pergunta\n com\tseparadores',back:'Resposta\nfinal'},1800000000000);
  const deck=exportErrorNotesAnki([note]);
  const rows=deck.text.trim().split('\n');
  assert.equal(rows.length,4);
  assert.equal(rows[3].split('\t').length,3);
});
