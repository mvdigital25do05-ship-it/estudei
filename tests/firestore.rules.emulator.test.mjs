import { readFileSync } from 'node:fs';
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';

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
