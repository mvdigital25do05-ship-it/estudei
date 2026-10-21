import type { Discipline, ExamPriority, Subtopic, Topic } from './types';

/**
 * Importação manual em TSV (colunas copiadas de planilhas) ou JSON.
 * O arquivo não declara que o edital foi auditado: a origem permanece explícita.
 * Todas as operações são puras, sem escrita no banco de dados.
 */
export interface OutlineRow {
  discipline: string;
  topic: string;
  subtopic?: string;
  priority?: ExamPriority;
}

export interface OutlineInput {
  source: string;
  rows: OutlineRow[];
}

export interface OutlineStats {
  newDisciplines: number;
  newTopics: number;
  newSubtopics: number;
  priorityChanges: number;
  untouched: number;
}

export interface OutlinePreview {
  disciplines: Discipline[];
  stats: OutlineStats;
}

const MAX_SIZE = 500_000;
const MAX_ROWS = 2_000;

export function normalizeOutlineName(value: string): string {
  return value.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/\s+/g, ' ')
    .trim();
}

function assertText(value: unknown, label: string, required = false): string {
  if (typeof value !== 'string') throw new Error(label + ': texto inválido.');
  const cleaned = value.trim();
  if (cleaned.length > 320 || (required && !cleaned)) {
    throw new Error(label + ': texto vazio ou longo demais (máximo 320 caracteres).');
  }
  return cleaned;
}

function parsePriority(value: unknown): ExamPriority | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const upper = String(value).trim().toUpperCase();
  if (upper === 'A' || upper === 'B' || upper === 'C') return upper;
  throw new Error('Prioridade inválida: informe A, B, C ou deixe em branco.');
}

export function parseOutline(text: string, source: string): OutlineInput {
  if (text.length > MAX_SIZE) throw new Error('Arquivo maior que o limite de 500 KB.');
  const origin = assertText(source, 'Fonte/versão', true);
  if (!text.trim()) throw new Error('Cole os tópicos em TSV ou JSON.');

  let rawRows: unknown[];
  if (text.trimStart().startsWith('[') || text.trimStart().startsWith('{')) {
    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { throw new Error('JSON inválido.'); }
    if (Array.isArray(parsed)) rawRows = parsed;
    else if (parsed !== null && typeof parsed === 'object' && 'rows' in parsed && Array.isArray(parsed.rows)) {
      rawRows = parsed.rows;
    } else throw new Error('JSON deve conter um array ou um objeto com rows[].');
  } else {
    rawRows = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => line.trim()).map(line => {
      const cols = line.split('\t');
      if (cols.length < 2 || cols.length > 4) {
        throw new Error('TSV: use 2 a 4 colunas separadas por TAB (copiadas de uma planilha).');
      }
      return { discipline: cols[0], topic: cols[1], subtopic: cols[2] || '', priority: cols[3] || '' };
    });
    const first = rawRows[0] as { discipline: string; topic: string };
    if (first && normalizeOutlineName(first.discipline) === 'disciplina' && normalizeOutlineName(first.topic) === 'topico') {
      rawRows.shift();
    }
  }

  if (!rawRows.length || rawRows.length > MAX_ROWS) {
    throw new Error('Informe entre 1 e 2.000 linhas do edital.');
  }

  const rows = rawRows.map((item, index): OutlineRow => {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error('Linha ' + (index + 1) + ': registro inválido.');
    }
    const row = item as Record<string, unknown>;
    return {
      discipline: assertText(row.discipline, 'Linha ' + (index + 1) + ' disciplina', true),
      topic: assertText(row.topic, 'Linha ' + (index + 1) + ' tópico', true),
      subtopic: row.subtopic === undefined ? '' : assertText(row.subtopic, 'Subtópico'),
      priority: parsePriority(row.priority),
    };
  });

  // A mesma combinação pode aparecer duas vezes em planilhas; rejeitar
  // prioridades divergentes para impedir substituições silenciosas.
  const priorities = new Map<string, ExamPriority>();
  rows.forEach(row => {
    const key = normalizeOutlineName(row.discipline) + '/' + normalizeOutlineName(row.topic);
    if (row.priority && priorities.has(key) && priorities.get(key) !== row.priority) {
      throw new Error('O tópico "' + row.topic + '" recebeu prioridades conflitantes.');
    }
    if (row.priority) priorities.set(key, row.priority);
  });

  return { source: origin, rows };
}

