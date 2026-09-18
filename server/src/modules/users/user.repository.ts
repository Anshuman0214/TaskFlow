import { User } from "./user.model.js";
import { IUser } from "./user.types.js";

const SECRET_FIELDS =
  "+password +emailVerificationTokenHash +emailVerificationExpiresAt +passwordResetTokenHash +passwordResetExpiresAt";

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
}

export const findUserByEmail = (email: string) =>
  User.findOne({ email }).select(SECRET_FIELDS);

export const findUserById = (id: string) => User.findById(id);

export const findUserByIdWithSecrets = (id: string) =>
  User.findById(id).select(SECRET_FIELDS);

export const findUserByEmailVerificationTokenHash = (tokenHash: string) =>
  User.findOne({ emailVerificationTokenHash: tokenHash }).select(
    "+emailVerificationTokenHash +emailVerificationExpiresAt",
  );

export const findUserByPasswordResetTokenHash = (tokenHash: string) =>
  User.findOne({ passwordResetTokenHash: tokenHash }).select(
    "+passwordResetTokenHash +passwordResetExpiresAt +password",
  );

export const createUser = (input: CreateUserInput) => User.create(input);

export const updateUserFields = (id: string, fields: Partial<IUser>) =>
  User.findByIdAndUpdate(id, fields, { new: true });
