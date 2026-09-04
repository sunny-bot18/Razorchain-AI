import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RazorChain AI',
  description:
    'Autonomous B2B supply chain settlement platform with AI-powered document verification and secure payments.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="min-h-screen bg-zinc-950 font-sans text-zinc-100">
        {children}
      </body>
    </html>
  );
}
