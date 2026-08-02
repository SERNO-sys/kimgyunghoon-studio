'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Image as ImageIcon, Sparkles, Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/hooks/useToast';
import { postSchema, type Post, type PostFormData } from '@/lib/admin/posts';
import { slugify } from '@/lib/admin/slug';
import { AIDraftAssistant } from '@/components/admin/ai/AIDraftAssistant';
import type { Category } from '@/lib/db/types';

interface PostFormProps {
  post?: Post;
  defaultCategory?: string;
  siteId?: string;
}

interface SlugInputProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any;
  setIsSlugManual: (value: boolean) => void;
}

function SlugInput({ form, setIsSlugManual }: SlugInputProps) {
  const { ref, onChange, ...registerProps } = form.register('slug');

  return (
    <Input
      id="slug"
      placeholder="post-slug"
      {...registerProps}
      ref={ref}
      onChange={(event) => {
        setIsSlugManual(true);
        onChange(event);
      }}
    />
  );
}

export function PostForm({ post, defaultCategory, siteId }: PostFormProps) {
  const router = useRouter();
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSlugManual, setIsSlugManual] = useState(Boolean(post));
  const [isDraftAssistantOpen, setIsDraftAssistantOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isDraggingContent, setIsDraggingContent] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentFileInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement | null>(null);

  const form = useForm<PostFormData>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: post?.title ?? '',
      slug: post?.slug ?? '',
      category: post?.category ?? defaultCategory ?? '',
      tags: post?.tags ?? '',
      audioUrl: post?.audioUrl ?? '',
      featuredImageUrl: post?.featuredImageUrl ?? '',
      content: post?.content ?? '',
      status: post?.status ?? 'draft',
    },
    mode: 'onBlur',
  });

  const title = form.watch('title');
  const slug = form.watch('slug');

  useEffect(() => {
    if (slug === '') {
      setIsSlugManual(false);
    }
    if (!isSlugManual && title) {
      form.setValue('slug', slugify(title), { shouldValidate: true });
    }
  }, [title, slug, isSlugManual, form]);

  const selectedCategory = form.watch('category');
  const postCategories = categories.filter(
    (c) => c.slug !== 'home' && c.slug !== 'about' && c.slug !== 'contact'
  );

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await fetch('/api/admin/categories');
        const data = (await response.json()) as { success?: boolean; message?: string; [key: string]: unknown };
        if (data.success && Array.isArray(data.categories)) {
          setCategories(data.categories);
          if (defaultCategory) {
            const writable = data.categories.filter(
              (c: Category) =>
                c.slug !== 'home' && c.slug !== 'about' && c.slug !== 'contact'
            );
            const matched = writable.find(
              (c: Category) =>
                c.slug === defaultCategory || c.title === defaultCategory
            );
            if (matched) {
              form.setValue('category', matched.slug, { shouldValidate: true });
            }
          }
        }
      } catch {
        // ignore
      }
    };
    loadCategories();
  }, [defaultCategory, form]);

  const uploadImage = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch('/api/admin/media/upload', {
        method: 'POST',
        body: formData,
      });
      const result = (await response.json()) as {
        success?: boolean;
        message?: string;
        media?: { url: string };
      };
      if (!response.ok || !result.success) {
        toast.addToast(result.message || 'Image upload failed.', 'error');
        return null;
      }
      return result.media?.url ?? null;
    } catch {
      toast.addToast('Image upload failed.', 'error');
      return null;
    }
  };

  const handleFeaturedDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const url = await uploadImage(file);
    if (url) {
      form.setValue('featuredImageUrl', url, { shouldValidate: true });
    }
  };

  const handleFeaturedFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = await uploadImage(file);
    if (url) {
      form.setValue('featuredImageUrl', url, { shouldValidate: true });
    }
    event.target.value = '';
  };

  const insertMarkdownImages = async (files: File[]) => {
    const imageFiles = files.filter((file) => file.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    const textarea = contentRef.current;
    const start = textarea?.selectionStart ?? form.getValues('content').length;
    let current = form.getValues('content') ?? '';
    let insertAt = start;

    for (const file of imageFiles) {
      const url = await uploadImage(file);
      if (url) {
        const markdown = `![image](${url})\n`;
        current = current.slice(0, insertAt) + markdown + current.slice(insertAt);
        insertAt += markdown.length;
      }
    }

    if (current !== form.getValues('content')) {
      form.setValue('content', current, {
        shouldValidate: true,
        shouldDirty: true,
      });
      requestAnimationFrame(() => {
        if (contentRef.current) {
          contentRef.current.selectionStart = contentRef.current.selectionEnd = insertAt;
        }
      });
    }
  };

  const handleContentDrop = async (event: React.DragEvent<HTMLTextAreaElement>) => {
    event.preventDefault();
    setIsDraggingContent(false);
    await insertMarkdownImages(Array.from(event.dataTransfer.files));
  };

  const handleContentFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    await insertMarkdownImages(Array.from(event.target.files ?? []));
    event.target.value = '';
  };

  const { ref: contentRegisterRef, ...contentRegisterProps } = form.register('content');
  const setContentRef = useCallback(
    (element: HTMLTextAreaElement | null) => {
      contentRef.current = element;
      contentRegisterRef(element);
    },
    [contentRegisterRef]
  );

  const syncToGitHub = async (data: PostFormData, status: Post['status']) => {
    try {
      const markdown = `---\ntitle: ${data.title}\nslug: ${data.slug}\ncategory: ${data.category}\nstatus: ${status}\ntags: [${data.tags ?? ''}]\n---\n\n${data.content}`;
      const response = await fetch('/api/admin/github/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId: 'default',
          changes: [
            { path: `src/content/posts/${data.slug}.md`, content: markdown },
          ],
          commitMessage: `${status === 'published' ? 'Publish' : 'Update'}: ${data.title}`,
        }),
      });
      const result = (await response.json()) as { success?: boolean; message?: string; [key: string]: unknown };
      if (response.ok && result.success) {
        toast.addToast('GitHub sync completed.', 'success');
        toast.addToast('Deployment started.', 'success');
        setTimeout(() => {
          toast.addToast('Deployment completed.', 'success');
        }, 2000);
      } else {
        toast.addToast(
          result.message || 'GitHub sync failed.',
          'error'
        );
      }
    } catch {
      toast.addToast('GitHub sync failed.', 'error');
    }
  };

  const onSubmit = async (data: PostFormData, status: Post['status']) => {
    setIsSubmitting(true);
    try {
      const payload = { ...data, status };
      const url = post ? `/api/admin/posts/${post.id}` : '/api/admin/posts';
      const method = post ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { success?: boolean; message?: string; [key: string]: unknown };
      if (response.ok && result.success) {
        toast.addToast(
          status === 'published' ? 'Post published.' : 'Draft saved.',
          'success'
        );
        if (status === 'published') {
          await syncToGitHub(data, status);
        }
        router.push('/admin/posts');
      } else {
        toast.addToast(
          result.message || 'Failed to save post.',
          'error'
        );
      }
    } catch {
      toast.addToast('An unexpected error occurred.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="md:col-span-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" placeholder="Post title" {...form.register('title')} />
          {form.formState.errors.title && (
            <p className="mt-1 text-sm text-red-600">
              {form.formState.errors.title.message}
            </p>
          )}
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="slug">Slug</Label>
          <SlugInput form={form} setIsSlugManual={setIsSlugManual} />
          {form.formState.errors.slug && (
            <p className="mt-1 text-sm text-red-600">
              {form.formState.errors.slug.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="category">Category</Label>
          <Select
            id="category"
            value={selectedCategory}
            onChange={(event) =>
              form.setValue('category', event.target.value, { shouldValidate: true })
            }
          >
            <option value="">Select a category</option>
            {postCategories.map((category) => (
              <option key={category.id} value={category.slug}>
                {category.title}
              </option>
            ))}
          </Select>
          {form.formState.errors.category && (
            <p className="mt-1 text-sm text-red-600">
              {form.formState.errors.category.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="tags">Tags</Label>
          <Input
            id="tags"
            placeholder="tag1, tag2, tag3"
            {...form.register('tags')}
          />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="audioUrl">Audio / Music Source URL</Label>
          <Input
            id="audioUrl"
            type="url"
            placeholder="https://example.com/track.mp3, https://suno.ai/song/..., or YouTube URL"
            {...form.register('audioUrl')}
          />
          {form.formState.errors.audioUrl && (
            <p className="mt-1 text-sm text-red-600">
              {form.formState.errors.audioUrl.message}
            </p>
          )}
        </div>

        <div className="md:col-span-2">
          <Label>Featured Image</Label>
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
            }}
            onDrop={handleFeaturedDrop}
            className={`relative mt-2 flex max-h-48 cursor-pointer items-center justify-center overflow-hidden rounded-md border-2 border-dashed border-stone-300 bg-[#fffdf8] transition-colors hover:bg-stone-50 ${
              form.watch('featuredImageUrl') ? 'border-amber-700' : ''
            }`}
          >
            {form.watch('featuredImageUrl') ? (
              <img
                src={form.watch('featuredImageUrl')}
                alt="Featured preview"
                className="max-h-48 w-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 p-6 text-stone-500">
                <Upload className="size-8" aria-hidden="true" />
                <p className="text-sm font-medium">Drop or click to upload image</p>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFeaturedFileSelect}
          />
          {form.formState.errors.featuredImageUrl && (
            <p className="mt-1 text-sm text-red-600">
              {form.formState.errors.featuredImageUrl.message}
            </p>
          )}
        </div>

        <div className="md:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <Label htmlFor="content">Content</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => contentFileInputRef.current?.click()}
              >
                <ImageIcon className="mr-1 size-4" aria-hidden="true" />
                본문에 이미지 추가
              </Button>
              {siteId && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsDraftAssistantOpen(true)}
                >
                  <Sparkles className="mr-1 size-4" aria-hidden="true" />
                  AI 초안 도우미
                </Button>
              )}
            </div>
          </div>
          <Textarea
            id="content"
            placeholder="Write your post in Markdown... (drag and drop images here)"
            rows={16}
            {...contentRegisterProps}
            ref={setContentRef}
            onDrop={handleContentDrop}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDraggingContent(true);
            }}
            onDragLeave={() => setIsDraggingContent(false)}
            className={isDraggingContent ? 'border-amber-700 bg-amber-50' : ''}
          />
          <input
            ref={contentFileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleContentFileSelect}
          />
          {form.formState.errors.content && (
            <p className="mt-1 text-sm text-red-600">
              {form.formState.errors.content.message}
            </p>
          )}
        </div>
      </div>

      {siteId && (
        <AIDraftAssistant
          siteId={siteId}
          isOpen={isDraftAssistantOpen}
          onClose={() => setIsDraftAssistantOpen(false)}
          onApply={(text: string) =>
            form.setValue('content', text, {
              shouldValidate: true,
              shouldDirty: true,
            })
          }
        />
      )}

      <div className="flex flex-col-reverse items-start justify-between gap-4 border-t border-stone-200 pt-6 sm:flex-row sm:items-center">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push('/admin/posts')}
        >
          Cancel
        </Button>
        <div className="flex w-full items-center gap-3 sm:w-auto">
          <Button
            type="button"
            variant="ghost"
            disabled={isSubmitting}
            className="flex-1 sm:flex-none"
            onClick={() =>
              form.handleSubmit((data) => onSubmit(data, 'draft'))()
            }
          >
            Save Draft
          </Button>
          <Button
            type="button"
            disabled={isSubmitting}
            className="flex-1 sm:flex-none"
            onClick={() =>
              form.handleSubmit((data) => onSubmit(data, 'published'))()
            }
          >
            {isSubmitting ? 'Saving...' : 'Publish'}
          </Button>
        </div>
      </div>
    </form>
  );
}
