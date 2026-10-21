import { readFileSync } from 'node:fs';
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { createBackup, inspectBackup } from '../src/backup.ts';
import { prepareRecovery } from '../src/backupRecovery.ts';

const PROJECT_ID = 'demo-estudei-tjsp';
const RULES = readFileSync('firestore.rules', 'utf8');
let environment;

const account = (uid) => ({ name: 'Conta ' + uid, email: uid + '@example.test', activeProfileId: '', reminders: [], createdAt: '21 Out 2026' });
const profile = (id) => ({ id, name: 'TJSP homologação' });
const errorNote = (id, profileId) => ({
  id, profileId,
  disciplineId: 'dir-penal', disciplineName: 'Direito Penal',
  topicId: 'peculato', topicName: 'Peculato',
  questionRef: 'Vunesp — exemplo sem questões reais',
  cause: 'desconhecimento', summary: 'Confundi requisitos do tipo penal.',
  rule: 'Revisar a redação legal do artigo estudado.',
  front: 'Qual é o requisito central?', back: 'Conferir a norma vigente.',
  status: 'aberto', createdAtMs: 1800000000000, updatedAtMs: 1800000000000,
});

before(async () => {
  environment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { host: '127.0.0.1', port: 8080, rules: RULES },
  });
});

beforeEach(async () => {
  await environment.clearFirestore();
});

after(async () => {
  if (environment) await environment.cleanup();
});

async function setupUser(uid, planId) {
  const db = environment.authenticatedContext(uid).firestore();
  await assertSucceeds(setDoc(doc(db,'users',uid), account(uid)));
  await assertSucceeds(setDoc(doc(db,'users',uid,'profiles',planId), profile(planId)));
  return db;
}

test('proprietário cadastra, lê, lista, revisa e exclui apenas os próprios erros', async () => {
  const own = await setupUser('alice', 'tjsp');
  const noteRef = doc(own, 'users/alice/profiles/tjsp/errors/erro1');
  await assertSucceeds(setDoc(noteRef,errorNote('erro1','tjsp')));
  const snapshot = await assertSucceeds(getDoc(noteRef));
  assert.equal(snapshot.data().topicName,'Peculato');
  const all = await assertSucceeds(getDocs(collection(own,'users/alice/profiles/tjsp/errors')));
  assert.equal(all.size,1);
  await assertSucceeds(updateDoc(noteRef,{status:'revisado',updatedAtMs:1800000000001}));
  await assertSucceeds(deleteDoc(noteRef));
});

test('usuário externo e anônimo não acessam perfis nem erros de terceiros', async () => {
  const own = await setupUser('alice', 'tjsp');
  const notePath = 'users/alice/profiles/tjsp/errors/erro1';
  await assertSucceeds(setDoc(doc(own,notePath),errorNote('erro1','tjsp')));
  const other = environment.authenticatedContext('bob').firestore();
  const guest = environment.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(other,notePath)));
  await assertFails(getDocs(collection(other,'users/alice/profiles/tjsp/errors')));
  await assertFails(setDoc(doc(other,notePath),errorNote('erro1','tjsp')));
  await assertFails(deleteDoc(doc(other,notePath)));
  await assertFails(getDoc(doc(guest,notePath)));
  await assertFails(getDoc(doc(other,'users/alice/profiles/tjsp')));
});

test('nega erros órfãos e falsificação do perfil ou ID', async () => {
  const own = await setupUser('alice','tjsp');
  await assertFails(setDoc(doc(own,'users/alice/profiles/naoexiste/errors/e1'),errorNote('e1','naoexiste')));
  await assertFails(setDoc(doc(own,'users/alice/profiles/tjsp/errors/e1'),errorNote('e2','tjsp')));
  await assertFails(setDoc(doc(own,'users/alice/profiles/tjsp/errors/e1'),errorNote('e1','outro')));
});

test('valida campos, tamanho e alterações nos identificadores imutáveis', async () => {
  const own = await setupUser('alice','tjsp');
  const ref = doc(own,'users/alice/profiles/tjsp/errors/erro1');
  await assertFails(setDoc(ref,{...errorNote('erro1','tjsp'),front:'x'.repeat(501)}));
  await assertFails(setDoc(ref,{...errorNote('erro1','tjsp'),admin:true}));
  await assertFails(setDoc(ref,{...errorNote('erro1','tjsp'),summary:''}));
  await assertSucceeds(setDoc(ref,errorNote('erro1','tjsp')));
  await assertFails(updateDoc(ref,{createdAtMs:1800000000004}));
  await assertFails(updateDoc(ref,{id:'outro'}));
  await assertFails(updateDoc(ref,{profileId:'outro'}));
  await assertFails(updateDoc(ref,{unrecognizedField:'x'}));
});

