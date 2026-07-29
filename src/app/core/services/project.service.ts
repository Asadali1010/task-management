import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AddTaskDependencyRequest,
  ArchiveProjectResponse,
  BulkTaskActionRequest,
  BulkTaskActionResponse,
  CreateMilestoneRequest,
  CreateTaskFromTemplateRequest,
  CreateTaskRequest,
  DeleteTaskRequest,
  DuplicateTaskRequest,
  InviteMemberRequest,
  InviteMemberResponse,
  LinkTaskToMilestoneRequest,
  Milestone,
  MilestoneListResponse,
  ProjectActivityPageResponse,
  ProjectAnalytics,
  ProjectAnalyticsDateRange,
  ProjectDetail,
  ProjectListResponse,
  ProjectRole,
  RestoreProjectResponse,
  Task,
  TaskDependencyListResponse,
  TaskDependencyResponse,
  TaskHierarchyResponse,
  TaskHistoryResponse,
  TaskListResponse,
  TaskTemplateListResponse,
  UpdateMemberRoleRequest,
  UpdateMemberRoleResponse,
  UpdateTaskRequest,
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

  listMilestones(projectId: string): Observable<MilestoneListResponse> {
    return this.http.get<MilestoneListResponse>(
      `${environment.apiUrl}/projects/${projectId}/milestones`,
    );
  }

  createMilestone(projectId: string, request: CreateMilestoneRequest): Observable<Milestone> {
    return this.http.post<Milestone>(
      `${environment.apiUrl}/projects/${projectId}/milestones`,
      request,
    );
  }

  listTasks(projectId: string): Observable<TaskListResponse> {
    return this.http.get<TaskListResponse>(`${environment.apiUrl}/projects/${projectId}/tasks`);
  }

  getTask(projectId: string, taskId: string): Observable<Task> {
    return this.http.get<Task>(`${environment.apiUrl}/projects/${projectId}/tasks/${taskId}`);
  }

  createTask(projectId: string, request: CreateTaskRequest): Observable<Task> {
    return this.http.post<Task>(`${environment.apiUrl}/projects/${projectId}/tasks`, request);
  }

  updateTask(projectId: string, taskId: string, request: UpdateTaskRequest): Observable<Task> {
    return this.http.patch<Task>(
      `${environment.apiUrl}/projects/${projectId}/tasks/${taskId}`,
      request,
    );
  }

  deleteTask(
    projectId: string,
    taskId: string,
    request: DeleteTaskRequest = {},
  ): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/projects/${projectId}/tasks/${taskId}`, {
      body: request,
    });
  }

  duplicateTask(
    projectId: string,
    taskId: string,
    request: DuplicateTaskRequest = {},
  ): Observable<Task> {
    return this.http.post<Task>(
      `${environment.apiUrl}/projects/${projectId}/tasks/${taskId}/duplicate`,
      request,
    );
  }

  getTaskHierarchy(projectId: string): Observable<TaskHierarchyResponse> {
    return this.http.get<TaskHierarchyResponse>(
      `${environment.apiUrl}/projects/${projectId}/tasks/hierarchy`,
    );
  }

  listTaskDependencies(projectId: string): Observable<TaskDependencyListResponse> {
    return this.http.get<TaskDependencyListResponse>(
      `${environment.apiUrl}/projects/${projectId}/tasks/dependencies`,
    );
  }

  listTaskTemplates(projectId: string): Observable<TaskTemplateListResponse> {
    return this.http.get<TaskTemplateListResponse>(
      `${environment.apiUrl}/projects/${projectId}/tasks/templates`,
    );
  }

  createTaskFromTemplate(
    projectId: string,
    request: CreateTaskFromTemplateRequest,
  ): Observable<Task> {
    return this.http.post<Task>(
      `${environment.apiUrl}/projects/${projectId}/tasks/templates`,
      request,
    );
  }

  bulkTaskAction(
    projectId: string,
    request: BulkTaskActionRequest,
  ): Observable<BulkTaskActionResponse> {
    return this.http.post<BulkTaskActionResponse>(
      `${environment.apiUrl}/projects/${projectId}/tasks/bulk`,
      request,
    );
  }

  addTaskDependency(
    projectId: string,
    taskId: string,
    request: AddTaskDependencyRequest,
  ): Observable<TaskDependencyResponse> {
    return this.http.post<TaskDependencyResponse>(
      `${environment.apiUrl}/projects/${projectId}/tasks/${taskId}/dependencies`,
      request,
    );
  }

  removeTaskDependency(
    projectId: string,
    taskId: string,
    dependencyId: string,
  ): Observable<void> {
    return this.http.delete<void>(
      `${environment.apiUrl}/projects/${projectId}/tasks/${taskId}/dependencies/${dependencyId}`,
    );
  }

  getTaskHistory(projectId: string, taskId: string): Observable<TaskHistoryResponse> {
    return this.http.get<TaskHistoryResponse>(
      `${environment.apiUrl}/projects/${projectId}/tasks/${taskId}/history`,
    );
  }

  linkTaskToMilestone(
    projectId: string,
    taskId: string,
    milestoneId: string | null,
  ): Observable<Task> {
    const body: LinkTaskToMilestoneRequest = { milestoneId };
    return this.http.patch<Task>(
      `${environment.apiUrl}/projects/${projectId}/tasks/${taskId}`,
      body,
    );
  }

  listDeletedTasks(projectId: string): Observable<TaskListResponse> {
    return this.http.get<TaskListResponse>(
      `${environment.apiUrl}/projects/${projectId}/tasks/deleted`,
    );
  }

  restoreTask(projectId: string, taskId: string): Observable<Task> {
    return this.http.post<Task>(
      `${environment.apiUrl}/projects/${projectId}/tasks/${taskId}/restore`,
      {},
    );
  }
}
