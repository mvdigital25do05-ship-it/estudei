type Data = Record<string, any>;

function object(value: unknown): value is Data {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function parseBackup(text: string) {
  if (new TextEncoder().encode(text).length > 8_000_000) throw Error('O backup excede o limite de 8 MB.');
  const backup = JSON.parse(text);
  if (!object(backup) || backup.format !== 'estudei-backup' || backup.version !== 1
    || !object(backup.user) || !Array.isArray(backup.profiles)
    || backup.profiles.length === 0 || backup.profiles.length > 100) {
    throw Error('Selecione um backup JSON do Estudei, versão 1, com 1 a 100 perfis.');
  }
  const user = backup.user;
  if (typeof user.email !== 'string' || !Array.isArray(user.reminders) || user.reminders.length > 200
    || typeof user.activeProfileId !== 'string') throw Error('Dados do usuário inválidos no backup.');
  const ids = new Set<string>();
  const profiles = backup.profiles.map((entry: unknown) => {
    if (!object(entry) || typeof entry.documentId !== 'string' || !object(entry.data)) {
      throw Error('Perfil inválido no backup.');
    }
    const { documentId, data } = entry;
    if (!/^[a-zA-Z0-9_-]{1,128}$/.test(documentId) || ids.has(documentId) || data.id !== documentId
      || typeof data.name !== 'string' || !data.name.trim() || data.name.length > 100) {
      throw Error('Identificação de perfil inválida ou duplicada.');
    }
    ids.add(documentId);
    for (const [field, limit] of Object.entries({ disciplines: 100, mockTests: 100, exerciseLogs: 1000, activityLogs: 1000, studyBlocks: 200 })) {
      if (field in data && (!Array.isArray(data[field]) || data[field].length > limit
        || data[field].some((item: unknown) => !object(item)))) throw Error(`Campo inválido: ${field}.`);
    }
    for (const field of ['weeklyHours', 'weeklyQuestions', 'weeklyReviews']) {
      if (field in data && !object(data[field])) throw Error(`Campo inválido: ${field}.`);
    }
    for (const [field, limit] of Object.entries({ createdAt: 50, examDate: 100, examName: 200 })) {
      if (field in data && (typeof data[field] !== 'string' || data[field].length > limit)) throw Error(`Campo inválido: ${field}.`);
    }
    if (new TextEncoder().encode(JSON.stringify(data)).length > 700_000) throw Error('Um perfil excede o tamanho seguro para importação.');
    return { documentId, data };
  });
  return { user, profiles };
}

export type StudyBackup = ReturnType<typeof parseBackup>;
