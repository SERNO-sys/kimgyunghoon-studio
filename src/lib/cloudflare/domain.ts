import { mockDomain } from '@/lib/admin/domain-store';
import { verifySiteOwnership } from '@/lib/admin/ownership';
import type { DomainConfig } from '@/lib/admin/domain';

export interface ConnectResult {
  success: boolean;
  message: string;
  domain?: string;
  sslStatus?: DomainConfig['sslStatus'];
}

export async function connectDomain(
  siteId: string,
  domain: string
): Promise<ConnectResult> {
  const isOwner = await verifySiteOwnership(siteId);
  if (!isOwner) {
    return { success: false, message: 'Site ownership verification failed' };
  }

  // TODO: call Cloudflare DNS/SSL APIs when credentials are available.
  mockDomain.current = { domain, sslStatus: 'active' };
  return {
    success: true,
    message: 'Domain connected successfully',
    domain,
    sslStatus: 'active',
  };
}

export async function getDomainStatus(siteId: string) {
  const isOwner = await verifySiteOwnership(siteId);
  if (!isOwner) {
    return { success: false, message: 'Unauthorized' };
  }

  return {
    success: true,
    domain: mockDomain.current?.domain ?? null,
    sslStatus: mockDomain.current?.sslStatus ?? null,
  };
}

export async function removeDomain(siteId: string) {
  const isOwner = await verifySiteOwnership(siteId);
  if (!isOwner) {
    return { success: false, message: 'Unauthorized' };
  }

  mockDomain.current = null;
  return { success: true, message: 'Domain removed' };
}
