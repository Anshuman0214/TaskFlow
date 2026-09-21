import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listOrganizationMembers } from "../../api/organizations";
import { addWorkspaceMember, listWorkspaceMembers, removeWorkspaceMember } from "../../api/workspaces";
import { useToast } from "../../context/useToast";
import { getErrorMessage } from "../../lib/apiError";
import { hasRole, MANAGE_ROLES } from "../../lib/permissions";
import type { WorkspaceContext } from "./WorkspaceLayout";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Select } from "../../components/ui/Select";
import { Spinner } from "../../components/ui/Spinner";
import { ErrorBanner } from "../../components/ui/ErrorBanner";
import { ConfirmModal } from "../../components/ui/ConfirmModal";

export const WorkspaceMembersPage = () => {
  const { organization, workspace, role } = useOutletContext<WorkspaceContext>();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState("");
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null);

  const canManage = hasRole(role, MANAGE_ROLES);
  const membersKey = ["workspaces", workspace._id, "members"];

  const { data: members, isLoading, error } = useQuery({
    queryKey: membersKey,
    queryFn: () => listWorkspaceMembers(workspace._id),
  });

  const { data: orgMembers } = useQuery({
    queryKey: ["organizations", organization._id, "members"],
    queryFn: () => listOrganizationMembers(organization._id),
    enabled: canManage,
  });

  const addableMembers = (orgMembers ?? []).filter(
    (om) => !members?.some((wm) => wm.userId._id === om.userId._id),
  );

  const addMutation = useMutation({
    mutationFn: (userId: string) => addWorkspaceMember(workspace._id, userId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: membersKey });
      showToast("Member added");
      setSelectedUserId("");
    },
    onError: (err) => showToast(getErrorMessage(err), "error"),
  });

  const removeMutation = useMutation({
    mutationFn: (memberId: string) => removeWorkspaceMember(workspace._id, memberId),
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
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Add a member</h2>
          <p className="mb-2 text-xs text-gray-500">
            Only members already in the organization can be added to this workspace.
          </p>
          <div className="flex items-end gap-3">
            <div className="min-w-[220px] flex-1">
              <Select
                label="Organization member"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
              >
                <option value="">Select a member…</option>
                {addableMembers.map((om) => (
                  <option key={om.userId._id} value={om.userId._id}>
                    {om.userId.name} ({om.userId.email})
                  </option>
                ))}
              </Select>
            </div>
            <Button
              disabled={!selectedUserId}
              isLoading={addMutation.isPending}
              onClick={() => addMutation.mutate(selectedUserId)}
            >
              Add
            </Button>
          </div>
        </Card>
      )}

      {isLoading && <Spinner />}
      <ErrorBanner error={error} />

      {members && (
        <ul className="flex flex-col gap-2">
          {members.map((member) => (
            <li key={member._id}>
              <Card className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{member.userId.name}</p>
                  <p className="text-xs text-gray-500">{member.userId.email}</p>
                </div>
                {canManage && (
                  <Button
                    variant="ghost"
                    onClick={() => setRemoveTarget({ id: member._id, name: member.userId.name })}
                  >
                    Remove
                  </Button>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}

      {removeTarget && (
        <ConfirmModal
          title="Remove member"
          description={`Remove ${removeTarget.name} from ${workspace.name}?`}
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
