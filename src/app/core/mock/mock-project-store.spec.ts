import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  addTaskDependency,
  createTask,
  deleteTask,
  duplicateTask,
  getTask,
  getTaskHistory,
  listDeletedTasks,
  listTaskDependencies,
  listTasks,
  removeTaskDependency,
  resetMockStore,
  restoreTask,
  updateTask,
} from './mock-project-store';

describe('mock-project-store task CRUD', () => {
  beforeEach(() => {
    resetMockStore();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const validCreateRequest = {
    title: 'New task',
    description: 'Task description',
    assigneeId: 'mem-1',
    dueDate: '2026-08-01T00:00:00.000Z',
  };

  describe('createTask validation', () => {
    it('returns validation_error when title is missing', () => {
      const result = createTask('proj-1', { ...validCreateRequest, title: '' });
      expect(result.kind).toBe('validation_error');
    });

    it('returns validation_error when description is missing', () => {
      const result = createTask('proj-1', { ...validCreateRequest, description: '' });
      expect(result.kind).toBe('validation_error');
    });

    it('returns validation_error when description is empty rich text HTML', () => {
      const result = createTask('proj-1', { ...validCreateRequest, description: '<p><br></p>' });
      expect(result.kind).toBe('validation_error');
    });

    it('returns validation_error when assigneeId is missing', () => {
      const result = createTask('proj-1', { ...validCreateRequest, assigneeId: '' });
      expect(result.kind).toBe('validation_error');
    });

    it('returns validation_error when dueDate is missing', () => {
      const result = createTask('proj-1', { ...validCreateRequest, dueDate: '' });
      expect(result.kind).toBe('validation_error');
    });

    it('creates a task with assigneeId', () => {
      const result = createTask('proj-1', { ...validCreateRequest, assigneeId: 'mem-2' });

      expect(result.kind).toBe('success');
      if (result.kind === 'success') {
        expect(result.task.assigneeId).toBe('mem-2');
      }
    });

    it('creates a task with rich text HTML description', () => {
      const description =
        '<strong>Bold</strong><ul><li>Item</li></ul><a href="https://example.com">Link</a>';
      const result = createTask('proj-1', { ...validCreateRequest, description });

      expect(result.kind).toBe('success');
      if (result.kind === 'success') {
        expect(result.task.description).toContain('<strong>Bold</strong>');
        expect(result.task.description).toContain('<ul>');
        expect(result.task.description).toContain('<li>Item</li>');
        expect(result.task.description).toContain('href="https://example.com"');
      }
    });

    it('sanitizes XSS from description on create', () => {
      const result = createTask('proj-1', {
        ...validCreateRequest,
        description: '<strong>Safe</strong><img src="x" onerror="alert(1)">',
      });

      expect(result.kind).toBe('success');
      if (result.kind === 'success') {
        expect(result.task.description).toContain('<strong>Safe</strong>');
        expect(result.task.description).not.toContain('<img');
        expect(result.task.description).not.toMatch(/onerror/i);
      }
    });
  });

  describe('updateTask validation', () => {
    it('returns validation_error when title is cleared', () => {
      const result = updateTask('proj-1', 'task-1', { title: '' });
      expect(result.kind).toBe('validation_error');
    });

    it('returns validation_error when description is cleared', () => {
      const result = updateTask('proj-1', 'task-1', { description: '' });
      expect(result.kind).toBe('validation_error');
    });

    it('returns validation_error when description is empty rich text HTML', () => {
      const result = updateTask('proj-1', 'task-1', { description: '<p><br></p>' });
      expect(result.kind).toBe('validation_error');
    });

    it('returns validation_error when assigneeId is cleared', () => {
      const result = updateTask('proj-1', 'task-1', { assigneeId: '' });
      expect(result.kind).toBe('validation_error');
    });

    it('returns validation_error when dueDate is cleared', () => {
      const result = updateTask('proj-1', 'task-1', { dueDate: '' });
      expect(result.kind).toBe('validation_error');
    });

    it('updates a task with assigneeId', () => {
      const result = updateTask('proj-1', 'task-1', { assigneeId: 'mem-3' });

      expect(result.kind).toBe('success');
      if (result.kind === 'success') {
        expect(result.task.assigneeId).toBe('mem-3');
      }
    });

    it('updates a task with rich text HTML description', () => {
      const description =
        '<strong>Updated</strong><ul><li>Step</li></ul><a href="https://docs.example.com">Docs</a>';
      const result = updateTask('proj-1', 'task-1', { description });

      expect(result.kind).toBe('success');
      if (result.kind === 'success') {
        expect(result.task.description).toContain('<strong>Updated</strong>');
        expect(result.task.description).toContain('<ul>');
        expect(result.task.description).toContain('<li>Step</li>');
        expect(result.task.description).toContain('href="https://docs.example.com"');
      }
    });

    it('sanitizes XSS from description on update', () => {
      const result = updateTask('proj-1', 'task-1', {
        description: '<strong>Updated</strong><script>alert(1)</script><img onerror="alert(1)" src="x">',
      });

      expect(result.kind).toBe('success');
      if (result.kind === 'success') {
        expect(result.task.description).toBe('<strong>Updated</strong>');
      }
    });
  });

  describe('subtask inheritance on create', () => {
    it('inherits milestoneId and assigneeId from parent when omitted', () => {
      const result = createTask('proj-1', {
        title: 'New subtask',
        description: 'Subtask description',
        dueDate: '2026-08-01T00:00:00.000Z',
        parentTaskId: 'task-3',
      });

      expect(result.kind).toBe('success');
      if (result.kind === 'success') {
        expect(result.task.milestoneId).toBe('ms-1');
        expect(result.task.assigneeId).toBe('mem-3');
        expect(result.task.parentTaskId).toBe('task-3');
      }
    });

    it('keeps explicit milestoneId and assigneeId when provided', () => {
      const result = createTask('proj-1', {
        title: 'Custom subtask',
        description: 'Subtask description',
        assigneeId: 'mem-2',
        dueDate: '2026-08-01T00:00:00.000Z',
        milestoneId: 'ms-2',
        parentTaskId: 'task-3',
      });

      expect(result.kind).toBe('success');
      if (result.kind === 'success') {
        expect(result.task.milestoneId).toBe('ms-2');
        expect(result.task.assigneeId).toBe('mem-2');
      }
    });
  });

  describe('deleteTask subtaskStrategy', () => {
    it('cascade soft-deletes parent and all descendants', () => {
      deleteTask('proj-1', 'task-3', { subtaskStrategy: 'cascade' });

      expect(listTasks('proj-1')?.some((taskItem) => taskItem.id === 'task-3')).toBe(false);
      expect(listTasks('proj-1')?.some((taskItem) => taskItem.id === 'task-3a')).toBe(false);
      expect(listTasks('proj-1')?.some((taskItem) => taskItem.id === 'task-3b')).toBe(false);
    });

    it('promote clears parentTaskId on direct children and deletes only the parent', () => {
      deleteTask('proj-1', 'task-3', { subtaskStrategy: 'promote' });

      expect(listTasks('proj-1')?.some((taskItem) => taskItem.id === 'task-3')).toBe(false);

      const task3a = listTasks('proj-1')?.find((taskItem) => taskItem.id === 'task-3a');
      const task3b = listTasks('proj-1')?.find((taskItem) => taskItem.id === 'task-3b');

      expect(task3a).toBeDefined();
      expect(task3b).toBeDefined();
      expect(task3a?.parentTaskId).toBeNull();
      expect(task3b?.parentTaskId).toBeNull();
    });
  });

  describe('soft delete and restore', () => {
    it('moves a deleted task from the active list to the deleted list within the grace period', () => {
      expect(listTasks('proj-1')?.some((taskItem) => taskItem.id === 'task-1')).toBe(true);
      expect(listDeletedTasks('proj-1')?.some((taskItem) => taskItem.id === 'task-1')).toBe(false);

      deleteTask('proj-1', 'task-1');

      expect(listTasks('proj-1')?.some((taskItem) => taskItem.id === 'task-1')).toBe(false);
      expect(listDeletedTasks('proj-1')?.some((taskItem) => taskItem.id === 'task-1')).toBe(true);
    });

    it('restores a soft-deleted task to the active list within the grace period', () => {
      deleteTask('proj-1', 'task-1');

      const restored = restoreTask('proj-1', 'task-1');

      expect(restored).toBeDefined();
      expect(restored?.id).toBe('task-1');
      expect(listTasks('proj-1')?.some((taskItem) => taskItem.id === 'task-1')).toBe(true);
      expect(listDeletedTasks('proj-1')?.some((taskItem) => taskItem.id === 'task-1')).toBe(false);
    });

    it('does not restore expired soft-deleted tasks', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

      deleteTask('proj-1', 'task-1');

      vi.setSystemTime(new Date('2026-02-15T00:00:00.000Z'));

      expect(listDeletedTasks('proj-1')?.some((taskItem) => taskItem.id === 'task-1')).toBe(false);
      expect(restoreTask('proj-1', 'task-1')).toBeUndefined();
      expect(listTasks('proj-1')?.some((taskItem) => taskItem.id === 'task-1')).toBe(false);
    });
  });
});

describe('mock-project-store duplicateTask', () => {
  beforeEach(() => {
    resetMockStore();
  });

  it('copies relevant fields from the source task with a default title suffix', () => {
    const source = getTask('proj-1', 'task-1');
    expect(source).toBeDefined();

    const duplicate = duplicateTask('proj-1', 'task-1');

    expect(duplicate).toBeDefined();
    expect(duplicate?.id).not.toBe('task-1');
    expect(duplicate?.title).toBe('Update homepage hero (copy)');
    expect(duplicate?.description).toBe(source?.description);
    expect(duplicate?.assigneeId).toBe(source?.assigneeId);
    expect(duplicate?.status).toBe(source?.status);
    expect(duplicate?.milestoneId).toBe(source?.milestoneId);
    expect(duplicate?.dueDate).toBe(source?.dueDate);
  });

  it('applies editable field overrides before creating the duplicate', () => {
    const recurringRule = { frequency: 'weekly' as const, interval: 2, endDate: null };

    const duplicate = duplicateTask('proj-1', 'task-1', {
      title: 'Custom duplicate title',
      description: '<p>Custom duplicate description</p>',
      assigneeId: 'mem-2',
      dueDate: '2026-09-15T00:00:00.000Z',
      status: 'open',
      milestoneId: 'ms-2',
      recurringRule,
    });

    expect(duplicate).toBeDefined();
    expect(duplicate?.title).toBe('Custom duplicate title');
    expect(duplicate?.description).toBe('<p>Custom duplicate description</p>');
    expect(duplicate?.assigneeId).toBe('mem-2');
    expect(duplicate?.dueDate).toBe('2026-09-15T00:00:00.000Z');
    expect(duplicate?.status).toBe('open');
    expect(duplicate?.milestoneId).toBe('ms-2');
    expect(duplicate?.recurringRule).toEqual(recurringRule);
  });

  it('creates an independent task that does not share history with the source', () => {
    const sourceHistory = getTaskHistory('proj-1', 'task-1');
    expect(sourceHistory?.some((entry) => entry.id === 'hist-1')).toBe(true);

    const duplicate = duplicateTask('proj-1', 'task-1');
    expect(duplicate).toBeDefined();

    const duplicateHistory = getTaskHistory('proj-1', duplicate!.id);
    expect(duplicateHistory?.some((entry) => entry.id === 'hist-1')).toBe(false);
    expect(duplicateHistory?.some((entry) => entry.action === 'duplicated')).toBe(true);
    expect(duplicateHistory?.some((entry) => entry.action === 'created')).toBe(true);

    updateTask('proj-1', duplicate!.id, { title: 'Changed duplicate title' });

    expect(getTask('proj-1', 'task-1')?.title).toBe('Update homepage hero');
    expect(getTask('proj-1', duplicate!.id)?.title).toBe('Changed duplicate title');
  });

  it('optionally duplicates subtasks under the new parent task', () => {
    const duplicate = duplicateTask('proj-1', 'task-3', { includeSubtasks: true });

    expect(duplicate).toBeDefined();

    const activeTasksAfterDuplicate = listTasks('proj-1') ?? [];
    const duplicatedSubtasks = activeTasksAfterDuplicate.filter(
      (taskItem) => taskItem.parentTaskId === duplicate!.id,
    );

    expect(duplicatedSubtasks).toHaveLength(2);
    expect(duplicatedSubtasks.map((taskItem) => taskItem.title).sort()).toEqual([
      'Draft blog outline (copy)',
      'Review blog draft (copy)',
    ]);
  });

  it('does not duplicate subtasks when includeSubtasks is false', () => {
    const duplicate = duplicateTask('proj-1', 'task-3', { includeSubtasks: false });

    expect(duplicate).toBeDefined();
    expect(
      listTasks('proj-1')?.some((taskItem) => taskItem.parentTaskId === duplicate!.id),
    ).toBe(false);
  });

  it('optionally copies and remaps outgoing dependency links to the duplicate task id', () => {
    const duplicate = duplicateTask('proj-1', 'task-5', { includeLinks: true });

    expect(duplicate).toBeDefined();

    const dependencies = listTaskDependencies('proj-1') ?? [];
    const remappedOutgoing = dependencies.find(
      (dependency) =>
        dependency.taskId === duplicate!.id && dependency.dependsOnTaskId === 'task-4',
    );

    expect(remappedOutgoing).toBeDefined();
    expect(remappedOutgoing?.linkType).toBe('blocks');
    expect(dependencies.some((dependency) => dependency.id === 'dep-1')).toBe(true);
  });

  it('does not copy dependency links when includeLinks is false', () => {
    const beforeCount = listTaskDependencies('proj-1')?.length ?? 0;

    const duplicate = duplicateTask('proj-1', 'task-5', { includeLinks: false });

    expect(duplicate).toBeDefined();
    expect(listTaskDependencies('proj-1')?.length).toBe(beforeCount);
    expect(
      listTaskDependencies('proj-1')?.some((dependency) => dependency.taskId === duplicate!.id),
    ).toBe(false);
  });

  it('remaps incoming dependency links to the duplicate task id', () => {
    addTaskDependency('proj-1', 'task-6', {
      dependsOnTaskId: 'task-2',
      linkType: 'relates_to',
    });

    const duplicate = duplicateTask('proj-1', 'task-2', { includeLinks: true });

    expect(duplicate).toBeDefined();

    const dependencies = listTaskDependencies('proj-1') ?? [];
    const remappedIncoming = dependencies.find(
      (dependency) =>
        dependency.taskId === 'task-6' && dependency.dependsOnTaskId === duplicate!.id,
    );

    expect(remappedIncoming).toBeDefined();
    expect(remappedIncoming?.linkType).toBe('relates_to');
  });
});

describe('mock-project-store task dependencies', () => {
  beforeEach(() => {
    resetMockStore();
  });

  it('creates a typed blocks link', () => {
    const result = addTaskDependency('proj-1', 'task-6', {
      dependsOnTaskId: 'task-3',
      linkType: 'blocks',
    });

    expect(result.kind).toBe('success');
    if (result.kind === 'success') {
      expect(result.dependency.linkType).toBe('blocks');
      expect(result.dependency.taskId).toBe('task-6');
      expect(result.dependency.dependsOnTaskId).toBe('task-3');

      const dependencies = listTaskDependencies('proj-1');
      expect(dependencies?.some((dep) => dep.id === result.dependency.id)).toBe(true);
    }
  });

  it('creates a typed relates_to link', () => {
    const result = addTaskDependency('proj-1', 'task-1', {
      dependsOnTaskId: 'task-2',
      linkType: 'relates_to',
    });

    expect(result.kind).toBe('success');
    if (result.kind === 'success') {
      expect(result.dependency.linkType).toBe('relates_to');
    }
  });

  it('removes an existing link', () => {
    const removed = removeTaskDependency('proj-1', 'task-5', 'dep-1');

    expect(removed).toBe(true);
    expect(listTaskDependencies('proj-1')?.some((dep) => dep.id === 'dep-1')).toBe(false);
  });

  it('rejects direct circular blocks pairs', () => {
    const result = addTaskDependency('proj-1', 'task-4', {
      dependsOnTaskId: 'task-5',
      linkType: 'blocks',
    });

    expect(result.kind).toBe('validation_error');
  });

  it('allows reverse relates_to links without circular blocks rejection', () => {
    addTaskDependency('proj-1', 'task-1', {
      dependsOnTaskId: 'task-2',
      linkType: 'relates_to',
    });

    const result = addTaskDependency('proj-1', 'task-2', {
      dependsOnTaskId: 'task-1',
      linkType: 'relates_to',
    });

    expect(result.kind).toBe('success');
  });
});
