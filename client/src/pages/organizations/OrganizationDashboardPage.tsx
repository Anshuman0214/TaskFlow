import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getDashboardSummary, getProductivity } from "../../api/dashboard";
import type { OrganizationContext } from "./OrganizationLayout";
import { Card } from "../../components/ui/Card";
import { Spinner } from "../../components/ui/Spinner";
import { ErrorBanner } from "../../components/ui/ErrorBanner";
import { MiniColumns, StatRow, StatTile } from "../../components/dashboard/Stats";

// Both endpoints are personal (scoped to the signed-in user inside this org),
// which is why there is no role gating here — every member sees their own.
export const OrganizationDashboardPage = () => {
  const { organization } = useOutletContext<OrganizationContext>();

  const summaryQuery = useQuery({
    queryKey: ["dashboard", "summary", organization._id],
    queryFn: () => getDashboardSummary(organization._id),
  });

  const productivityQuery = useQuery({
    queryKey: ["dashboard", "productivity", organization._id],
    queryFn: () => getProductivity(organization._id),
  });

  if (summaryQuery.isLoading) return <Spinner />;
  if (summaryQuery.error) return <ErrorBanner error={summaryQuery.error} />;

  const summary = summaryQuery.data;
  const productivity = productivityQuery.data;

  return (
    <div className="flex flex-col gap-6">
      {summary && (
        <StatRow>
          <StatTile label="Assigned to me" value={summary.assignedTasks} />
          <StatTile label="Pending" value={summary.pendingTasks} />
          <StatTile label="Due today" value={summary.dueToday} tone="warning" />
          <StatTile label="Overdue" value={summary.overdueTasks} tone="critical" />
          <StatTile label="Completed" value={summary.completedTasks} />
        </StatRow>
      )}

      <Card>
        <p className="mb-3 text-sm font-medium text-gray-900">My productivity</p>

        {productivityQuery.error && <ErrorBanner error={productivityQuery.error} />}
        {productivityQuery.isLoading && <Spinner />}

        {productivity && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500">Completed all time</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {productivity.completedTasks}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Completed this week</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {productivity.completedThisWeek}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Avg. time to done</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {productivity.averageCompletionHours === null
                    ? "—"
                    : `${productivity.averageCompletionHours}h`}
                </p>
              </div>
            </div>

            <MiniColumns
              title="Tasks completed per week"
              points={productivity.weeklyStatistics.map((week) => ({
                label: week.weekStart.replace(/^\d{4}-/, ""),
                value: week.completed,
              }))}
            />
          </div>
        )}
      </Card>
    </div>
  );
};
