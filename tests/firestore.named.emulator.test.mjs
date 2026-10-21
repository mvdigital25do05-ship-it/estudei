import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInAnonymously, signOut } from 'firebase/auth';
import { doc, getDoc, getDocs, collection, setDoc, getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const PROJECT_ID = 'demo-estudei-tjsp';
const NAMED_DATABASE = JSON.parse(readFileSync('firebase-applet-config.json','utf8')).firestoreDatabaseId;
const emulatorConfig = JSON.parse(readFileSync('firebase.named.emulator.json','utf8'));
if (!NAMED_DATABASE || NAMED_DATABASE === '(default)' ||
    emulatorConfig.firestore?.database !== NAMED_DATABASE ||
    emulatorConfig.firestore?.rules !== 'firestore.rules') {
  throw new Error('O teste do banco nomeado não usa o mesmo ID e as mesmas regras do aplicativo.');
}

/**
 * Explicitly target the same DATABASE ID shape as the Estudei app.
 * This only uses a demo- Firebase project and the local emulator.
 * If the DB is created implicitly with OPEN RULES, the test MUST FAIL.
 */
test('banco nomeado do emulador não pode estar com regras abertas', async () => {
  const app = initializeApp({projectId:PROJECT_ID,apiKey:'demo-key',appId:'demo-app'},'named-db-security');
  try {
    const db = getFirestore(app, NAMED_DATABASE);
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    const profileRef = doc(db,'users/third-party/profiles/sensitive');
    const errorRef = doc(db,'users/third-party/profiles/sensitive/errors/e1');

    for (const operation of [
      () => getDoc(profileRef),
      () => getDoc(errorRef),
      () => setDoc(doc(db,'users/third-party'),{
        name:'injected',email:'test@example.invalid',createdAt:'now',
        activeProfileId:'',reminders:[],
      }),
    ]) {
      await assert.rejects(operation(), err => err?.code === 'permission-denied',
        'Banco nomeado deve negar leitura e gravação a visitante sem login.');
    }
  } finally {
    await deleteApp(app);
  }
});

test('banco nomeado autentica proprietário e isola caderno de erros', async () => {
  const app = initializeApp({
    projectId:PROJECT_ID,apiKey:'demo-key',appId:'demo-app'
  },'named-db-authenticated');
  try {
    const db = getFirestore(app,NAMED_DATABASE);
    connectFirestoreEmulator(db,'127.0.0.1',8080);
    const auth = getAuth(app);
    connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});
    const { user } = await signInAnonymously(auth);
    const uid=user.uid;
    const accountRef=doc(db,'users',uid);
    const profileRef=doc(db,'users',uid,'profiles','tjsp');
    const errorRef=doc(db,'users',uid,'profiles','tjsp','errors','e1');

    await setDoc(accountRef,{
      name:'Conta fictícia',email:'',activeProfileId:'tjsp',
      reminders:[],createdAt:'21 Out 2026'
    });
    await setDoc(profileRef,{id:'tjsp',name:'Plano simulado'});
    await setDoc(errorRef,{
      id:'e1',profileId:'tjsp',
      disciplineId:'penal',disciplineName:'Direito Penal',
      topicId:'crimes',topicName:'Crimes funcionais',
      questionRef:'Simulação fictícia',cause:'confusao',
      summary:'Confundi conceitos.',rule:'Consultar lei atualizada.',
      front:'Conceito?',back:'Revisão.',
      status:'aberto',createdAtMs:1800000000000,updatedAtMs:1800000000000,
    });
    assert.equal((await getDoc(errorRef)).data()?.front,'Conceito?');
    assert.equal((await getDocs(collection(db,'users',uid,'profiles','tjsp','errors'))).size,1);

    // Signing in never grants access to another user's records.
    await assert.rejects(getDoc(doc(db,'users','third-party','profiles','sensitive')),
      error=>error?.code==='permission-denied');
    await signOut(auth);
    await assert.rejects(getDoc(errorRef),error=>error?.code==='permission-denied');
  } finally {
    await deleteApp(app);
  }
});
