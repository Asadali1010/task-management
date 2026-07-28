import { ProjectActivity, ProjectDetail, ProjectMember } from '../models/project.models';

export interface MockProjectRecord {
  detail: ProjectDetail;
  activityLog: ProjectActivity[];
}

function daysAgoIso(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function member(
  id: string,
  name: string,
  email: string,
  role: ProjectMember['role'],
): ProjectMember {
  return { id, name, email, role };
}

function activity(
  id: string,
  type: string,
  description: string,
  actorName: string,
  daysAgo: number,
): ProjectActivity {
  return { id, type, description, actorName, createdAt: daysAgoIso(daysAgo) };
}

function buildActivityLog(projectName: string, actors: string[], count: number): ProjectActivity[] {
  const templates = [
    (actor: string) => `${actor} completed a task in ${projectName}`,
    (actor: string) => `${actor} moved a task to In Progress`,
    (actor: string) => `${actor} commented on a task`,
    (actor: string) => `${actor} created a new task`,
    (actor: string) => `${actor} marked a task overdue`,
  ];
  const types = ['task_completed', 'task_moved', 'task_commented', 'task_created', 'task_overdue'];

  return Array.from({ length: count }, (_, index) => {
    const actor = actors[index % actors.length];
    const templateIndex = index % templates.length;
    return activity(
      `act-${projectName.slice(0, 3).toLowerCase()}-${index + 1}`,
      types[templateIndex],
      templates[templateIndex](actor),
      actor,
      index,
    );
  });
}

const websiteMembers: ProjectMember[] = [
  member('mem-1', 'Asad Ali', 'saddi.buddy@gmail.com', 'owner'),
  member('mem-2', 'Priya Nair', 'priya@example.com', 'admin'),
  member('mem-3', 'Jordan Lee', 'jordan@example.com', 'member'),
];

const mobileMembers: ProjectMember[] = [
  member('mem-1', 'Asad Ali', 'saddi.buddy@gmail.com', 'owner'),
  member('mem-4', 'Sam Chen', 'sam@example.com', 'member'),
];

const legacyMembers: ProjectMember[] = [
  member('mem-1', 'Asad Ali', 'saddi.buddy@gmail.com', 'owner'),
  member('mem-2', 'Priya Nair', 'priya@example.com', 'member'),
];

export const seedProjects: Record<string, MockProjectRecord> = {
  'proj-1': {
    detail: {
      metadata: {
        id: 'proj-1',
        name: 'Website Redesign',
        description: 'Refresh the marketing site with the new brand system.',
        status: 'active',
        createdAt: daysAgoIso(60),
        updatedAt: daysAgoIso(1),
        archivedAt: null,
      },
      members: websiteMembers,
      recentActivity: buildActivityLog(
        'Website Redesign',
        websiteMembers.map((m) => m.name),
        5,
      ),
      metrics: { totalTasks: 42, completedTasks: 28, openTasks: 14, overdueTasks: 3, memberCount: 3 },
      viewerRole: 'owner',
    },
    activityLog: buildActivityLog(
      'Website Redesign',
      websiteMembers.map((m) => m.name),
      24,
    ),
  },
  'proj-2': {
    detail: {
      metadata: {
        id: 'proj-2',
        name: 'Mobile App Launch',
        description: 'Ship v1 of the companion mobile app.',
        status: 'active',
        createdAt: daysAgoIso(30),
        updatedAt: daysAgoIso(2),
        archivedAt: null,
      },
      members: mobileMembers,
      recentActivity: buildActivityLog(
        'Mobile App Launch',
        mobileMembers.map((m) => m.name),
        5,
      ),
      metrics: { totalTasks: 18, completedTasks: 5, openTasks: 13, overdueTasks: 1, memberCount: 2 },
      viewerRole: 'owner',
    },
    activityLog: buildActivityLog(
      'Mobile App Launch',
      mobileMembers.map((m) => m.name),
      12,
    ),
  },
  'proj-3': {
    detail: {
      metadata: {
        id: 'proj-3',
        name: 'Legacy System Migration',
        description: 'Migrate the old ticketing system off the mainframe.',
        status: 'archived',
        createdAt: daysAgoIso(400),
        updatedAt: daysAgoIso(90),
        archivedAt: daysAgoIso(90),
      },
      members: legacyMembers,
      recentActivity: buildActivityLog(
        'Legacy System Migration',
        legacyMembers.map((m) => m.name),
        3,
      ),
      metrics: { totalTasks: 96, completedTasks: 96, openTasks: 0, overdueTasks: 0, memberCount: 2 },
      viewerRole: 'owner',
    },
    activityLog: buildActivityLog(
      'Legacy System Migration',
      legacyMembers.map((m) => m.name),
      10,
    ),
  },
};
