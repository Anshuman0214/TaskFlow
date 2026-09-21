import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useOutletContext } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createLabel, deleteLabel, listLabels } from "../../api/labels";
import { useToast } from "../../context/useToast";
import { applyServerFieldErrors, getErrorMessage } from "../../lib/apiError";
import { hasRole, MANAGE_ROLES } from "../../lib/permissions";
import type { ProjectContext } from "./ProjectLayout";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { TextField } from "../../components/ui/TextField";
import { Spinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorBanner } from "../../components/ui/ErrorBanner";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(50),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Use a hex color like #3B82F6"),
});
type FormValues = z.infer<typeof schema>;

export const ProjectLabelsPage = () => {
  const { project, role } = useOutletContext<ProjectContext>();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [formError, setFormError] = useState<unknown>(null);
  const canManage = hasRole(role, MANAGE_ROLES);
  const labelsKey = ["labels", project._id];

  const { data, isLoading, error } = useQuery({
    queryKey: labelsKey,
    queryFn: () => listLabels(project._id),
  });

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { color: "#3B82F6" } });

  const onSubmit = async (values: FormValues) => {
    setFormError(null);
    try {
      await createLabel(project._id, values);
      await queryClient.invalidateQueries({ queryKey: labelsKey });
      showToast("Label created");
      reset({ name: "", color: "#3B82F6" });
    } catch (error) {
      applyServerFieldErrors(error, setError);
      setFormError(error);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: (labelId: string) => deleteLabel(project._id, labelId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: labelsKey });
      showToast("Label deleted");
    },
    onError: (err) => showToast(getErrorMessage(err), "error"),
  });

  return (
    <div className="flex flex-col gap-6">
      {canManage && (
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-gray-900">New label</h2>
          <form className="flex items-end gap-3" onSubmit={(e) => void handleSubmit(onSubmit)(e)}>
            <div className="min-w-[160px] flex-1">
              <TextField label="Name" error={errors.name?.message} {...register("name")} />
            </div>
            <TextField
              label="Color"
              type="color"
              className="h-9 w-14 p-1"
              error={errors.color?.message}
              {...register("color")}
            />
            <Button type="submit" isLoading={isSubmitting}>
              Add
            </Button>
          </form>
          <div className="mt-2">
            <ErrorBanner error={formError} />
          </div>
        </Card>
      )}

      {isLoading && <Spinner />}
      <ErrorBanner error={error} />

      {data && data.length === 0 && <EmptyState title="No labels yet" />}

      {data && data.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {data.map((label) => (
            <li key={label._id}>
              <span
                className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm"
                style={{ backgroundColor: `${label.color}20`, color: label.color }}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: label.color }} />
                {label.name}
                {canManage && (
                  <button
                    onClick={() => deleteMutation.mutate(label._id)}
                    aria-label={`Delete ${label.name}`}
                    className="ml-1 text-xs opacity-60 hover:opacity-100"
                  >
                    ✕
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
