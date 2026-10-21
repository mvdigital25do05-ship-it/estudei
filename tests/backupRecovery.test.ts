import test from 'node:test';
import assert from 'node:assert/strict';
import { createBackup } from '../src/backup';
import { prepareRecovery } from '../src/backupRecovery';

function demo() {
  return {
    user: { email: 'nao-copiar@example.com', name: 'Origem' },
    profiles: [{
      documentId: 'tjsp',
      data: {
        id: 'tjsp', name: 'Escrevente TJSP', createdAt: '21 Out 2026',
        disciplines: [{
          id:'penal',name:'Direito Penal',topicsTotal:1,topicsDone:1,
          topics:[{id:'crime',name:'Crimes funcionais',completed:true,examPriority:'A'}],
          timeSpentMin:120,correctAnswers:18,wrongAnswers:2,icon:'gavel',colorClass:'emerald'
        }],
        exerciseLogs: [{id:'ex1',topicId:'crime',questionsCount:20,correctAnswers:18,wrongAnswers:2}],
        activityLogs: [{id:'act1',timeSpentMin:120}],
      },
      errors: [{
        documentId:'er1', data: {
          id:'er1',profileId:'tjsp',
          disciplineId:'penal',disciplineName:'Direito Penal',topicId:'crime',topicName:'Crimes funcionais',
          questionRef:'Vunesp',cause:'confusao',summary:'Confundi definições.',rule:'Conferir artigo.',
          front:'Pergunta?',back:'Resposta.',status:'revisado',
          createdAtMs:1800000000000,updatedAtMs:1800000000010,
        },
      }],
    }],
  };
}

test('recuperação preserva dados e cria uma cópia com ID distinto', async () => {
  const original = demo();
  const backup = await createBackup(original);
  const plan = await prepareRecovery(backup,'tjsp','restored_tjsp');
  assert.equal(plan.newProfileId,'restored_tjsp');
  assert.equal(plan.profile.id,'restored_tjsp');
  assert.equal(plan.profile.name,'Escrevente TJSP (recuperado)');
  assert.deepEqual(plan.profile.disciplines,original.profiles[0].data.disciplines);
  assert.equal(plan.history.exerciseLogs,1);
  assert.equal(plan.history.activityLogs,1);
  assert.equal(plan.history.errorNotes,1);
  assert.equal(plan.history.flashcards,1);
  assert.equal(plan.errors[0].documentId,'er1');
  assert.equal(plan.errors[0].data.profileId,'restored_tjsp');
  assert.equal(plan.errors[0].data.status,'revisado');
  assert.equal(original.profiles[0].errors[0].data.profileId,'tjsp');
  assert.ok(!JSON.stringify(plan.profile).includes('nao-copiar@example.com'));
});

test('recuperação recusa checksum adulterado e v3 sem checksum', async () => {
  const backup = await createBackup(demo());
  backup.profiles[0].data.name = 'Alterado';
  await assert.rejects(prepareRecovery(backup,'tjsp','newplan'),/SHA-256/);

  const clean = await createBackup(demo());
  delete (clean as {checksum?: unknown}).checksum;
  await assert.rejects(prepareRecovery(clean,'tjsp','newplan'),/SHA-256/);
});

test('recuperação recusa versões antigas e IDs de destino inválidos', async () => {
  const backup = await createBackup(demo());
  await assert.rejects(prepareRecovery({...backup,version:2},'tjsp','newplan'),/SHA-256/);
  await assert.rejects(prepareRecovery(backup,'tjsp','tjsp'),/novo e válido/);
  await assert.rejects(prepareRecovery(backup,'tjsp','inválido/../'),/novo e válido/);
  await assert.rejects(prepareRecovery(backup,'desconhecido','newplan'),/não encontrado/);
});

test('mesmo com checksum válido, perfil com campos arbitrários é bloqueado', async () => {
  const payload=demo();
  const dirty=payload.profiles[0].data as Record<string, unknown>;
  dirty.admin=true;
  const backup=await createBackup(payload);
  await assert.rejects(prepareRecovery(backup,'tjsp','newplan'),/não reconhecido/);
});

test('mesmo com checksum válido, nota com status inválido é bloqueada', async () => {
  const payload=demo();
  payload.profiles[0].errors[0].data.status='escondido';
  const backup=await createBackup(payload);
  await assert.rejects(prepareRecovery(backup,'tjsp','newplan'),/data inválida/);
});

test('limites de documento e de coleção são respeitados antes de gravar', async () => {
  const original=demo();
  const large=original.profiles[0].data as Record<string, unknown>;
  large.disciplines=[...Array(101)].map(()=>({}));
  const backup=await createBackup(original);
  await assert.rejects(prepareRecovery(backup,'tjsp','newplan'),/excede o limite/);
});
