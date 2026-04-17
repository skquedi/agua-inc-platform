import {
  verifyHmacSignature,
  validateDateRange,
  sanitiseForLog,
} from '../../src/utils/validation';
import crypto from 'crypto';

describe('verifyHmacSignature', () => {
  const secret = 'test-secret-agua-2024';

  function buildSignature(body: string, alg: 'sha256' | 'sha1' = 'sha256') {
    const hash = crypto.createHmac(alg, secret).update(body).digest('hex');
    return `${alg}=${hash}`;
  }

  it('returns true for a valid sha256 signature', () => {
    const body = Buffer.from('{"event":"push"}');
    const sig = buildSignature(body.toString());
    expect(verifyHmacSignature(body, secret, sig)).toBe(true);
  });

  it('returns false when the signature is tampered with', () => {
    const body = Buffer.from('{"event":"push"}');
    const sig = buildSignature(body.toString()).replace('a', 'b');
    expect(verifyHmacSignature(body, secret, sig)).toBe(false);
  });

  it('returns false when the body has been altered', () => {
    const body = Buffer.from('{"event":"push"}');
    const sig = buildSignature('{"event":"push","injected":true}');
    expect(verifyHmacSignature(body, secret, sig)).toBe(false);
  });

  it('returns false for a completely different signature', () => {
    const body = Buffer.from('hello');
    expect(verifyHmacSignature(body, secret, 'sha256=deadbeef')).toBe(false);
  });

  it('returns false when signature length differs (timing-safe path)', () => {
    const body = Buffer.from('hello');
    expect(verifyHmacSignature(body, secret, 'sha256=short')).toBe(false);
  });
});

describe('validateDateRange', () => {
  it('returns true when end date is after start date', () => {
    expect(validateDateRange('2024-01-01T00:00:00Z', '2024-12-31T00:00:00Z')).toBe(true);
  });

  it('returns true when start equals end date', () => {
    expect(validateDateRange('2024-06-15T00:00:00Z', '2024-06-15T00:00:00Z')).toBe(true);
  });

  it('returns false when end date precedes start date', () => {
    expect(validateDateRange('2024-12-31T00:00:00Z', '2024-01-01T00:00:00Z')).toBe(false);
  });

  it('returns false for invalid date strings', () => {
    expect(validateDateRange('not-a-date', '2024-12-31T00:00:00Z')).toBe(false);
    expect(validateDateRange('2024-01-01T00:00:00Z', 'also-invalid')).toBe(false);
  });
});

describe('sanitiseForLog', () => {
  it('removes control characters', () => {
    expect(sanitiseForLog('hello\x00world\x1F!')).toBe('helloworld!');
  });

  it('truncates to maxLength', () => {
    const long = 'a'.repeat(300);
    expect(sanitiseForLog(long, 200)).toHaveLength(200);
  });

  it('trims leading and trailing whitespace', () => {
    expect(sanitiseForLog('  agua  ')).toBe('agua');
  });

  it('preserves normal characters', () => {
    expect(sanitiseForLog('Agua Inc. — Project #42')).toBe('Agua Inc. — Project #42');
  });
});
