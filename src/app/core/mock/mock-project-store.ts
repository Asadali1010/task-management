import {
  AddTaskDependencyRequest,
  BulkTaskActionRequest,
  BulkTaskActionResponse,
  CreateTaskFromTemplateRequest,
  CreateTaskRequest,
  DuplicateTaskRequest,
  Milestone,
  ProjectActivity,
  ProjectActivityPageResponse,
  ProjectAnalytics,
  ProjectAnalyticsStatusBreakdown,
  ProjectAnalyticsTimeSeriesPoint,
  ProjectDetail,
  ProjectMember,
  ProjectRole,
  ProjectSummary,
  Task,
  TaskDependency,
  TaskHierarchyNode,
  TaskHistoryEntry,
  TaskTemplate,
  UpdateTaskRequest,
} from '../models/project.models';
import { isRichTextEmpty, normalizeRichTextValue } from '../utils/rich-text-sanitize';
import { MockMilestoneRecord, MockProjectRecord, seedProjects } from './mock-data';

const MAX_ANALYTICS_DAYS = 60;
export const DELETED_TASK_GRACE_PERIOD_DAYS = 30;

export type TaskOperationResult =
  | { kind: 'success'; task: Task }
  | { kind: 'validation_error' }
  | { kind: 'not_found' };

export type AddTaskDependencyResult =
  | { kind: 'success'; dependency: TaskDependency }
  | { kind: 'validation_error' }
  | { kind: 'not_found' };

function cloneRecords(): Record<string, MockProjectRecord> {
  return structuredClone(seedProjects);
}

let store = cloneRecords();
let nextMemberId = 100;
let nextMilestoneId = 100;
let nextTaskId = 100;
let nextHistoryId = 100;
let nextDependencyId = 100;

const DEFAULT_ACTOR = 'Asad Ali';

function getRecord(projectId: string): MockProjectRecord | undefined {
  return store[projectId];
}

