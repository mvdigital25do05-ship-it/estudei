/**
 * Ensures writes for the same Firestore document run in their intended order.
 * Independent document paths do not block one another.
 * Failure never permanently poisons the queue: subsequent writes may retry.
 */
export function createSequentialWriter() {
  const tail = new Map<string, Promise<void>>();
  return {
    enqueue(key: string, write: () => Promise<void>): Promise<void> {
      if (!key) throw new Error('Caminho de salvamento vazio.');
      const previous = tail.get(key) ?? Promise.resolve();
      const current = previous.catch(() => undefined).then(write);
      tail.set(key, current);
      void current.finally(() => {
        if (tail.get(key) === current) tail.delete(key);
      }).catch(() => undefined);
      return current;
    },
    whenIdle(key: string): Promise<void> {
      return tail.get(key) ?? Promise.resolve();
    },
  };
}
