/** One independently tracked error, stored in Firestore below its study profile. */
export type ErrorCause = 'desconhecimento' | 'confusao' | 'interpretacao' | 'desatencao' | 'tempo' | 'outro';
export type ErrorStatus = 'aberto' | 'revisado' | 'arquivado';

export interface ErrorNote {
  id: string;
  profileId: string;
  disciplineId: string;
  disciplineName: string;
  topicId: string;
  topicName: string;
  questionRef: string;
  cause: ErrorCause;
  summary: string;
  rule: string;
  front: string;
  back: string;
  status: ErrorStatus;
  createdAtMs: number;
  updatedAtMs: number;
}

export type ErrorNoteInput = Pick<ErrorNote,
'disciplineId' | 'disciplineName' | 'topicId' | 'topicName' |
'questionRef' | 'cause' | 'summary' | 'rule' | 'front' | 'back'>;

function clean(value: string, max: number, label: string): string {
  if (typeof value !== 'string') throw new Error(label + ': conteúdo inválido.');
  const output = value.trim();
  if (output.length > max) throw new Error(label + ': limite de ' + max + ' caracteres.');
  return output;
}

export function prepareErrorNote(id: string, profileId: string,
  input: ErrorNoteInput, nowMs: number): ErrorNote {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(id) || !/^[A-Za-z0-9_-]{1,128}$/.test(profileId)) {
    throw new Error('Identificador de perfil ou erro inválido.');
  }
  if (!Number.isSafeInteger(nowMs) || nowMs <= 0) throw new Error('Data inválida.');
  const disciplineId = clean(input.disciplineId, 128, 'ID disciplina');
  const topicId = clean(input.topicId, 128, 'ID tópico');
  const disciplineName = clean(input.disciplineName, 160, 'Disciplina');
  const topicName = clean(input.topicName, 160, 'Tópico');
  const summary = clean(input.summary, 1000, 'Motivo do erro');
  const rule = clean(input.rule, 2000, 'Regra correta');
  const front = clean(input.front, 500, 'Pergunta');
  const back = clean(input.back, 1000, 'Resposta');
  const questionRef = clean(input.questionRef, 240, 'Referência');
  if (!disciplineId || !topicId || !disciplineName || !topicName ||
      !summary || !rule) {
    throw new Error('Preencha a disciplina, o assunto, o erro e a regra correta.');
  }
  if (Boolean(front) !== Boolean(back)) {
    throw new Error('Para criar um cartão, preencha pergunta e resposta.');
  }
  const causes: ErrorCause[] = ['desconhecimento','confusao','interpretacao','desatencao','tempo','outro'];
  if (!causes.includes(input.cause)) throw new Error('Causa do erro inválida.');
  return { id, profileId, disciplineId, disciplineName, topicId,
    topicName, questionRef, cause: input.cause, summary, rule, front, back,
    status: 'aberto', createdAtMs: nowMs, updatedAtMs: nowMs };
}

const textField = (value: string): string =>
  value.trim().replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ');
const tagField = (value: string): string =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60);

export function exportErrorNotesAnki(notes: ErrorNote[]) {
  const lines: string[] = [];
  const seen = new Set<string>();
  for (const note of notes) {
    if (note.status === 'arquivado') continue;
    const front = textField(note.front);
    const back = textField(note.back);
    if (!front || !back) continue;
    const fingerprint = (front + '\u0000' + back).toLocaleLowerCase('pt-BR');
    if (seen.has(fingerprint)) continue;
    seen.add(fingerprint);
    lines.push([front, back, ['Estudei', tagField(note.disciplineName),
      tagField(note.topicName)].filter(Boolean).join(' ')].join('\t'));
  }
  return {
    count: lines.length,
    text: ['#separator:tab', '#html:false', '#tags column:3', ...lines].join('\n') + '\n'
  };
}
