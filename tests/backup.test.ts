import test from 'node:test';
import assert from 'node:assert/strict';
import { createBackup, inspectBackup, type BackupPayload } from '../src/backup';

const sample = (): BackupPayload => ({
  user: { name: 'Conta de teste', email: 'teste@example.com' },
  profiles: [
    {
      documentId: 'tjsp',
      data: {
        id: 'tjsp',
        name: 'TJSP',
        disciplines: [],
        mockTests: [],
        studyBlocks: [],
        exerciseLogs: [{ questionsCount: 12 }, { questionsCount: 8 }],
        activityLogs: [{ id: 'a1' }],
      },
    },
  ],
});

test('backup v2 mantém contagens e valida integridade', async () => {
  const backup = await createBackup(sample());
  const report = await inspectBackup(backup);
  assert.equal(report.valid, true);
  assert.equal(report.version, 2);
  assert.equal(report.profileCount, 1);
  assert.equal(report.exerciseRecords, 2);
  assert.equal(report.activityRecords, 1);
  assert.equal(report.questionsCount, 20);
  assert.equal(report.integrity, 'verified');
});

test('rejeita alteração de dados depois de calcular o checksum', async () => {
  const backup = await createBackup(sample());
  backup.profiles[0].data.name = 'Valor alterado';
  const report = await inspectBackup(backup);
  assert.equal(report.valid, false);
  assert.equal(report.integrity, 'invalid');
  assert.ok(report.errors.some(error => error.includes('integridade')));
});

test('aceita backup legado v1 e informa ausência de checksum', async () => {
  const payload = sample();
  const report = await inspectBackup({
    format: 'estudei-backup',
    version: 1,
    ...payload,
  });
  assert.equal(report.valid, true);
  assert.equal(report.integrity, 'legacy');
  assert.ok(report.warnings.some(warning => warning.includes('antigo')));
});

test('rejeita perfis com identificadores duplicados ou inconsistentes', async () => {
  const payload = sample();
  const duplicate = {
    format: 'estudei-backup',
    version: 1,
    user: payload.user,
    profiles: [...payload.profiles, { ...payload.profiles[0] }],
  };
  const report = await inspectBackup(duplicate);
  assert.equal(report.valid, false);
  assert.ok(report.errors.some(error => error.includes('duplicado')));

  const wrongId = {
    ...duplicate,
    profiles: [{ documentId: 'outro', data: payload.profiles[0].data }],
  };
  const mismatch = await inspectBackup(wrongId);
  assert.equal(mismatch.valid, false);
  assert.ok(mismatch.errors.some(error => error.includes('diferente')));
});

test('rejeita objeto que não tem o formato de backup', async () => {
  const report = await inspectBackup({ version: 2, profiles: 'invalido' });
  assert.equal(report.valid, false);
  assert.ok(report.errors.length > 0);
});
