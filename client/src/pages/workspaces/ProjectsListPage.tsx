import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useOutletContext } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createProject, listProjects } from "../../api/projects";
import { useToast } from "../../context/useToast";
import { applyServerFieldErrors } from "../../lib/apiError";
import { statusTone } from "../../lib/badgeTones";
import { hasRole, MANAGE_ROLES } from "../../lib/permissions";
import type { WorkspaceContext } from "./WorkspaceLayout";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { EmptyState } from "../../components/ui/EmptyState";
import { Spinner } from "../../components/ui/Spinner";
import { Modal } from "../../components/ui/Modal";
import { TextField } from "../../components/ui/TextField";
import { TextArea } from "../../components/ui/TextArea";
import { ErrorBanner } from "../../components/ui/ErrorBanner";

const schema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
    key: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9]{2,10}$/, "Key must be 2-10 uppercase letters/numbers"),
    description: z.string().trim().max(500).optional(),
  });
type FormValues = z.infer<typeof schema>;

const CreateProjectModal = ({
  organizationId,
  workspaceId,
  onClose,
}: {
  organizationId: string;
  workspaceId: string;
  onClose: () => void;
}) => {
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
      await createProject(organizationId, workspaceId, values);
      await queryClient.invalidateQueries({ queryKey: ["projects", workspaceId] });
      showToast("Project created");
      onClose();
    } catch (error) {
      applyServerFieldErrors(error, setError);
      setFormError(error);
    }
  };

  return (
    <Modal title="Create project" onClose={onClose}>
      <form className="flex flex-col gap-4" onSubmit={(e) => void handleSubmit(onSubmit)(e)}>
        <ErrorBanner error={formError} />
        <TextField label="Name" error={errors.name?.message} {...register("name")} />
        <TextField label="Key" placeholder="AUTH" error={errors.key?.message} {...register("key")} />
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

export const ProjectsListPage = () => {
  const { organization, workspace, role } = useOutletContext<WorkspaceContext>();
  const [showCreate, setShowCreate] = useState(false);
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ["projects", workspace._id, page],
    queryFn: () => listProjects(organization._id, workspace._id, { page, limit: 20 }),
  });

  const canCreate = hasRole(role, MANAGE_ROLES) && workspace.status === "ACTIVE";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Projects</h3>
        {canCreate && <Button onClick={() => setShowCreate(true)}>New project</Button>}
      </div>

      {isLoading && <Spinner />}
      <ErrorBanner error={error} />

      {data && data.items.length === 0 && (
        <EmptyState
          title="No projects yet"
          description={canCreate ? "Create one to start tracking work." : "Nothing here yet."}
          action={canCreate ? <Button onClick={() => setShowCreate(true)}>New project</Button> : undefined}
        />
      )}

      {data && data.items.length > 0 && (
        <>
          <ul className="flex flex-col gap-2">
            {data.items.map((project) => (
              <li key={project._id}>
                <Link
                  to={`/organizations/${organization._id}/workspaces/${workspace._id}/projects/${project._id}`}
                >
                  <Card className="flex items-center justify-between hover:border-gray-300">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        <span className="mr-2 font-mono text-xs text-gray-400">{project.key}</span>
                        {project.name}
                      </p>
                      {project.description && (
                        <p className="text-xs text-gray-500">{project.description}</p>
                      )}
                    </div>
                    <Badge tone={statusTone(project.status)}>{project.status}</Badge>
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

      {showCreate && (
        <CreateProjectModal
          organizationId={organization._id}
          workspaceId={workspace._id}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
};
