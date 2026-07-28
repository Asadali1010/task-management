import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import {
  ArchiveProjectResponse,
  InviteMemberResponse,
  Milestone,
  MilestoneListResponse,
  ProjectActivityPageResponse,
  ProjectAnalytics,
  ProjectDetail,
  ProjectListResponse,
  ProjectSummary,
  RestoreProjectResponse,
  Task,
  TaskListResponse,
  UpdateMemberRoleResponse,
} from '../models/project.models';
import { ProjectService } from './project.service';

describe('ProjectService', () => {
  let service: ProjectService;
  let httpMock: HttpTestingController;

  const mockProjectDetail: ProjectDetail = {
    metadata: {
      id: 'proj-1',
      name: 'Website Redesign',
      description: 'Redesign the company website',
      status: 'active',
      createdAt: '2026-01-15T10:00:00Z',
      updatedAt: '2026-07-20T14:30:00Z',
      archivedAt: null,
    },
    members: [
      {
        id: 'user-1',
        name: 'Jane Doe',
        email: 'jane@example.com',
        role: 'owner',
      },
      {
        id: 'user-2',
        name: 'John Smith',
        email: 'john@example.com',
        role: 'member',
      },
    ],
    recentActivity: [
      {
        id: 'act-1',
        type: 'task_completed',
        description: 'Completed task "Update homepage hero"',
        actorName: 'Jane Doe',
        createdAt: '2026-07-28T09:00:00Z',
      },
    ],
    metrics: {
      totalTasks: 24,
      completedTasks: 18,
      openTasks: 6,
      overdueTasks: 2,
      memberCount: 2,
    },
    viewerRole: 'owner',
  };

  const mockInviteResponse: InviteMemberResponse = {
    member: {
      id: 'user-3',
      name: 'Alex Rivera',
      email: 'alex@example.com',
      role: 'member',
    },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(ProjectService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  const mockProjectSummary: ProjectSummary = {
    id: 'proj-1',
    name: 'Website Redesign',
    description: 'Redesign the company website',
    status: 'active',
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: '2026-07-20T14:30:00Z',
    archivedAt: null,
    viewerRole: 'owner',
  };

  const mockProjectListResponse: ProjectListResponse = {
    projects: [mockProjectSummary],
  };

  it('should fetch active projects by default', () => {
    service.getProjects().subscribe((response) => {
      expect(response).toEqual(mockProjectListResponse);
    });

    const req = httpMock.expectOne(
      (request) =>
        request.url === `${environment.apiUrl}/projects` &&
        request.params.get('archived') === 'false',
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockProjectListResponse);
  });

  it('should fetch archived projects when archived option is true', () => {
    const archivedSummary: ProjectSummary = {
      ...mockProjectSummary,
      archivedAt: '2026-07-25T12:00:00Z',
    };
    const archivedListResponse: ProjectListResponse = { projects: [archivedSummary] };

    service.getProjects({ archived: true }).subscribe((response) => {
      expect(response).toEqual(archivedListResponse);
    });

    const req = httpMock.expectOne(
      (request) =>
        request.url === `${environment.apiUrl}/projects` &&
        request.params.get('archived') === 'true',
    );
    expect(req.request.method).toBe('GET');
    req.flush(archivedListResponse);
  });

  it('should archive a project', () => {
    const mockArchiveResponse: ArchiveProjectResponse = {
      project: {
        ...mockProjectSummary,
        archivedAt: '2026-07-28T10:00:00Z',
      },
    };

    service.archiveProject('proj-1').subscribe((response) => {
      expect(response).toEqual(mockArchiveResponse);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/projects/proj-1/archive`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush(mockArchiveResponse);
  });

  it('should restore a project', () => {
    const mockRestoreResponse: RestoreProjectResponse = {
      project: mockProjectSummary,
    };

    service.restoreProject('proj-1').subscribe((response) => {
      expect(response).toEqual(mockRestoreResponse);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/projects/proj-1/restore`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush(mockRestoreResponse);
  });

  it('should fetch project detail by id', () => {
    service.getProjectDetail('proj-1').subscribe((detail) => {
      expect(detail).toEqual(mockProjectDetail);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/projects/proj-1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockProjectDetail);
  });

  const mockProjectActivityPage: ProjectActivityPageResponse = {
    activities: [
      {
        id: 'act-1',
        type: 'task_completed',
        description: 'Completed task "Update homepage hero"',
        actorName: 'Jane Doe',
        createdAt: '2026-07-28T09:00:00Z',
      },
      {
        id: 'act-2',
        type: 'task_moved',
        description: 'Alex moved Task X to Done',
        actorName: 'Alex Rivera',
        createdAt: '2026-07-27T16:30:00Z',
      },
    ],
    page: 1,
    pageSize: 20,
    totalCount: 42,
    hasMore: true,
  };

  it('should fetch paginated project activity with page and pageSize params', () => {
    service.getProjectActivity('proj-1', { page: 1, pageSize: 20 }).subscribe((response) => {
      expect(response.activities).toEqual(mockProjectActivityPage.activities);
      expect(response.page).toBe(mockProjectActivityPage.page);
      expect(response.pageSize).toBe(mockProjectActivityPage.pageSize);
      expect(response.totalCount).toBe(mockProjectActivityPage.totalCount);
      expect(response.hasMore).toBe(mockProjectActivityPage.hasMore);
    });

    const req = httpMock.expectOne(
      (request) =>
        request.url === `${environment.apiUrl}/projects/proj-1/activity` &&
        request.params.get('page') === '1' &&
        request.params.get('pageSize') === '20',
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockProjectActivityPage);
  });

  const mockProjectAnalytics: ProjectAnalytics = {
    summary: {
      totalTasks: 24,
      completedTasks: 18,
      openTasks: 6,
      overdueTasks: 2,
      memberCount: 2,
    },
    timeSeries: [
      { date: '2026-07-01', completed: 2, created: 3 },
      { date: '2026-07-02', completed: 4, created: 1 },
    ],
    statusBreakdown: [
      { status: 'done', count: 18 },
      { status: 'in_progress', count: 4 },
      { status: 'todo', count: 2 },
    ],
  };

  it('should fetch project analytics with ISO date range params', () => {
    const from = '2026-07-01T00:00:00.000Z';
    const to = '2026-07-28T23:59:59.999Z';

    service.getProjectAnalytics('proj-1', { from, to }).subscribe((analytics) => {
      expect(analytics.summary).toEqual(mockProjectAnalytics.summary);
      expect(analytics.timeSeries).toEqual(mockProjectAnalytics.timeSeries);
      expect(analytics.statusBreakdown).toEqual(mockProjectAnalytics.statusBreakdown);
    });

    const req = httpMock.expectOne(
      (request) =>
        request.url === `${environment.apiUrl}/projects/proj-1/analytics` &&
        request.params.get('from') === from &&
        request.params.get('to') === to,
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockProjectAnalytics);
  });

  it('should invite a member by identifier', () => {
    service.inviteMember('proj-1', 'alex@example.com').subscribe((response) => {
      expect(response).toEqual(mockInviteResponse);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/projects/proj-1/members/invite`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ identifier: 'alex@example.com' });
    req.flush(mockInviteResponse);
  });

  const mockUpdateRoleResponse: UpdateMemberRoleResponse = {
    member: {
      id: 'user-2',
      name: 'John Smith',
      email: 'john@example.com',
      role: 'admin',
    },
  };

  it('should update a member role', () => {
    service.updateMemberRole('proj-1', 'user-2', 'admin').subscribe((response) => {
      expect(response).toEqual(mockUpdateRoleResponse);
    });

    const req = httpMock.expectOne(
      `${environment.apiUrl}/projects/proj-1/members/user-2/role`,
    );
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ role: 'admin' });
    req.flush(mockUpdateRoleResponse);
  });

  it('should remove a member by id', () => {
    let completed = false;
    service.removeMember('proj-1', 'user-2').subscribe({
      next: () => {
        completed = true;
      },
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/projects/proj-1/members/user-2`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
    expect(completed).toBe(true);
  });

  const mockMilestones: Milestone[] = [
    {
      id: 'ms-1',
      title: 'Homepage Launch',
      dueDate: '2026-08-15T00:00:00.000Z',
      progressPercent: 67,
      isOverdue: false,
    },
    {
      id: 'ms-2',
      title: 'Content Migration',
      dueDate: '2026-07-10T00:00:00.000Z',
      progressPercent: 50,
      isOverdue: true,
    },
  ];

  const mockMilestoneListResponse: MilestoneListResponse = {
    milestones: mockMilestones,
  };

  it('should list milestones for a project', () => {
    service.listMilestones('proj-1').subscribe((response) => {
      expect(response).toEqual(mockMilestoneListResponse);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/projects/proj-1/milestones`);
    expect(req.request.method).toBe('GET');
    req.flush(mockMilestoneListResponse);
  });

  const mockCreatedMilestone: Milestone = {
    id: 'ms-100',
    title: 'QA Sign-off',
    dueDate: '2026-09-01T00:00:00.000Z',
    progressPercent: 0,
    isOverdue: false,
  };

  it('should create a milestone with title and due date', () => {
    service
      .createMilestone('proj-1', {
        title: 'QA Sign-off',
        dueDate: '2026-09-01T00:00:00.000Z',
      })
      .subscribe((response) => {
        expect(response).toEqual(mockCreatedMilestone);
      });

    const req = httpMock.expectOne(`${environment.apiUrl}/projects/proj-1/milestones`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      title: 'QA Sign-off',
      dueDate: '2026-09-01T00:00:00.000Z',
    });
    req.flush(mockCreatedMilestone);
  });

  const mockTaskListResponse: TaskListResponse = {
    tasks: [
      {
        id: 'task-1',
        title: 'Update homepage hero',
        status: 'done',
        milestoneId: 'ms-1',
      },
      {
        id: 'task-3',
        title: 'Write launch blog post',
        status: 'open',
        milestoneId: 'ms-1',
      },
    ],
  };

  it('should list tasks for a project', () => {
    service.listTasks('proj-1').subscribe((response) => {
      expect(response).toEqual(mockTaskListResponse);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/projects/proj-1/tasks`);
    expect(req.request.method).toBe('GET');
    req.flush(mockTaskListResponse);
  });

  const mockLinkedTask: Task = {
    id: 'task-6',
    title: 'Audit accessibility',
    status: 'open',
    milestoneId: 'ms-1',
  };

  it('should link a task to a milestone', () => {
    service.linkTaskToMilestone('proj-1', 'task-6', 'ms-1').subscribe((response) => {
      expect(response).toEqual(mockLinkedTask);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/projects/proj-1/tasks/task-6`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ milestoneId: 'ms-1' });
    req.flush(mockLinkedTask);
  });
});
