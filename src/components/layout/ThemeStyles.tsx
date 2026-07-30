interface ThemeColors {
  background: string;
  foreground: string;
  primary: string;
  card: string;
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function ThemeStyles({ themeColors }: { themeColors: ThemeColors }) {
  const { background, foreground, primary, card } = themeColors;
  const muted70 = hexToRgba(foreground, 0.7);
  const muted50 = hexToRgba(foreground, 0.5);
  const border10 = hexToRgba(foreground, 0.1);
  const border20 = hexToRgba(foreground, 0.2);
  const primary10 = hexToRgba(primary, 0.1);

  const css = `
    .theme-content .prose,
    .theme-content .prose h1,
    .theme-content .prose h2,
    .theme-content .prose h3,
    .theme-content .prose h4,
    .theme-content .prose h5,
    .theme-content .prose h6,
    .theme-content .prose p,
    .theme-content .prose li,
    .theme-content .prose blockquote,
    .theme-content .prose strong,
    .theme-content .text-stone-900,
    .theme-content .text-stone-950,
    .theme-content .text-stone-800,
    .theme-content .text-stone-700 {
      color: ${foreground} !important;
    }

    .theme-content .text-stone-600,
    .theme-content .text-stone-500 {
      color: ${muted70} !important;
    }

    .theme-content .text-stone-400,
    .theme-content .text-stone-300 {
      color: ${muted50} !important;
    }

    .theme-content .text-amber-800,
    .theme-content .text-amber-900 {
      color: ${primary} !important;
    }

    .theme-content .text-stone-50 {
      color: ${background} !important;
    }

    .theme-content .bg-stone-50,
    .theme-content .bg-stone-100,
    .theme-content .bg-stone-200,
    .theme-content .bg-white,
    .theme-content [class*="bg-[#fffdf8]"] {
      background-color: ${card} !important;
    }

    .theme-content .bg-amber-50,
    .theme-content [class*="bg-amber-50/"] {
      background-color: ${primary10} !important;
    }

    .theme-content button,
    .theme-content [type="submit"] {
      background-color: ${primary} !important;
      color: ${background} !important;
    }

    .theme-content .border-stone-200,
    .theme-content .border-stone-300,
    .theme-content [class*="border-stone-200/"] {
      border-color: ${border10} !important;
    }

    .theme-content .border-amber-800,
    .theme-content [class*="border-amber-700/"] {
      border-color: ${primary} !important;
    }

    .theme-content .prose a {
      color: ${primary} !important;
    }

    .theme-content input,
    .theme-content textarea {
      background-color: ${card} !important;
      color: ${foreground} !important;
      border-color: ${border20} !important;
    }
  `;

  return <style>{css}</style>;
}
