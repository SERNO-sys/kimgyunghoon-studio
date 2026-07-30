import { SocialLinks } from './SocialLinks';

const currentYear = new Date().getFullYear();

interface FooterProps {
  siteName?: string;
  email?: string;
  phone?: string;
  socialUrls: Parameters<typeof SocialLinks>[0]['socialUrls'];
  themeColors?: {
    background: string;
    foreground: string;
    primary: string;
    card: string;
  };
}

export function Footer({
  siteName = '',
  email,
  phone,
  socialUrls,
  themeColors,
}: FooterProps) {
  return (
    <footer
      className="border-t border-current/10"
      style={
        themeColors
          ? { backgroundColor: themeColors.background, color: themeColors.foreground }
          : undefined
      }
    >
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 py-8 text-center sm:px-6 lg:px-8">
        <div className="space-y-1">
          <p className="text-sm">© {currentYear} {siteName}</p>
          {(email || phone) && (
            <div className="flex flex-wrap items-center gap-3 text-sm text-current/60">
              {email && (
                <a className="hover:text-current" href={`mailto:${email}`}>
                  {email}
                </a>
              )}
              {phone && (
                <a className="hover:text-current" href={`tel:${phone}`}>
                  {phone}
                </a>
              )}
            </div>
          )}
        </div>
        <SocialLinks socialUrls={socialUrls} />
      </div>
    </footer>
  );
}
