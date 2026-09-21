import { Outlet, useOutletContext, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getWorkspace, type Workspace } from "../../api/workspaces";
import type { OrganizationContext } from "../organizations/OrganizationLayout";
import { ADMIN_ROLES, hasRole } from "../../lib/permissions";
import { statusTone } from "../../lib/badgeTones";
import { TabNav } from "../../components/layout/TabNav";
import { Badge } from "../../components/ui/Badge";
import { Spinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorBanner } from "../../components/ui/ErrorBanner";

export interface WorkspaceContext extends OrganizationContext {
  workspace: Workspace;
}

export const WorkspaceLayout = () => {
  const parent = useOutletContext<OrganizationContext>();
  const { workspaceId } = useParams<{ workspaceId: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ["workspaces", "detail", workspaceId],
    queryFn: () => getWorkspace(workspaceId!),
  });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorBanner error={error} />;
  if (!data) return <EmptyState title="Workspace not found" />;

  const context: WorkspaceContext = { ...parent, workspace: data };
  const base = `/organizations/${parent.organization._id}/workspaces/${data._id}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold text-gray-900">{data.name}</h2>
        <Badge tone={statusTone(data.status)}>{data.status}</Badge>
      </div>
      <TabNav
        tabs={[
          { to: base, label: "Projects", end: true },
          { to: `${base}/members`, label: "Members" },
          ...(hasRole(parent.role, ADMIN_ROLES) ? [{ to: `${base}/settings`, label: "Settings" }] : []),
        ]}
      />
      <Outlet context={context} />
    </div>
  );
};
