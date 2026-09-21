import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createOrganization,
  declineInvitation,
  listOrganizations,
  listPendingInvitations,
} from "../../api/organizations";
import { useToast } from "../../context/useToast";
import { applyServerFieldErrors, getErrorMessage } from "../../lib/apiError";
import { roleTone } from "../../lib/badgeTones";
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

const CreateOrganizationModal = ({ onClose }: { onClose: () => void }) => {
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
      await createOrganization(values);
      await queryClient.invalidateQueries({ queryKey: ["organizations"] });
      showToast("Organization created");
      onClose();
    } catch (error) {
      applyServerFieldErrors(error, setError);
      setFormError(error);
    }
  };

  return (
    <Modal title="Create organization" onClose={onClose}>
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

const PendingInvitations = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { data } = useQuery({ queryKey: ["invitations", "pending"], queryFn: listPendingInvitations });

  const decline = useMutation({
    mutationFn: declineInvitation,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["invitations", "pending"] });
      showToast("Invitation declined");
    },
    onError: (error) => showToast(getErrorMessage(error), "error"),
  });

  if (!data || data.length === 0) return null;

  return (
    <Card>
      <h2 className="mb-1 text-sm font-semibold text-gray-900">Pending invitations</h2>
      <p className="mb-3 text-xs text-gray-500">
        Accept using the link from your invitation email (the token can't be recovered from this list —
        only its hash is stored). You can decline from here.
      </p>
      <ul className="flex flex-col gap-2">
        {data.map((invitation) => (
          <li key={invitation._id} className="flex items-center justify-between text-sm">
            <span>
              <strong>{invitation.organizationId.name}</strong> · {invitation.role}
            </span>
            <Button
              variant="ghost"
              onClick={() => decline.mutate(invitation._id)}
              isLoading={decline.isPending && decline.variables === invitation._id}
            >
              Decline
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
};

export const OrganizationsListPage = () => {
  const [showCreate, setShowCreate] = useState(false);
  const { data, isLoading, error } = useQuery({ queryKey: ["organizations"], queryFn: listOrganizations });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Organizations</h1>
        <Button onClick={() => setShowCreate(true)}>New organization</Button>
      </div>

      <PendingInvitations />

      {isLoading && <Spinner />}
      <ErrorBanner error={error} />

      {data && data.length === 0 && (
        <EmptyState
          title="No organizations yet"
          description="Create one to get started."
          action={<Button onClick={() => setShowCreate(true)}>New organization</Button>}
        />
      )}

      {data && data.length > 0 && (
        <ul className="flex flex-col gap-2">
          {data.map(({ organization, role }) => (
            <li key={organization._id}>
              <Link to={`/organizations/${organization._id}`}>
                <Card className="flex items-center justify-between hover:border-gray-300">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{organization.name}</p>
                    {organization.description && (
                      <p className="text-xs text-gray-500">{organization.description}</p>
                    )}
                  </div>
                  <Badge tone={roleTone(role)}>{role}</Badge>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {showCreate && <CreateOrganizationModal onClose={() => setShowCreate(false)} />}
    </div>
  );
};
