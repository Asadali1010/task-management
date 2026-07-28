import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createTask,
  deleteTask,
  listDeletedTasks,
  listTasks,
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
