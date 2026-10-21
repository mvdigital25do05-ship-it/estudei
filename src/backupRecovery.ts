import { inspectBackup, type StoredErrorNote, type StoredProfile } from './backup';

/**
 * Recovery preparation is pure: it never connects to Firestore.
 * Only verified v3 files qualify. A source plan is always cloned into
 * a fresh document ID so its current data cannot be overwritten.
 */
export interface RecoveryPlan {
  sourceProfileId: string;
  newProfileId: string;
  profile: Record<string, unknown>;
  errors: StoredErrorNote[];
  history: {
    exerciseLogs: number;
    activityLogs: number;
    errorNotes: number;
    flashcards: number;
  };
  approxBytes: number;
}

const PROFILE_KEYS = new Set([
  'id', 'name', 'disciplines', 'mockTests', 'exerciseLogs',
  'activityLogs', 'studyBlocks', 'weeklyHours', 'weeklyQuestions',
  'weeklyReviews', 'createdAt', 'examDate', 'examName',
]);
const NOTE_KEYS = [
  'id', 'profileId', 'disciplineId', 'disciplineName', 'topicId',
  'topicName', 'questionRef', 'cause', 'summary', 'rule', 'front',
  'back', 'status', 'createdAtMs', 'updatedAtMs',
] as const;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function id(value: string): boolean {
  return /^[A-Za-z0-9_-]{1,128}$/.test(value);
}
function validText(value: unknown, max: number, required = false): value is string {
  return typeof value === 'string' && value.length <= max &&
    (!required || value.trim().length > 0);
}
function count(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}
function copyRecord<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function validateRestorableProfile(p: StoredProfile): void {
  const data = p.data;
  for (const field of Object.keys(data)) {
    if (!PROFILE_KEYS.has(field)) {
      throw new Error(`O perfil possui o campo não reconhecido "${field}". Restauração assistida necessária.`);
    }
  }
  if (!validText(data.name, 100, true)) throw new Error('Nome de plano inválido.');
  for (const [field, max] of [
    ['disciplines', 100], ['mockTests', 100],
    ['exerciseLogs', 1000], ['activityLogs', 1000], ['studyBlocks', 200],
  ] as const) {
    if (field in data && (!Array.isArray(data[field]) || data[field].length > max)) {
      throw new Error(`O histórico ${field} excede o limite do Firestore atual.`);
    }
  }
  for (const field of ['weeklyHours','weeklyQuestions','weeklyReviews']) {
    if (field in data && !record(data[field])) throw new Error(`Campo ${field} inválido.`);
  }
  for (const [field,max] of [
    ['createdAt',50], ['examDate',100], ['examName',200]
  ] as const) {
    if (field in data && !validText(data[field],max)) throw new Error(`Campo ${field} inválido.`);
  }
}

function validateErrorNote(note: StoredErrorNote, sourceId: string): void {
  const data = note.data;
  if (!id(note.documentId) || data.id !== note.documentId || data.profileId !== sourceId ||
      Object.keys(data).length !== NOTE_KEYS.length ||
      NOTE_KEYS.some(key => !(key in data))) {
    throw new Error('Caderno de erros com IDs ou campos inconsistentes.');
  }
  for (const [field, max] of [
    ['disciplineId',128],['disciplineName',160],['topicId',128],
    ['topicName',160],['summary',1000],['rule',2000],
  ] as const) {
    if (!validText(data[field],max,true)) throw new Error(`Erro com ${field} inválido.`);
  }
  for (const [field,max] of [
    ['questionRef',240],['front',500],['back',1000],
  ] as const) {
    if (!validText(data[field],max)) throw new Error(`Erro com ${field} inválido.`);
  }
  if (!['desconhecimento','confusao','interpretacao','desatencao','tempo','outro'].includes(String(data.cause)) ||
      !['aberto','revisado','arquivado'].includes(String(data.status)) ||
      !Number.isSafeInteger(data.createdAtMs) || Number(data.createdAtMs) <= 0 ||
      !Number.isSafeInteger(data.updatedAtMs) || Number(data.updatedAtMs) < Number(data.createdAtMs)) {
    throw new Error('Caderno de erros com causa, estado ou data inválida.');
  }
}

/**
 * Strictly validate a single source profile and prepare a COPY with a fresh ID.
 * Existing IDs within the topic and exercise arrays remain unchanged.
 * No email/user metadata from the source backup is ever restored.
 */
export async function prepareRecovery(
  backup: unknown,
  sourceProfileId: string,
  newProfileId: string,
): Promise<RecoveryPlan> {
  const report = await inspectBackup(backup);
  if (!report.valid || report.version !== 3 || report.integrity !== 'verified') {
    throw new Error('Somente backup v3 íntegro (SHA-256 verificado) pode ser restaurado.');
  }
  if (!id(newProfileId) || !id(sourceProfileId) || newProfileId === sourceProfileId) {
    throw new Error('É obrigatório escolher um ID de destino novo e válido.');
  }
  const data = backup as {profiles: StoredProfile[]};
  const p = data.profiles.find(x => x.documentId === sourceProfileId);
  if (!p) throw new Error('Plano original não encontrado no arquivo.');
  validateRestorableProfile(p);
  if (!Array.isArray(p.errors)) throw new Error('O backup não contém o caderno do plano.');

  const cloned = copyRecord(p.data);
  cloned.id = newProfileId;
  cloned.name = String(p.data.name).slice(0,83) + ' (recuperado)';

  // Firestore's limit is 1 MiB per document; a conservative approximate
  // preflight blocks large legacy profiles before any write is attempted.
  const profileBytes = new TextEncoder().encode(JSON.stringify(cloned)).byteLength;
  if (profileBytes > 750_000) {
    throw new Error('Plano próximo do limite de documento do Firestore. Necessita migração assistida.');
  }
  const errors: StoredErrorNote[] = p.errors.map(note => {
    validateErrorNote(note, sourceProfileId);
    const copy = copyRecord(note);
    copy.data.profileId = newProfileId;
    return copy;
  });

  // Current one-operation recovery uses a single Firestore batch. Larger
  // error notebooks need paged recovery plus a separate staging design.
  if (errors.length > 400) {
    throw new Error('Mais de 400 erros individuais: restauração segmentada ainda necessária.');
  }

  return {
    sourceProfileId,
    newProfileId,
    profile: cloned,
    errors,
    history: {
      exerciseLogs: count(cloned.exerciseLogs),
      activityLogs: count(cloned.activityLogs),
      errorNotes: errors.length,
      flashcards: errors.filter(x => Boolean(x.data.front) && Boolean(x.data.back)).length,
    },
    approxBytes: profileBytes,
  };
}
