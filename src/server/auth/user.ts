import { getDb } from '@/lib/db/client';
import { createUser, getUserByEmail } from '@/lib/db/queries';
import type { AdminUser } from '@/types/admin';

interface GoogleProfile {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}

export async function findOrCreateUserFromGoogle(profile: GoogleProfile): Promise<AdminUser> {
  const db = getDb();
  const existing = await getUserByEmail(db, profile.email);
  if (existing) {
    return existing;
  }

  const user: AdminUser = {
    id: profile.sub,
    email: profile.email,
    name: profile.name,
    picture: profile.picture,
    role: 'admin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return await createUser(db, user);
}
