import { findTasksDueWithin } from "../tasks/task.repository.js";
import { Notification } from "./notification.model.js";
import type { NotificationJob } from "./notification.dispatcher.js";

const REMINDER_WINDOW_HOURS = 24;

// Called by the hourly sweep. Deliberately re-derived from the Task collection
// each run rather than scheduled per-task at write time: a task's dueDate can
// change or be cleared any number of times, and a standing per-task delayed job
// would then have to be found and cancelled. One sweep is cheaper than that
// bookkeeping.
export const scheduleDueDateReminders = async (
  enqueue: (job: NotificationJob) => Promise<void>,
): Promise<number> => {
  const now = new Date();
  const until = new Date(now.getTime() + REMINDER_WINDOW_HOURS * 60 * 60 * 1000);

  const tasks = await findTasksDueWithin(now, until);
  let queued = 0;

  for (const task of tasks) {
    if (!task.assigneeId) continue;

    // Idempotency guard: the sweep runs hourly but a task should only ever
    // produce one reminder per dueDate. metadata.dueDate is the dedupe key.
    const alreadySent = await Notification.exists({
      userId: task.assigneeId,
      type: "DUE_DATE_REMINDER",
      "metadata.taskId": task._id.toString(),
      "metadata.dueDate": task.dueDate?.toISOString(),
    });

    if (alreadySent) continue;

    await enqueue({
      userId: task.assigneeId.toString(),
      organizationId: task.organizationId.toString(),
      title: "Task due soon",
      message: `"${task.title}" is due ${task.dueDate?.toLocaleString() ?? "soon"}.`,
      type: "DUE_DATE_REMINDER",
      metadata: {
        taskId: task._id.toString(),
        projectId: task.projectId.toString(),
        dueDate: task.dueDate?.toISOString(),
      },
      email: true,
    });

    queued += 1;
  }

  return queued;
};
