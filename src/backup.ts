/**
 * Backup do Estudei: versão 3 inclui as subcoleções de erros de cada perfil.
 * Apenas valida/exporta: nenhum método aqui escreve no Firestore.
 */
export interface StoredErrorNote {
  documentId: string;
  data: Record<string, unknown>;
}

export interface StoredProfile {
  documentId: string;
  data: Record<string, unknown>;
  /** Obrigatório a partir da versão 3; ausente em backups antigos. */
  errors?: StoredErrorNote[];
}

export interface BackupPayload {
  user: Record<string, unknown> | null;
  profiles: StoredProfile[];
}

export interface BackupInspection {
  valid: boolean;
  version: number | null;
  profileCount: number;
  exerciseRecords: number;
  activityRecords: number;
  questionsCount: number;
  errorNotes: number;
  flashcards: number;
  integrity: 'verified' | 'legacy' | 'unavailable' | 'invalid';
  errors: string[];
  warnings: string[];
}

const FORMAT = 'estudei-backup';
export const MAX_BACKUP_FILE_BYTES = 30 * 1024 * 1024;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function sha256(payload: BackupPayload): Promise<string | null> {
  if (!globalThis.crypto?.subtle) return null;
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Backup v3 só pode ser emitido se o exportador entregou todas as listas
 * de erros individuais. A ausência de uma delas deve bloquear a exportação.
 */
export async function createBackup(payload: BackupPayload) {
  for (const profile of payload.profiles) {
    if (!Array.isArray(profile.errors)) {
      throw new Error('Falha de segurança: há um perfil sem a leitura do caderno de erros.');
    }
  }
  const checksum = await sha256(payload);
  return {
    format: FORMAT,
    version: 3,
    exportedAt: new Date().toISOString(),
    user: payload.user,
    profiles: payload.profiles,
    ...(checksum ? { checksum: { algorithm: 'SHA-256', value: checksum } } : {}),
  };
}

/**
 * Inspeção local de versões 1, 2 e 3, sem restauração nem modificação de dados.
 * Na v3, cada perfil deve possuir a lista explícita de subcoleção "errors".
 */
export async function inspectBackup(candidate: unknown): Promise<BackupInspection> {
  const report: BackupInspection = {
    valid: false,
    version: null,
    profileCount: 0,
    exerciseRecords: 0,
    activityRecords: 0,
    questionsCount: 0,
    errorNotes: 0,
    flashcards: 0,
    integrity: 'unavailable',
    errors: [],
    warnings: [],
  };

  if (!isRecord(candidate)) {
    report.errors.push('O arquivo não contém um objeto JSON de backup.');
    return report;
  }
  if (candidate.format !== FORMAT) report.errors.push('O arquivo não é um backup do Estudei.');
  if (![1, 2, 3].includes(candidate.version as number)) {
    report.errors.push('Versão de backup não reconhecida.');
  } else report.version = candidate.version as number;

  if (candidate.user !== null && !isRecord(candidate.user)) {
    report.errors.push('Os dados da conta estão em formato inválido.');
  } else if (candidate.user === null) report.warnings.push('Backup sem documento de conta.');

  if (!Array.isArray(candidate.profiles)) {
    report.errors.push('Lista de perfis ausente ou inválida.');
    return report;
  }

  const ids = new Set<string>();
  for (const [index, item] of candidate.profiles.entries()) {
    if (!isRecord(item) || typeof item.documentId !== 'string' || !isRecord(item.data)) {
      report.errors.push(`Perfil ${index + 1}: estrutura inválida.`);
      continue;
    }
    if (!item.documentId.trim() || ids.has(item.documentId)) {
      report.errors.push(`Perfil ${index + 1}: identificador vazio ou duplicado.`);
      continue;
    }
    if (item.data.id !== item.documentId) {
      report.errors.push(`Perfil ${index + 1}: identificador diferente do documento.`);
      continue;
    }
    ids.add(item.documentId);

    for (const field of ['disciplines', 'exerciseLogs', 'activityLogs', 'mockTests', 'studyBlocks']) {
      if (field in item.data && !Array.isArray(item.data[field])) {
        report.errors.push(`Perfil ${index + 1}: campo ${field} inválido.`);
      }
    }

    const exercises = Array.isArray(item.data.exerciseLogs) ? item.data.exerciseLogs : [];
    const activities = Array.isArray(item.data.activityLogs) ? item.data.activityLogs : [];
    report.exerciseRecords += exercises.length;
    report.activityRecords += activities.length;
    for (const exercise of exercises) {
      if (isRecord(exercise) && typeof exercise.questionsCount === 'number' &&
          Number.isFinite(exercise.questionsCount) && exercise.questionsCount >= 0) {
        report.questionsCount += exercise.questionsCount;
      }
    }
    if (exercises.length >= 900 || activities.length >= 900) {
      report.warnings.push(`Perfil ${index + 1}: histórico próximo do limite atual por lista.`);
    }

    if (report.version === 3) {
      if (!Array.isArray(item.errors)) {
        report.errors.push(`Perfil ${index + 1}: lista de erros individuais ausente.`);
        continue;
      }
      const errorIds = new Set<string>();
      for (const [noteIndex, note] of item.errors.entries()) {
        if (!isRecord(note) || typeof note.documentId !== 'string' || !isRecord(note.data) ||
            !note.documentId.trim() || errorIds.has(note.documentId) ||
            note.data.id !== note.documentId || note.data.profileId !== item.documentId) {
          report.errors.push(`Perfil ${index + 1}, erro ${noteIndex + 1}: registro inconsistente.`);
          continue;
        }
        errorIds.add(note.documentId);
        report.errorNotes++;
        if (typeof note.data.front === 'string' && note.data.front.trim() &&
            typeof note.data.back === 'string' && note.data.back.trim()) {
          report.flashcards++;
        }
      }
    }
  }

  report.profileCount = ids.size;
  if (ids.size === 0) report.warnings.push('Nenhum perfil de estudos no arquivo.');

  if (report.version === 1) {
    report.integrity = 'legacy';
    report.warnings.push('Backup antigo: sem verificação criptográfica de integridade.');
  } else if (report.version === 2) {
    report.warnings.push('Backup v2: não inclui subcoleções de erros individuais.');
  }

  if (report.version === 2 || report.version === 3) {
    const checksum = candidate.checksum;
    if (isRecord(checksum) && checksum.algorithm === 'SHA-256' &&
        typeof checksum.value === 'string' && /^[a-f0-9]{64}$/i.test(checksum.value)) {
      try {
        // Hash exactly the versioned payload, retaining nested records on v3.
        const calculated = await sha256({
          user: candidate.user as BackupPayload['user'],
          profiles: candidate.profiles as StoredProfile[],
        });
        if (calculated === null) {
          report.warnings.push('Este navegador não permite verificar o SHA-256.');
        } else if (calculated.toLowerCase() !== checksum.value.toLowerCase()) {
          report.integrity = 'invalid';
          report.errors.push('Falha de integridade: o conteúdo difere do backup original.');
        } else report.integrity = 'verified';
      } catch {
        report.integrity = 'invalid';
        report.errors.push('Não foi possível calcular a integridade do arquivo.');
      }
    } else report.warnings.push('Arquivo sem checksum SHA-256 verificável.');
  }

  report.valid = report.errors.length === 0;
  return report;
}
