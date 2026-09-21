import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";
import { forgotPassword } from "../../api/auth";
import { emailSchema } from "../../lib/validation";
import { AuthLayout } from "./AuthLayout";
import { TextField } from "../../components/ui/TextField";
import { Button } from "../../components/ui/Button";
import { ErrorBanner } from "../../components/ui/ErrorBanner";

const schema = z.object({ email: emailSchema });
type FormValues = z.infer<typeof schema>;

export const ForgotPasswordPage = () => {
  const [formError, setFormError] = useState<unknown>(null);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setFormError(null);
    try {
      await forgotPassword(values.email);
      setSent(true);
    } catch (error) {
      setFormError(error);
    }
  };

  if (sent) {
    return (
      <AuthLayout title="Check your email" subtitle="Check your email">
        <p className="text-sm text-gray-600">
          If an account exists, a reset link was sent. In local dev, check the server console for the
          reset token.
        </p>
        <Link to="/reset-password" className="mt-4 inline-block text-sm font-medium text-gray-900 hover:underline">
          I have a reset token →
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Forgot password" subtitle="Reset your password">
      <form className="flex flex-col gap-4" onSubmit={(e) => void handleSubmit(onSubmit)(e)}>
        <ErrorBanner error={formError} />
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <Button type="submit" isLoading={isSubmitting} className="w-full">
          Send reset link
        </Button>
      </form>
      <p className="mt-4 text-sm text-gray-500">
        <Link to="/login" className="font-medium text-gray-900 hover:underline">
          Back to login
        </Link>
      </p>
    </AuthLayout>
  );
};
