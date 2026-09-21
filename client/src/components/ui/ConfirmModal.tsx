import { Modal } from "./Modal";
import { Button } from "./Button";
import { ErrorBanner } from "./ErrorBanner";

export const ConfirmModal = ({
  title,
  description,
  confirmLabel = "Confirm",
  variant = "danger",
  isLoading = false,
  error,
  onConfirm,
  onClose,
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: "danger" | "primary";
  isLoading?: boolean;
  error?: unknown;
  onConfirm: () => void;
  onClose: () => void;
}) => (
  <Modal title={title} onClose={onClose}>
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-600">{description}</p>
      <ErrorBanner error={error} />
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button variant={variant} onClick={onConfirm} isLoading={isLoading}>
          {confirmLabel}
        </Button>
      </div>
    </div>
  </Modal>
);
