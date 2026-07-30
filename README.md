<p align="center">
  <img src="logo.png" alt="NBLMqueue logo" width="220">
</p>

# NBLMqueue

NBLMqueue is a Chrome extension for NotebookLM that lets you queue multiple prompts and send them one after another automatically. Instead of waiting for NotebookLM to finish each response before typing the next prompt, you can stack your prompts, review them, edit them, and let the extension handle the sequence.

NBLMqueue runs locally in your browser. It does not need an external server for the queue feature.

NBLMqueue is an independent project and is not affiliated with, endorsed by, or sponsored by Google or NotebookLM.

NBLMqueue supports NotebookLM on both `notebooklm.google.com` and `notebook.google.com`.

## Why use it

- NotebookLM normally accepts one prompt at a time.
- NBLMqueue lets you prepare the next prompts while NotebookLM is still responding.
- You can edit or remove pending prompts before they are sent.
- Sent prompts disappear from the queue automatically.
- Queue data is stored per notebook, so different notebooks can keep different pending items.
- The extension interface is in English, while the underlying NotebookLM page can be in English or Spanish.

## What the extension adds

- A green `Add prompt to queue` button next to the native NotebookLM send button. Clicking it opens the queue modal with its own input so you can type prompts without touching the NotebookLM textarea.
- A purple round button next to the green one that shows the current queue size (`0` when empty). Click it to open the queue modal and review or edit pending prompts.
- A queue modal with its own textarea for quickly adding prompts, plus the list of pending prompts.
- Automatic chained sending after NotebookLM finishes each response.

## Before you install

If you have never installed a Chrome extension manually before, this is the important part:

- You are not installing it from the Chrome Web Store yet.
- You will load a local folder into Chrome once.
- Chrome calls this `Load unpacked`.
- You can remove the extension at any time from the Chrome extensions page.

## Installation

### 1. Get the project files

Use one of these options:

- If you downloaded the project as a ZIP file from GitHub, unzip it first.
- If you cloned the repository with Git, open the project folder on your machine.

You should end up with a local folder named `NBLMqueue`.

### 2. Install Node.js

Node.js is required to build the extension.

- Go to https://nodejs.org
- Download the current LTS version.
- Install it with the default options.

After installation, open a terminal inside the project folder.

### 3. Install the project dependencies

Run:

```bash
npm install
```

This downloads the packages needed to build and test the extension.

### 4. Build the extension

Run:

```bash
npm run build
```

This creates a folder named `dist/`. That folder is the one you will load into Chrome.

### 5. Optional checks

If you want to confirm everything is working before loading the extension, run:

```bash
npm test
npm run typecheck
```

## Load the extension in Chrome

### 1. Open the Chrome extensions page

In Chrome, open:

```text
chrome://extensions
```

### 2. Enable Developer mode

Look at the top-right corner of the page and enable `Developer mode`.

This is required for loading unpacked extensions from a local folder.

### 3. Click `Load unpacked`

Chrome will open a folder picker.

### 4. Select the `dist` folder

Choose the `dist/` folder inside this project.

Do not select the root project folder. Select `dist/` specifically.

### 5. Pin the extension if you want quick access

This step is optional, but useful:

- Click the Chrome extensions puzzle icon.
- Find `NBLMqueue`.
- Click the pin icon.

## First use

### 1. Open NotebookLM

Open a notebook page in NotebookLM where the question box is visible.

### 2. Open the queue modal

Click the green `+` button (or the purple button that shows the queue size). The modal opens with its own input field on top.

You do not need to type anything in the NotebookLM textarea: the extension never touches it while you are queueing.

### 3. Add prompts

Type a prompt in the modal input and press Enter (or click `Add to queue`). The prompt is added to the pending list below.

Repeat for as many prompts as you want.

### 4. Review or edit pending prompts

The same modal lists every pending prompt. From there you can:

- Read all pending prompts.
- Edit any pending prompt.
- Remove any pending prompt.

The purple button on the toolbar always shows the current pending count.

### 5. Let NBLMqueue send them automatically

Close the modal. When NotebookLM is idle, NBLMqueue starts sending queued prompts automatically.

After NotebookLM finishes one answer, the next pending prompt is sent.

## How the queue behaves

- Only pending prompts stay in the queue.
- The prompt that is currently being sent is tracked internally, then removed from the visible queue.
- Once a prompt has been sent, it no longer appears in the queue.
- Each notebook keeps its own local queue state.
- Auto-send is paused while the modal is open, so you can edit prompts without one being dispatched mid-edit. Close the modal to resume sending.
- The extension never writes into the NotebookLM textarea except to dispatch a queued prompt. While NotebookLM is responding, you can still queue more prompts from the modal.

## Updating the extension after code changes

If you change the source code:

1. Run `npm run build` again.
2. Open `chrome://extensions`.
3. Find the `NBLMqueue` card.
4. Click `Reload`.
5. Refresh the NotebookLM tab.

## Troubleshooting

### The buttons do not appear

- Make sure you are on an actual NotebookLM notebook page, not just the homepage.
- Refresh the NotebookLM tab.
- Check that the extension is enabled in `chrome://extensions`.

### The queue does not start sending

- Wait until NotebookLM has fully finished the current response.
- Make sure the native NotebookLM stop button is gone and the page is idle.
- Make sure the queue modal is closed: auto-send is paused while it is open.
- Open the queue and confirm there are still pending prompts.

### Chrome says the extension is invalid

- Make sure you selected the `dist/` folder, not the project root.
- Run `npm run build` again before loading it.

### I tested it in the VS Code integrated browser and nothing happened

- The VS Code integrated browser does not load unpacked Chrome extensions.
- Use real Chrome for extension testing.

## Useful commands

```bash
npm install
npm test
npm run build
npm run typecheck
```

## Main project files

```text
.
├── logo.png
├── manifest.json
├── build.mjs
├── src/
│   ├── content-script.ts
│   ├── notebooklm-dom.ts
│   ├── queue-controller.ts
│   ├── queue-store.ts
│   └── types.ts
├── tests/
│   ├── notebooklm-dom.test.ts
│   ├── queue-controller.test.ts
│   ├── queue-store.test.ts
│   └── test-helpers.ts
└── dist/
```

## Current DOM anchors

The extension is intentionally anchored to the NotebookLM elements that control prompt sending:

- Query input: `textarea.query-box-input`
- Native send button: `button.submit-button`
- Native stop button while generating: `button.stop-button`
- Native controls container: `.bottom-right-container`

These anchors were validated against the live NotebookLM UI before implementation.

## Notes and limitations

- NBLMqueue only works on NotebookLM notebook pages.
- Queue data is stored locally in the browser.
- If you remove the extension, local queue data is removed with it.
- NotebookLM itself may still appear in the language configured for your Google account.

## Privacy

Privacy details for Chrome Web Store publication are documented in [PRIVACY.md](PRIVACY.md).
