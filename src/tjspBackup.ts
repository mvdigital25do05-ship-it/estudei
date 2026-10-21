import syllabus from './data/tjsp2026.json';
import { CargoPlan } from './types';
import { parseBackup } from './backup';

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/^\s*\d+\s*[.\-]?\s*/, '').trim().toLowerCase().replace(/\s+/g, ' ');
const topicId = (code: string) => `tjsp_${code.replace('-', '_')}`;

export function buildTJSPBackup(user: Record<string, any>, profiles: CargoPlan[], exportedAt = new Date().toISOString()) {
  const candidates = profiles.filter(p => normalize(p.name) === 'fiscal de posturas');
  if (candidates.length !== 1) throw Error('É necessário ter exatamente um cargo chamado Fiscal de Posturas para gerar este arquivo.');
  const source = candidates[0];
  const mapping = new Map<string, typeof syllabus.rules[number]>();
  for (const discipline of source.disciplines) {
    for (const topic of discipline.topics) {
      const rules = syllabus.rules.filter(rule => normalize(rule.sourceDiscipline) === normalize(discipline.name)
        && normalize(rule.sourceTopic) === normalize(topic.name));
      if (rules.length === 1) {
        if (mapping.has(topic.id)) throw Error('Existem identificadores de tópico duplicados na origem.');
        mapping.set(topic.id, rules[0]);
      }
    }
  }
  if (!mapping.size) throw Error('Os tópicos atuais não correspondem ao mapeamento analisado. Seu histórico não foi alterado.');
  const completed = new Set<string>();
  const evidence: Record<string, any>[] = [];
  for (const discipline of source.disciplines) for (const topic of discipline.topics) {
    const rule = mapping.get(topic.id);
    if (!rule) continue;
    if (rule.completed && topic.completed) rule.codes.forEach(code => completed.add(topicId(code)));
    evidence.push({ sourceTopicId: topic.id, sourceTopic: topic.name, ...rule });
  }
  const activities: any[] = [];
  const exercises: any[] = [];
  for (const log of source.activityLogs || []) {
    const rule = mapping.get(log.topicId || '');
    const oldDiscipline = source.disciplines.find(d => d.topics.some(t => t.id === log.topicId));
    if (rule && oldDiscipline?.name === log.disciplineName) {
      const prefix = rule.codes[0].split('-')[0];
      const target = syllabus.disciplines.find(d => d.id === `tjsp_${prefix}`)!;
      const record: any = { ...log, id: `tjsp_${log.id}`, disciplineName: target.name, sourceProfileId: source.id,
        sourceActivityId: log.id, sourceTopicId: log.topicId, coverageTopicIds: rule.codes.map(topicId), coverageKind: rule.kind,
        details: `${log.details} | Aproveitado de Fiscal de Posturas: ${rule.sourceTopic}. Referência: ${rule.codes.join(', ')}. ${rule.reason}` };
      if (rule.codes.length === 1) record.topicId = topicId(rule.codes[0]);
      else delete record.topicId;
      activities.push(record);
    } else if (!log.topicId && normalize(log.disciplineName) === 'lingua portuguesa' && log.timeSpentMin > 0) {
      activities.push({ ...log, id: `tjsp_${log.id}`, disciplineName: 'Língua Portuguesa', sourceActivityId: log.id,
        sourceProfileId: source.id, coverageKind: 'materia',
        details: `${log.details} | Histórico de Português sem tópico identificado; não distribuído entre tópicos.` });
    }
  }
  if (new Set(activities.map(l => l.sourceActivityId)).size !== activities.length) throw Error('Atividades duplicadas na origem. Geração interrompida.');
  for (const log of source.exerciseLogs || []) {
    const rule = mapping.get(log.topicId);
    const oldDiscipline = source.disciplines.find(d => d.id === log.disciplineId);
    if (!rule || !oldDiscipline?.topics.some(t => t.id === log.topicId)) continue;
    const prefix = rule.codes[0].split('-')[0];
    const target = syllabus.disciplines.find(d => d.id === `tjsp_${prefix}`)!;
    const code = topicId(rule.codes[0]);
    exercises.push({ ...log, id: `tjsp_${log.id}`, disciplineId: target.id, disciplineName: target.name,
      topicId: rule.codes.length === 1 ? code : `tjsp_grupo_${log.topicId}`,
      topicName: rule.codes.length === 1 ? target.topics.find(t => t.id === code)!.name : `${rule.sourceTopic} (grupo: ${rule.codes.join(', ')})`,
      notes: `${log.notes || ''} | Origem Fiscal de Posturas; ${rule.reason}`, sourceExerciseId: log.id, coverageTopicIds: rule.codes.map(topicId) });
  }
  const disciplines = syllabus.disciplines.map(d => {
    const logs = exercises.filter(l => l.disciplineId === d.id);
    const topics = d.topics.map(t => ({ ...t, completed: completed.has(t.id) }));
    return { ...d, topics, topicsTotal: topics.length, topicsDone: topics.filter(t => t.completed).length,
      timeSpentMin: activities.filter(l => l.disciplineName === d.name).reduce((n, l) => n + l.timeSpentMin, 0),
      correctAnswers: logs.reduce((n, l) => n + l.correctAnswers, 0), wrongAnswers: logs.reduce((n, l) => n + l.wrongAnswers, 0) };
  });
  const id = 'tjsp_2026_aproveitamento_20261021';
  const profile = { id, name: 'Escrevente TJSP 2026 — aproveitamento Fiscal', disciplines,
    activityLogs: activities, exerciseLogs: exercises, mockTests: [], studyBlocks: [],
    weeklyHours: { done: 0, total: 24 }, weeklyQuestions: { done: 0, total: 300 }, weeklyReviews: { done: 0, total: 60 },
    createdAt: '21 out. 2026', examDate: '', examName: 'TJSP — Escrevente — checklist fornecido 2026/2027',
    transferEvidence: { sourceProfileId: source.id, syllabus: 'TJSP_2026_TOPICOS_COMPLETOS_PRIORIDADES_ABC.pdf', mapping: evidence } };
  const backup = { format: 'estudei-backup', version: 1, exportedAt, user: { ...user, activeProfileId: id }, profiles: [{ documentId: id, data: profile }] };
  const text = JSON.stringify(backup, null, 2);
  parseBackup(text);
  return { text, minutes: disciplines.reduce((n, d) => n + d.timeSpentMin, 0), activities: activities.length, exercises: exercises.length };
}
