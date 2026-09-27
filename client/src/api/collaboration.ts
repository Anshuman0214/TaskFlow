import { apiClient } from "./client";
import type { ApiResponse, PaginatedResponse, PaginationMeta } from "./types";

// Collaboration hangs off /tasks/:taskId (not /projects/:projectId/tasks/:taskId)
// — it mirrors the backend's own mount point, see collaboration.routes.ts.
const base = (taskId: string) => `/tasks/${taskId}`;

export interface UserRef {
  _id: string;
  name: string;
  email: string;
}

export interface Comment {
  _id: string;
  taskId: string;
  content: string;
  mentionedUserIds: string[];
  editedAt: string | null;
  createdBy: UserRef | string;
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  _id: string;
  taskId: string;
  uploadedBy: UserRef | string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  fileUrl: string;
  createdAt: string;
}

export interface TaskActivity {
  _id: string;
  taskId: string;
  actorId: UserRef | string;
  action: string;
  previousValue?: unknown;
  newValue?: unknown;
  createdAt: string;
}

export const listComments = async (
  taskId: string,
  page = 1,
  limit = 20,
): Promise<{ items: Comment[]; meta: PaginationMeta }> => {
  const res = await apiClient.get<PaginatedResponse<Comment>>(`${base(taskId)}/comments`, {
    params: { page, limit },
  });
  return { items: res.data.data, meta: res.data.meta };
};

export const createComment = async (
  taskId: string,
  content: string,
  mentionedUserIds: string[] = [],
): Promise<Comment> => {
  const res = await apiClient.post<ApiResponse<Comment>>(`${base(taskId)}/comments`, {
    content,
    mentionedUserIds,
  });
  return res.data.data;
};

export const updateComment = async (
  taskId: string,
  commentId: string,
  content: string,
): Promise<Comment> => {
  const res = await apiClient.patch<ApiResponse<Comment>>(
    `${base(taskId)}/comments/${commentId}`,
    { content },
  );
  return res.data.data;
};

export const deleteComment = async (taskId: string, commentId: string): Promise<void> => {
  await apiClient.delete(`${base(taskId)}/comments/${commentId}`);
};

export const listAttachments = async (taskId: string): Promise<Attachment[]> => {
  const res = await apiClient.get<ApiResponse<Attachment[]>>(`${base(taskId)}/attachments`);
  return res.data.data;
};

export const uploadAttachment = async (taskId: string, file: File): Promise<Attachment> => {
  const form = new FormData();
  form.append("file", file);

  // No explicit Content-Type: the browser has to set the multipart boundary.
  const res = await apiClient.post<ApiResponse<Attachment>>(`${base(taskId)}/attachments`, form);
  return res.data.data;
};

export const deleteAttachment = async (taskId: string, attachmentId: string): Promise<void> => {
  await apiClient.delete(`${base(taskId)}/attachments/${attachmentId}`);
};

export const listActivities = async (
  taskId: string,
  page = 1,
  limit = 20,
): Promise<{ items: TaskActivity[]; meta: PaginationMeta }> => {
  const res = await apiClient.get<PaginatedResponse<TaskActivity>>(`${base(taskId)}/activities`, {
    params: { page, limit },
  });
  return { items: res.data.data, meta: res.data.meta };
};
