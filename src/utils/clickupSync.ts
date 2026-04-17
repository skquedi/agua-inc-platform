import axios, { AxiosInstance } from 'axios';
import { logger } from './logger';
import type { Project } from '../api/types';

interface ClickUpTask {
  id: string;
  name: string;
  description: string;
  status: { status: string };
  priority: { id: string; priority: string } | null;
  due_date: string | null;
  custom_fields: Array<{ id: string; name: string; value: unknown }>;
}

interface ClickUpTaskCreatePayload {
  name: string;
  description: string;
  priority: number;
  due_date?: number;
  custom_fields?: Array<{ id: string; value: unknown }>;
}

// ClickUp priority IDs: 1=urgent, 2=high, 3=normal, 4=low
const PRIORITY_MAP: Record<Project['priority'], number> = {
  critical: 1,
  high: 2,
  medium: 3,
  low: 4,
};

export class ClickUpSyncClient {
  private readonly client: AxiosInstance;

  constructor(apiToken: string) {
    this.client = axios.create({
      baseURL: 'https://api.clickup.com/api/v2',
      headers: {
        Authorization: apiToken,
        'Content-Type': 'application/json',
      },
      timeout: 10_000,
    });
  }

  /**
   * Creates a ClickUp task from an Agua Inc. project record.
   * Returns the ClickUp task ID to be stored back on the project.
   */
  async createTaskFromProject(project: Project, listId: string): Promise<string> {
    const payload: ClickUpTaskCreatePayload = {
      name: `[${project.region}] ${project.name}`,
      description: this.buildTaskDescription(project),
      priority: PRIORITY_MAP[project.priority],
      due_date: project.targetCompletionDate
        ? new Date(project.targetCompletionDate).getTime()
        : undefined,
      custom_fields: [
        { id: 'agua_project_id', value: project.id },
        { id: 'agua_country', value: project.country },
        { id: 'agua_budget', value: project.budget },
      ],
    };

    const { data } = await this.client.post<ClickUpTask>(
      `/list/${listId}/task`,
      payload
    );

    logger.info('ClickUp task created for project', {
      projectId: project.id,
      clickupTaskId: data.id,
    });

    return data.id;
  }

  /**
   * Syncs project status changes to the corresponding ClickUp task.
   * Called after PATCH /projects/:id updates the status field.
   */
  async syncStatusToClickUp(clickupTaskId: string, projectStatus: Project['status']): Promise<void> {
    const statusMap: Record<Project['status'], string> = {
      planning: 'to do',
      active: 'in progress',
      on_hold: 'on hold',
      completed: 'complete',
      cancelled: 'cancelled',
    };

    await this.client.put(`/task/${clickupTaskId}`, {
      status: statusMap[projectStatus],
    });

    logger.info('ClickUp task status synced', { clickupTaskId, status: projectStatus });
  }

  /**
   * Fetches all tasks from a ClickUp list, handling cursor-based pagination.
   * Agua Inc. lists can contain hundreds of tasks across multi-month programs.
   */
  async getAllTasksInList(listId: string): Promise<ClickUpTask[]> {
    const tasks: ClickUpTask[] = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const { data } = await this.client.get<{ tasks: ClickUpTask[]; last_page: boolean }>(
        `/list/${listId}/task`,
        { params: { page, include_closed: true } }
      );

      tasks.push(...data.tasks);
      hasMore = !data.last_page;
      page++;
    }

    return tasks;
  }

  private buildTaskDescription(project: Project): string {
    return [
      `**Agua Inc. Project** | ID: \`${project.id}\``,
      '',
      project.description,
      '',
      `**Region:** ${project.region} — **Country:** ${project.country}`,
      `**Team:** ${project.teamId}`,
      `**Budget:** ${project.budget} ${project.budgetCurrency}`,
      `**Start:** ${project.startDate}`,
      `**Target Completion:** ${project.targetCompletionDate}`,
      '',
      `_Synced from Agua Inc. Platform_`,
    ].join('\n');
  }
}

export function buildClickUpSyncClient(): ClickUpSyncClient {
  const token = process.env.CLICKUP_API_TOKEN;
  if (!token) {
    throw new Error('CLICKUP_API_TOKEN is not set');
  }
  return new ClickUpSyncClient(token);
}
