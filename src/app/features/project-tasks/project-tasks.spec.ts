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
    addTaskDependency: ReturnType<typeof vi.fn>;
    removeTaskDependency: ReturnType<typeof vi.fn>;
    listMilestones: ReturnType<typeof vi.fn>;
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
    {
      id: 'task-4',
      title: 'Migrate legacy blog content',
      status: 'done',
      milestoneId: 'ms-2',
      assigneeId: 'mem-1',
      description: 'Move archived blog posts.',
      dueDate: '2026-06-01T00:00:00.000Z',
      subtasks: [],
    },
    {
      id: 'task-5',
      title: 'Redirect old URLs',
      status: 'open',
      milestoneId: 'ms-2',
      assigneeId: 'mem-2',
      description: 'Configure 301 redirects.',
      dueDate: '2026-08-15T00:00:00.000Z',
      subtasks: [],
    },
  ];

  const mockDependencies: TaskDependency[] = [
    { id: 'dep-1', taskId: 'task-5', dependsOnTaskId: 'task-4', linkType: 'blocks' },
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

  const formattedDescription =
    '<strong>Bold title</strong><ul><li>List item</li></ul><a href="https://example.com">Example link</a>';

  const xssDescription =
    '<strong>Safe text</strong><img src="x" onerror="alert(1)">';

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
      addTaskDependency: vi.fn(),
      removeTaskDependency: vi.fn(),
      listMilestones: vi.fn(),
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
    projectService.listMilestones.mockReturnValue(
      of({
        milestones: [
          { id: 'ms-1', title: 'Launch', dueDate: '2026-08-01T00:00:00.000Z', progressPercent: 67, isOverdue: false },
          { id: 'ms-2', title: 'Migration', dueDate: '2026-06-01T00:00:00.000Z', progressPercent: 50, isOverdue: false },
        ],
      }),
    );
  }

  function fillCreateForm(compiled: HTMLElement): void {
    const titleInput = compiled.querySelector('#task-title') as HTMLInputElement;
    titleInput.value = 'New task';
    titleInput.dispatchEvent(new Event('input'));

    (fixture.componentInstance as ProjectTasks & { createForm: { patchValue: (v: object) => void } })
      .createForm.patchValue({ description: 'Task description' });

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

  function expectSanitizedRichDescription(element: Element | null): void {
    expect(element).not.toBeNull();
    const html = element!.innerHTML;
    expect(html).toMatch(/<(strong|b)[^>]*>Bold title<\/(strong|b)>/);
    expect(html).toMatch(/<ul[\s>]/);
    expect(html).toMatch(/<li[\s>]/);
    expect(html).toMatch(/<a[^>]*href="https:\/\/example\.com"[^>]*>Example link<\/a>/);
    expect(html).not.toMatch(/onerror/i);
    expect(html).not.toContain('<img');
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

    (fixture.componentInstance as ProjectTasks & { editForm: { patchValue: (v: object) => void } })
      .editForm.patchValue({ description: '' });

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

  it('should create a task with rich text description and render sanitized HTML after reload', () => {
    mockLoadSuccess();
    const hierarchyWithRichTask: TaskHierarchyNode[] = [
      ...mockHierarchy,
      {
        id: 'task-100',
        title: 'Rich task',
        status: 'open',
        milestoneId: null,
        assigneeId: 'mem-1',
        description: formattedDescription,
        dueDate: '2026-08-01T00:00:00.000Z',
        subtasks: [],
      },
    ];

    projectService.getTaskHierarchy
      .mockReturnValueOnce(of({ tasks: mockHierarchy }))
      .mockReturnValue(of({ tasks: hierarchyWithRichTask }));
    projectService.createTask.mockReturnValue(
      of({
        id: 'task-100',
        title: 'Rich task',
        status: 'open',
        milestoneId: null,
        assigneeId: 'mem-1',
        description: formattedDescription,
      }),
    );

    createComponent();

    const titleInput = getCompiled().querySelector('#task-title') as HTMLInputElement;
    titleInput.value = 'Rich task';
    titleInput.dispatchEvent(new Event('input'));

    (fixture.componentInstance as ProjectTasks & { createForm: { patchValue: (v: object) => void } })
      .createForm.patchValue({ description: formattedDescription });

    const assigneeSelect = getCompiled().querySelector('#task-assignee') as HTMLSelectElement;
    assigneeSelect.value = 'mem-1';
    assigneeSelect.dispatchEvent(new Event('change'));

    const dueDateInput = getCompiled().querySelector('#task-due-date') as HTMLInputElement;
    dueDateInput.value = '2026-08-01';
    dueDateInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    fixture.debugElement.query(By.css('.task-create-form'))!.triggerEventHandler('ngSubmit', null);
    fixture.detectChanges();

    expect(projectService.createTask).toHaveBeenCalledWith(
      'proj-1',
      expect.objectContaining({
        title: 'Rich task',
        description: formattedDescription,
        assigneeId: 'mem-1',
        dueDate: '2026-08-01T00:00:00.000Z',
      }),
    );

    const richTaskCard = Array.from(getCompiled().querySelectorAll('.task-card')).find((card) =>
      card.textContent?.includes('Rich task'),
    );
    const descriptionEl = richTaskCard?.querySelector('.task-description-rich') ?? null;
    expectSanitizedRichDescription(descriptionEl);
  });

  it('should update a task with rich text description and render sanitized HTML after reload', () => {
    mockLoadSuccess();
    const updatedHierarchy: TaskHierarchyNode[] = [
      {
        ...mockHierarchy[0],
        description: formattedDescription,
      },
      mockHierarchy[1],
    ];

    projectService.getTaskHierarchy
      .mockReturnValueOnce(of({ tasks: mockHierarchy }))
      .mockReturnValue(of({ tasks: updatedHierarchy }));
    projectService.updateTask.mockReturnValue(
      of({
        id: 'task-1',
        title: 'Update homepage hero',
        status: 'done',
        milestoneId: 'ms-1',
        assigneeId: 'mem-1',
        description: formattedDescription,
      }),
    );

    createComponent();

    const editButton = getCompiled().querySelector(
      '[aria-label="Edit task Update homepage hero"]',
    ) as HTMLButtonElement;
    editButton.click();
    fixture.detectChanges();

    (fixture.componentInstance as ProjectTasks & { editForm: { patchValue: (v: object) => void } })
      .editForm.patchValue({ description: formattedDescription });
    fixture.detectChanges();

    fixture.debugElement.query(By.css('.task-edit-form'))!.triggerEventHandler('ngSubmit', null);
    fixture.detectChanges();

    expect(projectService.updateTask).toHaveBeenCalledWith(
      'proj-1',
      'task-1',
      expect.objectContaining({
        description: formattedDescription,
      }),
    );

    const descriptionEl = getCompiled().querySelector(
      '.task-description-rich',
    ) as HTMLElement | null;
    expectSanitizedRichDescription(descriptionEl);
  });

  it('should strip XSS payloads from rendered task descriptions', () => {
    mockLoadSuccess();
    const hierarchyWithXss: TaskHierarchyNode[] = [
      {
        ...mockHierarchy[0],
        description: xssDescription,
      },
      mockHierarchy[1],
    ];
    projectService.getTaskHierarchy.mockReturnValue(of({ tasks: hierarchyWithXss }));

    createComponent();

    const descriptionEl = getCompiled().querySelector(
      '.task-description-rich',
    ) as HTMLElement | null;
    expect(descriptionEl).not.toBeNull();
    const html = descriptionEl!.innerHTML;
    expect(html).toMatch(/<(strong|b)[^>]*>Safe text<\/(strong|b)>/);
    expect(html).not.toMatch(/onerror/i);
    expect(html).not.toContain('<img');
  });

  function getTaskCardByTitle(title: string): HTMLElement | undefined {
    return Array.from(getCompiled().querySelectorAll('.task-card')).find((card) =>
      card.textContent?.includes(title),
    ) as HTMLElement | undefined;
  }

  it('should show subtask progress on parent task cards', () => {
    mockLoadSuccess();
    createComponent();

    const parentCard = getTaskCardByTitle('Write launch blog post');
    expect(parentCard).toBeDefined();

    const progressEl = parentCard!.querySelector('.task-subtask-progress');
    expect(progressEl).not.toBeNull();
    expect(progressEl!.getAttribute('aria-label')).toBe('Subtask progress: 1 of 1 complete');
    expect(parentCard!.textContent).toContain('1/1');
    expect(parentCard!.textContent).toContain('subtasks complete (100%)');

    const fillEl = parentCard!.querySelector('.task-subtask-progress-fill') as HTMLElement;
    expect(fillEl.style.width).toBe('100%');
  });

  it('should show delete confirmation when deleting a parent with subtasks', () => {
    mockLoadSuccess();
    createComponent();

    const deleteButton = getCompiled().querySelector(
      '[aria-label="Delete task Write launch blog post"]',
    ) as HTMLButtonElement;
    deleteButton.click();
    fixture.detectChanges();

    expect(projectService.deleteTask).not.toHaveBeenCalled();
    expect(getCompiled().textContent).toContain('Delete task with subtasks?');
    expect(getCompiled().textContent).toContain('1 subtask');
    expect(getCompiled().textContent).toContain('Delete all subtasks');
    expect(getCompiled().textContent).toContain('Promote subtasks');
  });

  it('should delete parent with cascade strategy when confirmed', () => {
    mockLoadSuccess();
    projectService.deleteTask.mockReturnValue(of(undefined));

    createComponent();

    const deleteButton = getCompiled().querySelector(
      '[aria-label="Delete task Write launch blog post"]',
    ) as HTMLButtonElement;
    deleteButton.click();
    fixture.detectChanges();

    const cascadeButton = getCompiled().querySelector(
      '[aria-label="Delete Write launch blog post and all 1 subtasks"]',
    ) as HTMLButtonElement;
    cascadeButton.click();
    fixture.detectChanges();

    expect(projectService.deleteTask).toHaveBeenCalledWith('proj-1', 'task-3', {
      subtaskStrategy: 'cascade',
    });
  });

  it('should delete parent with promote strategy when confirmed', () => {
    mockLoadSuccess();
    projectService.deleteTask.mockReturnValue(of(undefined));

    createComponent();

    const deleteButton = getCompiled().querySelector(
      '[aria-label="Delete task Write launch blog post"]',
    ) as HTMLButtonElement;
    deleteButton.click();
    fixture.detectChanges();

    const promoteButton = getCompiled().querySelector(
      '[aria-label="Delete Write launch blog post and promote subtasks to top level"]',
    ) as HTMLButtonElement;
    promoteButton.click();
    fixture.detectChanges();

    expect(projectService.deleteTask).toHaveBeenCalledWith('proj-1', 'task-3', {
      subtaskStrategy: 'promote',
    });
  });

  it('should cancel delete confirmation for parent with subtasks', () => {
    mockLoadSuccess();
    createComponent();

    const deleteButton = getCompiled().querySelector(
      '[aria-label="Delete task Write launch blog post"]',
    ) as HTMLButtonElement;
    deleteButton.click();
    fixture.detectChanges();

    expect(getCompiled().textContent).toContain('Delete task with subtasks?');

    const cancelButton = Array.from(
      getCompiled().querySelectorAll('.task-delete-confirm-actions button'),
    ).find((button) => button.textContent?.trim() === 'Cancel') as HTMLButtonElement;
    cancelButton.click();
    fixture.detectChanges();

    expect(projectService.deleteTask).not.toHaveBeenCalled();
    expect(getCompiled().textContent).not.toContain('Delete task with subtasks?');
    expect(
      getCompiled().querySelector('[aria-label="Delete task Write launch blog post"]'),
    ).not.toBeNull();
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

  it('should display task links on both linked task cards', () => {
    mockLoadSuccess();
    createComponent();

    const task5Card = getTaskCardByTitle('Redirect old URLs');
    const task4Card = getTaskCardByTitle('Migrate legacy blog content');

    expect(task5Card).toBeDefined();
    expect(task4Card).toBeDefined();
    expect(task5Card!.textContent).toContain('Blocks');
    expect(task5Card!.textContent).toContain('Migrate legacy blog content');
    expect(task4Card!.textContent).toContain('Blocked by');
    expect(task4Card!.textContent).toContain('Redirect old URLs');
  });

  it('should add a task link from a task card', () => {
    mockLoadSuccess();
    projectService.addTaskDependency.mockReturnValue(
      of({
        dependency: {
          id: 'dep-new',
          taskId: 'task-1',
          dependsOnTaskId: 'task-3',
          linkType: 'relates_to',
        },
      }),
    );

    createComponent();

    const task1Card = getTaskCardByTitle('Update homepage hero');
    expect(task1Card).toBeDefined();

    const targetSelect = task1Card!.querySelector('#link-target-task-1') as HTMLSelectElement;
    targetSelect.value = 'task-3';
    targetSelect.dispatchEvent(new Event('change'));

    const typeSelect = task1Card!.querySelector('#link-type-task-1') as HTMLSelectElement;
    typeSelect.value = 'relates_to';
    typeSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const addButton = task1Card!.querySelector('[aria-label="Add task link for Update homepage hero"]') as HTMLButtonElement;
    addButton.click();
    fixture.detectChanges();

    expect(projectService.addTaskDependency).toHaveBeenCalledWith('proj-1', 'task-1', {
      dependsOnTaskId: 'task-3',
      linkType: 'relates_to',
    });
    expect(projectService.listTaskDependencies).toHaveBeenCalledTimes(2);
  });

  it('should remove a task link from a task card', () => {
    mockLoadSuccess();
    projectService.removeTaskDependency.mockReturnValue(of(undefined));

    createComponent();

    const task5Card = getTaskCardByTitle('Redirect old URLs');
    expect(task5Card).toBeDefined();

    const removeButton = task5Card!.querySelector(
      '[aria-label="Remove blocks link to Migrate legacy blog content"]',
    ) as HTMLButtonElement;
    removeButton.click();
    fixture.detectChanges();

    expect(projectService.removeTaskDependency).toHaveBeenCalledWith('proj-1', 'task-5', 'dep-1');
    expect(projectService.listTaskDependencies).toHaveBeenCalledTimes(2);
  });

  it('should show an error when adding a circular blocks link', () => {
    mockLoadSuccess();
    projectService.addTaskDependency.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 400 })),
    );

    createComponent();

    const task4Card = getTaskCardByTitle('Migrate legacy blog content');
    expect(task4Card).toBeDefined();

    const targetSelect = task4Card!.querySelector('#link-target-task-4') as HTMLSelectElement;
    targetSelect.value = 'task-5';
    targetSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const addButton = task4Card!.querySelector(
      '[aria-label="Add task link for Migrate legacy blog content"]',
    ) as HTMLButtonElement;
    addButton.click();
    fixture.detectChanges();

    expect(projectService.addTaskDependency).toHaveBeenCalledWith('proj-1', 'task-4', {
      dependsOnTaskId: 'task-5',
      linkType: 'blocks',
    });
    expect(task4Card!.textContent).toContain('Circular "Blocks" relationships are not allowed');
  });
});
