import type {
  Db,
  User,
  Site,
  Domain,
  Post,
  Media,
  Category,
  SiteSettings,
  DeployVersion,
} from './types';

// ---------- Users ----------

export async function listUsers(db: Db): Promise<User[]> {
  return await db.users.findMany({});
}

export async function getUserByEmail(db: Db, email: string): Promise<User | null> {
  return await db.users.findOne({ email });
}

export async function getUserById(db: Db, id: string): Promise<User | null> {
  return await db.users.findById(id);
}

export async function createUser(db: Db, user: User): Promise<User> {
  return await db.users.insert(user);
}

export async function deleteUser(db: Db, id: string): Promise<boolean> {
  return await db.users.delete(id);
}

// ---------- Sites ----------

export async function getSiteById(db: Db, id: string): Promise<Site | null> {
  return await db.sites.findById(id);
}

export async function listSitesByOwner(db: Db, ownerId: string): Promise<Site[]> {
  return await db.sites.findMany({ ownerId });
}

export async function createSite(db: Db, site: Site): Promise<Site> {
  return await db.sites.insert(site);
}

export async function updateSite(db: Db, id: string, data: Partial<Site>): Promise<Site | null> {
  return await db.sites.update(id, { ...data, updatedAt: new Date().toISOString() });
}

export async function deleteSite(db: Db, id: string): Promise<boolean> {
  return await db.sites.delete(id);
}

// ---------- Domains ----------

export async function getDomainByName(db: Db, domain: string): Promise<Domain | null> {
  return await db.domains.findOne({ domain });
}

export async function listDomainsBySite(db: Db, siteId: string): Promise<Domain[]> {
  return await db.domains.findMany({ siteId });
}

export async function getPrimaryDomain(db: Db, siteId: string): Promise<Domain | null> {
  return (await db.domains.findOne({ siteId, isPrimary: true })) ?? (await db.domains.findOne({ siteId }));
}

export async function createDomain(db: Db, domain: Domain): Promise<Domain> {
  return await db.domains.insert(domain);
}

export async function updateDomain(db: Db, id: string, data: Partial<Domain>): Promise<Domain | null> {
  return await db.domains.update(id, { ...data, updatedAt: new Date().toISOString() });
}

export async function deleteDomain(db: Db, id: string): Promise<boolean> {
  return await db.domains.delete(id);
}

export async function getSiteByDomain(db: Db, domain: string): Promise<Site | null> {
  const domainRow = await getDomainByName(db, domain);
  if (!domainRow) return null;
  return await getSiteById(db, domainRow.siteId);
}

/**
 * Resolves a site by its tenant subdomain identifier. The subdomain is the
 * first segment of the site's UUID (e.g. `e801f11c` for a site id of
 * `e801f11c-xxxx-xxxx-xxxx-xxxxxxxxxxxx`), so we match sites whose id starts
 * with the given subdomain.
 *
 * Uses an indexed SQL prefix lookup (`id LIKE 'prefix%'`) instead of loading
 * every site into memory, which avoids D1 timeouts on large datasets.
 */
export async function getSiteBySubdomain(
  db: Db,
  subdomain: string
): Promise<Site | null> {
  const sites = await db.sites.findByPrefix(subdomain);
  return sites[0] ?? null;
}



// ---------- Posts ----------

export async function listPostsBySite(
  db: Db,
  siteId: string,
  status?: 'draft' | 'published'
): Promise<Post[]> {
  return await db.posts.findMany(status ? { siteId, status } : { siteId });
}

export async function getPostById(db: Db, id: string): Promise<Post | null> {
  return await db.posts.findById(id);
}

export async function getPostBySlug(db: Db, siteId: string, slug: string): Promise<Post | null> {
  return await db.posts.findOne({ siteId, slug });
}

export async function createPost(db: Db, post: Post): Promise<Post> {
  return await db.posts.insert(post);
}

