import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { forkJoin, map, of, switchMap } from 'rxjs';

import { ProjectSummary, Task, TaskStatus } from '../../core/models/project.models';
import { ProjectService } from '../../core/services/project.service';

export interface WorkspaceTaskRow {
  task: Task;
  project: ProjectSummary;
}

@Component({
  selector: 'app-tasks',
  imports: [RouterLink, DatePipe],
  templateUrl: './tasks.html',
  styleUrl: './tasks.css',
})
export class Tasks implements OnInit {
  private readonly projectService = inject(ProjectService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly workspaceTasks = signal<WorkspaceTaskRow[]>([]);
  protected readonly statusFilter = signal<'all' | TaskStatus>('all');

  ngOnInit(): void {
    this.loadWorkspaceTasks();
  }

  protected retryLoad(): void {
    this.loadWorkspaceTasks();
  }

  protected filteredTasks(): WorkspaceTaskRow[] {
    const filter = this.statusFilter();
    const rows = this.workspaceTasks();
    if (filter === 'all') {
      return rows;
    }
    return rows.filter((row) => row.task.status === filter);
  }

  protected setStatusFilter(filter: 'all' | TaskStatus): void {
    this.statusFilter.set(filter);
  }

  protected formatStatus(status: TaskStatus): string {
    return status === 'done' ? 'Done' : 'Open';
  }

  protected trackRow(_index: number, row: WorkspaceTaskRow): string {
    return `${row.project.id}:${row.task.id}`;
  }

  private loadWorkspaceTasks(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.workspaceTasks.set([]);

    this.projectService
      .getProjects({ archived: false })
      .pipe(
        switchMap((response) => {
          if (response.projects.length === 0) {
            return of([] as WorkspaceTaskRow[]);
          }

          return forkJoin(
            response.projects.map((project) =>
              this.projectService.listTasks(project.id).pipe(
                map((taskResponse) =>
                  taskResponse.tasks.map((task) => ({ task, project })),
                ),
              ),
            ),
          ).pipe(map((groups) => groups.flat()));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (rows) => {
          rows.sort((a, b) => a.project.name.localeCompare(b.project.name));
          this.workspaceTasks.set(rows);
          this.isLoading.set(false);
        },
        error: (error) => {
          this.isLoading.set(false);
          this.errorMessage.set(this.getLoadErrorMessage(error));
        },
      });
  }

  private getLoadErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 403) {
      return 'You do not have permission to view workspace tasks.';
    }

    return 'Unable to load workspace tasks. Refresh the page or try again in a moment.';
  }
}
