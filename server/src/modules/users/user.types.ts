export interface IUser {
  name: string;
  email: string;
  password: string;
  isActive: boolean;
  isEmailVerified: boolean;
  emailVerificationTokenHash: string | null;
  emailVerificationExpiresAt: Date | null;
  passwordResetTokenHash: string | null;
  passwordResetExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;

  comparePassword(candidatePassword: string): Promise<boolean>;
}
