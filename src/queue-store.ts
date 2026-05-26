import type { NotebookQueueState, QueueItem } from './types';

export interface ExtensionStorageArea {
  get(key: string): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
}

const cloneValue = <T>(value: T): T => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
};

const createId = (): string => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `nblmq_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
};

const sanitizePrompt = (text: string): string => text.replace(/\r\n/g, '\n').trim();

const stamp = (state: Omit<NotebookQueueState, 'updatedAt'>): NotebookQueueState => ({
  ...state,
  updatedAt: Date.now()
});

export const createEmptyQueueState = (): NotebookQueueState => ({
  pending: [],
  activePrompt: null,
  updatedAt: Date.now()
});

export const createQueueItem = (text: string, createdAt = Date.now()): QueueItem => ({
  id: createId(),
  text: sanitizePrompt(text),
  createdAt
});

export const enqueuePrompt = (state: NotebookQueueState, item: QueueItem): NotebookQueueState => {
  if (!item.text) {
    return state;
  }

  return stamp({
    ...state,
    pending: [...state.pending, item]
  });
};

export const updatePendingPrompt = (
  state: NotebookQueueState,
  promptId: string,
  nextText: string
): NotebookQueueState => {
  const sanitized = sanitizePrompt(nextText);
  if (!sanitized) {
    return state;
  }

  let changed = false;
  const pending = state.pending.map((item) => {
    if (item.id !== promptId || item.text === sanitized) {
      return item;
    }

    changed = true;
    return {
      ...item,
      text: sanitized
    };
  });

  return changed ? stamp({ ...state, pending }) : state;
};

export const removePendingPrompt = (state: NotebookQueueState, promptId: string): NotebookQueueState => {
  const pending = state.pending.filter((item) => item.id !== promptId);
  return pending.length === state.pending.length ? state : stamp({ ...state, pending });
};

export const activateNextPrompt = (state: NotebookQueueState): NotebookQueueState => {
  const [nextPrompt, ...remaining] = state.pending;
  if (!nextPrompt) {
    return state;
  }

  return stamp({
    pending: remaining,
    activePrompt: nextPrompt
  });
};

export const clearActivePrompt = (state: NotebookQueueState): NotebookQueueState => {
  if (!state.activePrompt) {
    return state;
  }

  return stamp({
    ...state,
    activePrompt: null
  });
};

const isQueueItem = (value: unknown): value is QueueItem => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<QueueItem>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.text === 'string' &&
    typeof candidate.createdAt === 'number'
  );
};

export const normalizeQueueState = (value: unknown): NotebookQueueState => {
  if (typeof value !== 'object' || value === null) {
    return createEmptyQueueState();
  }

  const candidate = value as Partial<NotebookQueueState>;
  const pending = Array.isArray(candidate.pending) ? candidate.pending.filter(isQueueItem) : [];
  const activePrompt = isQueueItem(candidate.activePrompt) ? candidate.activePrompt : null;

  return {
    pending,
    activePrompt,
    updatedAt: typeof candidate.updatedAt === 'number' ? candidate.updatedAt : Date.now()
  };
};

export class ChromeStorageArea implements ExtensionStorageArea {
  async get(key: string): Promise<Record<string, unknown>> {
    return chrome.storage.local.get(key) as Promise<Record<string, unknown>>;
  }

  async set(items: Record<string, unknown>): Promise<void> {
    await chrome.storage.local.set(items);
  }
}

export class InMemoryStorageArea implements ExtensionStorageArea {
  private readonly data = new Map<string, unknown>();

  async get(key: string): Promise<Record<string, unknown>> {
    return { [key]: cloneValue(this.data.get(key)) };
  }

  async set(items: Record<string, unknown>): Promise<void> {
    for (const [key, value] of Object.entries(items)) {
      this.data.set(key, cloneValue(value));
    }
  }
}

export class NotebookQueueStore {
  constructor(
    private readonly storage: ExtensionStorageArea,
    private readonly prefix = 'nblmqueue'
  ) {}

  private getStorageKey(notebookId: string): string {
    return `${this.prefix}:${notebookId}`;
  }

  async load(notebookId: string): Promise<NotebookQueueState> {
    const storageKey = this.getStorageKey(notebookId);
    const result = await this.storage.get(storageKey);
    return normalizeQueueState(result[storageKey]);
  }

  async save(notebookId: string, state: NotebookQueueState): Promise<void> {
    const storageKey = this.getStorageKey(notebookId);
    await this.storage.set({
      [storageKey]: state
    });
  }
}