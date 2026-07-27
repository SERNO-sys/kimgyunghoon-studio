import type { Post } from './posts';

export const mockPosts: Post[] = [
  {
    id: '1',
    title: 'Welcome Post',
    slug: 'welcome-post',
    category: 'General',
    tags: ['intro'],
    content: 'Welcome to the site.',
    status: 'published',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
