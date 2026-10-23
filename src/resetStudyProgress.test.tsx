import React, { act } from 'react';
import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { CargoPlan } from './types';
import { ALL_DISCIPLINES, buildStudyResetPatch, StudyResetSelection } from './resetStudyProgress';
import ResetStudyProgressDialog from './components/ResetStudyProgressDialog';
import PlanosManager from './components/PlanosManager';
import DashboardHome from './components/DashboardHome';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true });
Object.defineProperty(dom.window.HTMLDialogElement.prototype, 'showModal', { value() { this.setAttribute('open', ''); } });
Object.defineProperty(dom.window.HTMLDialogElement.prototype, 'close', { value() { this.removeAttribute('open'); } });
const { createRoot } = await import('react-dom/client');

function profile(id = 'escrevente'): CargoPlan {
  return {
    id, name: id === 'escrevente' ? 'Escrevente TJSP' : 'Fiscal de Posturas', createdAt: '21 Out 2026', examDate: '2027-02-01', examName: 'TJSP',
    disciplines: [{ id: 'tjsp_DP', name: 'Direito Penal', icon: 'book', colorClass: 'blue', timeSpentMin: 180, correctAnswers: 70, wrongAnswers: 30,
      topicsTotal: 1, topicsDone: 1, topics: [{ id: 'tjsp_DP_010', name: 'Peculato', completed: true, subtopics: [{ id: 'sub', name: 'Modalidades', completed: true }] }] }],
    activityLogs: [{ id: 'a', disciplineName: 'Direito Penal', timeSpentMin: 180, timestamp: '', details: '', colorClass: 'blue', date: '2026-10-23', questionsSolved: 100, correctAnswers: 70, wrongAnswers: 30, studyType: 'Revisão' }],
    exerciseLogs: [{ id: 'e', disciplineId: 'tjsp_DP', disciplineName: 'Direito Penal', topicId: 'tjsp_DP_010', topicName: 'Peculato', questionsCount: 100, correctAnswers: 70, wrongAnswers: 30, accuracyPercent: 70, difficulty: 'Média', notes: 'Anotação', date: '23 Out 2026' }],
    mockTests: [{ id: 's', name: 'Simulado', date: '2026-10-23', correctAnswers: 50, totalQuestions: 70, scorePercent: 71, status: 'Concluído' }],
    studyBlocks: [{ id: 'b', disciplineName: 'Direito Penal', dayOfWeek: 1, shift: 'manha', durationMin: 60, type: 'Teoria', completed: true }],
    weeklyHours: { done: 3, total: 24 }, weeklyQuestions: { done: 100, total: 300 }, weeklyReviews: { done: 1, total: 5 },
  };
}

const allBoth: StudyResetSelection = { disciplineId: ALL_DISCIPLINES, metric: 'both' };
const now = new Date('2026-10-23T12:00:00');

test('zera os valores escolhidos, preserva sessões, tópicos concluídos e metas sem mutar a origem', () => {
  const original = profile();
  const snapshot = structuredClone(original);
  const reset = buildStudyResetPatch(original, allBoth, now);
  assert.deepEqual(original, snapshot);
  assert.deepEqual(reset.disciplines[0], { ...original.disciplines[0], timeSpentMin: 0, correctAnswers: 0, wrongAnswers: 0 });
  assert.deepEqual(reset.disciplines[0].topics, original.disciplines[0].topics);
  assert.equal(reset.activityLogs.length, 1);
  assert.equal(reset.activityLogs[0].timeSpentMin, 0);
  assert.equal(reset.activityLogs[0].questionsSolved, 0);
  assert.deepEqual([reset.exerciseLogs, reset.mockTests], [[], []]);
  assert.deepEqual([reset.weeklyHours, reset.weeklyQuestions, reset.weeklyReviews], [{ done: 0, total: 24 }, { done: 0, total: 300 }, { done: 1, total: 5 }]);
  assert.deepEqual(Object.keys(reset).sort(), ['disciplines', 'activityLogs', 'exerciseLogs', 'mockTests', 'weeklyHours', 'weeklyQuestions', 'weeklyReviews'].sort());
});

test('patch aplicado a um perfil preserva os demais, planejamento e informações do concurso', () => {
  const original = profile();
  const other = profile('fiscal');
  const patch = buildStudyResetPatch(original, allBoth, now);
  const next = [original, other].map(p => p.id === original.id ? { ...p, ...patch } : p);
  assert.strictEqual(next[1], other);
  for (const key of ['id', 'name', 'examName', 'examDate', 'createdAt', 'studyBlocks'] as const) assert.deepEqual(next[0][key], original[key]);
  assert.deepEqual(buildStudyResetPatch(next[0], allBoth, now), patch);
});

