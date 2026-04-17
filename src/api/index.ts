import express from 'express';
import { projectsRouter } from './projects';
import { teamsRouter } from './teams';
import { healthRouter } from './health';
import { githubWebhookRouter } from '../webhooks/github';
import { clickupWebhookRouter } from '../webhooks/clickup';
import { errorHandler, notFoundHandler } from '../utils/errorHandler';
import { logger } from '../utils/logger';

const app = express();
const PORT = parseInt(process.env.PORT ?? '3000', 10);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Trust proxy headers from the AWS ALB / nginx layer
app.set('trust proxy', 1);

// Health checks — exposed before auth middleware so k8s probes aren't blocked
app.use('/health', healthRouter);

// Webhook endpoints need raw body for HMAC signature verification
app.use('/webhooks/github', express.raw({ type: 'application/json' }), githubWebhookRouter);
app.use('/webhooks/clickup', express.raw({ type: 'application/json' }), clickupWebhookRouter);

// REST API
app.use('/api/v1/projects', projectsRouter);
app.use('/api/v1/teams', teamsRouter);

app.use(notFoundHandler);
app.use(errorHandler);

if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`Agua Inc. platform API started`, { port: PORT, env: process.env.NODE_ENV });
  });
}

export { app };
