'use client';

import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

interface PostsFilterProps {
  search: string;
  status: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
}

export function PostsFilter({
  search,
  status,
  onSearchChange,
  onStatusChange,
}: PostsFilterProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Input
        placeholder="Search posts..."
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        className="sm:w-64"
      />
      <Select
        value={status}
        onChange={(event) => onStatusChange(event.target.value)}
        className="sm:w-40"
      >
        <option value="all">All Status</option>
        <option value="published">Published</option>
        <option value="scheduled">Scheduled</option>
        <option value="draft">Draft</option>

      </Select>
    </div>
  );
}
