import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase/app';
import { doc, getDoc, setDoc, getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

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
