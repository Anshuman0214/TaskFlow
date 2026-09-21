import { Project } from "./project.model.js";
import { ProjectStatus } from "./project.types.js";

export interface CreateProjectInput {
  organizationId: string;
  workspaceId: string;
  name: string;
  key: string;
  description: string | null;
  startDate: Date | null;
  endDate: Date | null;
  createdBy: string;
  updatedBy: string;
}

export interface UpdateProjectFields {
  name?: string | undefined;
  description?: string | null | undefined;
  status?: ProjectStatus | undefined;
  startDate?: Date | null | undefined;
  endDate?: Date | null | undefined;
  archivedAt?: Date | null | undefined;
  updatedBy: string;
}

export interface ListProjectsOptions {
  page: number;
  limit: number;
  status?: ProjectStatus | undefined;
  sortBy: string;
  order: "asc" | "desc";
}

export const createProject = (input: CreateProjectInput) => Project.create(input);

export const findProjectById = (id: string) => Project.findOne({ _id: id, isDeleted: false });

export const findProjectByName = (workspaceId: string, name: string) =>
  Project.findOne({ workspaceId, name, isDeleted: false });

export const findProjectByKey = (workspaceId: string, key: string) =>
  Project.findOne({ workspaceId, key, isDeleted: false });

export const listProjectsByWorkspace = async (workspaceId: string, options: ListProjectsOptions) => {
  const filter: Record<string, unknown> = { workspaceId, isDeleted: false };
  if (options.status) filter.status = options.status;

  const skip = (options.page - 1) * options.limit;
  const sort: Record<string, 1 | -1> = { [options.sortBy]: options.order === "asc" ? 1 : -1 };

  const [items, total] = await Promise.all([
    Project.find(filter).sort(sort).skip(skip).limit(options.limit),
    Project.countDocuments(filter),
  ]);

  return { items, total };
};

export const updateProjectFields = (id: string, fields: UpdateProjectFields) =>
  Project.findByIdAndUpdate(id, fields, { returnDocument: "after" });

export const softDeleteProject = (id: string, deletedBy: string) =>
  Project.findByIdAndUpdate(
    id,
    { isDeleted: true, deletedAt: new Date(), deletedBy, updatedBy: deletedBy },
    { returnDocument: "after" },
  );
