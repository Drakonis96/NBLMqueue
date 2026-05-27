import {
  isQueueCompleteNotificationMessage,
  QUEUE_COMPLETE_NOTIFICATION_MESSAGE,
  type QueueCompleteNotificationMessage,
  type QueueCompleteNotificationResponse
} from './types';

const QUEUE_COMPLETE_NOTIFICATION_ID_PREFIX = 'nblmqueue:queue-complete';
const QUEUE_COMPLETE_NOTIFICATION_TITLE = 'NotebookLM queue complete';
const QUEUE_COMPLETE_NOTIFICATION_MESSAGE_BODY =
  'NotebookLM has finished responding to all queued prompts.';
const QUEUE_COMPLETE_NOTIFICATION_ICON = 'notification-icon.png';

const createQueueCompleteNotification = async (
  message: QueueCompleteNotificationMessage
): Promise<QueueCompleteNotificationResponse> => {
  const permissionLevel = await chrome.notifications.getPermissionLevel();
  const notificationId = `${QUEUE_COMPLETE_NOTIFICATION_ID_PREFIX}:${message.notebookId}:${Date.now()}`;

  try {
    const createdNotificationId = await chrome.notifications.create(notificationId, {
      type: 'basic',
      title: QUEUE_COMPLETE_NOTIFICATION_TITLE,
      message: QUEUE_COMPLETE_NOTIFICATION_MESSAGE_BODY,
      iconUrl: chrome.runtime.getURL(QUEUE_COMPLETE_NOTIFICATION_ICON),
      priority: 2
    });

    console.info('NBLMqueue created a queue completion notification.', {
      notificationId: createdNotificationId,
      permissionLevel
    });

    return {
      ok: true,
      notificationId: createdNotificationId,
      permissionLevel
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('NBLMqueue failed to create the queue completion notification.', errorMessage);

    return {
      ok: false,
      error: errorMessage,
      permissionLevel
    };
  }
};

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (!isQueueCompleteNotificationMessage(message)) {
    return;
  }

  void createQueueCompleteNotification(message).then(sendResponse);
  return true;
});

void QUEUE_COMPLETE_NOTIFICATION_MESSAGE;