import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Express middleware factory that validates req.body against a Zod schema.
 * Returns 422 with structured field errors on failure.
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(422).json(formatZodError(result.error));
      return;
    }
    req.body = result.data;
    next();
  };
}

/**
 * Express middleware factory that validates req.query against a Zod schema.
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      res.status(422).json(formatZodError(result.error));
      return;
    }
    // Overwrite query with coerced/defaulted values from schema
    req.query = result.data as Record<string, string>;
    next();
  };
}

function formatZodError(error: ZodError) {
  return {
    code: 'VALIDATION_ERROR',
    message: 'Request validation failed',
    details: error.errors.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    })),
  };
}

/**
 * Verifies an HMAC-SHA256 signature against a raw request body.
 * Used for both GitHub and ClickUp webhook signature validation.
 */
export function verifyHmacSignature(
  rawBody: Buffer,
  secret: string,
  receivedSignature: string,
  algorithm: 'sha256' | 'sha1' = 'sha256'
): boolean {
  const crypto = require('crypto') as typeof import('crypto');
  const expected = `${algorithm}=` + crypto
    .createHmac(algorithm, secret)
    .update(rawBody)
    .digest('hex');

  // Constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'utf8'),
      Buffer.from(receivedSignature, 'utf8')
    );
  } catch {
    // Buffers had different lengths — signature is definitely invalid
    return false;
  }
}

/**
 * Parses and validates a date range, ensuring end >= start.
 * Used in project creation and reporting endpoints.
 */
export function validateDateRange(startDate: string, endDate: string): boolean {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return !isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start;
}

/**
 * Sanitises a string for safe inclusion in log messages.
 * Strips control characters that could pollute structured log output.
 */
export function sanitiseForLog(value: string, maxLength = 200): string {
  return value
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim()
    .slice(0, maxLength);
}
