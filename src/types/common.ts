export type ContentItem<TFrontmatter extends object> = TFrontmatter & {
  slug: string;
  content: string;
  html: string;
};

export type Frontmatter = Record<string, unknown>;
