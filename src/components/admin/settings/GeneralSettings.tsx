'use client';

import { useState, useCallback } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { Upload } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/hooks/useToast';
import type { SettingsFormData } from '@/lib/admin/settings';
import { preprocessImage } from '@/lib/client/image-process';


interface GeneralSettingsProps {
  form: UseFormReturn<SettingsFormData>;
}

export function GeneralSettings({ form }: GeneralSettingsProps) {
  const {
    register,
    formState: { errors },
    watch,
    setValue,
  } = form;
  const toast = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const heroImageUrl = watch('general.hero_image_url') || '/banner.jpg';

  const uploadImage = useCallback(
    async (file: File): Promise<string | null> => {
      // 리사이즈 + WebP 변환은 브라우저에서 수행 (Edge 런타임은 DOM API 미지원)
      const processed = await preprocessImage(file);
      const formData = new FormData();
      formData.append('file', processed);
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
    },
    [toast]
  );

  const handleHeroDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      const file = event.dataTransfer.files?.[0];
      if (!file || !file.type.startsWith('image/')) return;
      setIsUploading(true);
      const url = await uploadImage(file);
      setIsUploading(false);
      if (url) {
        setValue('general.hero_image_url', url, { shouldValidate: true });
      }
    },
    [uploadImage, setValue]
  );

  const handleHeroFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      setIsUploading(true);
      const url = await uploadImage(file);
      setIsUploading(false);
      if (url) {
        setValue('general.hero_image_url', url, { shouldValidate: true });
      }
      event.target.value = '';
    },
    [uploadImage, setValue]
  );

  return (
    <div className="space-y-8">
      <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <h3 className="mb-1 flex items-center gap-2 font-semibold text-stone-900">
          <span aria-hidden>📸</span> 메인 첫 화면 대표 이미지 (Hero Image)
        </h3>
        <p className="mb-5 text-sm text-stone-600">
          메인 홈 첫 화면 우측에 표시되는 대표 사진입니다. 비워두시면 감성
          디폴트 사진이 출력됩니다.
        </p>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <p className="mb-2 text-sm text-stone-600">
              이미지를 아래 영역에 드래그 앤 드롭하거나 클릭해서 업로드하세요.
            </p>
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-stone-500">
                현재 적용 중인 이미지 미리보기 (드래그 앤 드롭 또는 클릭)
              </p>
              <HeroImageDropzone
                currentUrl={heroImageUrl}
                isDragging={isDragging}
                isUploading={isUploading}
                onDragEnter={() => setIsDragging(true)}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleHeroDrop}
                onSelect={handleHeroFileSelect}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-5 shadow-sm">
        <h3 className="mb-1 font-semibold text-stone-900">
          메인 홈 하단 배너 / 브랜드 철학 문구 수정
        </h3>
        <p className="mb-5 text-sm text-stone-600">
          퍼블릭 메인 홈 하단 검은색 배너(ABOUT US / 철학 문구)에 표시되는 텍스트를
          수정합니다.
        </p>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label htmlFor="general.hero_title">
              배너 상단 소제목 (기본: ABOUT US)
            </Label>
            <Input
              id="general.hero_title"
              placeholder="ABOUT US"
              {...register('general.hero_title')}
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="general.hero_subtitle">
              배너 메인 타이틀 (기본: 진정성 있는 기록과 이야기를...)
            </Label>
            <Textarea
              id="general.hero_subtitle"
              rows={3}
              placeholder="진정성 있는 기록과 이야기를 담아내는 공간입니다."
              {...register('general.hero_subtitle')}
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="general.philosophy_text">
              배너 설명 문구 (기본: 일상의 감정과 소중한 기록들을...)
            </Label>
            <Textarea
              id="general.philosophy_text"
              rows={6}
              placeholder="일상의 감정과 소중한 기록들을 차곡차곡 쌓아갑니다."
              {...register('general.philosophy_text')}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="md:col-span-2">
          <Label htmlFor="general.name">Site Name</Label>
          <Input
            id="general.name"
            placeholder="My Site"
            {...register('general.name')}
          />
          {errors.general?.name && (
            <p className="mt-1 text-sm text-red-600">
              {errors.general.name.message}
            </p>
          )}
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="general.description">Description</Label>
          <Textarea
            id="general.description"
            placeholder="Short description of your site"
            {...register('general.description')}
          />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="general.about_sub_heading">About Sub Heading</Label>
          <Input
            id="general.about_sub_heading"
            placeholder="e.g., 진심을 담아, 차근차근 기록합니다"
            {...register('general.about_sub_heading')}
          />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="general.about_text">About Text / Main Bio</Label>
          <Textarea
            id="general.about_text"
            rows={6}
            placeholder="Enter the biography or main bio for the About page"
            {...register('general.about_text')}
          />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="general.about_philosophy">About Philosophy</Label>
          <Textarea
            id="general.about_philosophy"
            rows={6}
            placeholder="Enter the philosophy section for the About page"
            {...register('general.about_philosophy')}
          />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="general.profile_image">Profile Image URL</Label>
          <Input
            id="general.profile_image"
            placeholder="https://example.com/profile.jpg"
            {...register('general.profile_image')}
          />
          {errors.general?.profile_image && (
            <p className="mt-1 text-sm text-red-600">
              {errors.general.profile_image.message}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="general.language">Language</Label>
          <Select id="general.language" {...register('general.language')}>
            <option value="ko">Korean</option>
            <option value="en">English</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="general.timezone">Timezone</Label>
          <Input
            id="general.timezone"
            placeholder="Asia/Seoul"
            {...register('general.timezone')}
          />
          {errors.general?.timezone && (
            <p className="mt-1 text-sm text-red-600">
              {errors.general.timezone.message}
            </p>
          )}
        </div>
        <div className="md:col-span-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              {...register('general.maintenance')}
              className="size-4 rounded border-stone-300 text-amber-900 focus:ring-amber-900"
            />
            <span className="text-sm text-stone-700">Enable maintenance mode</span>
          </label>
        </div>
      </div>
    </div>
  );
}

interface HeroImageDropzoneProps {
  currentUrl: string;
  isDragging: boolean;
  isUploading: boolean;
  onDragEnter: () => void;
  onDragLeave: () => void;
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  onSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

function HeroImageDropzone({
  currentUrl,
  isDragging,
  isUploading,
  onDragEnter,
  onDragLeave,
  onDrop,
  onSelect,
}: HeroImageDropzoneProps) {
  return (
    <div className="relative">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          onDragEnter();
        }}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`relative h-40 w-full cursor-pointer overflow-hidden rounded-md border-2 border-dashed sm:h-52 md:h-64 ${
          isDragging
            ? 'border-amber-700 bg-amber-50'
            : 'border-stone-300 bg-[#fffdf8]'
        } ${isUploading ? 'opacity-70' : ''}`}
      >
        {currentUrl ? (
          <img
            alt="Hero preview"
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
        aria-label="Upload hero image"
      />
    </div>
  );
}
