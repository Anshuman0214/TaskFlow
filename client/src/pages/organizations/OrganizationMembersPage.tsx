import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useOutletContext } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  inviteOrganizationMember,
  listOrganizationMembers,
  removeOrganizationMember,
  updateOrganizationMemberRole,
  type AssignableOrganizationRole,
} from "../../api/organizations";
import { useToast } from "../../context/useToast";
import { applyServerFieldErrors, getErrorMessage } from "../../lib/apiError";
import { roleTone } from "../../lib/badgeTones";
import { ADMIN_ROLES, hasRole } from "../../lib/permissions";
import type { OrganizationContext } from "./OrganizationLayout";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Spinner } from "../../components/ui/Spinner";
import { TextField } from "../../components/ui/TextField";
import { Select } from "../../components/ui/Select";
import { ErrorBanner } from "../../components/ui/ErrorBanner";
import { ConfirmModal } from "../../components/ui/ConfirmModal";

const ASSIGNABLE_ROLES: AssignableOrganizationRole[] = ["ADMIN", "MANAGER", "MEMBER", "GUEST"];

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Please provide a valid email address")),
  role: z.enum(ASSIGNABLE_ROLES),
});
type InviteFormValues = z.infer<typeof inviteSchema>;

export const OrganizationMembersPage = () => {
  const { organization, role } = useOutletContext<OrganizationContext>();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null);
  const [inviteError, setInviteError] = useState<unknown>(null);

  const canManage = hasRole(role, ADMIN_ROLES);
  const membersKey = ["organizations", organization._id, "members"];

  const { data, isLoading, error } = useQuery({
    queryKey: membersKey,
    queryFn: () => listOrganizationMembers(organization._id),
  });

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteFormValues>({ resolver: zodResolver(inviteSchema), defaultValues: { role: "MEMBER" } });

  const onInvite = async (values: InviteFormValues) => {
    setInviteError(null);
    try {
      await inviteOrganizationMember(organization._id, values);
      showToast(`Invitation sent to ${values.email}`);
      reset({ email: "", role: "MEMBER" });
    } catch (err) {
      applyServerFieldErrors(err, setError);
      setInviteError(err);
    }
  };

  const roleMutation = useMutation({
    mutationFn: ({ memberId, newRole }: { memberId: string; newRole: AssignableOrganizationRole }) =>
      updateOrganizationMemberRole(organization._id, memberId, newRole),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: membersKey });
      showToast("Role updated");
    },
    onError: (err) => showToast(getErrorMessage(err), "error"),
  });

  const removeMutation = useMutation({
    mutationFn: (memberId: string) => removeOrganizationMember(organization._id, memberId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: membersKey });
      showToast("Member removed");
      setRemoveTarget(null);
    },
  });

  return (
    <div className="flex flex-col gap-6">
      {canManage && (
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Invite a member</h2>
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => void handleSubmit(onInvite)(e)}
          >
            <div className="min-w-[200px] flex-1">
              <TextField label="Email" type="email" error={errors.email?.message} {...register("email")} />
            </div>
            <Select label="Role" error={errors.role?.message} {...register("role")}>
              {ASSIGNABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
            <Button type="submit" isLoading={isSubmitting}>
              Invite
            </Button>
          </form>
          <div className="mt-2">
            <ErrorBanner error={inviteError} />
          </div>
        </Card>
      )}

      {isLoading && <Spinner />}
      <ErrorBanner error={error} />

      {data && (
        <ul className="flex flex-col gap-2">
          {data.map((member) => (
            <li key={member._id}>
              <Card className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{member.userId.name}</p>
                  <p className="text-xs text-gray-500">{member.userId.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {canManage && member.role !== "OWNER" ? (
                    <select
                      className="rounded-md border border-gray-300 px-2 py-1 text-xs"
                      value={member.role}
                      onChange={(e) =>
                        roleMutation.mutate({
                          memberId: member._id,
                          newRole: e.target.value as AssignableOrganizationRole,
                        })
                      }
                    >
                      {ASSIGNABLE_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Badge tone={roleTone(member.role)}>{member.role}</Badge>
                  )}
                  {canManage && member.role !== "OWNER" && (
                    <Button
                      variant="ghost"
                      onClick={() => setRemoveTarget({ id: member._id, name: member.userId.name })}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {removeTarget && (
        <ConfirmModal
          title="Remove member"
          description={`Remove ${removeTarget.name} from ${organization.name}?`}
          confirmLabel="Remove"
          isLoading={removeMutation.isPending}
          error={removeMutation.error}
          onConfirm={() => removeMutation.mutate(removeTarget.id)}
          onClose={() => setRemoveTarget(null)}
        />
      )}
    </div>
  );
};
