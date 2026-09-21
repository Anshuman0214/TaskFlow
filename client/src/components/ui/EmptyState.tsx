import type { ReactNode } from "react";

export const EmptyState = ({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) => (
  <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-gray-300 px-6 py-10 text-center">
    <p className="text-sm font-medium text-gray-900">{title}</p>
    {description && <p className="text-sm text-gray-500">{description}</p>}
    {action}
  </div>
);