function hashId(seed: string): string {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function nextId(prefix: string, key: string, taken: Set<string>): string {
  const base = 'imp_' + prefix + '_' + hashId(key);
  let id = base, suffix = 2;
  while (taken.has(id)) id = base + '_' + suffix++;
  taken.add(id);
  return id;
}

function appearance(name: string): Pick<Discipline, 'icon' | 'colorClass'> {
  const normalized = normalizeOutlineName(name);
  if (normalized.includes('informatica')) return { icon: 'computer', colorClass: 'purple' };
  if (normalized.includes('matematica') || normalized.includes('raciocinio')) return { icon: 'calculate', colorClass: 'yellow' };
  if (normalized.includes('direito') || normalized.includes('legislacao')) return { icon: 'gavel', colorClass: 'emerald' };
  return { icon: 'book', colorClass: 'blue' };
}

export function previewOutlineMerge(existing: Discipline[], input: OutlineInput): OutlinePreview {
  const data: Discipline[] = existing.map(discipline => ({
    ...discipline,
    topics: discipline.topics.map(topic => ({ ...topic, subtopics: topic.subtopics?.map(sub => ({ ...sub })) })),
  }));
  const stats: OutlineStats = {
    newDisciplines: 0, newTopics: 0, newSubtopics: 0, priorityChanges: 0, untouched: 0,
  };

  const disciplineIds = new Set(data.map(d => d.id));
  const topicIds = new Set(data.flatMap(d => d.topics.map(t => t.id)));
  const subtopicIds = new Set(data.flatMap(d => d.topics.flatMap(t => (t.subtopics || []).map(s => s.id))));

  for (const row of input.rows) {
    const normDisc = normalizeOutlineName(row.discipline);
    const matchingDiscs = data.filter(d => normalizeOutlineName(d.name) === normDisc);
    if (matchingDiscs.length > 1) {
      throw new Error('Existem disciplinas repetidas chamadas "' + row.discipline + '". Resolva a duplicidade antes de importar.');
    }

    let disc = matchingDiscs[0];
    if (!disc) {
      disc = {
        id: nextId('d', normDisc, disciplineIds),
        name: row.discipline,
        topicsTotal: 0,
        topicsDone: 0,
        topics: [],
        timeSpentMin: 0,
        correctAnswers: 0,
        wrongAnswers: 0,
        ...appearance(row.discipline),
      };
      data.push(disc);
      stats.newDisciplines++;
    }

    const normTopic = normalizeOutlineName(row.topic);
    const sameTopics = disc.topics.filter(t => normalizeOutlineName(t.name) === normTopic);
    if (sameTopics.length > 1) {
      throw new Error('Existem tópicos duplicados: "' + row.topic + '" em "' + disc.name + '".');
    }
    let topic: Topic | undefined = sameTopics[0];
    if (!topic) {
      topic = {
        id: nextId('t', normDisc + '/' + normTopic, topicIds),
        name: row.topic,
        completed: false,
      };
      disc.topics.push(topic);
      stats.newTopics++;
    }

    if (row.priority && (topic.examPriority !== row.priority ||
      topic.examPrioritySource !== input.source)) {
      topic.examPriority = row.priority;
      topic.examPrioritySource = input.source;
      stats.priorityChanges++;
    }

    if (row.subtopic) {
      const normSub = normalizeOutlineName(row.subtopic);
      if (!(topic.subtopics || []).some(st => normalizeOutlineName(st.name) === normSub)) {
        const sub: Subtopic = {
          id: nextId('s', normDisc + '/' + normTopic + '/' + normSub, subtopicIds),
          name: row.subtopic,
          completed: false,
        };
        topic.subtopics = [...(topic.subtopics || []), sub];
        // A newly added pending subtopic means the topic is not fully covered.
        topic.completed = false;
        stats.newSubtopics++;
      }
    } else if (sameTopics.length > 0 && !row.priority) {
      stats.untouched++;
    }

    disc.topicsTotal = disc.topics.length;
    disc.topicsDone = disc.topics.filter(t => t.completed).length;
  }

  return { disciplines: data, stats };
}