function defaultActor(record: MockProjectRecord): string {
  return record.detail.members[0]?.name ?? DEFAULT_ACTOR;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidDueDate(value: unknown): value is string {
  if (!isNonEmptyString(value)) {
    return false;
  }
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function isProjectMember(record: MockProjectRecord, assigneeId: string): boolean {
  return record.detail.members.some((member) => member.id === assigneeId);
}

function isNonEmptyDescription(value: unknown): value is string {
  return typeof value === 'string' && !isRichTextEmpty(value);
}

function validateTaskFields(
  record: MockProjectRecord,
  fields: { title: unknown; description: unknown; assigneeId: unknown; dueDate: unknown },
): boolean {
  return (
    isNonEmptyString(fields.title) &&
    isNonEmptyDescription(fields.description) &&
    isNonEmptyString(fields.assigneeId) &&
    isProjectMember(record, fields.assigneeId) &&
    isValidDueDate(fields.dueDate)
  );
}

function isWithinGracePeriod(deletedAt: string): boolean {
  const graceMs = DELETED_TASK_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() - new Date(deletedAt).getTime() <= graceMs;
}

function purgeExpiredDeletions(record: MockProjectRecord): void {
  const expiredIds = new Set(
    record.tasks
      .filter((taskItem) => taskItem.deletedAt && !isWithinGracePeriod(taskItem.deletedAt))
      .map((taskItem) => taskItem.id),
  );

  if (expiredIds.size === 0) {
    return;
  }

  record.tasks = record.tasks.filter((taskItem) => !expiredIds.has(taskItem.id));
  record.taskDependencies = record.taskDependencies.filter(
    (dependency) =>
      !expiredIds.has(dependency.taskId) && !expiredIds.has(dependency.dependsOnTaskId),
  );
  record.taskHistory = record.taskHistory.filter((entry) => !expiredIds.has(entry.taskId));
}

function activeTasks(record: MockProjectRecord): Task[] {
  purgeExpiredDeletions(record);
  return record.tasks.filter((taskItem) => !taskItem.deletedAt);
}

function recalculateTaskMetrics(record: MockProjectRecord): void {
  const tasks = activeTasks(record);
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((taskItem) => taskItem.status === 'done').length;
  const openTasks = totalTasks - completedTasks;
  const now = startOfDay(new Date());
  const overdueTasks = tasks.filter(
    (taskItem) =>
      taskItem.status === 'open' &&
      taskItem.dueDate !== null &&
      taskItem.dueDate !== undefined &&
      startOfDay(new Date(taskItem.dueDate)) < now,
  ).length;

  record.detail.metrics = {
    ...record.detail.metrics,
    totalTasks,
    completedTasks,
    openTasks,
    overdueTasks,
  };
}

function appendActivity(record: MockProjectRecord, type: string, description: string, actorName: string): void {
  const entry: ProjectActivity = {
    id: `act-${record.detail.metadata.id}-${record.activityLog.length + 1}`,
    type,
    description,
    actorName,
    createdAt: new Date().toISOString(),
  };
  record.activityLog = [entry, ...record.activityLog];
  record.detail.recentActivity = record.activityLog.slice(0, 5);
}

function appendTaskHistory(
  record: MockProjectRecord,
  taskId: string,
  action: TaskHistoryEntry['action'],
  description: string,
  actorName: string,
  changes?: TaskHistoryEntry['changes'],
): TaskHistoryEntry {
  const entry: TaskHistoryEntry = {
    id: `hist-${nextHistoryId++}`,
    taskId,
    action,
    description,
    actorName,
    createdAt: new Date().toISOString(),
    ...(changes ? { changes } : {}),
  };
  record.taskHistory = [entry, ...record.taskHistory];
  return entry;
}

function findTask(record: MockProjectRecord, taskId: string): Task | undefined {
  return activeTasks(record).find((taskItem) => taskItem.id === taskId);
}

function findTaskIncludingDeleted(record: MockProjectRecord, taskId: string): Task | undefined {
  purgeExpiredDeletions(record);
  return record.tasks.find((taskItem) => taskItem.id === taskId);
}

function softDeleteTask(record: MockProjectRecord, taskId: string, deletedAt: string): void {
  record.tasks = record.tasks.map((taskItem) =>
    taskItem.id === taskId ? { ...taskItem, deletedAt } : taskItem,
  );
}

function collectDescendantTaskIds(record: MockProjectRecord, rootTaskId: string): string[] {
  const ids: string[] = [];
  const queue = [rootTaskId];
  const tasks = activeTasks(record);

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId) {
      continue;
    }
    ids.push(currentId);
    tasks
      .filter((taskItem) => taskItem.parentTaskId === currentId)
      .forEach((taskItem) => queue.push(taskItem.id));
  }

  return ids;
}

function buildHierarchy(tasks: Task[], parentId: string | null = null): TaskHierarchyNode[] {
  return tasks
    .filter((taskItem) => (taskItem.parentTaskId ?? null) === parentId)
    .map((taskItem) => ({
      ...taskItem,
      subtasks: buildHierarchy(tasks, taskItem.id),
    }));
}

function toSummary(record: MockProjectRecord): ProjectSummary {
  const { metadata, viewerRole } = record.detail;
  return {
    id: metadata.id,
    name: metadata.name,
    description: metadata.description,
    status: metadata.status,
    createdAt: metadata.createdAt,
    updatedAt: metadata.updatedAt,
    archivedAt: metadata.archivedAt,
    viewerRole,
  };
}

function hashToUnitInterval(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return (hash % 1000) / 1000;
}

export function listProjects(archived: boolean): ProjectSummary[] {
  return Object.values(store)
    .filter((record) => (record.detail.metadata.archivedAt !== null) === archived)
    .map(toSummary);
}

export function getProjectDetail(id: string): ProjectDetail | undefined {
  return store[id]?.detail;
}

export function getProjectActivity(
  id: string,
  page: number,
  pageSize: number,
): ProjectActivityPageResponse | undefined {
  const record = store[id];
  if (!record) {
    return undefined;
  }

  const start = (page - 1) * pageSize;
  const activities = record.activityLog.slice(start, start + pageSize);

  return {
    activities,
    page,
    pageSize,
    totalCount: record.activityLog.length,
    hasMore: start + pageSize < record.activityLog.length,
  };
}

