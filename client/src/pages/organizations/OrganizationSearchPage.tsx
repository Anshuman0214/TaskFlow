import { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { globalSearch, type SearchType } from "../../api/search";
import type { OrganizationContext } from "./OrganizationLayout";
import { priorityTone, statusTone } from "../../lib/badgeTones";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorBanner } from "../../components/ui/ErrorBanner";
import { Spinner } from "../../components/ui/Spinner";

const TYPE_TABS: { value: SearchType | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "task", label: "Tasks" },
  { value: "project", label: "Projects" },
  { value: "workspace", label: "Workspaces" },
  { value: "user", label: "People" },
];

export const OrganizationSearchPage = () => {
  const { organization } = useOutletContext<OrganizationContext>();
  const [draft, setDraft] = useState("");
  // Submitted separately from the input so every keystroke isn't a request —
  // the backend requires a non-empty q, and a partial word is rarely a hit.
  const [query, setQuery] = useState("");
  const [type, setType] = useState<SearchType | "all">("all");

  const { data, isLoading, error } = useQuery({
    queryKey: ["search", organization._id, query, type],
    queryFn: () => globalSearch(organization._id, query, type === "all" ? undefined : type),
    enabled: query.length > 0,
  });

  const workspaceHref = (workspaceId: string) =>
    `/organizations/${organization._id}/workspaces/${workspaceId}`;

  return (
    <div className="flex flex-col gap-4">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(draft.trim());
        }}
      >
        <input
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
          placeholder="Search tasks, projects, workspaces and people…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <Button type="submit" disabled={draft.trim().length === 0}>
          Search
        </Button>
      </form>

      <div className="flex flex-wrap gap-1">
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.value}
            className={`rounded-full px-3 py-1 text-sm ${
              type === tab.value
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
            onClick={() => setType(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && <ErrorBanner error={error} />}
      {isLoading && query && <Spinner />}

      {!query && (
        <EmptyState
          title="Search this organization"
          description="Results are always limited to what you can already see."
        />
      )}

      {data?.tasks && (
        <Card>
          <p className="mb-2 text-xs font-medium text-gray-500">Tasks ({data.tasks.total})</p>
          {data.tasks.items.length === 0 ? (
            <p className="text-sm text-gray-500">No matching tasks.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {data.tasks.items.map((task) => (
                <li key={task._id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate text-gray-900">{task.title}</span>
                  <span className="flex shrink-0 gap-2">
                    <Badge tone={priorityTone(task.priority)}>{task.priority}</Badge>
                    <Badge tone={statusTone(task.status)}>{task.status}</Badge>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {data?.projects && (
        <Card>
          <p className="mb-2 text-xs font-medium text-gray-500">Projects ({data.projects.total})</p>
          {data.projects.items.length === 0 ? (
            <p className="text-sm text-gray-500">No matching projects.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {data.projects.items.map((project) => (
                <li key={project._id} className="flex items-center justify-between gap-3 text-sm">
                  <Link
                    to={`${workspaceHref(project.workspaceId)}/projects/${project._id}`}
                    className="min-w-0 truncate text-gray-900 hover:underline"
                  >
                    <span className="mr-2 font-mono text-xs text-gray-400">{project.key}</span>
                    {project.name}
                  </Link>
                  <Badge tone={statusTone(project.status)}>{project.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {data?.workspaces && (
        <Card>
          <p className="mb-2 text-xs font-medium text-gray-500">
            Workspaces ({data.workspaces.total})
          </p>
          {data.workspaces.items.length === 0 ? (
            <p className="text-sm text-gray-500">No matching workspaces.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {data.workspaces.items.map((workspace) => (
                <li key={workspace._id} className="flex items-center justify-between gap-3 text-sm">
                  <Link
                    to={workspaceHref(workspace._id)}
                    className="min-w-0 truncate text-gray-900 hover:underline"
                  >
                    {workspace.name}
                  </Link>
                  <Badge tone={statusTone(workspace.status)}>{workspace.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {data?.users && (
        <Card>
          <p className="mb-2 text-xs font-medium text-gray-500">People ({data.users.total})</p>
          {data.users.items.length === 0 ? (
            <p className="text-sm text-gray-500">No matching people.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {data.users.items.map((user) => (
                <li key={user._id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate text-gray-900">{user.name}</span>
                  <span className="shrink-0 text-xs text-gray-500">{user.email}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
};
