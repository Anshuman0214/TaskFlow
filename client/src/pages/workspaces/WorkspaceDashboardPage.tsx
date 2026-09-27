import { Link, useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getWorkspaceDashboard } from "../../api/dashboard";
import type { WorkspaceContext } from "./WorkspaceLayout";
import { Card } from "../../components/ui/Card";
import { Spinner } from "../../components/ui/Spinner";
import { ErrorBanner } from "../../components/ui/ErrorBanner";
import { EmptyState } from "../../components/ui/EmptyState";
import { Meter, StatRow, StatTile } from "../../components/dashboard/Stats";

const describeActivity = (action: string): string =>
  action.replace(/^TASK_/, "").replace(/_/g, " ").toLowerCase();

const actorName = (actorId: unknown): string =>
  typeof actorId === "object" && actorId !== null && "name" in actorId
    ? String((actorId as { name: string }).name)
    : "Someone";

export const WorkspaceDashboardPage = () => {
  const { organization, workspace } = useOutletContext<WorkspaceContext>();

  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard", "workspace", workspace._id],
    queryFn: () => getWorkspaceDashboard(workspace._id),
  });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorBanner error={error} />;
  if (!data) return null;

  const projectBase = `/organizations/${organization._id}/workspaces/${workspace._id}/projects`;

  return (
    <div className="flex flex-col gap-6">
      <StatRow>
        <StatTile label="Projects" value={data.projectProgress.length} />
        <StatTile label="Total tasks" value={data.totalTasks} />
        <StatTile label="Completed" value={data.completedTasks} />
        <StatTile label="Completion rate" value={`${data.completionRate}%`} />
        <StatTile label="Active members" value={data.activeMembers} />
      </StatRow>

      <Card>
        <p className="mb-3 text-sm font-medium text-gray-900">Project progress</p>
        {data.projectProgress.length === 0 ? (
          <EmptyState title="No projects yet" description="Create one to see its progress here." />
        ) : (
          <div className="flex flex-col gap-4">
            {data.projectProgress.map((project) => (
              <Meter
                key={project.projectId}
                label={project.name}
                percentage={project.progressPercentage}
                caption={`${project.completedTasks} of ${project.totalTasks} tasks done · ${project.status}`}
              />
            ))}
          </div>
        )}
      </Card>

      <Card>
        <p className="mb-3 text-sm font-medium text-gray-900">Team activity</p>
        {data.teamActivity.length === 0 ? (
          <p className="text-sm text-gray-500">No activity recorded yet.</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {data.teamActivity.map((activity) => (
              <li
                key={activity._id}
                className="flex items-baseline justify-between gap-3 text-sm"
              >
                <span className="min-w-0 truncate text-gray-700">
                  <span className="font-medium text-gray-900">{actorName(activity.actorId)}</span>{" "}
                  {describeActivity(activity.action)}{" "}
                  <Link
                    to={`${projectBase}`}
                    className="text-gray-500 underline hover:text-gray-700"
                  >
                    a task
                  </Link>
                </span>
                <span className="shrink-0 text-xs text-gray-400">
                  {new Date(activity.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
};
