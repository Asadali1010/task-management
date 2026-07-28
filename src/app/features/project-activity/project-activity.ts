import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { Component, effect, inject, input, OnInit, signal } from '@angular/core';

import { ProjectActivity as ProjectActivityModel } from '../../core/models/project.models';
import { ProjectService } from '../../core/services/project.service';

@Component({
  selector: 'app-project-activity',
  imports: [DatePipe],
  templateUrl: './project-activity.html',
  styleUrl: './project-activity.css',
})
export class ProjectActivity implements OnInit {
  private static readonly PAGE_SIZE = 20;

  readonly projectIdInput = input('');
  readonly refreshTrigger = input(0);

  private readonly projectService = inject(ProjectService);
  private refreshTriggerInitialized = false;

  protected readonly isLoading = signal(true);
  protected readonly isLoadingMore = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly activities = signal<ProjectActivityModel[]>([]);
  protected readonly hasMore = signal(false);

  private currentPage = 0;

  constructor() {
    effect(() => {
      const trigger = this.refreshTrigger();
      if (!this.refreshTriggerInitialized) {
        this.refreshTriggerInitialized = true;
        return;
      }

      const id = this.projectIdInput();
      if (id) {
        this.loadFirstPage(id, { silent: true });
      }
    });
  }

  ngOnInit(): void {
    const id = this.projectIdInput();
    if (!id) {
      this.isLoading.set(false);
      this.errorMessage.set('Project not found. Check the URL and try again.');
      return;
    }

    this.loadFirstPage(id);
  }

  protected retryLoad(): void {
    const id = this.projectIdInput();
    if (id) {
      this.loadFirstPage(id);
    }
  }

  protected loadMore(): void {
    const id = this.projectIdInput();
    if (!id || this.isLoadingMore() || !this.hasMore()) {
      return;
    }

    this.isLoadingMore.set(true);
    this.errorMessage.set(null);

    this.projectService
      .getProjectActivity(id, {
        page: this.currentPage + 1,
        pageSize: ProjectActivity.PAGE_SIZE,
      })
      .subscribe({
        next: (response) => {
          this.currentPage = response.page;
          this.activities.update((existing) => [...existing, ...response.activities]);
          this.hasMore.set(response.hasMore);
          this.isLoadingMore.set(false);
        },
        error: (error) => {
          this.isLoadingMore.set(false);
          this.errorMessage.set(this.getLoadErrorMessage(error));
        },
      });
  }

  private loadFirstPage(projectId: string, options?: { silent?: boolean }): void {
    const silent = options?.silent ?? false;
    if (!silent) {
      this.isLoading.set(true);
      this.errorMessage.set(null);
      this.activities.set([]);
      this.hasMore.set(false);
    }

    this.currentPage = 0;

    this.projectService
      .getProjectActivity(projectId, { page: 1, pageSize: ProjectActivity.PAGE_SIZE })
      .subscribe({
        next: (response) => {
          this.currentPage = response.page;
          this.activities.set(response.activities);
          this.hasMore.set(response.hasMore);
          this.isLoading.set(false);
          this.errorMessage.set(null);
        },
        error: (error) => {
          this.isLoading.set(false);
          if (!silent || this.activities().length === 0) {
            this.errorMessage.set(this.getLoadErrorMessage(error));
          }
        },
      });
  }

  private getLoadErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 403) {
      return 'You do not have permission to view activity for this project.';
    }

    if (error instanceof HttpErrorResponse && error.status === 404) {
      return 'Project not found. Check the URL and try again.';
    }

    return 'Unable to load activity. Refresh the page or try again in a moment.';
  }
}
