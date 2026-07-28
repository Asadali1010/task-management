export type ProjectRole = 'owner' | 'admin' | 'member';

export interface ProjectMetadata {
  id: string;
  name: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface ProjectSummary {
  id: string;
  name: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  viewerRole: ProjectRole;
}

export interface ProjectListResponse {
  projects: ProjectSummary[];
}

export interface ArchiveProjectResponse {
  project: ProjectSummary;
}

export interface RestoreProjectResponse {
  project: ProjectSummary;
}

export interface ProjectMember {
  id: string;
  name: string;
  email: string;
  role: ProjectRole;
  avatarUrl?: string;
}

export interface ProjectActivity {
  id: string;
  type: string;
  description: string;
  actorName: string;
  createdAt: string;
}

export interface ProjectActivityPageResponse {
  activities: ProjectActivity[];
  page: number;
  pageSize: number;
  totalCount: number;
  hasMore: boolean;
}

export interface ProjectMetrics {
  totalTasks: number;
  completedTasks: number;
  openTasks: number;
  overdueTasks: number;
  memberCount: number;
}

export interface ProjectDetail {
  metadata: ProjectMetadata;
  members: ProjectMember[];
  recentActivity: ProjectActivity[];
  metrics: ProjectMetrics;
  viewerRole: ProjectRole;
}

export interface InviteMemberRequest {
  identifier: string;
}

export interface InviteMemberResponse {
  member: ProjectMember;
}

export interface UpdateMemberRoleRequest {
  role: ProjectRole;
}

export interface UpdateMemberRoleResponse {
  member: ProjectMember;
}

export interface ProjectAnalyticsSummaryMetrics {
  totalTasks: number;
  completedTasks: number;
  openTasks: number;
  overdueTasks: number;
  memberCount: number;
}

export interface ProjectAnalyticsTimeSeriesPoint {
  date: string;
  completed: number;
  created: number;
}

export interface ProjectAnalyticsStatusBreakdown {
  status: string;
  count: number;
}

export interface ProjectAnalytics {
  summary: ProjectAnalyticsSummaryMetrics;
  timeSeries: ProjectAnalyticsTimeSeriesPoint[];
  statusBreakdown: ProjectAnalyticsStatusBreakdown[];
}

export interface ProjectAnalyticsDateRange {
  from: string;
  to: string;
}

export type TaskStatus = 'done' | 'open';

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly';

export interface RecurringRule {
  frequency: RecurringFrequency;
  interval: number;
  endDate: string | null;
}

export interface TaskDependency {
  id: string;
  taskId: string;
  dependsOnTaskId: string;
}

export type TaskHistoryAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'duplicated'
  | 'status_changed'
  | 'dependency_added'
  | 'dependency_removed';

export interface TaskHistoryEntry {
  id: string;
  taskId: string;
  action: TaskHistoryAction;
  description: string;
  actorName: string;
  createdAt: string;
  changes?: Record<string, { from: unknown; to: unknown }>;
}

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  milestoneId: string | null;
  parentTaskId?: string | null;
  description?: string;
  dueDate?: string | null;
  recurringRule?: RecurringRule | null;
}

export interface TaskHierarchyNode extends Task {
  subtasks: TaskHierarchyNode[];
}

export interface TaskTemplate {
  id: string;
  title: string;
  description: string;
  defaultStatus: TaskStatus;
}

export interface CreateTaskRequest {
  title: string;
  status?: TaskStatus;
  milestoneId?: string | null;
  parentTaskId?: string | null;
  description?: string;
  dueDate?: string | null;
  recurringRule?: RecurringRule | null;
}

export interface UpdateTaskRequest {
  title?: string;
  status?: TaskStatus;
  milestoneId?: string | null;
  parentTaskId?: string | null;
  description?: string;
  dueDate?: string | null;
  recurringRule?: RecurringRule | null;
}

export interface DuplicateTaskRequest {
  title?: string;
  includeSubtasks?: boolean;
}

export interface CreateTaskFromTemplateRequest {
  templateId: string;
  title?: string;
  milestoneId?: string | null;
  parentTaskId?: string | null;
}

export type BulkTaskAction = 'delete' | 'update_status';

export interface BulkTaskActionRequest {
  taskIds: string[];
  action: BulkTaskAction;
  status?: TaskStatus;
}

export interface BulkTaskActionResponse {
  affectedCount: number;
  tasks: Task[];
}

export interface AddTaskDependencyRequest {
  dependsOnTaskId: string;
}

export interface TaskHierarchyResponse {
  tasks: TaskHierarchyNode[];
}

export interface TaskTemplateListResponse {
  templates: TaskTemplate[];
}

export interface TaskHistoryResponse {
  history: TaskHistoryEntry[];
}

export interface TaskDependencyResponse {
  dependency: TaskDependency;
}

export interface TaskDependencyListResponse {
  dependencies: TaskDependency[];
}

export interface Milestone {
  id: string;
  title: string;
  dueDate: string;
  progressPercent: number;
  isOverdue: boolean;
}

export interface CreateMilestoneRequest {
  title: string;
  dueDate: string;
}

export interface MilestoneListResponse {
  milestones: Milestone[];
}

export interface TaskListResponse {
  tasks: Task[];
}

export interface LinkTaskToMilestoneRequest {
  milestoneId: string | null;
}
