import { Router, Request, Response } from 'express';
import { verifyHmacSignature } from '../utils/validation';
import { logger } from '../utils/logger';

export const githubWebhookRouter = Router();

interface GitHubPushEvent {
  ref: string;
  repository: { full_name: string; default_branch: string };
  commits: Array<{ id: string; message: string; author: { name: string } }>;
  pusher: { name: string };
}

interface GitHubPullRequestEvent {
  action: string;
  number: number;
  pull_request: {
    title: string;
    state: string;
    merged: boolean;
    user: { login: string };
    head: { ref: string; sha: string };
    base: { ref: string };
  };
  repository: { full_name: string };
}

type GitHubWebhookPayload = GitHubPushEvent | GitHubPullRequestEvent;

/**
 * POST /webhooks/github
 *
 * Receives GitHub events and dispatches to the appropriate handler.
 * All 400+ Agua Inc. GitHub repos are configured to POST here on push and PR events.
 * Signature verification is mandatory — unsigned requests are rejected immediately.
 */
githubWebhookRouter.post('/', (req: Request, res: Response) => {
  const signature = req.headers['x-hub-signature-256'] as string | undefined;
  const eventType = req.headers['x-github-event'] as string | undefined;
  const deliveryId = req.headers['x-github-delivery'] as string | undefined;

  if (!signature || !eventType) {
    logger.warn('GitHub webhook rejected: missing headers', { deliveryId });
    res.status(400).json({ code: 'MISSING_HEADERS', message: 'x-hub-signature-256 and x-github-event are required' });
    return;
  }

  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    logger.error('GITHUB_WEBHOOK_SECRET is not configured');
    res.status(500).json({ code: 'CONFIG_ERROR', message: 'Webhook secret not configured' });
    return;
  }

  const rawBody = req.body as Buffer;
  if (!verifyHmacSignature(rawBody, secret, signature, 'sha256')) {
    logger.warn('GitHub webhook rejected: invalid signature', { deliveryId, eventType });
    res.status(401).json({ code: 'INVALID_SIGNATURE', message: 'Webhook signature verification failed' });
    return;
  }

  let payload: GitHubWebhookPayload;
  try {
    payload = JSON.parse(rawBody.toString('utf8')) as GitHubWebhookPayload;
  } catch {
    res.status(400).json({ code: 'INVALID_JSON', message: 'Could not parse webhook payload' });
    return;
  }

  logger.info('GitHub webhook received', { eventType, deliveryId });

  // Acknowledge immediately — heavy processing is async to avoid GitHub's 10s timeout
  res.status(202).json({ received: true, deliveryId });

  setImmediate(() => {
    handleGitHubEvent(eventType, payload, deliveryId ?? 'unknown').catch((err: unknown) => {
      logger.error('GitHub webhook processing failed', { deliveryId, error: (err as Error).message });
    });
  });
});

async function handleGitHubEvent(
  eventType: string,
  payload: GitHubWebhookPayload,
  deliveryId: string
): Promise<void> {
  switch (eventType) {
    case 'push':
      await handlePushEvent(payload as GitHubPushEvent, deliveryId);
      break;
    case 'pull_request':
      await handlePullRequestEvent(payload as GitHubPullRequestEvent, deliveryId);
      break;
    case 'ping':
      logger.info('GitHub ping event — webhook configured successfully', { deliveryId });
      break;
    default:
      logger.debug('Unhandled GitHub event type', { eventType, deliveryId });
  }
}

async function handlePushEvent(payload: GitHubPushEvent, deliveryId: string): Promise<void> {
  const { repository, ref, commits, pusher } = payload;
  const branch = ref.replace('refs/heads/', '');

  logger.info('Push event processed', {
    repo: repository.full_name,
    branch,
    commitCount: commits.length,
    pusher: pusher.name,
    deliveryId,
  });

  // Feature branches matching "agua-project-<uuid>" pattern trigger ClickUp task updates
  const projectBranchMatch = branch.match(/^agua-project-([a-f0-9-]{36})$/);
  if (projectBranchMatch) {
    const projectId = projectBranchMatch[1];
    logger.info('Push detected on project branch — queuing ClickUp comment sync', {
      projectId,
      latestCommit: commits[0]?.id,
    });
    // TODO: enqueue job to post commit summary as ClickUp task comment
  }
}

async function handlePullRequestEvent(
  payload: GitHubPullRequestEvent,
  deliveryId: string
): Promise<void> {
  const { action, number, pull_request, repository } = payload;

  logger.info('Pull request event processed', {
    repo: repository.full_name,
    prNumber: number,
    action,
    author: pull_request.user.login,
    deliveryId,
  });

  if (action === 'closed' && pull_request.merged) {
    logger.info('PR merged — queuing ClickUp status update', {
      repo: repository.full_name,
      prNumber: number,
      targetBranch: pull_request.base.ref,
    });
    // TODO: enqueue job to advance ClickUp task status on merge to main
  }
}
