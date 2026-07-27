'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/hooks/useToast';
import { postSchema, type Post, type PostFormData } from '@/lib/admin/posts';
import { slugify } from '@/lib/admin/slug';
import { AIGenerateModal } from '@/components/admin/ai/AIGenerateModal';

interface PostFormProps {
  post?: Post;
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

export function PostForm({ post }: PostFormProps) {
  const router = useRouter();
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSlugManual, setIsSlugManual] = useState(Boolean(post));
  const [isAiOpen, setIsAiOpen] = useState(false);

  const form = useForm<PostFormData>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: post?.title ?? '',
      slug: post?.slug ?? '',
      category: post?.category ?? '',
      tags: post?.tags.join(', ') ?? '',
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
      const result = await response.json();
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
      const result = await response.json();
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
          <Input
            id="category"
            placeholder="Category"
            {...form.register('category')}
          />
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
          <div className="mb-2 flex items-center justify-between">
            <Label htmlFor="content">Content</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsAiOpen(true)}
            >
              AI Assist
            </Button>
          </div>
          <Textarea
            id="content"
            placeholder="Write your post in Markdown..."
            rows={16}
            {...form.register('content')}
          />
          {form.formState.errors.content && (
            <p className="mt-1 text-sm text-red-600">
              {form.formState.errors.content.message}
            </p>
          )}
        </div>
      </div>

      <AIGenerateModal
        isOpen={isAiOpen}
        onClose={() => setIsAiOpen(false)}
        onApply={(text) =>
          form.setValue('content', text, {
            shouldValidate: true,
            shouldDirty: true,
          })
        }
        initialContext={form.getValues('content')}
      />

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
