import { describe, expect, it } from 'vitest';

import {
  InMemoryStorageArea,
  NotebookQueueStore,
  activateNextPrompt,
  clearActivePrompt,
  createEmptyQueueState,
  createQueueItem,
  enqueuePrompt,
  removePendingPrompt,
  updatePendingPrompt
} from '../src/queue-store';

describe('queue-store helpers', () => {
  it('adds prompts to the pending queue', () => {
    const state = createEmptyQueueState();
    const nextState = enqueuePrompt(state, createQueueItem('First prompt', 1));

    expect(nextState.pending).toHaveLength(1);
    expect(nextState.pending[0]?.text).toBe('First prompt');
    expect(nextState.activePrompt).toBeNull();
  });

  it('updates and removes pending prompts', () => {
    const itemA = createQueueItem('First prompt', 1);
    const itemB = createQueueItem('Second prompt', 2);
    const state = {
      ...createEmptyQueueState(),
      pending: [itemA, itemB]
    };

    const updated = updatePendingPrompt(state, itemA.id, 'First prompt edited');
    expect(updated.pending[0]?.text).toBe('First prompt edited');

    const removed = removePendingPrompt(updated, itemB.id);
    expect(removed.pending).toHaveLength(1);
    expect(removed.pending[0]?.id).toBe(itemA.id);
  });

  it('moves sent prompts out of the pending list', () => {
    const itemA = createQueueItem('First prompt', 1);
    const itemB = createQueueItem('Second prompt', 2);
    const state = {
      ...createEmptyQueueState(),
      pending: [itemA, itemB]
    };

    const active = activateNextPrompt(state);
    expect(active.activePrompt?.id).toBe(itemA.id);
    expect(active.pending).toHaveLength(1);
    expect(active.pending[0]?.id).toBe(itemB.id);

    const cleared = clearActivePrompt(active);
    expect(cleared.activePrompt).toBeNull();
  });

  it('persists queue state per notebook', async () => {
    const storage = new InMemoryStorageArea();
    const store = new NotebookQueueStore(storage);
    const state = enqueuePrompt(createEmptyQueueState(), createQueueItem('Persist me', 10));

    await store.save('notebook-a', state);
    const loaded = await store.load('notebook-a');

    expect(loaded.pending).toHaveLength(1);
    expect(loaded.pending[0]?.text).toBe('Persist me');
  });
});