export function getProjectAnalytics(
  id: string,
  from: string,
  to: string,
): ProjectAnalytics | undefined {
  const record = store[id];
  if (!record) {
    return undefined;
  }

  const { metrics } = record.detail;
  const timeSeries = buildTimeSeries(id, from, to);
  const statusBreakdown: ProjectAnalyticsStatusBreakdown[] = [
    { status: 'done', count: metrics.completedTasks },
    { status: 'in_progress', count: Math.round(metrics.openTasks * 0.6) },
    { status: 'todo', count: metrics.openTasks - Math.round(metrics.openTasks * 0.6) },
    { status: 'blocked', count: metrics.overdueTasks },
  ].filter((entry) => entry.count > 0);

  return { summary: { ...metrics }, timeSeries, statusBreakdown };
}

function buildTimeSeries(
  projectId: string,
  from: string,
  to: string,
): ProjectAnalyticsTimeSeriesPoint[] {
  const start = new Date(from);
  const end = new Date(to);
  const points: ProjectAnalyticsTimeSeriesPoint[] = [];

  for (
    let cursor = new Date(start), count = 0;
    cursor <= end && count < MAX_ANALYTICS_DAYS;
    cursor.setDate(cursor.getDate() + 1), count++
  ) {
    const dateKey = cursor.toISOString().slice(0, 10);
    const seed = hashToUnitInterval(`${projectId}:${dateKey}`);
    points.push({
      date: dateKey,
      completed: Math.round(seed * 5),
      created: Math.round(hashToUnitInterval(`${dateKey}:${projectId}`) * 4),
    });
  }

  return points;
}

export function archiveProject(id: string): ProjectSummary | undefined {
  const record = store[id];
  if (!record) {
    return undefined;
  }

  const now = new Date().toISOString();
  record.detail.metadata = { ...record.detail.metadata, status: 'archived', archivedAt: now, updatedAt: now };
  return toSummary(record);
}

export function restoreProject(id: string): ProjectSummary | undefined {
  const record = store[id];
  if (!record) {
    return undefined;
  }

  const now = new Date().toISOString();
  record.detail.metadata = { ...record.detail.metadata, status: 'active', archivedAt: null, updatedAt: now };
  return toSummary(record);
}

export function inviteMember(id: string, identifier: string): ProjectMember | undefined {
  const record = store[id];
  if (!record) {
    return undefined;
  }

  const newMember: ProjectMember = {
    id: `mem-${nextMemberId++}`,
    name: identifier.includes('@') ? identifier.split('@')[0] : identifier,
    email: identifier.includes('@') ? identifier : `${identifier}@example.com`,
    role: 'member',
  };

  record.detail.members = [...record.detail.members, newMember];
  record.detail.metrics = { ...record.detail.metrics, memberCount: record.detail.members.length };
  return newMember;
}

export function removeMember(id: string, memberId: string): boolean {
  const record = store[id];
  if (!record) {
    return false;
  }

  const before = record.detail.members.length;
  record.detail.members = record.detail.members.filter((m) => m.id !== memberId);
  record.detail.metrics = { ...record.detail.metrics, memberCount: record.detail.members.length };
  return record.detail.members.length < before;
}

export function updateMemberRole(
  id: string,
  memberId: string,
  role: ProjectRole,
): ProjectMember | undefined {
  const record = store[id];
  if (!record) {
    return undefined;
  }

  let updated: ProjectMember | undefined;
  record.detail.members = record.detail.members.map((m) => {
    if (m.id !== memberId) {
      return m;
    }
    updated = { ...m, role };
    return updated;
  });

  return updated;
}

