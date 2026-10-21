import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBackup } from './backup';

const fixture = () => ({
  format: 'estudei-backup', version: 1,
  user: { email: 'aluno@example.com', activeProfileId: 'plano_1', reminders: [] },
  profiles: [{ documentId: 'plano_1', data: {
    id: 'plano_1', name: 'Meu concurso', disciplines: [],
    activityLogs: [{ id: 'log-1', timeSpentMin: 40, disciplineName: 'Direito', date: '2026-10-21' }],
    exerciseLogs: [{ id: 'ex-1', questionsCount: 20 }],
    weeklyHours: { done: 4, total: 10 },
  } }],
});

test('preserva registros, metas e perfil ativo do backup exportado', () => {
  const original = fixture();
  assert.deepEqual(parseBackup(JSON.stringify(original)), { user: original.user, profiles: original.profiles });
});

test('rejeita formato desconhecido e backup vazio', () => {
  assert.throws(() => parseBackup('{"format":"outro"}'));
  assert.throws(() => parseBackup(JSON.stringify({ ...fixture(), profiles: [] })));
});

test('rejeita perfis duplicados ou com id divergente', () => {
  const backup = fixture();
  backup.profiles.push(backup.profiles[0]);
  assert.throws(() => parseBackup(JSON.stringify(backup)));
  const mismatch = fixture();
  mismatch.profiles[0].data.id = 'outro';
  assert.throws(() => parseBackup(JSON.stringify(mismatch)));
});

test('rejeita campos de registros malformados e listas acima do limite das regras', () => {
  const backup: any = fixture();
  backup.profiles[0].data.activityLogs = [null];
  assert.throws(() => parseBackup(JSON.stringify(backup)));
  backup.profiles[0].data.activityLogs = Array.from({ length: 1001 }, () => ({ id: 'x' }));
  assert.throws(() => parseBackup(JSON.stringify(backup)));
});

test('rejeita caminhos inválidos e documentos grandes antes de gravar', () => {
  const backup = fixture();
  backup.profiles[0].documentId = '../outro';
  assert.throws(() => parseBackup(JSON.stringify(backup)));
  const large: any = fixture();
  large.profiles[0].data.extra = 'x'.repeat(710_000);
  assert.throws(() => parseBackup(JSON.stringify(large)));
});
