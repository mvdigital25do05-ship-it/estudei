import React from 'react';
import { Discipline } from '../types';
import { getStudyTopics } from '../studyOrder';
import { getNodeTopics, getTopicGroups, hasTopicGroups } from '../topicGroups';
import { formatTopicName } from '../utils';

export default function StudyTopicOptions({ discipline }: { discipline?: Discipline }) {
  if (!discipline) return null;
  if (!hasTopicGroups(discipline)) return <>{getStudyTopics(discipline).map((t, index) => <option key={t.id} value={t.id}>{index + 1}- {formatTopicName(t.name)}</option>)}</>;
  return <>{getTopicGroups(discipline).map((group, index) => <optgroup key={group.id} label={`${index + 1}- ${group.name}`}>
    {getNodeTopics(group).map((topic, childIndex) => <option key={topic.id} value={topic.id}>{index + 1}.{childIndex + 1}- {formatTopicName(topic.name)}</option>)}
  </optgroup>)}</>;
}
