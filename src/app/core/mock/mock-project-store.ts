import {
  Milestone,
  ProjectActivityPageResponse,
  ProjectAnalytics,
  ProjectAnalyticsStatusBreakdown,
  ProjectAnalyticsTimeSeriesPoint,
  ProjectDetail,
  ProjectMember,
  ProjectRole,
  ProjectSummary,
  Task,
} from '../models/project.models';
import { MockMilestoneRecord, MockProjectRecord, seedProjects } from './mock-data';

const MAX_ANALYTICS_DAYS = 60;

function cloneRecords(): Record<string, MockProjectRecord> {
  return structuredClone(seedProjects);
}

let store = cloneRecords();
let nextMemberId = 100;
let nextMilestoneId = 100;

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
  const linkedTasks = record?.tasks.filter((taskItem) => taskItem.milestoneId === raw.id) ?? [];
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

  return record.tasks.map((taskItem) => ({ ...taskItem }));
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

  const taskIndex = record.tasks.findIndex((taskItem) => taskItem.id === taskId);
  if (taskIndex === -1) {
    return undefined;
  }

  if (milestoneId !== null && !record.milestones.some((milestone) => milestone.id === milestoneId)) {
    return undefined;
  }

  const updatedTask: Task = { ...record.tasks[taskIndex], milestoneId };
  record.tasks = record.tasks.map((taskItem) => (taskItem.id === taskId ? updatedTask : taskItem));
  return { ...updatedTask };
}

export function resetMockStore(): void {
  store = cloneRecords();
  nextMemberId = 100;
  nextMilestoneId = 100;
}