test('impede alteração do e-mail da conta e dos IDs de plano', async () => {
  const own = await setupUser('alice','tjsp');
  await assertFails(updateDoc(doc(own,'users/alice'),{email:'outra@example.test'}));
  await assertFails(updateDoc(doc(own,'users/alice/profiles/tjsp'),{id:'falso'}));
  await assertSucceeds(updateDoc(doc(own,'users/alice/profiles/tjsp'),{name:'Novo nome'}));
  await assertSucceeds(updateDoc(doc(own,'users/alice'),{activeProfileId:'tjsp'}));
});

test('nega acesso não previsto a documentos fora do usuário autenticado', async () => {
  const own = await setupUser('alice','tjsp');
  await assertFails(setDoc(doc(own,'global/secret'),{secret:true}));
  await assertFails(getDoc(doc(own,'global/secret')));
});

test('backup v3 reúne perfil e caderno real do emulador, sem perder flashcard', async () => {
  const owner = await setupUser('alice', 'tjsp');
  const errorRef = doc(owner, 'users/alice/profiles/tjsp/errors/errobackup');
  await assertSucceeds(setDoc(errorRef, errorNote('errobackup', 'tjsp')));

  const [userSnap, profilesSnap] = await Promise.all([
    getDoc(doc(owner, 'users/alice')),
    getDocs(collection(owner, 'users/alice/profiles')),
  ]);
  const profiles = await Promise.all(profilesSnap.docs.map(async item => {
    const errors = await getDocs(collection(owner,'users/alice/profiles',item.id,'errors'));
    return {
      documentId: item.id,
      data: item.data(),
      errors: errors.docs.map(entry => ({ documentId: entry.id, data: entry.data() })),
    };
  }));
  const backup = await createBackup({ user: userSnap.data(), profiles });
  const inspection = await inspectBackup(backup);
  assert.equal(backup.version,3);
  assert.equal(inspection.valid,true);
  assert.equal(inspection.integrity,'verified');
  assert.equal(inspection.profileCount,1);
  assert.equal(inspection.errorNotes,1);
  assert.equal(inspection.flashcards,1);
});

test('cópia restaurada mantém histórico e flashcards sem alterar o plano de origem', async () => {
  const owner=await setupUser('alice','tjsp');
  const sourceRef=doc(owner,'users/alice/profiles/tjsp');
  const originalLog={id:'e1',disciplineId:'penal',topicId:'peculato',questionsCount:20,correctAnswers:18,wrongAnswers:2};
  await assertSucceeds(updateDoc(sourceRef,{
    exerciseLogs:[originalLog],
    activityLogs:[{id:'a1',timeSpentMin:120}],
    examName:'TJSP',
  }));
  await assertSucceeds(setDoc(doc(owner,'users/alice/profiles/tjsp/errors/erro1'),errorNote('erro1','tjsp')));
  const currentSource=(await getDoc(sourceRef)).data();
  const currentErrors=await getDocs(collection(owner,'users/alice/profiles/tjsp/errors'));

  const backup=await createBackup({
    user:(await getDoc(doc(owner,'users/alice'))).data(),
    profiles:[{
      documentId:'tjsp',data:currentSource,
      errors:currentErrors.docs.map(note=>({documentId:note.id,data:note.data()})),
    }]
  });
  const plan=await prepareRecovery(backup,'tjsp','recovered_tjsp');

  // Exercise the exact structure produced by the recovery preparer against
  // the real security rules, in a mock project only. This never deploys.
  const recoveredRef=doc(owner,'users/alice/profiles/recovered_tjsp');
  await assertSucceeds(setDoc(recoveredRef,plan.profile));
  for(const note of plan.errors) {
    await assertSucceeds(setDoc(doc(owner,'users/alice/profiles/recovered_tjsp/errors',note.documentId),note.data));
  }

  const [original,recovered,notes] = await Promise.all([
    getDoc(sourceRef),getDoc(recoveredRef),
    getDocs(collection(owner,'users/alice/profiles/recovered_tjsp/errors'))
  ]);
  assert.equal(original.data()?.name,'TJSP homologação');
  assert.equal(original.data()?.id,'tjsp');
  assert.deepEqual(recovered.data()?.exerciseLogs,[originalLog]);
  assert.deepEqual(recovered.data()?.activityLogs,[{id:'a1',timeSpentMin:120}]);
  assert.equal(recovered.data()?.name,'TJSP homologação (recuperado)');
  assert.equal(notes.size,1);
  assert.equal(notes.docs[0].data().profileId,'recovered_tjsp');
  assert.equal(notes.docs[0].data().front,'Qual é o requisito central?');
  assert.equal(notes.docs[0].data().status,'aberto');
  assert.equal((await getDocs(collection(owner,'users/alice/profiles/tjsp/errors'))).size,1);

  // The restored and original plans remain inaccessible to other users.
  const other=environment.authenticatedContext('bob').firestore();
  await assertFails(getDoc(doc(other,'users/alice/profiles/recovered_tjsp')));
  await assertFails(getDocs(collection(other,'users/alice/profiles/recovered_tjsp/errors')));
});
