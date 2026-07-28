import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  ArchiveProjectResponse,
  InviteMemberRequest,
  InviteMemberResponse,
  ProjectListResponse,
  ProjectRole,
  RestoreProjectResponse,
  UpdateMemberRoleRequest,
  UpdateMemberRoleResponse,
} from '../models/project.models';
import * as mockStore from '../mock/mock-project-store';

function jsonResponse<T>(body: T): Observable<HttpResponse<T>> {
  return of(new HttpResponse<T>({ status: 200, body }));
}

function notFound(url: string): Observable<never> {
  return throwError(() => new HttpErrorResponse({ status: 404, url, statusText: 'Not Found' }));
}

export const mockProjectInterceptor: HttpInterceptorFn = (req, next) => {
  if (!environment.mockApi || !req.url.startsWith(`${environment.apiUrl}/projects`)) {
    return next(req);
  }

  const path = req.url.slice(environment.apiUrl.length);

  if (req.method === 'GET' && path === '/projects') {
    const archived = req.params.get('archived') === 'true';
    const response: ProjectListResponse = { projects: mockStore.listProjects(archived) };
    return jsonResponse(response);
  }

  const activityMatch = path.match(/^\/projects\/([^/]+)\/activity$/);
  if (req.method === 'GET' && activityMatch) {
    const page = Number(req.params.get('page') ?? '1');
    const pageSize = Number(req.params.get('pageSize') ?? '20');
    const result = mockStore.getProjectActivity(activityMatch[1], page, pageSize);
    return result ? jsonResponse(result) : notFound(req.url);
  }

  const analyticsMatch = path.match(/^\/projects\/([^/]+)\/analytics$/);
  if (req.method === 'GET' && analyticsMatch) {
    const from = req.params.get('from') ?? new Date().toISOString();
    const to = req.params.get('to') ?? new Date().toISOString();
    const result = mockStore.getProjectAnalytics(analyticsMatch[1], from, to);
    return result ? jsonResponse(result) : notFound(req.url);
  }

  const archiveMatch = path.match(/^\/projects\/([^/]+)\/archive$/);
  if (req.method === 'POST' && archiveMatch) {
    const project = mockStore.archiveProject(archiveMatch[1]);
    return project ? jsonResponse<ArchiveProjectResponse>({ project }) : notFound(req.url);
  }

  const restoreMatch = path.match(/^\/projects\/([^/]+)\/restore$/);
  if (req.method === 'POST' && restoreMatch) {
    const project = mockStore.restoreProject(restoreMatch[1]);
    return project ? jsonResponse<RestoreProjectResponse>({ project }) : notFound(req.url);
  }

  const inviteMatch = path.match(/^\/projects\/([^/]+)\/members\/invite$/);
  if (req.method === 'POST' && inviteMatch) {
    const { identifier } = req.body as InviteMemberRequest;
    const invited = mockStore.inviteMember(inviteMatch[1], identifier);
    return invited ? jsonResponse<InviteMemberResponse>({ member: invited }) : notFound(req.url);
  }

  const roleMatch = path.match(/^\/projects\/([^/]+)\/members\/([^/]+)\/role$/);
  if (req.method === 'PATCH' && roleMatch) {
    const { role } = req.body as UpdateMemberRoleRequest;
    const updated = mockStore.updateMemberRole(roleMatch[1], roleMatch[2], role as ProjectRole);
    return updated ? jsonResponse<UpdateMemberRoleResponse>({ member: updated }) : notFound(req.url);
  }

  const removeMatch = path.match(/^\/projects\/([^/]+)\/members\/([^/]+)$/);
  if (req.method === 'DELETE' && removeMatch) {
    const removed = mockStore.removeMember(removeMatch[1], removeMatch[2]);
    return removed ? jsonResponse<void>(undefined) : notFound(req.url);
  }

  const detailMatch = path.match(/^\/projects\/([^/]+)$/);
  if (req.method === 'GET' && detailMatch) {
    const detail = mockStore.getProjectDetail(detailMatch[1]);
    return detail ? jsonResponse(detail) : notFound(req.url);
  }

  return next(req);
};
