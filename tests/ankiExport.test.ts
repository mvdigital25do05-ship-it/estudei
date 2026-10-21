import test from 'node:test';
import assert from 'node:assert/strict';
import { exportAnkiText } from '../src/ankiExport';
import type { ExerciseLog } from '../src/types';

const batch = (front: string, back: string, overrides: Partial<ExerciseLog> = {}): ExerciseLog => ({
  id: 'log-1', disciplineId: 'd1', disciplineName: 'Direito Processual Civil',
  topicId: 't1', topicName: 'Prazos e intimações', questionsCount: 10,
  correctAnswers: 8, wrongAnswers: 2, accuracyPercent: 80,
  notes: '', difficulty: 'Média', date: '20 Out 2026', examBoard: 'Vunesp',
  ankiFront: front, ankiBack: back, ...overrides,
});

test('gera TXT separado por TAB com tags e diretivas para Anki', () => {
  const exported = exportAnkiText([batch('Qual a regra geral dos prazos?', 'Contam-se em dias úteis.')]);
  assert.equal(exported.count, 1);
  assert.match(exported.text, /#separator:tab/);
  assert.match(exported.text, /#html:false/);
  assert.match(exported.text, /#tags column:3/);
  assert.match(exported.text, /Direito_Processual_Civil Prazos_e_intimacoes Vunesp/);
});

test('sanitiza tabulação e quebras de linha no conteúdo dos cartões', () => {
  const exported = exportAnkiText([batch('Pergunta\ncom tab\t?', 'Resposta\nquebrada')]);
  const textRows = exported.text.trim().split('\n');
  assert.equal(textRows.length, 4);
  assert.equal(textRows[3].split('\t').length, 3);
  assert.ok(!textRows[3].includes('\t?'));
});

test('não inventa cards para históricos sem frente/verso', () => {
  const exported = exportAnkiText([batch('', 'Regra'), batch('Pergunta', '', { id: 'log-2' })]);
  assert.equal(exported.count, 0);
  assert.equal(exported.skipped, 2);
});

test('não exporta erros zero nem cartões repetidos', () => {
  const exported = exportAnkiText([
    batch('Qual é o prazo?', 'Cinco dias.'),
    batch('Qual é o prazo?', 'Cinco dias.', { id: 'log-2' }),
    batch('Outra pergunta', 'Regra', { id: 'log-3', wrongAnswers: 0 }),
  ]);
  assert.equal(exported.count, 1);
  assert.equal(exported.skipped, 2);
});
