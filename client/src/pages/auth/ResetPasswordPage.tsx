import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useSearchParams } from "react-router-dom";
import { resetPassword } from "../../api/auth";
import { strongPasswordSchema } from "../../lib/validation";
import { applyServerFieldErrors } from "../../lib/apiError";
import { AuthLayout } from "./AuthLayout";
import { TextField } from "../../components/ui/TextField";
import { Button } from "../../components/ui/Button";
import { ErrorBanner } from "../../components/ui/ErrorBanner";

const schema = z.object({
  token: z.string().min(1, "Token is required"),
  newPassword: strongPasswordSchema,
});
type FormValues = z.infer<typeof schema>;

export const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const [formError, setFormError] = useState<unknown>(null);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { token: searchParams.get("token") ?? "", newPassword: "" },
  });

  const onSubmit = async (values: FormValues) => {
    setFormError(null);
    try {
      await resetPassword(values.token, values.newPassword);
      setDone(true);
    } catch (error) {
      applyServerFieldErrors(error, setError);
      setFormError(error);
    }
  };

  if (done) {
    return (
      <AuthLayout title="Password reset" subtitle="Password reset">
        <p className="text-sm text-gray-600">
          Your password has been reset and every active session was logged out. Log in with your new
          password.
        </p>
        <Link to="/login" className="mt-4 inline-block text-sm font-medium text-gray-900 hover:underline">
          Go to login →
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Reset password" subtitle="Set a new password">
      <form className="flex flex-col gap-4" onSubmit={(e) => void handleSubmit(onSubmit)(e)}>
        <ErrorBanner error={formError} />
        <TextField label="Reset token" error={errors.token?.message} {...register("token")} />
        <TextField
          label="New password"
          type="password"
          autoComplete="new-password"
          error={errors.newPassword?.message}
          {...register("newPassword")}
        />
        <Button type="submit" isLoading={isSubmitting} className="w-full">
          Reset password
        </Button>
      </form>
    </AuthLayout>
  );
};
