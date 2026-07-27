export interface AdminUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
  role: 'admin' | 'editor';
  createdAt: string;
  updatedAt: string;
}

export interface AdminSession {
  userId: string;
  email: string;
  name: string;
  picture?: string;
  expiresAt: number;
}
