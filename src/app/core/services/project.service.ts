import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  InviteMemberRequest,
  InviteMemberResponse,
  ProjectDetail,
  ProjectRole,
  UpdateMemberRoleRequest,
  UpdateMemberRoleResponse,
} from '../models/project.models';

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private readonly http = inject(HttpClient);

  getProjectDetail(id: string): Observable<ProjectDetail> {
    return this.http.get<ProjectDetail>(`${environment.apiUrl}/projects/${id}`);
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
