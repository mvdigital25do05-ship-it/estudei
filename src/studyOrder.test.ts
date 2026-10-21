import test from 'node:test';
import assert from 'node:assert/strict';
import { getStudyTopics, hasRecommendedStudyOrder } from './studyOrder';
import syllabus from './data/tjsp2026.json';
import { Topic } from './types';

test('ordena todas as 287 unidades sem alterar os tópicos ou perder marcações', () => {
  let total = 0;
  for (const discipline of syllabus.disciplines) {
    const topics = discipline.topics.map((t, i) => ({ ...t, completed: i % 2 === 0 })).reverse();
    const original = JSON.stringify(topics);
    const result = getStudyTopics({ id: discipline.id, topics });
    assert.equal(JSON.stringify(topics), original);
    assert.deepEqual(new Set(result.map(t => t.id)), new Set(topics.map(t => t.id)));
    for (const topic of result) assert.equal(topic, topics.find(t => t.id === topic.id));
    total += result.length;
  }
  assert.equal(total, 287);
});

test('antecipa fundamentos e conteúdos destacados na análise', () => {
  const penal = { id: 'tjsp_DP', topics: ['tjsp_DP_010','tjsp_DP_019','tjsp_DP_014'].map(id => ({ id, name: id, completed: false })) };
  assert.deepEqual(getStudyTopics(penal).map(t => t.id), ['tjsp_DP_019','tjsp_DP_010','tjsp_DP_014']);
  const cpp = { id: 'tjsp_DPP', topics: ['tjsp_DPP_020','tjsp_DPP_014','tjsp_DPP_018','tjsp_DPP_005'].map(id => ({ id, name: id, completed: false })) };
  assert.deepEqual(getStudyTopics(cpp).map(t => t.id), ['tjsp_DPP_005','tjsp_DPP_018','tjsp_DPP_014','tjsp_DPP_020']);
});

test('preserva tópicos personalizados e não reordena outros cargos', () => {
  const custom: Topic[] = [{ id: 'meu-topico-2', name: 'Meu tópico', completed: true }, { id: 'meu-topico-1', name: 'Outro tópico', completed: false }];
  const topics = [custom[0], { id: 'tjsp_LP_026', name: 'Crase', completed: true }, custom[1]];
  assert.deepEqual(getStudyTopics({ id: 'tjsp_LP', topics }).map(t => t.id), ['tjsp_LP_026','meu-topico-2','meu-topico-1']);
  assert.equal(getStudyTopics({ id: 'fiscal', topics }), topics);
  assert.equal(hasRecommendedStudyOrder({ id: 'fiscal', topics }), false);
  assert.deepEqual(getStudyTopics(undefined), []);
});
