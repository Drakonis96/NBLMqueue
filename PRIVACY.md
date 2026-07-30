# Privacy Policy for NBLMqueue

Last updated: 2026-05-26

## Overview

NBLMqueue is a Chrome extension that adds a prompt queue to NotebookLM and sends queued prompts one by one when NotebookLM becomes ready.

The extension runs locally in the user's browser and does not send NotebookLM content to external servers controlled by the developer.

NBLMqueue is an independent project and is not affiliated with, endorsed by, or sponsored by Google or NotebookLM.

## Data the extension processes

NBLMqueue can access content from NotebookLM pages when the user opens a supported notebook page and uses the queue feature. This may include:

- Prompt text that the user adds to the queue
- Notebook URL and notebook identifier needed to scope queue data per notebook
- The local NotebookLM page state needed to detect whether the page is idle or currently generating a response

This information is processed locally to provide the queue behavior explicitly requested by the user.

## Data stored locally

NBLMqueue stores a limited amount of data in `chrome.storage.local`, including:

- Pending prompts for each notebook
- The prompt currently being sent
- Local timestamps and generated item identifiers used to manage the queue

This data remains on the user's device and is used only to support the prompt queue feature.

## Data sharing

NBLMqueue does not sell, transfer, or share user data with third parties except where required by law.

Information obtained from NotebookLM pages through Chrome extension permissions is used only for the user-facing queue feature requested by the user and is intended to adhere to the Chrome Web Store User Data Policy, including the Limited Use requirements.

NBLMqueue does not use NotebookLM page data for advertising, profiling, resale, or unrelated analytics.

## Remote code and external services

NBLMqueue does not use remote code. All extension code is packaged with the published extension bundle.

NBLMqueue does not use external analytics, advertising, or remote processing services for queued prompts.

## Permissions

NBLMqueue uses the following Chrome extension permissions only to support its queue workflow:

- `storage` to save queue data locally on the device
- Host access to `https://notebooklm.google.com/*` and `https://notebook.google.com/*` to detect NotebookLM page state and submit queued prompts locally in the browser

## User controls

Users can control their data directly from the extension by:

- Editing pending prompts
- Removing pending prompts
- Closing the queue without sending anything else
- Removing the extension from Chrome to stop processing entirely

Users can also clear extension data through Chrome's extension management tools.

## Contact

Support is provided through the issue tracker of the repository where NBLMqueue is published.
