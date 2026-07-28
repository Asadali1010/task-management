import {
  ProjectActivity,
  ProjectDetail,
  ProjectMember,
  Task,
  TaskDependency,
  TaskHistoryEntry,
  TaskStatus,
  TaskTemplate,
} from '../models/project.models';

export interface MockMilestoneRecord {
  id: string;
  title: string;
  dueDate: string;
}

export interface MockProjectRecord {
  detail: ProjectDetail;
  activityLog: ProjectActivity[];
  tasks: Task[];
  milestones: MockMilestoneRecord[];
  taskTemplates: TaskTemplate[];
  taskHistory: TaskHistoryEntry[];
  taskDependencies: TaskDependency[];
}

function daysAgoIso(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function daysFromNowIso(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function task(
  id: string,
  title: string,
  status: TaskStatus,
  milestoneId: string | null = null,
  options: {
    assigneeId: string;
    parentTaskId?: string | null;
    description?: string;
    dueDate?: string | null;
    recurringRule?: Task['recurringRule'];
    deletedAt?: string | null;
  },
): Task {
  const result: Task = {
    id,
    title,
    status,
    milestoneId,
    assigneeId: options.assigneeId,
    description: options.description ?? '',
    dueDate: options.dueDate ?? daysFromNowIso(14),
  };

  if (options.parentTaskId !== undefined) {
    result.parentTaskId = options.parentTaskId;
  }
  if (options.recurringRule !== undefined) {
    result.recurringRule = options.recurringRule;
  }
  if (options.deletedAt !== undefined) {
    result.deletedAt = options.deletedAt;
  }

  return result;
}

function taskTemplate(
  id: string,
  title: string,
  description: string,
  defaultStatus: TaskStatus = 'open',
): TaskTemplate {
  return { id, title, description, defaultStatus };
}

function taskHistoryEntry(
  id: string,
  taskId: string,
  action: TaskHistoryEntry['action'],
  description: string,
  actorName: string,
  daysAgo: number,
): TaskHistoryEntry {
  return {
    id,
    taskId,
    action,
    description,
    actorName,
    createdAt: daysAgoIso(daysAgo),
  };
}

function taskDependency(id: string, taskId: string, dependsOnTaskId: string): TaskDependency {
  return { id, taskId, dependsOnTaskId };
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
    tasks: [
      task('task-1', 'Update homepage hero', 'done', 'ms-1', {
        assigneeId: 'mem-1',
        description: 'Refresh the homepage hero section with new brand assets.',
        dueDate: daysAgoIso(7),
      }),
      task('task-2', 'Implement responsive navigation', 'done', 'ms-1', {
        assigneeId: 'mem-2',
        description: 'Build a mobile-first navigation component.',
        dueDate: daysAgoIso(3),
      }),
      task('task-3', 'Write launch blog post', 'open', 'ms-1', {
        assigneeId: 'mem-3',
        description: 'Draft and publish the product launch announcement.',
        dueDate: daysFromNowIso(10),
      }),
      task('task-3a', 'Draft blog outline', 'done', 'ms-1', {
        assigneeId: 'mem-3',
        parentTaskId: 'task-3',
        description: 'Outline key sections for the launch blog post.',
        dueDate: daysAgoIso(2),
      }),
      task('task-3b', 'Review blog draft', 'open', 'ms-1', {
        assigneeId: 'mem-2',
        parentTaskId: 'task-3',
        description: 'Review and approve the blog post draft.',
        dueDate: daysFromNowIso(5),
      }),
      task('task-4', 'Migrate legacy blog content', 'done', 'ms-2', {
        assigneeId: 'mem-1',
        description: 'Move archived blog posts to the new CMS.',
        dueDate: daysAgoIso(15),
      }),
      task('task-5', 'Redirect old URLs', 'open', 'ms-2', {
        assigneeId: 'mem-2',
        description: 'Configure 301 redirects for legacy blog URLs.',
        dueDate: daysFromNowIso(7),
      }),
      task('task-6', 'Audit accessibility', 'open', null, {
        assigneeId: 'mem-3',
        description: 'Run WCAG audit on key marketing pages.',
        dueDate: daysFromNowIso(21),
      }),
    ],
    milestones: [
      { id: 'ms-1', title: 'Homepage Launch', dueDate: daysFromNowIso(14) },
      { id: 'ms-2', title: 'Content Migration', dueDate: daysAgoIso(10) },
    ],
    taskTemplates: [
      taskTemplate('tpl-1', 'Bug fix', 'Investigate and resolve a reported defect.', 'open'),
      taskTemplate('tpl-2', 'Design review', 'Review designs with stakeholders before implementation.', 'open'),
    ],
    taskHistory: [
      taskHistoryEntry('hist-1', 'task-1', 'created', 'Created task "Update homepage hero"', 'Asad Ali', 14),
      taskHistoryEntry('hist-2', 'task-1', 'status_changed', 'Marked task as done', 'Asad Ali', 7),
      taskHistoryEntry('hist-3', 'task-3', 'created', 'Created task "Write launch blog post"', 'Priya Nair', 5),
    ],
    taskDependencies: [
      taskDependency('dep-1', 'task-5', 'task-4'),
    ],
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
    tasks: [
      task('task-7', 'Build onboarding flow', 'done', 'ms-3', {
        assigneeId: 'mem-1',
        description: 'Design and implement the first-run onboarding screens.',
        dueDate: daysAgoIso(5),
      }),
      task('task-8', 'Integrate push notifications', 'open', 'ms-3', {
        assigneeId: 'mem-4',
        description: 'Wire up FCM/APNs for transactional push alerts.',
        dueDate: daysFromNowIso(14),
      }),
      task('task-9', 'Submit to app store', 'open', null, {
        assigneeId: 'mem-1',
        description: 'Prepare store listings and submit for review.',
        dueDate: daysFromNowIso(28),
      }),
    ],
    milestones: [
      { id: 'ms-3', title: 'Beta Release', dueDate: daysFromNowIso(21) },
    ],
    taskTemplates: [
      taskTemplate('tpl-3', 'Feature spike', 'Time-boxed exploration of a new feature idea.', 'open'),
    ],
    taskHistory: [
      taskHistoryEntry('hist-4', 'task-7', 'created', 'Created task "Build onboarding flow"', 'Asad Ali', 10),
    ],
    taskDependencies: [
      taskDependency('dep-2', 'task-9', 'task-8'),
    ],
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
    tasks: [
      task('task-10', 'Export mainframe records', 'done', 'ms-4', {
        assigneeId: 'mem-1',
        description: 'Extract all ticket records from the legacy mainframe.',
        dueDate: daysAgoIso(120),
      }),
      task('task-11', 'Validate data integrity', 'done', 'ms-4', {
        assigneeId: 'mem-2',
        description: 'Verify migrated records match source system counts.',
        dueDate: daysAgoIso(100),
      }),
    ],
    milestones: [
      { id: 'ms-4', title: 'Data Cutover', dueDate: daysAgoIso(90) },
    ],
    taskTemplates: [],
    taskHistory: [],
    taskDependencies: [],
  },
};
