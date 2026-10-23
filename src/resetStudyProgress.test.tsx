import React, { act } from 'react';
import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { CargoPlan } from './types';
import { buildStudyResetPatch } from './resetStudyProgress';
import ResetStudyProgressDialog from './components/ResetStudyProgressDialog';
import PlanosManager from './components/PlanosManager';

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

test('zera todos os contadores e históricos, preserva tópicos concluídos e metas sem mutar a origem', () => {
  const original = profile();
  const snapshot = structuredClone(original);
  const reset = buildStudyResetPatch(original);
  assert.deepEqual(original, snapshot);
  assert.deepEqual(reset.disciplines[0], { ...original.disciplines[0], timeSpentMin: 0, correctAnswers: 0, wrongAnswers: 0 });
  assert.deepEqual(reset.disciplines[0].topics, original.disciplines[0].topics);
  assert.deepEqual([reset.activityLogs, reset.exerciseLogs, reset.mockTests], [[], [], []]);
  assert.deepEqual([reset.weeklyHours, reset.weeklyQuestions, reset.weeklyReviews], [{ done: 0, total: 24 }, { done: 0, total: 300 }, { done: 0, total: 5 }]);
  assert.deepEqual(Object.keys(reset).sort(), ['disciplines', 'activityLogs', 'exerciseLogs', 'mockTests', 'weeklyHours', 'weeklyQuestions', 'weeklyReviews'].sort());
});

test('patch aplicado a um perfil preserva os demais, planejamento e informações do concurso', () => {
  const original = profile();
  const other = profile('fiscal');
  const patch = buildStudyResetPatch(original);
  const next = [original, other].map(p => p.id === original.id ? { ...p, ...patch } : p);
  assert.strictEqual(next[1], other);
  for (const key of ['id', 'name', 'examName', 'examDate', 'createdAt', 'studyBlocks'] as const) assert.deepEqual(next[0][key], original[key]);
  assert.deepEqual(buildStudyResetPatch(next[0]), patch);
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

test('Planos só oferece o reset do perfil ativo; trocar de perfil invalida a confirmação aberta', async t => {
  const profiles = [profile(), profile('fiscal')]; const calls: string[] = [];
  const props = { profiles, onSwitchProfile: () => {}, onCreateProfile: () => {}, onDeleteProfile: () => {}, onUpdateProfileName: () => {}, onResetStudyProgress: async (id: string) => { calls.push(id); } };
  const ui = await mount(<PlanosManager {...props} activeProfileId="escrevente" />); t.after(ui.dispose);
  assert.equal([...ui.container.querySelectorAll('button')].filter(b => b.textContent === 'Zerar horas e questões').length, 1);
  await click(button(ui.container, 'Zerar horas e questões'));
  assert.match(ui.container.querySelector('dialog')!.textContent!, /Escrevente TJSP/);
  await acknowledge(ui.container); await type(ui.container, 'ZERAR');
  await ui.render(<PlanosManager {...props} activeProfileId="fiscal" />);
  assert.equal(ui.container.querySelector('dialog'), null);
  await ui.render(<PlanosManager {...props} activeProfileId="escrevente" />);
  assert.equal(ui.container.querySelector('dialog'), null); assert.deepEqual(calls, []);
  await click(button(ui.container, 'Zerar horas e questões'));
  assert(button(ui.container, 'Continuar').disabled);
});
