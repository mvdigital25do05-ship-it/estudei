import { ActivityLog, Discipline, ExerciseLog, Topic } from './types';
import { getStudyTopics } from './studyOrder';

type GroupDefinition = { key: string; name: string; numbers: number[]; law?: string };
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const group = (key: string, name: string, numbers: number[], law?: string): GroupDefinition => ({ key, name, numbers, law });
const CP = 'Código Penal';
const CPP = 'Código de Processo Penal';
const CPC = 'Código de Processo Civil';
const CF = 'Constituição Federal de 1988';
const definitions: Record<string, GroupDefinition[]> = {
  LP: [group('leitura', 'Leitura e interpretação', range(1, 8)), group('semantica', 'Semântica', range(9, 11)), group('classes', 'Classes gramaticais', range(12, 20)), group('sintaxe', 'Sintaxe e norma-padrão', range(21, 27))],
  DP: [group('fe-publica', 'Fé pública', range(1, 9), CP), group('funcionais', 'Crimes funcionais', range(10, 19), CP), group('administracao', 'Crimes praticados contra a Administração', range(20, 26), CP), group('justica', 'Administração da Justiça', range(27, 35), CP)],
  DPP: [group('sujeitos', 'Sujeitos processuais', range(1, 4), CPP), group('citacao', 'Citação e intimação', range(5, 7), CPP), group('procedimentos', 'Procedimentos penais', range(8, 12), CPP), group('recursos', 'Recursos e ações impugnativas', range(13, 21), CPP), group('juizados', 'Juizados Especiais Criminais', range(22, 27), 'Lei nº 9.099/1995 — Juizados Especiais Criminais')],
  DPC: [group('juiz', 'Juiz e auxiliares da justiça', range(1, 4), CPC), group('atos', 'Atos e prazos processuais', range(5, 9), CPC), group('tutela', 'Tutela provisória', range(10, 14), CPC), group('comum', 'Procedimento comum', range(15, 23), CPC), group('provas', 'Provas', range(24, 33), CPC), group('sentenca', 'Sentença e cumprimento', range(34, 39), CPC), group('recursos', 'Recursos cíveis', range(40, 44), CPC), group('juizados', 'Juizados Especiais Cíveis', range(45, 47), 'Lei nº 9.099/1995 — Juizados Especiais Cíveis'), group('fazenda', 'Juizados da Fazenda Pública', range(48, 50), 'Lei nº 12.153/2009 — Juizados da Fazenda Pública')],
  DC: [group('direitos', 'Direitos e garantias fundamentais', range(1, 3), CF), group('administracao', 'Administração pública', range(4, 6), CF), group('judiciario', 'Poder Judiciário', [7], CF)],
  DA: [group('ingresso', 'Ingresso e vida funcional dos servidores estaduais', range(1, 4), 'Lei estadual nº 10.261/1968 — Estatuto dos Funcionários Públicos Civis do Estado'), group('direitos', 'Direitos, deveres e disciplina dos servidores estaduais', range(5, 11), 'Lei estadual nº 10.261/1968 — Estatuto dos Funcionários Públicos Civis do Estado'), group('improbidade', 'Improbidade administrativa', range(12, 19), 'Lei nº 8.429/1992 — Lei de Improbidade Administrativa')],
  LI: [group('teletrabalho', 'Teletrabalho', range(1, 3), 'Resolução TJSP nº 850/2021'), group('eproc', 'Processo eletrônico e sistema eproc', range(4, 6), 'Resolução TJSP nº 963/2025'), group('carreiras', 'Plano de cargos e carreiras', range(7, 9), 'Lei Complementar estadual nº 1.111/2010'), group('regimento', 'Organização e funcionamento do Tribunal', range(10, 12), 'Regimento Interno do Tribunal de Justiça de São Paulo'), group('corregedoria', 'Serviços da Corregedoria', range(13, 40), 'Normas de Serviço da Corregedoria Geral da Justiça — Tomo I')],
  AT: [group('atualidades', 'Atualidades', range(1, 3)), group('inclusao', 'Inclusão da pessoa com deficiência', range(4, 5), 'Lei nº 13.146/2015 — Lei Brasileira de Inclusão')],
  MAT: [group('aritmetica', 'Aritmética e proporcionalidade', range(1, 10)), group('algebra', 'Álgebra e leitura de dados', range(11, 16)), group('geometria', 'Geometria e problemas', range(17, 21))],
  INF: [group('windows', 'Windows', range(1, 7)), group('word', 'Word', range(8, 17)), group('excel', 'Excel', range(18, 28)), group('internet', 'Correio eletrônico e Internet', range(29, 34)), group('colaboracao', 'Teams e OneDrive', range(35, 40))],
  RL: [group('relacoes', 'Relações e estruturas lógicas', range(1, 7)), group('sequencias', 'Sequências', range(8, 9))],
  RED: [group('redacao', 'Produção e revisão de redação', range(1, 7))],
};

