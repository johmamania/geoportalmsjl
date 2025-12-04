export interface AdminLoginRequest {
  username: string;
  password: string;
}

export interface AdminLoginResponse {
  success: boolean;
  access_code?: string;
  message?: string;
  user_id?: string;
}

export interface AdminUser {
  id: string;
  username: string;
  access_code: string;
  created_at: string;
  is_active: boolean;
}

