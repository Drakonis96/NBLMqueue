import {
  ChromeStorageArea,
  NotebookQueueStore,
  activateNextPrompt,
  clearActivePrompt,
  createEmptyQueueState,
  createQueueItem,
  enqueuePrompt,
  removePendingPrompt,
  updatePendingPrompt
} from './queue-store';
import {
  NotebookLmUi,
  clickNativeButton,
  extractNotebookId,
  getNotebookSnapshot,
  isGenerationInProgress,
  isReadyForQueue,
  readPromptValue,
  setPromptValue
} from './notebooklm-dom';
import type { NotebookQueueState } from './types';

const DEFAULT_AUTO_START_DELAY_MS = 1000;
const EXTENSION_UI_SELECTOR = '#nblmq-controls, #nblmq-modal';

interface QueueControllerOptions {
  document?: Document;
  window?: Window & typeof globalThis;
  store?: NotebookQueueStore;
  autoStartDelayMs?: number;
}

export class QueueController {
  private readonly doc: Document;
  private readonly win: Window & typeof globalThis;
  private readonly store: NotebookQueueStore;
  private readonly ui: NotebookLmUi;
  private readonly autoStartDelayMs: number;

  private state: NotebookQueueState = createEmptyQueueState();
  private currentNotebookId: string | null = null;
  private modalOpen = false;
  private observer: MutationObserver | null = null;
  private started = false;
  private syncInProgress = false;
  private syncRequested = false;
  private syncFrameId: number | null = null;
  private autoStartTimer: number | null = null;
  private nextAutoStartAt = 0;
  private dispatchInFlight = false;

  constructor(options: QueueControllerOptions = {}) {
    this.doc = options.document ?? document;
    this.win = options.window ?? window;
    this.store = options.store ?? new NotebookQueueStore(new ChromeStorageArea());
    this.autoStartDelayMs = options.autoStartDelayMs ?? DEFAULT_AUTO_START_DELAY_MS;
    this.ui = new NotebookLmUi(this.doc, {
      onAddPromptText: (text) => this.handleAddPromptText(text),
      onToggleModal: () => this.toggleModal(),
      onOpenModalForAdd: () => this.openModalForAdd(),
      onCloseModal: () => this.closeModal(),
      onUpdatePrompt: (promptId, nextText) => this.handleUpdatePrompt(promptId, nextText),
      onRemovePrompt: (promptId) => this.handleRemovePrompt(promptId)
    });
  }

