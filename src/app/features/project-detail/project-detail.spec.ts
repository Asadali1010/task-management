import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';

import { ProjectDetail as ProjectDetailModel } from '../../core/models/project.models';
import { ProjectService } from '../../core/services/project.service';
import { ProjectDetail } from './project-detail';

describe('ProjectDetail', () => {
  let fixture: ComponentFixture<ProjectDetail>;
  let projectService: { getProjectDetail: ReturnType<typeof vi.fn> };
  let paramMapSubject: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  const mockProjectDetail: ProjectDetailModel = {
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
  };

  beforeEach(async () => {
    projectService = { getProjectDetail: vi.fn() };
    paramMapSubject = new BehaviorSubject(convertToParamMap({ projectId: 'proj-1' }));

    await TestBed.configureTestingModule({
      imports: [ProjectDetail],
      providers: [
        provideRouter([]),
        { provide: ProjectService, useValue: projectService },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: paramMapSubject.asObservable() },
        },
      ],
    }).compileComponents();
  });

  function createComponent(): void {
    fixture = TestBed.createComponent(ProjectDetail);
    fixture.detectChanges();
  }

  function getCompiled(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  it('should create', () => {
    projectService.getProjectDetail.mockReturnValue(of(mockProjectDetail));
    createComponent();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show loading state while project detail is fetched', () => {
    const detailSubject = new Subject<ProjectDetailModel>();
    projectService.getProjectDetail.mockReturnValue(detailSubject.asObservable());

    createComponent();

    const compiled = getCompiled();
    expect(compiled.querySelector('[role="status"]')).toBeTruthy();
    expect(compiled.textContent).toContain('Loading project details');

    detailSubject.next(mockProjectDetail);
    detailSubject.complete();
    fixture.detectChanges();

    expect(compiled.querySelector('[role="status"]')).toBeFalsy();
  });

  it('should render metadata, members, activity, and metrics from fixture data', () => {
    projectService.getProjectDetail.mockReturnValue(of(mockProjectDetail));
    createComponent();

    const compiled = getCompiled();

    expect(compiled.querySelector('#project-name-heading')?.textContent).toContain('Website Redesign');
    expect(compiled.querySelector('.project-description')?.textContent).toContain(
      'Redesign the company website',
    );
    expect(compiled.querySelector('.project-status-badge')?.textContent).toContain('Active');

    expect(compiled.querySelector('#members-heading')?.textContent).toContain('Team members');
    expect(compiled.textContent).toContain('Jane Doe');
    expect(compiled.textContent).toContain('owner');
    expect(compiled.textContent).toContain('John Smith');
    expect(compiled.textContent).toContain('member');

    expect(compiled.querySelector('#activity-heading')?.textContent).toContain('Recent activity');
    expect(compiled.textContent).toContain('Completed task "Update homepage hero"');

    expect(compiled.querySelector('#metrics-heading')?.textContent).toContain('Key metrics');
    expect(compiled.textContent).toContain('24');
    expect(compiled.textContent).toContain('18');
    expect(compiled.textContent).toContain('6');
    expect(compiled.textContent).toContain('2');
  });

  it('should render section links using the routed project id', () => {
    projectService.getProjectDetail.mockReturnValue(of(mockProjectDetail));
    createComponent();

    const links = Array.from(getCompiled().querySelectorAll('.project-nav-link'));
    const hrefs = links.map((link) => link.getAttribute('href'));

    expect(hrefs).toContain('/projects/proj-1/tasks');
    expect(hrefs).toContain('/projects/proj-1/milestones');
    expect(hrefs).toContain('/projects/proj-1/settings');
  });

  it('should show error UI when project detail fetch fails', () => {
    projectService.getProjectDetail.mockReturnValue(throwError(() => new Error('Network error')));
    createComponent();

    const compiled = getCompiled();
    const alert = compiled.querySelector('[role="alert"]');

    expect(alert).toBeTruthy();
    expect(alert?.textContent).toContain('Something went wrong');
    expect(alert?.textContent).toContain(
      'Unable to load this project. Refresh the page or try again in a moment.',
    );
    expect(compiled.querySelector('.project-retry-btn')?.textContent).toContain('Try again');
  });

  it('should show error UI when project id is missing from the route', () => {
    paramMapSubject.next(convertToParamMap({}));
    createComponent();

    const compiled = getCompiled();
    const alert = compiled.querySelector('[role="alert"]');

    expect(alert).toBeTruthy();
    expect(alert?.textContent).toContain('Project not found. Check the URL and try again.');
    expect(projectService.getProjectDetail).not.toHaveBeenCalled();
  });

  it('should retry loading when Try again is clicked', () => {
    projectService.getProjectDetail
      .mockReturnValueOnce(throwError(() => new Error('Network error')))
      .mockReturnValueOnce(of(mockProjectDetail));

    createComponent();

    const retryButton = getCompiled().querySelector('.project-retry-btn') as HTMLButtonElement;
    retryButton.click();
    fixture.detectChanges();

    expect(projectService.getProjectDetail).toHaveBeenCalledTimes(2);
    expect(projectService.getProjectDetail).toHaveBeenCalledWith('proj-1');
    expect(getCompiled().querySelector('#project-name-heading')?.textContent).toContain(
      'Website Redesign',
    );
  });
});
