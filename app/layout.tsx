import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SQL Lab Completo',
  description: 'Dynamic SQL lab on PostgreSQL with isolated sessions.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
