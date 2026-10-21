import test from 'node:test';
import assert from 'node:assert/strict';
import { createSequentialWriter } from '../src/sequentialWriter';

test('two writes to the same document complete in call order', async () => {
  const writer = createSequentialWriter();
  const order: string[] = [];
  let release!: () => void;
  let notifyStarted!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const started = new Promise<void>(resolve => { notifyStarted = resolve; });

  const one = writer.enqueue('profile/1', async () => {
    order.push('one start');
    notifyStarted();
    await gate;
    order.push('one done');
  });
  const two = writer.enqueue('profile/1', async () => {
    order.push('two start');
    order.push('two done');
  });

  await started;
  assert.deepEqual(order, ['one start']);
  release();
  await Promise.all([one, two]);
  assert.deepEqual(order, ['one start','one done','two start','two done']);
});

test('failed write does not permanently block the next write', async () => {
  const writer = createSequentialWriter();
  const fail = writer.enqueue('same', async () => { throw new Error('offline'); });
  const succeed = writer.enqueue('same', async () => {});
  await assert.rejects(fail, /offline/);
  await succeed;
  await writer.whenIdle('same');
});

test('independent documents do not block each other', async () => {
  const writer = createSequentialWriter();
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const first = writer.enqueue('one', async () => { await gate; });
  let ran = false;
  const second = writer.enqueue('two', async () => { ran = true; });
  await second;
  assert.equal(ran, true);
  release();
  await first;
});

test('whenIdle waits for all writes previously scheduled on the key', async () => {
  const writer = createSequentialWriter();
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const one = writer.enqueue('deleted', async () => { await gate; });
  const two = writer.enqueue('deleted', async () => {});
  let drained = false;
  const waiting = writer.whenIdle('deleted').then(() => { drained = true; });
  await Promise.resolve();
  assert.equal(drained, false);
  release();
  await Promise.all([one,two,waiting]);
  assert.equal(drained, true);
});
