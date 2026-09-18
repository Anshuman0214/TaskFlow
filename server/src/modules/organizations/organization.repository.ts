import { Organization } from "./organization.model.js";

export interface CreateOrganizationInput {
  name: string;
  slug: string;
  description: string | null;
  createdBy: string;
  updatedBy: string;
}

export interface UpdateOrganizationFields {
  name?: string | undefined;
  description?: string | null | undefined;
  logo?: string | null | undefined;
  updatedBy: string;
}

export const findOrganizationBySlug = (slug: string) =>
  Organization.findOne({ slug, isDeleted: false });

export const findOrganizationById = (id: string) =>
  Organization.findOne({ _id: id, isDeleted: false });

export const createOrganization = (input: CreateOrganizationInput) => Organization.create(input);

export const deleteOrganizationHard = (id: string) => Organization.findByIdAndDelete(id);

export const updateOrganizationFields = (id: string, fields: UpdateOrganizationFields) =>
  Organization.findByIdAndUpdate(id, fields, { returnDocument: "after" });

export const softDeleteOrganization = (id: string, deletedBy: string) =>
  Organization.findByIdAndUpdate(
    id,
    { isDeleted: true, deletedAt: new Date(), deletedBy, updatedBy: deletedBy },
    { returnDocument: "after" },
  );

export const findOrganizationsByIds = (ids: string[]) =>
  Organization.find({ _id: { $in: ids }, isDeleted: false });
