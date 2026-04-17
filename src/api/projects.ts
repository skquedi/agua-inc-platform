import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { validateBody, validateQuery } from '../utils/validation';
import type {
  Project,
  ProjectCreateInput,
  ProjectUpdateInput,
  PaginatedResponse,
} from './types';

export const projectsRouter = Router();

// In-memory store for demo purposes — replace with PostgreSQL via Prisma in prod
const projectStore = new Map<string, Project>();

const createProjectSchema = z.object({
  name: z.string().min(3).max(120),
  description: z.string().max(2000),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  region: z.enum(['LATAM', 'EMEA', 'APAC', 'NORTH_AMERICA', 'SOUTH_ASIA']),
  country: z.string().min(2).max(60),
  teamId: z.string().uuid(),
  startDate: z.string().datetime(),
  targetCompletionDate: z.string().datetime(),
  budget: z.number().positive(),
  budgetCurrency: z.string().length(3),
  tags: z.array(z.string()).optional().default([]),
});

const updateProjectSchema = z.object({
  name: z.string().min(3).max(120).optional(),
  description: z.string().max(2000).optional(),
  status: z
    .enum(['planning', 'active', 'on_hold', 'completed', 'cancelled'])
    .optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  targetCompletionDate: z.string().datetime().optional(),
  budget: z.number().positive().optional(),
  tags: z.array(z.string()).optional(),
  clickupTaskId: z.string().optional(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z
    .enum(['planning', 'active', 'on_hold', 'completed', 'cancelled'])
    .optional(),
  region: z
    .enum(['LATAM', 'EMEA', 'APAC', 'NORTH_AMERICA', 'SOUTH_ASIA'])
    .optional(),
  teamId: z.string().uuid().optional(),
  search: z.string().optional(),
});

/**
 * GET /api/v1/projects
 * Lists projects with filtering and pagination.
 * Agua Inc. manages 800+ concurrent projects — pagination is mandatory.
 */
projectsRouter.get(
  '/',
  validateQuery(listQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, pageSize, status, region, teamId, search } = req.query as z.infer<typeof listQuerySchema>;

      let projects = Array.from(projectStore.values());

      if (status) projects = projects.filter((p) => p.status === status);
      if (region) projects = projects.filter((p) => p.region === region);
      if (teamId) projects = projects.filter((p) => p.teamId === teamId);
      if (search) {
        const term = search.toLowerCase();
        projects = projects.filter(
          (p) =>
            p.name.toLowerCase().includes(term) ||
            p.description.toLowerCase().includes(term) ||
            p.tags.some((t) => t.toLowerCase().includes(term))
        );
      }

      const total = projects.length;
      const offset = (page - 1) * pageSize;
      const paginated = projects.slice(offset, offset + pageSize);

      const response: PaginatedResponse<Project> = {
        data: paginated,
        total,
        page,
        pageSize,
        hasNextPage: offset + pageSize < total,
      };

      res.json(response);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/projects/:id
 */
projectsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = projectStore.get(req.params.id);
    if (!project) {
      res.status(404).json({ code: 'PROJECT_NOT_FOUND', message: `Project ${req.params.id} not found` });
      return;
    }
    res.json(project);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/projects
 * Creates a new project and queues a ClickUp task creation job.
 */
projectsRouter.post(
  '/',
  validateBody(createProjectSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input: ProjectCreateInput = req.body;
      const now = new Date().toISOString();

      const project: Project = {
        id: crypto.randomUUID(),
        ...input,
        tags: input.tags ?? [],
        status: 'planning',
        createdAt: now,
        updatedAt: now,
        createdBy: (req.headers['x-user-id'] as string) ?? 'system',
      };

      projectStore.set(project.id, project);
      logger.info('Project created', { projectId: project.id, teamId: project.teamId });

      res.status(201).json(project);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/v1/projects/:id
 */
projectsRouter.patch(
  '/:id',
  validateBody(updateProjectSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const project = projectStore.get(req.params.id);
      if (!project) {
        res.status(404).json({ code: 'PROJECT_NOT_FOUND', message: `Project ${req.params.id} not found` });
        return;
      }

      const updates: ProjectUpdateInput = req.body;
      const updatedProject: Project = {
        ...project,
        ...updates,
        updatedAt: new Date().toISOString(),
        completedDate:
          updates.status === 'completed'
            ? new Date().toISOString()
            : project.completedDate,
      };

      projectStore.set(project.id, updatedProject);
      logger.info('Project updated', { projectId: project.id, fields: Object.keys(updates) });

      res.json(updatedProject);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/v1/projects/:id
 * Soft-delete by setting status to 'cancelled' to preserve audit trail.
 */
projectsRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = projectStore.get(req.params.id);
    if (!project) {
      res.status(404).json({ code: 'PROJECT_NOT_FOUND', message: `Project ${req.params.id} not found` });
      return;
    }

    const cancelled: Project = {
      ...project,
      status: 'cancelled',
      updatedAt: new Date().toISOString(),
    };
    projectStore.set(project.id, cancelled);
    logger.info('Project cancelled', { projectId: project.id });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