function twoSubjects(): CargoPlan {
  const p = profile();
  p.disciplines.push({ ...structuredClone(p.disciplines[0]), id: 'tjsp_LP', name: 'Português', timeSpentMin: 60, correctAnswers: 15, wrongAnswers: 5,
    topics: [{ id: 'lp_1', name: 'Interpretação', completed: false }] });
  p.activityLogs.push({ ...p.activityLogs[0], id: 'other', disciplineName: 'Português', timeSpentMin: 60, questionsSolved: 20, correctAnswers: 15, wrongAnswers: 5 });
  p.exerciseLogs.push({ ...p.exerciseLogs[0], id: 'other-ex', disciplineId: 'tjsp_LP', disciplineName: 'Português', correctAnswers: 15, wrongAnswers: 5, questionsCount: 20 });
  p.weeklyHours.done = 4; p.weeklyQuestions.done = 120;
  return p;
}

test('somente horas de Penal zera seus minutos nos contadores e gráficos, preserva todas as questões', () => {
  const p = twoSubjects();
  const patch = buildStudyResetPatch(p, { disciplineId: 'tjsp_DP', metric: 'hours' }, now);
  assert.equal(patch.disciplines[0].timeSpentMin, 0);
  assert.equal(patch.disciplines[0].correctAnswers, 70);
  assert.strictEqual(patch.disciplines[1], p.disciplines[1]);
  assert.equal(patch.activityLogs[0].timeSpentMin, 0);
  assert.equal(patch.activityLogs[0].questionsSolved, 100);
  assert.strictEqual(patch.activityLogs[1], p.activityLogs[1]);
  assert.strictEqual(patch.exerciseLogs, p.exerciseLogs);
  assert.strictEqual(patch.mockTests, p.mockTests);
  assert.equal(patch.weeklyHours.done, 1);
  assert.strictEqual(patch.weeklyQuestions, p.weeklyQuestions);
  assert.strictEqual(patch.weeklyReviews, p.weeklyReviews);
});

test('somente questões de Penal preserva horas e resultados das outras matérias e simulados gerais', () => {
  const p = twoSubjects();
  const patch = buildStudyResetPatch(p, { disciplineId: 'tjsp_DP', metric: 'questions' }, now);
  assert.equal(patch.disciplines[0].timeSpentMin, 180);
  assert.equal(patch.disciplines[0].correctAnswers + patch.disciplines[0].wrongAnswers, 0);
  assert.strictEqual(patch.disciplines[1], p.disciplines[1]);
  assert.equal(patch.activityLogs[0].timeSpentMin, 180);
  assert.equal(patch.activityLogs[0].questionsSolved, 0);
  assert.strictEqual(patch.activityLogs[1], p.activityLogs[1]);
  assert.deepEqual(patch.exerciseLogs, [p.exerciseLogs[1]]);
  assert.strictEqual(patch.mockTests, p.mockTests);
  assert.strictEqual(patch.weeklyHours, p.weeklyHours);
  assert.equal(patch.weeklyQuestions.done, 20);
});

test('ambos de uma matéria afeta só sua contribuição semanal e ignora registros de outra semana', () => {
  const p = twoSubjects();
  p.activityLogs.push({ ...p.activityLogs[1], id: 'old', date: '2026-09-01', timeSpentMin: 600, questionsSolved: 999 });
  const patch = buildStudyResetPatch(p, { disciplineId: 'tjsp_DP', metric: 'both' }, now);
  assert.equal(patch.disciplines[0].timeSpentMin + patch.disciplines[0].correctAnswers + patch.disciplines[0].wrongAnswers, 0);
  assert.strictEqual(patch.disciplines[1], p.disciplines[1]);
  assert.equal(patch.weeklyHours.done, 1); assert.equal(patch.weeklyQuestions.done, 20);
  assert.equal(patch.activityLogs.length, 3);
});

test('seleção inválida é recusada; ID e tópico identificam a matéria mesmo com nome antigo', () => {
  const p = twoSubjects();
  assert.throws(() => buildStudyResetPatch(p, { disciplineId: 'ausente', metric: 'hours' }));
  assert.throws(() => buildStudyResetPatch(p, { disciplineId: 'tjsp_DP', metric: 'outro' } as any));
  p.activityLogs[0].disciplineName = 'Nome antigo';
  p.activityLogs[0].topicId = 'tjsp_DP_010';
  assert.equal(buildStudyResetPatch(p, { disciplineId: 'tjsp_DP', metric: 'hours' }, now).activityLogs[0].timeSpentMin, 0);
  p.activityLogs[0].disciplineId = 'tjsp_LP';
  assert.equal(buildStudyResetPatch(p, { disciplineId: 'tjsp_DP', metric: 'hours' }, now).activityLogs[0].timeSpentMin, 180);
});

