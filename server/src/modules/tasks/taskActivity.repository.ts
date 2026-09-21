import { TaskActivity } from "./taskActivity.model.js";

interface CreateTaskActivityInput {
  taskId: string;
  organizationId: string;
  actorId: string;
  action: string;
  previousValue?: unknown;
  newValue?: unknown;
}

export const createTaskActivity = (input: CreateTaskActivityInput) => TaskActivity.create(input);
