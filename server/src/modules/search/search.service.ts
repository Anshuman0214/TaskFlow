import {
  searchProjects,
  searchTasks,
  searchUsers,
  searchWorkspaces,
} from "./search.repository.js";
import { GlobalSearchQuery, ProjectSearchQuery, TaskSearchQuery } from "./search.validation.js";

// Global search with ?type= narrows to one collection; without it, all four run
// in parallel and the caller gets a grouped result. Deliberately not cached:
// unlike the dashboard, the query string is unbounded, so a cache would mostly
// store single-use entries.
export const globalSearch = async (organizationId: string, query: GlobalSearchQuery) => {
  const paged = { page: query.page, limit: query.limit, q: query.q };

  if (query.type === "task") return { tasks: await searchTasks(organizationId, paged) };
  if (query.type === "project") return { projects: await searchProjects(organizationId, paged) };
  if (query.type === "workspace") return { workspaces: await searchWorkspaces(organizationId, paged) };
  if (query.type === "user") return { users: await searchUsers(organizationId, paged) };

  const [tasks, projects, workspaces, users] = await Promise.all([
    searchTasks(organizationId, paged),
    searchProjects(organizationId, paged),
    searchWorkspaces(organizationId, paged),
    searchUsers(organizationId, paged),
  ]);

  return { tasks, projects, workspaces, users };
};

export const taskSearch = (organizationId: string, query: TaskSearchQuery) =>
  searchTasks(organizationId, query);

export const projectSearch = (organizationId: string, query: ProjectSearchQuery) =>
  searchProjects(organizationId, query);
