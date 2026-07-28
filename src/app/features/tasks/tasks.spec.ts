import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { ProjectSummary, Task } from '../../core/models/project.models';
import { ProjectService } from '../../core/services/project.service';
import { Tasks } from './tasks';

describe('Tasks', () => {
  let fixture: ComponentFixture<Tasks>;
  let projectService: {
    getProjects: ReturnType<typeof vi.fn>;
    listTasks: ReturnType<typeof vi.fn>;
  };

  const mockProjects: ProjectSummary[] = [
    {
      id: 'proj-1',
      name: 'Website Redesign',
      description: '',
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
      archivedAt: null,
      viewerRole: 'owner',
    },
    {
      id: 'proj-2',
      name: 'Mobile App Launch',
      description: '',
      status: 'active',
      createdAt: '2026-02-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
      archivedAt: null,
      viewerRole: 'owner',
    },
  ];

  const mockTasksProj1: Task[] = [
    { id: 'task-1', title: 'Update homepage hero', status: 'done', milestoneId: 'ms-1' },
    { id: 'task-3', title: 'Write launch blog post', status: 'open', milestoneId: 'ms-1' },
  ];

  const mockTasksProj2: Task[] = [
    { id: 'task-7', title: 'Build onboarding flow', status: 'done', milestoneId: 'ms-3' },
  ];

  beforeEach(async () => {
    projectService = {
      getProjects: vi.fn(),
      listTasks: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [Tasks],
      providers: [provideRouter([]), { provide: ProjectService, useValue: projectService }],
    }).compileComponents();
  });

  function mockLoadSuccess(): void {
    projectService.getProjects.mockReturnValue(of({ projects: mockProjects }));
    projectService.listTasks.mockImplementation((projectId: string) => {
      if (projectId === 'proj-1') {
        return of({ tasks: mockTasksProj1 });
      }
      return of({ tasks: mockTasksProj2 });
    });
  }

  function createComponent(): void {
    fixture = TestBed.createComponent(Tasks);
    fixture.detectChanges();
  }

  it('should aggregate tasks across active projects', () => {
    mockLoadSuccess();
    createComponent();

    expect(projectService.getProjects).toHaveBeenCalledWith({ archived: false });
    expect(projectService.listTasks).toHaveBeenCalledWith('proj-1');
    expect(projectService.listTasks).toHaveBeenCalledWith('proj-2');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Update homepage hero');
    expect(compiled.textContent).toContain('Build onboarding flow');
    expect(compiled.textContent).toContain('Website Redesign');
  });

  it('should link each task to its project tasks page', () => {
    mockLoadSuccess();
    createComponent();

    const links = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.workspace-task-project-link'),
    ) as HTMLAnchorElement[];

    expect(links.some((link) => link.getAttribute('href')?.includes('/projects/proj-1/tasks'))).toBe(
      true,
    );
  });

  it('should show an error state when loading fails', () => {
    projectService.getProjects.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );

    createComponent();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Something went wrong');
  });
});
