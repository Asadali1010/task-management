import {
  ProjectActivityPageResponse,
  ProjectAnalytics,
  ProjectAnalyticsStatusBreakdown,
  ProjectAnalyticsTimeSeriesPoint,
  ProjectDetail,
  ProjectMember,
  ProjectRole,
  ProjectSummary,
} from '../models/project.models';
import { MockProjectRecord, seedProjects } from './mock-data';

const MAX_ANALYTICS_DAYS = 60;

function cloneRecords(): Record<string, MockProjectRecord> {
  return structuredClone(seedProjects);
}

let store = cloneRecords();
let nextMemberId = 100;

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

export function resetMockStore(): void {
  store = cloneRecords();
  nextMemberId = 100;
}
