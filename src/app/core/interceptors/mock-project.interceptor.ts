import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AddTaskDependencyRequest,
  ArchiveProjectResponse,
  BulkTaskActionRequest,
  BulkTaskActionResponse,
  CreateMilestoneRequest,
  CreateTaskFromTemplateRequest,
  CreateTaskRequest,
  DuplicateTaskRequest,
  InviteMemberRequest,
  InviteMemberResponse,
  LinkTaskToMilestoneRequest,
  MilestoneListResponse,
  ProjectListResponse,
  ProjectRole,
  RestoreProjectResponse,
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
import * as mockStore from '../mock/mock-project-store';

function jsonResponse<T>(body: T): Observable<HttpResponse<T>> {
  return of(new HttpResponse<T>({ status: 200, body }));
}

function notFound(url: string): Observable<never> {
  return throwError(() => new HttpErrorResponse({ status: 404, url, statusText: 'Not Found' }));
}

function badRequest(url: string): Observable<never> {
  return throwError(() => new HttpErrorResponse({ status: 400, url, statusText: 'Bad Request' }));
}

function isLinkTaskToMilestoneBody(body: unknown): body is LinkTaskToMilestoneRequest {
  if (!body || typeof body !== 'object') {
    return false;
  }

  const keys = Object.keys(body);
  return keys.length === 1 && keys[0] === 'milestoneId';
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

  const milestonesMatch = path.match(/^\/projects\/([^/]+)\/milestones$/);
  if (req.method === 'GET' && milestonesMatch) {
    const milestones = mockStore.listMilestones(milestonesMatch[1]);
    return milestones ? jsonResponse<MilestoneListResponse>({ milestones }) : notFound(req.url);
  }

  if (req.method === 'POST' && milestonesMatch) {
    const { title, dueDate } = req.body as CreateMilestoneRequest;
    const milestone = mockStore.createMilestone(milestonesMatch[1], title, dueDate);
    return milestone ? jsonResponse(milestone) : notFound(req.url);
  }

  const tasksMatch = path.match(/^\/projects\/([^/]+)\/tasks$/);
  const taskHierarchyMatch = path.match(/^\/projects\/([^/]+)\/tasks\/hierarchy$/);
  if (req.method === 'GET' && taskHierarchyMatch) {
    const tasks = mockStore.getTaskHierarchy(taskHierarchyMatch[1]);
    return tasks ? jsonResponse<TaskHierarchyResponse>({ tasks }) : notFound(req.url);
  }

  const deletedTasksMatch = path.match(/^\/projects\/([^/]+)\/tasks\/deleted$/);
  if (req.method === 'GET' && deletedTasksMatch) {
    const tasks = mockStore.listDeletedTasks(deletedTasksMatch[1]);
    return tasks ? jsonResponse<TaskListResponse>({ tasks }) : notFound(req.url);
  }

  const taskDependenciesMatch = path.match(/^\/projects\/([^/]+)\/tasks\/dependencies$/);
  if (req.method === 'GET' && taskDependenciesMatch) {
    const dependencies = mockStore.listTaskDependencies(taskDependenciesMatch[1]);
    return dependencies
      ? jsonResponse<TaskDependencyListResponse>({ dependencies })
      : notFound(req.url);
  }

  const taskTemplatesMatch = path.match(/^\/projects\/([^/]+)\/tasks\/templates$/);
  if (req.method === 'GET' && taskTemplatesMatch) {
    const templates = mockStore.listTaskTemplates(taskTemplatesMatch[1]);
    return templates
      ? jsonResponse<TaskTemplateListResponse>({ templates })
      : notFound(req.url);
  }

  if (req.method === 'POST' && taskTemplatesMatch) {
    const body = req.body as CreateTaskFromTemplateRequest;
    const task = mockStore.createTaskFromTemplate(taskTemplatesMatch[1], body);
    return task ? jsonResponse(task) : notFound(req.url);
  }

  const bulkTasksMatch = path.match(/^\/projects\/([^/]+)\/tasks\/bulk$/);
  if (req.method === 'POST' && bulkTasksMatch) {
    const body = req.body as BulkTaskActionRequest;
    const result = mockStore.bulkTaskAction(bulkTasksMatch[1], body);
    return result ? jsonResponse<BulkTaskActionResponse>(result) : notFound(req.url);
  }

  if (req.method === 'GET' && tasksMatch) {
    const tasks = mockStore.listTasks(tasksMatch[1]);
    return tasks ? jsonResponse<TaskListResponse>({ tasks }) : notFound(req.url);
  }

  if (req.method === 'POST' && tasksMatch) {
    const body = req.body as CreateTaskRequest;
    const result = mockStore.createTask(tasksMatch[1], body);
    if (result.kind === 'success') {
      return jsonResponse(result.task);
    }
    if (result.kind === 'validation_error') {
      return badRequest(req.url);
    }
    return notFound(req.url);
  }

  const taskHistoryMatch = path.match(/^\/projects\/([^/]+)\/tasks\/([^/]+)\/history$/);
  if (req.method === 'GET' && taskHistoryMatch) {
    const history = mockStore.getTaskHistory(taskHistoryMatch[1], taskHistoryMatch[2]);
    return history ? jsonResponse<TaskHistoryResponse>({ history }) : notFound(req.url);
  }

  const restoreTaskMatch = path.match(/^\/projects\/([^/]+)\/tasks\/([^/]+)\/restore$/);
  if (req.method === 'POST' && restoreTaskMatch) {
    const task = mockStore.restoreTask(restoreTaskMatch[1], restoreTaskMatch[2]);
    return task ? jsonResponse(task) : notFound(req.url);
  }

  const duplicateTaskMatch = path.match(/^\/projects\/([^/]+)\/tasks\/([^/]+)\/duplicate$/);
  if (req.method === 'POST' && duplicateTaskMatch) {
    const body = (req.body ?? {}) as DuplicateTaskRequest;
    const task = mockStore.duplicateTask(duplicateTaskMatch[1], duplicateTaskMatch[2], body);
    return task ? jsonResponse(task) : notFound(req.url);
  }

  const taskDependencyMatch = path.match(/^\/projects\/([^/]+)\/tasks\/([^/]+)\/dependencies$/);
  if (req.method === 'POST' && taskDependencyMatch) {
    const body = req.body as AddTaskDependencyRequest;
    const result = mockStore.addTaskDependency(
      taskDependencyMatch[1],
      taskDependencyMatch[2],
      body,
    );
    if (result.kind === 'success') {
      return jsonResponse<TaskDependencyResponse>({ dependency: result.dependency });
    }
    if (result.kind === 'validation_error') {
      return badRequest(req.url);
    }
    return notFound(req.url);
  }

  const removeDependencyMatch = path.match(
    /^\/projects\/([^/]+)\/tasks\/([^/]+)\/dependencies\/([^/]+)$/,
  );
  if (req.method === 'DELETE' && removeDependencyMatch) {
    const removed = mockStore.removeTaskDependency(
      removeDependencyMatch[1],
      removeDependencyMatch[2],
      removeDependencyMatch[3],
    );
    return removed ? jsonResponse<void>(undefined) : notFound(req.url);
  }

  const taskMatch = path.match(/^\/projects\/([^/]+)\/tasks\/([^/]+)$/);
  if (req.method === 'GET' && taskMatch) {
    const task = mockStore.getTask(taskMatch[1], taskMatch[2]);
    return task ? jsonResponse(task) : notFound(req.url);
  }

  if (req.method === 'PATCH' && taskMatch) {
    if (isLinkTaskToMilestoneBody(req.body)) {
      const { milestoneId } = req.body;
      const task = mockStore.linkTaskToMilestone(taskMatch[1], taskMatch[2], milestoneId);
      return task ? jsonResponse(task) : notFound(req.url);
    }

    const body = req.body as UpdateTaskRequest;
    const result = mockStore.updateTask(taskMatch[1], taskMatch[2], body);
    if (result.kind === 'success') {
      return jsonResponse(result.task);
    }
    if (result.kind === 'validation_error') {
      return badRequest(req.url);
    }
    return notFound(req.url);
  }

  if (req.method === 'DELETE' && taskMatch) {
    const deleted = mockStore.deleteTask(taskMatch[1], taskMatch[2]);
    return deleted ? jsonResponse<void>(undefined) : notFound(req.url);
  }

  const detailMatch = path.match(/^\/projects\/([^/]+)$/);
  if (req.method === 'GET' && detailMatch) {
    const detail = mockStore.getProjectDetail(detailMatch[1]);
    return detail ? jsonResponse(detail) : notFound(req.url);
  }

  return next(req);
};
