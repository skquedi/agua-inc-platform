export type ProjectStatus =
  | 'planning'
  | 'active'
  | 'on_hold'
  | 'completed'
  | 'cancelled';

export type ProjectPriority = 'critical' | 'high' | 'medium' | 'low';

export type Region =
  | 'LATAM'
  | 'EMEA'
  | 'APAC'
  | 'NORTH_AMERICA'
  | 'SOUTH_ASIA';

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  region: Region;
  country: string;
  teamId: string;
  clickupTaskId?: string;
  githubRepoUrl?: string;
  startDate: string;
  targetCompletionDate: string;
  completedDate?: string;
  budget: number;
  budgetCurrency: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface Team {
  id: string;
  name: string;
  region: Region;
  leadEngineerId: string;
  memberIds: string[];
  clickupListId?: string;
  activeProjectCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectCreateInput {
  name: string;
  description: string;
  priority: ProjectPriority;
  region: Region;
  country: string;
  teamId: string;
  startDate: string;
  targetCompletionDate: string;
  budget: number;
  budgetCurrency: string;
  tags?: string[];
}

export interface ProjectUpdateInput {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  targetCompletionDate?: string;
  budget?: number;
  tags?: string[];
  clickupTaskId?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
