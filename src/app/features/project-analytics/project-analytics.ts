import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { Component, DestroyRef, effect, inject, input, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { interval } from 'rxjs';

import {
  ProjectAnalytics as ProjectAnalyticsModel,
  ProjectAnalyticsStatusBreakdown,
  ProjectAnalyticsTimeSeriesPoint,
} from '../../core/models/project.models';
import { ProjectService } from '../../core/services/project.service';

export interface CompletionTrendPoint {
  date: string;
  completed: number;
  x: number;
  y: number;
}

export interface StatusBreakdownBar {
  status: string;
  label: string;
  count: number;
  widthPercent: number;
  color: string;
}

@Component({
  selector: 'app-project-analytics',
  imports: [RouterLink, DatePipe, ReactiveFormsModule],
  templateUrl: './project-analytics.html',
  styleUrl: './project-analytics.css',
})
export class ProjectAnalytics implements OnInit {
  readonly embedded = input(false);
  readonly projectIdInput = input('');
  readonly refreshTrigger = input(0);
  readonly pollIntervalMs = input(0);

  private readonly route = inject(ActivatedRoute);
  private readonly projectService = inject(ProjectService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private refreshTriggerInitialized = false;

  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly analytics = signal<ProjectAnalyticsModel | null>(null);
  protected readonly projectId = signal('');
  protected readonly completionTrendPoints = signal<CompletionTrendPoint[]>([]);
  protected readonly completionTrendLine = signal('');
  protected readonly statusBreakdownBars = signal<StatusBreakdownBar[]>([]);

  protected readonly dateRangeForm = this.fb.nonNullable.group({
    from: [this.toDateInputValue(this.daysAgo(29))],
    to: [this.toDateInputValue(new Date())],
  });

  constructor() {
    effect(() => {
      const trigger = this.refreshTrigger();
      if (!this.refreshTriggerInitialized) {
        this.refreshTriggerInitialized = true;
        return;
      }

      const id = this.getActiveProjectId();
      if (id) {
        this.loadAnalytics(id, { silent: true });
      }
    });
  }

  ngOnInit(): void {
    if (this.embedded()) {
      const id = this.projectIdInput();
      if (!id) {
        this.isLoading.set(false);
        this.errorMessage.set('Project not found. Check the URL and try again.');
        return;
      }

      this.projectId.set(id);
      this.loadAnalytics(id);
    } else {
      this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
        const id = params.get('projectId');
        if (!id) {
          this.isLoading.set(false);
          this.errorMessage.set('Project not found. Check the URL and try again.');
          return;
        }

        this.projectId.set(id);
        this.loadAnalytics(id);
      });
    }

    this.dateRangeForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const id = this.getActiveProjectId();
        if (!id || this.dateRangeForm.invalid) {
          return;
        }

        const { from, to } = this.dateRangeForm.getRawValue();
        if (from && to && from <= to) {
          this.loadAnalytics(id);
        }
      });

    this.setupPolling();
  }

  protected retryLoad(): void {
    const id = this.getActiveProjectId();
    if (id) {
      this.loadAnalytics(id);
    }
  }

  protected formatStatus(status: string): string {
    return status
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  protected hasChartData(): boolean {
    const data = this.analytics();
    if (!data) {
      return false;
    }

    return data.timeSeries.length > 0 || data.statusBreakdown.length > 0;
  }

  protected getCompletionTrendDescription(): string {
    const points = this.completionTrendPoints();
    if (points.length === 0) {
      return 'No completion data for this date range.';
    }

    return points
      .map((point) => `${point.date}: ${point.completed} completed`)
      .join('; ');
  }

  protected getStatusBreakdownDescription(): string {
    const bars = this.statusBreakdownBars();
    if (bars.length === 0) {
      return 'No status breakdown for this date range.';
    }

    return bars.map((bar) => `${bar.label}: ${bar.count}`).join('; ');
  }

  private getActiveProjectId(): string {
    if (this.embedded()) {
      return this.projectIdInput() || this.projectId();
    }

    return this.projectId();
  }

  private setupPolling(): void {
    const pollMs = this.pollIntervalMs();
    if (pollMs <= 0) {
      return;
    }

    interval(pollMs)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const id = this.getActiveProjectId();
        if (id) {
          this.loadAnalytics(id, { silent: true });
        }
      });
  }

  private loadAnalytics(projectId: string, options?: { silent?: boolean }): void {
    const { from, to } = this.dateRangeForm.getRawValue();
    if (!from || !to || from > to) {
      return;
    }

    const silent = options?.silent ?? false;
    if (!silent) {
      this.isLoading.set(true);
      this.errorMessage.set(null);
      this.analytics.set(null);
    }

    this.projectService
      .getProjectAnalytics(projectId, {
        from: this.toIsoStart(from),
        to: this.toIsoEnd(to),
      })
      .subscribe({
        next: (data) => {
          this.analytics.set(data);
          this.updateChartData(data);
          this.isLoading.set(false);
          this.errorMessage.set(null);
        },
        error: (error) => {
          this.isLoading.set(false);
          if (!silent || !this.analytics()) {
            this.errorMessage.set(this.getLoadErrorMessage(error));
          }
        },
      });
  }

  private updateChartData(data: ProjectAnalyticsModel): void {
    this.completionTrendPoints.set(this.buildCompletionTrendPoints(data.timeSeries));
    this.completionTrendLine.set(this.buildCompletionTrendLine(this.completionTrendPoints()));
    this.statusBreakdownBars.set(this.buildStatusBreakdownBars(data.statusBreakdown));
  }

  private buildCompletionTrendPoints(
    timeSeries: ProjectAnalyticsTimeSeriesPoint[],
  ): CompletionTrendPoint[] {
    if (timeSeries.length === 0) {
      return [];
    }

    const chartWidth = 360;
    const chartHeight = 160;
    const padding = 16;
    const maxCompleted = Math.max(...timeSeries.map((point) => point.completed), 1);
    const stepX =
      timeSeries.length === 1
        ? 0
        : (chartWidth - padding * 2) / (timeSeries.length - 1);

    return timeSeries.map((point, index) => {
      const x = padding + stepX * index;
      const y =
        chartHeight -
        padding -
        (point.completed / maxCompleted) * (chartHeight - padding * 2);

      return {
        date: point.date,
        completed: point.completed,
        x,
        y,
      };
    });
  }

  private buildCompletionTrendLine(points: CompletionTrendPoint[]): string {
    if (points.length === 0) {
      return '';
    }

    return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  }

  private buildStatusBreakdownBars(
    breakdown: ProjectAnalyticsStatusBreakdown[],
  ): StatusBreakdownBar[] {
    if (breakdown.length === 0) {
      return [];
    }

    const maxCount = Math.max(...breakdown.map((item) => item.count), 1);
    const colors = ['#0d7377', '#0e7490', '#0369a1', '#4338ca', '#7c3aed', '#475569'];

    return breakdown.map((item, index) => ({
      status: item.status,
      label: this.formatStatus(item.status),
      count: item.count,
      widthPercent: (item.count / maxCount) * 100,
      color: colors[index % colors.length],
    }));
  }

  private getLoadErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 403) {
      return 'You do not have permission to view analytics for this project.';
    }

    if (error instanceof HttpErrorResponse && error.status === 404) {
      return 'Project not found. Check the URL and try again.';
    }

    return 'Unable to load analytics. Refresh the page or try again in a moment.';
  }

  private daysAgo(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  }

  private toDateInputValue(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private toIsoStart(dateInput: string): string {
    return `${dateInput}T00:00:00.000Z`;
  }

  private toIsoEnd(dateInput: string): string {
    return `${dateInput}T23:59:59.999Z`;
  }
}
