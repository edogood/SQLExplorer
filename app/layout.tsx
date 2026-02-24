import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'SQL Lab Completo',
  description: 'Dynamic SQL lab on PostgreSQL with isolated sessions and legacy static pages on Vercel.'
};

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/playground', label: 'Playground' },
  { href: '/keywords', label: 'Keywords' },
  { href: '/syntax', label: 'Syntax' },
  { href: '/playground.html', label: 'Legacy Playground' },
  { href: '/keyword.html', label: 'Legacy Keyword' },
  { href: '/syntax.html', label: 'Legacy Syntax' }
];

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="it">
      <body>
        <header className="site-shell-header">
          <div className="site-shell-inner">
            <Link className="brand" href="/">SQL Lab Completo</Link>
            <nav className="shell-nav">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>{item.label}</Link>
              ))}
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
