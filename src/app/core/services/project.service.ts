import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  ArchiveProjectResponse,
  InviteMemberRequest,
  InviteMemberResponse,
  ProjectActivityPageResponse,
  ProjectAnalytics,
  ProjectAnalyticsDateRange,
  ProjectDetail,
  ProjectListResponse,
  ProjectRole,
  RestoreProjectResponse,
  UpdateMemberRoleRequest,
  UpdateMemberRoleResponse,
} from '../models/project.models';

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private readonly http = inject(HttpClient);

  getProjects(options: { archived?: boolean } = {}): Observable<ProjectListResponse> {
    const archived = options.archived ?? false;
    return this.http.get<ProjectListResponse>(`${environment.apiUrl}/projects`, {
      params: { archived: String(archived) },
    });
  }

  getProjectDetail(id: string): Observable<ProjectDetail> {
    return this.http.get<ProjectDetail>(`${environment.apiUrl}/projects/${id}`);
  }

  getProjectActivity(
    projectId: string,
    options: { page: number; pageSize: number },
  ): Observable<ProjectActivityPageResponse> {
    return this.http.get<ProjectActivityPageResponse>(
      `${environment.apiUrl}/projects/${projectId}/activity`,
      {
        params: {
          page: String(options.page),
          pageSize: String(options.pageSize),
        },
      },
    );
  }

  getProjectAnalytics(
    projectId: string,
    range: ProjectAnalyticsDateRange,
  ): Observable<ProjectAnalytics> {
    return this.http.get<ProjectAnalytics>(
      `${environment.apiUrl}/projects/${projectId}/analytics`,
      {
        params: { from: range.from, to: range.to },
      },
    );
  }

  archiveProject(id: string): Observable<ArchiveProjectResponse> {
    return this.http.post<ArchiveProjectResponse>(
      `${environment.apiUrl}/projects/${id}/archive`,
      {},
    );
  }

  restoreProject(id: string): Observable<RestoreProjectResponse> {
    return this.http.post<RestoreProjectResponse>(
      `${environment.apiUrl}/projects/${id}/restore`,
      {},
    );
  }

  inviteMember(projectId: string, identifier: string): Observable<InviteMemberResponse> {
    const body: InviteMemberRequest = { identifier };
    return this.http.post<InviteMemberResponse>(
      `${environment.apiUrl}/projects/${projectId}/members/invite`,
      body,
    );
  }

  removeMember(projectId: string, memberId: string): Observable<void> {
    return this.http.delete<void>(
      `${environment.apiUrl}/projects/${projectId}/members/${memberId}`,
    );
  }

  updateMemberRole(
    projectId: string,
    memberId: string,
    role: ProjectRole,
  ): Observable<UpdateMemberRoleResponse> {
    const body: UpdateMemberRoleRequest = { role };
    return this.http.patch<UpdateMemberRoleResponse>(
      `${environment.apiUrl}/projects/${projectId}/members/${memberId}/role`,
      body,
    );
  }
}
