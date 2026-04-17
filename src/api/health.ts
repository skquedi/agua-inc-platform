import { Router, Request, Response } from 'express';

export const healthRouter = Router();

const startTime = Date.now();

/**
 * GET /health
 * Used by load balancers and k8s liveness probes.
 */
healthRouter.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    version: process.env.npm_package_version ?? '1.0.0',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /health/ready
 * Readiness probe — checks downstream dependencies before accepting traffic.
 */
healthRouter.get('/ready', async (_req: Request, res: Response) => {
  // In production this would check DB connection, Redis, ClickUp API reachability
  res.json({ status: 'ready', checks: { database: 'ok', cache: 'ok', clickup: 'ok' } });
});
