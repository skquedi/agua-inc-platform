import request from 'supertest';
import crypto from 'crypto';
import { app } from '../../src/api/index';

const WEBHOOK_SECRET = 'test-github-secret';

function signPayload(body: string): string {
  return 'sha256=' + crypto.createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex');
}

const pushPayload = JSON.stringify({
  ref: 'refs/heads/main',
  repository: { full_name: 'agua-inc/water-treatment-api', default_branch: 'main' },
  commits: [{ id: 'abc123', message: 'fix: improve RO membrane flush cycle', author: { name: 'eng-bot' } }],
  pusher: { name: 'eng-bot' },
});

describe('POST /webhooks/github', () => {
  beforeAll(() => {
    process.env.GITHUB_WEBHOOK_SECRET = WEBHOOK_SECRET;
  });

  afterAll(() => {
    delete process.env.GITHUB_WEBHOOK_SECRET;
  });

  it('accepts a valid push event and returns 202', async () => {
    const res = await request(app)
      .post('/webhooks/github')
      .set('Content-Type', 'application/json')
      .set('x-github-event', 'push')
      .set('x-hub-signature-256', signPayload(pushPayload))
      .set('x-github-delivery', 'test-delivery-001')
      .send(Buffer.from(pushPayload));

    expect(res.status).toBe(202);
    expect(res.body.received).toBe(true);
  });

  it('rejects requests with an invalid signature', async () => {
    const res = await request(app)
      .post('/webhooks/github')
      .set('Content-Type', 'application/json')
      .set('x-github-event', 'push')
      .set('x-hub-signature-256', 'sha256=deadbeefdeadbeef')
      .send(Buffer.from(pushPayload));

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_SIGNATURE');
  });

  it('rejects requests with missing event header', async () => {
    const res = await request(app)
      .post('/webhooks/github')
      .set('Content-Type', 'application/json')
      .set('x-hub-signature-256', signPayload(pushPayload))
      .send(Buffer.from(pushPayload));

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('MISSING_HEADERS');
  });

  it('rejects requests with missing signature header', async () => {
    const res = await request(app)
      .post('/webhooks/github')
      .set('Content-Type', 'application/json')
      .set('x-github-event', 'push')
      .send(Buffer.from(pushPayload));

    expect(res.status).toBe(400);
  });
});
