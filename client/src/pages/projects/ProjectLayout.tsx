import { Outlet, useOutletContext, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getProject, type Project } from "../../api/projects";
import type { WorkspaceContext } from "../workspaces/WorkspaceLayout";
import { hasRole, MANAGE_ROLES } from "../../lib/permissions";
import { statusTone } from "../../lib/badgeTones";
import { TabNav } from "../../components/layout/TabNav";
import { Badge } from "../../components/ui/Badge";
import { Spinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorBanner } from "../../components/ui/ErrorBanner";

export interface ProjectContext extends WorkspaceContext {
  project: Project;
}

export const ProjectLayout = () => {
  const parent = useOutletContext<WorkspaceContext>();
  const { projectId } = useParams<{ projectId: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ["projects", "detail", projectId],
    queryFn: () => getProject(parent.organization._id, parent.workspace._id, projectId!),
  });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorBanner error={error} />;
  if (!data) return <EmptyState title="Project not found" />;

  const context: ProjectContext = { ...parent, project: data };
  const base = `/organizations/${parent.organization._id}/workspaces/${parent.workspace._id}/projects/${data._id}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold text-gray-900">
          <span className="mr-2 font-mono text-sm text-gray-400">{data.key}</span>
          {data.name}
        </h2>
        <Badge tone={statusTone(data.status)}>{data.status}</Badge>
      </div>
      <TabNav
        tabs={[
          { to: base, label: "Tasks", end: true },
          { to: `${base}/labels`, label: "Labels" },
          ...(hasRole(parent.role, MANAGE_ROLES) ? [{ to: `${base}/settings`, label: "Settings" }] : []),
        ]}
      />
      <Outlet context={context} />
    </div>
  );
};
