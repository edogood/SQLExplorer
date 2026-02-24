import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'SQLExplorer',
  description: 'SQL learning app powered by PostgreSQL'
};

const navItems = ['playground','syntax','keywords','guided','trainer','exercises','database','visualizer'];

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="it">
      <body>
        <header className="site-shell-header">
          <div className="site-shell-inner">
            <Link className="brand" href="/">SQLExplorer</Link>
            <details className="mobile-nav">
              <summary>Menu</summary>
              <nav className="shell-nav">
                <Link href="/">Home</Link>
                {navItems.map((n) => <Link key={n} href={`/${n}`}>{n}</Link>)}
              </nav>
            </details>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
