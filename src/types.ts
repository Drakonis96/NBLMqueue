export interface QueueItem {
  id: string;
  text: string;
  createdAt: number;
}

export const QUEUE_COMPLETE_NOTIFICATION_MESSAGE = 'nblmqueue/show-queue-complete-notification';

export interface QueueCompleteNotificationMessage {
  type: typeof QUEUE_COMPLETE_NOTIFICATION_MESSAGE;
  notebookId: string;
}

export interface QueueCompleteNotificationResponse {
  ok: boolean;
  notificationId?: string;
  permissionLevel?: string;
  error?: string;
}

export const isQueueCompleteNotificationMessage = (
  value: unknown
): value is QueueCompleteNotificationMessage => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<QueueCompleteNotificationMessage>;
  return (
    candidate.type === QUEUE_COMPLETE_NOTIFICATION_MESSAGE &&
    typeof candidate.notebookId === 'string' &&
    candidate.notebookId.length > 0
  );
};

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