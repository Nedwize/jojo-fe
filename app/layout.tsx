import { ABeeZee, Public_Sans } from 'next/font/google';
import { headers } from 'next/headers';
import { ApplyThemeScript, ThemeToggle } from '@/components/theme-toggle';
import { getAppConfig, getOrigin } from '@/lib/utils';
import './globals.css';

const publicSans = Public_Sans({
  variable: '--font-public-sans',
  subsets: ['latin'],
});

const abeeZee = ABeeZee({
  variable: '--font-abee-zee',
  subsets: ['latin'],
  weight: ['400'],
});

interface RootLayoutProps {
  children: React.ReactNode;
}

export default async function RootLayout({ children }: RootLayoutProps) {
  const hdrs = await headers();
  const origin = getOrigin(hdrs);
  const { accent, accentDark, pageTitle, pageDescription } = await getAppConfig(origin);

  const styles = [
    accent ? `:root { --primary: ${accent}; }` : '',
    accentDark ? `.dark { --primary: ${accentDark}; }` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <html lang="en" suppressHydrationWarning className="scroll-smooth">
      <head>
        {styles && <style>{styles}</style>}
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription + '\n\nBuilt with LiveKit Agents.'} />
        <ApplyThemeScript />
      </head>
      <body className={`${publicSans.variable} ${abeeZee.variable} overflow-x-hidden antialiased`}>
        {children}
        <div className="group fixed bottom-0 left-1/2 z-50 mb-2 -translate-x-1/2">
          <ThemeToggle className="translate-y-20 transition-transform delay-150 duration-300 group-hover:translate-y-0" />
        </div>
      </body>
    </html>
  );
}
