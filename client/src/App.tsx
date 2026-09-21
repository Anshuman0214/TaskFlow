import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { ProtectedRoute, PublicOnlyRoute } from "./routes/ProtectedRoute";
import { AppShell } from "./components/layout/AppShell";
import { StatusPage } from "./pages/StatusPage";
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { VerifyEmailPage } from "./pages/auth/VerifyEmailPage";
import { ForgotPasswordPage } from "./pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/auth/ResetPasswordPage";
import { AcceptInvitationPage } from "./pages/AcceptInvitationPage";
import { OrganizationsListPage } from "./pages/organizations/OrganizationsListPage";
import { OrganizationLayout } from "./pages/organizations/OrganizationLayout";
import { OrganizationMembersPage } from "./pages/organizations/OrganizationMembersPage";
import { OrganizationSettingsPage } from "./pages/organizations/OrganizationSettingsPage";
import { WorkspacesListPage } from "./pages/organizations/WorkspacesListPage";
import { WorkspaceLayout } from "./pages/workspaces/WorkspaceLayout";
import { WorkspaceMembersPage } from "./pages/workspaces/WorkspaceMembersPage";
import { WorkspaceSettingsPage } from "./pages/workspaces/WorkspaceSettingsPage";
import { ProjectsListPage } from "./pages/workspaces/ProjectsListPage";
import { ProjectLayout } from "./pages/projects/ProjectLayout";
import { ProjectLabelsPage } from "./pages/projects/ProjectLabelsPage";
import { ProjectSettingsPage } from "./pages/projects/ProjectSettingsPage";
import { TasksListPage } from "./pages/projects/TasksListPage";
import { TaskDetailPage } from "./pages/tasks/TaskDetailPage";

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          <Route path="/status" element={<StatusPage />} />
          <Route path="/invitations/accept" element={<AcceptInvitationPage />} />

          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/" element={<Navigate to="/organizations" replace />} />
              <Route path="/organizations" element={<OrganizationsListPage />} />
              <Route path="/organizations/:orgId" element={<OrganizationLayout />}>
                <Route index element={<WorkspacesListPage />} />
                <Route path="members" element={<OrganizationMembersPage />} />
                <Route path="settings" element={<OrganizationSettingsPage />} />
                <Route path="workspaces/:workspaceId" element={<WorkspaceLayout />}>
                  <Route index element={<ProjectsListPage />} />
                  <Route path="members" element={<WorkspaceMembersPage />} />
                  <Route path="settings" element={<WorkspaceSettingsPage />} />
                  <Route path="projects/:projectId" element={<ProjectLayout />}>
                    <Route index element={<TasksListPage />} />
                    <Route path="labels" element={<ProjectLabelsPage />} />
                    <Route path="settings" element={<ProjectSettingsPage />} />
                    <Route path="tasks/:taskId" element={<TaskDetailPage />} />
                  </Route>
                </Route>
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
