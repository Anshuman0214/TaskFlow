import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createSubtask,
  deleteTask,
  getTask,
  updateTask,
  type TaskPriority,
  type TaskStatus,
} from "../../api/tasks";
import { listLabels } from "../../api/labels";
import { listWorkspaceMembers } from "../../api/workspaces";
import { useToast } from "../../context/useToast";
import { applyServerFieldErrors, getErrorMessage } from "../../lib/apiError";
import { priorityTone, statusTone } from "../../lib/badgeTones";
import { hasRole, MANAGE_ROLES, TASK_WRITE_ROLES } from "../../lib/permissions";
import type { ProjectContext } from "../projects/ProjectLayout";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { TextField } from "../../components/ui/TextField";
import { TextArea } from "../../components/ui/TextArea";
import { Spinner } from "../../components/ui/Spinner";
import { ErrorBanner } from "../../components/ui/ErrorBanner";
import { ConfirmModal } from "../../components/ui/ConfirmModal";

const TASK_STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "ARCHIVED"];
const TASK_PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

const detailsSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(5000).optional(),
});
type DetailsFormValues = z.infer<typeof detailsSchema>;

const subtaskSchema = z.object({ title: z.string().trim().min(1, "Title is required").max(200) });
type SubtaskFormValues = z.infer<typeof subtaskSchema>;

