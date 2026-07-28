import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { Milestone, Task } from '../../core/models/project.models';
import { ProjectService } from '../../core/services/project.service';

@Component({
  selector: 'app-project-milestones',
  imports: [RouterLink, DatePipe, ReactiveFormsModule],
  templateUrl: './project-milestones.html',
  styleUrl: './project-milestones.css',
})
export class ProjectMilestones implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly projectService = inject(ProjectService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);

  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly milestones = signal<Milestone[]>([]);
  protected readonly tasks = signal<Task[]>([]);
  protected readonly projectId = signal('');
  protected readonly isCreating = signal(false);
  protected readonly linkingTaskId = signal<string | null>(null);
  protected readonly linkError = signal<string | null>(null);
  protected readonly selectedLinkTaskByMilestone = signal<Record<string, string>>({});

  protected readonly createForm = this.fb.nonNullable.group({
    title: ['', Validators.required],
    dueDate: ['', Validators.required],
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
      this.loadMilestones(id);
    });
  }

  protected retryLoad(): void {
    const id = this.projectId();
    if (id) {
      this.loadMilestones(id);
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
    const { title, dueDate } = this.createForm.getRawValue();

    this.projectService
      .createMilestone(projectId, {
        title,
        dueDate: this.toIsoDueDate(dueDate),
      })
      .subscribe({
        next: () => {
          this.isCreating.set(false);
          this.createForm.reset({ title: '', dueDate: '' });
          this.loadMilestones(projectId, { silent: true });
        },
        error: () => {
          this.isCreating.set(false);
        },
      });
  }

  protected onLinkTaskSelect(milestoneId: string, event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedLinkTaskByMilestone.update((current) => ({
      ...current,
      [milestoneId]: select.value,
    }));
  }

  protected getSelectedLinkTask(milestoneId: string): string {
    return this.selectedLinkTaskByMilestone()[milestoneId] ?? '';
  }

  protected linkTask(milestoneId: string, taskId: string): void {
    if (!taskId || this.linkingTaskId()) {
      return;
    }

    const projectId = this.projectId();
    if (!projectId) {
      return;
    }

    this.linkingTaskId.set(taskId);
    this.linkError.set(null);

    this.projectService.linkTaskToMilestone(projectId, taskId, milestoneId).subscribe({
      next: () => {
        this.linkingTaskId.set(null);
        this.selectedLinkTaskByMilestone.update((current) => ({
          ...current,
          [milestoneId]: '',
        }));
        this.loadMilestones(projectId, { silent: true });
        this.loadTasks(projectId);
      },
      error: () => {
        this.linkingTaskId.set(null);
        this.linkError.set('Unable to link task. Try again in a moment.');
      },
    });
  }

  protected getLinkableTasks(milestoneId: string): Task[] {
    return this.tasks().filter((task) => task.milestoneId !== milestoneId);
  }

  private loadMilestones(projectId: string, options?: { silent?: boolean }): void {
    const silent = options?.silent ?? false;
    if (!silent) {
      this.isLoading.set(true);
      this.errorMessage.set(null);
      this.milestones.set([]);
    }

    forkJoin({
      milestones: this.projectService.listMilestones(projectId),
      tasks: this.projectService.listTasks(projectId),
    }).subscribe({
      next: ({ milestones, tasks }) => {
        this.milestones.set(milestones.milestones);
        this.tasks.set(tasks.tasks);
        this.isLoading.set(false);
        this.errorMessage.set(null);
      },
      error: (error) => {
        this.isLoading.set(false);
        if (!silent || this.milestones().length === 0) {
          this.errorMessage.set(this.getLoadErrorMessage(error));
        }
      },
    });
  }

  private loadTasks(projectId: string): void {
    this.projectService.listTasks(projectId).subscribe({
      next: (response) => {
        this.tasks.set(response.tasks);
      },
    });
  }

  private getLoadErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 403) {
      return 'You do not have permission to view milestones for this project.';
    }

    if (error instanceof HttpErrorResponse && error.status === 404) {
      return 'Project not found. Check the URL and try again.';
    }

    return 'Unable to load milestones. Refresh the page or try again in a moment.';
  }

  private toIsoDueDate(dateInput: string): string {
    return `${dateInput}T00:00:00.000Z`;
  }
}
