import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';

import {
  ArchiveProjectResponse,
  InviteMemberResponse,
  ProjectDetail as ProjectDetailModel,
  RestoreProjectResponse,
  UpdateMemberRoleResponse,
} from '../../core/models/project.models';
import { ProjectService } from '../../core/services/project.service';
import { ProjectDetail } from './project-detail';

describe('ProjectDetail', () => {
  let fixture: ComponentFixture<ProjectDetail>;
  let projectService: {
    getProjectDetail: ReturnType<typeof vi.fn>;
    inviteMember: ReturnType<typeof vi.fn>;
    removeMember: ReturnType<typeof vi.fn>;
    updateMemberRole: ReturnType<typeof vi.fn>;
    archiveProject: ReturnType<typeof vi.fn>;
    restoreProject: ReturnType<typeof vi.fn>;
  };
  let paramMapSubject: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  const mockProjectDetail: ProjectDetailModel = {
    metadata: {
      id: 'proj-1',
      name: 'Website Redesign',
      description: 'Redesign the company website',
      status: 'active',
      createdAt: '2026-01-15T10:00:00Z',
      updatedAt: '2026-07-20T14:30:00Z',
      archivedAt: null,
    },
    members: [
      {
        id: 'user-1',
        name: 'Jane Doe',
        email: 'jane@example.com',
        role: 'owner',
      },
      {
        id: 'user-2',
        name: 'John Smith',
        email: 'john@example.com',
        role: 'member',
      },
    ],
    recentActivity: [
      {
        id: 'act-1',
        type: 'task_completed',
        description: 'Completed task "Update homepage hero"',
        actorName: 'Jane Doe',
        createdAt: '2026-07-28T09:00:00Z',
      },
    ],
    metrics: {
      totalTasks: 24,
      completedTasks: 18,
      openTasks: 6,
      overdueTasks: 2,
      memberCount: 2,
    },
    viewerRole: 'owner',
  };

  beforeEach(async () => {
    projectService = {
      getProjectDetail: vi.fn(),
      inviteMember: vi.fn(),
      removeMember: vi.fn(),
      updateMemberRole: vi.fn(),
      archiveProject: vi.fn(),
      restoreProject: vi.fn(),
    };
    paramMapSubject = new BehaviorSubject(convertToParamMap({ projectId: 'proj-1' }));

    await TestBed.configureTestingModule({
      imports: [ProjectDetail],
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
    fixture = TestBed.createComponent(ProjectDetail);
    fixture.detectChanges();
  }

  function getCompiled(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function setInputValue(selector: string, value: string): void {
    const input = getCompiled().querySelector(selector) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function submitInviteForm(): void {
    fixture.debugElement.query(By.css('.member-invite-form'))!.triggerEventHandler('ngSubmit', null);
    fixture.detectChanges();
  }

  function createComponentWithDetail(
    detail: ProjectDetailModel = mockProjectDetail,
  ): void {
    projectService.getProjectDetail.mockReturnValue(of(detail));
    createComponent();
  }

  function getRoleSelectForMember(memberId: string): HTMLSelectElement | null {
    return getCompiled().querySelector(`#member-role-${memberId}`) as HTMLSelectElement | null;
  }

  function getRoleSelectOptions(select: HTMLSelectElement): string[] {
    return Array.from(select.options).map((option) => option.value);
  }

  it('should create', () => {
    createComponentWithDetail();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show loading state while project detail is fetched', () => {
    const detailSubject = new Subject<ProjectDetailModel>();
    projectService.getProjectDetail.mockReturnValue(detailSubject.asObservable());

    createComponent();

    const compiled = getCompiled();
    expect(compiled.querySelector('[role="status"]')).toBeTruthy();
    expect(compiled.textContent).toContain('Loading project details');

    detailSubject.next(mockProjectDetail);
    detailSubject.complete();
    fixture.detectChanges();

    expect(compiled.querySelector('[role="status"]')).toBeFalsy();
  });

  it('should render metadata, members, activity, and metrics from fixture data', () => {
    createComponentWithDetail();

    const compiled = getCompiled();

    expect(compiled.querySelector('#project-name-heading')?.textContent).toContain('Website Redesign');
    expect(compiled.querySelector('.project-description')?.textContent).toContain(
      'Redesign the company website',
    );
    expect(compiled.querySelector('.project-status-badge')?.textContent).toContain('Active');

    expect(compiled.querySelector('#members-heading')?.textContent).toContain('Team members');
    expect(compiled.textContent).toContain('Jane Doe');
    expect(compiled.textContent).toContain('Owner');
    expect(compiled.textContent).toContain('John Smith');
    expect(compiled.textContent).toContain('Member');

    expect(compiled.querySelector('#activity-heading')?.textContent).toContain('Recent activity');
    expect(compiled.textContent).toContain('Completed task "Update homepage hero"');

    expect(compiled.querySelector('#metrics-heading')?.textContent).toContain('Key metrics');
    expect(compiled.textContent).toContain('24');
    expect(compiled.textContent).toContain('18');
    expect(compiled.textContent).toContain('6');
    expect(compiled.textContent).toContain('2');
  });

  it('should render section links using the routed project id', () => {
    createComponentWithDetail();

    const links = Array.from(getCompiled().querySelectorAll('.project-nav-link'));
    const hrefs = links.map((link) => link.getAttribute('href'));

    expect(hrefs).toContain('/projects/proj-1/tasks');
    expect(hrefs).toContain('/projects/proj-1/milestones');
    expect(hrefs).toContain('/projects/proj-1/settings');
  });

  it('should show error UI when project detail fetch fails', () => {
    projectService.getProjectDetail.mockReturnValue(throwError(() => new Error('Network error')));
    createComponent();

    const compiled = getCompiled();
    const alert = compiled.querySelector('[role="alert"]');

    expect(alert).toBeTruthy();
    expect(alert?.textContent).toContain('Something went wrong');
    expect(alert?.textContent).toContain(
      'Unable to load this project. Refresh the page or try again in a moment.',
    );
    expect(compiled.querySelector('.project-retry-btn')?.textContent).toContain('Try again');
  });

  it('should show error UI when project id is missing from the route', () => {
    paramMapSubject.next(convertToParamMap({}));
    createComponent();

    const compiled = getCompiled();
    const alert = compiled.querySelector('[role="alert"]');

    expect(alert).toBeTruthy();
    expect(alert?.textContent).toContain('Project not found. Check the URL and try again.');
    expect(projectService.getProjectDetail).not.toHaveBeenCalled();
  });

  it('should retry loading when Try again is clicked', () => {
    projectService.getProjectDetail
      .mockReturnValueOnce(throwError(() => new Error('Network error')))
      .mockReturnValueOnce(of(mockProjectDetail));

    createComponent();

    const retryButton = getCompiled().querySelector('.project-retry-btn') as HTMLButtonElement;
    retryButton.click();
    fixture.detectChanges();

    expect(projectService.getProjectDetail).toHaveBeenCalledTimes(2);
    expect(projectService.getProjectDetail).toHaveBeenCalledWith('proj-1');
    expect(getCompiled().querySelector('#project-name-heading')?.textContent).toContain(
      'Website Redesign',
    );
  });

  it('should show invite form and remove actions for owner viewers', () => {
    createComponentWithDetail();

    const compiled = getCompiled();
    expect(compiled.querySelector('.member-invite-form')).toBeTruthy();
    expect(compiled.querySelector('#member-invite-identifier')).toBeTruthy();
    expect(compiled.textContent).toContain('Send invite');

    const removeButtons = Array.from(compiled.querySelectorAll('.member-remove-btn'));
    expect(removeButtons).toHaveLength(1);
    expect(removeButtons[0]?.getAttribute('aria-label')).toContain('John Smith');
  });

  it('should show invite form and remove actions for admin viewers', () => {
    createComponentWithDetail({ ...mockProjectDetail, viewerRole: 'admin' });

    const compiled = getCompiled();
    expect(compiled.querySelector('.member-invite-form')).toBeTruthy();
    expect(compiled.querySelectorAll('.member-remove-btn')).toHaveLength(1);
  });

  it('should hide invite and remove controls for non-admin viewers', () => {
    createComponentWithDetail({ ...mockProjectDetail, viewerRole: 'member' });

    const compiled = getCompiled();
    expect(compiled.querySelector('.member-invite-form')).toBeFalsy();
    expect(compiled.querySelector('.member-remove-btn')).toBeFalsy();
    expect(compiled.querySelector('.member-role-select')).toBeFalsy();
    expect(compiled.textContent).toContain('Jane Doe');
    expect(compiled.textContent).toContain('John Smith');
    expect(compiled.textContent).toContain('Owner');
    expect(compiled.textContent).toContain('Member');
  });

  it('should invite a member and update the list without reloading the page', () => {
    const inviteResponse: InviteMemberResponse = {
      member: {
        id: 'user-3',
        name: 'Alex Rivera',
        email: 'alex@example.com',
        role: 'member',
      },
    };

    createComponentWithDetail();
    projectService.inviteMember.mockReturnValue(of(inviteResponse));

    setInputValue('#member-invite-identifier', 'alex@example.com');
    submitInviteForm();

    expect(projectService.inviteMember).toHaveBeenCalledWith('proj-1', 'alex@example.com');
    expect(getCompiled().textContent).toContain('Invitation sent to Alex Rivera.');
    expect(getCompiled().textContent).toContain('Alex Rivera');
    expect(fixture.componentInstance['project']()?.metrics.memberCount).toBe(3);
    expect(projectService.getProjectDetail).toHaveBeenCalledTimes(1);
  });

  it('should remove a member and update the list immediately', () => {
    createComponentWithDetail();
    projectService.removeMember.mockReturnValue(of(undefined));

    const removeButton = getCompiled().querySelector('.member-remove-btn') as HTMLButtonElement;
    removeButton.click();
    fixture.detectChanges();

    expect(projectService.removeMember).toHaveBeenCalledWith('proj-1', 'user-2');
    expect(getCompiled().textContent).not.toContain('John Smith');
    expect(fixture.componentInstance['project']()?.members).toHaveLength(1);
    expect(fixture.componentInstance['project']()?.metrics.memberCount).toBe(1);
    expect(projectService.getProjectDetail).toHaveBeenCalledTimes(1);
  });

  it('should show actionable error when invite is forbidden', () => {
    createComponentWithDetail();
    projectService.inviteMember.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 403 })),
    );

    setInputValue('#member-invite-identifier', 'alex@example.com');
    submitInviteForm();

    const alert = getCompiled().querySelector('.member-action-error');
    expect(alert?.textContent).toContain(
      'You do not have permission to manage members on this project.',
    );
  });

  it('should show actionable error when remove fails with 404', () => {
    createComponentWithDetail();
    projectService.removeMember.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 404 })),
    );

    const removeButton = getCompiled().querySelector('.member-remove-btn') as HTMLButtonElement;
    removeButton.click();
    fixture.detectChanges();

    const alert = getCompiled().querySelector('.member-action-error');
    expect(alert?.textContent).toContain('Member not found. Refresh the page and try again.');
  });

  it('should change a member role and update the list immediately', () => {
    const updateResponse: UpdateMemberRoleResponse = {
      member: {
        id: 'user-2',
        name: 'John Smith',
        email: 'john@example.com',
        role: 'admin',
      },
    };

    createComponentWithDetail();
    projectService.updateMemberRole.mockReturnValue(of(updateResponse));

    const roleSelect = getRoleSelectForMember('user-2')!;
    expect(roleSelect).toBeTruthy();
    expect(getRoleSelectOptions(roleSelect)).toEqual(['admin', 'member']);

    roleSelect.value = 'admin';
    roleSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(projectService.updateMemberRole).toHaveBeenCalledWith('proj-1', 'user-2', 'admin');
    expect(fixture.componentInstance['project']()?.members.find((m) => m.id === 'user-2')?.role).toBe(
      'admin',
    );
    expect(projectService.getProjectDetail).toHaveBeenCalledTimes(1);
  });

  it('should keep owner rows read-only for owner viewers', () => {
    createComponentWithDetail();

    expect(getRoleSelectForMember('user-1')).toBeFalsy();
    expect(getCompiled().textContent).toContain('Owner');
  });

  it('should limit assignable roles for admin viewers to prevent escalation', () => {
    const adminViewerDetail: ProjectDetailModel = {
      ...mockProjectDetail,
      viewerRole: 'admin',
      members: [
        ...mockProjectDetail.members,
        {
          id: 'user-3',
          name: 'Alex Admin',
          email: 'alex@example.com',
          role: 'admin',
        },
      ],
      metrics: {
        ...mockProjectDetail.metrics,
        memberCount: 3,
      },
    };

    createComponentWithDetail(adminViewerDetail);

    const memberSelect = getRoleSelectForMember('user-2')!;
    expect(getRoleSelectOptions(memberSelect)).toEqual(['member']);

    const adminSelect = getRoleSelectForMember('user-3')!;
    expect(getRoleSelectOptions(adminSelect)).toEqual(['admin', 'member']);
    expect(getRoleSelectOptions(adminSelect)).not.toContain('owner');
  });

  it('should show actionable error when role change is forbidden', () => {
    createComponentWithDetail();
    projectService.updateMemberRole.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 403 })),
    );

    const roleSelect = getRoleSelectForMember('user-2')!;
    roleSelect.value = 'admin';
    roleSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const alert = getCompiled().querySelector('.member-action-error');
    expect(alert?.textContent).toContain(
      'You do not have permission to manage members on this project.',
    );
  });

  it('should show Archive action for owner viewers on active projects', () => {
    createComponentWithDetail();

    const archiveButton = getCompiled().querySelector('.project-archive-btn') as HTMLButtonElement;
    expect(archiveButton).toBeTruthy();
    expect(archiveButton.textContent).toContain('Archive project');
    expect(getCompiled().querySelector('.project-restore-btn')).toBeFalsy();
    expect(getCompiled().querySelector('.project-archived-banner')).toBeFalsy();
  });

  it('should show Archive action for admin viewers on active projects', () => {
    createComponentWithDetail({ ...mockProjectDetail, viewerRole: 'admin' });

    const archiveButton = getCompiled().querySelector('.project-archive-btn') as HTMLButtonElement;
    expect(archiveButton).toBeTruthy();
    expect(archiveButton.textContent).toContain('Archive project');
  });

  it('should hide archive and restore actions for member viewers', () => {
    createComponentWithDetail({ ...mockProjectDetail, viewerRole: 'member' });

    expect(getCompiled().querySelector('.project-archive-btn')).toBeFalsy();
    expect(getCompiled().querySelector('.project-restore-btn')).toBeFalsy();
  });

  it('should show archived banner and Restore action for archived projects', () => {
    const archivedDetail: ProjectDetailModel = {
      ...mockProjectDetail,
      metadata: {
        ...mockProjectDetail.metadata,
        archivedAt: '2026-07-25T12:00:00Z',
      },
    };

    createComponentWithDetail(archivedDetail);

    const compiled = getCompiled();
    expect(compiled.querySelector('.project-archived-banner')).toBeTruthy();
    expect(compiled.querySelector('.project-archived-badge')?.textContent).toContain('Archived');
    expect(compiled.textContent).toContain('This project is archived');

    const restoreButton = compiled.querySelector('.project-restore-btn') as HTMLButtonElement;
    expect(restoreButton).toBeTruthy();
    expect(restoreButton.textContent).toContain('Restore project');
    expect(compiled.querySelector('.project-archive-btn')).toBeFalsy();
  });

  it('should archive a project after confirmation and preserve members, activity, and metrics', () => {
    const archiveResponse: ArchiveProjectResponse = {
      project: {
        id: 'proj-1',
        name: 'Website Redesign',
        description: 'Redesign the company website',
        status: 'active',
        createdAt: '2026-01-15T10:00:00Z',
        updatedAt: '2026-07-28T10:00:00Z',
        archivedAt: '2026-07-28T10:00:00Z',
        viewerRole: 'owner',
      },
    };

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    createComponentWithDetail();
    projectService.archiveProject.mockReturnValue(of(archiveResponse));

    const archiveButton = getCompiled().querySelector('.project-archive-btn') as HTMLButtonElement;
    archiveButton.click();
    fixture.detectChanges();

    expect(confirmSpy).toHaveBeenCalledWith(
      'Archive this project? It will be hidden from the active project list. You can restore it later from Archived projects.',
    );
    expect(projectService.archiveProject).toHaveBeenCalledWith('proj-1');

    const project = fixture.componentInstance['project']()!;
    expect(project.metadata.archivedAt).toBe('2026-07-28T10:00:00Z');
    expect(project.members).toEqual(mockProjectDetail.members);
    expect(project.recentActivity).toEqual(mockProjectDetail.recentActivity);
    expect(project.metrics).toEqual(mockProjectDetail.metrics);
    expect(getCompiled().querySelector('.project-archived-banner')).toBeTruthy();
    expect(getCompiled().querySelector('.project-restore-btn')).toBeTruthy();
    expect(projectService.getProjectDetail).toHaveBeenCalledTimes(1);

    confirmSpy.mockRestore();
  });

  it('should not archive when confirmation is cancelled', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    createComponentWithDetail();

    const archiveButton = getCompiled().querySelector('.project-archive-btn') as HTMLButtonElement;
    archiveButton.click();
    fixture.detectChanges();

    expect(projectService.archiveProject).not.toHaveBeenCalled();
    expect(fixture.componentInstance['project']()?.metadata.archivedAt).toBeNull();

    confirmSpy.mockRestore();
  });

  it('should restore an archived project and preserve members, activity, and metrics', () => {
    const archivedDetail: ProjectDetailModel = {
      ...mockProjectDetail,
      metadata: {
        ...mockProjectDetail.metadata,
        archivedAt: '2026-07-25T12:00:00Z',
      },
    };
    const restoreResponse: RestoreProjectResponse = {
      project: {
        id: 'proj-1',
        name: 'Website Redesign',
        description: 'Redesign the company website',
        status: 'active',
        createdAt: '2026-01-15T10:00:00Z',
        updatedAt: '2026-07-28T11:00:00Z',
        archivedAt: null,
        viewerRole: 'owner',
      },
    };

    createComponentWithDetail(archivedDetail);
    projectService.restoreProject.mockReturnValue(of(restoreResponse));

    const restoreButton = getCompiled().querySelector('.project-restore-btn') as HTMLButtonElement;
    restoreButton.click();
    fixture.detectChanges();

    expect(projectService.restoreProject).toHaveBeenCalledWith('proj-1');

    const project = fixture.componentInstance['project']()!;
    expect(project.metadata.archivedAt).toBeNull();
    expect(project.members).toEqual(mockProjectDetail.members);
    expect(project.recentActivity).toEqual(mockProjectDetail.recentActivity);
    expect(project.metrics).toEqual(mockProjectDetail.metrics);
    expect(getCompiled().querySelector('.project-archived-banner')).toBeFalsy();
    expect(getCompiled().querySelector('.project-archive-btn')).toBeTruthy();
    expect(projectService.getProjectDetail).toHaveBeenCalledTimes(1);
  });

  it('should show permission error when archive is forbidden', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    createComponentWithDetail();
    projectService.archiveProject.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 403 })),
    );

    const archiveButton = getCompiled().querySelector('.project-archive-btn') as HTMLButtonElement;
    archiveButton.click();
    fixture.detectChanges();

    const alert = getCompiled().querySelector('.project-archive-restore-error');
    expect(alert?.textContent).toContain(
      'You do not have permission to archive this project.',
    );
    expect(fixture.componentInstance['project']()?.metadata.archivedAt).toBeNull();

    confirmSpy.mockRestore();
  });

  it('should show permission error when restore is forbidden', () => {
    const archivedDetail: ProjectDetailModel = {
      ...mockProjectDetail,
      metadata: {
        ...mockProjectDetail.metadata,
        archivedAt: '2026-07-25T12:00:00Z',
      },
    };

    createComponentWithDetail(archivedDetail);
    projectService.restoreProject.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 403 })),
    );

    const restoreButton = getCompiled().querySelector('.project-restore-btn') as HTMLButtonElement;
    restoreButton.click();
    fixture.detectChanges();

    const alert = getCompiled().querySelector('.project-archive-restore-error');
    expect(alert?.textContent).toContain(
      'You do not have permission to restore this project.',
    );
    expect(fixture.componentInstance['project']()?.metadata.archivedAt).toBe('2026-07-25T12:00:00Z');
  });
});
