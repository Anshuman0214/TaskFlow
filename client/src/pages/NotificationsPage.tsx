import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  NOTIFICATION_TYPES,
  NOTIFICATIONS_KEY,
  type NotificationType,
} from "../api/notifications";
import { useToast } from "../context/useToast";
import { getErrorMessage } from "../lib/apiError";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorBanner } from "../components/ui/ErrorBanner";
import { Spinner } from "../components/ui/Spinner";

type ReadFilter = "all" | "unread" | "read";

const readParam = (filter: ReadFilter): boolean | undefined =>
  filter === "all" ? undefined : filter === "read";

export const NotificationsPage = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [page, setPage] = useState(1);
  const [readFilter, setReadFilter] = useState<ReadFilter>("all");
  const [type, setType] = useState<NotificationType | "">("");

  const isRead = readParam(readFilter);
  const { data, isLoading, error } = useQuery({
    queryKey: [...NOTIFICATIONS_KEY, "page", page, readFilter, type],
    queryFn: () =>
      listNotifications({
        page,
        limit: 20,
        ...(isRead === undefined ? {} : { isRead }),
        ...(type ? { type } : {}),
      }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
  const onError = (err: unknown) => showToast(getErrorMessage(err), "error");

  const toggleRead = useMutation({
    mutationFn: ({ id, next }: { id: string; next: boolean }) => markNotificationRead(id, next),
    onSuccess: invalidate,
    onError,
  });

  const markAll = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: invalidate,
    onError,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteNotification(id),
    onSuccess: invalidate,
    onError,
  });

  const changeFilter = (next: () => void) => {
    next();
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-gray-900">
          Notifications
          {data && data.meta.unreadCount > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-500">
              {data.meta.unreadCount} unread
            </span>
          )}
        </h1>
        {data && data.meta.unreadCount > 0 && (
          <Button variant="secondary" isLoading={markAll.isPending} onClick={() => markAll.mutate()}>
            Mark all read
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          value={readFilter}
          onChange={(e) => changeFilter(() => setReadFilter(e.target.value as ReadFilter))}
        >
          <option value="all">All</option>
          <option value="unread">Unread</option>
          <option value="read">Read</option>
        </select>
        <select
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          value={type}
          onChange={(e) => changeFilter(() => setType(e.target.value as NotificationType | ""))}
        >
          <option value="">All types</option>
          {NOTIFICATION_TYPES.map((value) => (
            <option key={value} value={value}>
              {value.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      {error && <ErrorBanner error={error} />}
      {isLoading && <Spinner />}

      {data && data.items.length === 0 && (
        <EmptyState
          title="No notifications"
          description="Assignments, comments and reminders will show up here."
        />
      )}

      <ul className="flex flex-col gap-2">
        {data?.items.map((notification) => (
          <li key={notification._id}>
            <Card className={notification.isRead ? "" : "border-blue-200 bg-blue-50/40"}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-1 flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                    <Badge tone={notification.isRead ? "gray" : "blue"}>
                      {notification.type.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{notification.message}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {new Date(notification.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex shrink-0 gap-3">
                  <button
                    className="text-xs text-gray-500 hover:text-gray-900"
                    onClick={() =>
                      toggleRead.mutate({ id: notification._id, next: !notification.isRead })
                    }
                  >
                    {notification.isRead ? "Mark unread" : "Mark read"}
                  </button>
                  <button
                    className="text-xs text-red-600 hover:text-red-800"
                    onClick={() => remove.mutate(notification._id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </Card>
          </li>
        ))}
      </ul>

      {data && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <span className="text-sm text-gray-500">
            Page {data.meta.page} of {data.meta.totalPages}
          </span>
          <Button
            variant="secondary"
            disabled={page >= data.meta.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};
