import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';

import {
  ProjectListResponse,
  ProjectSummary,
  RestoreProjectResponse,
} from '../../core/models/project.models';
import { ProjectService } from '../../core/services/project.service';
import { Dashboard } from './dashboard';

describe('Dashboard', () => {
  let fixture: ComponentFixture<Dashboard>;
  let projectService: {
    getProjects: ReturnType<typeof vi.fn>;
    restoreProject: ReturnType<typeof vi.fn>;
  };

  const activeProject: ProjectSummary = {
    id: 'proj-1',
    name: 'Website Redesign',
    description: 'Redesign the company website',
    status: 'active',
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: '2026-07-20T14:30:00Z',
    archivedAt: null,
    viewerRole: 'owner',
  };

  const archivedProjectOwner: ProjectSummary = {
    id: 'proj-2',
    name: 'Legacy Portal',
    description: 'Old customer portal',
    status: 'active',
    createdAt: '2025-06-01T10:00:00Z',
    updatedAt: '2026-07-10T14:30:00Z',
    archivedAt: '2026-07-25T12:00:00Z',
    viewerRole: 'owner',
  };

  const archivedProjectMember: ProjectSummary = {
    id: 'proj-3',
    name: 'Internal Wiki',
    description: 'Team documentation',
    status: 'active',
    createdAt: '2025-08-01T10:00:00Z',
    updatedAt: '2026-07-15T14:30:00Z',
    archivedAt: '2026-07-26T12:00:00Z',
    viewerRole: 'member',
  };

  beforeEach(async () => {
    projectService = {
      getProjects: vi.fn(),
      restoreProject: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [provideRouter([]), { provide: ProjectService, useValue: projectService }],
    }).compileComponents();
  });

  function createComponent(): void {
    fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
  }

  function getCompiled(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function mockActiveProjects(projects: ProjectSummary[] = [activeProject]): void {
    projectService.getProjects.mockImplementation((options?: { archived?: boolean }) => {
      if (options?.archived) {
        return of({ projects: [] } satisfies ProjectListResponse);
      }
      return of({ projects } satisfies ProjectListResponse);
    });
  }

  function mockArchivedProjects(projects: ProjectSummary[] = [archivedProjectOwner]): void {
    projectService.getProjects.mockImplementation((options?: { archived?: boolean }) => {
      if (options?.archived) {
        return of({ projects } satisfies ProjectListResponse);
      }
      return of({ projects: [activeProject] } satisfies ProjectListResponse);
    });
  }

  function switchToArchivedView(): void {
    const archivedTab = getCompiled().querySelectorAll('.dashboard-view-btn')[1] as HTMLButtonElement;
    archivedTab.click();
    fixture.detectChanges();
  }

  it('should create', () => {
    mockActiveProjects();
    createComponent();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should load active projects on initial view', () => {
    mockActiveProjects();
    createComponent();

    expect(projectService.getProjects).toHaveBeenCalledWith({ archived: false });
    expect(getCompiled().textContent).toContain('Website Redesign');
    expect(getCompiled().textContent).not.toContain('Legacy Portal');
  });

  it('should show loading state while projects are fetched', () => {
    const projectsSubject = new Subject<ProjectListResponse>();
    projectService.getProjects.mockReturnValue(projectsSubject.asObservable());

    createComponent();

    expect(getCompiled().querySelector('[role="status"]')).toBeTruthy();
    expect(getCompiled().textContent).toContain('Loading active projects');

    projectsSubject.next({ projects: [activeProject] });
    projectsSubject.complete();
    fixture.detectChanges();

    expect(getCompiled().querySelector('[role="status"]')).toBeFalsy();
  });

  it('should switch to archived view and load archived projects only', () => {
    mockArchivedProjects([archivedProjectOwner, archivedProjectMember]);
    createComponent();

    switchToArchivedView();

    expect(projectService.getProjects).toHaveBeenLastCalledWith({ archived: true });
    expect(getCompiled().textContent).toContain('Legacy Portal');
    expect(getCompiled().textContent).toContain('Internal Wiki');
    expect(getCompiled().textContent).not.toContain('Website Redesign');
    expect(getCompiled().textContent).toContain('Archived');
  });

  it('should link each project row to the project detail route', () => {
    mockActiveProjects();
    createComponent();

    const link = getCompiled().querySelector('.dashboard-project-link') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/projects/proj-1');
  });

  it('should show Restore only for owner and admin viewers in archived view', () => {
    mockArchivedProjects([
      archivedProjectOwner,
      { ...archivedProjectMember, viewerRole: 'admin', id: 'proj-4', name: 'Ops Dashboard' },
      archivedProjectMember,
    ]);
    createComponent();
    switchToArchivedView();

    const restoreButtons = Array.from(getCompiled().querySelectorAll('.dashboard-restore-btn'));
    expect(restoreButtons).toHaveLength(2);
    expect(restoreButtons.some((btn) => btn.getAttribute('aria-label')?.includes('Legacy Portal'))).toBe(
      true,
    );
    expect(restoreButtons.some((btn) => btn.getAttribute('aria-label')?.includes('Ops Dashboard'))).toBe(
      true,
    );
    expect(restoreButtons.some((btn) => btn.getAttribute('aria-label')?.includes('Internal Wiki'))).toBe(
      false,
    );
  });

  it('should restore a project and remove it from the archived list', () => {
    const restoreResponse: RestoreProjectResponse = {
      project: { ...archivedProjectOwner, archivedAt: null },
    };

    mockArchivedProjects([archivedProjectOwner]);
    createComponent();
    switchToArchivedView();

    projectService.restoreProject.mockReturnValue(of(restoreResponse));

    const restoreButton = getCompiled().querySelector('.dashboard-restore-btn') as HTMLButtonElement;
    restoreButton.click();
    fixture.detectChanges();

    expect(projectService.restoreProject).toHaveBeenCalledWith('proj-2');
    expect(getCompiled().textContent).not.toContain('Legacy Portal');
    expect(fixture.componentInstance['projects']()).toHaveLength(0);
  });

  it('should show empty state when there are no active projects', () => {
    mockActiveProjects([]);
    createComponent();

    expect(getCompiled().textContent).toContain('No active projects');
    expect(getCompiled().textContent).toContain('Archived projects stay available under Archived');
  });

  it('should show empty state when there are no archived projects', () => {
    mockArchivedProjects([]);
    createComponent();
    switchToArchivedView();

    expect(getCompiled().textContent).toContain('No archived projects');
    expect(getCompiled().textContent).toContain('Restore one here to bring it back');
  });

  it('should show error UI when project list fetch fails', () => {
    projectService.getProjects.mockReturnValue(throwError(() => new Error('Network error')));
    createComponent();

    const alert = getCompiled().querySelector('[role="alert"]');
    expect(alert).toBeTruthy();
    expect(alert?.textContent).toContain('Something went wrong');
    expect(alert?.textContent).toContain('Unable to load projects');
    expect(getCompiled().querySelector('.dashboard-retry-btn')?.textContent).toContain('Try again');
  });

  it('should retry loading when Try again is clicked', () => {
    projectService.getProjects
      .mockReturnValueOnce(throwError(() => new Error('Network error')))
      .mockReturnValueOnce(of({ projects: [activeProject] }));

    createComponent();

    const retryButton = getCompiled().querySelector('.dashboard-retry-btn') as HTMLButtonElement;
    retryButton.click();
    fixture.detectChanges();

    expect(projectService.getProjects).toHaveBeenCalledTimes(2);
    expect(getCompiled().textContent).toContain('Website Redesign');
  });

  it('should show permission error when restore is forbidden', () => {
    mockArchivedProjects([archivedProjectOwner]);
    createComponent();
    switchToArchivedView();

    projectService.restoreProject.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 403 })),
    );

    const restoreButton = getCompiled().querySelector('.dashboard-restore-btn') as HTMLButtonElement;
    restoreButton.click();
    fixture.detectChanges();

    const alert = getCompiled().querySelector('.dashboard-restore-error');
    expect(alert?.textContent).toContain('You do not have permission to restore this project.');
    expect(getCompiled().textContent).toContain('Legacy Portal');
  });
});
