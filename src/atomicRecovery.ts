import {
  collection, doc, runTransaction, type Firestore,
} from 'firebase/firestore';
import { prepareRecovery, type RecoveryPlan } from './backupRecovery';

/**
 * Prepared recovery can ONLY be submitted as a single Firestore transaction.
 * A collision never overwrites the destination. The user/account document
 * and all existing study profiles remain untouched.
 *
 * Not exposed to the production UI before real named-database homologation.
 */
export async function restoreBackupAtomically(
  db: Firestore,
  authenticatedUid: string,
  backup: unknown,
  sourceProfileId: string,
): Promise<RecoveryPlan> {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(authenticatedUid)) {
    throw new Error('A identificação do usuário autenticado é inválida.');
  }

  // Firestore auto IDs are unpredictable and avoid source-ID collisions.
  const profilesRef = collection(db, 'users', authenticatedUid, 'profiles');
  const destinationRef = doc(profilesRef);
  const plan = await prepareRecovery(backup, sourceProfileId, destinationRef.id);

  // All mutations are part of one ACID transaction: failure in ANY child
  // means the new parent is also not committed. Rule existsAfter() ensures
  // the child can be created together with its new parent.
  await runTransaction(db, async transaction => {
    const existing = await transaction.get(destinationRef);
    if (existing.exists()) {
      throw new Error('O identificador gerado já existe. A operação foi cancelada.');
    }
    transaction.set(destinationRef, plan.profile);
    for (const note of plan.errors) {
      const noteRef = doc(destinationRef, 'errors', note.documentId);
      transaction.set(noteRef, note.data);
    }
  });
  return plan;
}
