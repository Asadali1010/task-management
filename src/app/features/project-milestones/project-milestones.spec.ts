import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { Milestone, Task } from '../../core/models/project.models';
import { ProjectService } from '../../core/services/project.service';
import { ProjectMilestones } from './project-milestones';

describe('ProjectMilestones', () => {
  let fixture: ComponentFixture<ProjectMilestones>;
  let projectService: {
    listMilestones: ReturnType<typeof vi.fn>;
    createMilestone: ReturnType<typeof vi.fn>;
    listTasks: ReturnType<typeof vi.fn>;
    linkTaskToMilestone: ReturnType<typeof vi.fn>;
  };
  let paramMapSubject: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  const mockTasks: Task[] = [
    {
      id: 'task-1',
      title: 'Update homepage hero',
      status: 'done',
      milestoneId: 'ms-1',
    },
    {
      id: 'task-6',
      title: 'Audit accessibility',
      status: 'open',
      milestoneId: null,
    },
  ];

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

  beforeEach(async () => {
    projectService = {
      listMilestones: vi.fn(),
      createMilestone: vi.fn(),
      listTasks: vi.fn(),
      linkTaskToMilestone: vi.fn(),
    };
    paramMapSubject = new BehaviorSubject(convertToParamMap({ projectId: 'proj-1' }));

    await TestBed.configureTestingModule({
      imports: [ProjectMilestones],
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

  function mockLoadSuccess(
    milestones: Milestone[] = mockMilestones,
    tasks: Task[] = mockTasks,
  ): void {
    projectService.listMilestones.mockReturnValue(of({ milestones }));
    projectService.listTasks.mockReturnValue(of({ tasks }));
  }

  function createComponent(): void {
    fixture = TestBed.createComponent(ProjectMilestones);
    fixture.detectChanges();
  }

  function getCompiled(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function setInputValue(selector: string, value: string): void {
    const input = getCompiled().querySelector(selector) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function submitCreateForm(): void {
    fixture.debugElement.query(By.css('.milestone-create-form'))!.triggerEventHandler('ngSubmit', null);
    fixture.detectChanges();
  }

  it('should load milestones for the project id from the route', () => {
    mockLoadSuccess();
    createComponent();

    expect(projectService.listMilestones).toHaveBeenCalledWith('proj-1');
    expect(projectService.listTasks).toHaveBeenCalledWith('proj-1');

    const compiled = getCompiled();
    expect(compiled.querySelector('.milestones-state')).toBeNull();
    expect(compiled.textContent).toContain('Homepage Launch');
    expect(compiled.textContent).toContain('Content Migration');
  });

  it('should show an error state and retry when loading fails', () => {
    projectService.listMilestones
      .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 500 })))
      .mockReturnValueOnce(of({ milestones: mockMilestones }));
    projectService.listTasks
      .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 500 })))
      .mockReturnValueOnce(of({ tasks: mockTasks }));

    createComponent();

    const compiled = getCompiled();
    expect(compiled.textContent).toContain('Something went wrong');
    expect(compiled.textContent).toContain('Unable to load milestones');

    mockLoadSuccess();
    const retryButton = compiled.querySelector('.milestones-retry-btn') as HTMLButtonElement;
    retryButton.click();
    fixture.detectChanges();

    expect(projectService.listMilestones).toHaveBeenCalledTimes(2);
    expect(compiled.textContent).toContain('Homepage Launch');
    expect(compiled.querySelector('.milestones-state-error')).toBeNull();
  });

  it('should create a milestone and refresh the list on form submission', () => {
    mockLoadSuccess();
    projectService.createMilestone.mockReturnValue(
      of({
        id: 'ms-100',
        title: 'QA Sign-off',
        dueDate: '2026-09-01T00:00:00.000Z',
        progressPercent: 0,
        isOverdue: false,
      }),
    );

    createComponent();

    setInputValue('#milestone-title', 'QA Sign-off');
    setInputValue('#milestone-due-date', '2026-09-01');
    submitCreateForm();

    expect(projectService.createMilestone).toHaveBeenCalledWith('proj-1', {
      title: 'QA Sign-off',
      dueDate: '2026-09-01T00:00:00.000Z',
    });
    expect(projectService.listMilestones).toHaveBeenCalledTimes(2);
  });

  it('should display milestone progress from linked task completion', () => {
    mockLoadSuccess();
    createComponent();

    const compiled = getCompiled();
    const progressValues = compiled.querySelectorAll('.milestone-progress-value');
    expect(progressValues).toHaveLength(2);
    expect(progressValues[0].textContent).toContain('67');
    expect(progressValues[1].textContent).toContain('50');

    const progressFill = compiled.querySelector('.milestone-progress-fill') as HTMLElement;
    expect(progressFill.style.width).toBe('67%');
  });

  it('should flag overdue milestones with visible styling', () => {
    mockLoadSuccess();
    createComponent();

    const compiled = getCompiled();
    const overdueCard = compiled.querySelector('.milestone-card-overdue');
    expect(overdueCard).not.toBeNull();
    expect(overdueCard?.textContent).toContain('Content Migration');
    expect(compiled.querySelector('.milestone-overdue-badge')).not.toBeNull();
  });

  it('should link a task to a milestone and refresh displayed progress', () => {
    const updatedMilestones = [{ ...mockMilestones[0], progressPercent: 75 }, mockMilestones[1]];

    projectService.listMilestones
      .mockReturnValueOnce(of({ milestones: mockMilestones }))
      .mockReturnValueOnce(of({ milestones: updatedMilestones }));
    projectService.listTasks
      .mockReturnValueOnce(of({ tasks: mockTasks }))
      .mockReturnValueOnce(of({ tasks: mockTasks }))
      .mockReturnValueOnce(of({ tasks: mockTasks }));
    projectService.linkTaskToMilestone.mockReturnValue(
      of({
        id: 'task-6',
        title: 'Audit accessibility',
        status: 'open',
        milestoneId: 'ms-1',
      }),
    );

    createComponent();

    const compiled = getCompiled();
    const linkSelect = compiled.querySelector('#milestone-link-ms-1') as HTMLSelectElement;
    linkSelect.value = 'task-6';
    linkSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const linkButton = compiled.querySelector('.milestone-link-btn') as HTMLButtonElement;
    linkButton.click();
    fixture.detectChanges();

    expect(projectService.linkTaskToMilestone).toHaveBeenCalledWith('proj-1', 'task-6', 'ms-1');
    expect(projectService.listMilestones).toHaveBeenCalledTimes(2);

    const updatedProgress = compiled.querySelector('.milestone-progress-value');
    expect(updatedProgress?.textContent).toContain('75');
  });
});