function startOfDay(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function enrichMilestone(projectId: string, raw: MockMilestoneRecord): Milestone {
  const record = store[projectId];
  const linkedTasks =
    record?.tasks.filter(
      (taskItem) => taskItem.milestoneId === raw.id && !taskItem.deletedAt,
    ) ?? [];
  const completedCount = linkedTasks.filter((taskItem) => taskItem.status === 'done').length;
  const progressPercent =
    linkedTasks.length === 0 ? 0 : Math.round((completedCount / linkedTasks.length) * 100);
  const isOverdue =
    startOfDay(new Date(raw.dueDate)) < startOfDay(new Date()) && progressPercent < 100;

  return {
    id: raw.id,
    title: raw.title,
    dueDate: raw.dueDate,
    progressPercent,
    isOverdue,
  };
}

export function listMilestones(projectId: string): Milestone[] | undefined {
  const record = store[projectId];
  if (!record) {
    return undefined;
  }

  return record.milestones.map((milestone) => enrichMilestone(projectId, milestone));
}

export function createMilestone(
  projectId: string,
  title: string,
  dueDate: string,
): Milestone | undefined {
  const record = store[projectId];
  if (!record) {
    return undefined;
  }

  const raw: MockMilestoneRecord = {
    id: `ms-${nextMilestoneId++}`,
    title,
    dueDate,
  };
  record.milestones = [...record.milestones, raw];
  return enrichMilestone(projectId, raw);
}

export function listTasks(projectId: string): Task[] | undefined {
  const record = store[projectId];
  if (!record) {
    return undefined;
  }

  return activeTasks(record).map((taskItem) => ({ ...taskItem }));
}

export function listDeletedTasks(projectId: string): Task[] | undefined {
  const record = store[projectId];
  if (!record) {
    return undefined;
  }

  purgeExpiredDeletions(record);

  return record.tasks
    .filter((taskItem) => taskItem.deletedAt && isWithinGracePeriod(taskItem.deletedAt))
    .map((taskItem) => ({ ...taskItem }));
}

export function restoreTask(projectId: string, taskId: string): Task | undefined {
  const record = getRecord(projectId);
  if (!record) {
    return undefined;
  }

  const existing = findTaskIncludingDeleted(record, taskId);
  if (!existing?.deletedAt || !isWithinGracePeriod(existing.deletedAt)) {
    return undefined;
  }

  const actor = defaultActor(record);
  const { deletedAt: _removed, ...restoredFields } = existing;
  const restoredTask: Task = { ...restoredFields };

  record.tasks = record.tasks.map((taskItem) =>
    taskItem.id === taskId ? restoredTask : taskItem,
  );
  recalculateTaskMetrics(record);
  appendActivity(record, 'task_restored', `${actor} restored task "${restoredTask.title}"`, actor);
  appendTaskHistory(
    record,
    taskId,
    'updated',
    `Restored task "${restoredTask.title}"`,
    actor,
  );

  return { ...restoredTask };
}

export function linkTaskToMilestone(
  projectId: string,
  taskId: string,
  milestoneId: string | null,
): Task | undefined {
  const record = store[projectId];
  if (!record) {
    return undefined;
  }

  const existing = findTask(record, taskId);
  if (!existing) {
    return undefined;
  }

  if (milestoneId !== null && !record.milestones.some((milestone) => milestone.id === milestoneId)) {
    return undefined;
  }

  const updatedTask: Task = { ...existing, milestoneId };
  record.tasks = record.tasks.map((taskItem) => (taskItem.id === taskId ? updatedTask : taskItem));
  return { ...updatedTask };
}

export function createTask(projectId: string, request: CreateTaskRequest): TaskOperationResult {
  const record = getRecord(projectId);
  if (!record) {
    return { kind: 'not_found' };
  }

  if (
    !validateTaskFields(record, {
      title: request.title,
      description: request.description,
      assigneeId: request.assigneeId,
      dueDate: request.dueDate,
    })
  ) {
    return { kind: 'validation_error' };
  }

  if (request.parentTaskId && !findTask(record, request.parentTaskId)) {
    return { kind: 'not_found' };
  }

  if (
    request.milestoneId &&
    !record.milestones.some((milestone) => milestone.id === request.milestoneId)
  ) {
    return { kind: 'not_found' };
  }

  const actor = defaultActor(record);
  const taskItem: Task = {
    id: `task-${nextTaskId++}`,
    title: request.title.trim(),
    status: request.status ?? 'open',
    milestoneId: request.milestoneId ?? null,
    parentTaskId: request.parentTaskId ?? null,
    description: normalizeRichTextValue(request.description),
    assigneeId: request.assigneeId,
    dueDate: request.dueDate,
    recurringRule: request.recurringRule ?? null,
  };

  record.tasks = [...record.tasks, taskItem];
  recalculateTaskMetrics(record);
  appendActivity(record, 'task_created', `${actor} created task "${taskItem.title}"`, actor);
  appendTaskHistory(
    record,
    taskItem.id,
    'created',
    `Created task "${taskItem.title}"`,
    actor,
  );

  return { kind: 'success', task: { ...taskItem } };
}

export function updateTask(
  projectId: string,
  taskId: string,
  request: UpdateTaskRequest,
): TaskOperationResult {
  const record = getRecord(projectId);
  if (!record) {
    return { kind: 'not_found' };
  }

  const existing = findTask(record, taskId);
  if (!existing) {
    return { kind: 'not_found' };
  }

  const mergedFields = {
    title: request.title !== undefined ? request.title : existing.title,
    description: request.description !== undefined ? request.description : existing.description,
    assigneeId: request.assigneeId !== undefined ? request.assigneeId : existing.assigneeId,
    dueDate: request.dueDate !== undefined ? request.dueDate : existing.dueDate,
  };

  if (!validateTaskFields(record, mergedFields)) {
    return { kind: 'validation_error' };
  }

  if (request.parentTaskId && !findTask(record, request.parentTaskId)) {
    return { kind: 'not_found' };
  }

  if (
    request.milestoneId &&
    !record.milestones.some((milestone) => milestone.id === request.milestoneId)
  ) {
    return { kind: 'not_found' };
  }

  const actor = defaultActor(record);
  const updatedTask: Task = {
    ...existing,
    title: mergedFields.title.trim(),
    description: normalizeRichTextValue(mergedFields.description ?? ''),
    assigneeId: mergedFields.assigneeId,
    dueDate: mergedFields.dueDate ?? null,
    ...(request.status !== undefined ? { status: request.status } : {}),
    ...(request.milestoneId !== undefined ? { milestoneId: request.milestoneId } : {}),
    ...(request.parentTaskId !== undefined ? { parentTaskId: request.parentTaskId } : {}),
    ...(request.recurringRule !== undefined ? { recurringRule: request.recurringRule } : {}),
  };

  record.tasks = record.tasks.map((taskItem) => (taskItem.id === taskId ? updatedTask : taskItem));
  recalculateTaskMetrics(record);

  const changes: TaskHistoryEntry['changes'] = {};
  if (request.title !== undefined && request.title !== existing.title) {
    changes['title'] = { from: existing.title, to: request.title };
  }
  if (request.status !== undefined && request.status !== existing.status) {
    changes['status'] = { from: existing.status, to: request.status };
    appendTaskHistory(
      record,
      taskId,
      'status_changed',
      `Changed status from ${existing.status} to ${request.status}`,
      actor,
      { status: { from: existing.status, to: request.status } },
    );
  } else {
    appendTaskHistory(
      record,
      taskId,
      'updated',
      `Updated task "${updatedTask.title}"`,
      actor,
      Object.keys(changes).length > 0 ? changes : undefined,
    );
  }

  appendActivity(record, 'task_updated', `${actor} updated task "${updatedTask.title}"`, actor);
  return { kind: 'success', task: { ...updatedTask } };
}

export function deleteTask(projectId: string, taskId: string): boolean {
  const record = getRecord(projectId);
  if (!record) {
    return false;
  }

  const existing = findTask(record, taskId);
  if (!existing) {
    return false;
  }

  const actor = defaultActor(record);
  const deletedAt = new Date().toISOString();
  const idsToSoftDelete = new Set(collectDescendantTaskIds(record, taskId));

  for (const id of idsToSoftDelete) {
    softDeleteTask(record, id, deletedAt);
  }

  recalculateTaskMetrics(record);
  appendActivity(record, 'task_deleted', `${actor} deleted task "${existing.title}"`, actor);
  appendTaskHistory(record, taskId, 'deleted', `Deleted task "${existing.title}"`, actor);

  return true;
}

export function duplicateTask(
  projectId: string,
  taskId: string,
  request: DuplicateTaskRequest = {},
): Task | undefined {
  const record = getRecord(projectId);
  if (!record) {
    return undefined;
  }

  const source = findTask(record, taskId);
  if (!source) {
    return undefined;
  }

  return duplicateTaskWithParent(projectId, source, request, source.parentTaskId ?? null, true);
}

function duplicateTaskWithParent(
  projectId: string,
  source: Task,
  request: DuplicateTaskRequest,
  parentTaskId: string | null,
  isRoot: boolean,
): Task | undefined {
  const record = getRecord(projectId);
  if (!record) {
    return undefined;
  }

  const actor = defaultActor(record);
  const duplicateTitle = isRoot && request.title ? request.title : `${source.title} (copy)`;
  const createResult = createTask(projectId, {
    title: duplicateTitle,
    status: source.status,
    milestoneId: source.milestoneId,
    parentTaskId,
    description: source.description ?? '',
    assigneeId: source.assigneeId,
    dueDate: source.dueDate ?? new Date().toISOString(),
    recurringRule: source.recurringRule ?? null,
  });

  if (createResult.kind !== 'success') {
    return undefined;
  }

  const duplicate = createResult.task;

  appendTaskHistory(
    record,
    duplicate.id,
    'duplicated',
    `Duplicated from task "${source.title}"`,
    actor,
  );

  if (request.includeSubtasks) {
    const subtasks = activeTasks(record).filter((taskItem) => taskItem.parentTaskId === source.id);
    for (const subtask of subtasks) {
      duplicateTaskWithParent(projectId, subtask, {}, duplicate.id, false);
    }
  }

  return getTask(projectId, duplicate.id);
}

export function getTaskHierarchy(projectId: string): TaskHierarchyNode[] | undefined {
  const record = getRecord(projectId);
  if (!record) {
    return undefined;
  }

  return buildHierarchy(activeTasks(record));
}

export function listTaskTemplates(projectId: string): TaskTemplate[] | undefined {
  const record = getRecord(projectId);
  if (!record) {
    return undefined;
  }

  return record.taskTemplates.map((template) => ({ ...template }));
}

export function createTaskFromTemplate(
  projectId: string,
  request: CreateTaskFromTemplateRequest,
): Task | undefined {
  const record = getRecord(projectId);
  if (!record) {
    return undefined;
  }

  const template = record.taskTemplates.find((item) => item.id === request.templateId);
  if (!template) {
    return undefined;
  }

  const defaultMemberId = record.detail.members[0]?.id;
  if (!defaultMemberId) {
    return undefined;
  }

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 14);

  const createResult = createTask(projectId, {
    title: request.title ?? template.title,
    status: template.defaultStatus,
    description: template.description,
    assigneeId: defaultMemberId,
    dueDate: dueDate.toISOString(),
    milestoneId: request.milestoneId ?? null,
    parentTaskId: request.parentTaskId ?? null,
  });

  return createResult.kind === 'success' ? createResult.task : undefined;
}