export interface StudyContentNode {
  id: string;
  name: string;
  children?: StudyContentNode[];
  topic?: Topic;
  groupId?: string;
  reference?: string;
}

export function hasTopicGroups(discipline?: Discipline | null): boolean {
  return !!discipline && !!definitions[discipline.id.replace(/^tjsp_/, '')] && discipline.id.startsWith('tjsp_');
}

/** Build a hierarchy without changing any stored topic ID, completion or historical link. */
export function getTopicGroups(discipline: Discipline): StudyContentNode[] {
  const sorted = getStudyTopics(discipline);
  if (!hasTopicGroups(discipline)) return sorted.map(topic => ({ id: topic.id, name: topic.name, topic }));
  const prefix = discipline.id.slice(5);
  const ranks = new Map(sorted.map((topic, index) => [topic.id, index]));
  const used = new Set<string>();
  const groups: (StudyContentNode & { rank: number })[] = definitions[prefix].map(def => {
    const groupId = `tjsp_group_${prefix}_${def.key}`;
    const ids = new Set(def.numbers.map(n => `tjsp_${prefix}_${String(n).padStart(3, '0')}`));
    const topics = sorted.filter(t => ids.has(t.id) || t.studyGroupId === groupId);
    topics.forEach(t => used.add(t.id));
    const leaves: StudyContentNode[] = topics.map(topic => ({ id: topic.id, name: topic.name, topic }));
    return { id: groupId, name: def.name, groupId, children: leaves, reference: def.law,
      rank: Math.min(...topics.map(t => ranks.get(t.id)!), Number.MAX_SAFE_INTEGER) };
  }).filter(g => getNodeTopics(g).length > 0).sort((a, b) => a.rank - b.rank);
  const custom = sorted.filter(t => !used.has(t.id)).map(topic => ({ id: topic.id, name: topic.name, topic }));
  if (custom.length) groups.push({ id: `tjsp_group_${prefix}_custom`, name: 'Outros assuntos adicionados', groupId: `tjsp_group_${prefix}_custom`, children: custom, rank: Number.MAX_SAFE_INTEGER });
  return groups;
}

export function getNodeTopics(node: StudyContentNode): Topic[] {
  return node.topic ? [node.topic] : (node.children || []).flatMap(getNodeTopics);
}

/** Count only main headings; a heading is complete when every underlying subject is complete. */
export function getMainTopicProgress(discipline: Discipline) {
  const groups = getTopicGroups(discipline);
  const total = groups.length;
  const completed = groups.filter(group => {
    const topics = getNodeTopics(group);
    return topics.length > 0 && topics.every(topic => topic.completed);
  }).length;
  return {
    total, completed, pending: total - completed,
    percentage: total > 0 ? Math.round(100 * completed / total) : 0,
    started: discipline.topics.some(topic => topic.completed || topic.subtopics?.some(s => s.completed))
      || discipline.timeSpentMin > 0 || discipline.correctAnswers + discipline.wrongAnswers > 0,
  };
}

export function setContentCompletion(discipline: Discipline, ids: string[], completed: boolean): Discipline {
  const selected = new Set(ids);
  const topics = discipline.topics.map(t => selected.has(t.id) ? { ...t, completed,
    ...(t.subtopics ? { subtopics: t.subtopics.map(s => ({ ...s, completed })) } : {}) } : t);
  return { ...discipline, topics, topicsTotal: topics.length, topicsDone: topics.filter(t => t.completed).length };
}

/** A group history entry belongs here only when its entire scope fits this group. */
export function getNodeStats(node: StudyContentNode, activities: ActivityLog[], exercises: ExerciseLog[], disciplineId: string, disciplineName: string) {
  const topics = getNodeTopics(node);
  const ids = new Set(topics.map(t => t.id));
  const contains = (log: { topicId?: string; coverageTopicIds?: string[] }) =>
    !!log.topicId && ids.has(log.topicId) || !!log.coverageTopicIds?.length && log.coverageTopicIds.every(id => ids.has(id));
  const minutes = activities.filter(log => log.disciplineName === disciplineName && contains(log as any)).reduce((n, log) => n + log.timeSpentMin, 0);
  const questions = exercises.filter(log => log.disciplineId === disciplineId && contains(log as any));
  const correct = questions.reduce((n, log) => n + log.correctAnswers, 0);
  const wrong = questions.reduce((n, log) => n + log.wrongAnswers, 0);
  return { minutes, correct, wrong, completed: topics.filter(t => t.completed).length, total: topics.length };
}
