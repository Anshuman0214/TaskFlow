import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { archiveWorkspace, deleteWorkspace, updateWorkspace } from "../../api/workspaces";
import { useToast } from "../../context/useToast";
import { applyServerFieldErrors } from "../../lib/apiError";
import { ADMIN_ROLES, hasRole, MANAGE_ROLES } from "../../lib/permissions";
import type { WorkspaceContext } from "./WorkspaceLayout";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { TextField } from "../../components/ui/TextField";
import { TextArea } from "../../components/ui/TextArea";
import { ErrorBanner } from "../../components/ui/ErrorBanner";
import { ConfirmModal } from "../../components/ui/ConfirmModal";

const schema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  description: z.string().trim().max(500).optional(),
});
type FormValues = z.infer<typeof schema>;

export const WorkspaceSettingsPage = () => {
  const { organization, workspace, role } = useOutletContext<WorkspaceContext>();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<unknown>(null);
  const [showArchive, setShowArchive] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const canEdit = hasRole(role, MANAGE_ROLES);
  const canDestroy = hasRole(role, ADMIN_ROLES);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: workspace.name, description: workspace.description ?? "" },
  });

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["workspaces", "detail", workspace._id] }),
      queryClient.invalidateQueries({ queryKey: ["workspaces", organization._id] }),
    ]);

  const onSubmit = async (values: FormValues) => {
    setFormError(null);
    try {
      await updateWorkspace(workspace._id, values);
      await invalidate();
      showToast("Workspace updated");
    } catch (error) {
      applyServerFieldErrors(error, setError);
      setFormError(error);
    }
  };

  const archiveMutation = useMutation({
    mutationFn: () => archiveWorkspace(workspace._id),
    onSuccess: async () => {
      await invalidate();
      showToast("Workspace archived");
      setShowArchive(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteWorkspace(workspace._id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["workspaces", organization._id] });
      showToast("Workspace deleted");
      navigate(`/organizations/${organization._id}`);
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Workspace details</h2>
        {workspace.status === "ARCHIVED" && (
          <p className="mb-3 text-xs text-yellow-700">
            This workspace is archived and read-only. Editing is disabled.
          </p>
        )}
        <form className="flex flex-col gap-4" onSubmit={(e) => void handleSubmit(onSubmit)(e)}>
          <ErrorBanner error={formError} />
          <TextField
            label="Name"
            disabled={workspace.status === "ARCHIVED"}
            error={errors.name?.message}
            {...register("name")}
          />
          <TextArea
            label="Description"
            disabled={workspace.status === "ARCHIVED"}
            error={errors.description?.message}
            {...register("description")}
          />
          {canEdit && workspace.status === "ACTIVE" && (
            <div>
              <Button type="submit" isLoading={isSubmitting}>
                Save changes
              </Button>
            </div>
          )}
        </form>
      </Card>

      {canDestroy && (
        <Card className="border-red-200">
          <h2 className="mb-1 text-sm font-semibold text-red-700">Danger zone</h2>
          <div className="flex flex-wrap gap-2">
            {workspace.status === "ACTIVE" && (
              <Button variant="secondary" onClick={() => setShowArchive(true)}>
                Archive workspace
              </Button>
            )}
            <Button variant="danger" onClick={() => setShowDelete(true)}>
              Delete workspace
            </Button>
          </div>
        </Card>
      )}

      {showArchive && (
        <ConfirmModal
          title="Archive workspace"
          description={`Archive "${workspace.name}"? It becomes read-only — projects and tasks stay visible but can't be edited.`}
          confirmLabel="Archive"
          variant="primary"
          isLoading={archiveMutation.isPending}
          error={archiveMutation.error}
          onConfirm={() => archiveMutation.mutate()}
          onClose={() => setShowArchive(false)}
        />
      )}

      {showDelete && (
        <ConfirmModal
          title="Delete workspace"
          description={`Delete "${workspace.name}"? This cannot be undone.`}
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