export function bulkTaskAction(
  projectId: string,
  request: BulkTaskActionRequest,
): BulkTaskActionResponse | undefined {
  const record = getRecord(projectId);
  if (!record) {
    return undefined;
  }

  const uniqueTaskIds = [...new Set(request.taskIds)];
  const existingIds = uniqueTaskIds.filter((id) => findTask(record, id));
  if (existingIds.length === 0) {
    return { affectedCount: 0, tasks: [] };
  }

  if (request.action === 'delete') {
    const idsToSoftDelete = new Set<string>();
    for (const id of existingIds) {
      collectDescendantTaskIds(record, id).forEach((descendantId) =>
        idsToSoftDelete.add(descendantId),
      );
    }

    const actor = defaultActor(record);
    const deletedAt = new Date().toISOString();
    const removedTasks = activeTasks(record).filter((taskItem) => idsToSoftDelete.has(taskItem.id));

    for (const id of idsToSoftDelete) {
      softDeleteTask(record, id, deletedAt);
    }

    for (const taskItem of removedTasks) {
      appendTaskHistory(record, taskItem.id, 'deleted', `Deleted task "${taskItem.title}"`, actor);
    }

    recalculateTaskMetrics(record);
    if (removedTasks.length > 0) {
      appendActivity(
        record,
        'task_deleted',
        `${actor} deleted ${removedTasks.length} task(s)`,
        actor,
      );
    }

    return { affectedCount: removedTasks.length, tasks: listTasks(projectId) ?? [] };
  }

  if (request.action === 'update_status' && request.status) {
    const updatedTasks: Task[] = [];
    for (const id of existingIds) {
      const result = updateTask(projectId, id, { status: request.status });
      if (result.kind === 'success') {
        updatedTasks.push(result.task);
      }
    }
    return { affectedCount: updatedTasks.length, tasks: updatedTasks };
  }

  return { affectedCount: 0, tasks: [] };
}

