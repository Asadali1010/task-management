import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { ProjectDetail as ProjectDetailModel } from '../../core/models/project.models';
import { ProjectService } from '../../core/services/project.service';

@Component({
  selector: 'app-project-detail',
  imports: [RouterLink, DatePipe],
  templateUrl: './project-detail.html',
  styleUrl: './project-detail.css',
})
export class ProjectDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly projectService = inject(ProjectService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly project = signal<ProjectDetailModel | null>(null);
  protected readonly projectId = signal('');

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = params.get('projectId');
      if (!id) {
        this.isLoading.set(false);
        this.errorMessage.set('Project not found. Check the URL and try again.');
        return;
      }

      this.projectId.set(id);
      this.loadProject(id);
    });
  }

  protected retryLoad(): void {
    const id = this.projectId();
    if (id) {
      this.loadProject(id);
    }
  }

  protected formatStatus(status: string): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  protected getInitials(name: string): string {
    return name
      .split(' ')
      .map((part) => part.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  private loadProject(id: string): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.project.set(null);

    this.projectService.getProjectDetail(id).subscribe({
      next: (detail) => {
        this.project.set(detail);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set(
          'Unable to load this project. Refresh the page or try again in a moment.',
        );
      },
    });
  }
}
