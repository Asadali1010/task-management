import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { hasPermission } from '../../core/constants/project-role.permissions';
import { ProjectSummary } from '../../core/models/project.models';
import { ProjectService } from '../../core/services/project.service';

type DashboardView = 'active' | 'archived';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, DatePipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  private readonly projectService = inject(ProjectService);

  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly projects = signal<ProjectSummary[]>([]);
  protected readonly view = signal<DashboardView>('active');
  protected readonly restoringProjectId = signal<string | null>(null);
  protected readonly restoreError = signal<string | null>(null);

  ngOnInit(): void {
    this.loadProjects();
  }

  protected setView(next: DashboardView): void {
    if (this.view() === next) {
      return;
    }

    this.view.set(next);
    this.loadProjects();
  }

  protected isActiveView(): boolean {
    return this.view() === 'active';
  }

  protected canRestore(project: ProjectSummary): boolean {
    return hasPermission(project.viewerRole, 'archiveProject');
  }

  protected formatStatus(status: string): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  protected retryLoad(): void {
    this.loadProjects();
  }

  protected onRestore(projectId: string, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    if (this.restoringProjectId()) {
      return;
    }

    this.restoringProjectId.set(projectId);
    this.restoreError.set(null);

    this.projectService.restoreProject(projectId).subscribe({
      next: () => {
        this.restoringProjectId.set(null);
        this.projects.update((projects) => projects.filter((project) => project.id !== projectId));
      },
      error: (error) => {
        this.restoringProjectId.set(null);
        this.restoreError.set(this.getRestoreErrorMessage(error));
      },
    });
  }

  private getRestoreErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 403) {
      return 'You do not have permission to restore this project.';
    }

    return 'Unable to restore project. Try again in a moment.';
  }

  private loadProjects(): void {
    const archived = this.view() === 'archived';

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.restoreError.set(null);
    this.projects.set([]);

    this.projectService.getProjects({ archived }).subscribe({
      next: (response) => {
        this.projects.set(response.projects);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set(
          archived
            ? 'Unable to load archived projects. Refresh the page or try again in a moment.'
            : 'Unable to load projects. Refresh the page or try again in a moment.',
        );
      },
    });
  }
}
