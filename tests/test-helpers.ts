export interface NotebookDomHarness {
  textarea: HTMLTextAreaElement;
  getSendButton: () => HTMLButtonElement | null;
  getStopButton: () => HTMLButtonElement | null;
  setReady: () => void;
  setGenerating: () => void;
  submissions: string[];
}

const sendButtonClasses = (disabled: boolean): string => {
  return [
    'mdc-icon-button',
    'mat-mdc-icon-button',
    'mat-mdc-button-base',
    'submit-button',
    'outset-focus-ring',
    disabled ? 'mat-mdc-button-disabled' : '',
    'mat-unthemed',
    'ng-star-inserted'
  ]
    .filter(Boolean)
    .join(' ');
};

const stopButtonClasses = [
  'mdc-icon-button',
  'mat-mdc-icon-button',
  'mat-mdc-button-base',
  'stop-button',
  'outset-focus-ring',
  'mat-unthemed',
  'ng-star-inserted'
].join(' ');

const createSendButton = (
  document: Document,
  textarea: HTMLTextAreaElement,
  submissions: string[],
  setGenerating: () => void,
  disabled: boolean
): HTMLButtonElement => {
  const button = document.createElement('button');
  button.type = 'submit';
  button.setAttribute('aria-label', 'Send');
  button.className = sendButtonClasses(disabled);
  button.disabled = disabled;
  button.innerHTML = '<mat-icon>arrow_forward</mat-icon>';
  button.addEventListener('click', (event) => {
    event.preventDefault();
    submissions.push(textarea.value.trim());
    setGenerating();
  });

  return button;
};

const createStopButton = (document: Document): HTMLButtonElement => {
  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute('aria-label', 'Stop generating');
  button.className = stopButtonClasses;
  button.innerHTML = '<mat-icon>stop</mat-icon>';
  return button;
};

export const createNotebookDom = (document: Document = globalThis.document): NotebookDomHarness => {
  document.body.innerHTML = `
    <div class="query-box">
      <div class="input-group">
        <form class="form ng-untouched ng-pristine ng-valid">
          <div class="message-container">
            <div class="query-box-input-wrapper">
              <textarea
                aria-label="Query box"
                class="query-box-input"
                placeholder="Ask a question or create something"
              ></textarea>
            </div>
            <div class="bottom-right-container ng-star-inserted">
              <div class="selected-num-container"><div class="selected-num">45 sources</div></div>
            </div>
          </div>
        </form>
      </div>
    </div>
  `;

  const textarea = document.querySelector<HTMLTextAreaElement>('textarea.query-box-input');
  const host = document.querySelector<HTMLElement>('.bottom-right-container');

  if (!textarea || !host) {
    throw new Error('Failed to create NotebookLM test DOM');
  }

  const submissions: string[] = [];

  const getSendButton = (): HTMLButtonElement | null => host.querySelector<HTMLButtonElement>('button.submit-button');
  const getStopButton = (): HTMLButtonElement | null => host.querySelector<HTMLButtonElement>('button.stop-button');

  const replaceActionButton = (button: HTMLButtonElement): void => {
    getSendButton()?.remove();
    getStopButton()?.remove();
    host.append(button);
  };

  const setGenerating = (): void => {
    textarea.value = '';
    textarea.disabled = true;
    textarea.placeholder = 'Responding...';
    replaceActionButton(createStopButton(document));
  };

  const setReady = (): void => {
    textarea.disabled = false;
    textarea.placeholder = 'Ask a question or create something';
    replaceActionButton(createSendButton(document, textarea, submissions, setGenerating, textarea.value.trim().length === 0));
  };

  textarea.addEventListener('input', () => {
    const sendButton = getSendButton();
    if (!sendButton) {
      return;
    }

    const disabled = textarea.value.trim().length === 0;
    sendButton.disabled = disabled;
    sendButton.className = sendButtonClasses(disabled);
  });

  setReady();

  return {
    textarea,
    getSendButton,
    getStopButton,
    setReady,
    setGenerating,
    submissions
  };
};

export const flushPromises = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};