import {
  isQueueCompleteNotificationMessage,
  QUEUE_COMPLETE_NOTIFICATION_MESSAGE
} from './types';

const QUEUE_COMPLETE_NOTIFICATION_ID_PREFIX = 'nblmqueue:queue-complete';
const QUEUE_COMPLETE_NOTIFICATION_TITLE = 'NotebookLM queue complete';
const QUEUE_COMPLETE_NOTIFICATION_MESSAGE_BODY =
  'NotebookLM has finished responding to all queued prompts.';
const QUEUE_COMPLETE_NOTIFICATION_ICON = 'notification-icon.png';

chrome.runtime.onMessage.addListener((message: unknown) => {
  if (!isQueueCompleteNotificationMessage(message)) {
    return;
  }

  const notificationId = `${QUEUE_COMPLETE_NOTIFICATION_ID_PREFIX}:${message.notebookId}`;

  chrome.notifications.create(
    notificationId,
    {
      type: 'basic',
      title: QUEUE_COMPLETE_NOTIFICATION_TITLE,
      message: QUEUE_COMPLETE_NOTIFICATION_MESSAGE_BODY,
      iconUrl: chrome.runtime.getURL(QUEUE_COMPLETE_NOTIFICATION_ICON),
      priority: 2
    },
    () => {
      if (chrome.runtime.lastError) {
        console.error(
          'NBLMqueue failed to create the queue completion notification.',
          chrome.runtime.lastError.message
        );
      }
    }
  );
});

void QUEUE_COMPLETE_NOTIFICATION_MESSAGE;