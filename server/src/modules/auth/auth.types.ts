export interface AuthUserResponse {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: AuthUserResponse;
}

export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
}

export interface AccessTokenPayload {
  userId: string;
}

export interface RefreshTokenPayload {
  userId: string;
  sessionId: string;
}
