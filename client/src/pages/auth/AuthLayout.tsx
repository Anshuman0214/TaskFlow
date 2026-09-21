import type { ReactNode } from "react";

export const AuthLayout = ({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) => (
  <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">TaskFlow</h1>
      <p className="mt-1 text-sm text-gray-500">{subtitle ?? title}</p>
    </div>
    <div className="rounded-lg border border-gray-200 bg-white p-5">{children}</div>
  </main>
);
