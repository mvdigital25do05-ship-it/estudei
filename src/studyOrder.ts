import recommendation from './data/tjspStudyOrder.json';
import { Discipline, Topic } from './types';

const order: Record<string, number> = recommendation.order;
type TopicList = Pick<Discipline, 'id' | 'topics'>;

export function hasRecommendedStudyOrder(discipline?: TopicList | null): boolean {
  return !!discipline?.id.startsWith('tjsp_') && discipline.topics.some(topic => order[topic.id] !== undefined);
}

/** Sort only for presentation; IDs, stored arrays and historical records remain intact. */
export function getStudyTopics(discipline?: TopicList | null): Topic[] {
  if (!discipline) return [];
  if (!hasRecommendedStudyOrder(discipline)) return discipline.topics;
  return [...discipline.topics].sort((a, b) =>
    (order[a.id] ?? Number.MAX_SAFE_INTEGER) - (order[b.id] ?? Number.MAX_SAFE_INTEGER));
}
