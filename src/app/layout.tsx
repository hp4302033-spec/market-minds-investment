import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Market Minds Investment — Smart Financial Planning',
  description: 'AI-powered SIP & Lump Sum investment calculator with personalized financial advice, detailed reports, and expert guidance from Market Minds Investment.',
  keywords: 'SIP calculator, investment planning, financial advisor, mutual funds, wealth management',
  openGraph: {
    title: 'Market Minds Investment',
    description: 'Smart financial planning powered by AI insights.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="bg-bg-primary text-text-primary font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
