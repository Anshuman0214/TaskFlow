import { Comment } from "./comment.model.js";

export interface CreateCommentInput {
  taskId: string;
  organizationId: string;
  content: string;
  mentionedUserIds: string[];
  createdBy: string;
  updatedBy: string;
}

export interface ListCommentsOptions {
  page: number;
  limit: number;
}

export const createComment = (input: CreateCommentInput) => Comment.create(input);

export const findCommentById = (taskId: string, commentId: string) =>
  Comment.findOne({ _id: commentId, taskId, isDeleted: false });

export const listCommentsByTask = async (taskId: string, options: ListCommentsOptions) => {
  const filter = { taskId, isDeleted: false };
  const skip = (options.page - 1) * options.limit;

  const [items, total] = await Promise.all([
    Comment.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(options.limit)
      .populate("createdBy", "name email"),
    Comment.countDocuments(filter),
  ]);

  return { items, total };
};

export const updateCommentContent = (id: string, content: string, updatedBy: string) =>
  Comment.findByIdAndUpdate(
    id,
    { content, editedAt: new Date(), updatedBy },
    { returnDocument: "after" },
  );

export const softDeleteComment = (id: string, deletedBy: string) =>
  Comment.findByIdAndUpdate(
    id,
    { isDeleted: true, deletedAt: new Date(), deletedBy, updatedBy: deletedBy },
    { returnDocument: "after" },
  );
