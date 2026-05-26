import { describe, expect, it, vi } from 'vitest';

import {
  NotebookLmUi,
  getNotebookSnapshot,
  isGenerationInProgress,
  isReadyForQueue,
  readPromptValue,
  setPromptValue
} from '../src/notebooklm-dom';
import { createEmptyQueueState, createQueueItem, enqueuePrompt } from '../src/queue-store';
import { createNotebookDom } from './test-helpers';

describe('notebooklm-dom', () => {
  it('detects native ready and generating states', () => {
    const harness = createNotebookDom();
    const readySnapshot = getNotebookSnapshot(document);

    expect(isReadyForQueue(readySnapshot)).toBe(true);
    expect(isGenerationInProgress(readySnapshot)).toBe(false);

    setPromptValue(harness.textarea, 'Queued prompt');
    expect(readPromptValue(getNotebookSnapshot(document))).toBe('Queued prompt');

    harness.setGenerating();
    const generatingSnapshot = getNotebookSnapshot(document);

    expect(isReadyForQueue(generatingSnapshot)).toBe(false);
    expect(isGenerationInProgress(generatingSnapshot)).toBe(true);
    expect(generatingSnapshot.stopButton?.getAttribute('aria-label')).toBe('Stop generating');
  });

  it('keeps the queue controls visible and ordered while NotebookLM is generating', () => {
    const harness = createNotebookDom();
    const handlers = {
      onAddPromptText: vi.fn(),
      onToggleModal: vi.fn(),
      onOpenModalForAdd: vi.fn(),
      onCloseModal: vi.fn(),
      onUpdatePrompt: vi.fn(),
      onRemovePrompt: vi.fn()
    };

    const ui = new NotebookLmUi(document, handlers);
    harness.setGenerating();

    ui.render(getNotebookSnapshot(document), createEmptyQueueState(), {
      modalOpen: false,
      notebookId: 'test-notebook'
    });

    const snapshot = getNotebookSnapshot(document);
    const controlsHost = snapshot.controlsHost;
    const controls = document.getElementById('nblmq-controls');

    // The native textarea stays disabled by NotebookLM while generating; we
    // deliberately do not fight the framework over it. Users add prompts via
    // the quick-add form inside our modal instead.
    expect(snapshot.textarea?.disabled).toBe(true);
    expect(snapshot.textarea?.classList.contains('nblmq-textarea-unlocked')).toBe(false);
    expect(controlsHost?.classList.contains('nblmq-controls-host')).toBe(true);
    expect(controlsHost?.children.item(1)).toBe(controls);
    expect(controlsHost?.querySelector('button.stop-button')?.getAttribute('aria-label')).toBe('Stop generating');
  });

  it('renders the injected buttons and modal queue controls in English', () => {
    createNotebookDom();
    const handlers = {
      onAddPromptText: vi.fn(),
      onToggleModal: vi.fn(),
      onOpenModalForAdd: vi.fn(),
      onCloseModal: vi.fn(),
      onUpdatePrompt: vi.fn(),
      onRemovePrompt: vi.fn()
    };

    const ui = new NotebookLmUi(document, handlers);
    const state = enqueuePrompt(createEmptyQueueState(), createQueueItem('Pending prompt', 1));

    ui.render(getNotebookSnapshot(document), state, {
      modalOpen: false,
      notebookId: 'test-notebook'
    });

    const queueButton = document.querySelector<HTMLButtonElement>('[data-role="queue-view"]');
    const addButton = document.querySelector<HTMLButtonElement>('[data-role="queue-add"]');
    const modalTitle = document.querySelector<HTMLElement>('.nblmq-modal-title');
    expect(queueButton).not.toBeNull();
    expect(addButton).not.toBeNull();
    expect(queueButton?.getAttribute('aria-label')).toBe('Open prompt queue');
    expect(addButton?.getAttribute('aria-label')).toBe('Add prompt to queue');

    queueButton?.click();
    expect(handlers.onToggleModal).toHaveBeenCalledTimes(1);

    ui.render(getNotebookSnapshot(document), state, {
      modalOpen: true,
      notebookId: 'test-notebook'
    });

    const modal = document.getElementById('nblmq-modal');
    const modalTextarea = document.querySelector<HTMLTextAreaElement>('[data-role="queue-text"]');
    const deleteButton = document.querySelector<HTMLButtonElement>('[data-action="remove"]');
    const closeButton = document.querySelector<HTMLButtonElement>('[data-action="close"]');

    expect(modal?.hidden).toBe(false);
    expect(modal?.querySelector('.nblmq-modal')?.getAttribute('aria-label')).toBe('Prompt queue');
    expect(modalTitle?.textContent).toBe('Prompt Queue');
    expect(modalTextarea?.value).toBe('Pending prompt');
    expect(deleteButton?.textContent).toBe('Remove');
    expect(closeButton?.getAttribute('aria-label')).toBe('Close queue');

    if (!modalTextarea || !deleteButton || !closeButton) {
      throw new Error('Modal controls were not rendered');
    }

    modalTextarea.value = 'Edited prompt';
    modalTextarea.dispatchEvent(new Event('change', { bubbles: true }));
    expect(handlers.onUpdatePrompt).toHaveBeenCalledWith(state.pending[0]?.id, 'Edited prompt');

    deleteButton.click();
    expect(handlers.onRemovePrompt).toHaveBeenCalledWith(state.pending[0]?.id);

    closeButton.click();
    expect(handlers.onCloseModal).toHaveBeenCalledTimes(1);
  });
});