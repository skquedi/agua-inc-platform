import { Router, Request, Response } from 'express';
import { verifyHmacSignature } from '../utils/validation';
import { logger } from '../utils/logger';

export const clickupWebhookRouter = Router();

type ClickUpEventType =
  | 'taskCreated'
  | 'taskUpdated'
  | 'taskStatusUpdated'
  | 'taskPriorityUpdated'
  | 'taskAssigneeUpdated'
  | 'taskDeleted'
  | 'taskCommentPosted';

interface ClickUpWebhookEvent {
  event: ClickUpEventType;
  task_id: string;
  history_items: Array<{
    id: string;
    type: number;
    date: string;
    field: string;
    parent_id: string;
    data: Record<string, unknown>;
    before: Record<string, unknown>;
    after: Record<string, unknown>;
  }>;
  webhook_id: string;
}

/**
 * POST /webhooks/clickup
 *
 * Receives ClickUp events and syncs state back to the Agua Inc. platform.
 * This is the reverse path of ClickUpSyncClient — changes made in ClickUp
 * by project managers propagate back to our DB so the two systems stay in sync.
 */
clickupWebhookRouter.post('/', (req: Request, res: Response) => {
  const signature = req.headers['x-signature'] as string | undefined;

  const secret = process.env.CLICKUP_WEBHOOK_SECRET;
  if (!secret) {
    logger.error('CLICKUP_WEBHOOK_SECRET is not configured');
    res.status(500).json({ code: 'CONFIG_ERROR', message: 'Webhook secret not configured' });
    return;
  }

  const rawBody = req.body as Buffer;

  if (signature && !verifyHmacSignature(rawBody, secret, signature)) {
    logger.warn('ClickUp webhook rejected: invalid signature');
    res.status(401).json({ code: 'INVALID_SIGNATURE', message: 'Webhook signature verification failed' });
    return;
  }

  let event: ClickUpWebhookEvent;
  try {
    event = JSON.parse(rawBody.toString('utf8')) as ClickUpWebhookEvent;
  } catch {
    res.status(400).json({ code: 'INVALID_JSON', message: 'Could not parse webhook payload' });
    return;
  }

  logger.info('ClickUp webhook received', { eventType: event.event, taskId: event.task_id });

  res.status(202).json({ received: true });

  setImmediate(() => {
    handleClickUpEvent(event).catch((err: unknown) => {
      logger.error('ClickUp webhook processing failed', {
        taskId: event.task_id,
        error: (err as Error).message,
      });
    });
  });
});

async function handleClickUpEvent(event: ClickUpWebhookEvent): Promise<void> {
  switch (event.event) {
    case 'taskStatusUpdated':
      await syncClickUpStatusToProject(event);
      break;
    case 'taskPriorityUpdated':
      await syncClickUpPriorityToProject(event);
      break;
    case 'taskAssigneeUpdated':
      logger.info('ClickUp task assignee changed — no platform action required', {
        taskId: event.task_id,
      });
      break;
    case 'taskDeleted':
      logger.warn('ClickUp task deleted — manual reconciliation may be needed', {
        taskId: event.task_id,
      });
      break;
    default:
      logger.debug('Unhandled ClickUp event', { event: event.event, taskId: event.task_id });
  }
}

async function syncClickUpStatusToProject(event: ClickUpWebhookEvent): Promise<void> {
  const statusChange = event.history_items.find((h) => h.field === 'status');
  if (!statusChange) return;

  const newStatus = String(statusChange.after['status'] ?? '');

  // Map ClickUp status strings back to our ProjectStatus enum
  const statusMap: Record<string, string> = {
    'to do': 'planning',
    'in progress': 'active',
    'on hold': 'on_hold',
    'complete': 'completed',
    'cancelled': 'cancelled',
  };

  const mappedStatus = statusMap[newStatus.toLowerCase()];
  if (!mappedStatus) {
    logger.warn('Unknown ClickUp status — skipping sync', { newStatus, taskId: event.task_id });
    return;
  }

  logger.info('Syncing ClickUp status change to platform project', {
    taskId: event.task_id,
    from: String(statusChange.before['status'] ?? ''),
    to: mappedStatus,
  });
  // TODO: look up project by clickupTaskId and call PATCH /projects/:id
}

async function syncClickUpPriorityToProject(event: ClickUpWebhookEvent): Promise<void> {
  const priorityChange = event.history_items.find((h) => h.field === 'priority');
  if (!priorityChange) return;

  const clickupPriority = Number(priorityChange.after['priority'] ?? 3);
  const priorityMap: Record<number, string> = { 1: 'critical', 2: 'high', 3: 'medium', 4: 'low' };
  const mappedPriority = priorityMap[clickupPriority] ?? 'medium';

  logger.info('Syncing ClickUp priority change to platform project', {
    taskId: event.task_id,
    priority: mappedPriority,
  });
  // TODO: look up project by clickupTaskId and call PATCH /projects/:id
}