function isValidLinkType(value: unknown): value is TaskDependency['linkType'] {
  return value === 'blocks' || value === 'relates_to';
}

function hasDirectCircularBlocks(
  dependencies: TaskDependency[],
  taskId: string,
  dependsOnTaskId: string,
): boolean {
  return dependencies.some(
    (dependency) =>
      dependency.linkType === 'blocks' &&
      dependency.taskId === dependsOnTaskId &&
      dependency.dependsOnTaskId === taskId,
  );
}

export function addTaskDependency(
  projectId: string,
  taskId: string,
  request: AddTaskDependencyRequest,
): AddTaskDependencyResult {
  const record = getRecord(projectId);
  if (!record) {
    return { kind: 'not_found' };
  }

  if (!findTask(record, taskId) || !findTask(record, request.dependsOnTaskId)) {
    return { kind: 'not_found' };
  }

  if (!isValidLinkType(request.linkType)) {
    return { kind: 'validation_error' };
  }

  if (taskId === request.dependsOnTaskId) {
    return { kind: 'validation_error' };
  }

  const alreadyExists = record.taskDependencies.some(
    (dependency) =>
      dependency.taskId === taskId && dependency.dependsOnTaskId === request.dependsOnTaskId,
  );
  if (alreadyExists) {
    return { kind: 'validation_error' };
  }

  if (
    request.linkType === 'blocks' &&
    hasDirectCircularBlocks(record.taskDependencies, taskId, request.dependsOnTaskId)
  ) {
    return { kind: 'validation_error' };
  }

  const actor = defaultActor(record);
  const dependency: TaskDependency = {
    id: `dep-${nextDependencyId++}`,
    taskId,
    dependsOnTaskId: request.dependsOnTaskId,
    linkType: request.linkType,
  };

  record.taskDependencies = [...record.taskDependencies, dependency];
  appendTaskHistory(
    record,
    taskId,
    'dependency_added',
    `Added ${request.linkType} link to task ${request.dependsOnTaskId}`,
    actor,
  );
  appendActivity(record, 'task_dependency_added', `${actor} added a task dependency`, actor);

  return { kind: 'success', dependency: { ...dependency } };
}

