import { Outlet, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listOrganizations, type Organization, type OrganizationRole } from "../../api/organizations";
import { ADMIN_ROLES, hasRole } from "../../lib/permissions";
import { TabNav } from "../../components/layout/TabNav";
import { Spinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";

export interface OrganizationContext {
  organization: Organization;
  role: OrganizationRole;
}

export const OrganizationLayout = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const { data, isLoading } = useQuery({ queryKey: ["organizations"], queryFn: listOrganizations });
  const membership = data?.find((entry) => entry.organization._id === orgId);

  if (isLoading) return <Spinner />;

  if (!membership) {
    return <EmptyState title="Organization not found" description="You may not have access to it." />;
  }

  const context: OrganizationContext = { organization: membership.organization, role: membership.role };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{context.organization.name}</h1>
        {context.organization.description && (
          <p className="text-sm text-gray-500">{context.organization.description}</p>
        )}
      </div>
      <TabNav
        tabs={[
          { to: `/organizations/${orgId}`, label: "Workspaces", end: true },
          { to: `/organizations/${orgId}/members`, label: "Members" },
          ...(hasRole(context.role, ADMIN_ROLES)
            ? [{ to: `/organizations/${orgId}/settings`, label: "Settings" }]
            : []),
        ]}
      />
      <Outlet context={context} />
    </div>
  );
};
