import type { NotebookQueueState, QueueUiHandlers, UiRenderOptions } from './types';

const QUERY_TEXTAREA_SELECTOR = [
  'textarea.query-box-input',
  'textarea[aria-label="Query box"]',
  'textarea[aria-label="Cuadro de consulta"]'
].join(', ');
const SEND_BUTTON_SELECTOR = 'button.submit-button';
const STOP_BUTTON_SELECTOR = [
  'button.stop-button',
  'button[aria-label="Stop generating"]',
  'button[aria-label="Detener generación"]'
].join(', ');
const CONTROLS_HOST_SELECTOR = '.bottom-right-container';

const STYLES_ID = 'nblmq-styles';
const CONTROLS_ID = 'nblmq-controls';
const MODAL_ID = 'nblmq-modal';
const CONTROLS_HOST_CLASS = 'nblmq-controls-host';
const UNLOCKED_TEXTAREA_CLASS = 'nblmq-textarea-unlocked';
const UNLOCKED_TEXTAREA_PLACEHOLDER = 'Type the next queued prompt while NotebookLM responds';

export interface NotebookLmSnapshot {
  textarea: HTMLTextAreaElement | null;
  chatForm: HTMLFormElement | null;
  controlsHost: HTMLElement | null;
  sendButton: HTMLButtonElement | null;
  stopButton: HTMLButtonElement | null;
}

