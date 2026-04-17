import request from 'supertest';
import { app } from '../../src/api/index';

const validProject = {
  name: 'Desalination Plant Upgrade — Monterrey',
  description: 'Phase 2 upgrade of the Monterrey desalination plant filtration system.',
  priority: 'high',
  region: 'LATAM',
  country: 'Mexico',
  teamId: '550e8400-e29b-41d4-a716-446655440000',
  startDate: '2024-03-01T00:00:00Z',
  targetCompletionDate: '2024-09-30T00:00:00Z',
  budget: 2500000,
  budgetCurrency: 'MXN',
  tags: ['desalination', 'infrastructure', 'monterrey'],
};

describe('POST /api/v1/projects', () => {
  it('creates a project and returns 201 with the new resource', async () => {
    const res = await request(app).post('/api/v1/projects').send(validProject);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      name: validProject.name,
      region: 'LATAM',
      status: 'planning',
      priority: 'high',
    });
    expect(res.body.id).toBeDefined();
    expect(res.body.createdAt).toBeDefined();
  });

  it('returns 422 when required fields are missing', async () => {
    const res = await request(app).post('/api/v1/projects').send({ name: 'Incomplete' });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(res.body.details).toBeInstanceOf(Array);
  });

  it('returns 422 for invalid region value', async () => {
    const res = await request(app)
      .post('/api/v1/projects')
      .send({ ...validProject, region: 'INVALID_REGION' });

    expect(res.status).toBe(422);
  });

  it('returns 422 for negative budget', async () => {
    const res = await request(app)
      .post('/api/v1/projects')
      .send({ ...validProject, budget: -1000 });

    expect(res.status).toBe(422);
  });
});

describe('GET /api/v1/projects', () => {
  it('returns a paginated list', async () => {
    const res = await request(app).get('/api/v1/projects');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('page', 1);
    expect(res.body).toHaveProperty('hasNextPage');
  });

  it('accepts pagination query params', async () => {
    const res = await request(app).get('/api/v1/projects?page=1&pageSize=5');
    expect(res.status).toBe(200);
    expect(res.body.pageSize).toBe(5);
  });

  it('returns 422 for out-of-range pageSize', async () => {
    const res = await request(app).get('/api/v1/projects?pageSize=999');
    expect(res.status).toBe(422);
  });
});

describe('GET /api/v1/projects/:id', () => {
  let createdId: string;

  beforeAll(async () => {
    const res = await request(app).post('/api/v1/projects').send(validProject);
    createdId = res.body.id as string;
  });

  it('returns the project by id', async () => {
    const res = await request(app).get(`/api/v1/projects/${createdId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(createdId);
  });

  it('returns 404 for an unknown id', async () => {
    const res = await request(app).get('/api/v1/projects/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('PROJECT_NOT_FOUND');
  });
});

describe('PATCH /api/v1/projects/:id', () => {
  let createdId: string;

  beforeEach(async () => {
    const res = await request(app).post('/api/v1/projects').send(validProject);
    createdId = res.body.id as string;
  });

  it('updates allowed fields and returns the updated project', async () => {
    const res = await request(app)
      .patch(`/api/v1/projects/${createdId}`)
      .send({ status: 'active', priority: 'critical' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('active');
    expect(res.body.priority).toBe('critical');
  });

  it('sets completedDate when status is changed to completed', async () => {
    const res = await request(app)
      .patch(`/api/v1/projects/${createdId}`)
      .send({ status: 'completed' });

    expect(res.status).toBe(200);
    expect(res.body.completedDate).toBeDefined();
  });

  it('returns 404 when patching a non-existent project', async () => {
    const res = await request(app)
      .patch('/api/v1/projects/00000000-0000-0000-0000-000000000000')
      .send({ status: 'active' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/v1/projects/:id', () => {
  it('soft-deletes a project by setting status to cancelled', async () => {
    const create = await request(app).post('/api/v1/projects').send(validProject);
    const id = create.body.id as string;

    const del = await request(app).delete(`/api/v1/projects/${id}`);
    expect(del.status).toBe(204);

    const get = await request(app).get(`/api/v1/projects/${id}`);
    expect(get.body.status).toBe('cancelled');
  });

  it('returns 404 when deleting a non-existent project', async () => {
    const res = await request(app).delete('/api/v1/projects/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });
});
