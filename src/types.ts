export interface QueueItem {
  id: string;
  text: string;
  createdAt: number;
}

export interface NotebookQueueState {
  pending: QueueItem[];
  activePrompt: QueueItem | null;
  updatedAt: number;
}

export interface QueueUiHandlers {
  onAddPromptText: (text: string) => void | Promise<void>;
  onToggleModal: () => void;
  onOpenModalForAdd: () => void;
  onCloseModal: () => void;
  onUpdatePrompt: (promptId: string, nextText: string) => void | Promise<void>;
  onRemovePrompt: (promptId: string) => void | Promise<void>;
}

export interface UiRenderOptions {
  modalOpen: boolean;
  notebookId: string | null;
}