  async start(): Promise<void> {
    if (this.started) {
      return;
    }

    this.started = true;
    await this.sync();

    this.observer = new MutationObserver((mutations) => {
      if (!this.shouldSyncForMutations(mutations)) {
        return;
      }

      this.scheduleSync();
    });

    if (this.doc.body) {
      this.observer.observe(this.doc.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['disabled', 'class', 'aria-label']
      });
    }
  }

  stop(): void {
    this.started = false;
    this.observer?.disconnect();
    this.observer = null;
    if (this.syncFrameId !== null) {
      this.win.clearTimeout(this.syncFrameId);
      this.syncFrameId = null;
    }
    this.syncRequested = false;
    this.clearAutoStartTimer();
    this.ui.destroy();
  }

  private shouldSyncForMutations(mutations: MutationRecord[]): boolean {
    return mutations.some((mutation) => !this.isExtensionMutation(mutation));
  }

  private isExtensionMutation(mutation: MutationRecord): boolean {
    if (this.isWithinExtensionUi(mutation.target)) {
      return true;
    }

    if (mutation.type === 'childList') {
      const addedInsideExtension = Array.from(mutation.addedNodes).every((node) => this.isWithinExtensionUi(node));
      const removedInsideExtension = Array.from(mutation.removedNodes).every((node) => this.isWithinExtensionUi(node));
      return addedInsideExtension && removedInsideExtension;
    }

    return false;
  }

  private isWithinExtensionUi(node: Node | null): boolean {
    if (!node || node.nodeType !== 1) {
      return false;
    }

    return Boolean((node as Element).closest(EXTENSION_UI_SELECTOR));
  }

  private scheduleSync(): void {
    if (!this.started) {
      return;
    }

    if (this.syncInProgress) {
      this.syncRequested = true;
      return;
    }

    if (this.syncFrameId !== null) {
      return;
    }

    this.syncFrameId = this.win.setTimeout(() => {
      this.syncFrameId = null;
      void this.runSync();
    }, 0);
  }

  private async runSync(): Promise<void> {
    if (!this.started) {
      return;
    }

    if (this.syncInProgress) {
      this.syncRequested = true;
      return;
    }

    this.syncInProgress = true;
    try {
      this.syncRequested = false;
      await this.sync();
    } finally {
      this.syncInProgress = false;
      if (this.syncRequested) {
        this.syncRequested = false;
        this.scheduleSync();
      }
    }
  }

  private async sync(): Promise<void> {
    await this.ensureNotebookState();

    const snapshot = getNotebookSnapshot(this.doc);
    this.ui.render(snapshot, this.state, {
      modalOpen: this.modalOpen,
      notebookId: this.currentNotebookId
    });

    if (!this.currentNotebookId) {
      this.clearAutoStartTimer();
      return;
    }

    if (this.state.activePrompt && isReadyForQueue(snapshot)) {
      this.state = clearActivePrompt(this.state);
      await this.persistState();
      this.ui.render(getNotebookSnapshot(this.doc), this.state, {
        modalOpen: this.modalOpen,
        notebookId: this.currentNotebookId
      });

      if (this.state.pending.length > 0) {
        await this.dispatchNextPrompt(true);
        return;
      }
    }

    if (this.dispatchInFlight) {
      return;
    }

    if (this.state.pending.length === 0 || isGenerationInProgress(snapshot) || this.modalOpen) {
      this.clearAutoStartTimer();
      return;
    }

    if (!isReadyForQueue(snapshot) || readPromptValue(snapshot).length > 0) {
      this.clearAutoStartTimer();
      return;
    }

    this.scheduleAutoStart();
  }

  private async ensureNotebookState(): Promise<void> {
    const nextNotebookId = extractNotebookId(this.win.location.pathname);
    if (nextNotebookId === this.currentNotebookId) {
      return;
    }

    this.currentNotebookId = nextNotebookId;
    this.modalOpen = false;
    this.clearAutoStartTimer();
    this.state = nextNotebookId ? await this.store.load(nextNotebookId) : createEmptyQueueState();
  }

  private scheduleAutoStart(): void {
    if (this.state.pending.length === 0 || this.modalOpen) {
      return;
    }

    this.clearAutoStartTimer();
    this.nextAutoStartAt = Date.now() + this.autoStartDelayMs;
    this.autoStartTimer = this.win.setTimeout(() => {
      this.autoStartTimer = null;
      this.nextAutoStartAt = 0;
      void this.dispatchNextPrompt();
    }, this.autoStartDelayMs);
  }

  private clearAutoStartTimer(): void {
    if (this.autoStartTimer === null) {
      return;
    }

    this.win.clearTimeout(this.autoStartTimer);
    this.autoStartTimer = null;
    this.nextAutoStartAt = 0;
  }

  private async dispatchNextPrompt(forceImmediate = false): Promise<void> {
    if (this.dispatchInFlight || !this.currentNotebookId || this.state.pending.length === 0) {
      return;
    }

    if (!forceImmediate && this.nextAutoStartAt > Date.now()) {
      return;
    }

    const snapshot = getNotebookSnapshot(this.doc);
    if (!snapshot.textarea || !isReadyForQueue(snapshot) || readPromptValue(snapshot).length > 0) {
      return;
    }

    this.clearAutoStartTimer();
    this.dispatchInFlight = true;

    try {
      const nextPrompt = this.state.pending[0];
      setPromptValue(snapshot.textarea, nextPrompt.text);

      const sendButton = await this.waitForEnabledSendButton();
      if (!sendButton) {
        return;
      }

      clickNativeButton(sendButton);
      this.state = activateNextPrompt(this.state);
      await this.persistState();
    } finally {
      this.dispatchInFlight = false;
      this.ui.render(getNotebookSnapshot(this.doc), this.state, {
        modalOpen: this.modalOpen,
        notebookId: this.currentNotebookId
      });
    }
  }

  private openModalForAdd(): void {
    if (!this.currentNotebookId) {
      return;
    }

    if (!this.modalOpen) {
      this.modalOpen = true;
      this.clearAutoStartTimer();
      this.ui.render(getNotebookSnapshot(this.doc), this.state, {
        modalOpen: this.modalOpen,
        notebookId: this.currentNotebookId
      });
    }
  }

  private async handleAddPromptText(text: string): Promise<void> {
    if (!this.currentNotebookId) {
      return;
    }

    const item = createQueueItem(text);
    if (!item.text) {
      return;
    }

    this.state = enqueuePrompt(this.state, item);
    await this.persistState();
    this.ui.render(getNotebookSnapshot(this.doc), this.state, {
      modalOpen: this.modalOpen,
      notebookId: this.currentNotebookId
    });
  }

  private toggleModal(): void {
    this.modalOpen = !this.modalOpen;
    if (this.modalOpen) {
      this.clearAutoStartTimer();
    }

    this.ui.render(getNotebookSnapshot(this.doc), this.state, {
      modalOpen: this.modalOpen,
      notebookId: this.currentNotebookId
    });

    if (!this.modalOpen) {
      this.scheduleSync();
    }
  }

  private closeModal(): void {
    if (!this.modalOpen) {
      return;
    }

    this.modalOpen = false;
    this.ui.render(getNotebookSnapshot(this.doc), this.state, {
      modalOpen: false,
      notebookId: this.currentNotebookId
    });
    this.scheduleSync();
  }

  private async handleUpdatePrompt(promptId: string, nextText: string): Promise<void> {
    if (!this.currentNotebookId) {
      return;
    }

    this.state = updatePendingPrompt(this.state, promptId, nextText);
    await this.persistState();
    this.ui.render(getNotebookSnapshot(this.doc), this.state, {
      modalOpen: this.modalOpen,
      notebookId: this.currentNotebookId
    });
  }

  private async handleRemovePrompt(promptId: string): Promise<void> {
    if (!this.currentNotebookId) {
      return;
    }

    this.state = removePendingPrompt(this.state, promptId);
    await this.persistState();
    this.scheduleSync();
  }

  private async persistState(): Promise<void> {
    if (!this.currentNotebookId) {
      return;
    }

    await this.store.save(this.currentNotebookId, this.state);
  }

  private waitForEnabledSendButton(): Promise<HTMLButtonElement | null> {
    const lookup = (): HTMLButtonElement | null => {
      const snapshot = getNotebookSnapshot(this.doc);
      if (!snapshot.sendButton || snapshot.sendButton.disabled) {
        return null;
      }

      return snapshot.sendButton;
    };

    const immediate = lookup();
    if (immediate) {
      return Promise.resolve(immediate);
    }

    return new Promise((resolve) => {
      const observer = new MutationObserver(() => {
        const candidate = lookup();
        if (candidate) {
          cleanup();
          resolve(candidate);
        }
      });

      const timeoutId = this.win.setTimeout(() => {
        cleanup();
        resolve(null);
      }, 3000);

      const cleanup = (): void => {
        observer.disconnect();
        this.win.clearTimeout(timeoutId);
      };

      observer.observe(this.doc.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['disabled', 'class', 'aria-label']
      });
    });
  }
}