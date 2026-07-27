import type { ThemeOption } from '@/lib/admin/theme';

interface ThemePreviewProps {
  theme: ThemeOption;
}

export function ThemePreview({ theme }: ThemePreviewProps) {
  return (
    <div
      className="overflow-hidden rounded-sm border"
      style={{
        backgroundColor: theme.colors.background,
        color: theme.colors.foreground,
        borderColor: theme.colors.primary,
      }}
    >
      <div
        className="flex items-center justify-between border-b px-4 py-3"
        style={{ borderColor: theme.colors.primary }}
      >
        <span className="font-semibold">Site Preview</span>
        <span className="text-xs opacity-70">Logo</span>
      </div>
      <div className="space-y-3 p-4">
        <div
          className="h-3 w-3/4 rounded-sm opacity-30"
          style={{ backgroundColor: theme.colors.foreground }}
        />
        <div
          className="h-3 w-1/2 rounded-sm opacity-20"
          style={{ backgroundColor: theme.colors.foreground }}
        />
        <div
          className="mt-4 inline-flex rounded-sm px-4 py-2 text-sm font-medium"
          style={{
            backgroundColor: theme.colors.primary,
            color: theme.colors.card,
          }}
        >
          Call to Action
        </div>
      </div>
    </div>
  );
}
