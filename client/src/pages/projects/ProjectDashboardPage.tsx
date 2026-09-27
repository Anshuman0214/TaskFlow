import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getProjectDashboard } from "../../api/dashboard";
import type { ProjectContext } from "./ProjectLayout";
import { Card } from "../../components/ui/Card";
import { Spinner } from "../../components/ui/Spinner";
import { ErrorBanner } from "../../components/ui/ErrorBanner";
import { BarList, Meter, StatRow, StatTile } from "../../components/dashboard/Stats";

// Fixed order so a status/priority with zero tasks still shows a row — the
// absence is information, and a shifting row order would be unreadable.
const STATUS_ORDER = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "ARCHIVED"];
const PRIORITY_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

const toRows = (order: string[], counts: Record<string, number>) =>
  order.map((key) => ({ label: key.replace(/_/g, " "), value: counts[key] ?? 0 }));

export const ProjectDashboardPage = () => {
  const { project } = useOutletContext<ProjectContext>();

  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard", "project", project._id],
    queryFn: () => getProjectDashboard(project._id),
  });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorBanner error={error} />;
  if (!data) return null;

  return (
    <div className="flex flex-col gap-6">
      <StatRow>
        <StatTile label="Total tasks" value={data.totalTasks} />
        <StatTile label="Completed" value={data.completedTasks} />
        <StatTile label="Progress" value={`${data.progressPercentage}%`} />
        <StatTile label="Overdue" value={data.overdueTasks} tone="critical" />
      </StatRow>

      <Card>
        <Meter
          label="Completion"
          percentage={data.progressPercentage}
          caption={`${data.completedTasks} of ${data.totalTasks} tasks done`}
        />
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <BarList title="By status" rows={toRows(STATUS_ORDER, data.byStatus)} />
        </Card>
        <Card>
          <BarList title="By priority" rows={toRows(PRIORITY_ORDER, data.byPriority)} />
        </Card>
      </div>
    </div>
  );
};
