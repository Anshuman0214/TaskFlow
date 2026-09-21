import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";
import { register as registerUser } from "../../api/auth";
import { emailSchema, strongPasswordSchema } from "../../lib/validation";
import { applyServerFieldErrors } from "../../lib/apiError";
import { AuthLayout } from "./AuthLayout";
import { TextField } from "../../components/ui/TextField";
import { Button } from "../../components/ui/Button";
import { ErrorBanner } from "../../components/ui/ErrorBanner";

const schema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: emailSchema,
  password: strongPasswordSchema,
});

type FormValues = z.infer<typeof schema>;

export const RegisterPage = () => {
  const [formError, setFormError] = useState<unknown>(null);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setFormError(null);
    try {
      await registerUser(values);
      setRegisteredEmail(values.email);
    } catch (error) {
      applyServerFieldErrors(error, setError);
      setFormError(error);
    }
  };

  if (registeredEmail) {
    return (
      <AuthLayout title="Registered" subtitle="Check your inbox">
        <p className="text-sm text-gray-600">
          We sent a verification link to <strong>{registeredEmail}</strong>. In local dev with no SMTP
          configured, the link is logged to the server console instead — copy the token from there.
        </p>
        <Link
          to="/verify-email"
          className="mt-4 inline-block text-sm font-medium text-gray-900 hover:underline"
        >
          I have a verification token →
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Register" subtitle="Create your account">
      <form className="flex flex-col gap-4" onSubmit={(e) => void handleSubmit(onSubmit)(e)}>
        <ErrorBanner error={formError} />
        <TextField label="Name" autoComplete="name" error={errors.name?.message} {...register("name")} />
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
          autoComplete="new-password"
          error={errors.password?.message}
          {...register("password")}
        />
        <Button type="submit" isLoading={isSubmitting} className="w-full">
          Create account
        </Button>
      </form>
      <p className="mt-4 text-sm text-gray-500">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-gray-900 hover:underline">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
};
