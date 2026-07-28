import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { ProjectAnalytics as ProjectAnalyticsModel } from '../../core/models/project.models';
import { ProjectService } from '../../core/services/project.service';
import { ProjectAnalytics } from './project-analytics';

describe('ProjectAnalytics', () => {
  let fixture: ComponentFixture<ProjectAnalytics>;
  let projectService: {
    getProjectAnalytics: ReturnType<typeof vi.fn>;
  };
  let paramMapSubject: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  const mockAnalytics: ProjectAnalyticsModel = {
    summary: {
      totalTasks: 24,
      completedTasks: 18,
      openTasks: 6,
      overdueTasks: 2,
      memberCount: 2,
    },
    timeSeries: [
      { date: '2026-07-01', completed: 2, created: 3 },
      { date: '2026-07-02', completed: 4, created: 1 },
    ],
    statusBreakdown: [
      { status: 'done', count: 18 },
      { status: 'in_progress', count: 4 },
      { status: 'todo', count: 2 },
    ],
  };

  beforeEach(async () => {
    projectService = {
      getProjectAnalytics: vi.fn(),
    };
    paramMapSubject = new BehaviorSubject(convertToParamMap({ projectId: 'proj-1' }));

    await TestBed.configureTestingModule({
      imports: [ProjectAnalytics],
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

  function createComponent(): void {
    fixture = TestBed.createComponent(ProjectAnalytics);
    fixture.detectChanges();
  }

  function getCompiled(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function mockAnalyticsSuccess(data: ProjectAnalyticsModel = mockAnalytics): void {
    projectService.getProjectAnalytics.mockReturnValue(of(data));
  }

  it('should load analytics for the project id from the route', () => {
    mockAnalyticsSuccess();
    createComponent();

    expect(projectService.getProjectAnalytics).toHaveBeenCalledTimes(1);
    expect(projectService.getProjectAnalytics).toHaveBeenCalledWith(
      'proj-1',
      expect.objectContaining({
        from: expect.stringMatching(/T00:00:00\.000Z$/),
        to: expect.stringMatching(/T23:59:59\.999Z$/),
      }),
    );

    const compiled = getCompiled();
    expect(compiled.querySelector('.analytics-state')).toBeNull();
    expect(compiled.textContent).toContain('Summary metrics');
    expect(compiled.textContent).toContain('24');
    expect(compiled.textContent).toContain('Completion trend');
    expect(compiled.textContent).toContain('Status breakdown');
    expect(compiled.querySelector('.analytics-line-chart')).not.toBeNull();
    expect(compiled.querySelector('.analytics-bar-chart')).not.toBeNull();
  });

  it('should refetch analytics when the date range changes', () => {
    mockAnalyticsSuccess();
    createComponent();

    expect(projectService.getProjectAnalytics).toHaveBeenCalledTimes(1);

    const fromInput = getCompiled().querySelector('#analytics-from') as HTMLInputElement;
    fromInput.value = '2026-06-01';
    fromInput.dispatchEvent(new Event('input'));
    fromInput.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(projectService.getProjectAnalytics).toHaveBeenCalledTimes(2);
    expect(projectService.getProjectAnalytics).toHaveBeenLastCalledWith('proj-1', {
      from: '2026-06-01T00:00:00.000Z',
      to: expect.stringMatching(/T23:59:59\.999Z$/),
    });
  });

  it('should show an error state and retry when loading fails', () => {
    projectService.getProjectAnalytics.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );
    createComponent();

    const compiled = getCompiled();
    expect(compiled.textContent).toContain('Something went wrong');
    expect(compiled.textContent).toContain('Unable to load analytics');

    mockAnalyticsSuccess();
    const retryButton = compiled.querySelector('.analytics-retry-btn') as HTMLButtonElement;
    retryButton.click();
    fixture.detectChanges();

    expect(projectService.getProjectAnalytics).toHaveBeenCalledTimes(2);
    expect(compiled.textContent).toContain('Summary metrics');
    expect(compiled.querySelector('.analytics-state-error')).toBeNull();
  });

  it('should show empty chart copy when there is no activity in the range', () => {
    mockAnalyticsSuccess({
      summary: {
        totalTasks: 0,
        completedTasks: 0,
        openTasks: 0,
        overdueTasks: 0,
        memberCount: 1,
      },
      timeSeries: [],
      statusBreakdown: [],
    });
    createComponent();

    const compiled = getCompiled();
    expect(compiled.textContent).toContain('No task activity in this date range');
  });
});
