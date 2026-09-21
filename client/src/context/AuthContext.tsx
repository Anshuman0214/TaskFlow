import type { ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCurrentUser, logout as logoutApi } from "../api/auth";
import { AuthContext } from "./auth-context";

// getCurrentUser() 401s with no access token yet; apiClient's response
// interceptor (src/api/client.ts) transparently refreshes from the
// HTTP-only cookie and retries — so this needs no bootstrap logic of its
// own, it just resolves once whatever session exists (or doesn't) settles.
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: getCurrentUser,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const logout = async () => {
    await logoutApi();
    queryClient.clear();
  };

  return (
    <AuthContext.Provider value={{ user: data ?? null, isLoading, isAuthenticated: !!data, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
