import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { validateBody } from '../utils/validation';
import type { Team } from './types';

export const teamsRouter = Router();

const teamStore = new Map<string, Team>();

const createTeamSchema = z.object({
  name: z.string().min(2).max(80),
  region: z.enum(['LATAM', 'EMEA', 'APAC', 'NORTH_AMERICA', 'SOUTH_ASIA']),
  leadEngineerId: z.string().uuid(),
  memberIds: z.array(z.string().uuid()).min(1),
  clickupListId: z.string().optional(),
});

/**
 * GET /api/v1/teams
 */
teamsRouter.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(Array.from(teamStore.values()));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/teams/:id
 */
teamsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const team = teamStore.get(req.params.id);
    if (!team) {
      res.status(404).json({ code: 'TEAM_NOT_FOUND', message: `Team ${req.params.id} not found` });
      return;
    }
    res.json(team);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/teams
 */
teamsRouter.post(
  '/',
  validateBody(createTeamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const now = new Date().toISOString();
      const team: Team = {
        id: crypto.randomUUID(),
        ...req.body,
        activeProjectCount: 0,
        createdAt: now,
        updatedAt: now,
      };

      teamStore.set(team.id, team);
      logger.info('Team created', { teamId: team.id, region: team.region });

      res.status(201).json(team);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/v1/teams/:id/members
 * Adds or removes members from a team without replacing the entire roster.
 */
teamsRouter.patch(
  '/:id/members',
  validateBody(z.object({
    add: z.array(z.string().uuid()).optional().default([]),
    remove: z.array(z.string().uuid()).optional().default([]),
  })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const team = teamStore.get(req.params.id);
      if (!team) {
        res.status(404).json({ code: 'TEAM_NOT_FOUND', message: `Team ${req.params.id} not found` });
        return;
      }

      const { add, remove } = req.body as { add: string[]; remove: string[] };
      const updatedMembers = [
        ...team.memberIds.filter((id) => !remove.includes(id)),
        ...add.filter((id) => !team.memberIds.includes(id)),
      ];

      const updated: Team = { ...team, memberIds: updatedMembers, updatedAt: new Date().toISOString() };
      teamStore.set(team.id, updated);
      logger.info('Team members updated', { teamId: team.id, added: add.length, removed: remove.length });

      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);