export async function updatePost(db: Db, id: string, data: Partial<Post>): Promise<Post | null> {
  return await db.posts.update(id, { ...data, updatedAt: new Date().toISOString() });
}

export async function deletePost(db: Db, id: string): Promise<boolean> {
  return await db.posts.delete(id);
}

export async function countPostsBySite(db: Db, siteId: string): Promise<number> {
  const posts = await db.posts.findMany({ siteId });
  return posts.length;
}

// ---------- Media ----------

export async function listMediaBySite(db: Db, siteId: string): Promise<Media[]> {
  return await db.media.findMany({ siteId });
}

export async function getMediaById(db: Db, id: string): Promise<Media | null> {
  return await db.media.findById(id);
}

export async function createMedia(db: Db, media: Media): Promise<Media> {
  return await db.media.insert(media);
}

export async function deleteMedia(db: Db, id: string): Promise<boolean> {
  return await db.media.delete(id);
}

export async function countMediaBySite(db: Db, siteId: string): Promise<number> {
  const items = await db.media.findMany({ siteId });
  return items.length;
}

// ---------- Deploy Versions ----------

export async function listDeployVersionsBySite(
  db: Db,
  siteId: string
): Promise<DeployVersion[]> {
  const versions = await db.deployVersions.findMany({ siteId });
  return versions.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getDeployVersionById(
  db: Db,
  id: string
): Promise<DeployVersion | null> {
  return await db.deployVersions.findById(id);
}

export async function createDeployVersion(
  db: Db,
  version: DeployVersion
): Promise<DeployVersion> {
  return await db.deployVersions.insert(version);
}

export async function deleteDeployVersion(db: Db, id: string): Promise<boolean> {
  return await db.deployVersions.delete(id);
}

export async function restoreSiteSnapshot(
  db: Db,
  siteId: string,
  settings: SiteSettings,
  posts: Post[]
): Promise<void> {
  const existingIds = new Set(posts.map((post) => post.id));

  const currentPosts = await db.posts.findMany({ siteId });
  for (const post of currentPosts) {
    if (!existingIds.has(post.id)) {
      await db.posts.delete(post.id);
    }
  }

  for (const post of posts) {
    if (await db.posts.findById(post.id)) {
      await db.posts.update(post.id, { ...post, siteId });
    } else {
      await db.posts.insert({ ...post, siteId });
    }
  }

  await db.settings.update(siteId, {
    ...settings,
    siteId,
    id: siteId,
    updatedAt: new Date().toISOString(),
  });
}

// ---------- Categories ----------

export async function listCategoriesBySite(db: Db, siteId: string): Promise<Category[]> {
  const categories = await db.categories.findMany({ siteId });
  return categories.sort(
    (a, b) => a.order - b.order || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

export async function getCategoryById(db: Db, id: string): Promise<Category | null> {
  return await db.categories.findById(id);
}

export async function createCategory(db: Db, category: Category): Promise<Category> {
  return await db.categories.insert(category);
}

export async function updateCategory(db: Db, id: string, data: Partial<Category>): Promise<Category | null> {
  return await db.categories.update(id, { ...data, updatedAt: new Date().toISOString() });
}

export async function deleteCategory(db: Db, id: string): Promise<boolean> {
  return await db.categories.delete(id);
}

// ---------- Settings ----------

export async function getSettingsBySiteId(
  db: Db,
  siteId: string
): Promise<SiteSettings | null> {
  return await db.settings.findById(siteId);
}

export async function upsertSettings(
  db: Db,
  settings: SiteSettings
): Promise<SiteSettings> {
  const existing = await db.settings.findById(settings.siteId);
  if (existing) {
    return (await db.settings.update(settings.siteId, {
      ...settings,
      updatedAt: new Date().toISOString(),
    }))!;
  }
  return await db.settings.insert({
    ...settings,
    id: settings.siteId,
    updatedAt: new Date().toISOString(),
  });
}
