import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  NOTIFICATIONS_KEY,
} from "../../api/notifications";

export const NotificationBell = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: [...NOTIFICATIONS_KEY, "recent"],
    queryFn: () => listNotifications({ limit: 8 }),
    // Notifications arrive out-of-band (a BullMQ worker writes them), so the
    // bell polls. Socket.IO is v1.1 scope per Docs/Track.md.
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (!open) return;

    const onClickAway = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, [open]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });

  const markRead = useMutation({
    mutationFn: (notificationId: string) => markNotificationRead(notificationId, true),
    onSuccess: invalidate,
  });

  const markAll = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: invalidate,
  });

  const unread = data?.meta.unreadCount ?? 0;

  return (
    <div ref={containerRef} className="relative">
      <button
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
        className="relative rounded-md px-2 py-1.5 text-gray-600 hover:bg-gray-100"
        onClick={() => setOpen((value) => !value)}
      >
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.85 23.85 0 0 0 5.454-1.31A8.97 8.97 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.97 8.97 0 0 1-2.311 6.022c1.733.64 3.56 1.085 5.454 1.31m5.714 0a24.26 24.26 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
          />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
            <p className="text-sm font-medium text-gray-900">Notifications</p>
            {unread > 0 && (
              <button
                className="text-xs text-gray-500 hover:text-gray-900"
                disabled={markAll.isPending}
                onClick={() => markAll.mutate()}
              >
                Mark all read
              </button>
            )}
          </div>

          <ul className="max-h-80 overflow-y-auto">
            {data?.items.map((notification) => (
              <li
                key={notification._id}
                className={`border-b border-gray-50 px-3 py-2 last:border-0 ${
                  notification.isRead ? "" : "bg-blue-50/50"
                }`}
              >
                <button
                  className="w-full text-left"
                  onClick={() => {
                    if (!notification.isRead) markRead.mutate(notification._id);
                  }}
                >
                  <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                  <p className="text-sm text-gray-600">{notification.message}</p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {new Date(notification.createdAt).toLocaleString()}
                  </p>
                </button>
              </li>
            ))}
            {data?.items.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-gray-500">Nothing yet.</li>
            )}
          </ul>

          <div className="border-t border-gray-100 px-3 py-2">
            <Link
              to="/notifications"
              className="text-xs text-gray-600 hover:text-gray-900"
              onClick={() => setOpen(false)}
            >
              See all notifications →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
