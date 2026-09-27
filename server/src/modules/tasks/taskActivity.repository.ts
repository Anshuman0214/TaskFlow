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

export interface ListTaskActivitiesOptions {
  page: number;
  limit: number;
}

// Read side of the append-only collection M5 has been writing to since it
// was introduced — the Activity Timeline (M6). Nothing mutates activities.
export const listTaskActivities = async (taskId: string, options: ListTaskActivitiesOptions) => {
  const skip = (options.page - 1) * options.limit;

  const [items, total] = await Promise.all([
    TaskActivity.find({ taskId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(options.limit)
      .populate("actorId", "name email"),
    TaskActivity.countDocuments({ taskId }),
  ]);

  return { items, total };
};