export const TaskDetailPage = () => {
  const { project, workspace, role } = useOutletContext<ProjectContext>();
  const { taskId } = useParams<{ taskId: string }>();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [showDelete, setShowDelete] = useState(false);

  const taskKey = ["tasks", "detail", taskId];
  const canWrite = hasRole(role, TASK_WRITE_ROLES) && project.status !== "ARCHIVED";
  const canDelete = hasRole(role, MANAGE_ROLES);

  const { data: task, isLoading, error } = useQuery({
    queryKey: taskKey,
    queryFn: () => getTask(project._id, taskId!),
  });

  const { data: members } = useQuery({
    queryKey: ["workspaces", workspace._id, "members"],
    queryFn: () => listWorkspaceMembers(workspace._id),
  });

  const { data: labels } = useQuery({
    queryKey: ["labels", project._id],
    queryFn: () => listLabels(project._id),
  });

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: taskKey }),
      queryClient.invalidateQueries({ queryKey: ["tasks", project._id] }),
    ]);

  const quickUpdate = useMutation({
    mutationFn: (fields: Parameters<typeof updateTask>[2]) => updateTask(project._id, taskId!, fields),
    onSuccess: () => invalidate(),
    onError: (err) => showToast(getErrorMessage(err), "error"),
  });

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<DetailsFormValues>({
    resolver: zodResolver(detailsSchema),
    values: task ? { title: task.title, description: task.description ?? "" } : undefined,
  });

  const onSaveDetails = async (values: DetailsFormValues) => {
    try {
      await updateTask(project._id, taskId!, values);
      await invalidate();
      reset(values);
      showToast("Task updated");
    } catch (err) {
      applyServerFieldErrors(err, setError);
      showToast(getErrorMessage(err), "error");
    }
  };

  const {
    register: registerSubtask,
    handleSubmit: handleSubtaskSubmit,
    reset: resetSubtask,
    formState: { isSubmitting: isSubtaskSubmitting },
  } = useForm<SubtaskFormValues>({ resolver: zodResolver(subtaskSchema) });

  const onCreateSubtask = async (values: SubtaskFormValues) => {
    try {
      await createSubtask(project._id, taskId!, values);
      await invalidate();
      resetSubtask({ title: "" });
    } catch (err) {
      showToast(getErrorMessage(err), "error");
    }
  };

  const deleteMutation = useMutation({
    mutationFn: () => deleteTask(project._id, taskId!),
    onSuccess: () => {
      showToast("Task deleted");
      navigate(`/organizations/${task?.organizationId}/workspaces/${workspace._id}/projects/${project._id}`);
    },
  });

  const toggleLabel = (labelId: string) => {
    if (!task) return;
    const current = task.labelIds.map((l) => l._id);
    const next = current.includes(labelId) ? current.filter((id) => id !== labelId) : [...current, labelId];
    quickUpdate.mutate({ labelIds: next });
  };

  if (isLoading) return <Spinner />;
  if (error) return <ErrorBanner error={error} />;
  if (!task) return null;

  return (
    <div className="flex flex-col gap-6">
      <Link
        to={`/organizations/${task.organizationId}/workspaces/${workspace._id}/projects/${project._id}`}
        className="text-sm text-gray-500 hover:text-gray-700"
      >
        ← Back to tasks
      </Link>

      <Card>
        <form className="flex flex-col gap-4" onSubmit={(e) => void handleSubmit(onSaveDetails)(e)}>
          <TextField
            label="Title"
            disabled={!canWrite}
            error={errors.title?.message}
            {...register("title")}
          />
          <TextArea
            label="Description"
            disabled={!canWrite}
            error={errors.description?.message}
            {...register("description")}
          />
          {canWrite && isDirty && (
            <div>
              <Button type="submit" isLoading={isSubmitting}>
                Save
              </Button>
            </div>
          )}
        </form>
      </Card>

      <Card>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="mb-1 text-xs font-medium text-gray-500">Status</p>
            {canWrite ? (
              <select
                className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                value={task.status}
                onChange={(e) => quickUpdate.mutate({ status: e.target.value as TaskStatus })}
              >
                {TASK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            ) : (
              <Badge tone={statusTone(task.status)}>{task.status}</Badge>
            )}
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-gray-500">Priority</p>
            {canWrite ? (
              <select
                className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                value={task.priority}
                onChange={(e) => quickUpdate.mutate({ priority: e.target.value as TaskPriority })}
              >
                {TASK_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            ) : (
              <Badge tone={priorityTone(task.priority)}>{task.priority}</Badge>
            )}
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-gray-500">Assignee</p>
            {canWrite ? (
              <select
                className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                value={task.assigneeId ?? ""}
                onChange={(e) => quickUpdate.mutate({ assigneeId: e.target.value || null })}
              >
                <option value="">Unassigned</option>
                {members?.map((m) => (
                  <option key={m.userId._id} value={m.userId._id}>
                    {m.userId.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-gray-900">
                {members?.find((m) => m.userId._id === task.assigneeId)?.userId.name ?? "Unassigned"}
              </p>
            )}
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-gray-500">Due date</p>
            {canWrite ? (
              <input
                type="date"
                className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                value={task.dueDate ? task.dueDate.slice(0, 10) : ""}
                onChange={(e) => quickUpdate.mutate({ dueDate: e.target.value || null })}
              />
            ) : (
              <p className="text-sm text-gray-900">
                {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "—"}
              </p>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <p className="mb-2 text-xs font-medium text-gray-500">Labels</p>
        <div className="flex flex-wrap gap-2">
          {labels?.map((label) => {
            const active = task.labelIds.some((l) => l._id === label._id);
            return (
              <button
                key={label._id}
                disabled={!canWrite}
                onClick={() => toggleLabel(label._id)}
                className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm disabled:cursor-not-allowed"
                style={{
                  backgroundColor: active ? `${label.color}30` : "#f3f4f6",
                  color: active ? label.color : "#6b7280",
                }}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: label.color }} />
                {label.name}
              </button>
            );
          })}
          {labels?.length === 0 && <p className="text-sm text-gray-500">No labels in this project yet.</p>}
        </div>
      </Card>

      <Card>
        <p className="mb-2 text-xs font-medium text-gray-500">Subtasks</p>
        {task.subtasks.length > 0 && (
          <ul className="mb-3 flex flex-col gap-1">
            {task.subtasks.map((subtask) => (
              <li key={subtask._id} className="flex items-center justify-between text-sm">
                <span>{subtask.title}</span>
                <Badge tone={statusTone(subtask.status)}>{subtask.status}</Badge>
              </li>
            ))}
          </ul>
        )}
        {canWrite && (
          <form className="flex gap-2" onSubmit={(e) => void handleSubtaskSubmit(onCreateSubtask)(e)}>
            <input
              className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
              placeholder="Add a subtask…"
              {...registerSubtask("title")}
            />
            <Button type="submit" variant="secondary" isLoading={isSubtaskSubmitting}>
              Add
            </Button>
          </form>
        )}
      </Card>

      {canDelete && (
        <div>
          <Button variant="danger" onClick={() => setShowDelete(true)}>
            Delete task
          </Button>
        </div>
      )}

      {showDelete && (
        <ConfirmModal
          title="Delete task"
          description={`Delete "${task.title}"? This cannot be undone.`}
          confirmLabel="Delete"
          isLoading={deleteMutation.isPending}
          error={deleteMutation.error}
          onConfirm={() => deleteMutation.mutate()}
          onClose={() => setShowDelete(false)}
        />
      )}
    </div>
  );
};
