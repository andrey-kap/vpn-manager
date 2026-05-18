/**
 * Shared types for vpn-manager project
 * All types are defined once in shared layer to avoid duplication
 */

export interface User {
  id: string;
  username: string;
  shared_secret: string;
  is_active: boolean;
  created_at: Date;
}

export interface DockerStatus {
  status: 'running' | 'stopped' | 'paused' | 'restarting' | 'removing' | 'exited' | 'dead';
  uptime: number | null;
  containerId: string;
  image: string;
}

export interface TrafficRecord {
  id: string;
  user_id: string;
  timestamp: Date;
  bytes_in: number;
  bytes_out: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type RequestStatus = 'pending' | 'success' | 'error';

export interface ApiError {
  code: string;
  message: string;
  status: number;
}
