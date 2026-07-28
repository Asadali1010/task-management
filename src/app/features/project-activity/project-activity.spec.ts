import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { ProjectActivityPageResponse } from '../../core/models/project.models';
import { ProjectService } from '../../core/services/project.service';
import { ProjectActivity } from './project-activity';

describe('ProjectActivity', () => {
  let fixture: ComponentFixture<ProjectActivity>;
  let projectService: {
    getProjectActivity: ReturnType<typeof vi.fn>;
  };

  const pageOne: ProjectActivityPageResponse = {
    activities: [
      {
        id: 'act-1',
        type: 'task_completed',
        description: 'Completed task "Update homepage hero"',
        actorName: 'Jane Doe',
        createdAt: '2026-07-28T09:00:00Z',
      },
      {
        id: 'act-2',
        type: 'task_moved',
        description: 'Alex moved Task X to Done',
        actorName: 'Alex Rivera',
        createdAt: '2026-07-27T16:30:00Z',
      },
    ],
    page: 1,
    pageSize: 20,
    totalCount: 3,
    hasMore: true,
  };

  const pageTwo: ProjectActivityPageResponse = {
    activities: [
      {
        id: 'act-3',
        type: 'member_invited',
        description: 'Invited Alex Rivera to the project',
        actorName: 'Jane Doe',
        createdAt: '2026-07-26T11:00:00Z',
      },
    ],
    page: 2,
    pageSize: 20,
    totalCount: 3,
    hasMore: false,
  };

  beforeEach(async () => {
    projectService = {
      getProjectActivity: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ProjectActivity],
      providers: [{ provide: ProjectService, useValue: projectService }],
    }).compileComponents();
  });

  function createComponent(
    projectId = 'proj-1',
    refreshTrigger = 0,
  ): ComponentFixture<ProjectActivity> {
    fixture = TestBed.createComponent(ProjectActivity);
    fixture.componentRef.setInput('projectIdInput', projectId);
    fixture.componentRef.setInput('refreshTrigger', refreshTrigger);
    fixture.detectChanges();
    return fixture;
  }

  function getCompiled(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  it('should load the first page on mount and append the next page when Load more is clicked', () => {
    projectService.getProjectActivity
      .mockReturnValueOnce(of(pageOne))
      .mockReturnValueOnce(of(pageTwo));

    createComponent();

    expect(projectService.getProjectActivity).toHaveBeenCalledTimes(1);
    expect(projectService.getProjectActivity).toHaveBeenCalledWith('proj-1', {
      page: 1,
      pageSize: 20,
    });

    const compiled = getCompiled();
    expect(compiled.textContent).toContain('Completed task "Update homepage hero"');
    expect(compiled.textContent).toContain('Alex moved Task X to Done');
    expect(compiled.textContent).toContain('Jane Doe');
    expect(compiled.querySelector('time[datetime="2026-07-28T09:00:00Z"]')).not.toBeNull();

    const loadMoreButton = compiled.querySelector('.activity-load-more-btn') as HTMLButtonElement;
    expect(loadMoreButton).toBeTruthy();
    loadMoreButton.click();
    fixture.detectChanges();

    expect(projectService.getProjectActivity).toHaveBeenCalledTimes(2);
    expect(projectService.getProjectActivity).toHaveBeenLastCalledWith('proj-1', {
      page: 2,
      pageSize: 20,
    });
    expect(compiled.textContent).toContain('Invited Alex Rivera to the project');
    expect(compiled.querySelector('.activity-load-more-btn')).toBeNull();
    expect(compiled.querySelectorAll('.activity-item')).toHaveLength(3);
  });

  it('should show empty state when there is no activity', () => {
    projectService.getProjectActivity.mockReturnValue(
      of({
        activities: [],
        page: 1,
        pageSize: 20,
        totalCount: 0,
        hasMore: false,
      }),
    );

    createComponent();

    const compiled = getCompiled();
    expect(compiled.textContent).toContain(
      'No recent activity. Updates will appear here as work progresses.',
    );
    expect(compiled.querySelector('.activity-load-more-btn')).toBeNull();
  });

  it('should reload the first page when refreshTrigger changes', () => {
    projectService.getProjectActivity.mockReturnValue(of(pageOne));

    createComponent('proj-1', 0);

    expect(projectService.getProjectActivity).toHaveBeenCalledTimes(1);

    fixture.componentRef.setInput('refreshTrigger', 1);
    fixture.detectChanges();

    expect(projectService.getProjectActivity).toHaveBeenCalledTimes(2);
    expect(projectService.getProjectActivity).toHaveBeenLastCalledWith('proj-1', {
      page: 1,
      pageSize: 20,
    });
  });

  it('should show error state and retry when initial load fails', () => {
    projectService.getProjectActivity
      .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 500 })))
      .mockReturnValueOnce(of(pageOne));

    createComponent();

    const compiled = getCompiled();
    expect(compiled.textContent).toContain('Unable to load activity');

    const retryButton = compiled.querySelector('.activity-retry-btn') as HTMLButtonElement;
    retryButton.click();
    fixture.detectChanges();

    expect(projectService.getProjectActivity).toHaveBeenCalledTimes(2);
    expect(compiled.textContent).toContain('Completed task "Update homepage hero"');
    expect(compiled.querySelector('.activity-state-error')).toBeNull();
  });
});
