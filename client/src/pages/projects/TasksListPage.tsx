import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useOutletContext } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createTask, listTasks, type TaskPriority, type TaskStatus } from "../../api/tasks";
import { listWorkspaceMembers } from "../../api/workspaces";
import { useToast } from "../../context/useToast";
import { applyServerFieldErrors } from "../../lib/apiError";
import { priorityTone, statusTone } from "../../lib/badgeTones";
import { hasRole, TASK_WRITE_ROLES } from "../../lib/permissions";
import type { ProjectContext } from "./ProjectLayout";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { EmptyState } from "../../components/ui/EmptyState";
import { Spinner } from "../../components/ui/Spinner";
import { Modal } from "../../components/ui/Modal";
import { TextField } from "../../components/ui/TextField";
import { TextArea } from "../../components/ui/TextArea";
import { Select } from "../../components/ui/Select";
import { ErrorBanner } from "../../components/ui/ErrorBanner";

const TASK_STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "ARCHIVED"];
const TASK_PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

const schema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(5000).optional(),
  priority: z.enum(TASK_PRIORITIES),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

const CreateTaskModal = ({ projectId, onClose }: { projectId: string; onClose: () => void }) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { workspace } = useOutletContext<ProjectContext>();
  const [formError, setFormError] = useState<unknown>(null);
  const { data: members } = useQuery({
    queryKey: ["workspaces", workspace._id, "members"],
    queryFn: () => listWorkspaceMembers(workspace._id),
  });

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { priority: "MEDIUM" } });

  const onSubmit = async (values: FormValues) => {
    setFormError(null);
    try {
      await createTask(projectId, {
        ...values,
        assigneeId: values.assigneeId || null,
        dueDate: values.dueDate || null,
      });
      await queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      showToast("Task created");
      onClose();
    } catch (error) {
      applyServerFieldErrors(error, setError);
      setFormError(error);
    }
  };

  return (
    <Modal title="Create task" onClose={onClose}>
      <form className="flex flex-col gap-4" onSubmit={(e) => void handleSubmit(onSubmit)(e)}>
        <ErrorBanner error={formError} />
        <TextField label="Title" error={errors.title?.message} {...register("title")} />
        <TextArea label="Description" error={errors.description?.message} {...register("description")} />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Priority" error={errors.priority?.message} {...register("priority")}>
            {TASK_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
          <TextField
            label="Due date"
            type="date"
            error={errors.dueDate?.message}
            {...register("dueDate")}
          />
        </div>
        <Select label="Assignee" error={errors.assigneeId?.message} {...register("assigneeId")}>
          <option value="">Unassigned</option>
          {members?.map((m) => (
            <option key={m.userId._id} value={m.userId._id}>
              {m.userId.name}
            </option>
          ))}
        </Select>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Create
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export const TasksListPage = () => {
  const { project, workspace, role } = useOutletContext<ProjectContext>();
  const [showCreate, setShowCreate] = useState(false);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "">("");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "">("");

  const { data: members } = useQuery({
    queryKey: ["workspaces", workspace._id, "members"],
    queryFn: () => listWorkspaceMembers(workspace._id),
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["tasks", project._id, page, statusFilter, priorityFilter],
    queryFn: () =>
      listTasks(project._id, {
        page,
        limit: 20,
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(priorityFilter ? { priority: priorityFilter } : {}),
      }),
  });

  const canCreate = hasRole(role, TASK_WRITE_ROLES) && project.status !== "ARCHIVED";
  const assigneeName = (id: string | null) => members?.find((m) => m.userId._id === id)?.userId.name;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-gray-900">Tasks</h3>
        {canCreate && <Button onClick={() => setShowCreate(true)}>New task</Button>}
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          className="rounded-md border border-gray-300 px-2 py-1 text-xs"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as TaskStatus | "");
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          {TASK_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          className="rounded-md border border-gray-300 px-2 py-1 text-xs"
          value={priorityFilter}
          onChange={(e) => {
            setPriorityFilter(e.target.value as TaskPriority | "");
            setPage(1);
          }}
        >
          <option value="">All priorities</option>
          {TASK_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <Spinner />}
      <ErrorBanner error={error} />

      {data && data.items.length === 0 && (
        <EmptyState
          title="No tasks"
          description={canCreate ? "Create one to get moving." : "Nothing matches these filters."}
        />
      )}

      {data && data.items.length > 0 && (
        <>
          <ul className="flex flex-col gap-2">
            {data.items.map((task) => (
              <li key={task._id}>
                <Link
                  to={`/organizations/${task.organizationId}/workspaces/${workspace._id}/projects/${project._id}/tasks/${task._id}`}
                >
                  <Card className="flex items-center justify-between hover:border-gray-300">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{task.title}</p>
                      <p className="text-xs text-gray-500">
                        {assigneeName(task.assigneeId) ?? "Unassigned"}
                        {task.dueDate && ` · Due ${new Date(task.dueDate).toLocaleDateString()}`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge tone={priorityTone(task.priority)}>{task.priority}</Badge>
                      <Badge tone={statusTone(task.status)}>{task.status}</Badge>
                    </div>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
          {data.meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 text-sm">
              <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="text-gray-500">
                Page {data.meta.page} of {data.meta.totalPages}
              </span>
              <Button
                variant="secondary"
                disabled={page >= data.meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {showCreate && <CreateTaskModal projectId={project._id} onClose={() => setShowCreate(false)} />}
    </div>
  );
};
