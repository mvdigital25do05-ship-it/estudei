import type { ExerciseLog } from './types';

function line(value: string): string {
  // Anki imports TSV: never allow user text to introduce new fields/cards.
  return value.trim().replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').slice(0, 500);
}

function tag(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
}

export interface AnkiDeckText {
  text: string;
  count: number;
  skipped: number;
}

/**
 * Text/TSV format for Anki's native text importer.
 * Does not transmit data. A batch can contribute at most one flashcard.
 * Legacy logs without explicit front/back remain available in history but
 * must not be fabricated into flashcards.
 */
export function exportAnkiText(logs: ExerciseLog[]): AnkiDeckText {
  const seen = new Set<string>();
  const rows: string[] = [];
  let skipped = 0;

  for (const log of logs) {
    const front = line(log.ankiFront || '');
    const back = line(log.ankiBack || '');
    if (!front || !back || log.wrongAnswers <= 0) {
      skipped++;
      continue;
    }
    const key = front.toLocaleLowerCase('pt-BR') + '\u0000' + back.toLocaleLowerCase('pt-BR');
    if (seen.has(key)) {
      skipped++;
      continue;
    }
    seen.add(key);
    const tags = [
      'Estudei',
      tag(log.disciplineName || ''),
      tag(log.topicName || ''),
      tag(log.examBoard || ''),
    ].filter(Boolean).join(' ');
    rows.push([front, back, tags].join('\t'));
  }

  const headers = [
    '#separator:tab',
    '#html:false',
    '#tags column:3',
  ];
  return {
    text: headers.concat(rows).join('\n') + '\n',
    count: rows.length,
    skipped,
  };
}
