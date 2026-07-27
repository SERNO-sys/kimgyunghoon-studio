import { getSession } from '@/lib/admin/session';

interface OwnershipRecord {
  userId: string;
  repository: string;
}

// Mock ownership store. In production this will be stored in Cloudflare D1.
const mockOwnership: Map<string, OwnershipRecord> = new Map();

export function setMockOwnership(
  siteId: string,
  owner: OwnershipRecord
): void {
  mockOwnership.set(siteId, owner);
}

export async function verifyRepositoryOwnership(
  siteId: string
): Promise<boolean> {
  const session = await getSession();
  if (!session) {
    return false;
  }

  const ownership = mockOwnership.get(siteId);
  if (!ownership) {
    // No ownership record yet; treat the current session user as the default owner.
    mockOwnership.set(siteId, {
      userId: session.userId,
      repository: 'site-repo',
    });
    return true;
  }

  return ownership.userId === session.userId;
}