test('resumos automáticos são atualizados sem apagar as observações da sessão', () => {
  const p = profile();
  p.activityLogs[0].details = 'Estudou Teoria por 3h 00min usando PDF. Resolveu 100 questões (70 acertos / 30 erros). Obs: "Rever artigo 327"';
  const hours = buildStudyResetPatch(p, { disciplineId: 'tjsp_DP', metric: 'hours' }, now);
  assert.doesNotMatch(hours.activityLogs[0].details, /3h/);
  assert.match(hours.activityLogs[0].details, /100 questões/);
  const questions = buildStudyResetPatch(p, { disciplineId: 'tjsp_DP', metric: 'questions' }, now);
  assert.match(questions.activityLogs[0].details, /3h 00min/);
  assert.doesNotMatch(questions.activityLogs[0].details, /70 acertos/);
  assert.match(questions.activityLogs[0].details, /Rever artigo 327/);
});

async function mount(element: React.ReactNode) {
  const container = document.createElement('div'); document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => { root.render(element); });
  return {
    container,
    render: async (next: React.ReactNode) => { await act(async () => root.render(next)); },
    dispose: async () => { await act(async () => root.unmount()); container.remove(); },
  };
}
const button = (node: ParentNode, text: string) => {
  const found = [...node.querySelectorAll('button')].find(b => b.textContent?.trim() === text);
  assert(found, `Botão ${text} ausente`); return found;
};
const click = async (node: HTMLElement) => { await act(async () => node.click()); };
async function acknowledge(container: HTMLElement) {
  const subject = container.querySelector<HTMLSelectElement>('#reset-study-subject')!;
  if (!subject.value) {
    await act(async () => { subject.value = 'tjsp_DP'; subject.dispatchEvent(new dom.window.Event('change', { bubbles: true })); });
  }
  if (!container.querySelector('input[type="radio"]:checked')) await click(container.querySelector<HTMLInputElement>('input[value="both"]')!);
  await click(container.querySelector<HTMLInputElement>('input[type="checkbox"]')!);
  await click(button(container, 'Continuar'));
}
async function type(container: HTMLElement, value: string) {
  const input = container.querySelector<HTMLInputElement>('#reset-study-confirmation')!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  });
}

test('nenhuma exclusão ocorre antes das duas etapas e da palavra exata ZERAR', async t => {
  const calls: string[] = []; let closed = 0;
  const ui = await mount(<ResetStudyProgressDialog profile={profile()} onReset={async id => { calls.push(id); }} onClose={() => closed++} />);
  t.after(ui.dispose);
  assert(ui.container.querySelector('dialog')!.open);
  assert(button(ui.container, 'Continuar').disabled);
  await click(button(ui.container, 'Continuar')); assert.equal(calls.length, 0);
  await acknowledge(ui.container);
  assert.equal(calls.length, 0);
  assert(button(ui.container, 'Zerar definitivamente').disabled);
  for (const value of ['zerar', 'ZERA', ' ZERAR']) {
    await type(ui.container, value);
    assert(button(ui.container, 'Zerar definitivamente').disabled);
    await act(async () => { ui.container.querySelector('form')!.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })); });
    assert.equal(calls.length, 0);
  }
  await type(ui.container, 'ZERAR');
  await click(button(ui.container, 'Zerar definitivamente'));
  assert.deepEqual(calls, ['escrevente']); assert.equal(closed, 1);
});

test('cancelamento nas duas etapas não chama a exclusão; voltar exige confirmar tudo novamente', async t => {
  let calls = 0, closed = 0;
  const ui = await mount(<ResetStudyProgressDialog profile={profile()} onReset={async () => { calls++; }} onClose={() => closed++} />);
  t.after(ui.dispose);
  await click(button(ui.container, 'Cancelar')); assert.equal(closed, 1); assert.equal(calls, 0);
  await acknowledge(ui.container); await type(ui.container, 'ZERAR');
  await act(async () => { ui.container.querySelector('dialog')!.dispatchEvent(new dom.window.Event('cancel', { cancelable: true })); });
  assert.equal(closed, 2); assert.equal(calls, 0);
  await click(button(ui.container, 'Voltar'));
  assert(button(ui.container, 'Continuar').disabled);
  await acknowledge(ui.container);
  assert.equal(ui.container.querySelector<HTMLInputElement>('#reset-study-confirmation')!.value, '');
  assert(button(ui.container, 'Zerar definitivamente').disabled);
});

test('aguarda a gravação, bloqueia cliques repetidos e não fecha durante o envio', async t => {
  let resolve!: () => void; let calls = 0, closed = 0;
  const saved = new Promise<void>(done => { resolve = done; });
  const ui = await mount(<ResetStudyProgressDialog profile={profile()} onReset={async () => { calls++; await saved; }} onClose={() => closed++} />);
  t.after(ui.dispose);
  await acknowledge(ui.container); await type(ui.container, 'ZERAR');
  await click(button(ui.container, 'Zerar definitivamente'));
  assert(button(ui.container, 'Zerando...').disabled); assert.equal(closed, 0);
  await act(async () => {
    ui.container.querySelector('form')!.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    ui.container.querySelector('dialog')!.dispatchEvent(new dom.window.Event('cancel', { cancelable: true }));
  });
  assert.equal(calls, 1); assert.equal(closed, 0);
  await act(async () => { resolve(); await saved; });
  assert.equal(closed, 1);
});

