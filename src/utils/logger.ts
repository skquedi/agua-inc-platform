import winston from 'winston';

const { combine, timestamp, json, colorize, simple } = winston.format;

const isDevelopment = process.env.NODE_ENV !== 'production';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL ?? 'info',
  format: isDevelopment
    ? combine(colorize(), simple())
    : combine(timestamp(), json()),
  defaultMeta: {
    service: 'agua-platform-api',
    environment: process.env.NODE_ENV ?? 'development',
  },
  transports: [new winston.transports.Console()],
});

/**
 * Creates a child logger with request-scoped context (trace ID, user ID).
 * Attach to req object in middleware so all downstream log calls carry context.
 */
export function createRequestLogger(traceId: string, userId?: string) {
  return logger.child({ traceId, userId });
}
