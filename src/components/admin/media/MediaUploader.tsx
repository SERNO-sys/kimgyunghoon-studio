'use client';

import { useCallback, useState } from 'react';
import { Upload } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

interface MediaUploaderProps {
  onUploadComplete: () => void;
}

export function MediaUploader({ onUploadComplete }: MediaUploaderProps) {
  const toast = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setIsUploading(true);
      try {
        for (const file of Array.from(files)) {
          const formData = new FormData();
          formData.append('file', file);
          const response = await fetch('/api/admin/media/upload', {
            method: 'POST',
            body: formData,
          });
          const result = await response.json();
          if (!response.ok) {
            toast.addToast(
              result.message || `Failed to upload ${file.name}`,
              'error'
            );
          }
        }
        toast.addToast('Upload complete.', 'success');
        onUploadComplete();
      } catch {
        toast.addToast('Upload failed.', 'error');
      } finally {
        setIsUploading(false);
      }
    },
    [onUploadComplete, toast]
  );

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      handleFiles(event.dataTransfer.files);
    },
    [handleFiles]
  );

  return (
    <div className="relative">
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`rounded-sm border-2 border-dashed p-8 text-center transition-colors ${
          isDragging
            ? 'border-amber-900 bg-amber-50'
            : 'border-stone-300 bg-[#fffdf8]'
        } ${isUploading ? 'opacity-70' : ''}`}
      >
        <Upload
          className="mx-auto size-8 text-stone-500"
          aria-hidden="true"
        />
        <p className="mt-2 text-sm font-medium text-stone-700">
          {isUploading ? 'Uploading...' : 'Drag & drop images here'}
        </p>
        <p className="text-xs text-stone-500">or click to browse</p>
      </div>
      <input
        type="file"
        accept="image/*"
        multiple
        className="absolute inset-0 cursor-pointer opacity-0"
        onChange={(event) => handleFiles(event.target.files)}
        disabled={isUploading}
        aria-label="Upload media files"
      />
    </div>
  );
}
