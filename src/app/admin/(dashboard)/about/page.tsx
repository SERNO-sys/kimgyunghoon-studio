'use client';

import { useEffect, useState, useCallback } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/hooks/useToast';

interface AboutFormData {
  profileImage: string;
  subHeading: string;
  aboutText: string;
  aboutPhilosophy: string;
}

export default function AboutAdminPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [baseSettings, setBaseSettings] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState<AboutFormData>({
    profileImage: '',
    subHeading: '',
    aboutText: '',
    aboutPhilosophy: '',
  });

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data?.settings) {
          setBaseSettings(data.settings);
          const general = (data.settings.general as Record<string, string>) || {};
          setForm({
            profileImage: general.profile_image || '',
            subHeading: general.about_sub_heading || '',
            aboutText: general.about_text || '',
            aboutPhilosophy: general.about_philosophy || '',
          });
        }
      })
      .catch(() => {
        toast.addToast('Failed to load about settings.', 'error');
      })
      .finally(() => setLoading(false));
  }, [toast]);

  const handleChange = (field: keyof AboutFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const uploadImage = useCallback(
    async (file: File): Promise<string | null> => {
      const formData = new FormData();
      formData.append('file', file);
      try {
        const response = await fetch('/api/admin/media/upload', {
          method: 'POST',
          body: formData,
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
          toast.addToast(result.message || 'Image upload failed.', 'error');
          return null;
        }
        return result.media?.url ?? null;
      } catch {
        toast.addToast('Image upload failed.', 'error');
        return null;
      }
    },
    [toast]
  );

  const handleProfileDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      const file = event.dataTransfer.files?.[0];
      if (!file || !file.type.startsWith('image/')) return;
      setIsUploading(true);
      const url = await uploadImage(file);
      setIsUploading(false);
      if (url) {
        handleChange('profileImage', url);
      }
    },
    [uploadImage]
  );

  const handleProfileFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      setIsUploading(true);
      const url = await uploadImage(file);
      setIsUploading(false);
      if (url) {
        handleChange('profileImage', url);
      }
      event.target.value = '';
    },
    [uploadImage]
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      ...baseSettings,
      general: {
        ...(baseSettings?.general as Record<string, unknown>),
        profile_image: form.profileImage,
        about_sub_heading: form.subHeading,
        about_text: form.aboutText,
        about_philosophy: form.aboutPhilosophy,
      },
    };

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        toast.addToast('About page saved successfully.', 'success');
      } else {
        toast.addToast(result.message || 'Failed to save about page.', 'error');
      }
    } catch {
      toast.addToast('An unexpected error occurred.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-stone-600">Loading About settings...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-stone-950">
          About Page
        </h1>
        <p className="mt-2 text-stone-600">
          Edit your profile image, bio, and philosophy shown on the public About
          page.
        </p>
      </div>

      <form onSubmit={onSubmit}>
        <Card className="space-y-6">
          <div className="space-y-2">
            <Label>Profile Image</Label>
            <p className="mb-2 text-sm text-stone-600">
              이미지를 아래 영역에 드래그 앤 드롭하거나 클릭해서 업로드하세요.
            </p>
            <ImageDropzone
              currentUrl={form.profileImage}
              isDragging={isDragging}
              isUploading={isUploading}
              onDragEnter={() => setIsDragging(true)}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleProfileDrop}
              onSelect={handleProfileFileSelect}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subHeading">Sub Heading</Label>
            <Input
              id="subHeading"
              placeholder="e.g., 오래 듣고, 천천히 만듭니다."
              value={form.subHeading}
              onChange={(e) => handleChange('subHeading', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="aboutText">Main Bio / About Text</Label>
            <Textarea
              id="aboutText"
              rows={8}
              placeholder="Write your main bio..."
              value={form.aboutText}
              onChange={(e) => handleChange('aboutText', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="aboutPhilosophy">Philosophy</Label>
            <Textarea
              id="aboutPhilosophy"
              rows={8}
              placeholder={`Card Title\nDescription for this philosophy card.\n\nCard Title 2\nDescription for the second card.`}
              value={form.aboutPhilosophy}
              onChange={(e) => handleChange('aboutPhilosophy', e.target.value)}
            />
            <p className="text-xs text-stone-500">
              Use blank lines to separate cards. First line of each block becomes
              the card title.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-stone-200 pt-6">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save About Page'}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}

interface ImageDropzoneProps {
  currentUrl: string;
  isDragging: boolean;
  isUploading: boolean;
  onDragEnter: () => void;
  onDragLeave: () => void;
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  onSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

function ImageDropzone({
  currentUrl,
  isDragging,
  isUploading,
  onDragEnter,
  onDragLeave,
  onDrop,
  onSelect,
}: ImageDropzoneProps) {
  return (
    <div className="relative">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          onDragEnter();
        }}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`relative h-48 w-full cursor-pointer overflow-hidden rounded-md border-2 border-dashed sm:h-64 ${
          isDragging
            ? 'border-amber-700 bg-amber-50'
            : 'border-stone-300 bg-[#fffdf8]'
        } ${isUploading ? 'opacity-70' : ''}`}
      >
        {currentUrl ? (
          <img
            alt="Profile preview"
            className="h-full w-full object-cover"
            src={currentUrl}
          />
        ) : null}
        <div
          className={`pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 ${
            currentUrl ? 'bg-stone-900/40 text-white' : 'text-stone-500'
          }`}
        >
          <Upload className="size-8" aria-hidden="true" />
          <p className="text-sm font-medium">
            {isUploading ? 'Uploading...' : 'Drop or click to upload image'}
          </p>
        </div>
      </div>
      <input
        type="file"
        accept="image/*"
        className="absolute inset-0 cursor-pointer opacity-0"
        onChange={onSelect}
        disabled={isUploading}
        aria-label="Upload profile image"
      />
    </div>
  );
}
