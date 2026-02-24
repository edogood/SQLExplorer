import Link from 'next/link';
import { fetchPages } from '@/lib/content';

export default async function HomePage() {
  const pages = await fetchPages();
  return (
    <main className="page">
      <section className="hero"><h1>SQLExplorer</h1><p>Web app guidata da PostgreSQL.</p></section>
      <section className="panel"><h2>Sezioni</h2><div className="link-grid">{pages.map((p) => <Link key={p.slug} className="btn btn-secondary" href={p.slug === 'home' ? '/' : `/${p.slug}`}>{p.title}</Link>)}</div></section>
    </main>
  );
}
