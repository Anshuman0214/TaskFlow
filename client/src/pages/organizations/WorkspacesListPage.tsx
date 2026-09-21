import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useOutletContext } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createWorkspace, listWorkspaces } from "../../api/workspaces";
import { useToast } from "../../context/useToast";
import { applyServerFieldErrors } from "../../lib/apiError";
import { statusTone } from "../../lib/badgeTones";
import { hasRole, MANAGE_ROLES } from "../../lib/permissions";
import type { OrganizationContext } from "./OrganizationLayout";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { EmptyState } from "../../components/ui/EmptyState";
import { Spinner } from "../../components/ui/Spinner";
import { Modal } from "../../components/ui/Modal";
import { TextField } from "../../components/ui/TextField";
import { TextArea } from "../../components/ui/TextArea";
import { ErrorBanner } from "../../components/ui/ErrorBanner";

const schema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  description: z.string().trim().max(500).optional(),
});
type FormValues = z.infer<typeof schema>;

const CreateWorkspaceModal = ({ organizationId, onClose }: { organizationId: string; onClose: () => void }) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [formError, setFormError] = useState<unknown>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setFormError(null);
    try {
      await createWorkspace({ organizationId, ...values });
      await queryClient.invalidateQueries({ queryKey: ["workspaces", organizationId] });
      showToast("Workspace created");
      onClose();
    } catch (error) {
      applyServerFieldErrors(error, setError);
      setFormError(error);
    }
  };

  return (
    <Modal title="Create workspace" onClose={onClose}>
      <form className="flex flex-col gap-4" onSubmit={(e) => void handleSubmit(onSubmit)(e)}>
        <ErrorBanner error={formError} />
        <TextField label="Name" error={errors.name?.message} {...register("name")} />
        <TextArea label="Description" error={errors.description?.message} {...register("description")} />
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

export const WorkspacesListPage = () => {
  const { organization, role } = useOutletContext<OrganizationContext>();
  const [showCreate, setShowCreate] = useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: ["workspaces", organization._id],
    queryFn: () => listWorkspaces(organization._id),
  });

  const canCreate = hasRole(role, MANAGE_ROLES);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Workspaces</h2>
        {canCreate && <Button onClick={() => setShowCreate(true)}>New workspace</Button>}
      </div>

      {isLoading && <Spinner />}
      <ErrorBanner error={error} />

      {data && data.length === 0 && (
        <EmptyState
          title="No workspaces yet"
          description={canCreate ? "Create one to organize projects." : "Ask an admin to create one."}
          action={canCreate ? <Button onClick={() => setShowCreate(true)}>New workspace</Button> : undefined}
        />
      )}

      {data && data.length > 0 && (
        <ul className="flex flex-col gap-2">
          {data.map((workspace) => (
            <li key={workspace._id}>
              <Link to={`/organizations/${organization._id}/workspaces/${workspace._id}`}>
                <Card className="flex items-center justify-between hover:border-gray-300">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{workspace.name}</p>
                    {workspace.description && (
                      <p className="text-xs text-gray-500">{workspace.description}</p>
                    )}
                  </div>
                  <Badge tone={statusTone(workspace.status)}>{workspace.status}</Badge>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {showCreate && (
        <CreateWorkspaceModal organizationId={organization._id} onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
};
