'use client';

import Link from 'next/link';
import { Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import type { Post } from '@/lib/admin/posts';

interface PostTableProps {
  posts: Post[];
  onDelete: (post: Post) => void;
}

export function PostTable({ posts, onDelete }: PostTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Date</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {posts.map((post) => (
          <TableRow key={post.id}>
            <TableCell>
              <div className="font-medium text-stone-950">{post.title}</div>
              <div className="text-xs text-stone-500">/{post.slug}</div>
            </TableCell>
            <TableCell>{post.category}</TableCell>
            <TableCell>
              <Badge
                className={
                  post.status === 'published'
                    ? 'bg-green-100 text-green-900'
                    : 'bg-stone-100 text-stone-700'
                }
              >
                {post.status}
              </Badge>
            </TableCell>
            <TableCell>
              {new Date(post.updatedAt).toLocaleDateString()}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-2">
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="size-8 p-0"
                >
                  <Link href={`/admin/posts/${post.id}/edit`}>
                    <Pencil className="size-4" aria-hidden="true" />
                    <span className="sr-only">Edit {post.title}</span>
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => onDelete(post)}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                  <span className="sr-only">Delete {post.title}</span>
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
        {posts.length === 0 && (
          <TableRow>
            <TableCell
              colSpan={5}
              className="py-8 text-center text-stone-500"
            >
              No posts found.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
