import { useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { acceptOrganizationInvitation } from "../api/organizations";
import { AuthLayout } from "./auth/AuthLayout";
import { Button } from "../components/ui/Button";
import { ErrorBanner } from "../components/ui/ErrorBanner";
import { Spinner } from "../components/ui/Spinner";

export const AcceptInvitationPage = () => {
  const { isLoading, isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [state, setState] = useState<"idle" | "accepting" | "done">("idle");
  const [error, setError] = useState<unknown>(null);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: `/invitations/accept?token=${token}` }} replace />;
  }

  const accept = async () => {
    setState("accepting");
    setError(null);
    try {
      await acceptOrganizationInvitation(token);
      setState("done");
    } catch (err) {
      setError(err);
      setState("idle");
    }
  };

  if (!token) {
    return (
      <AuthLayout title="Invitation" subtitle="Invitation">
        <p className="text-sm text-gray-600">No invitation token was provided.</p>
      </AuthLayout>
    );
  }

  if (state === "done") {
    return (
      <AuthLayout title="Invitation accepted" subtitle="Invitation accepted">
        <p className="text-sm text-gray-600">You've joined the organization.</p>
        <Link
          to="/organizations"
          className="mt-4 inline-block text-sm font-medium text-gray-900 hover:underline"
        >
          Go to your organizations →
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Accept invitation" subtitle="You've been invited">
      <div className="flex flex-col gap-4">
        <ErrorBanner error={error} />
        <p className="text-sm text-gray-600">Accept this invitation to join the organization.</p>
        <Button onClick={() => void accept()} isLoading={state === "accepting"}>
          Accept invitation
        </Button>
      </div>
    </AuthLayout>
  );
};
