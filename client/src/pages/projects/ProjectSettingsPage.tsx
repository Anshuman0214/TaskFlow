import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteProject, updateProject, type ProjectStatus } from "../../api/projects";
import { useToast } from "../../context/useToast";
import { applyServerFieldErrors } from "../../lib/apiError";
import { ADMIN_ROLES, hasRole } from "../../lib/permissions";
import type { ProjectContext } from "./ProjectLayout";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { TextField } from "../../components/ui/TextField";
import { TextArea } from "../../components/ui/TextArea";
import { Select } from "../../components/ui/Select";
import { ErrorBanner } from "../../components/ui/ErrorBanner";
import { ConfirmModal } from "../../components/ui/ConfirmModal";

const PROJECT_STATUSES: ProjectStatus[] = ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"];

const schema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  description: z.string().trim().max(500).optional(),
  status: z.enum(PROJECT_STATUSES),
});
type FormValues = z.infer<typeof schema>;

export const ProjectSettingsPage = () => {
  const { organization, workspace, project, role } = useOutletContext<ProjectContext>();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<unknown>(null);
  const [showDelete, setShowDelete] = useState(false);
  const isArchived = project.status === "ARCHIVED";
  const canDelete = hasRole(role, ADMIN_ROLES);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: project.name,
      description: project.description ?? "",
      status: project.status,
    },
  });

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["projects", "detail", project._id] }),
      queryClient.invalidateQueries({ queryKey: ["projects", workspace._id] }),
    ]);

  const onSubmit = async (values: FormValues) => {
    setFormError(null);
    try {
      const { status, ...rest } = values;
      // Status changes are their own PATCH so a rejected transition (e.g.
      // COMPLETED -> PLANNING, or already-archived) doesn't also block the
      // rest of the field edits from saving.
      if (status !== project.status) {
        await updateProject(organization._id, workspace._id, project._id, { status });
      }
      await updateProject(organization._id, workspace._id, project._id, rest);
      await invalidate();
      showToast("Project updated");
    } catch (error) {
      applyServerFieldErrors(error, setError);
      setFormError(error);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: () => deleteProject(organization._id, workspace._id, project._id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["projects", workspace._id] });
      showToast("Project deleted");
      navigate(`/organizations/${organization._id}/workspaces/${workspace._id}`);
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Project details</h2>
        {isArchived && (
          <p className="mb-3 text-xs text-yellow-700">This project is archived and read-only.</p>
        )}
        <form className="flex flex-col gap-4" onSubmit={(e) => void handleSubmit(onSubmit)(e)}>
          <ErrorBanner error={formError} />
          <TextField label="Name" disabled={isArchived} error={errors.name?.message} {...register("name")} />
          <TextArea
            label="Description"
            disabled={isArchived}
            error={errors.description?.message}
            {...register("description")}
          />
          <Select label="Status" disabled={isArchived} error={errors.status?.message} {...register("status")}>
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          {!isArchived && (
            <div>
              <Button type="submit" isLoading={isSubmitting}>
                Save changes
              </Button>
            </div>
          )}
        </form>
      </Card>

      {canDelete && (
        <Card className="border-red-200">
          <h2 className="mb-1 text-sm font-semibold text-red-700">Danger zone</h2>
          <p className="mb-3 text-sm text-gray-500">Deleting a project soft-deletes it and its tasks.</p>
          <Button variant="danger" onClick={() => setShowDelete(true)}>
            Delete project
          </Button>
        </Card>
      )}

      {showDelete && (
        <ConfirmModal
          title="Delete project"
          description={`Delete "${project.name}"? This cannot be undone.`}
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
