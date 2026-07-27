import type { AdminUser } from '@/types/admin';

interface GoogleProfile {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}

export async function findOrCreateUserFromGoogle(profile: GoogleProfile): Promise<AdminUser> {
  return {
    id: profile.sub,
    email: profile.email,
    name: profile.name,
    picture: profile.picture,
    role: 'admin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
