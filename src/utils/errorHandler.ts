import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    code: 'NOT_FOUND',
    message: `Route ${req.method} ${req.path} not found`,
  });
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  const status = (err as { status?: number }).status ?? 500;
  const message = err instanceof Error ? err.message : 'Internal server error';

  logger.error('Unhandled error', {
    error: message,
    path: req.path,
    method: req.method,
    status,
  });

  res.status(status).json({
    code: status === 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR',
    message: status === 500 ? 'An unexpected error occurred' : message,
  });
}
