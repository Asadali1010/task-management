import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { vi } from 'vitest';

import {
  ProjectMember,
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
    getProjectDetail: ReturnType<typeof vi.fn>;
    getTaskHierarchy: ReturnType<typeof vi.fn>;
    listTasks: ReturnType<typeof vi.fn>;
    listTaskTemplates: ReturnType<typeof vi.fn>;
    listTaskDependencies: ReturnType<typeof vi.fn>;
    listDeletedTasks: ReturnType<typeof vi.fn>;
    createTask: ReturnType<typeof vi.fn>;
    updateTask: ReturnType<typeof vi.fn>;
    deleteTask: ReturnType<typeof vi.fn>;
    duplicateTask: ReturnType<typeof vi.fn>;
    createTaskFromTemplate: ReturnType<typeof vi.fn>;
    bulkTaskAction: ReturnType<typeof vi.fn>;
    getTaskHistory: ReturnType<typeof vi.fn>;
    restoreTask: ReturnType<typeof vi.fn>;
  };
  let paramMapSubject: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  const mockMembers: ProjectMember[] = [
    { id: 'mem-1', name: 'Asad Ali', email: 'asad@example.com', role: 'owner' },
    { id: 'mem-2', name: 'Priya Nair', email: 'priya@example.com', role: 'admin' },
  ];

  const mockHierarchy: TaskHierarchyNode[] = [
    {
      id: 'task-1',
      title: 'Update homepage hero',
      status: 'done',
      milestoneId: 'ms-1',
      assigneeId: 'mem-1',
      description: 'Refresh the homepage hero section.',
      dueDate: '2026-07-01T00:00:00.000Z',
      subtasks: [],
    },
    {
      id: 'task-3',
      title: 'Write launch blog post',
      status: 'open',
      milestoneId: 'ms-1',
      assigneeId: 'mem-2',
      description: 'Draft and publish the launch announcement.',
      dueDate: '2026-08-01T00:00:00.000Z',
      subtasks: [
        {
          id: 'task-3a',
          title: 'Draft blog outline',
          status: 'done',
          milestoneId: 'ms-1',
          assigneeId: 'mem-2',
          parentTaskId: 'task-3',
          description: 'Outline key sections.',
          dueDate: '2026-07-15T00:00:00.000Z',
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
      getProjectDetail: vi.fn(),
      getTaskHierarchy: vi.fn(),
      listTasks: vi.fn(),
      listTaskTemplates: vi.fn(),
      listTaskDependencies: vi.fn(),
      listDeletedTasks: vi.fn(),
      createTask: vi.fn(),
      updateTask: vi.fn(),
      deleteTask: vi.fn(),
      duplicateTask: vi.fn(),
      createTaskFromTemplate: vi.fn(),
      bulkTaskAction: vi.fn(),
      getTaskHistory: vi.fn(),
      restoreTask: vi.fn(),
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
    projectService.getProjectDetail.mockReturnValue(
      of({
        metadata: {
          id: 'proj-1',
          name: 'Website Redesign',
          description: 'Refresh the marketing site.',
          status: 'active',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-07-01T00:00:00.000Z',
          archivedAt: null,
        },
        members: mockMembers,
        recentActivity: [],
        metrics: {
          totalTasks: 5,
          completedTasks: 3,
          openTasks: 2,
          overdueTasks: 0,
          memberCount: 2,
        },
        viewerRole: 'owner',
      }),
    );
    projectService.getTaskHierarchy.mockReturnValue(of({ tasks: mockHierarchy }));
    projectService.listTasks.mockReturnValue(
      of({
        tasks: [
          {
            id: 'task-1',
            title: 'Update homepage hero',
            status: 'done',
            milestoneId: 'ms-1',
            assigneeId: 'mem-1',
            description: 'Refresh the homepage hero section.',
            dueDate: '2026-07-01T00:00:00.000Z',
          },
          {
            id: 'task-3',
            title: 'Write launch blog post',
            status: 'open',
            milestoneId: 'ms-1',
            assigneeId: 'mem-2',
            description: 'Draft and publish the launch announcement.',
            dueDate: '2026-08-01T00:00:00.000Z',
          },
          {
            id: 'task-3a',
            title: 'Draft blog outline',
            status: 'done',
            milestoneId: 'ms-1',
            assigneeId: 'mem-2',
            parentTaskId: 'task-3',
            description: 'Outline key sections.',
            dueDate: '2026-07-15T00:00:00.000Z',
          },
          {
            id: 'task-4',
            title: 'Migrate legacy blog content',
            status: 'done',
            milestoneId: 'ms-2',
            assigneeId: 'mem-1',
            description: 'Move archived blog posts.',
            dueDate: '2026-06-01T00:00:00.000Z',
          },
          {
            id: 'task-5',
            title: 'Redirect old URLs',
            status: 'open',
            milestoneId: 'ms-2',
            assigneeId: 'mem-2',
            description: 'Configure 301 redirects.',
            dueDate: '2026-08-15T00:00:00.000Z',
          },
        ],
      }),
    );
    projectService.listTaskTemplates.mockReturnValue(of({ templates: mockTemplates }));
    projectService.listTaskDependencies.mockReturnValue(of({ dependencies: mockDependencies }));
    projectService.listDeletedTasks.mockReturnValue(of({ tasks: [] }));
  }

  function fillCreateForm(compiled: HTMLElement): void {
    const titleInput = compiled.querySelector('#task-title') as HTMLInputElement;
    titleInput.value = 'New task';
    titleInput.dispatchEvent(new Event('input'));

    const descriptionInput = compiled.querySelector('#task-description') as HTMLTextAreaElement;
    descriptionInput.value = 'Task description';
    descriptionInput.dispatchEvent(new Event('input'));

    const assigneeSelect = compiled.querySelector('#task-assignee') as HTMLSelectElement;
    assigneeSelect.value = 'mem-1';
    assigneeSelect.dispatchEvent(new Event('change'));

    const dueDateInput = compiled.querySelector('#task-due-date') as HTMLInputElement;
    dueDateInput.value = '2026-08-01';
    dueDateInput.dispatchEvent(new Event('input'));
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

    expect(projectService.getProjectDetail).toHaveBeenCalledWith('proj-1');
    expect(projectService.getTaskHierarchy).toHaveBeenCalledWith('proj-1');
    expect(projectService.listDeletedTasks).toHaveBeenCalledWith('proj-1');
    expect(projectService.listTaskTemplates).toHaveBeenCalledWith('proj-1');
    expect(projectService.listTaskDependencies).toHaveBeenCalledWith('proj-1');

    const compiled = getCompiled();
    expect(compiled.textContent).toContain('Update homepage hero');
    expect(compiled.textContent).toContain('Draft blog outline');
    expect(compiled.textContent).toContain('Assigned to Asad Ali');
  });

  it('should show an error state and retry when loading fails', () => {
    projectService.getProjectDetail.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );
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
    projectService.listDeletedTasks.mockReturnValue(
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

  it('should block create submit when required fields are missing', () => {
    mockLoadSuccess();
    createComponent();

    fixture.debugElement.query(By.css('.task-create-form'))!.triggerEventHandler('ngSubmit', null);
    fixture.detectChanges();

    expect(projectService.createTask).not.toHaveBeenCalled();

    const compiled = getCompiled();
    expect(compiled.textContent).toContain('Title is required.');
    expect(compiled.textContent).toContain('Description is required.');
    expect(compiled.textContent).toContain('Assignee is required.');
    expect(compiled.textContent).toContain('Due date is required.');
  });

  it('should create a task on form submission', () => {
    mockLoadSuccess();
    projectService.createTask.mockReturnValue(
      of({
        id: 'task-100',
        title: 'New task',
        status: 'open',
        milestoneId: null,
        assigneeId: 'mem-1',
      }),
    );

    createComponent();

    fillCreateForm(getCompiled());
    fixture.detectChanges();

    fixture.debugElement.query(By.css('.task-create-form'))!.triggerEventHandler('ngSubmit', null);
    fixture.detectChanges();

    expect(projectService.createTask).toHaveBeenCalledWith(
      'proj-1',
      expect.objectContaining({
        title: 'New task',
        description: 'Task description',
        assigneeId: 'mem-1',
        dueDate: '2026-08-01T00:00:00.000Z',
      }),
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
      of({
        id: 'task-1',
        title: 'Updated hero',
        status: 'done',
        milestoneId: 'ms-1',
        assigneeId: 'mem-2',
      }),
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

    const assigneeSelect = getCompiled().querySelector('#edit-assignee-task-1') as HTMLSelectElement;
    assigneeSelect.value = 'mem-2';
    assigneeSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    fixture.debugElement.query(By.css('.task-edit-form'))!.triggerEventHandler('ngSubmit', null);
    fixture.detectChanges();

    expect(projectService.updateTask).toHaveBeenCalledWith(
      'proj-1',
      'task-1',
      expect.objectContaining({
        title: 'Updated hero',
        assigneeId: 'mem-2',
      }),
    );
  });

  it('should block edit submit when required fields are missing', () => {
    mockLoadSuccess();
    createComponent();

    const editButton = getCompiled().querySelector(
      '[aria-label="Edit task Update homepage hero"]',
    ) as HTMLButtonElement;
    editButton.click();
    fixture.detectChanges();

    const titleInput = getCompiled().querySelector('#edit-title-task-1') as HTMLInputElement;
    titleInput.value = '';
    titleInput.dispatchEvent(new Event('input'));

    const descriptionInput = getCompiled().querySelector(
      '#edit-description-task-1',
    ) as HTMLTextAreaElement;
    descriptionInput.value = '';
    descriptionInput.dispatchEvent(new Event('input'));

    const assigneeSelect = getCompiled().querySelector('#edit-assignee-task-1') as HTMLSelectElement;
    assigneeSelect.value = '';
    assigneeSelect.dispatchEvent(new Event('change'));

    const dueDateInput = getCompiled().querySelector('#edit-due-task-1') as HTMLInputElement;
    dueDateInput.value = '';
    dueDateInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    fixture.debugElement.query(By.css('.task-edit-form'))!.triggerEventHandler('ngSubmit', null);
    fixture.detectChanges();

    expect(projectService.updateTask).not.toHaveBeenCalled();

    const compiled = getCompiled();
    expect(compiled.textContent).toContain('Title is required.');
    expect(compiled.textContent).toContain('Description is required.');
    expect(compiled.textContent).toContain('Assignee is required.');
    expect(compiled.textContent).toContain('Due date is required.');
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
    expect(projectService.listDeletedTasks).toHaveBeenCalled();
  });

  it('should show deleted tasks and restore within the grace period', () => {
    mockLoadSuccess();
    projectService.listDeletedTasks.mockReturnValue(
      of({
        tasks: [
          {
            id: 'task-deleted',
            title: 'Removed task',
            status: 'open',
            milestoneId: null,
            assigneeId: 'mem-1',
            description: 'Was deleted',
            dueDate: '2026-08-01T00:00:00.000Z',
            deletedAt: '2026-07-20T00:00:00.000Z',
          },
        ],
      }),
    );
    projectService.restoreTask.mockReturnValue(
      of({
        id: 'task-deleted',
        title: 'Removed task',
        status: 'open',
        milestoneId: null,
        assigneeId: 'mem-1',
      }),
    );

    createComponent();

    expect(getCompiled().textContent).toContain('Removed task');

    const restoreButton = getCompiled().querySelector(
      '[aria-label="Restore task Removed task"]',
    ) as HTMLButtonElement;
    restoreButton.click();
    fixture.detectChanges();

    expect(projectService.restoreTask).toHaveBeenCalledWith('proj-1', 'task-deleted');
    expect(projectService.getTaskHierarchy).toHaveBeenCalledTimes(2);
    expect(projectService.listDeletedTasks).toHaveBeenCalledTimes(2);
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

    fillCreateForm(getCompiled());
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