test('falha de gravação mantém o diálogo aberto e permite tentar novamente', async t => {
  let calls = 0, closed = 0;
  const ui = await mount(<ResetStudyProgressDialog profile={profile()} onReset={async () => { if (++calls === 1) throw Error('Sem conexão'); }} onClose={() => closed++} />);
  t.after(ui.dispose);
  await acknowledge(ui.container); await type(ui.container, 'ZERAR');
  await click(button(ui.container, 'Zerar definitivamente'));
  assert.equal(closed, 0); assert.match(ui.container.querySelector('[role="alert"]')!.textContent!, /Sem conexão/);
  assert.equal(button(ui.container, 'Zerar definitivamente').disabled, false);
  await click(button(ui.container, 'Zerar definitivamente'));
  assert.equal(calls, 2); assert.equal(closed, 1);
});

test('alterar matéria ou métrica invalida a primeira confirmação e envia a seleção exata', async t => {
  const calls: StudyResetSelection[] = [];
  const ui = await mount(<ResetStudyProgressDialog profile={twoSubjects()} onReset={async (_id, selection) => { calls.push(selection); }} onClose={() => {}} />); t.after(ui.dispose);
  const select = ui.container.querySelector<HTMLSelectElement>('select')!;
  await act(async () => { select.value = 'tjsp_LP'; select.dispatchEvent(new dom.window.Event('change', { bubbles: true })); });
  await click(ui.container.querySelector<HTMLInputElement>('input[value="hours"]')!);
  await click(ui.container.querySelector<HTMLInputElement>('input[type="checkbox"]')!);
  assert.equal(button(ui.container, 'Continuar').disabled, false);
  await click(ui.container.querySelector<HTMLInputElement>('input[value="questions"]')!);
  assert(button(ui.container, 'Continuar').disabled);
  const summary = ui.container.querySelector('[aria-label="Resumo da seleção"]')!;
  assert.match(summary.textContent!, /Português — Somente questões/);
  assert.match(summary.textContent!, /20/);
  await click(ui.container.querySelector<HTMLInputElement>('input[type="checkbox"]')!);
  await click(button(ui.container, 'Continuar')); await type(ui.container, 'ZERAR');
  await click(button(ui.container, 'Zerar definitivamente'));
  assert.deepEqual(calls, [{ disciplineId: 'tjsp_LP', metric: 'questions' }]);
});

test('mudança de perfil remonta o diálogo sem reutilizar confirmações', async t => {
  const ui = await mount(<ResetStudyProgressDialog key="a" profile={profile()} onReset={async () => {}} onClose={() => {}} />); t.after(ui.dispose);
  await acknowledge(ui.container); await type(ui.container, 'ZERAR');
  await ui.render(<ResetStudyProgressDialog key="b" profile={profile('fiscal')} onReset={async () => {}} onClose={() => {}} />);
  assert(button(ui.container, 'Continuar').disabled);
  assert.equal(ui.container.querySelector<HTMLSelectElement>('select')!.value, '');
});

test('a ação fica no cabeçalho do Início e foi removida da tela de Planos', async t => {
  const p = profile(); let opened = 0;
  const ui = await mount(<DashboardHome disciplines={p.disciplines} activityLogs={p.activityLogs} exerciseLogs={p.exerciseLogs} reminders={[]}
    weeklyGoalsHours={p.weeklyHours} weeklyGoalsQuestions={p.weeklyQuestions} weeklyGoalsReviews={p.weeklyReviews}
    activeProfileName={p.name} profilesCount={1} onAddReminder={() => {}} onToggleReminder={() => {}} onDeleteReminder={() => {}}
    onDeleteActivityLog={() => {}} onAddStudySession={() => {}} onCreateProfile={() => {}} onOpenResetStudyProgress={() => { opened++; }} />); t.after(ui.dispose);
  await click(button(ui.container, 'Zerar horas ou questões')); assert.equal(opened, 1);
  assert(button(ui.container, 'Adicionar Estudo').parentElement!.contains(button(ui.container, 'Zerar horas ou questões')));
  await ui.render(<PlanosManager profiles={[p]} activeProfileId={p.id} onSwitchProfile={() => {}} onCreateProfile={() => {}} onDeleteProfile={() => {}} onUpdateProfileName={() => {}} />);
  assert(!ui.container.textContent!.includes('Zerar horas'));
});
