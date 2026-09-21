import { getErrorMessage } from "../../lib/apiError";

export const ErrorBanner = ({ error }: { error: unknown }) => {
  if (!error) return null;

  return (
    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {getErrorMessage(error)}
    </div>
  );
};
