import { useQuery } from "@tanstack/react-query";
import { getApiInfo, getHealth } from "../api/system";

const StatusBadge = ({ ok }: { ok: boolean }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
      ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
    }`}
  >
    <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-green-500" : "bg-red-500"}`} />
    {ok ? "connected" : "disconnected"}
  </span>
);

export const StatusPage = () => {
  const health = useQuery({ queryKey: ["health"], queryFn: getHealth, refetchInterval: 5000 });
  const info = useQuery({ queryKey: ["info"], queryFn: getApiInfo });

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">TaskFlow</h1>
        <p className="text-sm text-gray-500">Frontend ↔ backend connectivity check</p>
      </div>

      <div className="rounded-lg border border-gray-200 p-4">
        {health.isLoading && <p className="text-sm text-gray-500">Checking API…</p>}

        {health.isError && (
          <p className="text-sm text-red-700">
            Could not reach the API at {import.meta.env.VITE_API_URL}. Is the backend running?
          </p>
        )}

        {health.data && (
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-gray-500">API</dt>
            <dd>
              <StatusBadge ok={health.data.status === "ok"} />
            </dd>

            <dt className="text-gray-500">Database</dt>
            <dd>
              <StatusBadge ok={health.data.services.database === "connected"} />
            </dd>

            <dt className="text-gray-500">Redis</dt>
            <dd>
              <StatusBadge ok={health.data.services.redis === "connected"} />
            </dd>

            <dt className="text-gray-500">Uptime</dt>
            <dd className="text-gray-900">{Math.round(health.data.uptime)}s</dd>

            {info.data && (
              <>
                <dt className="text-gray-500">Version</dt>
                <dd className="text-gray-900">
                  {info.data.name} {info.data.version} ({info.data.environment})
                </dd>
              </>
            )}
          </dl>
        )}
      </div>
    </main>
  );
};
