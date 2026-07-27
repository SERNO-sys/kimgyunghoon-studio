import { ThemeManager } from '@/components/admin/appearance/ThemeManager';

export default function AppearancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-stone-950">
          Appearance
        </h1>
        <p className="mt-2 text-stone-600">
          Choose a theme for your website.
        </p>
      </div>
      <ThemeManager />
    </div>
  );
}
