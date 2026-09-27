import { Queue, Worker } from "bullmq";
import { Redis } from "ioredis";
import { env } from "../../config/env.js";
import { logger } from "../../utils/logger.js";
import { dispatchNotification, type NotificationJob } from "./notification.dispatcher.js";
import { scheduleDueDateReminders } from "./reminder.service.js";

const QUEUE_NAME = "notifications";
const REMINDER_JOB_NAME = "due-date-reminders";

interface ReminderJob {
  kind: "reminder-sweep";
}

type QueuePayload = NotificationJob | ReminderJob;

const isReminderSweep = (payload: QueuePayload): payload is ReminderJob =>
  "kind" in payload && payload.kind === "reminder-sweep";

// BullMQ requires maxRetriesPerRequest: null on its connection (it blocks on
// BRPOPLPUSH), so it cannot share database/redis.ts's client.
let connection: Redis | null = null;
let queue: Queue<QueuePayload> | null = null;
let worker: Worker<QueuePayload> | null = null;

const getConnection = (): Redis => {
  connection ??= new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
  return connection;
};

const getQueue = (): Queue<QueuePayload> => {
  queue ??= new Queue<QueuePayload>(QUEUE_NAME, { connection: getConnection() });
  return queue;
};

// Under NODE_ENV=test there is no worker running, so the job is executed
// inline — tests assert on the resulting Notification document directly
// instead of racing a background consumer.
export const enqueueNotification = async (job: NotificationJob): Promise<void> => {
  if (env.NODE_ENV === "test") {
    await dispatchNotification(job);
    return;
  }

  try {
    await getQueue().add("notify", job, {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    });
  } catch (error) {
    // A notification that can't be queued must never fail the request that
    // triggered it — the task/comment write has already succeeded.
    logger.error("Failed to enqueue notification", { type: job.type, error });
  }
};

export const enqueueNotifications = async (jobs: NotificationJob[]): Promise<void> => {
  await Promise.all(jobs.map((job) => enqueueNotification(job)));
};

export const startNotificationWorker = (): void => {
  if (env.NODE_ENV === "test" || worker) {
    return;
  }

  worker = new Worker<QueuePayload>(
    QUEUE_NAME,
    async (job) => {
      if (isReminderSweep(job.data)) {
        const queued = await scheduleDueDateReminders(enqueueNotification);
        logger.info("Due-date reminder sweep complete", { queued });
        return;
      }

      await dispatchNotification(job.data);
    },
    { connection: getConnection(), concurrency: 5 },
  );

  worker.on("failed", (job, error) => {
    logger.error("Notification job failed", { jobId: job?.id, error });
  });

  // Hourly sweep for tasks coming due. Repeatable jobs are keyed by name, so
  // restarting the process re-registers the same schedule rather than stacking
  // duplicates. ponytail: in-process worker — move it to its own container if
  // the sweep ever outgrows one node.
  getQueue()
    .upsertJobScheduler(
      REMINDER_JOB_NAME,
      { pattern: "0 * * * *" },
      { name: REMINDER_JOB_NAME, data: { kind: "reminder-sweep" } },
    )
    .then(() => logger.info("Due-date reminder scheduler registered"))
    .catch((error: unknown) => logger.error("Failed to register reminder scheduler", { error }));

  logger.info("Notification worker started");
};

export const stopNotificationWorker = async (): Promise<void> => {
  await worker?.close();
  await queue?.close();
  connection?.disconnect();

  worker = null;
  queue = null;
  connection = null;
};
