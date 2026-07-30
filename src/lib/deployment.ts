import type { Db, Post, SiteSettings } from './db/types';
import type { DeploymentRecord } from './cloudflare/types';
import {
  createDeployVersion,
  getSettingsBySiteId,
  listDeployVersionsBySite,
  listPostsBySite,
  restoreSiteSnapshot,
} from './db/queries';

interface Snapshot {
  settings: SiteSettings | null;
  posts: Post[];
}

export async function createDeploymentSnapshot(
  db: Db,
  siteId: string,
  commitHash: string
): Promise<DeploymentRecord> {
  const settings = await getSettingsBySiteId(db, siteId);
  const posts = await listPostsBySite(db, siteId);

  const snapshot: Snapshot = { settings, posts };
  const now = new Date().toISOString();
  const version = `v-${Date.now()}`;

  const record = await createDeployVersion(db, {
    id: crypto.randomUUID(),
    siteId,
    version,
    snapshot: JSON.stringify(snapshot),
    createdAt: now,
  });

  return {
    id: record.id,
    siteId: record.siteId,
    commitHash,
    version: record.version,
    status: 'success',
    startedAt: record.createdAt,
    completedAt: now,
    durationMs: 0,
  };
}

export async function getDeploymentHistoryForSite(
  db: Db,
  siteId: string
): Promise<DeploymentRecord[]> {
  return (await listDeployVersionsBySite(db, siteId)).map((version) => ({
    id: version.id,
    siteId: version.siteId,
    commitHash: version.version,
    version: version.version,
    status: 'success',
    startedAt: version.createdAt,
    completedAt: version.createdAt,
    durationMs: 0,
  }));
}

export async function rollbackToDeployment(
  db: Db,
  siteId: string,
  id: string
): Promise<DeploymentRecord | null> {
  const versions = await listDeployVersionsBySite(db, siteId);
  const version = versions.find((v) => v.id === id);
  if (!version) return null;

  const snapshot: Snapshot = JSON.parse(version.snapshot);
  if (!snapshot.settings) return null;

  await restoreSiteSnapshot(db, siteId, snapshot.settings, snapshot.posts ?? []);

  return {
    id: version.id,
    siteId: version.siteId,
    commitHash: version.version,
    version: version.version,
    status: 'success',
    startedAt: version.createdAt,
    completedAt: new Date().toISOString(),
    durationMs: 0,
  };
}
