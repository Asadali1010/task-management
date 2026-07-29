import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { isRichTextEmpty, sanitizeRichTextHtml } from '../../core/utils/rich-text-sanitize';
import { RichTextEditor } from '../../shared/rich-text-editor/rich-text-editor';
import {
  Milestone,
  ProjectMember,
  SubtaskDeleteStrategy,
  Task,
  TaskDependency,
  TaskHierarchyNode,
  TaskHistoryEntry,
  TaskLinkType,
  TaskStatus,
  TaskTemplate,
} from '../../core/models/project.models';
import { ProjectService } from '../../core/services/project.service';

interface TaskLinkDraft {
  targetTaskId: string;
  linkType: TaskLinkType;
}

interface FlatTaskRow {
  node: TaskHierarchyNode;
  depth: number;
}

interface SubtaskProgress {
  completed: number;
  total: number;
  percent: number;
}

const richTextRequired: ValidatorFn = (control): ValidationErrors | null =>
  isRichTextEmpty(control.value) ? { required: true } : null;

@Component({
  selector: 'app-project-tasks',
  imports: [RouterLink, DatePipe, ReactiveFormsModule, RichTextEditor],
  templateUrl: './project-tasks.html',
  styleUrl: './project-tasks.css',
})
export class ProjectTasks implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly projectService = inject(ProjectService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly projectId = signal('');
  protected readonly taskHierarchy = signal<TaskHierarchyNode[]>([]);
  protected readonly flatTasks = signal<Task[]>([]);
  protected readonly dependencies = signal<TaskDependency[]>([]);
  protected readonly templates = signal<TaskTemplate[]>([]);
  protected readonly selectedTaskIds = signal<Set<string>>(new Set());
  protected readonly editingTaskId = signal<string | null>(null);
  protected readonly subtaskParentId = signal<string | null>(null);
  protected readonly deleteConfirmTaskId = signal<string | null>(null);
  protected readonly milestones = signal<Milestone[]>([]);
  protected readonly historyTaskId = signal<string | null>(null);
  protected readonly taskHistory = signal<TaskHistoryEntry[]>([]);
  protected readonly isHistoryLoading = signal(false);
  protected readonly isCreating = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly isBulkActing = signal(false);
  protected readonly actingTaskId = signal<string | null>(null);
  protected readonly duplicateIncludeSubtasks = signal(false);
  protected readonly projectMembers = signal<ProjectMember[]>([]);
  protected readonly deletedTasks = signal<Task[]>([]);
  protected readonly restoringTaskId = signal<string | null>(null);
  protected readonly linkDrafts = signal<Record<string, TaskLinkDraft>>({});
  protected readonly linkingTaskId = signal<string | null>(null);
  protected readonly removingLinkId = signal<string | null>(null);
  protected readonly linkErrors = signal<Record<string, string | null>>({});

  protected readonly deletedTaskGracePeriodDays = 30;

  protected readonly flatRows = computed(() => this.flattenHierarchy(this.taskHierarchy()));
  protected readonly selectedCount = computed(() => this.selectedTaskIds().size);
  protected readonly hasSelection = computed(() => this.selectedCount() > 0);

  protected readonly createForm = this.fb.nonNullable.group({
    title: ['', Validators.required],
    description: ['', richTextRequired],
    assigneeId: ['', Validators.required],
    dueDate: ['', Validators.required],
    status: ['open' as TaskStatus],
    recurringEnabled: [false],
    recurringFrequency: ['weekly' as 'daily' | 'weekly' | 'monthly'],
    recurringInterval: [1, [Validators.min(1)]],
  });

  protected readonly editForm = this.fb.nonNullable.group({
    title: ['', Validators.required],
    description: ['', richTextRequired],
    assigneeId: ['', Validators.required],
    dueDate: ['', Validators.required],
    status: ['open' as TaskStatus],
  });

  protected readonly templateForm = this.fb.nonNullable.group({
    templateId: ['', Validators.required],
    title: [''],
  });

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = params.get('projectId');
      if (!id) {
        this.isLoading.set(false);
        this.errorMessage.set('Project not found. Check the URL and try again.');
        return;
      }

      this.projectId.set(id);
      this.loadTasks(id);
    });
  }

  protected retryLoad(): void {
    const id = this.projectId();
    if (id) {
      this.loadTasks(id);
    }
  }

  protected onCreateSubmit(): void {
    if (this.createForm.invalid || this.isCreating()) {
      this.createForm.markAllAsTouched();
      return;
    }

    const projectId = this.projectId();
    if (!projectId) {
      return;
    }

    this.isCreating.set(true);
    this.actionError.set(null);
    const raw = this.createForm.getRawValue();
    const parentTaskId = this.subtaskParentId();

    this.projectService
      .createTask(projectId, {
        title: raw.title,
        description: raw.description,
        assigneeId: raw.assigneeId,
        dueDate: this.toIsoDueDate(raw.dueDate),
        status: raw.status,
        parentTaskId,
        recurringRule: raw.recurringEnabled
          ? {
              frequency: raw.recurringFrequency,
              interval: raw.recurringInterval,
              endDate: null,
            }
          : null,
      })
      .subscribe({
        next: () => {
          this.isCreating.set(false);
          this.subtaskParentId.set(null);
          this.createForm.reset({
            title: '',
            description: '',
            assigneeId: '',
            dueDate: '',
            status: 'open',
            recurringEnabled: false,
            recurringFrequency: 'weekly',
            recurringInterval: 1,
          });
          this.reloadTasks(projectId);
        },
        error: () => {
          this.isCreating.set(false);
          this.actionError.set('Unable to create task. Try again in a moment.');
        },
      });
  }

  protected startSubtask(parentId: string): void {
    const parent = this.flatTasks().find((task) => task.id === parentId);
    this.subtaskParentId.set(parentId);
    this.editingTaskId.set(null);
    this.historyTaskId.set(null);
    this.deleteConfirmTaskId.set(null);
    this.createForm.patchValue({
      title: '',
      description: '',
      assigneeId: parent?.assigneeId ?? '',
      dueDate: '',
      status: 'open',
    });
  }

  protected cancelSubtask(): void {
    this.subtaskParentId.set(null);
  }

  protected startEdit(task: Task): void {
    this.editingTaskId.set(task.id);
    this.subtaskParentId.set(null);
    this.historyTaskId.set(null);
    this.editForm.patchValue({
      title: task.title,
      description: task.description ?? '',
      assigneeId: task.assigneeId,
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
      status: task.status,
    });
  }

  protected cancelEdit(): void {
    this.editingTaskId.set(null);
  }

  protected onEditSubmit(): void {
    if (this.editForm.invalid || this.isSaving()) {
      this.editForm.markAllAsTouched();
      return;
    }

    const projectId = this.projectId();
    const taskId = this.editingTaskId();
    if (!projectId || !taskId) {
      return;
    }

    this.isSaving.set(true);
    this.actionError.set(null);
    const raw = this.editForm.getRawValue();

    this.projectService
      .updateTask(projectId, taskId, {
        title: raw.title,
        description: raw.description,
        assigneeId: raw.assigneeId,
        dueDate: this.toIsoDueDate(raw.dueDate),
        status: raw.status,
      })
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.editingTaskId.set(null);
          this.reloadTasks(projectId);
        },
        error: () => {
          this.isSaving.set(false);
          this.actionError.set('Unable to update task. Try again in a moment.');
        },
      });
  }

  protected requestDeleteTask(taskId: string): void {
    const node = this.findHierarchyNode(taskId);
    if (node && node.subtasks.length > 0) {
      this.deleteConfirmTaskId.set(taskId);
      return;
    }

    this.executeDeleteTask(taskId);
  }

  protected cancelDeleteConfirm(): void {
    this.deleteConfirmTaskId.set(null);
  }

  protected confirmDeleteTask(taskId: string, subtaskStrategy: SubtaskDeleteStrategy): void {
    this.executeDeleteTask(taskId, subtaskStrategy);
  }

  protected getSubtaskProgress(node: TaskHierarchyNode): SubtaskProgress | null {
    if (node.subtasks.length === 0) {
      return null;
    }

    const completed = node.subtasks.filter((subtask) => subtask.status === 'done').length;
    const total = node.subtasks.length;

    return {
      completed,
      total,
      percent: Math.round((completed / total) * 100),
    };
  }

  protected getSubtaskMilestoneContext(parentId: string): string | null {
    const parent = this.flatTasks().find((task) => task.id === parentId);
    if (!parent) {
      return null;
    }

    if (!parent.milestoneId) {
      return 'No milestone linked';
    }

    const milestoneTitle = this.milestones().find((milestone) => milestone.id === parent.milestoneId)?.title;
    return milestoneTitle ? `Inherits milestone: ${milestoneTitle}` : 'Inherits parent milestone';
  }

  protected duplicateTask(taskId: string): void {
    const projectId = this.projectId();
    if (!projectId || this.actingTaskId()) {
      return;
    }

    this.actingTaskId.set(taskId);
    this.actionError.set(null);

    this.projectService
      .duplicateTask(projectId, taskId, {
        includeSubtasks: this.duplicateIncludeSubtasks(),
      })
      .subscribe({
        next: () => {
          this.actingTaskId.set(null);
          this.reloadTasks(projectId);
        },
        error: () => {
          this.actingTaskId.set(null);
          this.actionError.set('Unable to duplicate task. Try again in a moment.');
        },
      });
  }

  protected onTemplateSubmit(): void {
    if (this.templateForm.invalid || this.isCreating()) {
      this.templateForm.markAllAsTouched();
      return;
    }

    const projectId = this.projectId();
    if (!projectId) {
      return;
    }

    this.isCreating.set(true);
    this.actionError.set(null);
    const { templateId, title } = this.templateForm.getRawValue();

    this.projectService
      .createTaskFromTemplate(projectId, {
        templateId,
        title: title || undefined,
      })
      .subscribe({
        next: () => {
          this.isCreating.set(false);
          this.templateForm.reset({ templateId: '', title: '' });
          this.reloadTasks(projectId);
        },
        error: () => {
          this.isCreating.set(false);
          this.actionError.set('Unable to create task from template. Try again in a moment.');
        },
      });
  }

  protected toggleTaskSelection(taskId: string, selected: boolean): void {
    this.selectedTaskIds.update((current) => {
      const next = new Set(current);
      if (selected) {
        next.add(taskId);
      } else {
        next.delete(taskId);
      }
      return next;
    });
  }

  protected isTaskSelected(taskId: string): boolean {
    return this.selectedTaskIds().has(taskId);
  }

  protected toggleSelectAll(checked: boolean): void {
    if (checked) {
      this.selectedTaskIds.set(new Set(this.flatTasks().map((task) => task.id)));
    } else {
      this.selectedTaskIds.set(new Set());
    }
  }

  protected bulkUpdateStatus(status: TaskStatus): void {
    this.runBulkAction({ action: 'update_status', status });
  }

  protected bulkDelete(): void {
    this.runBulkAction({ action: 'delete' });
  }

  protected openHistory(taskId: string): void {
    const projectId = this.projectId();
    if (!projectId) {
      return;
    }

    this.historyTaskId.set(taskId);
    this.editingTaskId.set(null);
    this.isHistoryLoading.set(true);
    this.taskHistory.set([]);

    this.projectService.getTaskHistory(projectId, taskId).subscribe({
      next: (response) => {
        this.taskHistory.set(response.history);
        this.isHistoryLoading.set(false);
      },
      error: () => {
        this.isHistoryLoading.set(false);
        this.actionError.set('Unable to load task history. Try again in a moment.');
      },
    });
  }

  protected closeHistory(): void {
    this.historyTaskId.set(null);
    this.taskHistory.set([]);
  }

  protected isTaskBlocked(taskId: string): boolean {
    const taskMap = new Map(this.flatTasks().map((task) => [task.id, task]));
    return this.dependencies()
      .filter((dependency) => dependency.taskId === taskId)
      .some((dependency) => {
        const blocker = taskMap.get(dependency.dependsOnTaskId);
        return blocker !== undefined && blocker.status !== 'done';
      });
  }

  protected getBlockingTaskTitles(taskId: string): string {
    const taskMap = new Map(this.flatTasks().map((task) => [task.id, task]));
    return this.dependencies()
      .filter((dependency) => dependency.taskId === taskId)
      .map((dependency) => taskMap.get(dependency.dependsOnTaskId))
      .filter((task): task is Task => task !== undefined && task.status !== 'done')
      .map((task) => task.title)
      .join(', ');
  }

  protected formatRecurring(task: Task): string | null {
    if (!task.recurringRule) {
      return null;
    }

    const { frequency, interval } = task.recurringRule;
    const unit = interval === 1 ? frequency.replace('ly', '') : `${frequency.replace('ly', '')}s`;
    return interval === 1 ? `Repeats ${frequency}` : `Every ${interval} ${unit}`;
  }

  protected formatStatus(status: TaskStatus): string {
    return status === 'done' ? 'Done' : 'Open';
  }

  protected getAssigneeName(assigneeId: string): string {
    const member = this.projectMembers().find((entry) => entry.id === assigneeId);
    return member?.name ?? 'Unknown assignee';
  }

  protected restoreDeletedTask(taskId: string): void {
    const projectId = this.projectId();
    if (!projectId || this.restoringTaskId()) {
      return;
    }

    this.restoringTaskId.set(taskId);
    this.actionError.set(null);

    this.projectService.restoreTask(projectId, taskId).subscribe({
      next: () => {
        this.restoringTaskId.set(null);
        this.reloadTasks(projectId);
      },
      error: () => {
        this.restoringTaskId.set(null);
        this.actionError.set('Unable to restore task. Try again in a moment.');
      },
    });
  }

  protected formatHistoryAction(action: TaskHistoryEntry['action']): string {
    return action.replace(/_/g, ' ');
  }

  protected hasTaskDescription(description: string | null | undefined): boolean {
    return !isRichTextEmpty(description);
  }

  protected getTaskDescriptionHtml(description: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(sanitizeRichTextHtml(description));
  }

  protected getCreateHeading(): string {
    const parentId = this.subtaskParentId();
    if (!parentId) {
      return 'Create task';
    }

    const parent = this.flatTasks().find((task) => task.id === parentId);
    return parent ? `Add subtask to “${parent.title}”` : 'Add subtask';
  }

  protected getOutgoingLinks(taskId: string): TaskDependency[] {
    return this.dependencies().filter((dependency) => dependency.taskId === taskId);
  }

  protected getIncomingLinks(taskId: string): TaskDependency[] {
    return this.dependencies().filter((dependency) => dependency.dependsOnTaskId === taskId);
  }

  protected getTaskTitle(taskId: string): string {
    return this.flatTasks().find((task) => task.id === taskId)?.title ?? 'Unknown task';
  }

  protected formatOutgoingLinkLabel(linkType: TaskLinkType): string {
    return linkType === 'blocks' ? 'Blocks' : 'Relates to';
  }

  protected formatIncomingLinkLabel(linkType: TaskLinkType): string {
    return linkType === 'blocks' ? 'Blocked by' : 'Related to';
  }

  protected getLinkableTasks(taskId: string): Task[] {
    const linkedTargetIds = new Set(
      this.getOutgoingLinks(taskId).map((dependency) => dependency.dependsOnTaskId),
    );

    return this.flatTasks().filter((task) => task.id !== taskId && !linkedTargetIds.has(task.id));
  }

  protected getLinkDraft(taskId: string): TaskLinkDraft {
    return this.linkDrafts()[taskId] ?? { targetTaskId: '', linkType: 'blocks' };
  }

  protected updateLinkDraft(taskId: string, patch: Partial<TaskLinkDraft>): void {
    this.linkDrafts.update((drafts) => ({
      ...drafts,
      [taskId]: { ...this.getLinkDraft(taskId), ...patch },
    }));
  }

  protected getLinkError(taskId: string): string | null {
    return this.linkErrors()[taskId] ?? null;
  }

  protected addTaskLink(taskId: string): void {
    const projectId = this.projectId();
    const draft = this.getLinkDraft(taskId);
    if (!projectId || !draft.targetTaskId || this.linkingTaskId()) {
      return;
    }

    this.linkingTaskId.set(taskId);
    this.linkErrors.update((errors) => ({ ...errors, [taskId]: null }));
    this.actionError.set(null);

    this.projectService
      .addTaskDependency(projectId, taskId, {
        dependsOnTaskId: draft.targetTaskId,
        linkType: draft.linkType,
      })
      .subscribe({
        next: () => {
          this.linkingTaskId.set(null);
          this.linkDrafts.update((drafts) => ({
            ...drafts,
            [taskId]: { targetTaskId: '', linkType: 'blocks' },
          }));
          this.reloadTasks(projectId);
        },
        error: (error) => {
          this.linkingTaskId.set(null);
          const message =
            error instanceof HttpErrorResponse && error.status === 400
              ? 'Cannot add this link. Circular "Blocks" relationships are not allowed.'
              : 'Unable to add task link. Try again in a moment.';
          this.linkErrors.update((errors) => ({ ...errors, [taskId]: message }));
        },
      });
  }

  protected removeTaskLink(dependency: TaskDependency): void {
    const projectId = this.projectId();
    if (!projectId || this.removingLinkId()) {
      return;
    }

    this.removingLinkId.set(dependency.id);
    this.linkErrors.update((errors) => ({ ...errors, [dependency.taskId]: null }));

    this.projectService
      .removeTaskDependency(projectId, dependency.taskId, dependency.id)
      .subscribe({
        next: () => {
          this.removingLinkId.set(null);
          this.reloadTasks(projectId);
        },
        error: () => {
          this.removingLinkId.set(null);
          this.linkErrors.update((errors) => ({
            ...errors,
            [dependency.taskId]: 'Unable to remove task link. Try again in a moment.',
          }));
        },
      });
  }

  private runBulkAction(options: { action: 'delete' } | { action: 'update_status'; status: TaskStatus }): void {
    const projectId = this.projectId();
    const taskIds = [...this.selectedTaskIds()];
    if (!projectId || taskIds.length === 0 || this.isBulkActing()) {
      return;
    }

    this.isBulkActing.set(true);
    this.actionError.set(null);

    this.projectService
      .bulkTaskAction(projectId, {
        taskIds,
        action: options.action,
        ...(options.action === 'update_status' ? { status: options.status } : {}),
      })
      .subscribe({
        next: () => {
          this.isBulkActing.set(false);
          this.selectedTaskIds.set(new Set());
          this.reloadTasks(projectId);
        },
        error: () => {
          this.isBulkActing.set(false);
          this.actionError.set('Bulk action failed. Try again in a moment.');
        },
      });
  }

  private loadTasks(projectId: string): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.taskHierarchy.set([]);
    this.selectedTaskIds.set(new Set());

    forkJoin({
      detail: this.projectService.getProjectDetail(projectId),
      hierarchy: this.projectService.getTaskHierarchy(projectId),
      flat: this.projectService.listTasks(projectId),
      templates: this.projectService.listTaskTemplates(projectId),
      dependencies: this.projectService.listTaskDependencies(projectId),
      deleted: this.projectService.listDeletedTasks(projectId),
      milestones: this.projectService.listMilestones(projectId),
    }).subscribe({
      next: ({ detail, hierarchy, flat, templates, dependencies, deleted, milestones }) => {
        this.projectMembers.set(detail.members);
        this.taskHierarchy.set(hierarchy.tasks);
        this.flatTasks.set(flat.tasks);
        this.templates.set(templates.templates);
        this.dependencies.set(dependencies.dependencies);
        this.deletedTasks.set(deleted.tasks);
        this.milestones.set(milestones.milestones);
        this.isLoading.set(false);
        this.errorMessage.set(null);
      },
      error: (error) => {
        this.isLoading.set(false);
        this.errorMessage.set(this.getLoadErrorMessage(error));
      },
    });
  }

  private reloadTasks(projectId: string): void {
    forkJoin({
      hierarchy: this.projectService.getTaskHierarchy(projectId),
      flat: this.projectService.listTasks(projectId),
      dependencies: this.projectService.listTaskDependencies(projectId),
      deleted: this.projectService.listDeletedTasks(projectId),
    }).subscribe({
      next: ({ hierarchy, flat, dependencies, deleted }) => {
        this.taskHierarchy.set(hierarchy.tasks);
        this.flatTasks.set(flat.tasks);
        this.dependencies.set(dependencies.dependencies);
        this.deletedTasks.set(deleted.tasks);
      },
    });
  }

  private executeDeleteTask(taskId: string, subtaskStrategy?: SubtaskDeleteStrategy): void {
    const projectId = this.projectId();
    if (!projectId || this.actingTaskId()) {
      return;
    }

    this.actingTaskId.set(taskId);
    this.actionError.set(null);

    this.projectService
      .deleteTask(projectId, taskId, subtaskStrategy ? { subtaskStrategy } : {})
      .subscribe({
        next: () => {
          this.actingTaskId.set(null);
          this.deleteConfirmTaskId.set(null);
          this.selectedTaskIds.update((current) => {
            const next = new Set(current);
            next.delete(taskId);
            return next;
          });
          if (this.historyTaskId() === taskId) {
            this.historyTaskId.set(null);
          }
          if (this.editingTaskId() === taskId) {
            this.editingTaskId.set(null);
          }
          this.reloadTasks(projectId);
        },
        error: () => {
          this.actingTaskId.set(null);
          this.actionError.set('Unable to delete task. Try again in a moment.');
        },
      });
  }

  private findHierarchyNode(taskId: string, nodes = this.taskHierarchy()): TaskHierarchyNode | null {
    for (const node of nodes) {
      if (node.id === taskId) {
        return node;
      }

      const match = this.findHierarchyNode(taskId, node.subtasks);
      if (match) {
        return match;
      }
    }

    return null;
  }

  private flattenHierarchy(nodes: TaskHierarchyNode[], depth = 0): FlatTaskRow[] {
    return nodes.flatMap((node) => [
      { node, depth },
      ...this.flattenHierarchy(node.subtasks, depth + 1),
    ]);
  }

  private getLoadErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 403) {
      return 'You do not have permission to view tasks for this project.';
    }

    if (error instanceof HttpErrorResponse && error.status === 404) {
      return 'Project not found. Check the URL and try again.';
    }

    return 'Unable to load tasks. Refresh the page or try again in a moment.';
  }

  private toIsoDueDate(dateInput: string): string {
    return `${dateInput}T00:00:00.000Z`;
  }
}
