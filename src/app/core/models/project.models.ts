export type ProjectRole = 'owner' | 'admin' | 'member';

export interface ProjectMetadata {
  id: string;
  name: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface ProjectSummary {
  id: string;
  name: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  viewerRole: ProjectRole;
}

export interface ProjectListResponse {
  projects: ProjectSummary[];
}

export interface ArchiveProjectResponse {
  project: ProjectSummary;
}

export interface RestoreProjectResponse {
  project: ProjectSummary;
}

export interface ProjectMember {
  id: string;
  name: string;
  email: string;
  role: ProjectRole;
  avatarUrl?: string;
}

export interface ProjectActivity {
  id: string;
  type: string;
  description: string;
  actorName: string;
  createdAt: string;
}

export interface ProjectMetrics {
  totalTasks: number;
  completedTasks: number;
  openTasks: number;
  overdueTasks: number;
  memberCount: number;
}

export interface ProjectDetail {
  metadata: ProjectMetadata;
  members: ProjectMember[];
  recentActivity: ProjectActivity[];
  metrics: ProjectMetrics;
  viewerRole: ProjectRole;
}

export interface InviteMemberRequest {
  identifier: string;
}

export interface InviteMemberResponse {
  member: ProjectMember;
}

export interface UpdateMemberRoleRequest {
  role: ProjectRole;
}

export interface UpdateMemberRoleResponse {
  member: ProjectMember;
}
