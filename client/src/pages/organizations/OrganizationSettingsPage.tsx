import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteOrganization, updateOrganization } from "../../api/organizations";
import { useToast } from "../../context/useToast";
import { applyServerFieldErrors } from "../../lib/apiError";
import type { OrganizationContext } from "./OrganizationLayout";
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

export const OrganizationSettingsPage = () => {
  const { organization, role } = useOutletContext<OrganizationContext>();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<unknown>(null);
  const [showDelete, setShowDelete] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: organization.name, description: organization.description ?? "" },
  });

  const onSubmit = async (values: FormValues) => {
    setFormError(null);
    try {
      await updateOrganization(organization._id, values);
      await queryClient.invalidateQueries({ queryKey: ["organizations"] });
      showToast("Organization updated");
    } catch (error) {
      applyServerFieldErrors(error, setError);
      setFormError(error);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: () => deleteOrganization(organization._id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["organizations"] });
      showToast("Organization deleted");
      navigate("/organizations");
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Organization details</h2>
        <form className="flex flex-col gap-4" onSubmit={(e) => void handleSubmit(onSubmit)(e)}>
          <ErrorBanner error={formError} />
          <TextField label="Name" error={errors.name?.message} {...register("name")} />
          <TextArea label="Description" error={errors.description?.message} {...register("description")} />
          <div>
            <Button type="submit" isLoading={isSubmitting}>
              Save changes
            </Button>
          </div>
        </form>
      </Card>

      {role === "OWNER" && (
        <Card className="border-red-200">
          <h2 className="mb-1 text-sm font-semibold text-red-700">Danger zone</h2>
          <p className="mb-3 text-sm text-gray-500">
            Deleting an organization soft-deletes it and everything inside it becomes inaccessible.
          </p>
          <Button variant="danger" onClick={() => setShowDelete(true)}>
            Delete organization
          </Button>
        </Card>
      )}

      {showDelete && (
        <ConfirmModal
          title="Delete organization"
          description={`Delete "${organization.name}"? This cannot be undone.`}
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
