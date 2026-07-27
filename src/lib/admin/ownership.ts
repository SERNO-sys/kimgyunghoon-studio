import { getSession } from './session';

interface OwnershipRecord {
  userId: string;
  siteId: string;
}

// Mock ownership store. In production this will be stored in Cloudflare D1.
const mockOwnership: Map<string, OwnershipRecord> = new Map();

export async function verifySiteOwnership(siteId: string): Promise<boolean> {
  const session = await getSession();
  if (!session) {
    return false;
  }

  const record = mockOwnership.get(siteId);
  if (!record) {
    mockOwnership.set(siteId, { userId: session.userId, siteId });
    return true;
  }

  return record.userId === session.userId;
}
