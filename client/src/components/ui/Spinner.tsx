export const Spinner = ({ className = "h-5 w-5" }: { className?: string }) => (
  <span
    role="status"
    aria-label="Loading"
    className={`inline-block animate-spin rounded-full border-2 border-gray-300 border-t-gray-900 ${className}`}
  />
);
