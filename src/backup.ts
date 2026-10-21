/**
 * Ferramentas de backup do Estudei.
 *
 * A verificação é estritamente local: não escreve no Firestore.
 * O SHA-256 detecta alterações acidentais no conteúdo, mas não autentica a origem.
 */
export interface StoredProfile {
  documentId: string;
  data: Record<string, unknown>;
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

  // JSON.stringify preserves the original object key ordering on round-trip.
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function createBackup(payload: BackupPayload) {
  const checksum = await sha256(payload);
  return {
    format: FORMAT,
    version: 2,
    exportedAt: new Date().toISOString(),
    user: payload.user,
    profiles: payload.profiles,
    ...(checksum ? { checksum: { algorithm: 'SHA-256', value: checksum } } : {}),
  };
}

/**
 * Accepts legacy v1 backups and v2 backups with optional SHA-256 checksums.
 * Never restores, merges, uploads, or writes the inspected content.
 */
export async function inspectBackup(candidate: unknown): Promise<BackupInspection> {
  const report: BackupInspection = {
    valid: false,
    version: null,
    profileCount: 0,
    exerciseRecords: 0,
    activityRecords: 0,
    questionsCount: 0,
    integrity: 'unavailable',
    errors: [],
    warnings: [],
  };

  if (!isRecord(candidate)) {
    report.errors.push('O arquivo não contém um objeto JSON de backup.');
    return report;
  }

  if (candidate.format !== FORMAT) {
    report.errors.push('O arquivo não é um backup do Estudei.');
  }

  if (candidate.version !== 1 && candidate.version !== 2) {
    report.errors.push('Versão de backup não reconhecida.');
  } else {
    report.version = candidate.version;
  }

  if (candidate.user !== null && !isRecord(candidate.user)) {
    report.errors.push('Os dados da conta estão em formato inválido.');
  } else if (candidate.user === null) {
    report.warnings.push('Backup sem documento de conta.');
  }

  if (!Array.isArray(candidate.profiles)) {
    report.errors.push('Lista de perfis ausente ou inválida.');
    return report;
  }

  const ids = new Set<string>();
  const profiles: StoredProfile[] = [];

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
    profiles.push({ documentId: item.documentId, data: item.data });

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
      report.warnings.push(`Perfil ${index + 1}: histórico próximo do limite atual de registros por lista.`);
    }
  }

  report.profileCount = profiles.length;
  if (profiles.length === 0) report.warnings.push('Nenhum perfil de estudos no arquivo.');

  if (candidate.version === 1) {
    report.integrity = 'legacy';
    report.warnings.push('Backup antigo: sem verificação criptográfica de integridade.');
  } else if (candidate.version === 2) {
    const checksum = candidate.checksum;
    if (isRecord(checksum) && checksum.algorithm === 'SHA-256' &&
        typeof checksum.value === 'string' && /^[a-f0-9]{64}$/i.test(checksum.value)) {
      try {
        const calculated = await sha256({
          user: candidate.user as BackupPayload['user'],
          profiles: candidate.profiles as StoredProfile[],
        });
        if (calculated === null) {
          report.warnings.push('Este navegador não permite verificar o SHA-256.');
        } else if (calculated.toLowerCase() !== checksum.value.toLowerCase()) {
          report.integrity = 'invalid';
          report.errors.push('Falha de integridade: o conteúdo difere do backup original.');
        } else {
          report.integrity = 'verified';
        }
      } catch {
        report.integrity = 'invalid';
        report.errors.push('Não foi possível calcular a integridade do arquivo.');
      }
    } else {
      report.warnings.push('Arquivo sem checksum SHA-256 verificável.');
    }
  }

  report.valid = report.errors.length === 0;
  return report;
}
