import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { Button } from "../ui/Button";

export const AppShell = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <Link to="/organizations" className="text-base font-semibold text-gray-900">
            TaskFlow
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{user?.name}</span>
            <Button variant="ghost" onClick={() => void logout()}>
              Log out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
};
