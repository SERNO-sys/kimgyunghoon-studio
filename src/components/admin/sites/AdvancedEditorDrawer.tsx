'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import {
  Globe,
  Image as ImageIcon,
  Palette,
  Settings,
  X,
} from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { PresetManager } from '@/components/admin/appearance/PresetManager';
import { DeleteSiteButton } from '@/components/admin/sites/DeleteSiteButton';


interface AdvancedEditorDrawerProps {
  open: boolean;
  onClose: () => void;
  siteId: string;
}

interface EditorLink {
  href: string;
  label: string;
  description: string;
  icon: typeof Settings;
}

const editorLinks: EditorLink[] = [
  {
    href: '/admin/settings',
    label: '사이트 설정',
    description: '로고, 소개, 연락처, 소셜 링크 등 기본 정보',
    icon: Settings,
  },
  {
    href: '/admin/pages',
    label: '페이지 / 네비게이션',
    description: '메뉴 구성과 페이지 추가·수정',
    icon: Globe,
  },
  {
    href: '/admin/media',

    label: '미디어',
    description: '이미지·파일 업로드 관리',
    icon: ImageIcon,
  },
];


/**
 * V2 Theme System - Phase 4.
 * Isolated "Advanced Edit" surface. All complex configuration (design presets,
 * manual theme switching, navigation, settings, etc.) lives here so the main
 * preview dashboard stays simple and publish-focused.
 */
export function AdvancedEditorDrawer({
  open,
  onClose,
  siteId,
}: AdvancedEditorDrawerProps) {
  // Close on Escape for accessibility.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="고급 편집">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-stone-950/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div className="absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col bg-[#f8f5ed] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 bg-[#fffdf8] px-6 py-4">
          <div>
            <h2 className="font-serif text-xl font-semibold text-stone-950">
              ⚙️ 고급 편집
            </h2>
            <p className="mt-0.5 text-sm text-stone-600">
              디자인과 상세 설정을 변경합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-10 items-center justify-center rounded-sm text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-950"
            aria-label="고급 편집 닫기"
          >
            <X aria-hidden="true" size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <Tabs defaultTab="design">
            <TabsList>
              <TabsTrigger value="design">
                <span className="inline-flex items-center gap-1.5">
                  <Palette aria-hidden="true" size={16} />
                  🎨 디자인 변경
                </span>
              </TabsTrigger>
              <TabsTrigger value="settings">
                <span className="inline-flex items-center gap-1.5">
                  <Settings aria-hidden="true" size={16} />
                  ⚙️ 상세 설정
                </span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="design">
              <div className="space-y-8">
                <section className="rounded-sm border border-stone-200 bg-[#fffdf8] p-5">
                  <PresetManager />
                </section>
              </div>
            </TabsContent>


            <TabsContent value="settings">
              <div className="grid gap-3 sm:grid-cols-2">
                {editorLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={onClose}
                      className="group flex items-start gap-3 rounded-sm border border-stone-200 bg-[#fffdf8] p-4 transition-colors hover:border-stone-950"
                    >
                      <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-sm bg-amber-50 text-amber-900">
                        <Icon aria-hidden="true" size={20} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-stone-950 group-hover:text-amber-900">
                          {link.label}
                        </p>
                        <p className="mt-0.5 text-sm text-stone-600">
                          {link.description}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Danger zone: delete the site entirely so the user can start fresh. */}
              <div className="mt-8 rounded-sm border border-red-200 bg-red-50/60 p-5">
                <h3 className="font-serif text-base font-semibold text-red-800">
                  위험 구역
                </h3>
                <p className="mt-1 text-sm text-red-700/80">
                  사이트를 삭제하면 모든 콘텐츠가 영구적으로 지워집니다. 꼬인
                  사이트를 지우고 AWIE AI 생성을 처음부터 다시 테스트하고 싶다면
                  여기서 삭제하세요.
                </p>
                <div className="mt-4">
                  <DeleteSiteButton siteId={siteId} compact />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
