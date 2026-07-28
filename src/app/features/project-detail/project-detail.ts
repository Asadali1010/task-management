import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { ASSIGNABLE_ROLES, hasPermission } from '../../core/constants/project-role.permissions';
import {
  ProjectDetail as ProjectDetailModel,
  ProjectMember,
  ProjectRole,
} from '../../core/models/project.models';
import { ProjectService } from '../../core/services/project.service';

@Component({
  selector: 'app-project-detail',
  imports: [RouterLink, DatePipe, ReactiveFormsModule],
  templateUrl: './project-detail.html',
  styleUrl: './project-detail.css',
})
export class ProjectDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly projectService = inject(ProjectService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);

  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly project = signal<ProjectDetailModel | null>(null);
  protected readonly projectId = signal('');
  protected readonly memberActionError = signal<string | null>(null);
  protected readonly inviteSuccessMessage = signal<string | null>(null);
  protected readonly isInviting = signal(false);
  protected readonly removingMemberId = signal<string | null>(null);
  protected readonly updatingMemberRoleId = signal<string | null>(null);

  protected readonly inviteForm = this.fb.nonNullable.group({
    identifier: ['', Validators.required],
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

  protected canManageMembers(detail: ProjectDetailModel): boolean {
    return detail.viewerRole === 'owner' || detail.viewerRole === 'admin';
  }

  protected canRemoveMember(member: ProjectMember): boolean {
    return member.role !== 'owner';
  }

  protected canChangeMemberRole(detail: ProjectDetailModel, member: ProjectMember): boolean {
    return hasPermission(detail.viewerRole, 'changeRoles') && member.role !== 'owner';
  }

  protected getRoleOptions(detail: ProjectDetailModel, member: ProjectMember): ProjectRole[] {
    const assignable = [...ASSIGNABLE_ROLES[detail.viewerRole]];
    if (!assignable.includes(member.role)) {
      return [member.role, ...assignable];
    }
    return assignable;
  }

  protected formatRole(role: ProjectRole): string {
    return role.charAt(0).toUpperCase() + role.slice(1);
  }

  protected onRoleChange(memberId: string, newRole: ProjectRole): void {
    if (this.updatingMemberRoleId()) {
      return;
    }

    const currentMember = this.project()?.members.find((member) => member.id === memberId);
    if (!currentMember || currentMember.role === newRole) {
      return;
    }

    this.updatingMemberRoleId.set(memberId);
    this.memberActionError.set(null);
    this.inviteSuccessMessage.set(null);

    this.projectService.updateMemberRole(this.projectId(), memberId, newRole).subscribe({
      next: (response) => {
        this.updatingMemberRoleId.set(null);
        this.updateProjectMembers((members) =>
          members.map((member) => (member.id === memberId ? response.member : member)),
        );
      },
      error: (error) => {
        this.updatingMemberRoleId.set(null);
        this.memberActionError.set(this.getMemberActionErrorMessage(error, 'roleChange'));
      },
    });
  }

  protected onInviteSubmit(): void {
    if (this.inviteForm.invalid || this.isInviting()) {
      this.inviteForm.markAllAsTouched();
      return;
    }

    const identifier = this.inviteForm.getRawValue().identifier.trim();
    if (!identifier) {
      this.inviteForm.controls.identifier.setErrors({ required: true });
      this.inviteForm.controls.identifier.markAsTouched();
      return;
    }

    this.isInviting.set(true);
    this.memberActionError.set(null);
    this.inviteSuccessMessage.set(null);

    this.projectService.inviteMember(this.projectId(), identifier).subscribe({
      next: (response) => {
        this.isInviting.set(false);
        this.inviteForm.reset();
        this.inviteSuccessMessage.set(
          `Invitation sent to ${response.member.name || response.member.email}.`,
        );
        this.updateProjectMembers((members) => {
          const existingIndex = members.findIndex((member) => member.id === response.member.id);
          if (existingIndex >= 0) {
            const updated = [...members];
            updated[existingIndex] = response.member;
            return updated;
          }
          return [...members, response.member];
        });
      },
      error: (error) => {
        this.isInviting.set(false);
        this.memberActionError.set(this.getMemberActionErrorMessage(error, 'invite'));
      },
    });
  }

  protected onRemoveMember(memberId: string): void {
    if (this.removingMemberId()) {
      return;
    }

    this.removingMemberId.set(memberId);
    this.memberActionError.set(null);
    this.inviteSuccessMessage.set(null);

    this.projectService.removeMember(this.projectId(), memberId).subscribe({
      next: () => {
        this.removingMemberId.set(null);
        this.updateProjectMembers((members) => members.filter((member) => member.id !== memberId));
      },
      error: (error) => {
        this.removingMemberId.set(null);
        this.memberActionError.set(this.getMemberActionErrorMessage(error, 'remove'));
      },
    });
  }

  private updateProjectMembers(
    updateFn: (members: ProjectMember[]) => ProjectMember[],
  ): void {
    const current = this.project();
    if (!current) {
      return;
    }

    const members = updateFn(current.members);
    this.project.set({
      ...current,
      members,
      metrics: {
        ...current.metrics,
        memberCount: members.length,
      },
    });
  }

  private getMemberActionErrorMessage(
    error: unknown,
    action: 'invite' | 'remove' | 'roleChange',
  ): string {
    if (!(error instanceof HttpErrorResponse)) {
      if (action === 'invite') {
        return 'Unable to send invite. Try again in a moment.';
      }
      if (action === 'roleChange') {
        return 'Unable to change role. Try again in a moment.';
      }
      return 'Unable to remove member. Try again in a moment.';
    }

    if (error.status === 403) {
      return 'You do not have permission to manage members on this project.';
    }

    if (error.status === 404) {
      return action === 'invite'
        ? 'User not found. Check the email or username and try again.'
        : 'Member not found. Refresh the page and try again.';
    }

    if (error.status === 409) {
      return 'This person is already a member of the project.';
    }

    const apiMessage =
      typeof error.error === 'object' &&
      error.error !== null &&
      'message' in error.error &&
      typeof error.error.message === 'string'
        ? error.error.message
        : null;

    if (apiMessage) {
      return apiMessage;
    }

    if (action === 'invite') {
      return 'Unable to send invite. Check the details and try again.';
    }
    if (action === 'roleChange') {
      return 'Unable to change role. Try again in a moment.';
    }
    return 'Unable to remove member. Try again in a moment.';
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
