import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { QueueController } from '../src/queue-controller';
import { InMemoryStorageArea, NotebookQueueStore, createQueueItem } from '../src/queue-store';
import { QUEUE_COMPLETE_NOTIFICATION_MESSAGE } from '../src/types';
import { createNotebookDom, flushPromises } from './test-helpers';

const enqueueViaModal = async (text: string): Promise<void> => {
  const input = document.querySelector<HTMLTextAreaElement>('[data-role="quickadd-input"]');
  const form = document.querySelector<HTMLFormElement>('[data-role="quickadd-form"]');
  if (!input || !form) {
    throw new Error('Quick-add form was not rendered');
  }
  input.value = text;
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  await flushPromises();
};

describe('QueueController', () => {
  let sendMessageSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    window.history.pushState({}, '', '/notebook/test-notebook');
    sendMessageSpy = vi.fn((message: unknown, callback?: () => void) => {
      callback?.();
      return message;
    });
    vi.stubGlobal('chrome', {
      runtime: {
        sendMessage: sendMessageSpy,
        lastError: undefined
      }
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('adds prompts via the modal quick-add and sends them automatically in order', async () => {
    const harness = createNotebookDom();
    const store = new NotebookQueueStore(new InMemoryStorageArea());
    const controller = new QueueController({
      document,
      window,
      store,
      autoStartDelayMs: 1000
    });

    await controller.start();

    const addButton = document.querySelector<HTMLButtonElement>('[data-role="queue-add"]');
    if (!addButton) {
      throw new Error('Queue add button was not rendered');
    }

    addButton.click();
    await flushPromises();

    await enqueueViaModal('Prompt one');
    await enqueueViaModal('Prompt two');

    await vi.waitFor(async () => {
      const state = await store.load('test-notebook');
      expect(state.pending.map((item) => item.text)).toEqual(['Prompt one', 'Prompt two']);
      expect(harness.submissions).toEqual([]);
    });

    const closeButton = document.querySelector<HTMLButtonElement>('[data-action="close"]');
    closeButton?.click();
    await flushPromises();

    await vi.advanceTimersByTimeAsync(1100);
    await flushPromises();

    await vi.waitFor(async () => {
      const state = await store.load('test-notebook');
      expect(harness.submissions).toEqual(['Prompt one']);
      expect(state.pending.map((item) => item.text)).toEqual(['Prompt two']);
      expect(state.activePrompt?.text).toBe('Prompt one');
    });

    harness.setReady();
    await vi.advanceTimersByTimeAsync(1100);
    await flushPromises();

    await vi.waitFor(async () => {
      const state = await store.load('test-notebook');
      expect(harness.submissions).toEqual(['Prompt one', 'Prompt two']);
      expect(state.pending).toHaveLength(0);
      expect(state.activePrompt?.text).toBe('Prompt two');
    });

    expect(sendMessageSpy).not.toHaveBeenCalled();

    harness.setReady();
    await vi.advanceTimersByTimeAsync(100);
    await flushPromises();

    await vi.waitFor(async () => {
      const state = await store.load('test-notebook');
      expect(state.activePrompt).toBeNull();
    });

    expect(sendMessageSpy).toHaveBeenCalledTimes(1);
    expect(sendMessageSpy).toHaveBeenCalledWith(
      {
        type: QUEUE_COMPLETE_NOTIFICATION_MESSAGE,
        notebookId: 'test-notebook'
      },
      expect.any(Function)
    );

    controller.stop();
  });

  it('notifies when a manual NotebookLM response finishes and no queued prompts remain', async () => {
    const harness = createNotebookDom();
    const store = new NotebookQueueStore(new InMemoryStorageArea());
    const controller = new QueueController({
      document,
      window,
      store,
      autoStartDelayMs: 1000
    });

    await controller.start();

    harness.textarea.value = 'Manual prompt';
    harness.textarea.dispatchEvent(new Event('input', { bubbles: true }));

    const sendButton = harness.getSendButton();
    if (!sendButton) {
      throw new Error('Send button was not rendered');
    }

    sendButton.click();
    await vi.advanceTimersByTimeAsync(0);
    await flushPromises();

    expect(sendMessageSpy).not.toHaveBeenCalled();

    harness.setReady();
    await vi.advanceTimersByTimeAsync(100);
    await flushPromises();

    await vi.waitFor(() => {
      expect(sendMessageSpy).toHaveBeenCalledTimes(1);
    });

    expect(sendMessageSpy).toHaveBeenCalledWith(
      {
        type: QUEUE_COMPLETE_NOTIFICATION_MESSAGE,
        notebookId: 'test-notebook'
      },
      expect.any(Function)
    );

    controller.stop();
  });

  it('notifies when the last queued prompt completes even if the generating transition was missed', async () => {
    createNotebookDom();
    const store = new NotebookQueueStore(new InMemoryStorageArea());

    await store.save('test-notebook', {
      pending: [],
      activePrompt: createQueueItem('Final queued prompt', 1),
      updatedAt: 1
    });

    const controller = new QueueController({
      document,
      window,
      store,
      autoStartDelayMs: 1000
    });

    await controller.start();

    await vi.waitFor(() => {
      expect(sendMessageSpy).toHaveBeenCalledTimes(1);
    });

    expect(sendMessageSpy).toHaveBeenCalledWith(
      {
        type: QUEUE_COMPLETE_NOTIFICATION_MESSAGE,
        notebookId: 'test-notebook'
      },
      expect.any(Function)
    );

    await vi.waitFor(async () => {
      const state = await store.load('test-notebook');
      expect(state.activePrompt).toBeNull();
    });

    controller.stop();
  });

  it('lets you queue prompts via the modal quick-add while NotebookLM is generating', async () => {
    const harness = createNotebookDom();
    const store = new NotebookQueueStore(new InMemoryStorageArea());
    const controller = new QueueController({
      document,
      window,
      store,
      autoStartDelayMs: 1000
    });

    await controller.start();

    const queueButton = document.querySelector<HTMLButtonElement>('[data-role="queue-view"]');
    if (!queueButton) {
      throw new Error('Queue toggle button was not rendered');
    }

    harness.setGenerating();
    await vi.advanceTimersByTimeAsync(50);
    await flushPromises();

    expect(harness.textarea.disabled).toBe(true);

    queueButton.click();
    await flushPromises();

    const quickAddInput = document.querySelector<HTMLTextAreaElement>('[data-role="quickadd-input"]');
    const quickAddForm = document.querySelector<HTMLFormElement>('[data-role="quickadd-form"]');
    if (!quickAddInput || !quickAddForm) {
      throw new Error('Quick-add form was not rendered');
    }

    quickAddInput.value = 'Queued while NotebookLM is busy';
    quickAddForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await flushPromises();

    await vi.waitFor(async () => {
      const state = await store.load('test-notebook');
      expect(state.pending.map((item) => item.text)).toEqual(['Queued while NotebookLM is busy']);
      expect(quickAddInput.value).toBe('');
    });

    controller.stop();
  });

  it('opens and closes the queue modal, and edits or deletes pending prompts', async () => {
    createNotebookDom();
    const store = new NotebookQueueStore(new InMemoryStorageArea());
    const controller = new QueueController({
      document,
      window,
      store,
      autoStartDelayMs: 1000
    });

    await controller.start();

    const addButton = document.querySelector<HTMLButtonElement>('[data-role="queue-add"]');
    const queueButton = document.querySelector<HTMLButtonElement>('[data-role="queue-view"]');
    if (!addButton || !queueButton) {
      throw new Error('Queue controls were not rendered');
    }

    addButton.click();
    await flushPromises();

    await enqueueViaModal('Prompt to edit');
    await enqueueViaModal('Prompt to delete');

    await vi.waitFor(async () => {
      const state = await store.load('test-notebook');
      expect(state.pending).toHaveLength(2);
    });

    const modal = document.getElementById('nblmq-modal');
    const promptEditors = Array.from(document.querySelectorAll<HTMLTextAreaElement>('[data-role="queue-text"]'));
    const deleteButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-action="remove"]'));
    const closeButton = document.querySelector<HTMLButtonElement>('[data-action="close"]');

    expect(modal?.hidden).toBe(false);
    expect(promptEditors).toHaveLength(2);
    expect(deleteButtons).toHaveLength(2);

    promptEditors[0].value = 'Prompt edited';
    promptEditors[0].dispatchEvent(new Event('change', { bubbles: true }));
    await flushPromises();

    await vi.waitFor(async () => {
      const state = await store.load('test-notebook');
      expect(state.pending[0]?.text).toBe('Prompt edited');
    });

    const refreshedDeleteButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-action="remove"]'));
    refreshedDeleteButtons[1]?.click();
    await flushPromises();

    await vi.waitFor(async () => {
      const state = await store.load('test-notebook');
      expect(state.pending).toHaveLength(1);
      expect(state.pending[0]?.text).toBe('Prompt edited');
    });

    closeButton?.click();
    await flushPromises();
    expect(modal?.hidden).toBe(true);

    controller.stop();
  });
});