import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createComment,
  deleteAttachment,
  deleteComment,
  listActivities,
  listAttachments,
  listComments,
  updateComment,
  uploadAttachment,
  type Attachment,
  type Comment,
  type TaskActivity,
  type UserRef,
} from "../../api/collaboration";
import { useAuth } from "../../context/useAuth";
import { useToast } from "../../context/useToast";
import { getErrorMessage } from "../../lib/apiError";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Spinner } from "../ui/Spinner";
import { ErrorBanner } from "../ui/ErrorBanner";

// createdBy/uploadedBy/actorId come back populated with { name, email } on
// list endpoints but as a bare id when echoed from a create response.
const nameOf = (ref: UserRef | string): string =>
  typeof ref === "string" ? "Someone" : ref.name;
const idOf = (ref: UserRef | string): string => (typeof ref === "string" ? ref : ref._id);

const timestamp = (iso: string): string => new Date(iso).toLocaleString();

const formatBytes = (bytes: number): string =>
  bytes < 1024
    ? `${bytes} B`
    : bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

interface PanelProps {
  taskId: string;
  canWrite: boolean;
  canDelete: boolean;
}

export const CommentsPanel = ({ taskId, canWrite, canDelete }: PanelProps) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { user } = useAuth();
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const key = ["tasks", taskId, "comments"];
  const { data, isLoading, error } = useQuery({
    queryKey: key,
    queryFn: () => listComments(taskId),
  });

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: key }),
      queryClient.invalidateQueries({ queryKey: ["tasks", taskId, "activities"] }),
    ]);

  const onError = (err: unknown) => showToast(getErrorMessage(err), "error");

  const create = useMutation({
    mutationFn: () => createComment(taskId, draft),
    onSuccess: async () => {
      setDraft("");
      await invalidate();
    },
    onError,
  });

  const edit = useMutation({
    mutationFn: (commentId: string) => updateComment(taskId, commentId, editDraft),
    onSuccess: async () => {
      setEditingId(null);
      await invalidate();
    },
    onError,
  });

  const remove = useMutation({
    mutationFn: (commentId: string) => deleteComment(taskId, commentId),
    onSuccess: () => invalidate(),
    onError,
  });

  // Author-or-admin, matching comment.service.ts exactly.
  const canModify = (comment: Comment): boolean =>
    canWrite && (idOf(comment.createdBy) === user?.id || canDelete);

  return (
    <Card>
      <p className="mb-3 text-xs font-medium text-gray-500">
        Comments{data ? ` (${data.meta.total})` : ""}
      </p>

      {error && <ErrorBanner error={error} />}
      {isLoading && <Spinner />}

      {data && data.items.length === 0 && (
        <p className="text-sm text-gray-500">No comments yet.</p>
      )}

      <ul className="flex flex-col gap-3">
        {data?.items.map((comment) => (
          <li key={comment._id} className="rounded-md border border-gray-200 p-3">
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-gray-900">{nameOf(comment.createdBy)}</p>
              <p className="text-xs text-gray-400">
                {timestamp(comment.createdAt)}
                {comment.editedAt ? " · edited" : ""}
              </p>
            </div>

            {editingId === comment._id ? (
              <div className="flex flex-col gap-2">
                <textarea
                  className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                  rows={3}
                  value={editDraft}
                  onChange={(e) => setEditDraft(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    isLoading={edit.isPending}
                    disabled={editDraft.trim().length === 0}
                    onClick={() => edit.mutate(comment._id)}
                  >
                    Save
                  </Button>
                  <Button variant="ghost" onClick={() => setEditingId(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="whitespace-pre-wrap text-sm text-gray-700">{comment.content}</p>
                {canModify(comment) && (
                  <div className="mt-2 flex gap-2">
                    <button
                      className="text-xs text-gray-500 hover:text-gray-900"
                      onClick={() => {
                        setEditingId(comment._id);
                        setEditDraft(comment.content);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="text-xs text-red-600 hover:text-red-800"
                      onClick={() => remove.mutate(comment._id)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </>
            )}
          </li>
        ))}
      </ul>

      {canWrite && (
        <form
          className="mt-3 flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <textarea
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            rows={3}
            placeholder="Add a comment…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div>
            <Button type="submit" isLoading={create.isPending} disabled={draft.trim().length === 0}>
              Comment
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
};

export const AttachmentsPanel = ({ taskId, canWrite, canDelete }: PanelProps) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);

  const key = ["tasks", taskId, "attachments"];
  const { data, isLoading, error } = useQuery({
    queryKey: key,
    queryFn: () => listAttachments(taskId),
  });

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: key }),
      queryClient.invalidateQueries({ queryKey: ["tasks", taskId, "activities"] }),
    ]);

  const onError = (err: unknown) => showToast(getErrorMessage(err), "error");

  const upload = useMutation({
    mutationFn: (file: File) => uploadAttachment(taskId, file),
    onSuccess: async () => {
      if (fileInput.current) fileInput.current.value = "";
      await invalidate();
      showToast("Attachment uploaded");
    },
    onError: (err) => {
      if (fileInput.current) fileInput.current.value = "";
      onError(err);
    },
  });

  const remove = useMutation({
    mutationFn: (attachmentId: string) => deleteAttachment(taskId, attachmentId),
    onSuccess: () => invalidate(),
    onError,
  });

  // Local-storage fallback returns a server-relative /uploads/... path; a
  // configured Cloudinary returns an absolute URL. Resolve the former against
  // the API origin so the link works from the Vite dev server too.
  const hrefFor = (attachment: Attachment): string =>
    attachment.fileUrl.startsWith("http")
      ? attachment.fileUrl
      : new URL(attachment.fileUrl, import.meta.env.VITE_API_URL).toString();

  return (
    <Card>
      <p className="mb-3 text-xs font-medium text-gray-500">Attachments</p>

      {error && <ErrorBanner error={error} />}
      {isLoading && <Spinner />}

      {data && data.length === 0 && <p className="text-sm text-gray-500">No attachments yet.</p>}

      <ul className="flex flex-col gap-2">
        {data?.map((attachment) => (
          <li key={attachment._id} className="flex items-center justify-between gap-3 text-sm">
            <a
              href={hrefFor(attachment)}
              target="_blank"
              rel="noreferrer"
              className="truncate text-gray-900 underline hover:text-gray-600"
            >
              {attachment.originalFileName}
            </a>
            <div className="flex shrink-0 items-center gap-3">
              <span className="text-xs text-gray-400">{formatBytes(attachment.fileSize)}</span>
              <span className="text-xs text-gray-400">{nameOf(attachment.uploadedBy)}</span>
              {canDelete && (
                <button
                  className="text-xs text-red-600 hover:text-red-800"
                  onClick={() => remove.mutate(attachment._id)}
                >
                  Delete
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {canWrite && (
        <div className="mt-3">
          <input
            ref={fileInput}
            type="file"
            className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border file:border-gray-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium"
            disabled={upload.isPending}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload.mutate(file);
            }}
          />
          {upload.isPending && <p className="mt-1 text-xs text-gray-500">Uploading…</p>}
        </div>
      )}
    </Card>
  );
};

// The activity trail is append-only server-side, so this is read-only by design.
const describeActivity = (activity: TaskActivity): string => {
  const words = activity.action.replace(/^TASK_/, "").replace(/_/g, " ").toLowerCase();
  const next = activity.newValue as Record<string, unknown> | undefined;
  const status = next && typeof next.status === "string" ? ` → ${next.status}` : "";
  return `${words}${status}`;
};

export const ActivityTimeline = ({ taskId }: { taskId: string }) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["tasks", taskId, "activities"],
    queryFn: () => listActivities(taskId, 1, 50),
  });

  return (
    <Card>
      <p className="mb-3 text-xs font-medium text-gray-500">Activity</p>

      {error && <ErrorBanner error={error} />}
      {isLoading && <Spinner />}

      <ol className="flex flex-col gap-2">
        {data?.items.map((activity) => (
          <li key={activity._id} className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-gray-700">
              <span className="font-medium text-gray-900">{nameOf(activity.actorId)}</span>{" "}
              {describeActivity(activity)}
            </span>
            <span className="shrink-0 text-xs text-gray-400">{timestamp(activity.createdAt)}</span>
          </li>
        ))}
      </ol>

      {data && data.items.length === 0 && (
        <p className="text-sm text-gray-500">No activity recorded yet.</p>
      )}
    </Card>
  );
};