export const extractNotebookId = (pathname: string): string | null => {
  const match = pathname.match(/\/notebook\/([^/?#]+)/);
  return match ? match[1] : null;
};

export const getNotebookSnapshot = (doc: Document = document): NotebookLmSnapshot => {
  const textarea = doc.querySelector<HTMLTextAreaElement>(QUERY_TEXTAREA_SELECTOR);
  const chatForm = textarea?.closest('form') ?? null;
  const controlsHost = chatForm?.querySelector<HTMLElement>(CONTROLS_HOST_SELECTOR) ?? null;
  const sendButton = chatForm?.querySelector<HTMLButtonElement>(SEND_BUTTON_SELECTOR) ?? null;
  const stopButton = doc.querySelector<HTMLButtonElement>(STOP_BUTTON_SELECTOR) ?? null;

  return {
    textarea,
    chatForm,
    controlsHost,
    sendButton,
    stopButton
  };
};

export const readPromptValue = (snapshot: NotebookLmSnapshot): string => snapshot.textarea?.value.trim() ?? '';

export const isGenerationInProgress = (snapshot: NotebookLmSnapshot): boolean => {
  return Boolean(snapshot.stopButton) || Boolean(snapshot.textarea?.disabled);
};

export const isReadyForQueue = (snapshot: NotebookLmSnapshot): boolean => {
  const { textarea } = snapshot;
  return textarea ? !textarea.disabled && !snapshot.stopButton : false;
};

export const setPromptValue = (textarea: HTMLTextAreaElement, nextText: string): void => {
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
  if (valueSetter) {
    valueSetter.call(textarea, nextText);
  } else {
    textarea.value = nextText;
  }

  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  textarea.dispatchEvent(new Event('change', { bubbles: true }));
};

export const clearPromptValue = (textarea: HTMLTextAreaElement): void => {
  setPromptValue(textarea, '');
};

export const clickNativeButton = (button: HTMLButtonElement): void => {
  button.click();
};

const iconButtonMarkup = (label: string, icon: string, role: string, extraClass: string): string => `
  <button
    type="button"
    aria-label="${label}"
    data-role="${role}"
    class="mdc-icon-button mat-mdc-icon-button mat-mdc-button-base nblmq-button ${extraClass}"
  >
    <span class="mat-mdc-button-persistent-ripple mdc-icon-button__ripple"></span>
    <mat-icon aria-hidden="true" class="mat-icon notranslate material-symbols-outlined google-symbols mat-icon-no-color">${icon}</mat-icon>
    <span class="mat-focus-indicator"></span>
    <span class="mat-mdc-button-touch-target"></span>
  </button>
`;

const queueButtonMarkup = (label: string, role: string, extraClass: string): string => `
  <button
    type="button"
    aria-label="${label}"
    data-role="${role}"
    class="mdc-icon-button mat-mdc-icon-button mat-mdc-button-base nblmq-button ${extraClass}"
  >
    <span class="mat-mdc-button-persistent-ripple mdc-icon-button__ripple"></span>
    <span class="nblmq-count" data-role="queue-count">0</span>
    <span class="mat-focus-indicator"></span>
    <span class="mat-mdc-button-touch-target"></span>
  </button>
`;

const styles = `
  :root {
    --nblmq-green: #1a9b50;
    --nblmq-green-dark: #0f7e3e;
    --nblmq-lilac: #8b78d8;
    --nblmq-lilac-dark: #7563bf;
    --nblmq-backdrop: rgba(11, 19, 32, 0.42);
    --nblmq-panel: #ffffff;
    --nblmq-panel-border: rgba(20, 32, 52, 0.12);
    --nblmq-text: #172033;
    --nblmq-muted: #5c6679;
    --nblmq-shadow: 0 22px 64px rgba(18, 30, 51, 0.18);
  }

  #${CONTROLS_ID} {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-right: 8px;
    flex-shrink: 0;
  }

  .${CONTROLS_HOST_CLASS} {
    display: flex !important;
    align-items: center;
    gap: 8px;
    flex-wrap: nowrap;
  }

  .${CONTROLS_HOST_CLASS} > * {
    min-width: 0;
  }

  .${CONTROLS_HOST_CLASS} > .selected-num-container {
    margin-right: auto;
  }

  .${CONTROLS_HOST_CLASS} > #${CONTROLS_ID},
  .${CONTROLS_HOST_CLASS} > button.submit-button,
  .${CONTROLS_HOST_CLASS} > button.stop-button {
    flex-shrink: 0;
  }

  .nblmq-button {
    position: relative;
    color: #ffffff !important;
    border-radius: 999px !important;
    width: 40px;
    height: 40px;
    min-width: 40px;
    min-height: 40px;
    box-sizing: border-box;
    flex-shrink: 0;
    transition: transform 120ms ease, filter 120ms ease, opacity 120ms ease;
  }

  .nblmq-button:hover:not(:disabled) {
    filter: brightness(1.04);
    transform: translateY(-1px);
  }

  .nblmq-button:disabled {
    opacity: 0.58;
    cursor: not-allowed;
  }

  .nblmq-button mat-icon {
    color: #ffffff !important;
    font-variation-settings: 'FILL' 1;
  }

  .nblmq-button--queue {
    background: linear-gradient(180deg, var(--nblmq-lilac), var(--nblmq-lilac-dark));
  }

  .nblmq-button--add {
    background: linear-gradient(180deg, var(--nblmq-green), var(--nblmq-green-dark));
  }

  .nblmq-count {
    position: relative;
    z-index: 1;
    color: #ffffff;
    font-size: 16px;
    font-weight: 700;
    line-height: 1;
    pointer-events: none;
    font-variant-numeric: tabular-nums;
  }

  #${MODAL_ID}[hidden] {
    display: none;
  }

  #${MODAL_ID} {
    position: fixed;
    inset: 0;
    z-index: 2147483646;
    display: grid;
    place-items: center;
    background: var(--nblmq-backdrop);
    backdrop-filter: blur(4px);
    padding: 24px;
  }

  .nblmq-modal {
    width: min(760px, 100%);
    max-height: min(86vh, 920px);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    background: linear-gradient(180deg, #ffffff, #f7f8fc);
    border: 1px solid var(--nblmq-panel-border);
    border-radius: 22px;
    box-shadow: var(--nblmq-shadow);
  }

  .nblmq-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 20px 22px 12px;
  }

  .nblmq-modal-title {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
    color: var(--nblmq-text);
  }

  .nblmq-modal-subtitle {
    margin: 0;
    padding: 0 22px 16px;
    color: var(--nblmq-muted);
    font-size: 13px;
  }

  .nblmq-quickadd {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 0 22px 18px;
    border-bottom: 1px solid rgba(20, 32, 52, 0.08);
    margin-bottom: 16px;
  }

  .nblmq-quickadd-label {
    color: var(--nblmq-text);
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .nblmq-quickadd-input {
    width: 100%;
    min-height: 64px;
    resize: vertical;
    border-radius: 14px;
    border: 1px solid rgba(20, 32, 52, 0.14);
    padding: 10px 12px;
    font: inherit;
    color: var(--nblmq-text);
    background: #fbfcff;
    box-sizing: border-box;
  }

  .nblmq-quickadd-input:focus {
    outline: 2px solid rgba(117, 99, 191, 0.28);
    border-color: rgba(117, 99, 191, 0.5);
  }

  .nblmq-quickadd-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  .nblmq-quickadd-hint {
    color: var(--nblmq-muted);
    font-size: 12px;
  }

  .nblmq-quickadd-button {
    border: 0;
    background: linear-gradient(180deg, var(--nblmq-green), var(--nblmq-green-dark));
    color: #ffffff;
    padding: 8px 16px;
    border-radius: 999px;
    font-weight: 700;
    font-size: 13px;
    cursor: pointer;
  }

  .nblmq-quickadd-button:hover {
    filter: brightness(1.05);
  }

  .nblmq-modal-close {
    border: 0;
    background: transparent;
    color: var(--nblmq-muted);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    border-radius: 999px;
  }

  .nblmq-modal-close:hover {
    background: rgba(23, 32, 51, 0.08);
    color: var(--nblmq-text);
  }

  .nblmq-list {
    list-style: none;
    margin: 0;
    padding: 0 22px 22px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow: auto;
  }

  .nblmq-item {
    border: 1px solid rgba(20, 32, 52, 0.12);
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.96);
    padding: 14px;
  }

  .nblmq-item-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 10px;
  }

  .nblmq-item-label {
    margin: 0;
    color: var(--nblmq-text);
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .nblmq-item-delete {
    border: 0;
    background: rgba(222, 74, 74, 0.12);
    color: #b12a2a;
    padding: 7px 10px;
    border-radius: 999px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 700;
  }

  .nblmq-item-delete:hover {
    background: rgba(222, 74, 74, 0.2);
  }

  .nblmq-item-text {
    width: 100%;
    min-height: 112px;
    resize: vertical;
    border-radius: 14px;
    border: 1px solid rgba(20, 32, 52, 0.14);
    padding: 12px 14px;
    font: inherit;
    color: var(--nblmq-text);
    background: #fbfcff;
    box-sizing: border-box;
  }

  .nblmq-item-text:focus {
    outline: 2px solid rgba(117, 99, 191, 0.28);
    border-color: rgba(117, 99, 191, 0.5);
  }

  .${UNLOCKED_TEXTAREA_CLASS} {
    opacity: 1 !important;
    pointer-events: auto !important;
  }

  .${UNLOCKED_TEXTAREA_CLASS}::placeholder {
    color: rgba(255, 255, 255, 0.54);
  }

  .nblmq-empty {
    margin: 0;
    padding: 0 22px 24px;
    color: var(--nblmq-muted);
    font-size: 14px;
  }

  @media (max-width: 720px) {
    #${MODAL_ID} {
      padding: 14px;
    }

    .nblmq-modal {
      max-height: 92vh;
      border-radius: 18px;
    }

    .nblmq-list {
      padding-left: 16px;
      padding-right: 16px;
      padding-bottom: 16px;
    }

    .nblmq-modal-header,
    .nblmq-modal-subtitle,
    .nblmq-empty {
      padding-left: 16px;
      padding-right: 16px;
    }
  }
`;

const fromMarkup = (doc: Document, markup: string): HTMLButtonElement => {
  const template = doc.createElement('template');
  template.innerHTML = markup.trim();
  return template.content.firstElementChild as HTMLButtonElement;
};

const createIconButton = (
  doc: Document,
  label: string,
  icon: string,
  role: string,
  extraClass: string
): HTMLButtonElement => fromMarkup(doc, iconButtonMarkup(label, icon, role, extraClass));

const createQueueButton = (
  doc: Document,
  label: string,
  role: string,
  extraClass: string
): HTMLButtonElement => fromMarkup(doc, queueButtonMarkup(label, role, extraClass));

const setButtonState = (button: HTMLButtonElement, disabled: boolean): void => {
  button.disabled = disabled;
  button.classList.toggle('mat-mdc-button-disabled', disabled);
};

const syncTextareaLockState = (snapshot: NotebookLmSnapshot): void => {
  // We deliberately do NOT mutate the native textarea here. Fighting the
  // framework over `disabled`/`readonly`/`placeholder` triggers tight observer
  // loops that freeze the tab. Users add prompts via the quick-add form inside
  // our modal instead. We only clear our own leftover class if present.
  const { textarea } = snapshot;
  if (!textarea) {
    return;
  }
  if (textarea.classList.contains(UNLOCKED_TEXTAREA_CLASS)) {
    textarea.classList.remove(UNLOCKED_TEXTAREA_CLASS);
  }
};

const renderPendingItems = (
  listElement: HTMLOListElement,
  state: NotebookQueueState,
  handlers: QueueUiHandlers,
  doc: Document
): void => {
  listElement.replaceChildren();

  state.pending.forEach((item, index) => {
    const listItem = doc.createElement('li');
    listItem.className = 'nblmq-item';
    listItem.dataset.promptId = item.id;

    const header = doc.createElement('div');
    header.className = 'nblmq-item-header';

    const label = doc.createElement('p');
    label.className = 'nblmq-item-label';
    label.textContent = `Prompt ${index + 1}`;

    const deleteButton = doc.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'nblmq-item-delete';
    deleteButton.dataset.action = 'remove';
    deleteButton.dataset.promptId = item.id;
    deleteButton.textContent = 'Remove';

    header.append(label, deleteButton);

    const textarea = doc.createElement('textarea');
    textarea.className = 'nblmq-item-text';
    textarea.dataset.role = 'queue-text';
    textarea.dataset.promptId = item.id;
    textarea.value = item.text;
    textarea.addEventListener('change', () => {
      void handlers.onUpdatePrompt(item.id, textarea.value);
    });

    listItem.append(header, textarea);
    listElement.append(listItem);
  });
};

export class NotebookLmUi {
  constructor(
    private readonly doc: Document,
    private readonly handlers: QueueUiHandlers
  ) {}

  private ensureStyles(): void {
    if (this.doc.getElementById(STYLES_ID)) {
      return;
    }

    const styleElement = this.doc.createElement('style');
    styleElement.id = STYLES_ID;
    styleElement.textContent = styles;
    this.doc.head.append(styleElement);
  }

  private ensureControls(host: HTMLElement): HTMLDivElement {
    if (!host.classList.contains(CONTROLS_HOST_CLASS)) {
      host.classList.add(CONTROLS_HOST_CLASS);
    }

    let controls = this.doc.getElementById(CONTROLS_ID) as HTMLDivElement | null;
    if (!controls) {
      controls = this.doc.createElement('div');
      controls.id = CONTROLS_ID;

      const queueButton = createQueueButton(
        this.doc,
        'Open prompt queue',
        'queue-view',
        'nblmq-button--queue'
      );
      const addButton = createIconButton(
        this.doc,
        'Add prompt to queue',
        'add',
        'queue-add',
        'nblmq-button--add'
      );

      queueButton.addEventListener('click', () => {
        this.handlers.onToggleModal();
      });

      addButton.addEventListener('click', () => {
        this.handlers.onOpenModalForAdd();
        const input = this.doc.querySelector<HTMLTextAreaElement>('[data-role="quickadd-input"]');
        input?.focus();
      });

      controls.append(queueButton, addButton);
    }

    const nativeActionButton = host.querySelector<HTMLButtonElement>('button.submit-button, button.stop-button');
    if (nativeActionButton) {
      if (controls.nextElementSibling !== nativeActionButton || controls.parentElement !== host) {
        host.insertBefore(controls, nativeActionButton);
      }
    } else if (controls.parentElement !== host) {
      host.append(controls);
    }

    return controls;
  }

  private ensureModal(): HTMLDivElement {
    let modalRoot = this.doc.getElementById(MODAL_ID) as HTMLDivElement | null;
    if (modalRoot) {
      return modalRoot;
    }

    modalRoot = this.doc.createElement('div');
    modalRoot.id = MODAL_ID;
    modalRoot.hidden = true;

    modalRoot.innerHTML = `
      <div class="nblmq-modal" role="dialog" aria-modal="true" aria-label="Prompt queue">
        <div class="nblmq-modal-header">
          <h2 class="nblmq-modal-title">Prompt Queue</h2>
          <button type="button" class="nblmq-modal-close" data-action="close" aria-label="Close queue">
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <p class="nblmq-modal-subtitle">Sent prompts are removed automatically. Pending prompts can be edited or removed here.</p>
        <form class="nblmq-quickadd" data-role="quickadd-form">
          <label class="nblmq-quickadd-label" for="nblmq-quickadd-input">Add a new prompt</label>
          <textarea
            id="nblmq-quickadd-input"
            class="nblmq-quickadd-input"
            data-role="quickadd-input"
            placeholder="Type a prompt and press Enter or click Add"
            rows="2"
          ></textarea>
          <div class="nblmq-quickadd-actions">
            <span class="nblmq-quickadd-hint">Tip: this input works even while NotebookLM is responding.</span>
            <button type="submit" class="nblmq-quickadd-button" data-action="quickadd">Add to queue</button>
          </div>
        </form>
        <ol class="nblmq-list"></ol>
        <p class="nblmq-empty">No pending prompts.</p>
      </div>
    `;

    const quickAddForm = modalRoot.querySelector<HTMLFormElement>('[data-role="quickadd-form"]');
    const quickAddInput = modalRoot.querySelector<HTMLTextAreaElement>('[data-role="quickadd-input"]');

    const submitQuickAdd = (): void => {
      if (!quickAddInput) {
        return;
      }
      const text = quickAddInput.value;
      if (!text.trim()) {
        return;
      }
      quickAddInput.value = '';
      void this.handlers.onAddPromptText(text);
      quickAddInput.focus();
    };

    quickAddForm?.addEventListener('submit', (event) => {
      event.preventDefault();
      submitQuickAdd();
    });

    quickAddInput?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        submitQuickAdd();
      }
    });

    modalRoot.addEventListener('click', (event) => {
      const target = event.target as HTMLElement | null;
      if (!target) {
        return;
      }

      if (target === modalRoot || target.closest('[data-action="close"]')) {
        this.handlers.onCloseModal();
        return;
      }

      const removeButton = target.closest<HTMLButtonElement>('[data-action="remove"]');
      if (removeButton?.dataset.promptId) {
        void this.handlers.onRemovePrompt(removeButton.dataset.promptId);
      }
    });

    this.doc.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !modalRoot.hidden) {
        this.handlers.onCloseModal();
      }
    });

    this.doc.body.append(modalRoot);
    return modalRoot;
  }

  render(snapshot: NotebookLmSnapshot, state: NotebookQueueState, options: UiRenderOptions): void {
    this.ensureStyles();
    syncTextareaLockState(snapshot);

    const modalRoot = this.ensureModal();
    const listElement = modalRoot.querySelector<HTMLOListElement>('.nblmq-list');
    const emptyState = modalRoot.querySelector<HTMLParagraphElement>('.nblmq-empty');

    if (!options.notebookId || !snapshot.controlsHost || !snapshot.chatForm) {
      this.destroyControls();
      modalRoot.hidden = true;
      return;
    }

    const controls = this.ensureControls(snapshot.controlsHost);
    const queueButton = controls.querySelector<HTMLButtonElement>('[data-role="queue-view"]');
    const addButton = controls.querySelector<HTMLButtonElement>('[data-role="queue-add"]');
    const countElement = controls.querySelector<HTMLElement>('[data-role="queue-count"]');

    if (queueButton && countElement) {
      const pendingCount = state.pending.length;
      const countText = String(pendingCount);
      if (countElement.textContent !== countText) {
        countElement.textContent = countText;
      }
      const nextTitle = pendingCount > 0 ? `Open prompt queue (${pendingCount})` : 'Open prompt queue';
      if (queueButton.title !== nextTitle) {
        queueButton.title = nextTitle;
      }
    }

    if (addButton) {
      setButtonState(addButton, false);
    }

    if (queueButton) {
      setButtonState(queueButton, false);
    }

    if (listElement && emptyState) {
      renderPendingItems(listElement, state, this.handlers, this.doc);
      emptyState.hidden = state.pending.length > 0;
    }

    modalRoot.hidden = !options.modalOpen;
  }

  destroyControls(): void {
    this.doc.getElementById(CONTROLS_ID)?.remove();
  }

  destroy(): void {
    this.destroyControls();
    this.doc.getElementById(MODAL_ID)?.remove();
  }
}