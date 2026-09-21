import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useSearchParams } from "react-router-dom";
import { verifyEmail } from "../../api/auth";
import { applyServerFieldErrors } from "../../lib/apiError";
import { AuthLayout } from "./AuthLayout";
import { TextField } from "../../components/ui/TextField";
import { Button } from "../../components/ui/Button";
import { ErrorBanner } from "../../components/ui/ErrorBanner";

const schema = z.object({ token: z.string().min(1, "Token is required") });
type FormValues = z.infer<typeof schema>;

export const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const [formError, setFormError] = useState<unknown>(null);
  const [verified, setVerified] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { token: searchParams.get("token") ?? "" },
  });

  const onSubmit = async (values: FormValues) => {
    setFormError(null);
    try {
      await verifyEmail(values.token);
      setVerified(true);
    } catch (error) {
      applyServerFieldErrors(error, setError);
      setFormError(error);
    }
  };

  if (verified) {
    return (
      <AuthLayout title="Verified" subtitle="Email verified">
        <p className="text-sm text-gray-600">Your email is verified. You can log in now.</p>
        <Link to="/login" className="mt-4 inline-block text-sm font-medium text-gray-900 hover:underline">
          Go to login →
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Verify email" subtitle="Verify your email">
      <form className="flex flex-col gap-4" onSubmit={(e) => void handleSubmit(onSubmit)(e)}>
        <ErrorBanner error={formError} />
        <TextField label="Verification token" error={errors.token?.message} {...register("token")} />
        <Button type="submit" isLoading={isSubmitting} className="w-full">
          Verify
        </Button>
      </form>
    </AuthLayout>
  );
};
