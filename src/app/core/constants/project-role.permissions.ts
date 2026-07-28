import { ProjectRole } from '../models/project.models';

export type ProjectPermission = 'manageMembers' | 'changeRoles';

export const ROLE_PERMISSIONS: Record<ProjectRole, readonly ProjectPermission[]> = {
  owner: ['manageMembers', 'changeRoles'],
  admin: ['manageMembers', 'changeRoles'],
  member: [],
};

export const ASSIGNABLE_ROLES: Record<ProjectRole, readonly ProjectRole[]> = {
  owner: ['admin', 'member'],
  admin: ['member'],
  member: [],
};

export function hasPermission(role: ProjectRole, permission: ProjectPermission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
