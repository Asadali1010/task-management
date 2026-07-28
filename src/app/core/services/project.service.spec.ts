import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { InviteMemberResponse, ProjectDetail } from '../models/project.models';
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

  it('should fetch project detail by id', () => {
    service.getProjectDetail('proj-1').subscribe((detail) => {
      expect(detail).toEqual(mockProjectDetail);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/projects/proj-1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockProjectDetail);
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
});
