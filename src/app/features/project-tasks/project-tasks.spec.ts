import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { vi } from 'vitest';

import {
  TaskDependency,
  TaskHierarchyNode,
  TaskHistoryEntry,
  TaskTemplate,
} from '../../core/models/project.models';
import { ProjectService } from '../../core/services/project.service';
import { ProjectTasks } from './project-tasks';

describe('ProjectTasks', () => {
  let fixture: ComponentFixture<ProjectTasks>;
  let projectService: {
    getTaskHierarchy: ReturnType<typeof vi.fn>;
    listTasks: ReturnType<typeof vi.fn>;
    listTaskTemplates: ReturnType<typeof vi.fn>;
    listTaskDependencies: ReturnType<typeof vi.fn>;
    createTask: ReturnType<typeof vi.fn>;
    updateTask: ReturnType<typeof vi.fn>;
    deleteTask: ReturnType<typeof vi.fn>;
    duplicateTask: ReturnType<typeof vi.fn>;
    createTaskFromTemplate: ReturnType<typeof vi.fn>;
    bulkTaskAction: ReturnType<typeof vi.fn>;
    getTaskHistory: ReturnType<typeof vi.fn>;
  };
  let paramMapSubject: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  const mockHierarchy: TaskHierarchyNode[] = [
    {
      id: 'task-1',
      title: 'Update homepage hero',
      status: 'done',
      milestoneId: 'ms-1',
      subtasks: [],
    },
    {
      id: 'task-3',
      title: 'Write launch blog post',
      status: 'open',
      milestoneId: 'ms-1',
      subtasks: [
        {
          id: 'task-3a',
          title: 'Draft blog outline',
          status: 'done',
          milestoneId: 'ms-1',
          parentTaskId: 'task-3',
          subtasks: [],
        },
      ],
    },
  ];

  const mockDependencies: TaskDependency[] = [
    { id: 'dep-1', taskId: 'task-5', dependsOnTaskId: 'task-4' },
  ];

  const mockTemplates: TaskTemplate[] = [
    {
      id: 'tpl-1',
      title: 'Bug fix',
      description: 'Investigate and resolve a reported defect.',
      defaultStatus: 'open',
    },
  ];

  const mockHistory: TaskHistoryEntry[] = [
    {
      id: 'hist-1',
      taskId: 'task-1',
      action: 'created',
      description: 'Created task "Update homepage hero"',
      actorName: 'Asad Ali',
      createdAt: '2026-07-01T00:00:00.000Z',
    },
  ];

  beforeEach(async () => {
    projectService = {
      getTaskHierarchy: vi.fn(),
      listTasks: vi.fn(),
      listTaskTemplates: vi.fn(),
      listTaskDependencies: vi.fn(),
      createTask: vi.fn(),
      updateTask: vi.fn(),
      deleteTask: vi.fn(),
      duplicateTask: vi.fn(),
      createTaskFromTemplate: vi.fn(),
      bulkTaskAction: vi.fn(),
      getTaskHistory: vi.fn(),
    };
    paramMapSubject = new BehaviorSubject(convertToParamMap({ projectId: 'proj-1' }));

    await TestBed.configureTestingModule({
      imports: [ProjectTasks],
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

  function mockLoadSuccess(): void {
    projectService.getTaskHierarchy.mockReturnValue(of({ tasks: mockHierarchy }));
    projectService.listTasks.mockReturnValue(
      of({
        tasks: [
          { id: 'task-1', title: 'Update homepage hero', status: 'done', milestoneId: 'ms-1' },
          { id: 'task-3', title: 'Write launch blog post', status: 'open', milestoneId: 'ms-1' },
          { id: 'task-3a', title: 'Draft blog outline', status: 'done', milestoneId: 'ms-1' },
          { id: 'task-4', title: 'Migrate legacy blog content', status: 'done', milestoneId: 'ms-2' },
          { id: 'task-5', title: 'Redirect old URLs', status: 'open', milestoneId: 'ms-2' },
        ],
      }),
    );
    projectService.listTaskTemplates.mockReturnValue(of({ templates: mockTemplates }));
    projectService.listTaskDependencies.mockReturnValue(of({ dependencies: mockDependencies }));
  }

  function createComponent(): void {
    fixture = TestBed.createComponent(ProjectTasks);
    fixture.detectChanges();
  }

  function getCompiled(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  it('should load task hierarchy for the project id from the route', () => {
    mockLoadSuccess();
    createComponent();

    expect(projectService.getTaskHierarchy).toHaveBeenCalledWith('proj-1');
    expect(projectService.listTaskTemplates).toHaveBeenCalledWith('proj-1');
    expect(projectService.listTaskDependencies).toHaveBeenCalledWith('proj-1');

    const compiled = getCompiled();
    expect(compiled.textContent).toContain('Update homepage hero');
    expect(compiled.textContent).toContain('Draft blog outline');
  });

  it('should show an error state and retry when loading fails', () => {
    projectService.getTaskHierarchy.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );
    projectService.listTasks.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );
    projectService.listTaskTemplates.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );
    projectService.listTaskDependencies.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );

    createComponent();

    const compiled = getCompiled();
    expect(compiled.textContent).toContain('Something went wrong');

    mockLoadSuccess();
    const retryButton = compiled.querySelector('.tasks-btn-primary') as HTMLButtonElement;
    retryButton.click();
    fixture.detectChanges();

    expect(projectService.getTaskHierarchy).toHaveBeenCalledTimes(2);
    expect(compiled.textContent).toContain('Update homepage hero');
  });

  it('should create a task on form submission', () => {
    mockLoadSuccess();
    projectService.createTask.mockReturnValue(
      of({ id: 'task-100', title: 'New task', status: 'open', milestoneId: null }),
    );

    createComponent();

    const titleInput = getCompiled().querySelector('#task-title') as HTMLInputElement;
    titleInput.value = 'New task';
    titleInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    fixture.debugElement.query(By.css('.task-create-form'))!.triggerEventHandler('ngSubmit', null);
    fixture.detectChanges();

    expect(projectService.createTask).toHaveBeenCalledWith(
      'proj-1',
      expect.objectContaining({ title: 'New task' }),
    );
  });

  it('should show bulk actions when tasks are selected', () => {
    mockLoadSuccess();
    projectService.bulkTaskAction.mockReturnValue(
      of({ affectedCount: 1, tasks: [] }),
    );

    createComponent();

    const checkbox = getCompiled().querySelector(
      'input[aria-label="Select task Update homepage hero"]',
    ) as HTMLInputElement;
    checkbox.click();
    fixture.detectChanges();

    expect(getCompiled().querySelector('.tasks-bulk-bar')).not.toBeNull();

    const markDoneButton = getCompiled().querySelector(
      '[aria-label="Mark selected tasks as done"]',
    ) as HTMLButtonElement;
    markDoneButton.click();
    fixture.detectChanges();

    expect(projectService.bulkTaskAction).toHaveBeenCalledWith('proj-1', {
      taskIds: ['task-1'],
      action: 'update_status',
      status: 'done',
    });
  });

  it('should load task history when history is opened', () => {
    mockLoadSuccess();
    projectService.getTaskHistory.mockReturnValue(of({ history: mockHistory }));

    createComponent();

    const historyButton = getCompiled().querySelector(
      '[aria-label="View history for Update homepage hero"]',
    ) as HTMLButtonElement;
    historyButton.click();
    fixture.detectChanges();

    expect(projectService.getTaskHistory).toHaveBeenCalledWith('proj-1', 'task-1');
    expect(getCompiled().textContent).toContain('Created task "Update homepage hero"');
  });

  it('should edit a task on form submission', () => {
    mockLoadSuccess();
    projectService.updateTask.mockReturnValue(
      of({ id: 'task-1', title: 'Updated hero', status: 'done', milestoneId: 'ms-1' }),
    );

    createComponent();

    const editButton = getCompiled().querySelector(
      '[aria-label="Edit task Update homepage hero"]',
    ) as HTMLButtonElement;
    editButton.click();
    fixture.detectChanges();

    const titleInput = getCompiled().querySelector('#edit-title-task-1') as HTMLInputElement;
    titleInput.value = 'Updated hero';
    titleInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    fixture.debugElement.query(By.css('.task-edit-form'))!.triggerEventHandler('ngSubmit', null);
    fixture.detectChanges();

    expect(projectService.updateTask).toHaveBeenCalledWith(
      'proj-1',
      'task-1',
      expect.objectContaining({ title: 'Updated hero' }),
    );
  });

  it('should delete a task when delete is clicked', () => {
    mockLoadSuccess();
    projectService.deleteTask.mockReturnValue(of(undefined));

    createComponent();

    const deleteButton = getCompiled().querySelector(
      '[aria-label="Delete task Update homepage hero"]',
    ) as HTMLButtonElement;
    deleteButton.click();
    fixture.detectChanges();

    expect(projectService.deleteTask).toHaveBeenCalledWith('proj-1', 'task-1');
  });

  it('should duplicate a task when duplicate is clicked', () => {
    mockLoadSuccess();
    projectService.duplicateTask.mockReturnValue(
      of({ id: 'task-100', title: 'Update homepage hero (copy)', status: 'done', milestoneId: 'ms-1' }),
    );

    createComponent();

    const duplicateButton = getCompiled().querySelector(
      '[aria-label="Duplicate task Update homepage hero"]',
    ) as HTMLButtonElement;
    duplicateButton.click();
    fixture.detectChanges();

    expect(projectService.duplicateTask).toHaveBeenCalledWith('proj-1', 'task-1', {
      includeSubtasks: false,
    });
  });

  it('should create a subtask with parentTaskId when subtask form is submitted', () => {
    mockLoadSuccess();
    projectService.createTask.mockReturnValue(
      of({
        id: 'task-3b',
        title: 'Review outline',
        status: 'open',
        milestoneId: 'ms-1',
        parentTaskId: 'task-3',
      }),
    );

    createComponent();

    const subtaskButton = getCompiled().querySelector(
      '[aria-label="Add subtask to Write launch blog post"]',
    ) as HTMLButtonElement;
    subtaskButton.click();
    fixture.detectChanges();

    expect(getCompiled().textContent).toContain('Add subtask to');

    const titleInput = getCompiled().querySelector('#task-title') as HTMLInputElement;
    titleInput.value = 'Review outline';
    titleInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    fixture.debugElement.query(By.css('.task-create-form'))!.triggerEventHandler('ngSubmit', null);
    fixture.detectChanges();

    expect(projectService.createTask).toHaveBeenCalledWith(
      'proj-1',
      expect.objectContaining({ title: 'Review outline', parentTaskId: 'task-3' }),
    );
  });
});
