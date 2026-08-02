import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin/session';
import { getDb } from '@/lib/db/client';
import { getDomainByName, listSitesByOwner, updateDomain } from '@/lib/db/queries';

export const runtime = 'edge';

const TARGET = 'domains.lotusaic.com';

async function getCurrentSiteId(userId: string): Promise<string | null> {
  const db = getDb();
  const sites = await listSitesByOwner(db, userId);
  return sites[0]?.id ?? null;
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 }
    );
  }

  const siteId = await getCurrentSiteId(session.userId);
  if (!siteId) {
    return NextResponse.json(
      { success: false, message: 'No site configured' },
      { status: 404 }
    );
  }

  const { searchParams } = new URL(request.url);
  const domainName = (searchParams.get('domain') || '').toLowerCase().trim();
  if (!domainName) {
    return NextResponse.json(
      { success: false, message: 'Domain is required' },
      { status: 400 }
    );
  }

  const db = getDb();
  const domainRow = await getDomainByName(db, domainName);
  if (!domainRow || domainRow.siteId !== siteId) {
    return NextResponse.json(
      { success: false, message: 'Domain not registered' },
      { status: 404 }
    );
  }

  try {
    // Edge-runtime compatible DNS lookup via Cloudflare DNS-over-HTTPS (JSON API)
    const dnsUrl = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(
      domainName
    )}&type=CNAME`;
    const dnsRes = await fetch(dnsUrl, {
      headers: { accept: 'application/dns-json' },
    });
    const dnsData = (await dnsRes.json()) as {
      Answer?: { type: number; data: string }[];
    };
    const cnameRecords = (dnsData.Answer ?? [])
      .filter((a) => a.type === 5)
      .map((a) => a.data.replace(/\.$/, '').toLowerCase());
    const verified = cnameRecords.some((record) =>
      record.endsWith(TARGET.toLowerCase())
    );

    await updateDomain(db, domainRow.id, {
      verified,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, verified, target: TARGET });
  } catch {
    // DNS resolution error means the CNAME record is not configured yet.
    await updateDomain(db, domainRow.id, {
      verified: false,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      verified: false,
      target: TARGET,
    });
  }
}