export function removeTaskDependency(
  projectId: string,
  taskId: string,
  dependencyId: string,
): boolean {
  const record = getRecord(projectId);
  if (!record) {
    return false;
  }

  const dependency = record.taskDependencies.find(
    (item) => item.id === dependencyId && item.taskId === taskId,
  );
  if (!dependency) {
    return false;
  }

  const actor = defaultActor(record);
  record.taskDependencies = record.taskDependencies.filter((item) => item.id !== dependencyId);
  appendTaskHistory(
    record,
    taskId,
    'dependency_removed',
    `Removed dependency on task ${dependency.dependsOnTaskId}`,
    actor,
  );
  appendActivity(record, 'task_dependency_removed', `${actor} removed a task dependency`, actor);

  return true;
}

export function getTaskHistory(projectId: string, taskId: string): TaskHistoryEntry[] | undefined {
  const record = getRecord(projectId);
  if (!record || !findTask(record, taskId)) {
    return undefined;
  }

  return record.taskHistory
    .filter((entry) => entry.taskId === taskId)
    .map((entry) => ({ ...entry }));
}

export function getTask(projectId: string, taskId: string): Task | undefined {
  const record = getRecord(projectId);
  const taskItem = record ? findTask(record, taskId) : undefined;
  return taskItem ? { ...taskItem } : undefined;
}

export function listTaskDependencies(projectId: string): TaskDependency[] | undefined {
  const record = getRecord(projectId);
  if (!record) {
    return undefined;
  }

  return record.taskDependencies.map((dependency) => ({ ...dependency }));
}

export function resetMockStore(): void {
  store = cloneRecords();
  nextMemberId = 100;
  nextMilestoneId = 100;
  nextTaskId = 100;
  nextHistoryId = 100;
  nextDependencyId = 100;
}
