import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { login } from "../../api/auth";
import { emailSchema } from "../../lib/validation";
import { applyServerFieldErrors } from "../../lib/apiError";
import { AuthLayout } from "./AuthLayout";
import { TextField } from "../../components/ui/TextField";
import { Button } from "../../components/ui/Button";
import { ErrorBanner } from "../../components/ui/ErrorBanner";
import { useState } from "react";

const schema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<unknown>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setFormError(null);
    try {
      const user = await login(values);
      queryClient.setQueryData(["me"], user);
      const from = (location.state as { from?: string } | null)?.from ?? "/organizations";
      navigate(from, { replace: true });
    } catch (error) {
      applyServerFieldErrors(error, setError);
      setFormError(error);
    }
  };

  return (
    <AuthLayout title="Log in" subtitle="Log in to your account">
      <form className="flex flex-col gap-4" onSubmit={(e) => void handleSubmit(onSubmit)(e)}>
        <ErrorBanner error={formError} />
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register("password")}
        />
        <Button type="submit" isLoading={isSubmitting} className="w-full">
          Log in
        </Button>
      </form>
      <div className="mt-4 flex justify-between text-sm text-gray-500">
        <Link to="/forgot-password" className="hover:text-gray-700">
          Forgot password?
        </Link>
        <Link to="/register" className="hover:text-gray-700">
          Create an account
        </Link>
      </div>
    </AuthLayout>
  );
};
