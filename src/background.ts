import {
  isQueueCompleteNotificationMessage,
  QUEUE_COMPLETE_NOTIFICATION_MESSAGE
} from './types';

const QUEUE_COMPLETE_NOTIFICATION_ID_PREFIX = 'nblmqueue:queue-complete';
const QUEUE_COMPLETE_NOTIFICATION_TITLE = 'NotebookLM queue complete';
const QUEUE_COMPLETE_NOTIFICATION_MESSAGE_BODY =
  'NotebookLM has finished responding to all queued prompts.';

chrome.runtime.onMessage.addListener((message: unknown) => {
  if (!isQueueCompleteNotificationMessage(message)) {
    return;
  }

  const notificationId = `${QUEUE_COMPLETE_NOTIFICATION_ID_PREFIX}:${message.notebookId}`;

  void chrome.notifications.create(notificationId, {
    type: 'basic',
    title: QUEUE_COMPLETE_NOTIFICATION_TITLE,
    message: QUEUE_COMPLETE_NOTIFICATION_MESSAGE_BODY,
    iconUrl: chrome.runtime.getURL('logo.png'),
    priority: 2
  });
});

void QUEUE_COMPLETE_NOTIFICATION_MESSAGE;