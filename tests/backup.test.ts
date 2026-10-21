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
      errors: [{
        documentId: 'error_1',
        data: { id: 'error_1', profileId: 'tjsp', front: 'Prazo?', back: 'Dias úteis.' },
      }],
    },
  ],
});

test('backup v3 inclui o caderno individual e valida integridade', async () => {
  const backup = await createBackup(sample());
  const report = await inspectBackup(backup);
  assert.equal(report.valid, true);
  assert.equal(report.version, 3);
  assert.equal(report.profileCount, 1);
  assert.equal(report.exerciseRecords, 2);
  assert.equal(report.activityRecords, 1);
  assert.equal(report.questionsCount, 20);
  assert.equal(report.errorNotes, 1);
  assert.equal(report.flashcards, 1);
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

test('não gera backup v3 parcial se a leitura dos erros não foi concluída', async () => {
  const payload = sample();
  delete payload.profiles[0].errors;
  await assert.rejects(createBackup(payload), /sem a leitura do caderno/);
});

test('adulteração na subcoleção de erros invalida o checksum v3', async () => {
  const backup = await createBackup(sample());
  backup.profiles[0].errors![0].data.back = 'Resposta modificada';
  const report = await inspectBackup(backup);
  assert.equal(report.valid, false);
  assert.equal(report.integrity, 'invalid');
});

test('erros individuais órfãos ou repetidos tornam o backup inválido', async () => {
  const backup = await createBackup(sample());
  const orphan = structuredClone(backup);
  orphan.profiles[0].errors![0].data.profileId = 'outro-perfil';
  assert.equal((await inspectBackup(orphan)).valid, false);
  const duplicated = structuredClone(backup);
  duplicated.profiles[0].errors!.push(structuredClone(duplicated.profiles[0].errors![0]));
  assert.equal((await inspectBackup(duplicated)).valid, false);
});

test('v3 sem lista de erros é rejeitado mesmo sem checksum', async () => {
  const backup = await createBackup(sample());
  const partial = {
    ...backup,
    checksum: undefined,
    profiles: backup.profiles.map(({ errors: _errors, ...rest }) => rest),
  };
  const result = await inspectBackup(partial);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error => error.includes('lista de erros')));
});

test('backups v2 legados permanecem verificáveis mas avisam que não incluem notas', async () => {
  const payload = sample();
  const legacyProfiles = payload.profiles.map(({ errors: _errors, ...profile }) => profile);
  const report = await inspectBackup({
    format: 'estudei-backup', version: 2, user: payload.user, profiles: legacyProfiles,
  });
  assert.equal(report.valid, true);
  assert.equal(report.version, 2);
  assert.ok(report.warnings.some(warning => warning.includes('não inclui subcoleções')));
});
