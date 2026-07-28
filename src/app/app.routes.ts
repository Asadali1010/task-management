import { Routes } from '@angular/router';

import { authGuard, authGuardChild } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./features/login/login').then((m) => m.Login),
  },
  {
    path: '',
    loadComponent: () =>
      import('./layout/application-layout/application-layout').then((m) => m.ApplicationLayout),
    canActivate: [authGuard],
    canActivateChild: [authGuardChild],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'projects',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'projects/:projectId',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/project-detail/project-detail').then((m) => m.ProjectDetail),
          },
          {
            path: 'tasks',
            loadComponent: () =>
              import('./features/project-tasks/project-tasks').then((m) => m.ProjectTasks),
          },
          {
            path: 'milestones',
            loadComponent: () =>
              import('./features/project-milestones/project-milestones').then(
                (m) => m.ProjectMilestones,
              ),
          },
        ],
      },
      {
        path: 'tasks',
        loadComponent: () => import('./features/tasks/tasks').then((m) => m.Tasks),
      },
      {
        path: 'analytics',
        loadComponent: () => import('./features/analytics/analytics').then((m) => m.Analytics),
      },
      {
        path: 'settings',
        loadComponent: () => import('./features/settings/settings').then((m) => m.Settings),
      },
    ],
  },
];
